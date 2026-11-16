import {
  compact,
  findHeadingMatches,
  locateHeading,
  type Heading,
  type LocatedHeading,
  type OutlinePDFDocument,
  type TextItem,
} from "./heading";

export interface ContentsEntry {
  title: string;
  level: number;
  pageLabel: string;
}
export interface OutlineScanPage {
  page: number;
  headings: Heading[];
  pageLabel?: string | null;
  contents?: {
    starts: boolean;
    continues: boolean;
    entries: ContentsEntry[];
  } | null;
}
interface PrintedPage {
  kind: "arabic" | "roman";
  value: number;
}
export interface ContentsCandidate {
  entries: ContentsEntry[];
  endPage: number;
}

/** Roman front matter and Arabic body pages need independent offsets. */
export function parsePrintedPage(label: string): PrintedPage | null {
  const text = label.normalize("NFKC").trim().toUpperCase();
  if (/^[0-9]+$/.test(text)) {
    const value = Number(text);
    return Number.isSafeInteger(value) && value > 0
      ? { kind: "arabic", value }
      : null;
  }
  if (
    !text ||
    !/^M{0,3}(CM|CD|D?C{0,3})(XC|XL|L?X{0,3})(IX|IV|V?I{0,3})$/.test(text)
  )
    return null;
  const values: Record<string, number> = {
    I: 1,
    V: 5,
    X: 10,
    L: 50,
    C: 100,
    D: 500,
    M: 1000,
  };
  const value = [...text].reduce(
    (sum, char, i) =>
      sum +
      (values[char] < (values[text[i + 1]] ?? 0)
        ? -values[char]
        : values[char]),
    0,
  );
  return { kind: "roman", value };
}

/** Only a complete, contiguous contents block is eligible for the fast path. */
export function findContentsCandidate(
  pages: ReadonlyMap<number, OutlineScanPage>,
  limit: number,
): ContentsCandidate | null {
  const candidates: ContentsCandidate[] = [];
  let group:
    | {
        entries: ContentsEntry[];
        starts: boolean;
        continues: boolean;
        endPage: number;
      }
    | undefined;
  const finish = () => {
    if (!group?.starts || group.continues || group.entries.length < 2) return;
    const entries: ContentsEntry[] = [];
    const seen = new Set<string>();
    let previous: PrintedPage | undefined;
    for (const entry of group.entries) {
      const label = parsePrintedPage(entry.pageLabel);
      if (
        !label ||
        (previous &&
          (previous.kind === label.kind
            ? label.value < previous.value
            : previous.kind === "arabic"))
      )
        return;
      previous = label;
      const key = `${label.kind}:${label.value}:${compact(entry.title)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      entries.push({ ...entry, title: entry.title.trim() });
    }
    if (entries.length >= 2)
      candidates.push({ entries, endPage: group.endPage });
  };
  for (let page = 1; page <= limit; page++) {
    const contents = pages.get(page)?.contents;
    if (!contents || contents.starts) {
      // A non-contents page confirms that the preceding block has ended.
      finish();
      group = undefined;
    }
    if (contents) {
      group ??= {
        entries: [],
        starts: contents.starts,
        continues: true,
        endPage: page,
      };
      group.entries.push(...contents.entries);
      group.continues = contents.continues;
      group.endPage = page;
    }
  }
  // Do not accept a block touching the probe boundary without checking the next page.
  return (
    candidates.sort((a, b) => b.entries.length - a.entries.length)[0] ?? null
  );
}

/** Calibrate a contents page against observed body pages; never guess an offset. */
export class TOCRecognitionAgent {
  private text = new Map<number, Promise<TextItem[]>>();
  constructor(
    private readonly pdf: OutlinePDFDocument,
    private readonly scans: ReadonlyMap<number, OutlineScanPage>,
    private readonly inspect: (pages: number[]) => Promise<OutlineScanPage[]>,
  ) {}
  private check(signal: AbortSignal) {
    if (signal.aborted) throw new Error("Request cancelled");
  }
  private readText(page: number): Promise<TextItem[]> {
    if (!this.text.has(page)) {
      this.text.set(
        page,
        this.pdf
          .getPage(page)
          .then((p) => p.getTextContent())
          .then((content) =>
            content.items.filter(
              (item): item is TextItem =>
                "str" in item &&
                item.transform.length === 6 &&
                item.transform.every(Number.isFinite),
            ),
          )
          .catch(() => []),
      );
    }
    return this.text.get(page)!;
  }
  private offsets(
    candidate: ContentsCandidate,
  ): Map<PrintedPage["kind"], number> | null {
    const labels = candidate.entries.map(
      (entry) => parsePrintedPage(entry.pageLabel)!,
    );
    const offsets = new Map<PrintedPage["kind"], number>();
    for (const kind of new Set(labels.map((label) => label.kind))) {
      const votes = new Map<number, Set<number>>();
      const vote = (offset: number, page: number) => {
        if (!votes.has(offset)) votes.set(offset, new Set());
        votes.get(offset)!.add(page);
      };
      for (const scan of this.scans.values()) {
        if (scan.contents) continue;
        const printed = scan.pageLabel
          ? parsePrintedPage(scan.pageLabel)
          : null;
        if (printed?.kind === kind) vote(scan.page - printed.value, scan.page);
        for (const heading of scan.headings) {
          if (compact(heading.title).length < 4) continue;
          const entries = candidate.entries.filter(
            (entry) => compact(entry.title) === compact(heading.title),
          );
          if (entries.length !== 1) continue;
          const label = parsePrintedPage(entries[0].pageLabel)!;
          if (label.kind === kind) vote(scan.page - label.value, scan.page);
        }
      }
      const ranked = [...votes].sort((a, b) => b[1].size - a[1].size);
      // Two independent physical pages must agree. Competing numbering schemes
      // cannot safely be represented by one offset and require the full scan.
      if (
        !ranked[0] ||
        ranked[0][1].size < 2 ||
        (ranked[1]?.[1].size ?? 0) >= 2
      )
        return null;
      offsets.set(kind, ranked[0][0]);
    }
    return offsets;
  }
  async resolve(
    candidate: ContentsCandidate,
    signal: AbortSignal,
  ): Promise<LocatedHeading[] | null> {
    try {
      this.check(signal);
      let offsets = this.offsets(candidate);
      if (!offsets) {
        const afterContents = Array.from(
          { length: Math.min(5, this.pdf.numPages - candidate.endPage) },
          (_, i) => candidate.endPage + 1 + i,
        );
        await this.inspect(afterContents);
        this.check(signal);
        offsets = this.offsets(candidate);
      }
      if (!offsets) return null;
      const mapped = candidate.entries.map((entry) => {
        const printed = parsePrintedPage(entry.pageLabel)!;
        return {
          entry,
          printed,
          page: printed.value + offsets!.get(printed.kind)!,
        };
      });
      if (
        mapped.some(
          ({ page }, i) =>
            !Number.isInteger(page) ||
            page < 1 ||
            page > this.pdf.numPages ||
            this.scans.get(page)?.contents ||
            (i > 0 && page < mapped[i - 1].page),
        )
      )
        return null;
      const samples: typeof mapped = [];
      for (const kind of offsets.keys()) {
        const distinct = mapped.filter(
          (row, i) =>
            row.printed.kind === kind &&
            !mapped.slice(0, i).some((other) => other.page === row.page),
        );
        for (const i of new Set([
          0,
          Math.floor(distinct.length / 2),
          distinct.length - 1,
        ]))
          if (distinct[i]) samples.push(distinct[i]);
      }
      const needsImages: number[] = [];
      const verified = async (row: (typeof mapped)[number]) => {
        const scan = this.scans.get(row.page);
        if (scan?.contents) return false;
        const label = scan?.pageLabel ? parsePrintedPage(scan.pageLabel) : null;
        if (label)
          return (
            label.kind === row.printed.kind && label.value === row.printed.value
          );
        const unique =
          candidate.entries.filter(
            (entry) => compact(entry.title) === compact(row.entry.title),
          ).length === 1;
        if (!unique) return false;
        const items = await this.readText(row.page);
        this.check(signal);
        return (
          findHeadingMatches(row.entry.title, items).length === 1 ||
          !!scan?.headings.some(
            (h) => compact(h.title) === compact(row.entry.title),
          )
        );
      };
      for (const row of samples) {
        if (!(await verified(row))) needsImages.push(row.page);
      }
      for (let i = 0; i < needsImages.length; i += 5) {
        await this.inspect(needsImages.slice(i, i + 5));
        this.check(signal);
      }
      for (const row of samples) if (!(await verified(row))) return null;
      const headings: LocatedHeading[] = [];
      for (const { entry, page } of mapped) {
        this.check(signal);
        const items = await this.readText(page);
        this.check(signal);
        const visible = this.scans
          .get(page)
          ?.headings.find((h) => compact(h.title) === compact(entry.title));
        const heading = {
          title: entry.title,
          level: entry.level,
          left: visible?.left ?? 0,
          top: visible?.top ?? 0,
        };
        const located = locateHeading(
          heading,
          page,
          await this.pdf.getPage(page),
          items,
        );
        // Without a unique text match or a visual heading, only the page is known.
        if (!visible && findHeadingMatches(entry.title, items).length !== 1) {
          located.exact = false;
          located.pageOnly = true;
          const viewport = (await this.pdf.getPage(page)).getViewport({
            scale: 1,
          });
          [located.x, located.y] = viewport.convertToPdfPoint(0, 0);
        }
        headings.push(located);
      }
      this.check(signal);
      return headings;
    } finally {
      this.text.clear();
    }
  }
}
