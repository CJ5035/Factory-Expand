# Factory 桌面版中文汉化实施文档

- 日期：2026-10-16（v6：补齐失败恢复的状态一致性、演练隔离及 GPT‑6.1 Sol 执行交接）
- 目标版本：Factory Desktop 0.200.0（`C:\Users\11013\AppData\Local\Factory\app-0.200.0`）
- 状态：**第 1–4 项完成；产物已验证，待正式 apply 确认与 UI 验收**（用户于 2026-10-16 授权执行及本地提交，禁止推送远程；真实安装 exe/asar 保持原始哈希，尚未正式 apply）

## 1. 背景与调查结论

用户截图确认：Settings → Appearance → Language 下拉仅 8 种语言，无中文。

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
| 主进程 `desktop` 命名空间（菜单、右键菜单、退出确认、更新、认证、文件对话框等）8 语无中文；`Fi` 以 `fallbackLng:"en"` 初始化、未设 supportedLngs，切到 zh-CN 时回退英文，本期不翻译 | `initLifecycle-C1amcziW.js`（`eC`/`Fi.init`） |

**输入基线**：本轮直接读取安装目录原始 asar 的 header 与条目，数据起点为 `8 + header[4:8]`（uint32 LE），不能误用 `16 + JSON长度` 忽略 padding。现有 `work/extracted-0.200.0` 中 package.json、renderer 和 initLifecycle 均有头部截断，不得作为提取或补丁输入。后续通过复用的 `openAsar/readEntry` 读取，并逐条核验 header 的 size/hash。统计数字仅为原调查估算，以重新提取结果为准。

本轮本地基线完整 SHA256（仅标识本机构建，不代表官方来源认证；采集 pristine 前还需校验 exe 签名和包内 integrity）：

- asar：`07ac482d497a280c1af6d8f153a8fc1ea4bb9a08c3377a5ce65f6888423c7ace`
- exe：`fd6f8791784a987f445043c2e36936280e704e1f9060aea4749c44086840758d`

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

执行跟踪：1–4 完成；5 待代价确认及真实 UI 验收。当前会话无 TodoWrite 工具，以本清单及逐项记录跟踪。实际方案小幅调整共1次（打包后签名的keytar验证方式），其余为实施审查修复和本期components范围具体化。

Dedupe Ticket（第 1 项）：意图＝正确读取原始 asar 并提取限定版本英文资源。查询＝现有 extract/parser/resource 文件、work 中解析工具、资源声明起止与引用。命中＝zcode-expand/scripts/{extract.mjs,lib/asar.mjs,lib/patch.mjs,lib/syntaxcheck.mjs}。决策＝reuse asar，new 受限数据解析/提取工具；现有 extract 不解析资源。解析器内词法、字面量、引用解析和入口函数共同服务此单一目的。package.json/.gitignore/LICENSE 为执行及复用所必需。

执行调整 1（第 1 项基线核查）：keytar.node 在打包后被 Authenticode 签名，实际长度 718048，索引长度 707584；证书表从 707584 开始、长 10464，签名 Valid。移除证书表并清零 PE checksum/security directory 后 SHA256 精确等于 header 的 `90e35de8…f3c831`，非未知损坏。验证按此受限布局核对索引；同时钉住实际已签名外部文件完整 SHA256 `e6ac229a5ffe2959e10f3d8f8b210bcc6abecf511060db2fa0362d79f4e25e1b`，后续副本及正式安装检查字节保持不变，不改写它。其余所有 packed 条目仍逐条校验 size/hash/blocks。

Dedupe Ticket（自检）：意图＝在一个无框架脚本内验证资源拒绝样例及安装失败状态；查询＝source 中 selfcheck/test、解析器导出、计划指定失败窗口。命中＝tools/extract_en.mjs（可复用导出）、zcode-expand 的语法门禁；没有覆盖本计划契约的自检。决策＝new tools/selfcheck.mjs，后续原地扩展，内联叶子统计/子进程运行等回调只服务该验证。

Dedupe Ticket（第 2 项）：意图＝受限构建汉化补丁并提供成对安装、验证、原厂恢复。查询＝源 apply/restore/env 的导出及 pristine/pending/lock，patch 的加载与锚点函数，asar 的 selfCheck。命中＝zcode-expand/scripts/{apply,restore,verify}.mjs 及 lib/{env,patch,asar,syntaxcheck}.mjs。决策＝reuse patch/syntaxcheck；extend asar 的新文件与 unpacked 检查；new 受限 fuses；env 复用接口思想、删定位探测并实现本计划规定的路径隔离/锁/事务；三个入口复用其库接口但不移植 ZCode 元数据依赖。env 新函数分别覆盖参数/上下文、哈希与基线、只读检查、原子状态、锁、成对事务及恢复，不新增通用框架。补丁 JSON、cmd 仅实现既定接口。

第 2 项审查修复：独立 reviewer 两次确认陈旧锁无条件删除的竞争，以及第二个目标被更新器修改后仍可能覆盖。改用每目标 Windows 命名 mutex 串行化整个写操作与陈旧锁接管（PowerShell 父进程持有，Node 子进程执行；内核负责崩溃释放），文件锁释放核对拥有权；每个目标替换及恢复前重新核验该目标哈希。该补充服务原有互斥/更新竞态要求，不新增 CLI 动作。

Dedupe Ticket（第 3 项）：意图＝首批中文源库及可验证 ESM。查询＝translations 下中文/构建产物、源资源校验导出、主 bundle 对 settings/chat/connectors/coreUi/common/app/user 的文本引用。命中＝translations/en、extract_en.mjs 的统计/解析器、syntaxcheck.mjs，无现有中文源或 build 工具。决策＝new 指定中文 JSON、目标 components 键清单和 build_resource.mjs；reuse 语法门禁。构建器中的递归叶子/插值多重集/富文本树校验函数仅覆盖本任务。独立翻译委派按 subagent-driven-development 执行，过程 brief/report/ledger 放 git 忽略的 .superpowers/sdd；原计划编号格式不被 skill 的 Task 标题提取器支持，已运行失败并手写等价 brief，不改变范围。

第 3 项分工与审查记录：单个实施子代理负责 common/settings/components 的正式 JSON；主代理负责 sessions/softwareFactory/inbox/onboarding/errors 及 components 尾部 475 条译文暂存，按文件或固定索引分工，最终 components 由同一代理汇总。复用英文原句字典减少重复，未使用外部翻译服务。构建器及 components 3002 键清单已独立审查通过；common/sessions/三个小 namespace/softwareFactory 和 components 尾部已做中英对照审查，修正两处 Git stash（明确储藏而非 git add 暂存）及一处每个 PR 必须批准的译法。所有这些修复均已核对英文并再次复核。

Dedupe Ticket（第 4 项）：意图＝在一个最小自检脚本内执行隔离安装的状态失败路径。查询＝现有selfcheck、env事务/状态导出、计划三种中断窗口。命中＝tools/selfcheck.mjs 和 scripts/lib/env.mjs 已有导出。决策＝extend selfcheck（快照/CLI子进程/受控状态构造/并发验证回调），不新增框架或正式故障注入入口；临时记录仅在work/backups/state。运行时核查另确认 Windows 自带powershell.exe在重置子进程PSModulePath后签名/CIM均可用，env改为直接使用系统路径并固定UTF-8输出，不要求安装PowerShell7。

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
   - 待确认：是否接受正式patch exe后签名失效、关闭asar完整性校验及Factory更新后需重新适配；确认后才可对真实版本目录apply。当前未启动/修改真实应用或用户偏好。
   - 后续需在真实UI检查：语言列表与中文核心页面、未译回退、English往返、重启与另一窗口读取、IPC保存、系统locale条件、主进程英文回退、keytar实际认证，以及一次restore/reapply。无桌面观察能力时保留未勾选并交人工验收，不以marker替代。

涉及文件限定为 `scripts/lib/{asar,patch,syntaxcheck,env,fuses}.mjs`、`scripts/{apply,restore,verify}.mjs`、三个 `.cmd`、`tools/{extract_en,build_resource}.mjs`、本版本补丁 JSON、翻译 JSON/生成资源，以及必要 `package.json`、`.gitignore`、复用代码许可证和一个最小自检脚本（覆盖状态失败路径与资源拒绝样例，不加测试框架）。保留 MIT 版权声明。`.gitignore` 排除 work/pristine/backups/state/安装包及 dry-run 产物，避免当前未跟踪的 work 进入提交。不修改复用来源目录，不添加 GUI、自动更新适配、通用解析器、课程翻译或主进程 desktop 译文。

### 3.1 交给 GPT‑6.1 Sol 的执行约定

**结论边界**：本计划可作为 GPT‑6.1 Sol 的分步执行任务；这是对任务输入、步骤和验收明确程度的判断，不是模型成功率承诺，也不是已由该模型完成实施。第 1 步仍为可行性门禁，失败不得跳过或自行缩小翻译范围来宣告完成。

- 在 `F:\GitHubs\Factory-Expand` 执行，先读取项目规则及本文件；新增文件/函数前按规则记录 Dedupe Ticket。`asar.mjs` 可在第 1 步先复用，第 2 步补齐其余库。保留 patch.mjs 依赖的 `REPO_ROOT/patchSetDir` 等必要 env 导出；“删除定位探测”不等于删除所有其他导出。
- 为两个工具固定接口：`node tools/extract_en.mjs --asar="<原始 app.asar 完整路径>"` 输出到 `translations/en/`；`node tools/build_resource.mjs` 读取 en/zh-CN，输出 `translations/build/resources-zh-CN.js`。`.cmd` 转发参数给对应 `scripts/*.mjs` 并保留 Node 退出码；无有效 `--home=<完整版本目录>` 时拒绝安装操作。
- 每次只完成一个编号步骤，在本计划对应勾选项下记录实际命令、结果和未解决项，检查通过再推进。首批指定的 7 个 namespace 逐个完成；components 按目标页面引用列出本期键清单，统计该清单的覆盖率，不用整个资源库的低覆盖率掩盖本期漏译。缺省意味着省略未翻译键，不生成 null 或空字符串占位。
- 第 4 步使用 `work` 下的完整版本目录副本（包含 `resources/app.asar.unpacked`），只通过 `--home` 指向副本做文件操作；不得把副本文件直接覆盖真实安装，也不得启动副本混用用户数据。自检至少覆盖失败发生在第一个替换后、两个替换后但 pending 未清除、applied 已写入但 pending 未清除三种状态，分别检查两个文件与 applied 记录恢复一致；再检查副本与真实路径的 state 隔离。只读/占用故障需在恢复重试前解除，并核实故障确实发生在第二次替换，不能把前置校验失败当作恢复测试通过。
- 第 5 步才在已获授权的真实安装上启动并验收。若当前工具不能操作或观察桌面 UI，停在“产物已验证，UI 待验收”，列出所需人工操作，不能将 node --check 或 marker 检查替代启动、切换、持久化、认证验证；不修改用户数据来制造“首次启动”条件。

## 4. 验证清单

- [ ] 应用启动无报错（fuse 关闭 + asar 重建均生效）
- [ ] Settings → Appearance → Language 出现"简体中文"
- [ ] 切换后核心页面（会话、设置、MCP 面板）显示中文；`{{插值}}` 正常
- [ ] 未翻译 namespace（第二批范围）回退英文正常显示，不出现裸 key
- [ ] 切回 English 正常；重启后偏好保持
- [ ] 中文选择经 IPC 保存成功；重启及另一窗口读取中文，不出现 Unsupported app locale 或写入校验失败
- [ ] 中文系统 locale 首次启动可加载；主进程菜单与对话框回退英文，现有其他语言可切换
- [x] `verify.cmd` 明确报告已应用；修改资源/只改一个文件须失败；重复 apply 无额外修改（安装副本通过，真实安装仍待第5项）
- [ ] `restore.cmd` 成对还原完整原始哈希与 fuse enabled；签名恢复；应用可启动。restore 不删除用户偏好，原版 UI 遇到中文偏好应按原有支持列表回退
- [ ] 失败恢复与 pending 恢复在副本通过；keytar 外部文件及 unpacked 元数据不变，实际认证功能正常

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

**实施及本地提交已获授权，禁止推送远程。** 第1–4项已执行并记录；按第5项，真实安装正式apply前仍需确认关闭asar完整性校验的代价（exe签名失效、Factory更新后需重新适配）。仓库 `F:\GitHubs\Factory-Expand` 已确认；本次未执行push，也未正式apply。
