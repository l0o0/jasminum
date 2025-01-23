# Zotero Plugin Template

[![zotero target version](https://img.shields.io/badge/Zotero-7-green?style=flat-square&logo=zotero&logoColor=CC2936)](https://www.zotero.org)
[![Using Zotero Plugin Template](https://img.shields.io/badge/Using-Zotero%20Plugin%20Template-blue?style=flat-square&logo=github)](https://github.com/windingwind/zotero-plugin-template)

这是 [Zotero](https://www.zotero.org/) 的插件模板.

[English](../README.md) | [简体中文](./README-zhCN.md)

- 开发指南
  - [📖 插件开发文档](https://zotero-chinese.com/plugin-dev-guide/) (中文版，尚不完善)
  - [📖 Zotero 7 插件开发文档](https://www.zotero.org/support/dev/zotero_7_for_developers)
- 开发工具参考
  - [🛠️ Zotero 插件工具包](https://github.com/windingwind/zotero-plugin-toolkit) | [API 文档](https://github.com/windingwind/zotero-plugin-toolkit/blob/master/docs/zotero-plugin-toolkit.md)
  - [🛠️ Zotero 插件开发脚手架](https://github.com/northword/zotero-plugin-scaffold)
  - [📜 Zotero 源代码](https://github.com/zotero/zotero)
  - [ℹ️ Zotero 类型定义](https://github.com/windingwind/zotero-types)
  - [📌 Zotero 插件模板](https://github.com/windingwind/zotero-plugin-template) (即本仓库)

> [!tip]
> 👁 Watch 本仓库，以及时收到修复或更新的通知.

## 使用此模板构建的插件

[![GitHub Repo stars](https://img.shields.io/github/stars/windingwind/zotero-better-notes?label=zotero-better-notes&style=flat-square)](https://github.com/windingwind/zotero-better-notes)
[![GitHub Repo stars](https://img.shields.io/github/stars/windingwind/zotero-pdf-preview?label=zotero-pdf-preview&style=flat-square)](https://github.com/windingwind/zotero-pdf-preview)
[![GitHub Repo stars](https://img.shields.io/github/stars/windingwind/zotero-pdf-translate?label=zotero-pdf-translate&style=flat-square)](https://github.com/windingwind/zotero-pdf-translate)
[![GitHub Repo stars](https://img.shields.io/github/stars/windingwind/zotero-tag?label=zotero-tag&style=flat-square)](https://github.com/windingwind/zotero-tag)
[![GitHub Repo stars](https://img.shields.io/github/stars/iShareStuff/ZoteroTheme?label=zotero-theme&style=flat-square)](https://github.com/iShareStuff/ZoteroTheme)
[![GitHub Repo stars](https://img.shields.io/github/stars/MuiseDestiny/zotero-reference?label=zotero-reference&style=flat-square)](https://github.com/MuiseDestiny/zotero-reference)
[![GitHub Repo stars](https://img.shields.io/github/stars/MuiseDestiny/zotero-citation?label=zotero-citation&style=flat-square)](https://github.com/MuiseDestiny/zotero-citation)
[![GitHub Repo stars](https://img.shields.io/github/stars/MuiseDestiny/ZoteroStyle?label=zotero-style&style=flat-square)](https://github.com/MuiseDestiny/ZoteroStyle)
[![GitHub Repo stars](https://img.shields.io/github/stars/volatile-static/Chartero?label=Chartero&style=flat-square)](https://github.com/volatile-static/Chartero)
[![GitHub Repo stars](https://img.shields.io/github/stars/l0o0/tara?label=tara&style=flat-square)](https://github.com/l0o0/tara)
[![GitHub Repo stars](https://img.shields.io/github/stars/redleafnew/delitemwithatt?label=delitemwithatt&style=flat-square)](https://github.com/redleafnew/delitemwithatt)
[![GitHub Repo stars](https://img.shields.io/github/stars/redleafnew/zotero-updateifsE?label=zotero-updateifsE&style=flat-square)](https://github.com/redleafnew/zotero-updateifsE)
[![GitHub Repo stars](https://img.shields.io/github/stars/northword/zotero-format-metadata?label=zotero-format-metadata&style=flat-square)](https://github.com/northword/zotero-format-metadata)
[![GitHub Repo stars](https://img.shields.io/github/stars/inciteful-xyz/inciteful-zotero-plugin?label=inciteful-zotero-plugin&style=flat-square)](https://github.com/inciteful-xyz/inciteful-zotero-plugin)
[![GitHub Repo stars](https://img.shields.io/github/stars/MuiseDestiny/zotero-gpt?label=zotero-gpt&style=flat-square)](https://github.com/MuiseDestiny/zotero-gpt)
[![GitHub Repo stars](https://img.shields.io/github/stars/zoushucai/zotero-journalabbr?label=zotero-journalabbr&style=flat-square)](https://github.com/zoushucai/zotero-journalabbr)
[![GitHub Repo stars](https://img.shields.io/github/stars/MuiseDestiny/zotero-figure?label=zotero-figure&style=flat-square)](https://github.com/MuiseDestiny/zotero-figure)
[![GitHub Repo stars](https://img.shields.io/github/stars/l0o0/jasminum?label=jasminum&style=flat-square)](https://github.com/l0o0/jasminum)
[![GitHub Repo stars](https://img.shields.io/github/stars/lifan0127/ai-research-assistant?label=ai-research-assistant&style=flat-square)](https://github.com/lifan0127/ai-research-assistant)

[![GitHub Repo stars](https://img.shields.io/github/stars/daeh/zotero-markdb-connect?label=zotero-markdb-connect&style=flat-square)](https://github.com/daeh/zotero-markdb-connect)

如果你正在使用此库，我建议你将这个标志 ([![Using Zotero Plugin Template](https://img.shields.io/badge/Using-Zotero%20Plugin%20Template-blue?style=flat-square&logo=github)](https://github.com/windingwind/zotero-plugin-template)) 放在 README 文件中:

```md
[![Using Zotero Plugin Template](https://img.shields.io/badge/Using-Zotero%20Plugin%20Template-blue?style=flat-square&logo=github)](https://github.com/windingwind/zotero-plugin-template)
```

## Features 特性

- 事件驱动、函数式编程的可扩展框架；
- 简单易用，开箱即用；
- ⭐[新特性!]自动热重载！每当修改源码时，都会自动编译并重新加载插件；[详情请跳转→](#自动热重载)
- `src/modules/examples.ts` 中有丰富的示例，涵盖了插件中常用的大部分API (使用 [zotero-plugin-toolkit](https://github.com/windingwind/zotero-plugin-toolkit)；
- TypeScript 支持:
  - 为使用 JavaScript 编写的 Zotero 源码提供全面的类型定义支持 (使用 [zotero-types](https://github.com/windingwind/zotero-types))；
  - 全局变量和环境设置；
- 插件开发/构建/发布工作流:
  - 自动生成/更新插件版本、更新配置和设置环境变量 (`development`/`production`)；
  - 自动在 Zotero 中构建和重新加载代码；
  - 自动发布到 GitHub ;
- 集成 Prettier 和 ES Lint;

## Examples 示例

此库提供了 [zotero-plugin-toolkit](https://github.com/windingwind/zotero-plugin-toolkit) 中API的示例.

在 `src/examples.ts` 中搜索`@example` 查看示例. 这些示例在 `src/hooks.ts` 中调用演示.

### 基本示例(Basic Examples)

- registerNotifier
- registerPrefs, unregisterPrefs

### 快捷键示例(Shortcut Keys Examples)

- registerShortcuts
- exampleShortcutLargerCallback
- exampleShortcutSmallerCallback
- exampleShortcutConflictionCallback

### UI示例(UI Examples)

![image](https://user-images.githubusercontent.com/33902321/211739774-cc5c2df8-5fd9-42f0-9cdf-0f2e5946d427.png)

- registerStyleSheet(the official make-it-red example)
- registerRightClickMenuItem
- registerRightClickMenuPopup
- registerWindowMenuWithSeprator
- registerExtraColumn
- registerExtraColumnWithCustomCell
- registerCustomItemBoxRow
- registerLibraryTabPanel
- registerReaderTabPanel

### 首选项面板示例(Preference Pane Examples)

![image](https://user-images.githubusercontent.com/33902321/211737987-cd7c5c87-9177-4159-b975-dc67690d0490.png)

- Preferences bindings
- UI Events
- Table
- Locale

详情参见 [`src/modules/preferenceScript.ts`](./src/modules/preferenceScript.ts)

### 帮助示例(HelperExamples)

![image](https://user-images.githubusercontent.com/33902321/215119473-e7d0d0ef-6d96-437e-b989-4805ffcde6cf.png)

- dialogExample
- clipboardExample
- filePickerExample
- progressWindowExample
- vtableExample(See Preference Pane Examples)

### 指令行示例(PromptExamples)

Obsidian风格的指令输入模块，它通过接受文本来运行插件，并在弹出窗口中显示可选项.

使用 `Shift+P` 激活.

![image](https://user-images.githubusercontent.com/33902321/215120009-e7c7ed27-33a0-44fe-b021-06c272481a92.png)

- registerAlertPromptExample

## 快速上手

### 0 环境要求

1. 安装 [beta 版 Zotero](https://www.zotero.org/support/beta_builds)
2. 安装 [Node.js](https://nodejs.org/en/) 和 [Git](https://git-scm.com/)

> [!note]
> 本指南假定你已经对 Zotero 插件的基本结构和工作原理有初步的了解. 如果你还不了解，请先参考[官方文档](https://www.zotero.org/support/dev/zotero_7_for_developers) 和[官方插件样例 Make It Red](https://github.com/zotero/make-it-red)。

### 1 创建你的仓库(Create Your Repo)

1. 点击 `Use this template`；
2. 使用 `git clone` 克隆上一步生成的仓库；
   <details >
   <summary>💡 从 GitHub Codespace 开始</summary>

   _GitHub CodeSpace_ 使你可以直接开始开发而无需在本地下载代码/IDE/依赖.

   重复下列步骤，仅需三十秒即可开始构建你的第一个插件！

   - 点击首页 `Use this template` 按钮，随后点击 `Open in codespace`， 你需要登录你的 GitHub 账号.
   - 等待 codespace 加载.

   </details>

3. 进入项目文件夹；

### 2 配置模板和开发环境(Config Template Settings and Enviroment)

1. 修改 `./package.json` 中的设置，包括：

   ```json5
   {
     version: "", // 修改为 0.0.0
     author: "",
     description: "",
     homepage: "",
     config: {
       addonName: "", // 插件名称
       addonID: "", // 插件 ID 【重要：防止冲突】
       addonRef: "", // 插件命名空间：元素前缀等
       addonInstance: "", // 注册在 Zotero 根下的实例名
       prefsPrefix: "extensions.zotero.${addonRef}", // 首选项的前缀
     },
   }
   ```

   > [!warning]
   > 注意设置 addonID 和 addonRef 以避免冲突.

   如果你需要在 GitHub 以外的地方托管你的 XPI 包，请修改 `zotero-plugin.config.ts` 中的 `updateURL` 和 `xpiDownloadLink`。

2. 复制 Zotero 启动配置，填入 Zotero 可执行文件路径和 profile 路径.

   > (可选项) 创建开发用 profile 目录：
   >
   > 此操作仅需执行一次: 使用 `/path/to/zotero -p` 启动 Zotero，创建一个新的配置文件并用作开发配置文件。

   ```sh
   cp .env.example .env
   vim .env
   ```

   如果你维护了多个插件，可以将这些内容存入系统环境变量，以避免在每个插件中都需要重复设置。

3. 运行 `npm install` 以安装相关依赖

   > 如果你使用 `pnpm` 作为包管理器，你需要添加 `public-hoist-pattern[]=*@types/bluebird*` 到`.npmrc`, 详情请查看 [zotero-types](https://github.com/windingwind/zotero-types?tab=readme-ov-file#usage) 的文档.

   如果你使用 `npm install` 的过程中遇到了 `npm ERR! ERESOLVE unable to resolve dependency tree` ，这是由于上游依赖 typescript-eslint 导致的错误，请使用 `npm i -f` 命令进行安装。

### 3 开发插件

使用 `npm start` 启动开发服务器，它将：

- 在开发模式下预构建插件
- 启动 Zotero ，并让其从 `build/` 中加载插件
- 打开开发者工具（devtool）
- 监听 `src/**` 和 `addon/**`.
  - 如果 `src/**` 修改了，运行 esbuild 并且重新加载
  - 如果 `addon/**` 修改了，(在开发模式下)重新构建插件并且重新加载

#### 自动热重载

厌倦了无休止的重启吗？忘掉它，拥抱热加载！

1. 运行 `npm start`.
2. 编码. (是的，就这么简单)

当检测到 `src` 或 `addon` 中的文件修改时，插件将自动编译并重新加载.

<details style="text-indent: 2em">
<summary>💡 将此功能添加到现有插件的步骤</summary>

请参阅：[zotero-plugin-scaffold](https://github.com/northword/zotero-plugin-scaffold)。

</details>

#### 调试代码

你还可以:

- 在 Tools->Developer->Run Javascript 中测试代码片段;

- 使用 `Zotero.debug()` 调试输出. 在 Help->Debug Output Logging->View Output 查看输出;

- 调试 UI. Zotero 建立在 Firefox XUL 框架之上. 使用 [XUL Explorer](https://udn.realityripple.com/docs/Archive/Mozilla/XUL_Explorer) 等软件调试 XUL UI.

  > XUL 文档: <http://www.devdoc.net/web/developer.mozilla.org/en-US/docs/XUL.html>

### 4 构建插件

运行 `npm run build` 在生产模式下构建插件，构建的结果位于 `build/` 目录中.

构建步骤:

- 创建/清空 `build/`
- 复制 `addon/**` 到 `build/addon/**`
- 替换占位符：使用 `replace-in-file` 去替换在 `package.json` 中定义的关键字和配置 (`xhtml`、`.flt` 等)
- 准备本地化文件以避免冲突，查看官方文档了解更多（<https://www.zotero.org/support/dev/zotero_7_for_developers#avoiding_localization_conflicts）>
  - 重命名`**/*.flt` 为 `**/${addonRef}-*.flt`
  - 在每个消息前加上 `addonRef-`
- 使用 Esbuild 来将 `.ts` 源码构建为 `.js`，从 `src/index.ts` 构建到`./build/addon/chrome/content/scripts`
- (仅在生产模式下工作) 压缩 `./build/addon` 目录为 `./build/*.xpi`
- (仅在生产模式下工作) 准备 `update.json` 或 `update-beta.json`

> [!note]
>
> **Dev & prod 两者有什么区别?**
>
> - 此环境变量存储在 `Zotero.${addonInstance}.data.env` 中，控制台输出在生产模式下被禁用.
> - 你可以根据此变量决定用户无法查看/使用的内容.
> - 在生产模式下，构建脚本将自动打包插件并更新 `update.json`.

### 5 发布

如果要构建和发布插件，运行如下指令：

```shell
# version increase, git add, commit and push
# then on ci, npm run build, and release to GitHub
npm run release
```

> [!note]
> 在此模板中，release-it 被配置为在本地更新版本号、提交并推送标签，随后 GitHub Action 将重新构建插件并将 XPI 发布到 GitHub Release.

#### 关于预发布

该模板将 `prerelease` 定义为插件的测试版，当你在 release-it 中选择 `prerelease` 版本 (版本号中带有 `-` )，构建脚本将创建一个 `update-beta.json` 给预发布版本使用，这将确保常规版本的用户不会自动更新到测试版，只有手动下载并安装了测试版的用户才能自动更新到下一个测试版. 当下一个正式版本更新时，脚本将同步更新 `update.json` 和 `update-beta.json`，这将使正式版和测试版用户都可以更新到最新的正式版.

> [!warning]
> 严格来说，区分 Zotero 6 和 Zotero 7 兼容的插件版本应该通过 `update.json` 的 `addons.__addonID__.updates[]` 中分别配置 `applications.zotero.strict_min_version`，这样 Zotero 才能正确识别，详情在 Zotero 7 开发文档（<https://www.zotero.org/support/dev/zotero_7_for_developers#updaterdf_updatesjson）获取>.

## Details 更多细节

### 关于Hooks(About Hooks)

> 可以在 [`src/hooks.ts`](https://github.com/windingwind/zotero-plugin-template/blob/main/src/hooks.ts) 中查看更多

1. 当在 Zotero 中触发安装/启用/启动时，`bootstrap.js` > `startup` 被调用
   - 等待 Zotero 就绪
   - 加载 `index.js` (插件代码的主入口，从 `index.ts` 中构建)
   - 如果是 Zotero 7 以上的版本则注册资源
2. 主入口 `index.js` 中，插件对象被注入到 `Zotero` ，并且 `hooks.ts` > `onStartup` 被调用.
   - 初始化插件需要的资源，包括通知监听器、首选项面板和UI元素.
3. 当在 Zotero 中触发卸载/禁用时，`bootstrap.js` > `shutdown` 被调用.
   - `events.ts` > `onShutdown` 被调用. 移除 UI 元素、首选项面板或插件创建的任何内容.
   - 移除脚本并释放资源.

### 关于全局变量(About Global Variables)

> 可以在 [`src/index.ts`](https://github.com/windingwind/zotero-plugin-template/blob/main/src/index.ts)中查看更多

bootstrap插件在沙盒中运行，但沙盒中没有默认的全局变量，例如 `Zotero` 或 `window` 等我们曾在overlay插件环境中使用的变量.

此模板将以下变量注册到全局范围:

```ts
Zotero, ZoteroPane, Zotero_Tabs, window, document, rootURI, ztoolkit, addon;
```

### 创建元素 API(Create Elements API)

插件模板为 bootstrap 插件提供了一些新的API. 我们有两个原因使用这些 API，而不是使用 `createElement/createElementNS`：

- 在 bootstrap 模式下，插件必须在推出（禁用或卸载）时清理所有 UI 元素，这非常麻烦. 使用 `createElement`，插件模板将维护这些元素. 仅仅在退出时 `unregisterAll` .
- Zotero 7 需要 createElement()/createElementNS() → createXULElement() 来表示其他的 XUL 元素，而 Zotero 6 并不支持 `createXULElement`. 类似于 React.createElement 的API `createElement` 检测 namespace(xul/html/svg) 并且自动创建元素，返回元素为对应的 TypeScript 元素类型.

```ts
createElement(document, "div"); // returns HTMLDivElement
createElement(document, "hbox"); // returns XUL.Box
createElement(document, "button", { namespace: "xul" }); // manually set namespace. returns XUL.Button
```

### 关于 Zotero API(About Zotero API)

Zotero 文档已过时且不完整，克隆 <https://github.com/zotero/zotero> 并全局搜索关键字.

> ⭐[zotero-types](https://github.com/windingwind/zotero-types) 提供了最常用的 Zotero API，在默认情况下它被包含在此模板中. 你的 IDE 将为大多数的 API 提供提醒.

猜你需要：查找所需 API的技巧

在 `.xhtml`/`.flt` 文件中搜索 UI 标签，然后在 locale 文件中找到对应的键. ，然后在 `.js`/`.jsx` 文件中搜索此键.

### 目录结构(Directory Structure)

本部分展示了模板的目录结构.

- 所有的 `.js/.ts` 代码都在 `./src`;
- 插件配置文件：`./addon/manifest.json`;
- UI 文件: `./addon/chrome/content/*.xhtml`.
- 区域设置文件: `./addon/locale/**/*.flt`;
- 首选项文件: `./addon/prefs.js`;
  > 不要在 `prefs.js` 中换行

```shell
.
|-- .eslintrc.json            # eslint conf
|-- .gitattributes            # git conf
|-- .github/                  # github conf
|-- .gitignore                # git conf
|-- .prettierrc               # prettier conf
|-- .release-it.json          # release-it conf
|-- .vscode                   # vs code conf
|   |-- extensions.json
|   |-- launch.json
|   |-- setting.json
|   `-- toolkit.code-snippets
|-- package-lock.json         # npm conf
|-- package.json              # npm conf
|-- LICENSE
|-- README.md
|-- addon
|   |-- bootstrap.js               # addon load/unload script, like a main.c
|   |-- chrome
|   |   `-- content
|   |       |-- icons/
|   |       |-- preferences.xhtml  # preference panel
|   |       `-- zoteroPane.css
|   |-- locale                     # locale
|   |   |-- en-US
|   |   |   |-- addon.ftl
|   |   |   `-- preferences.ftl
|   |   `-- zh-CN
|   |       |-- addon.ftl
|   |       `-- preferences.ftl
|   |-- manifest.json              # addon config
|   `-- prefs.js
|-- build/                         # build dir
|-- scripts                        # scripts for dev
|   |-- build.mjs                      # script to build plugin
|   |-- scripts.mjs                    # scripts send to Zotero, such as reload, openDevTool, etc
|   |-- server.mjs                     # script to start a development server
|   |-- start.mjs                      # script to start Zotero process
|   |-- stop.mjs                       # script to kill Zotero process
|   |-- utils.mjs                      # utils functions for dev scripts
|   |-- update-template.json      # template of `update.json`
|   `-- zotero-cmd-template.json  # template of local env
|-- src                           # source code
|   |-- addon.ts                  # base class
|   |-- hooks.ts                  # lifecycle hooks
|   |-- index.ts                  # main entry
|   |-- modules                   # sub modules
|   |   |-- examples.ts
|   |   `-- preferenceScript.ts
|   `-- utils                     # utilities
|       |-- locale.ts
|       |-- prefs.ts
|       |-- wait.ts
|       `-- window.ts
|-- tsconfig.json                 # https://code.visualstudio.com/docs/languages/jsconfig
|-- typings                       # ts typings
|   `-- global.d.ts
`-- update.json
```

## Disclaimer 免责声明

在 AGPL 下使用此代码. 不提供任何保证. 遵守你所在地区的法律！

如果你想更改许可，请通过 <wyzlshx@foxmail.com> 与我联系.
