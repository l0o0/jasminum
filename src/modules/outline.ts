type OutlineNode = {
  level: number;
  title: string;
  pageIndex?: number;
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

export async function getOutline(
  reader: _ZoteroTypes.ReaderInstance,
): Promise<OutlineNode[] | null> {
  const pdfDocument =
    // @ts-ignore - Not typed.
    reader._primaryView._iframeWindow.PDFViewerApplication.pdfDocument;
  const originOutline: PdfOutlineNode[] = await pdfDocument.getOutline2();

  if (originOutline.length == 0) return null;

  async function convert(
    node: PdfOutlineNode,
    level = 0,
  ): Promise<OutlineNode> {
    level += 1;
    const title = node.title;
    const outlineNode: OutlineNode = {
      level,
      title,
    };
    // Some pdf missing dest, position instead.
    if (node.location && node.location.dest) {
      ztoolkit.log(node);
      const pageIndex = await pdfDocument.getPageIndex(node.location.dest[0]);
      outlineNode.pageIndex = pageIndex;
    }

    if (node.items.length > 0) {
      outlineNode.children = await Promise.all(
        node.items.map((n) => convert(n, level)),
      );
    }
    return outlineNode;
  }
  return Promise.all(originOutline.map((node) => convert(node, 0)));
}

export async function saveOutlineToJSON(
  item: Zotero.Item,
  outline: OutlineNode[],
) {
  const outlineStr = JSON.stringify(outline);
  const attachmentPath = await item.getFilePathAsync();
  if (attachmentPath == false) return;
  const attachmentFolder = PathUtils.parent(attachmentPath);
  await Zotero.File.putContentsAsync(
    PathUtils.join(attachmentFolder!, "outline.json"),
    outlineStr,
  );
}

export async function loadOutlineFromJSON(
  item: Zotero.Item,
  filepath: string,
): Promise<OutlineNode | null> {
  const attachmentPath = await item.getFilePathAsync();
  if (attachmentPath == false) return null;
  const attachmentFolder = PathUtils.parent(attachmentPath);
  const content = (await Zotero.File.getContentsAsync(
    PathUtils.join(attachmentFolder!, "outline.json"),
  )) as string;
  return JSON.parse(content);
}
