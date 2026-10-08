# 元數據設定
pref-group-metadata = 中文元數據抓取設定
label-isMainlandChina = 
  .label = 目前位於中國大陸（不包括中國香港、中國澳門及中國台灣），海外用戶請取消勾選
label-autoupdate-metadata = 
  .label = 新增中文PDF/CAJ時自動從知網抓取元數據
label-rename = 
  .label = 根據元數據重新命名附件（依賴Attanger或zotmoov插件）
label-filename-pattern = 檔案名稱解析範本
label-namepattern = 檔案名稱解析範本
label-namepattern-auto = 
  .label = 智能識別
  .tooltiptext = 利用茉莉花內建的演算法智能識別檔案名稱的作者或標題
label-namepattern-tg = 
  .label = 標題_作者(預設設定)
  .tooltiptext =「標題_第一作者」格式命名檔案，如「無人機多餘度航空電子系統設計與應用_楊璐.caj」
label-namepattern-t = 
  .label = 標題
  .tooltiptext =「標題」格式命名檔案，如「無人機多餘度航空電子系統設計與應用.caj」
label-namepattern-info = 檔案名稱識別範本，從下拉選單中選擇對應格式或直接輸入
label-namepattern-custom = 
  .label = 自訂
  .tooltiptext = 設定自訂規則，識別檔案名稱中的標題、作者資訊用於元數據抓取
label-choose-namepattern =
  .label = 選擇範本

label-metadata-source = 元數據抓取來源
label-choose-source =
  .label = 選擇資料來源
label-metadata-source-pubscholar =
  .label = PubScholar公益學術平台
label-metadata-source-ncpssd =
  .label = 國家哲學社會科學文獻中心NCPSSD
label-metadata-source-cnki =
  .label = 中國知網CNKI
label-metadata-source-wanfangdata =
  .label = 万方数据WanfangData
label-metadata-source-yiigle =
  .label = 中华医学期刊Yiigle
label-metadata-source-chinadoi =
  .label = 中文DOI ChinaDOI
metadata-source-desc =
  .tooltiptext = 選擇元數據抓取來源，一般情況下不用切換。如果你覺得有些資料來源不需要，可以取消勾選。
info-metadata-source-required = 至少要選擇一個檢索資料來源。

label-pdf-match-folder = 附件匹配資料夾
label-choose-folder =
  .label = 選擇資料夾
namepattern-desc = 
  .tooltiptext = 根據檔案名稱抓取知網元數據，檔案名稱格式設定:{"{"}%t{"}"}=標題，{"{"}%g{"}"}=作者，{"{"}%y{"}"}=年份，{"{"}%j{"}"}=其他（例如來源資訊）；分隔符依實際情況指定，可連續使用多個；不用考慮檔案副檔名。預設使用{"{"}%t{"}"}_{"{"}%g{"}"}，可識別大部分知網下載的檔案名稱格式，包括檔案名稱只包括標題無分隔符號。

# 轉換器設定
pref-group-translators = 中文轉換器設定
label-translator-source = 轉換器下載源
label-best-speed = 選擇最快源
translatorSource-desc =
  .tooltiptext = 選擇轉換器下載源，一般情況下不用切換。如果您無法下載中文轉換器，可選擇嘗試其他源或點擊「選擇最快源」按鈕。
label-auto-update-translators = 
  .label = 自動更新轉換器
label-translators-force-update = 
  .label = 立即更新轉換器
label-translators-detail = 轉換器詳情
label-translators-detail-click = 點擊查看

# 附件設定
pref-group-attachment = 本地附件查找設定
attachment-folder-desc = 
  .tooltiptext = 從下載目錄中查找附件，並匹配到缺少附件的條目中
  此處請設定為瀏覽器的下載目錄，插件即可批次從下載目錄中匯入及查詢附件。
label-pdf-match-folder = 附件下載資料夾
action-after-import = 附件匹配到條目之後，如何處理原始下載的附件檔案：
label-choose-folder =
  .label = 選擇資料夾
nothing-label =
  .label = 無須處理
backup-label =
  .label = 備份附件
delete-label =
  .label = 刪除附件
action-after-import-desc =
  .tooltiptext = 附件成功匹配到條目之後，您可以選擇以下操作：
  1. 無須處理：不做任何操作，下載的附件仍保留在下載目錄中；
  2. 備份附件：將原始下載的附件檔案備份到指定目錄；
  3. 刪除附件：刪除原始下載的附件檔案（該附件已匹配到條目並儲存到Zotero中）。

# 大綱書籤設定
pref-group-bookmark = 大綱書籤設定
label-disableZoteroOutline = 
  .label = 禁用 Zotero 自帶的大綱
label-enableBookmark = 
  .label = 啟用大綱書籤
outline-desc = 
  .tooltiptext = 請注意，當您修改大綱或書籤時，需要點擊「儲存」按鈕才會將變更保存至PDF檔案中。預設情況下，書籤與大綱資訊會與PDF檔案分開儲存。

# 小工具設定
pref-group-tools = 小工具設定
label-auto-split-name = 
  .label = 導入新條目時自動拆分姓名
label-split-en-name =
  .label = 拆分/合併姓名時包括英文名
label-language = 手動設定語言
label-tools-info-1 = 💡 
label-tools-info-2 = 提供更豐富的元數據檢查功能
label-tools-linter = Linter 插件

# WPS 插件安裝
pref-group-wps = WPS Zotero 插件
label-wps = 為 WPS 安裝 Zotero 加載項
label-wps-help = 使用說明
label-install-wps-plugin-click =
  .label = 點擊安裝

# 其他
pref-group-about = 關於
pref-help = 版本 { $version } 建置於 { $time } ❤️
label-zotero-chinese = Zotero中文社群
label-remote-help = 🌸茉莉花/知網遇到問題，免費🎁答疑
label-show-remote-help-qr =
  .label = 顯示二維碼
title-remote-help-qr = 淘寶旺旺二維碼
pref-group-ai = AI 識別 · OpenAI 相容介面
llm-config-title = AI 識別
llm-config-description = 設定用於文獻識別的 OpenAI 相容介面。
pref-popup-autosave = 變更自動儲存
ai-recognition-description =
    .tooltiptext = 設定 Base URL（通常以 /v1 結尾）、API Key 和支援圖片及 JSON Object 輸出的模型，並在「設定來源」中勾選「AI 識別」。資料來源按清單順序執行。輪到 AI 且此前沒有可靠結果時，將 PDF 前三頁傳送至此介面識別（需 Zotero 10）。
label-configure-llm =
    .label = 設定介面
label-llm-provider = 介面平台
llm-provider-custom = 自訂（OpenAI 相容）
llm-provider-magiczotero = MagicZotero
llm-provider-siliconflow = 硅基流動
llm-provider-deepseek = DeepSeek
llm-provider-help = 選擇預設可填入介面位址和範例模型；切換平台後需重新填寫 API Key。
llm-magiczotero-guide-title = 取得 MagicZotero API Key
llm-magiczotero-guide-install = 在外掛程式商店安裝 Garden 外掛程式，並註冊帳號。
llm-magiczotero-guide-copy = <a data-l10n-name="model-store">開啟模型商店</a>，點選 deepseek-v4-1-flash 模型，在右下角依序選擇「查看詳情」→「顯示設定」，複製 API Key。
llm-magiczotero-guide-paste = 將 API Key 貼到下方，然後點選「測試連線」。
llm-magiczotero-store-unavailable = 請先安裝或更新 Garden 外掛程式，並啟用後重試。
llm-magiczotero-store-failed = 模型商店開啟失敗，請在 Garden 外掛程式中重試。
label-llm-model = 模型 ID
llm-model-help = 模型 ID 可自行修改。PDF 識別需支援圖片輸入和 JSON 輸出。
llm-model-help-siliconflow = 此 DeepSeek 預設的圖片輸入能力尚未確認。PDF 識別請使用支援圖片輸入和 JSON 輸出的模型。
llm-model-placeholder =
    .placeholder = 填寫該平台的模型 ID
label-metadata-source-ai =
    .label = AI 識別（需設定 LLM 介面）
metadata-source-up = 上移
metadata-source-down = 下移
metadata-source-remove = 移除
metadata-source-add = 新增來源
metadata-source-select =
    .aria-label = 選擇要新增的資料來源
metadata-source-ai-name = AI 識別
metadata-source-unavailable = 暫不可用
metadata-source-order-description =
    .tooltiptext = 按從上到下的順序擷取，調整後自動儲存。精確匹配後停止；AI 僅在此前無可靠結果時執行，識別成功後停止。至少保留一個來源。
metadata-source-configure =
    .label = 設定來源
metadata-source-title = 資料來源
metadata-source-description = 依順序檢索，精確匹配後停止。可用箭頭調整優先順序。
metadata-source-summary =
    .label = 設定來源 · { $count } 個已啟用
    .tooltiptext = { $sources }
metadata-source-enabled = 已啟用
metadata-source-other = 其他來源
metadata-source-pubscholar-description = 公益學術平台 · 綜合學科
    .title = { metadata-source-pubscholar-description }
metadata-source-ncpssd-description = 國家哲學社會科學文獻中心
    .title = { metadata-source-ncpssd-description }
metadata-source-cnki-description = 中國知網 · 中文學術文獻
    .title = { metadata-source-cnki-description }
metadata-source-yiigle-description = 中華醫學期刊 · 醫學文獻
    .title = { metadata-source-yiigle-description }
metadata-source-ai-description = 識別 PDF 前三頁 · 需設定介面與 Zotero 10
    .title = { metadata-source-ai-description }
metadata-source-unknown-description = 此來源暫不可用，檢索時將略過
    .title = { metadata-source-unknown-description }
metadata-source-move-up =
    .aria-label = 上移 { $source }
    .title = 上移 { $source }
metadata-source-move-down =
    .aria-label = 下移 { $source }
    .title = 下移 { $source }
metadata-source-minimum = 至少保留一個來源
metadata-source-configured = 已填寫介面設定
metadata-source-unconfigured = 未設定介面
metadata-source-all-enabled = 所有可用來源均已啟用。
llm-test-button = 測試連線
