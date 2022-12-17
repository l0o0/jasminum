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

### Mac系统
感谢各位同学提供的信息   
[@GuokaiLiu](https://github.com/GuokaiLiu)， [issue](https://github.com/l0o0/jasminum/issues/7#issuecomment-706448964)
[@tsunho12](https://github.com/tsunho12)， [#135](https://github.com/l0o0/jasminum/issues/135)
[@simon2413](https://github.com/simon2413)， [#55](https://github.com/l0o0/jasminum/issues/55)

**Intel MacOS(>10.15)**
由于官方未更新PDFtk server最新版本的超链接，通过官网首页下载的PDFtk server至今(2021.10.26)仍不支持部分较新的mac系统，目前推荐通过：https://www.pdflabs.com/tools/pdftk-the-pdf-toolkit/pdftk_server-2.02-mac_osx-10.11-setup.pkg 下载。

**M1 Mac**

需要先安装 M1 版本的 homebrew，然后在终端 Terminal 中
```bash
brew install pdftk-java
# 如果安装失败或使用异常，使用下面这条命令安装
HOMEBREW_BOTTLE_DOMAIN= brew install pdftk-java
which pdftk
```
第一条命令是安装 pdftk，第二条命令是查看 pdftk 的安装路径。具体路径设置方法参考下文的路径选择。

PDF server 安装失败（m1用户）的提示如下：

```bash
[user@hostname ~ ]$ pdftk --version 
zsh: bad CPU type in executable: pdftk
[user@hostname ~ ]$ 
```

PDF server 成功安装的提示如下：

```bash
[user@ hostname ~ ]$ pdftk --version

pdftk 2.02 a Handy Tool for Manipulating PDF Documents
Copyright (c) 2003-13 Steward and Lee, LLC - Please Visit: www.pdftk.com
This is free software; see the source code for copying conditions. There is
NO warranty, not even for MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
[user@ hostname ~ ]$ 
```

Zotero 配置`pdftk`路径：`/opt/pdflabs/pdftk/`或`/usr/local/bin/pdftk` （该路径默认对外隐藏无法选取，不同系统路径也会有差异，具体以`which pdftk`输出的结果为准）。
选择路径的技巧：`shift+command+G`: 输入：`/opt/pdflabs/pdftk/`，选择`bin`确认

> 官网：https://www.pdflabs.com/tools/pdftk-server/  
> <font color="red">After installation, open a Terminal, type pdftk and press Return. Pdftk will respond by displaying brief usage information(注意！安装后请试试这一步，出现使用说明说明安装成功)</font>. Access pdftk documenation by running man pdftk.

> This installer creates a directory on you Mac: /opt/pdflabs/pdftk/. This will contain a bin directory which holds the pdftk program and a docs directory which holds the complete PDFtk manual.

## 如何更新翻译器

Jasminum 插件中可以从[Translators_CN](https://github.com/l0o0/translators_CN)中下载最新的翻译器。可以参考[视频](https://www.bilibili.com/video/BV1F54y1k73n/)进行更新。这里注意下，可以跳过前面的下载步骤，参考浏览器更新的说明。

## 常见问题
1. CAJ/PDF 文件识别失败
一般按照默认设置是通过文件名来获取文献的标题与作者，在知网上按照标题与作者信息进行搜索。如果信息抓取失败，可以尝试将文件名的作者信息去掉，同时在设置中将文件名模板修改为`{%t}`，此时程序会将文件名识别为标题，并利用该标题在知网上进行模糊搜索，成功率比较高，不过可能会有多个结果

2. 非官方翻译器页面空白
刚点开该窗口时，页面信息为空白，需要手动点击下方的刷新按钮，拉取最新的翻译器信息

3. 插件冲突
根据之前反馈的信息，一些冲突的插件可能造成知网元数据拉取失败，书签添加不成功。可能冲突的插件有 [scite-zotero-plugin](https://github.com/scitedotai/scite-zotero-plugin)， [zotero-better-bibtex](https://github.com/retorquere/zotero-better-bibtex). 上述插件最新版本已经解决了冲突，请升级安装
