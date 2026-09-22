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
menu-metadata = 元資料抓取
menuitem-retrieveMetadata = 抓取期刊元資料
menuitem-retrieveMetadataForBook = 抓取書籍元資料

menuitem-find-attachment = 在資料夾中尋找附件
menuitem-import-attachments = 從資料夾中導入附件

menu-tools = 小工具
menuitem-mergeName = 合併姓名
menuitem-splitName = 拆分姓名
menuitem-updateCNKICite = 更新知網引用數

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
llm-test-running = 正在測試目前填寫的介面和模型…
llm-test-success = 連線及 JSON 輸出測試通過（圖片識別能力未測試）。
llm-test-invalid-response = 介面已回應，但未傳回預期的 JSON 結果。
llm-test-failed = 測試失敗或逾時，請檢查 Base URL、API Key、模型及 JSON Object 支援。
