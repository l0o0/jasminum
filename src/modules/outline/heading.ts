export interface Heading {
  title: string;
  level: number;
  left: number;
  top: number;
}
export interface LocatedHeading extends Heading {
  page: number;
  x: number;
  y: number;
  exact: boolean;
  pageOnly?: boolean;
}
export interface TextItem {
  str: string;
  transform: number[];
}
export interface OutlinePDFPage {
  getViewport(options: { scale: number }): {
    width: number;
    height: number;
    convertToPdfPoint(x: number, y: number): number[];
  };
  getTextContent(): Promise<{ items: (TextItem | { type: string })[] }>;
}
export interface OutlinePDFDocument {
  numPages: number;
  getPage(page: number): Promise<OutlinePDFPage>;
}
export const compact = (text: string) =>
  text.normalize("NFKC").replace(/\s+/g, "").toLowerCase();

export function findHeadingMatches(
  title: string,
  items: TextItem[],
): TextItem[] {
  const target = compact(title);
  if (!target) return [];
  const matches: TextItem[] = [];
  for (let i = 0; i < items.length; i++) {
    let text = "";
    for (let j = i; j < Math.min(items.length, i + 30); j++) {
      text += compact(items[j].str);
      if (text === target) {
        matches.push(items[i]);
        break;
      }
      if (text.length > target.length || !target.startsWith(text)) break;
    }
  }
  return matches;
}

export function locateHeading(
  heading: Heading,
  page: number,
  pdfPage: OutlinePDFPage,
  items: TextItem[],
): LocatedHeading {
  const viewport = pdfPage.getViewport({ scale: 1 });
  const [approxX, approxY] = viewport.convertToPdfPoint(
    heading.left * viewport.width,
    heading.top * viewport.height,
  );
  const matches = findHeadingMatches(heading.title, items);
  // If identical text occurs more than once, choose the occurrence nearest the visual heading.
  const match = matches.sort(
    (a, b) =>
      Math.hypot(a.transform[4] - approxX, a.transform[5] - approxY) -
      Math.hypot(b.transform[4] - approxX, b.transform[5] - approxY),
  )[0];
  return {
    ...heading,
    page,
    x: match ? match.transform[4] + match.transform[2] : approxX,
    y: match ? match.transform[5] + match.transform[3] : approxY,
    exact: !!match,
  };
}

export function headingTree(headings: LocatedHeading[]): OutlineNode[] {
  const roots: OutlineNode[] = [];
  const stack: OutlineNode[] = [];
  const seen = new Set<string>();
  for (const heading of headings) {
    const key = `${heading.page}:${compact(heading.title)}:${Math.round(heading.y)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    while (stack.length && stack[stack.length - 1].level >= heading.level)
      stack.pop();
    const node: OutlineNode = {
      title: heading.title,
      page: heading.page,
      x: heading.x,
      y: heading.y,
      level: heading.level,
      children: [],
    };
    (stack.length ? stack[stack.length - 1].children! : roots).push(node);
    stack.push(node);
  }
  return roots;
}
