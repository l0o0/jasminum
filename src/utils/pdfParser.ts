async function getPDFTitle(itemID: number): Promise<string> {
  // @ts-ignore - PDFWorker is not typed
  const recognizerData = await Zotero.PDFWorker.getRecognizerData(itemID, true);
  ztoolkit.log("recognizerData: ", debugDoc(recognizerData));
  const pdfData = recognizerDataToPdfData(recognizerData);
  ztoolkit.log("pdfData: ", pdfData);
  const docType = detectDocType(pdfData);
  ztoolkit.log("docType: ", docType);

  /* 
   * 更好的做法是，仅将属性名称语义化的 PDF 数据传递给 get*() 函数，
   * 由函数内部根据各文献类型的排版特点对数据进行重新组织。
   */
  switch (docType) {
    case "article":
      return getArticleTitle(pdfData);
    case "thesis":
      return getThesisTitle(pdfData);
  }
  return "";
}

function isValidTitle(line: PdfParagraph): boolean {
  return (
    line.classList.length === 0 && line.text.length > 3 && hasCJK(line.text)
  );
}

function getThesisTitle(data: PdfData): string {
  const contextLine = findParagraphInPagesReversed(data.pages, (pages) =>
    findParagraphAfter(pages.paragraphs, keyPatterns.thesis["bfore-title"]),
  );
  const maxSizeLine = findMaxSizeParagraph(
    data.pages.flatMap((page) => page.paragraphs),
  );
  return (contextLine?.text ?? maxSizeLine?.text ?? "").replace(
    /^(论文)?(颗|题)目(（.+?）)?：?/,
    "",
  );
}

function getArticleTitle(data: PdfData): string {
  let mainPage = data.pages[0];
  if (/《.+》网络首发论文/.test(mainPage.text)) {
    ztoolkit.log("CNKI advanced online article");
    mainPage = data.pages[1];
  }
  return (findMaxSizeParagraph(mainPage.paragraphs)?.text ?? "").replace(
    new RegExp(`[${footnoteMarkers}]+$`),
    "",
  );
}

function findParagraphInPages(
  pages: PdfPage[],
  finder: (
    page: PdfPage,
    index: number,
    pages: PdfPage[],
  ) => PdfParagraph | undefined,
): PdfParagraph | undefined {
  for (let i = pages.length - 1; i >= 0; i--) {
    const paragraph = finder(pages[i], i, pages);
    if (paragraph !== undefined) {
      return paragraph;
    }
  }
  return undefined;
}

function findParagraphInPagesReversed(
  pages: PdfPage[],
  finder: (
    page: PdfPage,
    index: number,
    pages: PdfPage[],
  ) => PdfParagraph | undefined,
): PdfParagraph | undefined {
  for (let i = 0; i < pages.length; i++) {
    const paragraph = finder(pages[i], i, pages);
    if (paragraph !== undefined) {
      return paragraph;
    }
  }
  return undefined;
}

function findParagraphAfter(paragraphs: PdfParagraph[], patterns: RegExp[]) {
  return paragraphs.findLast((paragraph, index, paragraphs) => {
    const anchorParagraph: PdfParagraph | undefined = paragraphs[index - 1];
    return (
      isValidTitle(paragraph) &&
      anchorParagraph &&
      patterns.some((regexp) => regexp.test(anchorParagraph.text))
    );
  });
}

function findParagraphBefore(paragraphs: PdfParagraph[], patterns: RegExp[]) {
  return paragraphs.find((paragraph, index, paragraphs) => {
    const anchorParagraph: PdfParagraph | undefined = paragraphs[index + 1];
    return (
      isValidTitle(paragraph) &&
      anchorParagraph &&
      patterns.some((regexp) => regexp.test(anchorParagraph.text))
    );
  });
}

function findMaxSizeParagraph(paragraphs: PdfParagraph[]) {
  let candidateParagraph: PdfParagraph | undefined;
  for (const paragraph of paragraphs) {
    if (isValidTitle(paragraph)) {
      if (
        !candidateParagraph ||
        parseFloat(paragraph.fontSize) > parseFloat(candidateParagraph.fontSize)
      ) {
        candidateParagraph = paragraph;
      }
    }
  }
  return candidateParagraph;
}

function detectDocType(data: PdfData): DocType {
  const hitsCounter = {
    article: 0,
    thesis: 0,
    book: 0,
  };
  if (data.totalPages > 10) {
    pageLoop: for (const page of data.pages) {
      for (const paragraph of page.paragraphs) {
        if (breakMarks.some((regexp) => regexp.test(paragraph.text))) {
          ztoolkit.log("stop at paragraph: ", paragraph.text);
          break pageLoop;
        }
        typeLoop: for (const key in docTypePatterns) {
          const docType = key as DocType;
          for (const pattern of docTypePatterns[docType]) {
            if (pattern.test(paragraph.text)) {
              ztoolkit.log(paragraph.text, "hits", pattern);
              hitsCounter[docType]++;
              if (hitsCounter[docType] > 3) {
                return docType;
              }
              break typeLoop;
            }
          }
        }
      }
    }
  }
  ztoolkit.log(hitsCounter);
  return Object.values(hitsCounter).some((count) => count > 0)
    ? Object.keys(hitsCounter)
        .map((key) => key as DocType)
        .reduce((a, b) => (hitsCounter[a] > hitsCounter[b] ? a : b))
    : "article";
}

function sortLines(lines: PdfLine[]): PdfLine[] {
  return lines.sort((lineA, lineB) => {
    if (lineA.baseline == lineB.baseline) {
      return lineA.xMin - lineB.xMin;
    }
    return lineA.baseline - lineB.baseline;
  });
}

function recognizerDataToPdfData(data: RecognizerData): PdfData {
  return {
    metadata: data.metadata,
    totalPages: data.totalPages,
    pages: data.pages.map((page) => recognizerPageToPdfPage(page)),
  };
}

function recognizerPageToPdfPage(page: RecognizerPage): PdfPage {
  const lines = page[2][0][0][0][4].map(recognizerLineToPdfLine);
  // 这里会将双烂排序的段落打乱，甚至将尾注混合在正文段落中，但我们不关心这部分信息。
  // 以后如果需要获取更细粒度的信息，需要对行盒子的位置关系进行比较进行多次分组和排序。
  // 我已经对此进行了测试，但复杂度和性能都不太好。
  // 考虑AI识别的普遍应用，将来可能会有更好的解决方案。
  const paragraphs = pdfLinesToPdfParagraphs(sortLines(lines));
  return {
    width: page[0],
    height: page[1],
    text: paragraphs.map((paragraph) => paragraph.text).join("\n"),
    classList: [],
    paragraphs,
  };
}

function pdfLinesToPdfParagraphs(lines: PdfLine[]): PdfParagraph[] {
  const paragraphs: PdfParagraph[] = [];
  for (let i = 0; i < lines.length; i++) {
    const preLine = lines[i - 1];
    const curLine = lines[i];
    const paragraph = paragraphs.at(-1);
    if (!paragraph) {
      paragraphs.push({
        fontSize: curLine.fontSize,
        text: curLine.text,
        classList: [],
        lines: [curLine],
      });
    } else {
      const fontSizeEqual = preLine.fontSize === curLine.fontSize;
      const semanticCoherence =
        /\S([、，：～,:&]|—{1,2})$/iu.test(preLine.text) ||
        /^—{1,2}\S/iu.test(curLine.text);
      function typographicConsistency() {
        function getFontIndexies(words: PdfWord[]) {
          return Array.from(new Set(words.map((word) => word.fontIndex)));
        }
        if (hasCJK(preLine.text) && hasCJK(curLine.text)) {
          const preFontIndexies = getFontIndexies(
            preLine.words.filter((word) => hasCJK(word.text)),
          );
          const curFontIndexies = getFontIndexies(
            curLine.words.filter((word) => hasCJK(word.text)),
          );
          return curFontIndexies.some((fontIndex) =>
            preFontIndexies.includes(fontIndex),
          );
        } else if (!hasCJK(preLine.text) && !hasCJK(curLine.text)) {
          const preFontIndexies = getFontIndexies(
            preLine.words.filter((word) => !hasCJK(word.text)),
          );
          const curFontIndexies = getFontIndexies(
            curLine.words.filter((word) => !hasCJK(word.text)),
          );
          return curFontIndexies.some((fontIndex) =>
            preFontIndexies.includes(fontIndex),
          );
        }
        return false;
      }
      if ((fontSizeEqual || semanticCoherence) && typographicConsistency()) {
        paragraph.lines.push(curLine);
      } else {
        paragraph.fontSize = preLine.fontSize;
        let text = "";
        if (paragraph.lines.length === 1) {
          text = paragraph.lines[0].text;
        } else if (paragraph.lines.length > 1) {
          paragraph.lines.reduce((pre, cur) => {
            let delimiter = "";
            const wordAndWord = /\w$/.test(pre.text) && /^\w/.test(cur.text);
            const punctuationAndWord =
              /[!$%&\]);:,.>]$/iu.test(pre.text) && /^\w/.test(cur.text);
            if (wordAndWord || punctuationAndWord) {
              delimiter = " ";
            }
            text += `${pre.text}${delimiter}${cur.text}`;
            return cur;
          });
        }
        paragraph.text = text;
        paragraphs.push({
          fontSize: curLine.fontSize,
          text: curLine.text,
          classList: [],
          lines: [curLine],
        });
      }
    }
  }
  return paragraphs;
}

function recognizerLineToPdfLine(line: RecognizerLine): PdfLine {
  const words = line[0].map(recognizerWordToPdfWord);
  return pdfWordsToPdfLine(words);
}

function pdfWordsToPdfLine(words: PdfWord[]): PdfLine {
  const CJKWords = words.filter((word) => hasCJK(word.text));
  const fontSize = average(
    CJKWords.length ? CJKWords : words,
    (word) => word.fontSize,
  ).toFixed(2);
  return {
    xMin: Math.min(...words.map((word) => word.xMin)),
    yMin: Math.min(...words.map((word) => word.yMin)),
    xMax: Math.max(...words.map((word) => word.xMax)),
    yMax: Math.max(...words.map((word) => word.yMax)),
    fontSize,
    baseline: average(words, (word) => word.baseline),
    text: normalizeText(
      words.map((word) => `${word.text}${word.spaceAfter ? " " : ""}`).join(""),
    ),
    words,
  };
}

function recognizerWordToPdfWord(word: RecognizerWord): PdfWord {
  return {
    xMin: word[0],
    yMin: word[1],
    xMax: word[2],
    yMax: word[3],
    fontSize: word[4],
    spaceAfter: Boolean(word[5]),
    baseline: word[6],
    rotation: Boolean(word[7]),
    underlined: Boolean(word[8]),
    bold: Boolean(word[9]),
    italic: Boolean(word[10]),
    colorIndex: word[11],
    fontIndex: word[12],
    text: word[13],
  };
}

function average<T>(arr: T[], callback: (arg: T) => number): number {
  return arr.reduce((sum, cur) => sum + callback(cur), 0) / arr.length;
}

function hasCJK(str: string) {
  return /\p{Unified_Ideograph}/u.test(str);
}

function xnor(input1: boolean, input2: boolean) {
  return (input1 && input2) || (!input1 && !input2);
}

function debugDoc(data: RecognizerData) {
  function parsePage(page: RecognizerPage) {
    return page[2][0][0][0][4].map((line) => {
      return line[0].map((word) => {
        return {
          xMin: word[0],
          yMin: word[1],
          xMax: word[2],
          yMax: word[3],
          fontSize: word[4],
          spaceAfter: Boolean(word[5]),
          baseline: word[6],
          rotation: Boolean(word[7]),
          underlined: Boolean(word[8]),
          bold: Boolean(word[9]),
          italic: Boolean(word[10]),
          colorIndex: word[11],
          fontIndex: word[12],
          text: word[13],
        };
      });
    });
  }
  const pages = data.pages.map(parsePage);
  return pages.map((page) =>
    page.map((line) => ({
      fontSize: average(line, (word) => word.fontSize).toFixed(2),
      text: line
        .map((word) => `${word.text}${word.spaceAfter ? " " : ""}`)
        .join(""),
      baseLine: average(line, (word) => word.baseline),
    })),
  );
}

const breakMarks = [
  // 地址
  /关键词[:：]/,
  /^（?((\d*\.)?\s*[\p{Unified_Ideograph}，；\s]+\d{6}\b)+）?/u,
  /^[[【〔［]]?收稿日期/,
  /^[[【〔［]]?\**通(信|讯)作者/,
  /(原|独)创性声明$/,
  /使用授权(书|声明)$/,
  /^目录$/,
  /^(中文)?摘要$/,
];

const keyPatterns: {
  [type in DocType]: {
    [className: string]: RegExp[];
  };
} = {
  article: {},
  thesis: {
    "before-title": [
      /（?\p{Unified_Ideograph}*((硕|博)士)?(研究生)?.*([学宇字]位|毕业)论文）?$/u,
      /^（?\p{Unified_Ideograph}*(([硕博][士±])?(专业|[学宇字]术)|([硕博][士|±])(专业|[学宇字]术)?)[学宇字]位）?$/u,
      /^（?\p{Unified_Ideograph}*博士后研究工作报告）?$/u,
      // 陕西师范大学《气候变化和人类活动对祁连山草地演变影响程度的研究》
      /^（(专业|[学宇字]术)型）$/,
      // 广西师范学院《农户耕地撂荒影响因素研究》
      /^论文题目([(（]中英文[）)])$/,
    ],
  },
  book: {},
};

function patternsInType(type: DocType): RegExp[] {
  return Object.values(keyPatterns[type]).flat();
}

const docTypePatterns: {
  [type in DocType]: RegExp[];
} = {
  article: [],
  thesis: [
    ...patternsInType("thesis"),
    /(([学宇字]|院)校|单位)代码/,
    /保?密等?级/,
    /[学宇字]号/,
    /(研究生|([学宇字]位)?申请人)(姓名)?/,
    /所在([学宇字]院|单位)|培养单位/,
    /(指导教师|导师)(姓名)?/,
    /(专业|[学宇字]科)(领域)?(名称)?/,
    /(论文)?(答辩|提交|完成)(日期|时间)/,
    /答辩委员会/,
  ],
  book: [],
};

const letterShapeMap = {
  /* Uppercase letters */
  Ａ: "A",
  Ｂ: "B",
  Ｃ: "C",
  Ｄ: "D",
  Ｅ: "E",
  Ｆ: "F",
  Ｇ: "G",
  Ｈ: "H",
  Ｉ: "I",
  Ｊ: "J",
  Ｋ: "K",
  Ｌ: "L",
  Ｍ: "M",
  Ｎ: "N",
  Ｏ: "O",
  Ｐ: "P",
  Ｑ: "Q",
  Ｒ: "R",
  Ｓ: "S",
  Ｔ: "T",
  Ｕ: "U",
  Ｖ: "V",
  Ｗ: "W",
  Ｘ: "X",
  Ｙ: "Y",
  Ｚ: "Z",
  /* Lowercase letters */
  ａ: "a",
  ｂ: "b",
  ｃ: "c",
  ｄ: "d",
  ｅ: "e",
  ｆ: "f",
  ｇ: "g",
  ｈ: "h",
  ｉ: "i",
  ｊ: "j",
  ｋ: "k",
  ｌ: "l",
  ｍ: "m",
  ｎ: "n",
  ｏ: "o",
  ｐ: "p",
  ｑ: "q",
  ｒ: "r",
  ｓ: "s",
  ｔ: "t",
  ｕ: "u",
  ｖ: "v",
  ｗ: "w",
  ｘ: "x",
  ｙ: "y",
  ｚ: "z",
  /* Arabic numerals */
  "０": "0",
  "１": "1",
  "２": "2",
  "３": "3",
  "４": "4",
  "５": "5",
  "６": "6",
  "７": "7",
  "８": "8",
  "９": "9",
};

const footnoteMarkers = "*＊∗●Δ①②③④⑤⑥⑦⑧⑨➀➁➃➄➅➆➇➈";

function normalizeText(str: string) {
  str = Zotero.Utilities.trimInternal(str);
  for (const fullChar in letterShapeMap) {
    str = str.replace(
      new RegExp(fullChar, "g"),
      letterShapeMap[fullChar as keyof typeof letterShapeMap],
    );
  }
  return (
    str
      // eslint-disable-next-line no-control-regex
      .replace(/[\x00-\x1F\x7F\p{Private_Use}]/gu, "")
      .replace(/\s?([\p{Unified_Ideograph}—－])\s?/gu, "$1")
      .trim()
  );
}

export { getPDFTitle };
