# 元数据设置
pref-group-metadata = 中文元数据抓取设置
label-autoupdate-metadata = 
  .label = 添加中文PDF/CAJ时自动从知网抓取元数据
label-zhnamesplit = 
  .label = 抓取元数据时拆分中文姓，名（包括浏览器抓取）
label-rename = 
  .label = 根据元数据重命名附件（依赖Attanger或zotmoov插件）
label-namepattern = 文件名解析模板
label-namepattern-auto = 
  .label = 智能识别
  .tooltiptext = 利用茉莉花内置的算法智能识别文件名的作者或标题
label-namepattern-tg = 
  .label = 标题_作者
  .tooltiptext =「标题_第一作者」格式命名文件，如「无人机多余度航空电子系统设计与应用_杨璐.caj」
label-namepattern-t = 
  .label = 标题(默认设置)
  .tooltiptext =「标题」格式命名文件，如「无人机多余度航空电子系统设计与应用.caj」
label-namepattern-info = 文件名识别模板，从下拉菜单中选择对应格式或直接输入
label-namepattern-custom = 
  .label = 自定义
  .tooltiptext = 设置自定义规则，识别文件名中的标题、作者信息用于元数据抓取
label-choose-namepattern =
  .label = 选择模板

label-metadata-source = 元数据抓取来源
label-choose-source =
  .label = 选择数据源
label-metadata-source-cnki =
  .label = 中国知网CNKI
label-metadata-source-cvip =
  .label = 维普期刊CVIP
label-pdf-match-folder = 附件匹配文件夹
label-choose-folder =
  .label = 选择文件夹
namepattern-desc = 
  .tooltiptext = 根据文件名抓取知网元数据，文件名格式设置:{"{"}%t{"}"}=标题，{"{"}%g{"}"}=作者，{"{"}%y{"}"}=年份，{"{"}%j{"}"}=其他（例如来源信息）；分隔符依实情指定，可连续使用多个；不用考虑文件后缀名。默认使用{"{"}%t{"}"}_{"{"}%g{"}"}，可识别大部分知网下载的文件名格式，包括文件名只包括标题无分隔符号

# 转换器设置
pref-group-translators = 中文转换器设置
label-auto-update-translators = 
  .label = 自动更新转换器
label-translators-force-update = 
  .label = 立即更新转换
label-translators-detail = 转换器详情
label-translators-detail-click = 点击查看

# 小工具设置
pref-group-tools = 小工具设置
label-language = 手动设置语言
label-tools-info = 💡 Linter 插件提供更丰富的元数据检查功能->
label-tools-linter = Linter 插件教程

# WPS 插件安装
pref-group-wps = WPS Zotero 插件
label-wps = 为 WPS 安装 Zotero 加载项
label-wps-help = 使用帮助
label-install-wps-plugin-click =
  .label = 点击安装

# 其他
pref-group-about = 关于
pref-help = 版本 { $version } 构建于 { $time } ❤️
label-zotero-chinese = Zotero中文社区
pref-enable =
  .label = 启用