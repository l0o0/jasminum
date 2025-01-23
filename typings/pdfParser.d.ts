type IOItems = {
  [key: string]: string;
};

type RecognizerData = {
  metadata: {
    [key: string]: string;
  };
  totalPages: number;
  pages: RecognizerPage[];
};

type RecognizerPage = {
  // pageWidth
  0: number;
  // pageHeight
  1: number;
  2: [[[[0, 0, 0, 0, RecognizerLine[]]]]];
};

type RecognizerLine = [RecognizerWord[]];

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

type JSONLine = {
  fontSize: number;
  class: string;
  text: string;
};

type LiteratureType = "article" | "thesis" | "book";
