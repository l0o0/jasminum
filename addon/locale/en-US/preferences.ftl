# Metadata Settings
pref-group-metadata = Chinese Metadata Retrieval Settings
label-autoupdate-metadata =
.label = Automatically retrieve metadata from CNKI when adding Chinese PDF/CAJ files
label-zhnamesplit =
.label = Split Chinese surnames and given names during metadata retrieval (including browser retrieval)
label-rename =
.label = Rename attachments based on metadata (requires Attanger or zotmoov plugin)
label-namepattern = Filename Parsing Template
label-namepattern-auto =
.label = Smart Recognition
.tooltiptext = Use Jasmine's built-in algorithm to intelligently identify authors or titles from filenames
label-namepattern-tg =
.label = Title_Author
.tooltiptext = Rename files in the format "Title_FirstAuthor," e.g., "Design and Application of Redundant Avionics Systems for Drones_Yang Lu.caj"
label-namepattern-t =
.label = Title (Default Setting)
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

# Converter Settings
pref-group-translators = Chinese Translator Settings
label-auto-update-translators =
.label = Automatically Update Translators
label-translators-force-update =
.label = Update Translators Immediately
label-translators-detail = Translator Details
label-translators-detail-click = Click to View

# Tool Settings
pref-group-tools = Tool Settings
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
pref-help = Version { time } ❤️
label-zotero-chinese = Zotero Chinese Community
pref-enable =
.label = Enable