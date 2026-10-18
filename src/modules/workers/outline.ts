import {
  PDFArray,
  PDFDict,
  PDFDocument,
  PDFHexString,
  PDFName,
  PDFNull,
  PDFNumber,
  PDFPageLeaf,
  PDFRef,
} from "pdf-lib";

export function test(title: string) {
  const startTimestamp = Date.now();
  let result = title;
  for (let i = 0; i < 100; i++) {
    result = result
      .split("")
      .map((c) => String.fromCharCode(c.charCodeAt(0) + 1))
      .join("");
  }
  const endTimestamp = Date.now();
  const time = endTimestamp - startTimestamp;
  return { result, time };
}

function prepareData(
  outlineNodes: OutlineNode[],
  pdfDoc: PDFDocument,
): [OutlineNode[], number] {
  outlineNodes.forEach((node: OutlineNode) => {
    node.ref = pdfDoc.context.nextRef();
    if (node.children && node.children.length > 0) {
      node.children = prepareData(node.children, pdfDoc)[0];
    }
  });
  return [outlineNodes, countVisibleNodes(outlineNodes)];
}

function countVisibleNodes(nodes: OutlineNode[]): number {
  return nodes.reduce(
    (count, node) =>
      count + 1 + (node.collapsed ? 0 : countVisibleNodes(node.children ?? [])),
    0,
  );
}

function createOutlineItem(
  pdfDoc: PDFDocument,
  node: OutlineNode,
  parentRef: PDFRef,
  prev: PDFRef | null,
  next: PDFRef | null,
  page: PDFRef,
) {
  const outlineItemDictMap = new Map();
  outlineItemDictMap.set(PDFName.Title, PDFHexString.fromText(node.title));
  outlineItemDictMap.set(PDFName.Parent, parentRef);

  if (node.children && node.children.length > 0) {
    outlineItemDictMap.set(PDFName.of("First"), node.children[0].ref);
    outlineItemDictMap.set(
      PDFName.of("Last"),
      node.children[node.children.length - 1].ref,
    );
    outlineItemDictMap.set(
      PDFName.of("Count"),
      PDFNumber.of(
        countVisibleNodes(node.children) * (node.collapsed ? -1 : 1),
      ),
    );
  }

  if (prev != null) {
    outlineItemDictMap.set(PDFName.of("Prev"), prev);
  }
  if (next != null) {
    outlineItemDictMap.set(PDFName.of("Next"), next);
  }
  // Set the destination
  const array = PDFArray.withContext(pdfDoc.context);
  array.push(page);
  array.push(PDFName.of("XYZ"));
  array.push(PDFNumber.of(node.x)); // X
  array.push(PDFNumber.of(node.y)); // Y
  array.push(PDFNull); // Zoom
  outlineItemDictMap.set(PDFName.of("Dest"), array);
  const outlineItem = PDFDict.fromMapWithContext(
    outlineItemDictMap,
    pdfDoc.context,
  );
  pdfDoc.context.assign(node.ref, outlineItem);
  console.log(`Outline item dict: ${node.level}, ${node.title}`);
}

function createOutlineDict(
  outlineNodes: OutlineNode[],
  counts: number,
  pdfDoc: PDFDocument,
): PDFDict {
  const outlinesDictMap = new Map();
  outlinesDictMap.set(PDFName.Type, PDFName.of("Outlines"));
  outlinesDictMap.set(PDFName.of("First"), outlineNodes[0].ref!);
  outlinesDictMap.set(
    PDFName.of("Last"),
    outlineNodes[outlineNodes.length - 1].ref!,
  );
  outlinesDictMap.set(PDFName.of("Count"), PDFNumber.of(counts));
  return PDFDict.fromMapWithContext(outlinesDictMap, pdfDoc.context);
}

export async function addOutlineToPDF(
  pdfPath: string,
  outlineNodes: OutlineNode[],
) {
  const pdfBytes = await IOUtils.read(pdfPath);
  const pdfDoc = await PDFDocument.load(pdfBytes);
  // PDF Page reference
  const pageRefs: PDFRef[] = [];
  pdfDoc.catalog.Pages().traverse((kid, ref) => {
    if (kid instanceof PDFPageLeaf) pageRefs.push(ref);
  });

  const validate = (nodes: OutlineNode[]) => {
    for (const node of nodes) {
      if (
        !Number.isInteger(node.page) ||
        node.page < 1 ||
        node.page > pageRefs.length ||
        !Number.isFinite(node.x) ||
        !Number.isFinite(node.y)
      ) {
        throw new Error(`Invalid outline destination: ${node.title}`);
      }
      validate(node.children ?? []);
    }
  };
  validate(outlineNodes);
  if (!outlineNodes.length) {
    pdfDoc.catalog.delete(PDFName.of("Outlines"));
    await IOUtils.write(pdfPath, await pdfDoc.save(), {
      tmpPath: `${pdfPath}.jasminum.tmp`,
    });
    return;
  }

  const rootRef = pdfDoc.context.nextRef();
  const [preparedOutlineNodes, totalCounts] = prepareData(outlineNodes, pdfDoc);
  // Create outline item dict
  const outlinesDict = createOutlineDict(
    preparedOutlineNodes,
    totalCounts,
    pdfDoc,
  );
  //Pointing the "Outlines" property of the PDF's "Catalog" to the first object of your outlines
  pdfDoc.catalog.set(PDFName.of("Outlines"), rootRef);
  //First 'Outline' object. Refer to table H.3 in Annex H.6 of PDF Specification doc.
  pdfDoc.context.assign(rootRef, outlinesDict);

  console.log("Prepared outline nodes: ", preparedOutlineNodes);
  // Add outline item dict
  const loop = (nodes: OutlineNode[], parentRef: PDFRef) => {
    nodes.forEach((node: OutlineNode, idx: number) => {
      // Create outline item dict
      createOutlineItem(
        pdfDoc,
        node,
        parentRef,
        idx > 0 ? nodes[idx - 1].ref : null,
        idx < nodes.length - 1 ? nodes[idx + 1].ref : null,
        pageRefs[node.page - 1],
      );
      if (node.children && node.children.length > 0) {
        const children = node.children;
        loop(children, node.ref!);
      }
    });
  };

  loop(preparedOutlineNodes, rootRef);

  const pdfBytesWithOutline = await pdfDoc.save();
  await IOUtils.write(pdfPath, pdfBytesWithOutline, {
    tmpPath: `${pdfPath}.jasminum.tmp`,
  });
  console.log("Add outline to pdf complete.");
}

// Read-only geometry for outline recognition; avoids cross-window PDF.js objects.
export async function getPageGeometries(pdfPath: string) {
  const doc = await PDFDocument.load(await IOUtils.read(pdfPath));
  return doc.getPages().map((page) => {
    const media = page.getMediaBox();
    const crop = page.getCropBox();
    const x = Math.max(media.x, crop.x),
      y = Math.max(media.y, crop.y);
    const width = Math.min(media.x + media.width, crop.x + crop.width) - x;
    const height = Math.min(media.y + media.height, crop.y + crop.height) - y;
    return {
      ...(width > 0 && height > 0 ? { x, y, width, height } : media),
      rotation: ((page.getRotation().angle % 360) + 360) % 360,
    };
  });
}

export async function extractTextPDF(pdfPath: string, pageIndexes: number[]) {
  const source = await PDFDocument.load(await IOUtils.read(pdfPath));
  const target = await PDFDocument.create();
  for (const page of await target.copyPages(source, pageIndexes))
    target.addPage(page);
  return (await target.save()).buffer;
}

/** Resolve native PDF outlines without a reader, including named destinations. */
export async function readNativeOutline(
  pdfPath: string,
): Promise<OutlineNode[]> {
  const pdf = await PDFDocument.load(await IOUtils.read(pdfPath));
  const context = pdf.context;
  const resolve = (value: any): any =>
    value instanceof PDFRef ? context.lookup(value) : value;
  const get = (dict: any, key: string): any =>
    resolve(dict)?.get?.(PDFName.of(key));
  const text = (value: any): string => resolve(value)?.decodeText?.() ?? "";
  const names = new Map<string, any>();
  const visitedNames = new Set<any>();
  const walkNames = (value: any) => {
    const dict = resolve(value);
    if (!dict || visitedNames.has(dict)) return;
    visitedNames.add(dict);
    const entries = resolve(get(dict, "Names"));
    if (entries instanceof PDFArray)
      for (let i = 0; i + 1 < entries.size(); i += 2)
        names.set(text(entries.get(i)), entries.get(i + 1));
    const kids = resolve(get(dict, "Kids"));
    if (kids instanceof PDFArray)
      for (let i = 0; i < kids.size(); i++) walkNames(kids.get(i));
  };
  walkNames(get(resolve(get(pdf.catalog, "Names")), "Dests"));
  const legacy = resolve(get(pdf.catalog, "Dests"));
  const pages = pdf.getPages();
  const seen = new Set<any>();
  const walk = (first: any, level: number): OutlineNode[] => {
    const result: OutlineNode[] = [];
    for (let value = first; value; ) {
      const dict = resolve(value);
      if (!(dict instanceof PDFDict) || seen.has(dict)) break;
      seen.add(dict);
      let dest = resolve(
        get(dict, "Dest") ?? get(resolve(get(dict, "A")), "D"),
      );
      if (
        dest instanceof PDFName ||
        dest instanceof PDFHexString ||
        typeof dest?.decodeText === "function"
      )
        dest = resolve(names.get(text(dest)) ?? get(legacy, text(dest)));
      if (dest instanceof PDFDict) dest = resolve(get(dest, "D"));
      let page = 1,
        x = 0,
        y = pages[0]?.getHeight() ?? 0;
      if (dest instanceof PDFArray) {
        const ref = dest.get(0);
        const index =
          ref instanceof PDFNumber
            ? ref.asNumber()
            : pages.findIndex((p) => p.ref.toString() === ref?.toString());
        if (index >= 0 && index < pages.length) {
          page = index + 1;
          const box = pages[index].getCropBox();
          x = box.x;
          y = box.y + box.height;
          const mode = text(dest.get(1));
          const number = (i: number, fallback: number) => {
            const n = i < dest.size() ? resolve(dest.get(i)) : null;
            return n instanceof PDFNumber ? n.asNumber() : fallback;
          };
          if (mode === "XYZ") {
            x = number(2, x);
            y = number(3, y);
          } else if (mode === "FitH" || mode === "FitBH") y = number(2, y);
          else if (mode === "FitV" || mode === "FitBV") x = number(2, x);
          else if (mode === "FitR") {
            x = number(2, x);
            y = number(5, y);
          }
        }
      }
      const count = resolve(get(dict, "Count"));
      result.push({
        title: text(get(dict, "Title")),
        level,
        page,
        x,
        y,
        collapsed: count instanceof PDFNumber && count.asNumber() < 0,
        children: walk(get(dict, "First"), level + 1),
      });
      value = get(dict, "Next");
    }
    return result;
  };
  return walk(get(resolve(get(pdf.catalog, "Outlines")), "First"), 1);
}
