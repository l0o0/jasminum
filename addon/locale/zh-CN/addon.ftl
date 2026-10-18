plugin-name = 茉莉花

prefs-table-title = 标题
prefs-table-detail = 详情
tabpanel-lib-tab-label = 库标签
tabpanel-reader-tab-label = 阅读器标签

# Preference
select-download-folder = 选择下载文件保存目录
get-Chinese-styles = 获取中文社区样式…
info-translators-cn-updaing = 中文转换器正在更新中
info-best-speed-source-updated = 已更新为最快源：{ $source }
info-best-speed-source-failed = 选择最快源失败，请检查网络连接

# Preference translator table
th-filename = 文件名
th-label = 标签
th-local-update-time = 本地更新时间
th-remote-update-time = 远程更新时间

# Help menu
help-menu-chinese = Zotero 中文社区
help-menu-wiki = Zotero 使用文档
help-menu-addons = 插件商店
help-menu-csl = CSL样式下载
help-menu-translator = 中文文献抓取异常修复

# Menu
menu-metadata =
    .label = 茉莉花抓取
menuitem-retrieveMetadata =
    .label = 抓取期刊元数据
menuitem-retrieveMetadataForBook = 抓取书籍元数据

menuitem-find-attachment =
    .label = 在下载文件夹中查找附件
menuitem-import-attachments =
    .label = 从下载文件夹中导入附件

menu-tools =
    .label = 小工具
menuitem-mergeName =
    .label = 合并姓名
menuitem-splitName =
    .label = 拆分姓名
menuitem-updateCNKICite =
    .label = 更新知网引用数

# ui
CNKIcitation = 知网引用数

# popup window
citation = 引用
no-chinese-item-for-citation = 只有中文条目才能抓取引用数哦😀
update-translators-start = 开始更新转换器
update-successfully = 更新成功：{ $name }
update-failed = 更新失败：{ $name }
update-skipped = 已最新：{ $name }
update-translators-complete = 转换器更新完成，成功：{ $successCounts }, 失败：{ $failCounts }， 已最新：{ $skipCounts }
no-item-need-attachment = 这些条目已有附件或属于非学术类型条目
no-attachments-found = 未找到可导入的附件（PDF, CAJ等）
import-attachments-success = 从文件夹中导入附件成功
importing-attachments-is-running = 已有一个附件导入任务正在运行，请稍后再试。

# outline
outline = 显示大纲（茉莉花）
outline-expand-all = 展开所有
outline-collapse-all = 收起所有
outline-add = 添加书签
outline-delete = 删除书签
outline-save-to-pdf = 将大纲保存到PDF文件
outline-edit-placeholder = 请输入书签
outline-empty-prompt = 请点击上方按钮{ $icon }创建书签
outline-delete-confirm = 该节点有子节点，是否删除?
  {" "}
  如果删除，则所有子节点也会被删除。

# bookmark
bookmark = 显示书签（茉莉花）
bookmark-add = 添加书签
bookmark-delete = 删除书签

# Progress window
task-msg-header = 
    请截图该弹窗并联系开发者：[小红书l0o0](https://www.xiaohongshu.com/user/profile/6153b4fa000000001f03ac8c)
    如回复未及时，也可直接点击这里免费咨询：[查看二维码](jasminum://remote-help-qr)
task-already-exists = 任务已存在：{ $title }
ai-config-required = 请先在茉莉花设置的 AI 识别中填写 Base URL、API Key 和模型。
ai-config-invalid-url = Base URL 必须是有效的 HTTP(S) 接口根地址，不应包含账号、查询参数或片段。
ai-recognition-start = 未找到可靠检索结果，开始 AI 识别 PDF 前三页。
ai-recognition-empty = AI 未识别到可靠的标题或条目类型。
ai-recognition-failed = AI 识别失败，请检查 LLM 接口配置、模型图片/JSON Object 支持及 Zotero 版本（需 10）。
ai-recognition-save-failed = AI 元数据保存失败。
llm-test-running = 正在发送茉莉花测试图片，检查图片识别与 JSON 输出…
llm-test-success = 测试通过：模型正确识别了测试图片的文字和花瓣颜色，支持本次图片请求。
llm-test-invalid-response = 接口已响应，但图片内容核对未通过，暂无法确认图片识别能力。
llm-test-failed = 测试失败或超时，请检查接口配置以及模型的图片输入和 JSON Object 支持。

outline-save-failed = 目录保存失败，请检查 PDF 文件是否可写后重试。

selection-add-bookmark = 将选中文字添加为书签
selection-add-outline = 将选中文字添加为目录
selection-add-failed = 添加失败，请重试。
outline-refresh-failed = 目录已保存，但阅读器刷新失败。请重新打开 PDF 查看。

# Existing-item metadata update
metadata-update-menu =
    .label = 茉莉花：更新元数据…
metadata-update-title = 更新元数据
metadata-update-description = 使用已配置的 AI 接口识别所选 PDF。点击识别将发送 PDF 前几页的图片；确认后仅更新选中的字段。
metadata-update-pdf = PDF 附件：
metadata-update-fetch = 识别 PDF
metadata-update-apply = 应用所选修改
metadata-update-undo = 撤销本次修改
metadata-update-close = 关闭
metadata-update-source = 来源：AI · 所选 PDF。默认仅补充空字段；请核对标题、作者与 DOI，确认是同一篇文献。
metadata-update-select-all = 全选变化
metadata-update-empty-only = 仅补充空字段
metadata-update-field = 字段
metadata-update-before = 当前内容
metadata-update-after = 识别结果
metadata-update-creators = 作者及贡献者
metadata-update-page = 页
metadata-update-no-pdf = 没有可用的 PDF 附件。请先为该文献添加 PDF。
metadata-update-loading = 正在识别，请稍候…
metadata-update-review = 请勾选要更新的字段。关闭窗口可放弃本次结果。
metadata-update-no-changes = 未发现可更新的字段。
metadata-update-no-result = 未识别到有效的文献元数据。
metadata-update-saved = 已更新原条目。附件、笔记与分类保持不变。
metadata-update-restored = 已撤销本次修改。
metadata-update-type-conflict = 识别出的文献类型与原条目不同。本版暂不支持转换类型，请核对 PDF 和条目类型。
metadata-update-unavailable = 条目已删除或不可编辑，未应用修改。
metadata-update-stale = 条目内容已发生变化，未应用修改。请重新识别并核对。

# AI full-document outline
outline-ai-title = AI 全文大纲识别
outline-ai-description = 每批向当前 AI 接口发送最多 5 页 PDF 图片，可能产生较多费用。识别全部完成后可预览并替换茉莉花大纲；不会自动修改 PDF 文件。扫描件位置为估计值。
outline-ai-pdf = PDF 附件：
outline-ai-start = 开始识别全文
outline-ai-stop = 停止
outline-ai-stopping = 正在停止，当前请求返回后结束…
outline-ai-stopped = 已停止，可继续识别剩余页面。
outline-ai-continue = 继续识别
outline-ai-apply = 保存
outline-ai-undo = 恢复原大纲
outline-ai-close = 关闭
outline-ai-page = 页
outline-ai-exact = 原文匹配
outline-ai-approx = 估计位置
outline-ai-running = 正在识别页面
outline-ai-review = 识别完成。请核对并调整标题，点击右侧 ↗ 查看 PDF 位置，确认后替换当前大纲。
outline-ai-empty = 全文未发现章节标题，未修改原大纲。
outline-ai-failed = 识别失败，可继续重试当前批次。详情请查看黄色铃铛。
outline-ai-busy = 该 PDF 已有识别任务正在运行。
outline-ai-no-pdf = 没有可编辑且文件可用的 PDF 附件。
outline-ai-reader-error = PDF 阅读器已关闭或尚未就绪，请重新打开后重试。
outline-ai-changed = 大纲在识别后已被修改，未覆盖。请关闭窗口后重新识别。
outline-ai-saved = 已保存到 PDF，并同步茉莉花大纲。
outline-ai-restored = 已恢复原大纲，并同步到 PDF。
outline-ai-menu =
    .label = AI 全文大纲识别…
outline-ai-queued = 等待识别
outline-ai-preview = 预览大纲

outline-ai-edit-hint = ↑ ↓ 切换标题 · 拖动排序 · Delete / Backspace 删除 · ← → 调整层级 · 右侧 ↗ 跳转 PDF。停止或完成识别后可编辑，点击“保存”完成。
outline-ai-restart = 重新识别
outline-ai-error-details = 操作失败，请查看黄色铃铛中的详情。

outline-ai-review-title = 请调整并核对以下大纲
outline-ai-review-open = 核对大纲
outline-ai-status-saved = 已保存
outline-ai-status-waiting = 等待识别
outline-ai-status-processing = 识别中
outline-ai-status-paused = 已暂停
outline-ai-status-fail = 识别失败
outline-ai-status-success = 待核对

llm-profile-new = 新接口

outline-ai-exact-tip = 原文匹配：已在 PDF 文字层定位到该标题。
outline-ai-approx-tip = 估计位置：根据页面图片估算，请核对实际位置。

outline-ai-jump = 跳转到 PDF 位置

outline-ai-review-window-title = 茉莉花AI大纲核对
outline-ai-promote = 提升一级
outline-ai-demote = 降低一级

outline-ai-save-outline = 保存
