type OutlineNode = {
  level: number;
  title: string;
  page: number;
  x: number;
  y: number;
  children?: OutlineNode[];
  collapsed?: boolean;
  ref?: PDFRef;
};

type OutlineInfo = {
  info: Record<string, string | number>;
  outlines: OutlineNode[];
  bookmarks?: BookmarkNode[];
};

// Reference of PDF object
// type PdfRef = {
//   num: number;
//   gen: number;
//   tag?: string; // 可能是 "Page" 或 "Outline"
// };

type PdfZoomMode = {
  name: string; // 缩放模式名称，例如 "Fit", "XYZ", "FitH", "FitV"
  args?: (number | null)[];
};

type PdfDest = { dest: [PDFRef, PdfZoomMode] };
type PdfPosition = {
  position: { pageIndex: number; rects: [number, number, number, number][] };
};

type PdfOutlineNode = {
  title: string;
  items: PdfOutlineNode[];
  location: PdfDest | PdfPosition; // 没有遇到 PdfDest 的情况
};

// 书签相关类型定义
type BookmarkNode = {
  id: string; // 唯一标识符
  title: string;
  page: number;
  x: number;
  y: number;
  order: number; // 用于排序，书签没有层级关系
  createdAt: number; // 创建时间戳
  color: string; // 书签颜色
};

type BookmarkInfo = {
  info: Record<string, string | number>;
  bookmarks: BookmarkNode[];
};
