# Factory-Expand

Factory Desktop Windows 版简体中文拓展，通过固定版本的 ASAR 补丁加载中文资源，并提供安装校验、原始备份与成对还原。

## 支持范围

| Factory Desktop 版本 | 状态 | 翻译产物 |
| --- | --- | --- |
| 0.204.0 | 当前适配版本，包含文件侧栏修复、项目备注名及 AI 术语修正 | `translations/build/0.204.0/` |
| 0.202.0 | 保留固定补丁及安装、校验、还原能力，包含项目备注名 | `translations/build/0.202.0/` |
| 0.201.0 | 保留固定补丁及安装、校验、还原能力 | `translations/build/0.201.0/` |
| 0.200.0 | 保留固定补丁及安装、校验、还原能力 | `translations/build/` |

支持经过核验的 Windows 构建；脚本同时检查版本、完整文件哈希和补丁锚点。即使版本号相同，构建哈希不同也会拒绝安装。

0.204.0 的功能资源为 **18,321/18,321**（含 10 条项目备注文案和 1 条 Skill 筛选补充文案），覆盖功能界面、菜单和下拉文案；471 条课程长正文保留英文。Factory、Droid、Session、Spec、模型及厂商名称、协议、命令、路径、代码和用户内容按术语规则保留。资源覆盖不代表所有账号权限与界面状态均已逐项人工验收。

Skill/Skills 作为对应 `SKILL.md` 和 `/skills` 的功能名保留英文。Factory 生命周期配置中的 Hook/Hooks 同样保留英文；Git 钩子、系统注入钩子按技术语义翻译。子代理（Subagent）、插件（Plugin）、提示词（Prompt）、上下文（Context）及工作树（worktree）继续使用合理中文；模型计量用 token，身份认证用“访问令牌”。这些规则按具体上下文执行，不对用户文字或代码做全局替换。

本版本沿用文件面板 React #321 修复提交 `5355888` 的原生 Preact 语言订阅与卸载清理。已在真实会话验证目录展开、搜索、只读预览、Ctrl+P 重开，以及保持同一文件树节点时的中英文即时刷新。

## 项目备注名（0.202.0 / 0.204.0）

左侧按项目分组时，点击项目行的“更多”或右键菜单，选择“编辑项目备注”。保存后显示备注名；留空保存恢复原名；取消不写入。悬停可查看原始名称和路径，普通项目与 Worktree 的原生操作继续保留。“无项目”、按电脑及按时间分组不提供备注入口。

备注最长 80 个 UTF-16 字符单元，保存在当前 Factory 配置目录的 `factory-expand.json`，通常为 `%USERPROFILE%\.factory\factory-expand.json`；实际目录跟随 Factory 的 home override 和目录配置。备注按原生项目身份区分，多个窗口即时刷新，重启保留；不会修改目录名、仓库、分支或会话标题，也不会同步到网页端/手机端。

更新前先执行构建、自检及副本演练。已有汉化须在 Factory 完全退出后先 `restore`，再 `apply --dry-run`、`apply`、`verify`；新补丁不能直接覆盖旧 applied 状态。还原原始程序保留备注文件，再次安装备注功能后继续读取。

## 获取项目（SSH）

```powershell
git clone --branch codex/factory-desktop-zh git@github.com:CJ5035/Factory-Expand.git
Set-Location Factory-Expand
```

已在本机安装过汉化时，继续保留并使用原项目目录。重新克隆不会带回本机的 `pristine/`、`state/` 和 `backups/`，不能替代已有安装记录；更新前请保留这些目录。

## 安装前

- 使用 Windows 和 Node.js 18 或更高版本；当前项目没有额外 npm 依赖。
- 确认 Factory Desktop 的实际版本目录，例如 `%LOCALAPPDATA%\Factory\app-0.204.0`。`--home` 必须指向完整的绝对版本目录。
- 完全退出 Factory，包括托盘进程，再执行安装或还原。
- 应用补丁会修改 exe 的一个 Electron fuse 字节，关闭嵌入 ASAR 完整性校验，并使修改后的 exe 签名失效；还原会恢复原始 exe、asar、签名和 fuse 状态。

保留整个项目目录，尤其是本机生成的 `pristine/`、`state/` 和 `backups/`，用于校验、还原和失败恢复。这些目录按本机安装路径和构建隔离，不随 Git 分发。

## 安装与验证

在项目根目录打开 PowerShell。以下命令针对当前支持的 0.204.0：

```powershell
$factoryHome = Join-Path $env:LOCALAPPDATA 'Factory\app-0.204.0'

npm run build
.\apply.cmd "--home=$factoryHome" --dry-run
.\apply.cmd "--home=$factoryHome"
.\verify.cmd "--home=$factoryHome"
```

`--dry-run` 在 `work/` 暂存构建，不修改安装目录、pristine 或应用状态。正式安装会校验原始签名与完整构建，保存原始文件，再成对替换 exe/asar；发生替换失败时恢复操作前状态。

验证成功后启动 Factory，在“设置 → 通用 → 偏好设置 → 语言”选择“简体中文”。已保存中文偏好时会沿用该选择。重复执行 apply 会检查完整已应用状态，匹配时不修改文件。

安装 0.200.0、0.201.0 或 0.202.0 时将 `--home` 指向对应版本目录，沿用表中已保存的旧版产物；默认构建只生成 0.204.0 资源。旧版固定产物不包含本轮 Skill/Hook 术语修正。

## 还原与更新译文

查看是否可还原：

```powershell
.\restore.cmd "--home=$factoryHome" --check
```

完全退出 Factory 后还原：

```powershell
.\restore.cmd "--home=$factoryHome"
```

还原恢复该构建的原始 exe 与 asar，保留用户账号、会话及设置。已应用的 0.204.0 修改译文后，需要先还原，再构建和安装：

```powershell
.\restore.cmd "--home=$factoryHome"
npm run build
.\apply.cmd "--home=$factoryHome"
.\verify.cmd "--home=$factoryHome"
```

`verify` 返回“Not applied”表示当前没有应用汉化，不能当成验证成功。遇到 pending 恢复提示时，完全退出 Factory 后执行 apply 或 restore 的写操作；恢复成功返回退出码 2 后，重新执行原命令。只读命令不会自动恢复。

## Factory 更新后

正常通过 Factory 官方更新。新版通常使用新的 `app-版本号` 目录，需要重新适配并应用拓展。

新版本适配须核验原始 exe/asar、签名、fuse 与外部文件，迁移唯一补丁锚点、提取资源差异并补译，再通过构建、自检、副本恢复演练及实际界面抽查。完成适配后才能对新目录运行安装命令。

不要仅修改 `--home` 就将旧补丁用于未支持版本，也不要把旧 exe、asar 或备份覆盖到新版本目录。项目不修改 `Update.exe` 或 `packages` 来关闭官方更新。

## 开发与检查

```powershell
npm run build
npm run selfcheck
npm run selfcheck -- --exercise
```

当前 `selfcheck` 面向本次适配机的 0.204.0 安装路径，源码中固定为 `C:/Users/11013/AppData/Local/Factory/app-0.204.0`，并读取本机已验证的 0.201.0/0.202.0 pristine 以保留历史文件树生命周期回归；完整演练的旧补丁升级场景还需要本机 0.202.0 完整版本目录。在其他机器运行前需核对路径、已支持构建及原始基线。完整演练会创建安装副本，需要额外磁盘空间。

构建检查资源源树、键与类型、覆盖率、专名、插值、富文本、URL、代码及生成 ESM 语法。自检直接验证实际补丁、业务显示边界、菜单、原始英文回退及术语正反例，并执行 8 项备注模块隔离测试；`--exercise` 另执行 17 项副本事务演练，覆盖只读操作、幂等、成对失败回滚、中断恢复、未知构建拒绝、资源更新、并发锁、备注保护及旧补丁升级。

## 目录

| 路径 | 用途 |
| --- | --- |
| `apply.cmd` / `verify.cmd` / `restore.cmd` | 安装、验证与还原入口 |
| `scripts/` | ASAR、精准补丁、fuse 和成对事务实现 |
| `patches/<版本>/` | 固定构建清单与精准补丁 |
| `translations/en/` / `translations/zh-CN/` | 当前版本英文源和中文译文 |
| `translations/build/` | 按版本保留的构建产物 |
| `tools/` | 受限英文提取、资源构建与自检 |
| `doc/` | 实施记录、验证边界与诊断记录 |
| `pristine/` / `backups/` / `state/` | 本机原始文件、事务备份与安装状态；Git 忽略 |
| `work/` | 本机暂存、演练及验收产物；Git 忽略 |

## 实施记录

- [当前版本与完整安装说明](doc/20261016-factory-desktop-i18n-zh.md)
- [0.204.0 适配与 AI 术语复核计划](doc/设计实施文档/20261023-Factory-0.204.0适配与AI术语复核实施计划.md)
- [0.202.0 适配计划与验收记录](doc/设计实施文档/20261020-Factory-0.202.0适配实施计划.md)
- [项目备注名实施计划与验收记录](doc/设计实施文档/20261020-Factory项目备注名实施计划.md)
- [文件面板 React #321 修复记录](doc/设计实施文档/20261020-文件面板React321修复实施计划.md)
- [0.201.0 历史适配记录](doc/设计实施文档/20261019-Factory-0.201.0适配实施计划.md)

0.204.0 已完成构建、8 项备注隔离测试、业务自检和最终 17 项副本演练；51 项补丁已正式安装、校验，重复应用无修改。真实抽查 17 个设置页、9 种语言选项、添加模型表单及 7 个默认下拉；Skill 窗口的“全部 / All”筛选在同一窗口内随语言刷新。项目备注打开/取消保留原数据，文件树展开、搜索、只读预览、重开和即时语言切换通过，草稿未变。Factory 已普通启动，调试端口关闭，最终 verify 通过。本轮仅本地交付，不推送远程。

0.202.0 备注功能此前已验证保存/取消/清空、重启保留和多窗口更新，本轮原样迁移其 runtime 并保留历史回归。Worktree 和远端身份有隔离测试，未进行真实远端/Worktree UI 验收；未穷尽全部原生子菜单、账号权限和页面状态。用户安装的 Skill 名称、说明及 Markdown 保持原文，不能据此判为界面漏译。详细边界见实施记录。
