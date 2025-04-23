type RecognizerData = {
  metadata: {
    [key: string]: string;
  };
  totalPages: number;
  pages: RecognizerPage[];
};

type PdfData = {
  metadata: {
    [key: string]: string;
  };
  totalPages: number;
  pages: PdfPage[];
};

type RecognizerPage = {
  // pageWidth
  0: number;
  // pageHeight
  1: number;
  2: [[[[0, 0, 0, 0, RecognizerLine[]]]]];
};

type PdfPage = {
  width: number;
  height: number;
  text: string;
  classList: string[];
  paragraphs: PdfParagraph[];
};

type PdfParagraph = {
  fontSize: string;
  text: string;
  classList: string[];
  lines: PdfLine[];
};

type RecognizerLine = [RecognizerWord[]];

type PdfLine = {
  xMin: number;
  yMin: number;
  xMax: number;
  yMax: number;
  fontSize: string;
  baseline: number;
  text: string;
  words: PdfWord[];
};

type RecognizerWord = [
  // 0: xMin
  number,
  // 1: yMin
  number,
  // 2: xMax
  number,
  // 3: yMax
  number,
  // 4: fontSize
  number,
  // 5: spaceAfter
  0 | 1,
  // 6: baseline
  number,
  // 7: rotation
  0,
  // 8: underlined
  0,
  // 9: bold
  0 | 1,
  // 10: italic
  0 | 1,
  // 11: colorIndex
  0,
  // 12: fontIndex
  number,
  // 13: text
  string,
];

type PdfWord = {
  xMin: number;
  yMin: number;
  xMax: number;
  yMax: number;
  fontSize: number;
  spaceAfter: boolean;
  baseline: number;
  rotation: boolean;
  underlined: boolean;
  bold: boolean;
  italic: boolean;
  colorIndex: number;
  fontIndex: number;
  text: string;
};

type DocType = "article" | "thesis" | "book";
