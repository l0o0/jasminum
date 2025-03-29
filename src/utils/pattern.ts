export function getArgsFromPattern(
  filename: string,
  pattern: string,
): SearchOption | null {
  // Make query parameters from filename
  const prefix = filename
    .replace(/\.\w+$/, "") // 删除文件后缀
    .replace(/\.ashx$/g, "") // 删除末尾.ashx字符
    .replace(/^_|_$/g, "") // 删除前后的下划线
    .replace(/[（(]\d+[）)]$/, "") // 删除重复下载时文件名出现的数字编号 (1) （1）
    .trim();
  // 当文件名模板为"{%t}_{%g}"，文件名无下划线_时，将文件名认定为标题
  if (pattern === "{%t}_{%g}" && !prefix.includes("_")) {
    return {
      author: "",
      title: prefix,
    };
  }
  const patternSepArr: string[] = pattern.split(/{%[^}]+}/);
  const patternSepRegArr: string[] = patternSepArr.map((x) =>
    x.replace(/([\[\\\^\$\.\|\?\*\+\(\)])/g, "\\$&"),
  );
  const patternMainArr: string[] | null = pattern.match(/{%[^}]+}/g);
  //文件名中的作者姓名字段里不能包含下划线，请使用“&,，”等字符分隔多个作者，或仅使用第一个作者名（加不加“等”都行）。
  const patternMainRegArr = patternMainArr!.map((x) =>
    x.replace(
      /.+/,
      /{%y}/.test(x) ? "(\\d+)" : /{%g}/.test(x) ? "([^_]+)" : "(.+)",
    ),
  );
  const regStrInterArr = patternSepRegArr.map((_, i) => [
    patternSepRegArr[i],
    patternMainRegArr[i],
  ]);
  const patternReg = new RegExp(
    // eslint-disable-next-line prefer-spread
    [].concat
      .apply([], regStrInterArr as never)
      .filter(Boolean)
      .join(""),
    "g",
  );

  const prefixMainArr = patternReg.exec(prefix);
  // 文件名识别结果为空，跳出警告弹窗
  if (prefixMainArr === null) {
    return null;
  }
  const titleIdx = patternMainArr!.indexOf("{%t}");
  const authorIdx = patternMainArr!.indexOf("{%g}");
  const titleRaw = titleIdx != -1 ? prefixMainArr[titleIdx + 1] : "";
  const authors = authorIdx != -1 ? prefixMainArr[authorIdx + 1] : "";
  const authorArr = authors.split(/[,，&]/);
  let author = authorArr[0];
  if (authorArr.length == 1) {
    //删除名字后可能出现的“等”字，此处未能做到识别该字是否属于作者姓名。
    //这种处理方式的问题：假如作者名最后一个字为“等”，例如：“刘等”，此时会造成误删。
    //于是对字符数进行判断，保证删除“等”后，至少还剩两个字符，尽可能地避免误删。

    author =
      author.endsWith("等") && author.length > 2
        ? author.substring(0, author.length - 1)
        : author;
  }

  //为了避免文件名中的标题字段里存在如下两种情况而导致的搜索失败:
  //原标题过长，文件名出现“_省略_”；
  //原标题有特殊符号（如希腊字母、上下标）导致的标题变动，此时标题也会出现“_”。
  //于是只取用标题中用“_”分割之后的最长的部分作为用于搜索的标题。

  //这种处理方式的问题：假如“最长的部分”中存在知网改写的部分，也可能搜索失败。
  //不过这只是理论上可能存在的情形，目前还未实际遇到。

  let title: string;
  // Zotero.debug(titleRaw);
  // if (/_/.test(titleRaw)) {

  //     //getLongestText函数，用于拿到字符串数组中的最长字符
  //     //摘自https://stackoverflow.com/a/59935726
  //     const getLongestText = (arr) => arr.reduce(
  //         (savedText, text) => (text.length > savedText.length ? text : savedText),
  //         '',
  //     );
  //     title = getLongestText(titleRaw.split(/_/));
  // } else {
  //     title = titleRaw;
  // }

  // 去除_省略_ "...", 多余的 _ 换为空格
  // 标题中含有空格，查询时会启用模糊模式
  title = titleRaw.replace("_省略_", " ").replace("...", " ");
  title = title.replace(/_/g, " ");
  return {
    author: author,
    title: title,
  };
}
