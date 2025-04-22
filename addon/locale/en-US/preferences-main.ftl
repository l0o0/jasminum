# Metadata Settings
pref-group-metadata = Chinese Metadata Retrieval Settings
label-isMainlandChina = 
  .label = Currently located in Chinese Mainland (excluding Hong Kong, Macao and Taiwan), uncheck for overseas users
label-autoupdate-metadata =
  .label = Automatically retrieve metadata from CNKI when adding Chinese PDF/CAJ files
label-rename =
  .label = Rename attachments based on metadata (requires Attanger or zotmoov plugin)
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
label-metadata-source-cnki =
  .label = CNKI (China National Knowledge Infrastructure)
label-metadata-source-cvip =
  .label = VIP Journals (Chinese VIP Information)
label-pdf-match-folder = Attachment Matching Folder
label-choose-folder =
  .label = Select Folder
namepattern-desc =
  .tooltiptext = Retrieve CNKI metadata based on filenames. Filename format settings: {"{"}%t{"}"}=Title, {"{"}%g{"}"}=Author, {"{"}%y{"}"}=Year, {"{"}%j{"}"}=Other (e.g., source information); specify separators as needed; multiple separators can be used consecutively; file extensions are ignored. Default uses {"{"}%t{"}"}_{"{"}%g{"}"}, which recognizes most CNKI filename formats, including filenames with only titles and no separators.

# Transator Settings
pref-group-translators = Chinese Translator Settings
label-translator-source = Translator Download Source
translatorSource-desc =
  .tooltiptext = Select the translator download source. Generally, there is no need to switch. If you cannot download the Chinese translator, you can try other sources.
label-auto-update-translators =
  .label = Automatically Update Translators
label-translators-force-update =
  .label = Update Immediately
label-translators-detail = Translator Details
label-translators-detail-click = Click to View

# Outline Bookmark Settings
pref-group-bookmark = Outline Bookmark Settings
label-enableBookmark = 
  .label = Enable Outline Bookmark

# Tool Settings
pref-group-tools = Tool Settings
label-auto-split-name =
  .label = Automatically split first name and last name when adding new items
label-split-en-name = 
  .label = Include English names when splitting/merging names
label-language = Manually Set Language
label-tools-info = 💡 The Linter plugin provides richer metadata inspection functionality ->
label-tools-linter = Linter Plugin Tutorial

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
pref-enable =
  .label = Enable