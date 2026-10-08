# Metadata Settings
pref-group-metadata = Chinese Metadata Retrieval Settings
label-isMainlandChina = 
  .label = Currently located in Chinese Mainland (excluding Hong Kong, Macao and Taiwan), uncheck for overseas users
label-autoupdate-metadata =
  .label = Automatically retrieve metadata from CNKI when adding Chinese PDF/CAJ files
label-rename =
  .label = Rename attachments based on metadata (requires Attanger or zotmoov plugin)
label-filename-pattern = Filename Parsing Template
label-namepattern = Filename Parsing Template
label-namepattern-auto =
  .label = Smart Recognition
  .tooltiptext = Use Jasmine's built-in algorithm to intelligently identify authors or titles from filenames
label-namepattern-tg =
  .label = Title_Author (Default)
  .tooltiptext = Rename files in the format "Title_FirstAuthor," e.g., "Design and Application of Redundant Avionics Systems for Drones_Yang Lu.caj"
label-namepattern-t =
  .label = Title
  .tooltiptext = Rename files using the "Title" format, e.g., "Design and Application of Redundant Avionics Systems for Drones.caj"
label-namepattern-info = Filename recognition template. Select a format from the dropdown or enter directly
label-namepattern-custom =
  .label = Custom
  .tooltiptext = Set custom rules to extract title and author information from filenames for metadata retrieval
label-choose-namepattern =
  .label = Select Template

label-metadata-source = Metadata Retrieval Source
label-choose-source =
  .label = Select Data Source
label-metadata-source-pubscholar =
  .label = PubScholar
label-metadata-source-ncpssd =
  .label = NCPSSD (National Center for Philosophy and Social Sciences Documentation)
label-metadata-source-cnki =
  .label = CNKI (China National Knowledge Infrastructure)
label-metadata-source-wanfangdata =
  .label = Wanfang Data
label-metadata-source-yiigle =
  .label = Yiigle (Chinese Medical Journals)
label-metadata-source-chinadoi =
  .label = ChinaDOI
metadata-source-desc =
  .tooltiptext = Select the source for metadata retrieval. Generally, there is no need to switch. If you find some data sources unnecessary, you can uncheck them.
info-metadata-source-required = At least one metadata retrieval source must be selected.

label-pdf-match-folder = Attachment Matching Folder
label-choose-folder =
  .label = Select Folder
namepattern-desc =
  .tooltiptext = Retrieve CNKI metadata based on filenames. Filename format settings: {"{"}%t{"}"}=Title, {"{"}%g{"}"}=Author, {"{"}%y{"}"}=Year, {"{"}%j{"}"}=Other (e.g., source information); specify separators as needed; multiple separators can be used consecutively; file extensions are ignored. Default uses {"{"}%t{"}"}_{"{"}%g{"}"}, which recognizes most CNKI filename formats, including filenames with only titles and no separators.

# Transator Settings
pref-group-translators = Chinese Translator Settings
label-translator-source = Translator Download Source
label-best-speed = Choose Fastest Source
translatorSource-desc =
  .tooltiptext = Select the translator download source. Generally, there is no need to switch. If you cannot download the Chinese translator, you can try other sources or click the "Choose Fastest Source" button.
label-auto-update-translators =
  .label = Automatically Update Translators
label-translators-force-update =
  .label = Update Immediately
label-translators-detail = Translator Details
label-translators-detail-click = Click to View

# Attachment Settings
pref-group-attachment = Local Attachment Search Settings
attachment-folder-desc = 
  .tooltiptext = Search for attachments in the download directory and match them to entries that are missing attachments.
  Set this to your browser's download directory, and the plugin can batch import and search for attachments from the download directory.
label-pdf-match-folder = Attachment Download Folder
action-after-import = After matching attachments to entries, what to do with the original downloaded files:
label-choose-folder =
  .label = Choose Folder
nothing-label =
  .label = Do Nothing
backup-label =
  .label = Backup Attachment
delete-label =
  .label = Delete Attachment
action-after-import-desc =
  .tooltiptext = After successfully matching attachments to entries, you can choose one of the following actions: 
  1. Do Nothing: No action is taken, and the downloaded files remain in the download directory. 
  2. Backup Attachment: Back up the original downloaded files to a specified directory. 
  3. Delete Attachment: Delete the original downloaded files (the attachments are already matched and saved in Zotero).

# Outline Bookmark Settings
pref-group-bookmark = Outline Bookmark Settings
label-disableZoteroOutline = 
  .label = Disable Zotero's Built-in Outline
label-enableBookmark = 
  .label = Enable Outline Bookmark
outline-desc = 
  .tooltiptext = Please note that when you modify the outline or bookmarks, you need to click the 'Save' button to save them to the PDF file. By default, bookmark and outline information is saved separately from the PDF file.

# Tool Settings
pref-group-tools = Tool Settings
label-auto-split-name =
  .label = Automatically split first name and last name when adding new items
label-split-en-name = 
  .label = Include English names when splitting/merging names
label-language = Manually Set Language
label-tools-info-1 = 💡 The 
label-tools-info-2 = provides richer metadata inspection functionality
label-tools-linter = Linter Plugin

# WPS Plugin Installation
pref-group-wps = WPS Zotero Plugin
label-wps = Install Zotero Add-on for WPS
label-wps-help = Usage Help
label-install-wps-plugin-click =
  .label = Click to Install

# About
pref-group-about = About
pref-help = Version { $version } Build { $time } ❤️
label-zotero-chinese = Zotero Chinese Community
label-remote-help = 🌸 If you encounter issues with Jasmine or CNKI, feel free to ask for help 🎁
label-show-remote-help-qr =
  .label = Show QR Code
title-remote-help-qr = Taobao WangWang QR Code
pref-group-ai = AI recognition · OpenAI-compatible API
llm-config-title = AI recognition
llm-config-description = Configure an OpenAI-compatible API for document recognition.
pref-popup-autosave = Changes are saved automatically
ai-recognition-description =
    .tooltiptext = Configure Base URL (usually ending in /v1), API Key, and a model supporting images and JSON Object output, then enable AI recognition under Configure sources. Sources run in list order. AI sends the first three PDF pages to this API if earlier sources have no reliable results. Requires Zotero 10.
label-configure-llm =
    .label = Configure API
label-llm-provider = API provider
llm-provider-custom = Custom (OpenAI-compatible)
llm-provider-magiczotero = MagicZotero
llm-provider-siliconflow = SiliconFlow
llm-provider-deepseek = DeepSeek
llm-magiczotero-guide-title = Get a MagicZotero API key
llm-magiczotero-guide-install = Install the Garden plugin from the plugin store and create an account.
llm-magiczotero-guide-copy = <a data-l10n-name="model-store">Open the model store</a> and select deepseek-v4-1-flash. In the lower-right corner, choose “查看详情” (View details), then “显示配置” (Show configuration), and copy the API key.
llm-magiczotero-guide-paste = Paste the API key below, then click “Test connection”.
llm-magiczotero-store-unavailable = Install or update the Garden plugin, enable it, and try again.
llm-magiczotero-store-failed = The model store could not be opened. Try again from the Garden plugin.
label-llm-model = Model ID
llm-model-placeholder =
    .placeholder = Enter this provider’s model ID
label-metadata-source-ai =
    .label = AI recognition (requires LLM configuration)
metadata-source-up = Move up
metadata-source-down = Move down
metadata-source-remove = Remove
metadata-source-add = Add source
metadata-source-select =
    .aria-label = Select a source to add
metadata-source-ai-name = AI recognition
metadata-source-unavailable = Unavailable
metadata-source-order-description =
    .tooltiptext = Sources run from top to bottom; changes are saved automatically. An exact match stops the search. AI runs only if earlier sources have no reliable results and stops on success. Keep at least one source.
metadata-source-configure =
    .label = Configure sources
metadata-source-title = Data sources
metadata-source-description = Sources are searched in order until an exact match is found. Use the arrows to adjust priority.
metadata-source-summary =
    .label = Configure sources · { $count } enabled
    .tooltiptext = { $sources }
metadata-source-enabled = Enabled
metadata-source-other = Other sources
metadata-source-pubscholar-description = Public academic platform · Multidisciplinary
    .title = { metadata-source-pubscholar-description }
metadata-source-ncpssd-description = National Center for Philosophy and Social Sciences Documentation
    .title = { metadata-source-ncpssd-description }
metadata-source-cnki-description = China National Knowledge Infrastructure · Chinese academic literature
    .title = { metadata-source-cnki-description }
metadata-source-yiigle-description = Chinese medical journals · Medical literature
    .title = { metadata-source-yiigle-description }
metadata-source-ai-description = Recognizes the first three PDF pages · Requires API configuration
    .title = { metadata-source-ai-description }
metadata-source-unknown-description = This source is unavailable and will be skipped during retrieval
    .title = { metadata-source-unknown-description }
metadata-source-move-up =
    .aria-label = Move { $source } up
    .title = Move { $source } up
metadata-source-move-down =
    .aria-label = Move { $source } down
    .title = Move { $source } down
metadata-source-minimum = Keep at least one source
metadata-source-configured = API settings filled in
metadata-source-unconfigured = API not configured
metadata-source-all-enabled = All available sources are enabled.
llm-test-button = Test connection
