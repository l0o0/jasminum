async function getPDFTitle(itemID: number): Promise<string> {
  // @ts-ignore - PDFWorker is not typed.
  const data: RecognizerData = await Zotero.PDFWorker.getRecognizerData(
    itemID,
    true,
  );
  const manager = new PDFTitleManager(data);
  return manager.getTitle();
}

class PDFTitleManager {
  doc: DocumentFragment;
  literatureType: LiteratureType;
  data!: RecognizerWord[][][];
  constructor(data: RecognizerData) {
    this.doc = ztoolkit.getGlobal("document").createDocumentFragment();
    this.initDoc(data.pages);
    this.literatureType = "article";
    const hitsCounter: { [key in LiteratureType]: number } = {
      article: 0,
      thesis: 0,
      book: 0,
    };
    if (data.totalPages > 30) {
      let changed: boolean = false;
      for (const page of this.doc.children) {
        let allHits = 0;
        for (const line of page.children) {
          const text = line.textContent as string;
          ztoolkit.log(`parse line: ${text}`);
          for (const className in classNames) {
            if (classNames[className].some((regexp) => regexp.test(text))) {
              ztoolkit.log(`add class name: ${className}`);
              line.classList.add(className);
            }
          }
          for (const key in tokens) {
            const theType = key as LiteratureType;
            tokens[theType]?.forEach((regexp) => {
              if (regexp.test(text)) {
                ztoolkit.log(`hit ${theType}`);
                line.classList.add("hit", theType);
                hitsCounter[theType]++;
                allHits++;
              }
            });
            if (!changed && hitsCounter[theType] > 3) {
              ztoolkit.log(`change literatureType as ${theType}`);
              this.literatureType = theType;
              changed = true;
            }
          }
        }
        if (allHits > 3) page.className = "main";
      }
    }
    ztoolkit.log(this.toJSON());
  }
  private initDoc(pages: RecognizerPage[]) {
    const sortedPages = pages.map((page) => {
      return page[2][0][0][0][4]
        .map((line) => line[0])
        .sort((lineA, lineB) => {
          const baselineA = average(lineA, (word) => word[6]);
          const baselineB = average(lineB, (word) => word[6]);
          if (baselineA == baselineB) {
            return (
              min(lineA, (word) => word[0]) - min(lineB, (word) => word[0])
            );
          }
          return baselineA - baselineB;
        });
    });
    this.data = sortedPages;
    for (const page of sortedPages) {
      const docPage = ztoolkit.getGlobal("document").createElement("div");
      let docLine = ztoolkit.getGlobal("document").createElement("p");
      for (const line of page) {
        /* 
        中英文使用不同字体时，英文词字体的fontSize可能与中文不同，
        因此应尝试过滤不含中文字体的单词来统计本行的平均字号。
         */
        const filteredWords = line.filter((word) => hasCJK(word[13]));
        const fontSize = average(
          filteredWords.length ? filteredWords : line,
          (word) => word[4],
        ).toFixed(4);

        const firstWord = line[0];
        const lastWord = line[line.length - 1];

        let text = "";
        line.forEach((word) => {
          text += `${word[13]}${word[5] > 0 ? " " : ""}`.replace(
            /[\r\n]+$/,
            "",
          );
        });
        text = normalize(text);
        if (breaks.some((regexp) => regexp.test(text))) {
          ztoolkit.log("stop parsing PDF data at line: ", text);
          if (!docLine.parentNode) docPage.appendChild(docLine);
          this.doc.appendChild(docPage);
          return;
        }
        if (
          // 未赋文本的行不得续行
          docLine.textContent &&
          // 字体字号严格相等
          ((fontSize == docLine.dataset.fontSize &&
            firstWord[12].toString() == docLine.dataset.LastfontIndex) ||
            // 根据上下文语境推测语句未结束
            /[a-z\d\u4e00-\u9fff]([、，：]|—{1,2})$/i.test(
              docLine.textContent,
            ) ||
            /^—{1,2}[a-z\d\u4e00-\u9fff]/i.test(text)) &&
          // 都含有中文（中文文本），或者都不含中文（外文文本）
          xnor(hasCJK(docLine.textContent), hasCJK(text))
        ) {
          docLine.textContent +=
            /[\u4e00-\u9fff、，：—]$/.test(docLine.textContent) &&
            /^[\u4e00-\u9fff—]/.test(text)
              ? text
              : ` ${text}`;
          docLine.dataset.LastfontIndex = lastWord[12].toString();
        } else {
          // 不满足续行条件，且具有相关属性，则可以加入到页面中
          if (docLine.dataset.fontSize && docLine.dataset.LastfontIndex) {
            docPage.appendChild(docLine);
          }
          docLine = ztoolkit.getGlobal("document").createElement("p");
          docLine.dataset.fontSize = fontSize;
          docLine.textContent = text;
          docLine.dataset.LastfontIndex = lastWord[12].toString();
        }
        if (!docLine.parentNode) docPage.appendChild(docLine);
      }
      this.doc.appendChild(docPage);
    }
  }
  maxSizeLineInPage(parent: Element | null, extraRule?: number | string) {
    if (!parent) return "";
    const lines = Array.from(parent.querySelectorAll("p"))
      .filter(
        (line): line is HTMLElement =>
          line != null && this.maybeTitle(line as HTMLElement),
      )
      .map((line) => ({
        fontSize: parseFloat(line.dataset!.fontSize as string),
        text: line.textContent as string,
      }))
      .sort((lineA, lineB) => {
        return lineB.fontSize - lineA.fontSize;
      });
    ztoolkit.log(lines);
    switch (typeof extraRule) {
      case "number":
        return lines[extraRule].text || "";
      case "string":
        return lines.find((line) => line.text != extraRule)?.text || "";
      default:
        return lines[0].text || "";
    }
  }
  followingLine(page: Element | null) {
    if (!page) return "";
    const afters = page.querySelectorAll(".after");
    const lastAfter = afters.item(afters.length - 1);
    if (!lastAfter) return "";
    for (const line of page.children) {
      const theLine = line as HTMLParagraphElement;
      if (lastAfter.compareDocumentPosition(theLine) & 4) {
        if (this.maybeTitle(theLine)) {
          return theLine.textContent as string;
        }
      }
    }
    return "";
  }
  toJSON() {
    const json = {
      literatureType: this.literatureType,
      doc: [] as [string, JSONLine[]][],
      data: this.data,
    };
    for (const page of this.doc.children) {
      const jsonPage: [string, JSONLine[]] = [page.className, []];
      for (const line of page.children) {
        const paragraph = line as HTMLParagraphElement;
        jsonPage[1].push({
          fontSize: parseFloat(paragraph.dataset.fontSize as string),
          text: paragraph.textContent as string,
          class: paragraph.className,
        });
      }
      json.doc.push(jsonPage);
    }
    return json;
  }
  getTitle() {
    switch (this.literatureType) {
      case "thesis": {
        const mainPages = this.doc.querySelectorAll(".main");
        return (
          this.followingLine(mainPages.item(1)) ||
          this.followingLine(mainPages.item(0)) ||
          this.maxSizeLineInPage(mainPages.item(1)) ||
          this.maxSizeLineInPage(mainPages.item(0))
        ).replace(/^(论文)?(颗|题)目(（.+?）)?：?/, "");
      }
      default: {
        let mainPage = this.doc.firstChild as HTMLDivElement;
        if (/《.+》网络首发论文/.test(this.maxSizeLineInPage(mainPage))) {
          mainPage = mainPage.nextElementSibling as HTMLDivElement;
        }
        let extraRule = undefined;
        for (const key in exceptions) {
          if (mainPage.textContent?.includes(key)) {
            extraRule = exceptions[key];
            break;
          }
        }
        return this.maxSizeLineInPage(mainPage, extraRule).replace(
          new RegExp(`[${footNoteMarkers}]+$`),
          "",
        );
      }
    }
  }
  private maybeTitle(elm: HTMLElement): boolean {
    return (
      !elm.className &&
      typeof elm.textContent === "string" &&
      hasCJK(elm.textContent) &&
      elm.textContent!.length > 3
    );
  }
}

function min<T>(arr: T[], callback: (arg: T) => number): number {
  return arr.reduce((min, cur) => Math.min(min, callback(cur)), Infinity);
}

function average<T>(arr: T[], callback: (arg: T) => number): number {
  return arr.reduce((sum, cur) => sum + callback(cur), 0) / arr.length;
}

function hasCJK(str: string) {
  return /[\u4e00-\u9fff]/.test(str);
}

function xnor(input1: boolean, input2: boolean) {
  return (input1 && input2) || (!input1 && !input2);
}

const breaks = [
  // 地址
  /^（?((\d*\.)?\s*[\u4e00-\u9fff，；\s]+\d{6}\b)+）?/,
  /^[[【〔［]]?收稿日期/,
  /^[[【〔［]]?\**通(信|讯)作者/,
  /(原|独)创性声明$/,
  /使用授权(书|声明)$/,
  /^目录$/,
  /^(中文)?摘要$/,
];

const classNames: {
  [classNmae: string]: RegExp[];
} = {
  after: [
    /（?[\u4e00-\u9fff]*((硕|博)士)?(研究生)?.*([学宇字]位|毕业)论文）?$/,
    /^（?[\u4e00-\u9fff]*(([硕博][士±])?(专业|[学宇字]术)|([硕博][士|±])(专业|[学宇字]术)?)[学宇字]位）?$/,
    /^（?[\u4e00-\u9fff]*博士后研究工作报告）?$/,
    // 陕西师范大学《气候变化和人类活动对祁连山草地演变影响程度的研究》
    /^（(专业|[学宇字]术)型）$/,
    // 广西师范学院《农户耕地撂荒影响因素研究》
    /^论文题目([(（]中英文[）)])$/,
  ],
};

const tokens: {
  [type in LiteratureType]?: RegExp[];
} = {
  thesis: [
    /(([学宇字]|院)校|单位)代码/,
    /保?密等?级/,
    /[学宇字]号/,
    /[\u4e00-\u9fff（）]*(大[学宇字]|[学宇字]院|分校|研究[所院])/,
    ...classNames.after,
    /(研究生|([学宇字]位)?申请人|作者)(姓名)?/,
    /所在([学宇字]院|单位)|培养单位/,
    /指?导教?师(姓名)?/,
    /(专业|[学宇字]科)(领域)?(名称)?/,
    /研究方向/,
    /(论文)?(答辩|提交|完成)(日期|时间)/,
    /答辩委员会/,
  ],
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

const footNoteMarkers = "*＊∗●Δ①②③④⑤⑥⑦⑧⑨➀➁➃➄➅➆➇➈";

function normalize(str: string) {
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
      .replace(/\s?([\u4e00-\u9fff—－])\s?/g, "$1")
      .trim()
  );
}

const exceptions: { [key: string]: number | string } = {
  "河北大学学报（哲学社会科学版）": 1,
  环境科学学报: "环境科学学报",
};

export { getPDFTitle };
