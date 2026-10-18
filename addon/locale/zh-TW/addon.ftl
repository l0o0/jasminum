plugin-name = 茉莉花

prefs-table-title = 標題
prefs-table-detail = 詳細資料
tabpanel-lib-tab-label = 圖書館標籤
tabpanel-reader-tab-label = 閱讀器標籤

# Preference
select-download-folder = 選擇下載檔案儲存目錄
get-Chinese-styles = 取得中文社群樣式…
info-translators-cn-updaing = 中文轉換器正在更新中
info-best-speed-source-updated = 已更新為最快源：{ $source }
info-best-speed-source-failed = 選擇最快源失敗，請檢查網路連接

# Preference translator table
th-filename = 檔案名稱
th-label = 標籤
th-local-update-time = 本地更新時間
th-remote-update-time = 遠程更新時間

# Help menu
help-menu-chinese = Zotero 中文社群
help-menu-wiki = Zotero 使用說明
help-menu-addons = 插件商店
help-menu-csl = CSL樣式下載
help-menu-translator = 中文文獻抓取異常解決

# Menu
menu-metadata =
    .label = 元資料抓取
menuitem-retrieveMetadata =
    .label = 抓取期刊元資料
menuitem-retrieveMetadataForBook = 抓取書籍元資料

menuitem-find-attachment =
    .label = 在資料夾中尋找附件
menuitem-import-attachments =
    .label = 從資料夾中導入附件

menu-tools =
    .label = 小工具
menuitem-mergeName =
    .label = 合併姓名
menuitem-splitName =
    .label = 拆分姓名
menuitem-updateCNKICite =
    .label = 更新知網引用數

# ui
CNKIcitation = 知網引用數

# popup window
citation = 引用
no-chinese-item-for-citation = 只有中文項目才能抓取引用數哦😀
update-translators-start = 開始更新轉換器
update-successfully = 更新成功：{ $name }
update-failed = 更新失敗：{ $name }
update-skipped = 已最新：{ $name }
update-translators-complete = 轉換器更新完成，成功：{ $successCounts }, 失敗：{ $failCounts }， 已最新：{ $skipCounts }
no-item-need-attachment = 項目已存在附件或屬於非學術類型
import-attachments-success = 從資料夾中導入附件成功
importing-attachments-is-running = 已有附件匯入任務正在執行，請稍後再試
no-attachments-found = 未找到可匯入的附件（PDF、CAJ等）

# outline
outline = 顯示書籤大纲（茉莉花）
outline-expand-all = 展開所有
outline-collapse-all = 收起所有
outline-add = 添加書籤
outline-delete = 刪除書籤
outline-save-to-pdf = 將大纲儲存到PDF檔案
outline-edit-placeholder = 請輸入書籤
outline-empty-prompt = 請點擊上方按鈕{ $icon }創建書籤
outline-delete-confirm = 該節點有子節點，是否刪除?
  {" "}
  如果刪除，則所有子節點也會被刪除。

# bookmark
bookmark = 顯示書籤（茉莉花）
bookmark-add = 添加書籤
bookmark-delete = 刪除書籤

# Progress window
task-msg-header = 
    如果抓取異常需要幫助，請截圖以下內容並聯繫開發者：[小紅書l0o0](https://www.xiaohongshu.com/user/profile/6153b4fa000000001f03ac8c)
    如回复未及时，可在淘宝免费咨询，请认准官方店铺：[点击旺旺联系](https://item.taobao.com/item.htm?ft=t&id=1035769863393)
    也可直接點擊這裡打開二維碼：[查看二維碼](jasminum://remote-help-qr)
task-already-exists = 已存在任務：{ $title }
ai-config-required = 請先在茉莉花設定的 AI 識別中填寫 Base URL、API Key 和模型。
ai-config-invalid-url = Base URL 必須是有效的 HTTP(S) 介面根位址，不應包含帳號、查詢參數或片段。
ai-recognition-start = 未找到可靠檢索結果，開始 AI 識別 PDF 前三頁。
ai-recognition-empty = AI 未識別到可靠的標題或條目類型。
ai-recognition-failed = AI 識別失敗，請檢查 LLM 介面設定、模型圖片/JSON Object 支援及 Zotero 版本（需 10）。
ai-recognition-save-failed = AI 中繼資料儲存失敗。
llm-test-running = 正在傳送茉莉花測試圖片，檢查圖片辨識與 JSON 輸出…
llm-test-success = 測試通過：模型正確辨識了測試圖片的文字和花瓣顏色，支援本次圖片請求。
llm-test-invalid-response = 介面已回應，但圖片內容核對未通過，暫無法確認圖片辨識能力。
llm-test-failed = 測試失敗或逾時，請檢查介面設定以及模型的圖片輸入和 JSON Object 支援。

outline-save-failed = 目錄儲存失敗，請檢查 PDF 檔案是否可寫入後重試。

selection-add-bookmark = 將選取文字新增為書籤
selection-add-outline = 將選取文字新增為目錄
selection-add-failed = 新增失敗，請重試。
outline-refresh-failed = 目錄已儲存，但閱讀器重新整理失敗。請重新開啟 PDF 查看。

# Existing-item metadata update
metadata-update-menu =
    .label = 茉莉花：更新中繼資料…
metadata-update-title = 更新中繼資料
metadata-update-description = 使用已設定的 AI 介面辨識所選 PDF。點擊辨識將傳送 PDF 前幾頁的圖片；確認後僅更新選取的欄位。
metadata-update-pdf = PDF 附件：
metadata-update-fetch = 辨識 PDF
metadata-update-apply = 套用選取的修改
metadata-update-undo = 復原本次修改
metadata-update-close = 關閉
metadata-update-source = 來源：AI · 所選 PDF。預設僅補充空白欄位；請核對標題、作者與 DOI，確認是同一篇文獻。
metadata-update-select-all = 全選變更
metadata-update-empty-only = 僅補充空白欄位
metadata-update-field = 欄位
metadata-update-before = 目前內容
metadata-update-after = 辨識結果
metadata-update-creators = 作者及貢獻者
metadata-update-page = 頁
metadata-update-no-pdf = 沒有可用的 PDF 附件。請先為該文獻新增 PDF。
metadata-update-loading = 正在辨識，請稍候…
metadata-update-review = 請勾選要更新的欄位。關閉視窗可放棄本次結果。
metadata-update-no-changes = 未發現可更新的欄位。
metadata-update-no-result = 未辨識到有效的文獻中繼資料。
metadata-update-saved = 已更新原項目。附件、筆記與分類保持不變。
metadata-update-restored = 已復原本次修改。
metadata-update-type-conflict = 辨識出的文獻類型與原項目不同。本版暫不支援轉換類型，請核對 PDF 和項目類型。
metadata-update-unavailable = 項目已刪除或無法編輯，未套用修改。
metadata-update-stale = 項目內容已變更，未套用修改。請重新辨識並核對。

# AI full-document outline
outline-ai-title = AI 全文大綱辨識
outline-ai-description = 每批向目前 AI 介面傳送最多 5 頁 PDF 圖片，可能產生較多費用。全部完成後可預覽並取代茉莉花大綱；不會自動修改 PDF。掃描文件位置為估計值。
outline-ai-pdf = PDF 附件：
outline-ai-start = 開始辨識全文
outline-ai-stop = 停止
outline-ai-stopping = 正在停止，目前請求返回後結束…
outline-ai-stopped = 已停止，可繼續辨識剩餘頁面。
outline-ai-continue = 開始 / 繼續辨識
outline-ai-apply = 儲存
outline-ai-undo = 還原原大綱
outline-ai-close = 關閉
outline-ai-page = 頁
outline-ai-exact = 原文匹配
outline-ai-approx = 估計位置
outline-ai-running = 正在辨識頁面
outline-ai-review = 識別完成。請核對並調整標題，點擊右側 ↗ 查看 PDF 位置，確認後取代目前大綱。
outline-ai-empty = 全文未發現章節標題，未修改原大綱。
outline-ai-failed = 識別失敗，可繼續重試目前批次。詳情請查看黃色鈴鐺。
outline-ai-busy = 該 PDF 已有辨識工作正在執行。
outline-ai-no-pdf = 沒有可編輯且檔案可用的 PDF 附件。
outline-ai-reader-error = PDF 閱讀器已關閉或尚未就緒，請重新開啟後重試。
outline-ai-changed = 大綱在辨識後已被修改，未覆蓋。請關閉視窗後重新辨識。
outline-ai-saved = 已儲存至 PDF，並同步茉莉花大綱。
outline-ai-restored = 已恢復原大綱，並同步至 PDF。
outline-ai-menu =
    .label = AI 全文大綱辨識…
outline-ai-queued = 等待辨識
outline-ai-preview = 預覽大綱

outline-ai-edit-hint = ↑ ↓ 切換標題 · 拖曳排序 · Delete / Backspace 刪除 · ← → 調整層級 · 右側 ↗ 跳轉 PDF。停止或完成識別後可編輯，點擊「儲存」完成。
outline-ai-restart = 重新識別
outline-ai-error-details = 操作失敗，請查看黃色鈴鐺中的詳情。

outline-ai-review-title = 請調整並核對以下大綱
outline-ai-review-open = 核對大綱
outline-ai-status-saved = 已儲存
outline-ai-status-waiting = 等待識別
outline-ai-status-processing = 識別中
outline-ai-status-paused = 已暫停
outline-ai-status-fail = 識別失敗
outline-ai-status-success = 待核對

llm-profile-new = 新介面

outline-ai-exact-tip = 原文匹配：已在 PDF 文字層定位到此標題。
outline-ai-approx-tip = 估計位置：依頁面圖片估算，請核對實際位置。

outline-ai-jump = 跳轉至 PDF 位置

outline-ai-review-window-title = 茉莉花AI大綱核對
outline-ai-promote = 提升一級
outline-ai-demote = 降低一級

outline-ai-save-outline = 儲存
