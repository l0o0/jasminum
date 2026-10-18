plugin-name = Jasminum
prefs-table-title = Title
prefs-table-detail = Detail
tabpanel-lib-tab-label = Lib Tab
tabpanel-reader-tab-label = Reader Tab

# Preference
select-download-folder = Select download folder
get-Chinese-styles = Get Chinese Styles
info-translators-cn-updaing = Chinese translators are under updating.
info-best-speed-source-updated = Updated to fastest source: { $source }
info-best-speed-source-failed = Failed to select fastest source, please check network connection


# Preference translator table
th-filename = File name
th-label = Label
th-local-update-time = Local update time
th-remote-update-time = Remote update time

# Help menu
help-menu-chinese = Zotero Chinese Community
help-menu-wiki = Zotero Wiki
help-menu-addons = Addon Store
help-menu-csl = Donwload more CSL
help-menu-translator = Help with Chinese literature capture

# Menu
menu-metadata =
    .label = Metadata(CN)
menuitem-retrieveMetadata =
    .label = Find article metadata
menuitem-retrieveMetadataForBook = Find book metadata

menuitem-find-attachment =
    .label = Find attachment in Folder
menuitem-import-attachments =
    .label = Import attachments from Folder

menu-tools =
    .label = Tools
menuitem-mergeName =
    .label = Concat Name
menuitem-splitName =
    .label = Split Name
menuitem-updateCNKICite =
    .label = Update CNKI citation

# ui
CNKIcitation = CNKICite

# popup window
citation = Cite
no-chinese-item-for-citation = Only Chinese items can find CNKI citation
update-translators-start = Start updating translators
update-successfully = Update successfully: { $name }
update-failed = Update failed: { $name }
update-skipped = Up to date: { $name }
update-translators-complete = Update translators completed, Success: { $successCounts }, Failed: { $failCounts }, Up to date: { $skipCounts }
no-item-need-attachment = No item need attachment
no-attachments-found = No attachments found (PDF, CAJ, etc.)
import-attachments-success = Import attachments from folder successfully
importing-attachments-is-running = An attachment import task is already running. Please try again later.

# outline
outline = Show Bookmark (By Jasminum)
outline-expand-all = Expand all
outline-collapse-all = Collapse all
outline-add = Add bookmark
outline-delete = Delete bookmark
outline-save-to-pdf = Save outline to PDF
outline-empty-prompt = Please click the button above { $icon } to create a bookmark
outline-delete-confirm = This node has child nodes, do you want to delete?
  {" "}
  If you delete, all child nodes will be deleted.

# bookmark
bookmark = Show Bookmarks (By Jasminum)
bookmark-add = Add bookmark
bookmark-delete = Delete bookmark

# Progress window
task-msg-header = 
    Please screenshot the following content and contact the developer: [RedBook l0o0](https://www.xiaohongshu.com/user/profile/6153b4fa000000001f03ac8c)
    If you don't get a timely response, you can get free consultation on Taobao. Please look for the official store: [Contact via WangWang](https://item.taobao.com/item.htm?ft=t&id=1035769863393)
    You can also open the QR dialog directly here: [Show QR Code](jasminum://remote-help-qr)
task-already-exists = Task already exists: { $title }
ai-config-required = Configure Base URL, API Key, and model under AI recognition in Jasminum settings first.
ai-config-invalid-url = Base URL must be a valid HTTP(S) API root without credentials, query parameters, or fragments.
ai-recognition-start = No reliable search results; recognizing the first three PDF pages with AI.
ai-recognition-empty = AI could not identify a reliable title or item type.
ai-recognition-failed = AI recognition failed. Check the API configuration, model image/JSON Object support, and Zotero version (10 required).
ai-recognition-save-failed = Failed to save AI metadata.
llm-test-running = Sending the jasmine test image to check image recognition and JSON output…
llm-test-success = Test passed: the model correctly recognized the image text and petal color. This image request is supported.
llm-test-invalid-response = The API responded, but the image answers did not match. Image recognition could not be confirmed.
llm-test-failed = Test failed or timed out. Check the API settings and model support for image input and JSON Object output.

outline-save-failed = Could not save the outline. Check that the PDF is writable and try again.

selection-add-bookmark = Add Selected Text as Bookmark
selection-add-outline = Add Selected Text to Outline
selection-add-failed = Could not add the selection. Please try again.
outline-refresh-failed = The outline was saved, but the reader could not refresh. Reopen the PDF to view it.

# Existing-item metadata update
metadata-update-menu =
    .label = Jasminum: Update Metadata…
metadata-update-title = Update Metadata
metadata-update-description = Use the configured AI provider to recognize the selected PDF. Recognition sends images of its first pages. Only selected fields will be updated.
metadata-update-pdf = PDF attachment:
metadata-update-fetch = Recognize PDF
metadata-update-apply = Apply Selected Changes
metadata-update-undo = Undo This Update
metadata-update-close = Close
metadata-update-source = Source: AI · Selected PDF. Empty fields are selected by default. Verify the title, authors and DOI identify the same work.
metadata-update-select-all = Select All Changes
metadata-update-empty-only = Fill Empty Fields Only
metadata-update-field = Field
metadata-update-before = Current
metadata-update-after = Recognized
metadata-update-creators = Creators
metadata-update-page = Page
metadata-update-no-pdf = No PDF attachment is available. Attach a PDF to this item first.
metadata-update-loading = Recognizing PDF…
metadata-update-review = Select the fields to update. Close this window to discard the results.
metadata-update-no-changes = No field changes found.
metadata-update-no-result = No valid bibliographic metadata was recognized.
metadata-update-saved = Original item updated. Attachments, notes and collections are preserved.
metadata-update-restored = This update was undone.
metadata-update-type-conflict = The recognized item type differs from the original. Type conversion is not supported yet; check the PDF and item type.
metadata-update-unavailable = The item was deleted or is not editable. No changes applied.
metadata-update-stale = The item changed since this preview. No changes applied. Recognize again and review.

# AI full-document outline
outline-ai-title = AI Full-PDF Outline
outline-ai-description = Send up to 5 PDF page images per request to the configured AI provider. Long documents may incur substantial usage. Preview before replacing the Jasminum outline; the PDF is not modified automatically. Scanned-page positions are approximate.
outline-ai-pdf = PDF attachment:
outline-ai-start = Recognize Entire PDF
outline-ai-stop = Stop
outline-ai-stopping = Stopping after the current request returns…
outline-ai-stopped = Stopped. Continue to process the remaining pages.
outline-ai-continue = Start / Continue
outline-ai-apply = Save
outline-ai-undo = Restore Previous Outline
outline-ai-close = Close
outline-ai-page = Page
outline-ai-exact = Text matched
outline-ai-approx = Approximate position
outline-ai-running = Recognizing page
outline-ai-review = Recognition complete. Review the headings and use ↗ to check PDF locations before replacing the outline.
outline-ai-empty = No section headings found. Original outline is unchanged.
outline-ai-failed = Recognition failed. Continue to retry this batch; see the yellow bell for details.
outline-ai-busy = This PDF already has a recognition task running.
outline-ai-no-pdf = No editable PDF attachment with an available file.
outline-ai-reader-error = The PDF reader is closed or unavailable. Reopen it and try again.
outline-ai-changed = The outline changed since recognition started. Nothing overwritten. Close this window and start again.
outline-ai-saved = Saved to the PDF and synchronized with the Jasminum outline.
outline-ai-restored = Original outline restored and saved to the PDF.
outline-ai-menu =
    .label = AI Full-PDF Outline…
outline-ai-queued = Waiting for recognition
outline-ai-preview = Preview Outline

outline-ai-edit-hint = ↑ ↓ select · Drag to reorder · Delete / Backspace remove · ← → change level · Use ↗ to go to the PDF. Edit after recognition stops or finishes, then click Save.
outline-ai-restart = Recognize again
outline-ai-error-details = Operation failed. See the yellow bell for details.

outline-ai-review-title = Review and adjust the outline below
outline-ai-review-open = Review outline
outline-ai-status-saved = Saved
outline-ai-status-waiting = Queued
outline-ai-status-processing = Recognizing
outline-ai-status-paused = Paused
outline-ai-status-fail = Recognition failed
outline-ai-status-success = Ready to review

llm-profile-new = New connection

outline-ai-exact-tip = Text matched: this heading was located in the PDF text layer.
outline-ai-approx-tip = Estimated position: based on the page image; please verify its location.

outline-ai-jump = Go to PDF location

outline-ai-review-window-title = Jasminum AI Outline Review
outline-ai-promote = Promote one level
outline-ai-demote = Demote one level

outline-ai-save-outline = Save
