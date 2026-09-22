const PDF_FILENAME_SYSTEM_PROMPT = `你负责从 PDF 文件名中提取文献检索参数。

要求：
1. 只能依据文件名中明确出现的信息，不要猜测，也不要根据常识、标题内容或外部知识补全。
2. title 返回可用于检索的文献标题；无法可靠识别时返回空字符串。
3. author 仅在能明确判断为作者姓名时返回。存在多位作者时只返回第一位，并去掉分隔符及表示省略的“等”；无法可靠识别时返回空字符串。
4. 忽略文件扩展名、重复下载编号、下载站名称、版本、年份、卷期、页码、DOI、出版物名称及其他非标题和非作者信息。
5. 保留标题和姓名中有意义的字符与顺序，仅在分隔含义明确时清理文件名分隔符。
6. 不要为了填满字段而补全、改写或推断内容。`;

function createPDFFilenamePrompt(filename: string): string {
  return `解析以下 PDF 文件名并返回 title 和 author：${JSON.stringify(filename)}`;
}

const PDF_PAGE_RECOGNITION_SYSTEM_PROMPT = `你负责识别学术 PDF 页面中的 Zotero 书目信息和目录结构。

先判断文献主要语言，再提取对应语言的元数据：
1. 综合所提供页面，优先依据正文段落及章节标题判断主要语言。英文对照标题、Abstract、Keywords、作者拼音和参考文献不代表正文语言；不要根据它们出现的位置、字号或单独存在的英文摘要将中文论文判断为英文论文。
2. 如果截图未包含正文，可结合主标题、主摘要及其他原文信息判断；证据不足或无法确定主次的双语文献，language 返回 null，不要强行选择。
3. 正文主要为中文时，language 返回 zh；主要为英文时返回 en；其他语言使用明确可判断的语言代码。中文论文同时出现中英文信息时，title 使用中文标题，abstractNote 使用中文摘要，creators 使用中文作者姓名，publicationTitle 使用页面中明确出现的中文刊名。英文论文优先使用英文原文信息。
4. 不要拼接中英文标题或摘要，不要把同一作者的中文姓名和英文拼音当作两位作者。若只存在一种清晰可见的字段版本，可保留该版本，但不能因此改变文献主要语言；不要自行翻译标题、摘要、刊名或作者姓名，也不要从拼音猜测汉字。证据不明确时对应字段返回 null。

条目类型仅可为 journalArticle、conferencePaper、preprint、newspaperArticle、thesis 或 unknown。学位论文使用 thesis：university 填写明确授予学位的学校，不是学院；thesisType 填写页面明确标注的学位论文类型（如硕士学位论文、博士学位论文）。导师、指导教师及行业导师不是论文作者，不加入 creators；不得根据学校名称猜测所在地。非学位论文的 university 和 thesisType 返回 null。截图页数不代表条目类型，最终类型必须根据页面内容判断。
只使用图片中清晰可见的信息，不要猜测、补全或依据常识推断。无法确定的字段返回 null，无法确定的列表返回空数组；无法确认条目类型时使用 unknown。字段名和 creatorType 使用 Zotero 标准名称。creators 中个人姓名使用 firstName/lastName 且 name 为 null，机构名使用 name 且 firstName/lastName 为 null。outline 表示目录层级，level 从 1 开始，page 是文中明确标注的页码。evidence 为关键元数据字段提供图片序号和简短原文证据。`;

const PDF_PAGE_RECOGNITION_PROMPT =
  "依次查看这些 PDF 页面截图，先依据正文确定 language，再填写该语言的标题、摘要、作者和刊名。若正文为中文且中英文版本均存在，必须选中文原文，不得选英文对照版本。evidence 中用 field=language 记录支持语言判断的正文或章节标题原文及图片序号；没有可靠证据则 language=null。输出前核对 title、abstractNote、creators、publicationTitle 是否误取了翻译版本。JSON 的英文字段名不代表字段值应为英文。图片顺序就是 PDF 页序。";

const PDF_METADATA_FIELD_DESCRIPTIONS = {
  language:
    "正文主要语言，中文为 zh，英文为 en。依据正文而非英文对照标题或摘要判断；证据不足返回 null。",
  title:
    "按正文主要语言选择截图中的原文标题。中文正文且有中文标题时必须返回中文标题，不使用英文对照标题，不翻译。",
  abstractNote:
    "按正文主要语言选择截图中同语言的摘要。中文正文且有中文摘要时必须返回中文摘要，不使用英文 Abstract，不自行翻译或概括。",
  creators:
    "按原文顺序提取作者。中文论文存在中文姓名时使用中文姓名，不使用其拼音对照，不重复提取；不能从拼音猜测汉字。",
  publicationTitle:
    "截图中的刊名。中文论文同时有中英文刊名时使用中文刊名，不翻译、不扩写缩写。",
};

export {
  PDF_METADATA_FIELD_DESCRIPTIONS,
  PDF_FILENAME_SYSTEM_PROMPT,
  PDF_PAGE_RECOGNITION_PROMPT,
  PDF_PAGE_RECOGNITION_SYSTEM_PROMPT,
  createPDFFilenamePrompt,
};
