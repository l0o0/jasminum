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
  let counts = 0;
  outlineNodes.forEach((node: OutlineNode) => {
    node.ref = pdfDoc.context.nextRef();
    if (node.children && node.children.length > 0) {
      node.children = prepareData(node.children, pdfDoc)[0];
      counts = counts + 1;
    }
  });
  return [outlineNodes, counts];
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
      PDFNumber.of(node.children.length),
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
  preparedOutlineNodes.forEach((node: OutlineNode, idx: number) => {
    // Create outline item dict
    createOutlineItem(
      pdfDoc,
      node,
      node.level === 1 ? rootRef : node.ref,
      idx > 0 ? preparedOutlineNodes[idx - 1].ref : null,
      idx < preparedOutlineNodes.length - 1
        ? preparedOutlineNodes[idx + 1].ref
        : null,
      pageRefs[node.page - 1],
    );
    if (node.children && node.children.length > 0) {
      const children = node.children;
      children.forEach((childNode: OutlineNode, cidx: number) => {
        createOutlineItem(
          pdfDoc,
          childNode,
          node.ref,
          cidx > 0 ? children[cidx - 1].ref : null,
          cidx < children.length - 1 ? children[cidx + 1].ref : null,
          pageRefs[childNode.page - 1],
        );
      });
    }
  });

  const pdfBytesWithOutline = await pdfDoc.save();
  await IOUtils.write(pdfPath, pdfBytesWithOutline);
  console.log("Add outline to pdf complete.");
}
