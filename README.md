<div align="center">

![Jasminum](./addon/chrome/content/icons/icon.png)

# 茉莉花 Jasminum

[![Release](https://img.shields.io/github/release/l0o0/jasminum?style=flat-square)](https://github.com/l0o0/jasminum/releases/latest)
[![Using Zotero Plugin Template](https://img.shields.io/badge/Using-Zotero%20Plugin%20Template-blue?style=flat-square&logo=github)](https://github.com/windingwind/zotero-plugin-template)

简体中文 | [English](doc/README-en.md)

</div>

茉莉花是面向中文文献管理的 Zotero 插件，提供元数据抓取、本地附件匹配、中文转换器与引用格式下载，以及 PDF 书签和大纲管理。

## 安装与兼容性

以下说明对应已发布的 **v1.1.43**。

- 插件最低要求 **Zotero 9.0.3**。旧版 Zotero 用户请查阅历史版本的发布说明。
- **AI 元数据识别和 AI 大纲识别需要 Zotero 10 或更高版本**，以及支持图片输入和 JSON Object 输出的模型接口。

1. 从 [Releases](https://github.com/l0o0/jasminum/releases/latest) 下载 `.xpi` 安装包，不要下载 Source code 压缩包。
2. 在 Zotero 中打开“工具 → 插件”，点击齿轮菜单，选择“从文件安装插件”，选中下载的 `.xpi` 文件。菜单名称可能因 Zotero 版本和语言略有不同。
3. 安装后，在 Zotero 设置中找到茉莉花页面。

## 元数据抓取

将中文 PDF 添加到 Zotero 后，右键尚未归属文献条目的附件，打开茉莉花元数据菜单，选择抓取元数据。任务窗口会显示处理结果；存在多个候选结果时，请选择匹配的文献并确认。

在茉莉花设置的“数据来源”中，可以启用、移除和调整来源顺序。目前提供 PubScholar、国家哲学社会科学文献中心（NCPSSD）、中国知网（CNKI）、中华医学期刊全文数据库（Yiigle）和 AI 识别。

来源按设置顺序运行。AI 仅在前面的来源没有可靠结果时执行；希望优先使用 AI 时，可以将其移到前面。传统来源的检索会使用附件文件名，请尽量保留准确的文献标题，并按需要调整文件名解析设置。

## AI 接口配置

1. 打开茉莉花设置中的“AI 识别”接口配置。
2. 选择预设平台或自定义 OpenAI 兼容接口，填写 Base URL、API Key 和模型 ID。Base URL 应为 API 根地址，而非完整的 `/chat/completions` 地址。
3. 点击“测试连接”。插件会发送内置的茉莉花测试图片，并检查模型对图片文字、花瓣颜色和 JSON 输出的识别结果。测试超时为两分钟。
4. 若用于元数据抓取，还需在数据来源中启用 AI。

预设包含 MagicZotero、硅基流动和 DeepSeek。**预设不代表所选模型一定支持图片**，请以模型能力和连接测试结果为准。

使用 MagicZotero 时，可安装 Garden 插件并注册账号，通过接口配置中的“打开模型商店”链接进入商店，在所选模型的“查看详情 → 显示配置”中复制 API Key。

**数据发送范围：**连接测试发送内置测试图片；元数据识别发送 PDF 前几页的图片；全文大纲识别会逐批发送 PDF 页面图片。图片发送至你配置的服务商，并可能产生该服务商的调用费用。请勿在问题反馈中公开 API Key，AI 识别结果也应人工核对。

## 本地附件匹配

浏览器已抓取文献条目、但未能自动下载附件时，可以手动下载 PDF 或 CAJ，然后右键文献条目，在“小工具”中选择“在下载文件夹中查找附件”。插件根据文献标题和文件名的匹配度寻找附件。

下载目录默认为系统下载文件夹，可以在茉莉花设置中修改。匹配成功后，原下载文件默认移动到下载目录下的 `jasminum-backup`；也可在设置中选择删除原文件或保持不变。导入 Zotero 的附件副本不受原下载文件处理方式影响。

## PDF 书签与大纲

打开 PDF 阅读器的左侧栏，可以使用茉莉花的书签和大纲面板：

- **书签**：记录阅读位置，支持添加、删除和拖动排序。
- **大纲**：组织带层级的章节标题，支持添加、编辑、删除、调整层级及拖动排序。

选中文字后，可通过划词弹窗或右键菜单分别选择“添加书签”和“添加大纲”。不需要划词弹窗按钮时，可以在茉莉花设置中关闭；右键菜单入口仍保留。

手动编辑的大纲默认保存在插件的本地数据中。需要写入 PDF 时，在大纲工具栏右侧的“更多”（⋮）菜单中选择“保存大纲到 PDF”。

### 大纲侧栏快捷键

先选中一个大纲节点：

| 按键 | 操作 |
| --- | --- |
| ↑ / ↓ | 选择上一个／下一个可见节点 |
| ← / → | 展开或折叠节点 |
| 空格 | 编辑标题 |
| `[` / `]` | 提升／降低层级 |
| `\` | 创建子节点 |
| Delete / Backspace | 删除节点 |

### AI 大纲识别

从附件右键菜单的“小工具”，或大纲侧栏的“更多”（⋮）菜单启动 AI 全文大纲识别。

1. 在茉莉花任务窗口查看进度；需要时可停止，再继续识别。
2. 打开独立的大纲核对窗口，检查标题、层级和 PDF 页码。
3. 使用 ↑ / ↓ 切换标题、拖动排序、Delete / Backspace 删除、← / → 调整层级。页码可直接编辑，右侧跳转按钮用于查看 PDF 对应位置。
4. 原文匹配和估计位置通过图标及悬停提示区分。核对后点击“保存”，写入茉莉花大纲和 PDF；保存成功后核对窗口关闭。

关闭任务窗口会清空任务列表，并停止大纲识别。需要核对结果时，请先完成核对和保存。

## 中文转换器、引用格式与小工具

- 在茉莉花设置中下载或更新[中文转换器](https://github.com/l0o0/translators_CN)，用于网页文献抓取。
- 下载社区维护的[中文引用格式](https://github.com/zotero-chinese/styles)。
- 使用语言设置、中文姓名拆分与合并等小工具。

## 常见问题与反馈

- **插件无法安装：**检查 Zotero 与插件版本是否兼容，确认下载的是 `.xpi` 文件。
- **没有找到元数据：**检查附件标题、文件名解析规则及数据来源设置；网站访问限制也可能影响抓取。
- **AI 测试或识别失败：**检查接口地址、密钥、模型图片输入及 JSON Object 支持；AI PDF 功能还需 Zotero 10 或更高版本。
- **大纲无法写入 PDF：**检查文件是否可写，是否被其他应用占用。

请通过 [GitHub Issues](https://github.com/l0o0/jasminum/issues) 反馈问题，附上 Zotero 版本、插件版本、操作系统、复现步骤及相关错误信息；删除密钥等敏感信息。

## 致谢

特别感谢 [jiaojiaodubai](https://github.com/jiaojiaodubai) 长期以来对 [translators_CN](https://github.com/l0o0/translators_CN) 和本项目的贡献。

本项目基于 [Zotero Plugin Template](https://github.com/windingwind/zotero-plugin-template)，使用 [AGPL-3.0-or-later](LICENSE) 许可证。
