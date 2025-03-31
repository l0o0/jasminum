type OutlineNode = {
  level: number;
  title: string;
  page: number;
  x: number;
  y: number;
  children?: OutlineNode[];
  collapsed?: boolean;
};

type OutlineInfo = {
  info: Record<string, string | number>;
  outline: OutlineNode[];
};

type PdfRef = {
  num: number;
  gen: number;
};

type PdfZoomMode = {
  name: string; // 缩放模式名称，例如 "Fit", "XYZ", "FitH", "FitV"
  args?: (number | null)[];
};

type PdfDest = { dest: [PdfRef, PdfZoomMode] };
type PdfPosition = {
  position: { pageIndex: number; rects: [number, number, number, number][] };
};

type PdfOutlineNode = {
  title: string;
  items: PdfOutlineNode[];
  location: PdfDest | PdfPosition; // 没有遇到 PdfDest 的情况
};
