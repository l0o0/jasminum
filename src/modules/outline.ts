type OutlineNode = {
  level: number;
  title: string;
  pageIndex: number;
  children?: OutlineNode[];
};

type PdfRef = {
  num: number;
  gen: number;
};

type PdfZoomMode = {
  name: string; // 缩放模式名称，例如 "Fit", "XYZ", "FitH", "FitV"
  args?: (number | null)[];
};

type PdfOutlineNode = {
  title: string;
  items: PdfOutlineNode[];
  location: { dest: [PdfRef, PdfZoomMode] };
};

async function getOutline(reader: _ZoteroTypes.ReaderInstance) {
  const pdfDocument =
    // @ts-ignore - Not typed.
    reader._primaryView._iframeWindow.PDFViewerApplication.pdfDocument;
  const originOutline: PdfOutlineNode[] = await pdfDocument.getOutline2();

  async function convert(
    node: PdfOutlineNode,
    level = 0,
  ): Promise<OutlineNode> {
    level += 1;
    const title = node.title;
    const pageIndex = await pdfDocument.getPageIndex(node.location.dest[0]);
    const outlineNode: OutlineNode = {
      level,
      title,
      pageIndex,
    };
    if (node.items.length > 0) {
      outlineNode.children = await Promise.all(
        node.items.map((n) => convert(n, level)),
      );
    }
    return outlineNode;
  }
  return Promise.all(originOutline.map((node) => convert(node, 0)));
}
