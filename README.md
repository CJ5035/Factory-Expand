# Factory-Expand

Factory Desktop Windows 版简体中文拓展，通过固定版本的 ASAR 补丁加载中文资源，并提供安装校验、原始备份与成对还原。

## 支持范围

| Factory Desktop 版本 | 状态 | 翻译产物 |
| --- | --- | --- |
| 0.202.0 | 当前适配版本，包含文件侧栏修复 | `translations/build/0.202.0/` |
| 0.201.0 | 保留固定补丁及安装、校验、还原能力 | `translations/build/0.201.0/` |
| 0.200.0 | 保留固定补丁及安装、校验、还原能力 | `translations/build/` |

支持经过核验的 Windows 构建；脚本同时检查版本、完整文件哈希和补丁锚点。即使版本号相同，构建哈希不同也会拒绝安装。

0.202.0 的功能资源为 **18,167/18,167**，覆盖功能界面、菜单和下拉文案；471 条课程长正文保留英文。Factory、Droid、Session、Spec、模型及厂商名称、协议、命令、路径、代码和用户内容按术语规则保留。资源覆盖不代表所有账号权限与界面状态均已逐项人工验收。

本版本以文件面板 React #321 修复提交 `5355888` 为基线，保留 Preact 原生语言订阅与卸载清理。已在真实会话验证目录展开、搜索、只读预览、Ctrl+P 重开，以及保持同一文件树节点时的中英文即时刷新。

## 获取项目（SSH）

```powershell
git clone --branch codex/factory-desktop-zh git@github.com:CJ5035/Factory-Expand.git
Set-Location Factory-Expand
```

已在本机安装过汉化时，继续保留并使用原项目目录。重新克隆不会带回本机的 `pristine/`、`state/` 和 `backups/`，不能替代已有安装记录；更新前请保留这些目录。

## 安装前

- 使用 Windows 和 Node.js 18 或更高版本；当前项目没有额外 npm 依赖。
- 确认 Factory Desktop 的实际版本目录，例如 `%LOCALAPPDATA%\Factory\app-0.202.0`。`--home` 必须指向完整的绝对版本目录。
- 完全退出 Factory，包括托盘进程，再执行安装或还原。
- 应用补丁会修改 exe 的一个 Electron fuse 字节，关闭嵌入 ASAR 完整性校验，并使修改后的 exe 签名失效；还原会恢复原始 exe、asar、签名和 fuse 状态。

保留整个项目目录，尤其是本机生成的 `pristine/`、`state/` 和 `backups/`，用于校验、还原和失败恢复。这些目录按本机安装路径和构建隔离，不随 Git 分发。

## 安装与验证

在项目根目录打开 PowerShell。以下命令针对当前支持的 0.202.0：

```powershell
$factoryHome = Join-Path $env:LOCALAPPDATA 'Factory\app-0.202.0'

npm run build
.\apply.cmd "--home=$factoryHome" --dry-run
.\apply.cmd "--home=$factoryHome"
.\verify.cmd "--home=$factoryHome"
```

`--dry-run` 在 `work/` 暂存构建，不修改安装目录、pristine 或应用状态。正式安装会校验原始签名与完整构建，保存原始文件，再成对替换 exe/asar；发生替换失败时恢复操作前状态。

验证成功后启动 Factory，在“设置 → 通用 → 偏好设置 → 语言”选择“简体中文”。已保存中文偏好时会沿用该选择。重复执行 apply 会检查完整已应用状态，匹配时不修改文件。

安装 0.200.0 或 0.201.0 时将 `--home` 指向对应版本目录，沿用表中已保存的旧版产物；默认构建只生成 0.202.0 资源。

## 还原与更新译文

查看是否可还原：

```powershell
.\restore.cmd "--home=$factoryHome" --check
```

完全退出 Factory 后还原：

```powershell
.\restore.cmd "--home=$factoryHome"
```

还原恢复该构建的原始 exe 与 asar，保留用户账号、会话及设置。已应用的 0.202.0 修改译文后，需要先还原，再构建和安装：

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

当前 `selfcheck` 面向本次适配机的 0.202.0 安装路径，源码中固定为 `C:/Users/11013/AppData/Local/Factory/app-0.202.0`，并读取本机已验证的 0.201.0 pristine 以保留历史文件树生命周期回归；在其他机器运行前需核对路径、已支持构建及原始基线。完整演练会创建安装副本，需要额外磁盘空间。

构建检查资源源树、键与类型、覆盖率、专名、插值、富文本、URL、代码及生成 ESM 语法。自检直接验证实际补丁、业务显示边界、菜单与原始英文回退；`--exercise` 另执行 15 项副本事务演练，覆盖只读操作、幂等、成对失败回滚、中断恢复、未知构建拒绝、资源更新和并发锁。

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
- [0.202.0 适配计划与验收记录](doc/设计实施文档/20261020-Factory-0.202.0适配实施计划.md)
- [文件面板 React #321 修复记录](doc/设计实施文档/20261020-文件面板React321修复实施计划.md)
- [0.201.0 历史适配记录](doc/设计实施文档/20261019-Factory-0.201.0适配实施计划.md)

0.202.0 已完成构建、业务自检、15 项副本演练、真实安装与定向界面抽查；原生子菜单的全部状态和远端服务可用性不属于已全面验收的范围，详细边界见实施记录。
