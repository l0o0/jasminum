# 元数据设置
pref-group-metadata = 中文元数据抓取设置
label-isMainlandChina = 
  .label = 当前位于中国大陆（不包括中国香港、中国澳门及中国台湾），海外用户请取消勾选
label-autoupdate-metadata = 
  .label = 添加中文PDF/CAJ时自动从知网抓取元数据
label-rename = 
  .label = 根据元数据重命名附件（依赖Attanger或zotmoov插件）
label-namepattern = 文件名解析模板
label-namepattern-auto = 
  .label = 智能识别
  .tooltiptext = 利用茉莉花内置的算法智能识别文件名的作者或标题
label-namepattern-tg = 
  .label = 标题_作者(默认设置)
  .tooltiptext =「标题_第一作者」格式命名文件，如「无人机多余度航空电子系统设计与应用_杨璐.caj」
label-namepattern-t = 
  .label = 标题
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

namepattern-desc = 
  .tooltiptext = 根据文件名抓取知网元数据，文件名格式设置:
  {"{"}%t{"}"}=标题，{"{"}%g{"}"}=作者，{"{"}%y{"}"}=年份，{"{"}%j{"}"}=其他（例如来源信息）；分隔符依实情指定，可连续使用多个；不用考虑文件后缀名。
  默认使用{"{"}%t{"}"}_{"{"}%g{"}"}，可识别大部分知网下载的文件名格式，包括文件名只包括标题无分隔符号。

# 附件查找设置
pref-group-attachment = 本地附件查找设置
attachment-folder-desc = 
  .tooltiptext = 从下载目录中查找附件，并匹配到缺少附件的条目中。
  此处请设置为浏览器的下载目录，插件就可以批量从下载目录中导入和查询附件。
label-pdf-match-folder = 附件下载文件夹
action-after-import = 附件匹配到条目之后，如何处理原始下载的附件文件：
label-choose-folder =
  .label = 选择文件夹
nothing-label =
  .label = 无须处理
backup-label =
  .label = 备份附件
delete-label =
  .label = 删除附件
action-after-import-desc =
  .tooltiptext = 附件成功匹配到条目之后，您可以选择以下操作：
  1. 无须处理：不做任何操作，下载的附件还在下载目录中；
  2. 备份附件：将原始下载的附件文件备份到指定目录；
  3. 删除附件：删除原始下载的附件文件，该附件已经匹配到条目，保存到Zotero中，可放心删除。

# 转换器设置
pref-group-translators = 中文转换器设置
label-translator-source = 转换器下载源
label-best-speed = 选择最快源
translatorSource-desc =
  .tooltiptext = 选择转换器下载源，一般情况下不用切换。如果您无法下载中文转换器，可选择尝试其他源或点击 选择最快源 按钮。
label-auto-update-translators = 
  .label = 自动更新转换器
label-translators-force-update = 
  .label = 立即更新
label-translators-detail = 转换器详情
label-translators-detail-click = 点击查看

# 大纲书签设置
pref-group-bookmark = 大纲书签设置
label-disableZoteroOutline = 
  .label = 禁用 Zotero 自带的大纲
label-enableBookmark = 
  .label = 启用大纲书签
outline-desc = 
  .tooltiptext = 请注意，当您修改大纲或书签时，需要点击保存按钮才会保存到PDF文件中。默认将书签大纲信息与PDF文件分开保存。

# 小工具设置
pref-group-tools = 小工具设置
label-auto-split-name = 
  .label = 导入新条目时自动拆分姓名
label-split-en-name = 
  .label = 拆分/合并姓名时包括英文名
label-language = 手动设置语言
label-tools-info-1 = 💡 
label-tools-info-2 = 提供更丰富的元数据检查功能
label-tools-linter = Linter 插件

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