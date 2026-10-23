# Factory 桌面版中文汉化实施文档

- 日期：2026-10-16；更新：2026-10-23（当前目标 0.205.0；下方旧版内容保留为历史）
- 当前目标版本：Factory Desktop 0.205.0（`C:\Users\11013\AppData\Local\Factory\app-0.205.0`）；保留 0.200.0/0.201.0/0.202.0/0.204.0 固定补丁及产物。
- 状态：**0.205.0 适配、构建、自检、最终17项副本演练、正式应用和定向UI验收完成**；功能资源18046/18046，课程正文471条保留英文。资源覆盖不代表全部界面状态均逐一视觉验收。
- 最新授权：用户要求适配 0.205.0，并明确不推送远程；本轮不执行 push。

## 当前版本（0.205.0）

六项步骤与检查点见 [0.205.0 适配实施计划](设计实施文档/20261023-Factory-0.205.0适配实施计划.md)，使用方式见 [README](../README.md)。单agent执行，沿用204的51编辑/3目标/4新增资源：保留文件侧栏原生Preact订阅、项目备注runtime及Skill浏览器All显示/语言刷新，按实际新版参数迁移。

- 原始exe/asar完整hash、Valid签名、唯一fuse、signed keytar与542个归档条目已核验；独立205清单固定所有输入，未知构建拒绝。Slack缓存移至189–193槽位，自定义模型表单新增providerMode并使用135槽位，保留上游参数/回调/用户值；备注适配新版原生组件及项目身份。
- 原始资源新增193、修改13、删除487，renderer17649叶、desktop81叶；硬编码新增19条自动化准入及内容同步提示，复用现有显示投影，补充资源787叶。总18517、功能18046/18046、课程471叶，缺失/排除/未审查英文均0。旧四版本清单/补丁及十二份构建产物保持本轮HEAD原字节；默认build/selfcheck面向205。
- Skill/Hook及Task工具、模型/厂商/协议名、路径/代码/用户内容沿用既有规则。PR Stack译拉取请求堆叠，Unstack译解除堆叠；架构图Store译状态存储、Contract译接口契约，Hook保留，新增精确上下文保护。新增提供商环境变量示例`${ANTHROPIC_API_KEY}`原样保留。没有把技术标识或用户模型/提供商名称作全局替换。
- 基础自检通过五版本原生文件树生命周期、8项备注模块测试、51唯一补丁及幂等、菜单/表单/统计/诊断/术语原有回归；新增providerMode字段、错误对象与回调保留，以及实际准入原因定义的中英文投影检查。最终17项完整事务演练退出0，证据`work/exercise-SKDMrW/`，真实205 pair/state/备注及旧产物隔离未变。
- 首轮演练的ENOSPC已自动回滚，清理可再生成的work/stage暂存后重试；旧202可执行文件缺失时，仅自检复用原始exe/asar/keytar完整hash匹配、且checkedPristine/Valid签名验证通过的历史演练副本。正式安装器仍需明确home，未知构建拒绝；pristine/backups/state与用户数据未清理，最后重跑全部17项通过。
- 正式205经过dry-run→apply→verify→repeat与restore --check可还原检查；17设置路由、9语言选项、模型空表单/提供商品牌下拉取消和7默认下拉值不变均通过。Skill同一窗口中英往返、备注打开取消、文件树展开/README搜索/只读预览/Ctrl+P重开/同一Shadow host及输入框即时语言切换通过，草稿保留，捕获错误为空且无#321。首个Session首次加载的等待与已打开设置页的定位修正仅为QA工具调整。
- 已普通启动app-0.205.0，无调试参数、9225不监听；新增Process ready、Startup completed、Renderer finished loading和healthy daemon均通过，本次启动未见网络/注册超时。用户备注文件hash不变，普通启动后最终verify通过。

完整证据为`work/v205-*.json`、截图与演练目录，Git忽略。未发送消息、写备注、保存模型/提供商或修改用户文件与认证网络设置；未穷尽原生子菜单、账号权限、远端/Worktree UI与写操作状态，也未强制开启新提供商功能的账号开关。本轮单agent，仅本地提交，不推送。

## 0.204.0 历史版本

七项步骤及检查点见 [0.204.0 适配与 AI 术语复核计划](设计实施文档/20261023-Factory-0.204.0适配与AI术语复核实施计划.md)，安装命令见 [README](../README.md)。本轮单 agent，先保存工作区原有未提交“项目备注名”实现的原字节快照，再以该 49 编辑基线迁移，保留文件侧栏原生 Preact 语言订阅。旧 202 补丁和资源未被新版译文覆盖。

- 原始 exe/asar、外部 keytar、Valid 签名、唯一 fuse 和 541 条归档完整性已核验。204 独立清单固定 renderer/main/preload 三目标、51 项精准编辑和4项新增资源；唯一锚点、幂等、组合语法及一个 fuse 字节修改通过。备注模块沿用原文件，适配新版项目分组身份及原生 UI 组件依赖。
- 新增266条、删除123条原始资源，没有原叶内容更改；renderer17943叶、desktop81叶、补充768叶，共18792。功能18321/18321、课程正文471，缺失/未审核英文/排除均0。desktop输出81+15=96叶。默认构建及自检面向204，旧200/201/202产物保持本轮起始字节。
- Skill/Skills 对应 `SKILL.md`、`/skills` 和可复用能力包，按功能名保留英文，审核102个上下文；Factory生命周期 Hook/Hooks 审核37个上下文，保留其事件配置概念。共132条译文修正，包含一处创建 Skill 对话框的“分叉→派生”。规则在构建和逐键正反例自检中执行，不改代码/路径/插值或用户内容。
- 相似词分语义处理：Subagent→子代理、Agent→代理/智能体、Plugin→插件、Prompt→提示词、Context→上下文、worktree→工作树均为合理中文；Task工具、模型名、协议名保持原文。普通能力含义不套用Skill规则，Git/系统/防病毒注入钩子保留中文，“Hook Droid into…”仍译“接入”。模型计量用token，认证用访问令牌；Session/Spec沿用既有产品词规则。课程英文471叶逐字核对未变。

- 51项最终补丁的17项副本演练退出0，证据为`work/exercise-KsD1LM/`，保留此前全部失败回滚、中断恢复、并发锁、备注保护及旧202完整工具升级场景。真实204经过restore→dry-run→apply→verify→repeat，最后普通启动后再次verify通过；用户备注文件哈希未变。
- 实际UI确认Skill/Skills标题、搜索及筛选；发现新版通用浏览器的硬编码All及显示缓存后，新增两个显示补丁和一条补充翻译。内置“全部 (70) / All (70)”在同一窗口中→英→中即时刷新，选中筛选与数量不变；用户分类名不经过翻译。用户安装的Skill说明原文保留。
- 17个设置路由标题为中文，9种语言自称与已选中文正常；添加模型空白表单与提供商下拉保留品牌名称，取消未保存；7个默认下拉展开前后选中值一致。项目备注对话框打开/取消、原始数据及草稿保持；文件树展开、README搜索/只读预览、Ctrl+P重开、同一Shadow DOM host/input语言即时刷新、侧栏折叠/恢复后重开均通过，无React #321或捕获错误。初次启动尚未ready、用量页异步加载及Shadow DOM定位的等待已修正，未将工具时序失败误判为应用问题。
- 普通启动来自app-0.204.0，无remote-debugging参数、9225不监听；日志Process ready、Startup completed、Renderer finished loading和healthy daemon通过，该启动窗口未见网络/注册超时。未发送用户消息、编辑用户文件、写入备注或改变认证网络配置。

证据为`work/v204-*.json`、截图及两轮副本目录，均Git忽略。原生菜单15个角色经过VM/源码回归；未穷尽原生子菜单、所有账号权限、远端/Worktree UI、上传和写操作状态，未创建新profile。下方旧版内容中的“当前”只指当时的版本，最新结论以本节为准。本轮单agent、本地交付，不推送。

## 0.202.0 历史版本

详细步骤与检查点见 [0.202.0 适配实施计划](设计实施文档/20261020-Factory-0.202.0适配实施计划.md)，安装、还原和更新命令见 [README](../README.md)。本轮单 agent 执行，使用最新修复提交 `5355888` 作为基线，未启动多 agent、未推送远程。

- 原始 exe 签名 Valid，541 个归档条目完整性通过；独立202 manifest固定完整pair、fuse及keytar。仍为39 renderer+5 main精准编辑、2个新增资源，原始锚点/marker唯一，组合语法和幂等通过，exe仅修改一个既定fuse字节。
- 112条新增/4条修改/167条移除，原始renderer17803叶、desktop78叶、补充757叶，总18638；功能资源18167/18167、课程正文471，missing/unreviewed/excluded均0。desktop输出78+15=93叶，保留新版“复制droid安装命令”行为。旧200/201补丁和六份构建产物与本轮HEAD基线字节一致；当前默认build及selfcheck面向202。
- 文件树沿用原生Preact layout effect，不调用React翻译Hook；200/201/202的订阅、独立监听、卸载清理和重挂载检查通过，201/202真实Preact核心/Hook/初始化段生命周期通过。原用户会话目录展开、README搜索/只读预览、关闭后Ctrl+P重开通过；同一Shadow DOM host和搜索节点内中→英→中占位即时刷新，错误捕获为空且无#321，未发送草稿保持原值。左侧导航折叠/恢复后文件树仍正常。
- 构建、业务自检和15项完整副本事务演练通过，真实安装dry-run/apply/verify及重复apply通过，可正常还原。UI定向检查17设置路由、9语言菜单、取消空模型表单及7默认下拉，模型/提供商名称和选项值保持原样。未上传文件、导入Cookie、发送消息、保存模型或编辑用户文件。
- 普通启动进程来自app-0.202.0，无调试参数、9225不监听；Process ready、Startup completed、renderer loaded及healthy daemon记录通过，普通启动后verify通过。本轮普通启动检查点未发现前次记录的远端获取/注册超时。

证据集中于 `work/v202-*.json` 与 `work/exercise-OWmWa9/`，不进入Git。首次document查询未跨Shadow DOM，以及侧栏打开按钮的标签与工具预期不同，均已通过实际DOM修正定位；未把工具定位失败误报成应用崩溃。未穷尽所有原生子菜单、权限组合和远端/上传写操作状态，也未新建profile。

## 0.201.0 历史版本与更新安装

本轮用户明确授权“Factory已更新至0.201.0，请适配拓展，不推送远程”。详细六项计划、固定原始构建哈希、检查点与证据见 [0.201.0 适配实施计划](设计实施文档/20261019-Factory-0.201.0适配实施计划.md)。沿用已批准的 exe 签名失效与关闭嵌入 ASAR 完整性校验方案；不修改 Update.exe、packages、用户凭据或网络配置。

- 新版独立 `patches/0.201.0/` 固定原始 exe/asar、fuse 和 signed keytar；39 条 renderer 与 5 条 main 精准编辑，共 44 条，两个目标、两个新增资源。完整 540 个原始归档条目核验通过。
- 新版原始资源新增 72 条、修改 1 条、移除 56 条；功能界面与下拉资源完整补齐。19 个 renderer namespace 共 17851 叶，原始 desktop 85 叶，patchUi 757 叶，总资源 18693；其中功能资源 18222/18222、课程正文 471 条原文，缺失/未审核英文/排除均 0。模型/提供商名称、Session/Spec、代码、路径、用户文字按既有规则保留。
- 当前 `npm run build` 与 `npm run selfcheck` 针对 0.201.0；活动 `translations/en`、`zh-CN`、scope/policy 对应新版。构建输出 `translations/build/0.201.0/`，包含 renderer ESM、desktop JSON 及 coverage。根 `translations/build/` 三份 0.200.0 固定产物和旧 patchset 字节不变，旧版 apply/verify/restore 继续使用旧产物；默认构建不重新生成旧版资源。
- 构建、完整业务 VM、自检及 15 项事务副本演练通过；真实安装 dry-run→apply→verify 通过，重复 apply 无操作，restore --check 确认可还原。正常启动后再次 verify 通过，临时 9225 调试端口关闭。

真实 UI 定向验收：17 个设置路由均读到中文标题；9 种语言自称保留，English→简体中文切换及 `savedLocale=zh-CN` 保存通过。添加模型空白表单显示中文，提供商下拉保留 Anthropic/OpenAI/AWS Bedrock/OpenRouter/Ollama 品牌及“其他提供商”，随后取消未保存。抽查 7 个默认设置下拉，推理/交互/自主级别等中文，模型名保持原值，展开前后选中值不变。CDP 截图确认设置页、主界面及顶部“文件/编辑/视图/窗口/帮助”为中文；本地 daemon.isAvailable 为 true，输入区与模型按钮可用，未发送消息或上传文件。

验收边界：本轮 UIA 未取得原生子菜单，系统屏幕捕获返回无效句柄；CDP 截图和菜单 VM/源码审查通过，不将其表述为原生子菜单逐项视觉通过。未创建全新 profile，未遍历全部权限、远端服务状态、上传/加入成员的写操作或每个页面的全部下拉状态。现有品牌和服务器动态名称不因含英文而强行翻译。

普通启动确认：实际进程来自 app-0.201.0、无 remote-debugging 参数，日志新增 Process ready、Startup completed、daemon_ready healthy 与 Renderer finished loading。日志另有远端 managed-settings 获取及计算机自动注册超时；本轮未据此修改网络/凭据，也不将其定性为汉化回归或宣称远端注册功能已验收。

支持版本的安装命令（操作前完全退出 Factory，包括托盘）：

```powershell
Set-Location F:\GitHubs\Factory-Expand
npm run build
.\apply.cmd "--home=C:\Users\11013\AppData\Local\Factory\app-0.201.0" --dry-run
.\apply.cmd "--home=C:\Users\11013\AppData\Local\Factory\app-0.201.0"
.\verify.cmd "--home=C:\Users\11013\AppData\Local\Factory\app-0.201.0"
```

已应用后修改译文，使用同一版本目录执行 restore→build→apply→verify；卸载汉化执行 `.\restore.cmd "--home=C:\Users\11013\AppData\Local\Factory\app-0.201.0"`。Factory 后续更新到其他版本时，先正常官方更新，再适配新版本的完整哈希、布局、锚点及资源差异；仅改 `--home`、覆盖旧 exe/asar 或将旧备份还原到新目录均不可行。当前仅明确支持 0.200.0/0.201.0，未知版本或构建继续拒绝。

> 以下 1–5 节及 v8 数字描述 0.200.0 的实施历史；当前版本与结果以本节和 0.201.0 独立实施计划为准。

## 1. 背景与调查结论

### 1.1 用户追加的二次审查与修复（v8，已交付）

用户已要求再次核实翻译合理性、页面/下拉框是否全覆盖、专用名词是否应保留，并修正文档及代码；这是本轮修复授权，沿用可本地提交、禁止推送、正式应用已确认的约束。用户已明确选择“所有功能页面及下拉框，课程正文保留英文”。2026-10-19恢复时按此选择收束：课程导航、标题、按钮、选择项、状态反馈保留中文，lessons.content中的讲解、示例提示词/代码、解释及学习正文恢复原英文，每个保留键及原文写入coverage-policy；不整树排除课程UI，不降低英文源总数。此前主动翻译全部课程正文的checkpoint保留为历史记录，不代表最终交付范围。不能以既有首批scope的100%冒充全应用100%。

初始真实覆盖为10139/17835叶，缺7696（11个namespace完全缺失5202，components尚缺2494）。现有coverage只遍历已有zh文件，未报告整个缺失namespace；原先首批覆盖说明保留为历史记录，不代表全页面完成。

本轮任务（逐项核对和更新）：

1. [x] 只读交叉复审：全量键覆盖/硬编码/课程界面分类，以及settings与其余现有译库的语义、下拉选项、术语。三个独立审查均已返回，确认后才修改。
2. [x] 修复确认的上下文误译，制定可执行术语表及关键键规则；产品/模型/协议/标识保留，通用UI词按上下文翻译，禁止只凭英文原句批量复用。
3. [x] 补齐全部功能资源和所有组件组；课程按钮/标题/选择项必须纳入，讲解正文和示例指令如排除需列出精确键及原因，不整树排除。
4. [x] 修复完整覆盖报告和已确认绕过翻译的显示点（国家选项、时间范围、相对时间、后退/前进tooltip，以及设置提案/导航、诊断提示、自动化原因、就绪度等级、自定义模型表单/错误、文件树/表格辅助标签、统计成就卡片）；纳入主进程desktop菜单/对话框资源，保持原始哈希/marker/状态恢复契约。
5. [x] 构建、语法/插值/标签/术语/覆盖验证及独立review，必要时restore→build→apply更新；区分静态覆盖与逐页展开UI验收，锁屏时不伪报视觉通过，更新最终文档和本地提交。

已确认误译（原英文/当前译文/修复方向）：Commit/承诺用量/提交（Git菜单）；Prem/高级/私有部署（Prem）；Required/必填/强制（组织模型策略徽标）；Updated/更新时间/已更新（批量操作结果）；Focus mode/专注模式/声音播放条件；IP策略中的API key usage/密钥用量/使用密钥发起请求；FSC credits/额度/积分（消耗数）；应用菜单View/查看/视图；Session fork错误中的分叉/派生；Pin图标/固定/图钉；Droid Computer(s)完整产品名跨页面统一保留。

Dedupe Ticket（v8）：意图＝复用现有资源管线纠正语义与覆盖口径，并在构建时约束术语/已知歧义。查询＝现有build_resource/validateText/selfcheck、translations全部源与coverage、原始bundle显示调用点。命中＝tools/{build_resource,selfcheck,extract_en}.mjs、translations/{en,zh-CN,components-scope.json}及现有补丁。决策＝extend现有工具与补丁，new最小术语/覆盖政策JSON（仅数据）、临时翻译与审查产物放work或已忽略.sdd目录；不新增GUI、网络翻译服务或测试框架。新增校验/统计函数仅服务本轮术语、覆盖和受限desktop提取。

Checkpoint v8-2：19项上下文修正与52项完整产品名修正经独立只读复核及主代理复验通过；新增19条精确语义规则和品牌规则，未发现重要问题。复核发现产品名后中英文粘连，已分配逐处补空格。构建验证现能计入整个缺失namespace，拒绝未审查英文、过期/重复例外和已声明保留的代码被修改；selfcheck已通过11条补丁唯一性/幂等、85条desktop提取及覆盖/术语正反例。后续新增译文仍需单独语义复核。

Checkpoint v8-4：11条补丁（原3条+7处renderer显示/缓存修复+desktop加载）均唯一命中，幂等与完整bundle语法通过；desktop85条经独立逐项复核与CJS注入隔离执行验证。manifest固定20个源namespace/17920叶及规范JSON哈希，防止中英文同时漏文件而误报完整；coverage对品牌/技术数据英文保留逐键审查。新增Plotly格式插值校验；4条课程角括号提示词占位符仅按精确英文源列外，仍保持token与富文本结构。成对事务、外部keytar及pristine哈希规则不变。正式构建/演练/部署属于第5项，尚待第3项全部译库补齐。

v8复核追加调整：硬编码二次扫描又确认设置变更提案catalog下拉/placeholder、Slack详情Overview/Chain、本地网络诊断明细、自动化状态原因映射仍绕过资源，第4项重新打开继续修复，最终补丁数量将扩充，不能沿用11条已完成的结论。课程四组lessonPromptAnatomy.keywords初判为不可翻译检测数据，经主代理与独立复核反查HOl/N6e/zOl及官方日文包确认：这是可本地化词表，HOl本就自动并入英文。现已改中文并移除英文保留例外，以原函数验证中英文四项均命中、旧英文词表在中文输入下失败。工程triage统一分流/分类处理，Steward维护代理；认证Droid Essentials/Specialist/Master保留完整名并附中文。analytics2环比以等长上一时段比较、用户合计非人数两项已按调用链修复。

Dedupe Ticket（v8硬编码补充）：意图＝仅在显示层本地化绕过资源的本地静态catalog标签/状态/诊断文案，保持工具schema与选项值原样。查询＝FactoryZhText/patchUi/supplement现有实现（无）、Lbo/h0/lMa/zYc/ghc调用链。命中＝原始renderer中的上述函数、现有build_resource与patches。决策＝extend现有补丁与构建；new最小patchUi英中数据（与20个pristine提取namespace分开固定）、bundle内一个唯一显示helper，复用Rin().t及当前语言，不新增网络服务/依赖/入口。原始20源不改，补充源也按版本固定哈希/叶数并纳入完整覆盖统计。

Checkpoint v8-3：19个renderer namespace共17835/17835叶及desktop85/85叶已补齐；lessons934条含全部777个content叶均已认真翻译，无正文排除、普通英文UI复制或空占位。components-scope扩为全部24组5718叶。首个完整npm run build通过：原始17920条+当前补充patchUi6条=17926/17926，missing/excluded均0，272同值中234个含英文的品牌/代码/标识/格式逐键列入policy，余38为纯符号/数值/插值。课程全部主题的独立语义复核仍列在第5项；硬编码其余投影补丁继续第4项，尚未正式部署v8。

v8译文终审：独立审查已逐组核对analytics498+analytics2 697及lessons934（含全部课程UI/选项/答案/示例授权边界），其余7个新namespace942叶已逐组核对，automations2131及新增components各功能组已重点交叉核对。确认的analytics2等长上一时段/用户用量合计、课程导航Secrets两处统一“设置 › 机密”、认证原名、PR开闭状态、Steward/Wiki/工程分流及产品空格均已修正。未把“没发现问题”表述为未来版本翻译永远无误。

Checkpoint v8-4最终复核（2026-10-19）：最终为2个目标、41条精准编辑、2个新增资源。独立重算18662条（原始17920+补充742），缺失/未审核英文/排除均0；用户指定课程正文471条逐键保留原英文，课程content其余306和非content157保持界面汉化。功能资源18191/18191，不能将其表述为逐页逐状态视觉验收完成。原始20源及补充源pin、生成ESM/desktop JSON逐树一致；基础selfcheck通过锚点/语法/幂等/单字节fuse与实际VM回归（国家/日期/标签页、设置提案用户数据/模型快照、模型表单/辅助标签、诊断PID端口、29成就与时间、课程中英词表）。独立终审无确认Important/Critical，允许进入完整副本与真实安装验收。

真实安装验收追加（2026-10-19）：41条版本已实际restore→apply→verify通过，语言切换及偏好持久化通过。原生弹出菜单实际UIA发现默认role生成的Edit及部分子项仍英语；第4项重新打开。Dedupe Ticket：意图＝仅在中文时本地化Electron自动生成的原生role标签，保持ID/role/accelerator/click/enabled/visible及其他语言原样。查询＝主进程i0/KW/buildFromTemplate、ne/Fi、本地FactoryNativeMenu实现（无）。命中＝两个菜单构建点和现有desktop JSON输出、patchUi源。决策＝extend两个已知构建点，new最小递归显示后处理helper；从patchUi已验证字典选择原生词条合入desktop JSON，不改原始85条en源、不加第三资源/依赖、不重建默认role子菜单。追加UI实际验证及对应回归后再结束。

Checkpoint v8最终交付（2026-10-19）：44条精准编辑及18677条资源构建、自检通过，功能资源18206/18206，显式课程正文英文471条，源缺失/未审核英文/排除均0。最终15项全副本事务演练通过，证据 `work/exercise-Rmllue/results.json`；真实安装实际restore恢复原始签名与fuse后，再apply/verify成功，重复apply报告Already applied且无改动。其他537个归档条目与外部keytar保持不变；2个目标与2个新增资源逐字节/完整性校验通过。原生role追加由独立复核确认无Important，实际原生菜单主项及编辑子项已读出中文，快捷键/启用状态保持；关于窗口的版本说明及目录选择窗口标题中文通过UIA检查，目录选择取消返回canceled=true，未选择目录或保存任何模型/组织设置。接口API依官方MenuItem.label可动态更改的契约：[Electron MenuItem](https://www.electronjs.org/docs/latest/api/menu-item#menuitemlabel)。

真实UI抽查：语言菜单保留9种语言自称；通过English→简体中文及保存偏好zh-CN。访问17个设置路由，16个读到中文标题（用量页仅记录路由访问，不作为内容视觉通过）；添加模型空白表单显示中文说明、技术模型ID/API key示例保持原样，随后取消未保存。原生菜单、编辑子项和新增默认role标签通过实际UIA验证；现有账号正常载入。最终关闭临时9225调试监听，以普通交互方式重启Factory，保持中文。证据包括 `work/v8-ui-pages.json`、`work/v8-language-restored.png`、`work/v8-custom-model-form.png`、原生菜单UIA记录。截图/临时脚本均不进入代码提交。

交付边界：功能资源覆盖不等于每个页面、每个下拉展开状态及权限组合均人工遍历。用户内容、模型/提供商/协议名、命令、代码、未知远端状态、技术诊断detail及原始导出保留原值。未清除用户数据来制造全新profile，历史清单的首次全新profile项仍未声称通过；原生系统文件选择器内部全部控件也未逐一视觉检查。以上验证边界不掩盖为翻译缺键或全状态已验收。

普通重启连接验收补充：最后普通重启曾显示本地计算机连接失败；同时主日志267–274行已报告daemon Process ready及Startup completed，295行另有whoami区域识别失败/TLS线索。未改汉化pair，再次普通重启后恢复绿色本地连接、模型选择及输入控件；安装pair仍匹配44条应用记录，9225监听为0。根因尚未确认，不能把TLS警告定为已证实根因，也不将本次波动隐瞒为全程无异常。详见Bug诊断报告/20261019-Factory本地连接排查计划与结果.md。

Dedupe Ticket（连接诊断）：意图＝记录本轮真实启动验收出现的瞬时连接故障与恢复证据。查询＝doc目录已有报告、desktop-droid日志健康/失败事件；命中＝本实施文档及实际日志267/274/295/400/403行；决策＝new独立诊断记录，以仓库日期前缀命名并按doc-organizer的排查计划规则直接归档Bug诊断报告，不移动用户明确指定的本实施文件，不改认证数据、网络配置或业务代码。

术语方向：Factory、Factory Desktop、Droid、Droid Core、Droid Shield、Droid Computer(s)、Software Factory、OpenCompute、模型/厂商名、MCP/API/CLI/协议、AGENTS.md、URL/路径/命令原样保留；Session/Spec沿用已批准产品术语。通用词如提交/视图/图钉/声音播放条件不强行改英文；token计量与认证令牌、credit积分与额度/抵扣需按上下文区分。

原调查记录语言下拉仅8种语言、无中文；实施实测0.200.0的实际入口为 Settings → General → Preferences → Language（“设置→通用→偏好设置→语言”），并非最初记录的Appearance路径。

对 app.asar（60MB）静态分析的关键事实：

| 事实 | 证据 |
|------|------|
| UI 语言列表硬编码 8 种（en/ja/ko/de/es/it/pl/fr），无 zh-CN | 主 bundle `index-CCcgJ39D.js` |
| 语言枚举与显示名映射已含 `zh-CN`/"简体中文"，locale 归一化 zh/zh-tw/zh-hans→zh-CN 已存在 | 同上 |
| 桌面语言偏好由 `Ven → electronAPI.i18n.setLocale → i18n:setLocale → DesktopSettingsService` 保存；localStorage 仅为无桌面桥接时的后备路径 | renderer `Ven/r0d`、`preload.js`、`initLifecycle-C1amcziW.js` |
| 主进程 `pte → fte → y3` 也限制 8 种语言；只改 renderer 会报 `Unsupported app locale`。底层 `GeneralSettingsSchema.locale` 接受可选字符串，无需修改 | `initLifecycle-C1amcziW.js` 与 `index-Cv2K2qOn.js` |
| 翻译资源 = 7 个懒加载模块 `resources-*.js`，加载器映射 `wSu` 按语言动态 import | 同上 |
| i18next init 静态核验：`fallbackLng:"en"`、`supportedLngs:[...语言列表,伪语言]`、`defaultNS:"common"`；切换时 `(await wSu[lang]()).resources` → `addResourceBundle` | 同上（`Rin()`/`ISu()` 函数）；实际 UI 切换仍待实施验收 |
| **exe 开启 asar 完整性校验**（fuse `EnableEmbeddedAsarIntegrityValidation=enabled`） | REA `inspect_electron_fuses` |
| UI 文本规模：约 17,436 条 / 32.5 万字符（2,661 处 `{{插值}}`、406 条长文本） | 日语包结构解析统计 |
| 主进程 `desktop` 命名空间（菜单、右键菜单、退出确认、更新、认证、文件对话框等）8 语无中文；`Fi` 以 `fallbackLng:"en"` 初始化、未设 supportedLngs，切到 zh-CN 时回退英文，v7历史未翻译；v8新增85条desktop资源 | `initLifecycle-C1amcziW.js`（`eC`/`Fi.init`） |

**输入基线**：本轮直接读取安装目录原始 asar 的 header 与条目，数据起点为 `8 + header[4:8]`（uint32 LE），不能误用 `16 + JSON长度` 忽略 padding。现有 `work/extracted-0.200.0` 中 package.json、renderer 和 initLifecycle 均有头部截断，不得作为提取或补丁输入。后续通过复用的 `openAsar/readEntry` 读取，并逐条核验 header 的 size/hash。统计数字仅为原调查估算，以重新提取结果为准。

本轮本地基线完整 SHA256（仅标识本机构建，不代表官方来源认证；采集 pristine 前还需校验 exe 签名和包内 integrity）：

- asar：`07ac482d497a280c1af6d8f153a8fc1ea4bb9a08c3377a5ce65f6888423c7ace`
- exe：`fd6f8791784a987f445043c2e36936280e704e1f9060aea4749c44086840758d`

> 以下第2–3节保留首批实施历史；与v8冲突处以1.1节为准。v8最终为19个原始renderer命名空间17835叶、原始desktop85叶、patchUi补充757叶，共18677叶；其中471条课程正文保留英文，功能资源18206条。desktop输出为原85叶加15个共享原生role词条，不导出为renderer的desktop命名空间。最终2目标/44编辑/2新增资源，仍使用成对事务与restore→build→apply。

## 2. 方案：复用 zcode-expand 补丁管线

`D:\绿色版\zcode-expand` 是一套已验证的 Electron asar 补丁机制（ZCode Desktop 3.11.2→3.15.3 共 10 个版本的适配史），本项目**直接复用其架构**，在 `F:\GitHubs\Factory-Expand` 下建 Factory 版：

### 2.1 从 zcode-expand 复用的部分（经 10 个版本验证）

| 组件 | 作用 |
|------|------|
| `scripts/lib/patch.mjs` 补丁引擎 | 复用锚点计数与 marker 幂等；依赖同目录 env.mjs，需要适配；逐条字节自检在 asar.mjs 中 |
| `scripts/lib/asar.mjs` asar 读写（自研无依赖） | 保留 unpacked 元数据；现有 selfCheck 跳过 unpacked 和新增文件完整性检查，Factory 验证需补查新增内容/hash、unpacked 元数据及外部文件保持不变，不能据此宣称 keytar 已验证 |
| `scripts/lib/syntaxcheck.mjs` 语法门禁 | 原样复用：现有实现为 ESM 优先、失败回退 CJS，已覆盖 renderer/新增资源（ESM）与主进程（CJS）；安装目录写入前完成 |
| restore 的 pristine 机制 | 首次从干净安装采集原始文件作还原基准；还原即回原始状态 |

动作保留 **apply / restore / verify 三个**，不移植独立 rollback CLI；restore 恢复原厂 pristine，不等价于任意 apply 前状态。失败恢复能力仍必须保留。源 restore 依赖 ZCode 专用 `out/metadata/build-meta.json`，不能直接复制；Factory 从 asar 的 `package.json.version` 读取版本，以完整 exe/asar SHA256 对识别构建。源 verify 的退出码 0 也可能表示“待应用”，不能直接当作汉化成功。

### 2.2 对 Factory 的三点适配（差异所在）

**适配 1：fuse 完整性校验处理（新增，zcode-expand 没有此步——ZCode 未开校验，Factory 开了）**

- `apply` 时：在 exe 暂存副本内搜索唯一 Electron fuse sentinel（0.200.0 实测偏移 188907648）；校验其后 wire version=1、长度=9、索引 4 原值为 `0x31`，修改 `sentinel起点 + 32 + 2 + 4` 为 `0x30`。除该字节外必须与 pristine 完全一致；未知布局或值立即拒绝。不得先原地修改已安装 exe。
- `restore` 时：从 pristine 成对还原 exe + asar
- 只实现本版本的受限字节修改，不引入 `@electron/fuses` 等依赖；上述布局检查与单字节修改放在 `scripts/lib/fuses.mjs`，REA 仅为可选诊断，不作为运行依赖。

**适配 2：安装定位改 Squirrel 布局（zcode-expand 是 electron-builder 布局）**

- 首版命令显式指定 `--home=C:\Users\11013\AppData\Local\Factory\app-0.200.0`；校验 exe/asar 均存在、包内版本为 0.200.0、构建哈希匹配。不以“最大 app-* 目录”猜测启动目标，不自动回退旧版本。移植 env.mjs 时删除 `ZCODE_HOME`/默认路径探测、快捷方式扫描和 `writeInstallDirMemo` 记忆写入（源实现即使显式 `--home` 也会写记忆，违背只读命令契约），只保留参数解析、`--home` 校验与进程检测（改为匹配 `factory-desktop.exe`）。exe 目标是版本目录内本体 `factory-desktop.exe`（asar 为 `resources\app.asar`），不是根目录同名 Squirrel stub。
- apply/restore 写入前检测目标 Factory 完全退出（含托盘），无法判断进程路径即拒绝；替换前重验源哈希以防更新竞态。

**适配 3：补丁集内容 = 汉化（zcode-expand 是功能注入）**

```
patches/0.200.0/
├── manifest.json          # appVersion + 原始 asar/exe 完整 SHA256 + fuse 布局
└── patches.json
    ├── addFiles: [ { from: "translations/build/resources-zh-CN.js",
                      to:   ".vite/renderer/main_window/assets/resources-zh-CN.js" } ]
    └── targets:
        ① 主 bundle 语言列表（minified 枚举名以实测为准，0.200.0 实测为 qu/GXe）：
           find  = `[qu.English,qu.Japanese,qu.Korean,qu.German,qu.Spanish,qu.Italian,qu.Polish,qu.French]`
           replace = 同文但尾部 `,qu.ChineseSimplified]`（expect=1；该 8 项序列为 UI 列表独有，
           另一个含 zh-CN 的 5 项列表 gao 排列不同，不会误命中）
        ② 主 bundle 加载器：
           find  = `[qu.French]:async()=>await Bt(()=>import("./resources-9trfPLHd.js"),[],import.meta.url)`
           replace = 同文 + `,[qu.ChineseSimplified]:async()=>await Bt(()=>import("./resources-zh-CN.js"),[],import.meta.url)`
           （Bt 为 Vite preload 包装，空依赖数组时等于纯动态 import；相对路径基于 import.meta.url
           解析到同目录 assets/，与官方资源包一致）
        ③ 必做：.vite/build/initLifecycle-C1amcziW.js 的主进程支持列表
           find = `[Se.English,Se.Japanese,Se.Korean,Se.German,Se.Spanish,Se.Italian,Se.Polish,Se.French]`
           replace = 同文但尾部 `,Se.ChineseSimplified]`（expect=1）
           使 IPC 的 fte/pte 接受中文，同时 hte 解析中文；主进程 desktop 资源不新增，依 `Fi` 的 fallbackLng 回退英文。
```

以上三条编辑均设置独立 marker（取各自完整 replace 文本），不得共用一个全局 marker；加载器锚点也必须 expect=1。patches.json 使用现有 `appVersion/addFiles/targets[{file,edits:[{find,replace,expect,marker}]}]` 结构。重复 apply 仅在成对哈希、三条 marker、资源字节均与记录一致时无操作；部分就位或外部修改拒绝继续。新翻译包内容变化采用 restore → build → apply，不直接覆盖旧资源。

完成 renderer 与主进程两份列表修改后，复用设置页标签（mfc）、偏好读取/IPC 保存、系统 locale 匹配和 i18next `supportedLngs`。不修改 preload、底层设置 schema、CLI 或其他语言枚举。

**resources-zh-CN.js 设计**：自包含 ESM 模块（`export const resources = { common:{...}, …, components:{...} }`），不 import 主 bundle；按 `CSu` 规则仅清洗 namespace 文件名，保留内部嵌套键。静态源码确认消费 `.resources`，逐 namespace 调用 `addResourceBundle`；`common` 必须存在。真实 Electron 模块加载、CSP 与回退行为仍须实际启动验收。

### 2.3 翻译资源维护

```
translations/
├── en/<namespace>.json       # 从英文源提取的资源树（提取工具的产物，用于翻译与对齐）
├── zh-CN/<namespace>.json    # 中文翻译源库（跨版本复用）
└── build/                    # 构建产物（resources-zh-CN.js 由脚本从源库生成）
tools/
├── extract_en.mjs            # 仅支持已核验的 0.200.0，复用 asar 读取 → en/<ns>.json
└── build_resource.mjs        # JSON → ESM，含键/类型/插值/标签校验，沿用 Node 不另加 Python 运行依赖
```

（版本适配阶段如需增量翻译，再增加 diff 工具，首期不做。）

**英文资源提取仍需先做可行性验证**。先复用 asar 读取，仅对 0.200.0 的 `D8t=CSu({...Object.assign(...),components:SSu})` 资源依赖范围提取；当前源码包含逗号连续声明和多层变量引用，不能仅匹配 `const NAME=`。先检查本地现有提取工具/解析器，记录 Dedupe Ticket 后决定复用或最小受限解析；不构建“任意版本 JS 解析器”，不执行整个 bundle 或以 eval 处理任意代码。若需受限解析，必须识别字符串/转义/注释边界，并对对象、数组、字面量、标识符引用的实际语法建立样例检查；未解析引用、循环、重复键或不支持表达式立即失败。验证完整 19 个 namespace（18 个 JSON namespace + components），输出叶子数量、抽查 common/settings/components 的英文值，并对照官方语言包结构解释差异。失败即停，不先搭完整管线或批量翻译；替代方案另行修订计划。

翻译规则：逐叶校验 key 存在、类型一致、插值 token 的名称/格式/出现次数一致，保留富文本标签名称、配对/嵌套和自闭合结构（允许语言需要的同级重排）；仅比较标记数量不够。拒绝未知键和非预期类型，保留复数/上下文键、URL、代码片段。术语 Droid、Factory、MCP、Session、Spec、AGENTS.md、GitHub 保留英文。首批含 common、settings、sessions、softwareFactory、inbox、onboarding、errors，以及 components 中实际用于设置/会话/MCP 面板的键；按页面引用核定范围，不承诺全部 components 已翻译。未翻译键或 namespace 留空缺省，复用英文 fallback，记录覆盖率并在 UI 验证不显示裸 key。课程长文本为后续范围，本期不自动扩展。

### 2.4 状态与失败恢复（必须实现的最小契约）

- pristine 按版本及构建哈希隔离，采集需同时满足完整基线哈希、原始锚点、无中文注入、fuse 原值、有效 exe 签名（`Get-AuthenticodeSignature` 为 Valid，本机原版已核验）；首次复制 exe/asar 后校验 hash，最后写清单。已存在基线不得覆盖。空 targets 不可作为干净证据。
- `restore --check`、`verify` 只读且不自举写清单；`apply --dry-run` 仅在 work 暂存构建产物，安装目录、pristine 和应用状态不变。无 pristine 时，dry-run 从通过完整基线核验的当前原始文件读取构建；有 pristine 时先验证其哈希。实际 apply 在第一次写入安装目录前采集并校验 pristine。`restore --check` 明确区分“干净、可采集”“已应用、可还原”“已还原”和“异常”，已有 pristine 缺清单时拒绝自动登记。
- apply 从已验证 pristine 构建暂存 exe/asar；完成语法、资源、条目完整性检查后，保存并校验本次操作前的成对文件和 applied 记录（含原本不存在的状态），记录含规范化目标路径、前后哈希和备份路径的 pending 状态，再逐个替换并读回校验，成功后写 applied 状态并清除 pending。两个文件无法跨文件原子替换：捕获到失败或下次写操作发现 pending 时，恢复操作前的两个文件及 applied 记录，校验成功后才清除 pending，并退出本次命令，重新执行才能开始新操作。即使两个文件已替换完、applied 已写入，只要 pending 仍在，也执行该一致的恢复规则。只读命令及 dry-run 只报告 pending 并非零退出，不自动恢复。状态 JSON 以同目录临时文件写完关闭后 rename 发布；pending 发布成功前禁止替换安装文件。
- restore 同样暂存并校验两个文件、记录 pending，失败恢复操作前状态；恢复 pristine 成功后校验两份原始哈希与 fuse，清除 applied。恢复来源验证通过且目标路径/版本一致时允许修复已记录的半完成状态。异常来源/路径变化拒绝覆盖；恢复失败保留备份和 pending 并报告具体恢复路径。
- state/backups/锁按规范化安装路径隔离，避免副本演练污染真实安装记录；pristine 可按相同构建共享但只读复用。写操作先取得该目标的独占锁，再检查 pending；锁记录进程身份，进程仍活着或无法确认时拒绝，不凭超时删除锁。崩溃遗留锁仅在确认原进程已退出后清理并重新原子获取。恢复前同时检查应用已退出、备份哈希及目标当前内容属于 pending 记录的前/后状态；遇到更新器或第三方写入的未知内容不自动覆盖。
- verify 只有在两个已安装文件完整哈希与应用记录一致、三条补丁 marker 和新增资源内容匹配、fuse 为预期值时报告“已应用”并退出 0；未应用/部分应用/源资源变化/哈希不符均非零，分别说明状态。恢复后的健康状态由 `restore --check` 确认，不混用“已应用”结论。

## 3. 实施顺序

执行跟踪：1–4 完成；5 正式应用、核心UI、restore/reapply成功，仅原生菜单/对话框视觉检查待Windows解锁。当前会话无 TodoWrite 工具，以本清单及逐项记录跟踪。实际方案小幅调整共3次：keytar打包后签名核验；语言入口路径校正；共享会话导航补222键。其余为实施审查修复。

Dedupe Ticket（第 1 项）：意图＝正确读取原始 asar 并提取限定版本英文资源。查询＝现有 extract/parser/resource 文件、work 中解析工具、资源声明起止与引用。命中＝zcode-expand/scripts/{extract.mjs,lib/asar.mjs,lib/patch.mjs,lib/syntaxcheck.mjs}。决策＝reuse asar，new 受限数据解析/提取工具；现有 extract 不解析资源。解析器内词法、字面量、引用解析和入口函数共同服务此单一目的。package.json/.gitignore/LICENSE 为执行及复用所必需。

执行调整 1（第 1 项基线核查）：keytar.node 在打包后被 Authenticode 签名，实际长度 718048，索引长度 707584；证书表从 707584 开始、长 10464，签名 Valid。移除证书表并清零 PE checksum/security directory 后 SHA256 精确等于 header 的 `90e35de8…f3c831`，非未知损坏。验证按此受限布局核对索引；同时钉住实际已签名外部文件完整 SHA256 `e6ac229a5ffe2959e10f3d8f8b210bcc6abecf511060db2fa0362d79f4e25e1b`，后续副本及正式安装检查字节保持不变，不改写它。其余所有 packed 条目仍逐条校验 size/hash/blocks。

Dedupe Ticket（自检）：意图＝在一个无框架脚本内验证资源拒绝样例及安装失败状态；查询＝source 中 selfcheck/test、解析器导出、计划指定失败窗口。命中＝tools/extract_en.mjs（可复用导出）、zcode-expand 的语法门禁；没有覆盖本计划契约的自检。决策＝new tools/selfcheck.mjs，后续原地扩展，内联叶子统计/子进程运行等回调只服务该验证。

Dedupe Ticket（第 2 项）：意图＝受限构建汉化补丁并提供成对安装、验证、原厂恢复。查询＝源 apply/restore/env 的导出及 pristine/pending/lock，patch 的加载与锚点函数，asar 的 selfCheck。命中＝zcode-expand/scripts/{apply,restore,verify}.mjs 及 lib/{env,patch,asar,syntaxcheck}.mjs。决策＝reuse patch/syntaxcheck；extend asar 的新文件与 unpacked 检查；new 受限 fuses；env 复用接口思想、删定位探测并实现本计划规定的路径隔离/锁/事务；三个入口复用其库接口但不移植 ZCode 元数据依赖。env 新函数分别覆盖参数/上下文、哈希与基线、只读检查、原子状态、锁、成对事务及恢复，不新增通用框架。补丁 JSON、cmd 仅实现既定接口。

第 2 项审查修复：独立 reviewer 两次确认陈旧锁无条件删除的竞争，以及第二个目标被更新器修改后仍可能覆盖。改用每目标 Windows 命名 mutex 串行化整个写操作与陈旧锁接管（PowerShell 父进程持有，Node 子进程执行；内核负责崩溃释放），文件锁释放核对拥有权；每个目标替换及恢复前重新核验该目标哈希。该补充服务原有互斥/更新竞态要求，不新增 CLI 动作。

Dedupe Ticket（第 3 项）：意图＝首批中文源库及可验证 ESM。查询＝translations 下中文/构建产物、源资源校验导出、主 bundle 对 settings/chat/connectors/coreUi/common/app/user 的文本引用。命中＝translations/en、extract_en.mjs 的统计/解析器、syntaxcheck.mjs，无现有中文源或 build 工具。决策＝new 指定中文 JSON、目标 components 键清单和 build_resource.mjs；reuse 语法门禁。构建器中的递归叶子/插值多重集/富文本树校验函数仅覆盖本任务。独立翻译委派按 subagent-driven-development 执行，过程 brief/report/ledger 放 git 忽略的 .superpowers/sdd；原计划编号格式不被 skill 的 Task 标题提取器支持，已运行失败并手写等价 brief，不改变范围。

第 3 项分工与审查记录：单个实施子代理负责 common/settings/components 的正式 JSON；主代理负责 sessions/softwareFactory/inbox/onboarding/errors 及 components 尾部 475 条译文暂存，按文件或固定索引分工，最终 components 由同一代理汇总。复用英文原句字典减少重复，未使用外部翻译服务。构建器及 components 3002 键清单已独立审查通过；common/sessions/三个小 namespace/softwareFactory 和 components 尾部已做中英对照审查，修正两处 Git stash（明确储藏而非 git add 暂存）及一处每个 PR 必须批准的译法。所有这些修复均已核对英文并再次复核。

Dedupe Ticket（第 4 项）：意图＝在一个最小自检脚本内执行隔离安装的状态失败路径。查询＝现有selfcheck、env事务/状态导出、计划三种中断窗口。命中＝tools/selfcheck.mjs 和 scripts/lib/env.mjs 已有导出。决策＝extend selfcheck（快照/CLI子进程/受控状态构造/并发验证回调），不新增框架或正式故障注入入口；临时记录仅在work/backups/state。运行时核查另确认 Windows 自带powershell.exe在重置子进程PSModulePath后签名/CIM均可用，env改为直接使用系统路径并固定UTF-8输出，不要求安装PowerShell7。

Dedupe Ticket（第 5 项验收辅助）：意图＝用真实应用的UIAutomation树操作设置并保存窗口截图证据。查询＝可用glance/ground/detect命令、UIAutomation程序集、Factory主窗口句柄/进程。命中＝vision-tools技能及系统UIAutomation；仓库无桌面辅助脚本。决策＝new 临时 `work/factory-ui.ps1`（仅验收，不进入产品代码/提交），使用系统窗口截图与Invoke/Selection/Expand等标准UI模式，优先精确树定位，不读认证密钥或修改用户数据文件。

第5项实测修订：真实语言入口为“设置→通用→偏好设置→语言”（非原文Appearance路径），9个选项含简体中文，English↔中文切换已成功且无Unsupported提示。发现共用导航的layout Session列表键未列入原3002目标，导致核心会话页左栏仍为英文；将 `components.layout` 内sessionListV2系列/sessionManager/sessionsTable/windowSidebar共222键纳入本期实际页面范围（小幅范围校正，不翻译其余layout）。另修正 `chat.pageHeader.applicationMenu.window` 的上下文译法为“窗口”，不能复用统计里的“时间范围”。新增目标键/译文前已查询en.components.layout、截图及bundle引用；决策extend现有components源及scope，不新建产品模块。后续必须restore→build→apply更新，不原地覆盖旧资源。

验收诊断Dedupe Ticket：意图＝读取当前原版Electron页面的DOM就绪/错误状态以区分空白UI原因；查询＝现有UIA脚本、browser-act core会话能力及现有连接、原版日志。命中＝work/factory-ui.ps1可抓图但DOM不可见；browser-act现有会话均非Factory，不操作其它浏览器。决策＝new 仅验收用work/factory-cdp.mjs，连接当前Factory临时127.0.0.1:9225端口（结束后正常重启移除此端口）；仅读取页面及指定i18n状态，不读认证令牌或导出cookie。原版zh偏好回退源码经独立review确认正确，空白UI原因未定，不先修改恢复语义。

第 4 项首次演练：dry-run只读、真实第二文件替换失败恢复、正常apply/重复apply、半完成pair的restore均通过。损坏基线测试错误指向共享pristine；reviewer确认后已改为work内独立工具fixture（复用同一scripts/tools/patches/translations，独立REPO_ROOT/pristine/state）。首次写入由原文件只读属性拒绝，未成功破坏共享基线；原始哈希需在重跑前复核。该修复纠正自检隔离，不变更正式安装语义。

第 4 项第二次演练：前五场景及fixture损坏拒绝通过，进入pending构造时发现copyFile继承readonly属性。根因经主代理及reviewer复核：restore从只读pristine复制会使新安装文件也只读。修复仅把新临时文件chmod为可写，绝不清除现有目标readonly，保持真实第二文件故障有效；自检手工构造状态时只清除work副本目标的readonly。共享pristine及真实安装完整pair哈希均已复核原始正确，未修改共享基线。

以下命令为待实现接口，并非仓库已具备功能。安装操作命令显式传入上述 `--home`；提取工具传入 asar 路径，构建工具从仓库 JSON 读取。使用 Node.js >=18（与复用库要求一致），先检查本机运行时可用。仅在用户批准实施后执行：

1. [x] 先完成正确 asar 读取、基线核验及英文提取可行性验证（2.3），失败即停。→ 验证：19 个 namespace、叶子统计、实际英文抽样和不支持语法拒绝样例。
   - 命令：`node tools/extract_en.mjs --asar=C:/Users/11013/AppData/Local/Factory/app-0.200.0/resources/app.asar`、`node tools/selfcheck.mjs`、`node --check tools/extract_en.mjs` / `scripts/lib/asar.mjs`。
   - 结果：全部 packed 条目及签名归一化后的 keytar 索引完整性通过，19 namespace、17835 叶子（common 380/settings 3635/components 5718）。官方日语包 17544，日语所有键均在英文内，共有键类型一致；英文多 291 条，包含英文 `_one` 复数键，按英文保留，不以日语包删减英文源。英文抽样包括 Contact Us、Settings、Open settings。解析器 11 个拒绝样例通过，支持字符串/转义/注释/数组/字面量/多层引用，无 eval。
   - Checkpoint：复读解析器及剩余任务，资源入口/消费方式符合目标，英文提取门禁通过。唯一调整为已解释并验证的打包后 keytar 签名；后续增加实际签名文件完整哈希不变检查，无其他遗留。
2. [x] 最小移植三库与必要 env，适配 fuse、apply/restore/verify、3 个 cmd 入口；制作非空的 0.200.0 manifest/三条补丁。→ 验证：每个锚点唯一、独立 marker、完整构建哈希、pristine/pending 契约可执行。
   - 已复用三库、MIT 许可证；新建受限 env/fuses、三个 CLI/cmd、完整 manifest 与三条唯一编辑。pristine/pending/applied 成对恢复、原子状态、目标隔离和互斥均有实现；完整故障演练依第 4 项进行。
   - 命令：`node tools/selfcheck.mjs`（三锚点各 1、独立 marker、重复编辑无操作、两份 JS 语法通过、exe 恰好单字节变化）；所有 scripts/tools 的 `node --check` 通过；缺省/相对/重复 home 拒绝；`restore --check` 返回“干净、可采集”；`verify` 未应用返回 1。
   - Checkpoint：独立 reviewer 确认两项竞争缺陷后修复，再两轮限定复核通过。使用 Global mutex；复制临时文件完成后、真正 rename 前核验目标哈希；pending 恢复同时恢复 applied。没有安装文件变化，真实目标仅执行过原始状态 restore 空操作及只读检查（空操作只临时创建/释放目标锁）。后续仍需中文资源与副本演练，无范围变更。
3. [x] 首批翻译并 build。→ 验证：资源结构、插值名称/次数、标签结构、未知键拒绝；common 和目标页面实际 components 键覆盖。
   - 中文源库：common 380/380、settings 3635/3635、sessions 774/774、softwareFactory 1909/1909、inbox 55/55、onboarding 151/151、errors 11/11；components 本期 3002/3002（全库5718），合计9917叶。目标键及bundle引用证据见 `translations/components-scope.json`，不承诺其它2716个components键已译。
   - 命令：`node tools/build_resource.mjs`、`node tools/selfcheck.mjs`、直接 ESM import 生成模块。全部通过；`translations/build/coverage.json` 保存覆盖率，输出自包含 `resources` 模块。12个资源拒绝样例通过，包括重复插值次数、格式、标签嵌套、自闭合、未知键、null、空串、URL及代码改变。
   - Checkpoint：独立审查后修复两处stash、一处每PR必须批准、设置变更卡Before/After应为“更改前/更改后”（不改日期筛选）。保留原文条目均逐项核对为品牌/代码/URL/纯插值等合理项，没有普通英文整句占位。结构及高风险语义符合目标；未译namespace/键依既有英文fallback，实际UI待第5项。后续接口路径无变化，无新增计划调整。
4. [x] 在独立安装副本演练 dry-run、apply 两次、restore、损坏基线拒绝、替换第二个文件失败及 pending 恢复（第二个文件失败用外部条件制造，如对副本内第二个目标设只读或独占占用；中断后 pending 由自检脚本构造状态记录模拟；不向正式脚本加故障注入参数）。→ 验证：成对哈希一致；dry-run 不写安装目录；新翻译包按 restore → build → apply 更新；生成 JS 全部通过语法门禁。
   - 最终命令：`node tools/selfcheck.mjs --exercise` 退出0，14场景全部通过；独立完整版本副本（含keytar）为 `work/exercise-5iAg0e/app-0.200.0`，结果 `work/exercise-5iAg0e/results.json`。副本未启动；没有复用用户数据。
   - 通过：无pristine的首次dry-run（第一次演练）及已有pristine的dry-run均不改安装/基线/state；实际readonly第二文件在exe已替换后失败并成功回原pair及applied缺省状态；正常apply/verify及重复apply字节、mtime、记录不变；只改exe拒绝并可restore；损坏fixture基线/未知构建拒绝；apply与restore双向各3个pending中断窗口均恢复前pair和applied记录，3个只读命令不自动恢复；资源字节变化拒绝原地更新，restore→build→apply成功；live锁拒绝及并发stale接管串行化；真实路径与副本state隔离。
   - 额外通过：三个cmd入口在同一副本执行apply→verify→restore，均退出0，verify明确报告已应用，restore还原完整原始pair/fuse enabled/Valid签名；cmd未应用时正确转发退出1。每次重建自检537个未修改条目、3个修改/新增条目及3份JS语法，unpacked元数据/外部keytar不变。
   - 最终构建：`npm run build`、11个scripts/tools源码 `node --check`、`git diff --check` 全通过。最终整体独立review未发现Critical/Important；报告位于忽略的 `.superpowers/sdd/20261016-factory-desktop-i18n-zh/final-review.md`。
   - Checkpoint：审查修复损坏测试必须使用独立工具fixture、readonly pristine不能把属性传播到新目标；实际故障和六个pending窗口均通过后才勾选本项。共享pristine及真实安装pair保持原始完整哈希；正式apply及认证/语言切换/持久化等UI结论仍未验证。后续仅剩第5项，不能以这些静态和文件验证替代UI验收。
5. [ ] 准备可审阅产物及演练结果后，正式 apply 前请用户确认关闭完整性校验的代价；执行实际 UI 验收与一次 restore/reapply。→ 验证：下面所有本期项目通过；失败保留诊断并恢复。
   - 用户已明确确认“同意，继续正式 apply 和验收”，接受签名失效、关闭asar校验和更新后重新适配。真实目录 `apply.cmd --home=C:/Users/11013/AppData/Local/Factory/app-0.200.0` 已成功，`verify.cmd` 明确报告已应用；开始真实应用启动验收，不制造首次启动条件。
   - 已验证：9项语言列表含简体中文；English→中文真实下拉切换，无Unsupported或保存错误；原有日语实际加载后再切回中文；真实重启后 `document.lang=zh-CN`、IPC `savedLocale=zh-CN/systemLanguages=[zh-Hans-CN]`；第二个独立Session窗口也读到中文。未清空/伪造用户profile，不额外宣称全新profile测试。
   - 已验证：General/Appearance/Session侧栏及工具栏、MCP面板中文；日期、数量、配额插值正常；未翻译Automations正文自然回退英文，无裸key。首次UI漏译补222个共享导航键及Window上下文后，最终components3224/3224目标键、总计10139叶。新增部分及措辞修复均review通过，最终build与正式verify通过。
   - 已验证：现有登录保持，认证后的用量数据成功加载；未读出认证令牌或直接编辑用户配置文件。MCP共5个：4个可查看工具，Itsm Manager返回“Failed to connect to MCP server”；未改其配置或尝试重新认证，该外部连接状态不伪报通过。用量页少数后端/硬编码英文（如days/Standard Usage提示）保留，不扩展三条补丁范围。
   - 已验证：真实restore还原两个完整原始hash、fuse enabled及Valid签名，原版正常加载为英文；保留的中文偏好未被删除，再apply后自然读取中文。先前OS截图空白/黑屏经确认受当前会话LogonUI锁屏影响，原版CDP `ready=complete/lang=en/root=2`及截图证明回退正常；没有据此错误修改恢复语义。真实重复apply报告Already applied无修改。
   - 截图证据（均work忽略）：`language-options.png`、`switched-english.png`、`switched-chinese.png`、`restored-original-renderer.png`、`chinese-final-sidebar.png`、`second-window-chinese.png`、`mcp-panel-chinese.png`、`automations-fallback-loaded.png`、`authenticated-usage-chinese.png`、`appearance-chinese.png`。
   - 未完成：Windows当前会话锁屏（LogonUI同会话，OS抓图黑屏），原生菜单和目录对话框的英文回退尚未获得可靠视觉证据；已有源码fallback核验不替代此项UI验收。已向用户请求解锁或选择保留当前状态、余项人工验收，因此本顶层项保持未勾选。临时调试端口在结束前关闭，以普通方式重启保留中文。

涉及文件限定为 `scripts/lib/{asar,patch,syntaxcheck,env,fuses}.mjs`、`scripts/{apply,restore,verify}.mjs`、三个 `.cmd`、`tools/{extract_en,build_resource}.mjs`、本版本补丁 JSON、翻译 JSON/生成资源，以及必要 `package.json`、`.gitignore`、复用代码许可证和一个最小自检脚本（覆盖状态失败路径与资源拒绝样例，不加测试框架）。保留 MIT 版权声明。`.gitignore` 排除 work/pristine/backups/state/安装包及 dry-run 产物，避免当前未跟踪的 work 进入提交。不修改复用来源目录，不添加 GUI、自动更新适配、通用解析器、课程翻译或主进程 desktop 译文。

### 3.1 交给 GPT‑6.1 Sol 的执行约定

**结论边界**：本计划可作为 GPT‑6.1 Sol 的分步执行任务；这是对任务输入、步骤和验收明确程度的判断，不是模型成功率承诺，也不是已由该模型完成实施。第 1 步仍为可行性门禁，失败不得跳过或自行缩小翻译范围来宣告完成。

- 在 `F:\GitHubs\Factory-Expand` 执行，先读取项目规则及本文件；新增文件/函数前按规则记录 Dedupe Ticket。`asar.mjs` 可在第 1 步先复用，第 2 步补齐其余库。保留 patch.mjs 依赖的 `REPO_ROOT/patchSetDir` 等必要 env 导出；“删除定位探测”不等于删除所有其他导出。
- 为两个工具固定接口：`node tools/extract_en.mjs --asar="<原始 app.asar 完整路径>"` 输出到 `translations/en/`；`node tools/build_resource.mjs` 读取 en/zh-CN，输出 `translations/build/resources-zh-CN.js`。`.cmd` 转发参数给对应 `scripts/*.mjs` 并保留 Node 退出码；无有效 `--home=<完整版本目录>` 时拒绝安装操作。
- 每次只完成一个编号步骤，在本计划对应勾选项下记录实际命令、结果和未解决项，检查通过再推进。首批指定的 7 个 namespace 逐个完成；components 按目标页面引用列出本期键清单，统计该清单的覆盖率，不用整个资源库的低覆盖率掩盖本期漏译。缺省意味着省略未翻译键，不生成 null 或空字符串占位。
- 第 4 步使用 `work` 下的完整版本目录副本（包含 `resources/app.asar.unpacked`），只通过 `--home` 指向副本做文件操作；不得把副本文件直接覆盖真实安装，也不得启动副本混用用户数据。自检至少覆盖失败发生在第一个替换后、两个替换后但 pending 未清除、applied 已写入但 pending 未清除三种状态，分别检查两个文件与 applied 记录恢复一致；再检查副本与真实路径的 state 隔离。只读/占用故障需在恢复重试前解除，并核实故障确实发生在第二次替换，不能把前置校验失败当作恢复测试通过。
- 第 5 步才在已获授权的真实安装上启动并验收。若当前工具不能操作或观察桌面 UI，停在“产物已验证，UI 待验收”，列出所需人工操作，不能将 node --check 或 marker 检查替代启动、切换、持久化、认证验证；不修改用户数据来制造“首次启动”条件。

## 4. 验证清单

- [x] 应用启动无报错（fuse 关闭 + asar 重建均生效）
- [x] Settings → General → Preferences → Language 出现"简体中文"（实测校正入口）
- [x] 切换后核心页面（会话、设置、MCP 面板）显示中文；`{{插值}}` 正常
- [x] 未翻译 namespace（第二批范围）回退英文正常显示，不出现裸 key
- [x] 切回 English 正常；重启后偏好保持
- [x] 中文选择经 IPC 保存成功；重启及另一窗口读取中文，不出现 Unsupported app locale 或写入校验失败
- [ ] 中文系统 locale 首次启动可加载；主进程菜单与对话框回退英文，现有其他语言可切换（现有profile的中文启动和日语往返已通过；原生菜单/对话框待解锁视觉验收，全新profile未制造）
- [x] `verify.cmd` 明确报告已应用；修改资源/只改一个文件须失败；重复 apply 无额外修改（副本失败路径及真实verify/重复apply通过）
- [x] `restore.cmd` 成对还原完整原始哈希与 fuse enabled；签名恢复；应用可启动。restore 不删除用户偏好，原版 UI 遇到中文偏好按原有支持列表回退（真实验证通过）
- [x] 失败恢复与 pending 恢复在副本通过；keytar 外部文件及 unpacked 元数据不变，实际现有登录/认证用量功能正常（MCP外部连接状态见第5项，不扩大为所有第三方服务都可用的承诺）

## 5. 风险与对策

| 风险 | 对策 |
|------|------|
| patch exe 破坏 Authenticode 签名并关闭 asar 完整性保护 | 本机核查（2026-10-16）：智能应用控制关闭、无 AppLocker 规则、用户态代码完整性未强制，主进程代码无自身签名校验；公司 EDR/安全软件策略未知。不保证本机安全策略允许启动；应用前明确该代价，实际验收失败恢复 exe+asar。恢复原始字节后复核签名 |
| **英文资源提取失败（minified 变量网不可解析）** | 第 1 步先验证；失败即停并修订方案，不继续搭建完整管线 |
| Squirrel 自动更新（新 app-0.x 目录 + 切快捷方式） | 与 zcode-expand 同模式：新版本重建补丁集，翻译库复用只补新增 key；定位失败即中止不产半成品 |
| 新版本 minified 变量名/文件名变化 | 当前锚点明确绑定 qu/Se/Bt 及文件名，仅适配完整哈希对应的 0.200.0；其他构建拒绝，后续重新核验，不宣称结构匹配可自动跨版本 |
| 翻译破坏插值或标签 | build_resource.mjs 逐键校验 token 名称/格式/次数和标签结构，不一致拒绝 |
| Electron 升级 fuse 布局变化 | apply 前重新观测 fuse；sentinel 定位失败即中止 |

## 6. 边界说明

- 不修改 `bin/droid.exe`（CLI 已支持 zh-CN 输出）
- 不触碰 Update.exe / packages/（更新机制保留，更新后重跑管线）
- 本仓库仅存工具、补丁集与翻译库，不含 Factory 本体，不分发修改后的安装包

## 7. 已读取规范与审查记录

- 用户提供的 AGENTS 指令及 `C:\Users\11013\.claude\CLAUDE.md`：中文回复、先计划后代码、新增实体前 Dedupe Ticket、代码修改需构建检查、未经确认不提交。本次仅修文档，不开始实施。
- `C:\Users\11013\.codex\RTK.md`：命令经 rtk 执行；项目根没有额外 AGENTS.md、.codegraph 或上述规则目录。
- 用户指定 `C:\Users\11013\.cc-switch\skills\karpathy-ponytail\SKILL.md`：默认 full；优先复用、删除多余范围、每项修改追溯需求。
- `C:\Users\11013\.agents\skills\rule-aware-planning\SKILL.md`：核对规则来源和执行边界。本次修订已有文档，不新建或归档其他文件。

每轮审查完整检查正确性、可执行性和必要性；发现问题并修复的轮次不计通过。最多 5 轮，连续两轮无待修订问题即停止。这里的“通过”仅指计划具备可执行步骤与明确失败门禁，不表示汉化已实施或运行验证已通过。

| 轮次 | 结论 | 依据与修订 |
|---|---|---|
| 1 | 不通过，已修复 | 原包源码证实遗漏主进程 IPC 支持列表；work 输入截断；空补丁误判干净；源脚本依赖 ZCode 元数据；补齐成对失败恢复、真实 verify、marker、翻译校验与先行提取门禁；删去任意版本提取和最大版本猜测 |
| 2 | 不通过，已修复 | 原包 hash 与三条唯一锚点、19 个 namespace、设置 schema 复核通过；进一步发现首次 dry-run 无 pristine 的输入未定义，以及 pending 自动恢复与只读承诺冲突；补齐输入来源、只读退出、操作前备份与互斥，以及运行时前提 |
| 3 | 通过 | 对原始 asar 中两份实际 bundle 在内存应用三条修改，独立 marker 与重复编辑无操作断言通过；renderer 按 ESM、主进程按 CJS 的 node --check 均通过。复核 IPC 保存/读取与菜单 fallback 调用链，无新问题；未写入安装目录 |
| 4 | 通过 | 全文复核首次无 pristine、重复 apply、翻译更新、restore、失败/pending、只读及新版本拒绝流程；步骤输入输出、校验条件与文件范围一致，无新增必改项。提取可行性及真实 UI 验证明确列为实施门禁，未误报已验证。连续两轮通过，停止审查 |

**v5 复审（2026-10-16，按 karpathy-guidelines：正确性 / 可执行性 / 不必要修改）**。复核手段：用 zcode-expand 的 `openAsar/readEntry` 只读打开安装目录原始 asar 与 exe，未写入安装目录。

| 轮次 | 结论 | 依据与修订 |
|---|---|---|
| R1 | 不通过，已修复 | 复核通过：asar/exe SHA256、package.json 版本 0.200.0、三条锚点各 1 次（PowerShell 5.1 传 `-e` 会吞双引号，需用脚本文件复核）、`ISu` 消费 `.resources` 并 `addResourceBundle`、fuse sentinel 唯一于 188907648 且值为 `010011011`、unpacked 仅 keytar.node、work 提取文件与原始条目不一致、schema `locale:I().optional()`。修订：①“原生菜单约 20 条”实为主进程整个 `desktop` 命名空间（菜单、对话框等），改述并同步验收项；②syntaxcheck 实为 ESM 优先回退 CJS，改为原样复用，删去“按类型检查”的隐含改造；③“不新增 fuse 库”与文件清单 `fuses.mjs` 矛盾，改为不引入依赖；④补 exe 文件名 `factory-desktop.exe`；⑤`gao` 无“CLI 列表”证据，改为中性描述 |
| R2 | 不通过，已修复 | 第 4 步要求演练“替换第二个文件失败/pending 恢复”但未说明触发方式，易导致向正式脚本加故障注入参数；改为外部条件（只读/占用）与自检脚本构造状态 |
| R3 | 不通过，已修复 | 源 `resolveInstallDir` 显式 `--home` 时也调用 `writeInstallDirMemo`，按“最小移植 env”会使 verify/`restore --check` 写状态，违背只读契约；明确删除记忆写入、`ZCODE_HOME`/默认路径/快捷方式探测，进程检测改匹配 `factory-desktop.exe`。另核验 `parseArgs` 支持 `--home=`、exe 签名 Valid、复用代码为 MIT |
| R4 | 通过 | 全文复读修订后的 2.1–3 节，逐项对照源库与 bundle，无新问题 |
| R5 | 通过 | 交叉核对 1、4–7 节与 2–3 节的一致性（fuses.mjs、env 删减、语法门禁、desktop 回退描述在各处一致），无新问题。连续两轮通过，停止审查 |

**v6 本次复审（2026-10-16，karpathy-ponytail full；包含 GPT‑6.1 Sol 执行可交接性）**。本次轮数独立于历史记录，上限 5 轮。

| 轮次 | 结论 | 依据与修订 |
|---|---|---|
| 1 | 不通过，已修复 | 直接复核当前原始 asar/exe 哈希、fuse、IPC/schema/资源加载链，与 v5 一致。发现 pending 恢复未覆盖 applied 元数据及提交尾部中断，副本与真实路径状态隔离未定义；补齐恢复规则及崩溃锁处理。增加工具接口、env 必要导出、分步产物、翻译覆盖范围及 UI 工具不足时的停止条件，使执行者无需临场决定这些关键语义；未增加业务功能 |
| 2 | 通过 | 调用复用来源的实际 applyEdits，在内存对两份原始 bundle 应用三条编辑；重复应用逐条返回 already-applied，文本不变；renderer ESM/主进程 CJS 语法检查均通过，19 个 namespace 再次核验。结合已核对的 IPC/schema 链、源库接口与修订后的失败恢复契约，无新增必改项 |
| 3 | 通过 | 全文按执行者顺序核对五步输入/产物/验收、首次采集、重复应用、翻译更新、三个中断窗口、恢复元数据、只读行为、演练路径隔离和 UI 交接。必要文件范围与步骤一致，未扩展业务功能；第 1 步可行性和第 5 步运行验收仍明确待实施，不以模型名称或静态检查保证成功。连续两轮通过，停止本次审查 |

---

**实施、代价及本地提交已获明确授权，禁止推送远程。** 当前正式应用为简体中文，核心验收、真实restore/reapply及verify均成功；第5项仅原生菜单/目录对话框视觉检查因Windows锁屏保留待办。仓库 `F:\GitHubs\Factory-Expand` 已确认，本次未执行push。
