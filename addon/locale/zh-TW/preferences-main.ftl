# 元數據設定
pref-group-metadata = 中文元數據抓取設定
label-isMainlandChina = 
  .label = 目前位於中國大陸（不包括中國香港、中國澳門及中國台灣），海外用戶請取消勾選
label-autoupdate-metadata = 
  .label = 新增中文PDF/CAJ時自動從知網抓取元數據
label-rename = 
  .label = 根據元數據重新命名附件（依賴Attanger或zotmoov插件）
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
label-metadata-source-cnki =
  .label = 中國知網CNKI
label-metadata-source-cvip =
  .label = 維普期刊CVIP
label-pdf-match-folder = 附件匹配資料夾
label-choose-folder =
  .label = 選擇資料夾
namepattern-desc = 
  .tooltiptext = 根據檔案名稱抓取知網元數據，檔案名稱格式設定:{"{"}%t{"}"}=標題，{"{"}%g{"}"}=作者，{"{"}%y{"}"}=年份，{"{"}%j{"}"}=其他（例如來源資訊）；分隔符依實際情況指定，可連續使用多個；不用考慮檔案副檔名。預設使用{"{"}%t{"}"}_{"{"}%g{"}"}，可識別大部分知網下載的檔案名稱格式，包括檔案名稱只包括標題無分隔符號。

# 轉換器設定
pref-group-translators = 中文轉換器設定
label-translator-source = 轉換器下載源
translatorSource-desc =
  .tooltiptext = 選擇轉換器下載源，一般情況下不用切換。如果您無法下載中文轉換器，可選擇嘗試其他源。
label-auto-update-translators = 
  .label = 自動更新轉換器
label-translators-force-update = 
  .label = 立即更新
label-translators-detail = 轉換器詳情
label-translators-detail-click = 點擊查看

# 大綱書籤設定
pref-group-bookmark = 大綱書籤設定
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
pref-enable =
  .label = 啟用