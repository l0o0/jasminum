<div align="center">

![Jasminum](../addon/chrome/content/icons/icon.png)

# Jasminum (茉莉花)

[![Release](https://img.shields.io/github/release/l0o0/jasminum?style=flat-square)](https://github.com/l0o0/jasminum/releases/latest)
[![Using Zotero Plugin Template](https://img.shields.io/badge/Using-Zotero%20Plugin%20Template-blue?style=flat-square&logo=github)](https://github.com/windingwind/zotero-plugin-template)

[简体中文](../README.md) | English

</div>

Jasminum is a Zotero plugin focused on managing Chinese-language literature. It provides metadata retrieval, local attachment matching, Chinese translators and citation styles, and PDF bookmark and outline management.

## Installation and compatibility

This guide covers the released **v1.1.43**.

- The plugin requires **Zotero 9.0.3 or later**. If you use an older Zotero version, check the release notes for older plugin versions.
- **AI metadata recognition and AI outline recognition require Zotero 10 or later**, plus a model API that supports image input and JSON Object output.

1. Download the `.xpi` package from [Releases](https://github.com/l0o0/jasminum/releases/latest), not a Source code archive.
2. In Zotero, open **Tools → Plugins**, click the gear menu, choose **Install Plugin From File**, and select the downloaded `.xpi`. Menu wording may vary by Zotero version and language.
3. Open Zotero Settings and locate the Jasminum settings page.

## Metadata retrieval

Add a Chinese-language PDF to Zotero. Right-click the standalone attachment, open **Metadata(CN)**, and choose **Find article metadata**. The task window shows the results. If several candidates are found, select the matching publication and confirm.

In Jasminum settings, open **Data sources** to enable, remove, or reorder sources. Available sources include PubScholar, the National Center for Philosophy and Social Sciences Documentation (NCPSSD), China National Knowledge Infrastructure (CNKI), Yiigle, and AI recognition.

Sources run in the configured order. AI runs only when earlier sources have no reliable results; move it earlier to give it priority. Traditional sources use the attachment filename to form search queries, so keep the publication title accurate and adjust filename parsing settings when needed.

## AI configuration

1. Open the API configuration under **AI recognition** in Jasminum settings.
2. Choose a preset provider or a custom OpenAI-compatible API, then enter the Base URL, API key, and model ID. Use the API root as the Base URL, not the complete `/chat/completions` endpoint.
3. Click **Test connection**. Jasminum sends a bundled jasmine image and checks the model's answers about its text and petal color, along with JSON output. The test timeout is two minutes.
4. To use AI for metadata retrieval, also enable it in **Data sources**.

Presets include MagicZotero, SiliconFlow, and DeepSeek. **A provider preset does not guarantee that the selected model supports images.** Check the model's capabilities and the connection test result.

For MagicZotero, install the Garden plugin and register an account. Use **Open the model store** in the configuration dialog, select a model, and copy its API key from **查看详情 (View details) → 显示配置 (Show configuration)**.

**What is sent:** the connection test sends a bundled image; metadata recognition sends images of the first few PDF pages; full-document outline recognition sends PDF page images in batches. Images go to your configured provider, which may charge for API usage. Never include your API key in an issue report, and review AI-generated results before relying on them.

## Matching local attachments

If Zotero Connector captured a publication but could not download its attachment, download the PDF or CAJ manually. Right-click the publication item and choose **Tools → Find attachment in Folder**. Jasminum matches the publication title against filenames.

The default folder is your system Downloads folder; you can change it in Jasminum settings. After a successful match, the original downloaded file is moved to `jasminum-backup` inside that folder by default. Settings also let you delete the original or leave it unchanged. These choices do not remove the attachment copy imported into Zotero.

## PDF bookmarks and outlines

Open the PDF reader's left sidebar to access Jasminum's bookmark and outline panels:

- **Bookmarks** record reading positions. You can add, delete, and reorder them by dragging.
- **Outlines** organize chapter and section headings into a hierarchy. You can add, edit, delete, reorder, and change the level of entries.

After selecting text, use the selection popup or context menu to add it as a bookmark or outline entry. To hide the selection popup buttons, disable **Show bookmark and outline buttons in the text selection popup** in Jasminum settings. The context menu actions remain available.

Manual outline edits are saved in the plugin's local data by default. To write them into the PDF, open the **More (⋮)** menu on the right of the outline toolbar and choose **Save outline to PDF**.

### Outline sidebar shortcuts

Select an outline entry first:

| Key | Action |
| --- | --- |
| ↑ / ↓ | Select the previous / next visible entry |
| ← / → | Expand or collapse an entry |
| Space | Edit the title |
| `[` / `]` | Promote / demote the entry |
| `\` | Create a child entry |
| Delete / Backspace | Delete the entry |

### AI outline recognition

Start full-document AI outline recognition from the attachment context menu under **Tools**, or from **More (⋮)** in the outline sidebar.

1. Follow progress in the Jasminum task window. You can stop recognition and resume it later while the task remains in the list.
2. Open the separate outline review window to check titles, levels, and PDF page numbers.
3. Use ↑ / ↓ to select entries, drag to reorder, Delete / Backspace to delete, and ← / → to change levels. Page numbers are editable. Use the jump button on the right to inspect the corresponding PDF location.
4. Icons and tooltips distinguish text-matched locations from estimated ones. Click **Save** after reviewing: this writes the outline to Jasminum's data and the PDF, then closes the review window on success.

Closing the task window clears its task list and stops outline recognition. Review and save any results you want to keep before closing it.

## Chinese translators, citation styles, and utilities

- Download or update [Chinese translators](https://github.com/l0o0/translators_CN) from Jasminum settings to support capturing publications from websites.
- Download community-maintained [Chinese citation styles](https://github.com/zotero-chinese/styles).
- Use utilities for setting language and splitting or merging Chinese names.

## Troubleshooting and feedback

- **Cannot install:** check Zotero/plugin version compatibility and make sure you downloaded an `.xpi` file.
- **No metadata found:** check the attachment title, filename parsing rules, and data source settings. Website access restrictions can also affect retrieval.
- **AI test or recognition fails:** check the API address, key, image-input support, and JSON Object support. AI PDF features also require Zotero 10 or later.
- **Cannot write an outline to the PDF:** check that the file is writable and is not locked by another application.

Report problems through [GitHub Issues](https://github.com/l0o0/jasminum/issues). Include your Zotero version, plugin version, operating system, reproduction steps, and relevant error messages. Remove API keys and other sensitive information.

## Acknowledgments

Special thanks to [jiaojiaodubai](https://github.com/jiaojiaodubai) for long-standing contributions to [translators_CN](https://github.com/l0o0/translators_CN) and this project.

Jasminum is based on [Zotero Plugin Template](https://github.com/windingwind/zotero-plugin-template) and is licensed under [AGPL-3.0-or-later](../LICENSE).
