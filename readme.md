<div align="center">
  <h1 align="center"><img class="center" src="./chrome/skin/default/jasminum/icon.png" alt="Icon" width=40px>  Jasminum - 茉莉花</h1>
</div>

一个简单的 Zotero 中文插件（这个插件并不是 Zotero translator），实现的功能有：

1. 拆分或合并 Zotero 中条目作者姓和名
2. 根据知网上下载的文献文件来抓取引用信息（就是根据文件名）
3. 添加中文PDF/CAJ时，自动拉取知网数据，该功能默认关闭。需要到设置中开启，注意添加的文件名需要含有中文，全英文没有效果（还是根据文件名）
3. 为知网的学位论文 PDF 添加书签
4. 更新中文 translators
5. 拉取文献引用次数，是否核心期刊

## 如何使用

下载最新的[xpi](https://github.com/l0o0/jasminum/releases/latest)文件进行安装，安装方法：打开 Zotero -> 工具 -> 插件 -> 右上小齿轮图标 -> Install Add-on From File ... -> 选择下载好的xpi文件。

如果想使用书签添加功能，需要提前安装好 PDFtk server，该书签添加工具有 Windows， Linux 和 Mac，请根据自己的系统下载对应的版本进行安装，并在选项中设置好对应的目录。[PDFtk server 下载链接](https://www.pdflabs.com/tools/pdftk-server/)

**Mac 用户**（感谢[@GuokaiLiu](https://github.com/GuokaiLiu)同学在 [issue](https://github.com/l0o0/jasminum/issues/7#issuecomment-706448964) 中的补充）
macos(10.15)用户：
下载：https://www.pdflabs.com/tools/pdftk-the-pdf-toolkit/pdftk_server-2.02-mac_osx-10.11-setup.pkg
路径：`/opt/pdflabs/pdftk/`. （该路径默认对外隐藏无法选取）
选择路径的技巧：`shift+command+G`: 输入：`/opt/pdflabs/pdftk/`，选择`bin`确认

> 官网：https://www.pdflabs.com/tools/pdftk-server/
> After installation, open a Terminal, type pdftk and press Return. Pdftk will respond by displaying brief usage information. Access pdftk documenation by running man pdftk.

> This installer creates a directory on you Mac: /opt/pdflabs/pdftk/. This will contain a bin directory which holds the pdftk program and a docs directory which holds the complete PDFtk manual.

## 如何更新翻译器

Jasminum 插件中可以从[Translators_CN](https://github.com/l0o0/translators_CN)中下载最新的翻译器。可以参考[视频](https://www.bilibili.com/video/BV1F54y1k73n/)进行更新。这里注意下，可以跳过前面的下载步骤，参考浏览器更新的说明。