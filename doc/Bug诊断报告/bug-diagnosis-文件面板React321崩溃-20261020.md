# Bug 诊断报告：文件面板触发 React #321

- **日期**：2026-10-20（Asia/Singapore）
- **状态**：已修复；本机 0.201.0 已安装并通过原会话文件面板验收，0.200.0 源补丁同步修复但未重装验收
- **严重级别**：P1 严重（打开文件面板导致会话页面进入错误边界）
- **报告人**：Codex Agent（Bug Diagnosis Skill）

## 问题描述

用户在 Factory 会话右侧点击“文件”（Ctrl+P）后，页面显示“出现问题”及 `Minified React error #321`。附件中的会话内容仅作为截图背景，不作为本次任务指令。

## 环境信息

- 仓库：`F:/GitHubs/Factory-Expand`，分支 `codex/factory-desktop-zh`，检查时 HEAD `222f6bb`，开始时工作树干净。
- 正在运行的安装：`C:/Users/11013/AppData/Local/Factory/app-0.201.0`。
- Renderer：`resources/app.asar` 内 `.vite/renderer/main_window/assets/index-DJvfx-E_.js`。
- 项目没有 `.codegraph/` 索引，采用搜索及只读 ASAR 读取追踪。
- 修改前安装只读校验通过：pair hashes、44 markers、resources、fuse、unpacked files 均通过。
- 诊断阶段未修改安装；执行阶段在正常退出 Factory 后更新安装，验收后恢复普通启动。没有清理会话、认证或缓存，语言切换测试后保留原 zh-CN 偏好。

## 可能原因分析

| # | 原因 | 概率与结论 | 理由 |
|---|---|---|---|
| 1 | 汉化补丁在 Preact 文件树组件内调用 React 的翻译 Hook | 高，已确认代码缺陷 | `patches/0.201.0/patches.json:199` 注入 `le("components")`；`Jgn` 使用独立渲染器与 Preact Hook，而 `le` 首先调用 `P.useContext` |
| 2 | React / renderer 版本不匹配或存在额外 React 副本 | 低，非当前直接证据 | 官方列为 #321 候选；本次找到明确跨渲染器调用，不需要替换任何 React 依赖即可解释故障 |
| 3 | 安装损坏、补丁只应用一半、版本不符 | 低，当前安装已排除完整性异常 | 正在运行 0.201.0，现有 verify 全部通过，实际 bundle 中存在出错补丁 |
| 4 | 文件路径、权限、空目录或守护进程故障 | 低，尚未逐项运行验证 | 非法 Hook 在 `Jgn` 的第一个原生 ref 调用前执行，不依赖文件名或目录内容；这些因素不能解释已确认的入口缺陷 |

[React 官方 #321 说明](https://react.dev/errors/321)将该错误解释为非法 Hook 调用。这里具体命中的原因由本地调用链与隔离执行验证确定。

## 验证动作与实际结果

### 1. 核对注入位置和两套 Hook 上下文

修复前源补丁位置：`F:/GitHubs/Factory-Expand/patches/0.201.0/patches.json:198`，其中第 199 行 replacement、第 201 行 marker 包含非法调用。以下表格及调用链描述修复前证据；当前这条补丁已改为原生 Preact layout effect。

实际安装 bundle 中已核对：

| 位置 | 符号 / 语句 | 观察 |
|---|---|---|
| `index-DJvfx-E_.js:3945` | `le=(t,e={})=>...P.useContext(UCi)...` | `le` 是 React 翻译 Hook |
| `index-DJvfx-E_.js:6104` | `OVe`、`Npn` | 外层 React 组件在 layout effect 内调用文件树 model 的 `render` / `hydrate` |
| `index-DJvfx-E_.js:7371` | `Khe → nNt.renderRoot → _Ct(xCt(Jgn,e),t)` | 内层文件树通过独立的 Preact renderer 挂载 |
| `index-DJvfx-E_.js:7371` | `Jgn` 内 `le("components");const y=Fu(null)` | React Hook 被插入 Preact 组件入口 |
| `index-DJvfx-E_.js:7371` | `Fu`、`nU`、`u4`、`AM` | 使用 Preact 自有的组件及 Hook 状态，未建立 React render dispatcher |
| `index-DJvfx-E_.js:49` | `MOe.useContext=xy`，`xy()` 抛出 `Is(321)` | React 不在自身 render 阶段时拒绝该 Hook |

上述行号由实际 bundle 内容按换行计算。压缩 bundle 的第 7371 行包含多个函数，需要同时按符号定位。

### 2. 入口隔离执行验证（已执行）

从实际安装 bundle 提取 `P.useContext` 的实现、错误格式函数 `Is`、非法 dispatcher 函数 `xy`、`le` 的入口及当前文件树补丁入口，在 Node VM 中将 React context dispatcher 设为实际拒绝函数。将第一个 Preact ref 设为停止标记以限制执行范围。

结果：

```text
修复前补丁入口：Minified React error #321; visit https://react.dev/errors/321 ...
原始入口：REACHED_PREACT_USE_REF
```

含义：只恢复原始入口即可越过这次非法 React 调用。此检查复现了错误机制；它不是完整 Electron UI 回放，也未证明修改后的整个文件树功能已经验收。

### 3. 安装完整性核对（已执行）

```powershell
rtk proxy node scripts/verify.mjs --home=C:/Users/11013/AppData/Local/Factory/app-0.201.0
```

结果：`已应用 / Applied: pair hashes, 44 markers, resources, fuse and unpacked files verified.`

完整性通过只证明安装与声明的补丁一致；当前声明的补丁本身包含本次缺陷。

### 4. 同类版本与测试遗漏核对（已执行）

- `patches/0.200.0/patches.json:199` 同样注入 `le("components")`，应一并修正。
- 旧版对应的原生 ref 为 `Ou`、layout effect 为 `h4`、状态更新为 `hM`、i18n 实例入口为 `Rin`；新版分别为 `Fu`、`u4`、`AM`、`eon`，均已读取原始归档确认。
- `tools/selfcheck.mjs:52` 开始验证补丁生成、幂等与语法，随后进行显示逻辑 VM 检查；当前没有覆盖这个文件树入口的跨渲染器调用。

### 5. 真实验证动作（现已完成）

按关联实施计划完成修复及构建后，在相同会话点击右侧“文件”及按 Ctrl+P，均正常显示文件树且无 #321；搜索、目录展开、只读预览、关闭再打开和保持同一个文件树节点时的中英文即时切换均通过。具体结果见下方最终验证，未将机制隔离检查替代真实 UI 验收。

### 6. 方案评审补充验证（已执行）

2026-10-20 在内存中读取并应用方案代码，未修改补丁文件、构建产物或实际安装：

| 验证项 | 方法 | 结果与边界 |
|---|---|---|
| 两版拟修复 renderer 完整语法 | 从原始 ASAR 读取完整 renderer，应用内存补丁，通过 stdin 执行 `node --check --input-type=module` | 0.200.0 / 0.201.0 均通过；不是正式构建验收 |
| 实际 Preact 生命周期 | 提取 0.201.0 bundle 的真实 renderer / Hook 和 `Jgn` 初始化段，挂载到最小空容器；初始化段之后返回 null | 挂载通过，真实 `ne` 初始化及闭包调用无异常；文件树后半段 DOM 未执行 |
| 两次语言切换与重绘 | 共享实例替身发出 `languageChanged`，用真实 Preact scheduler 执行重绘 | 渲染次数从 1 到 3，每实例保持一个监听 |
| 卸载清理 | 使用真实 Preact renderer 卸载根 | 监听数量回到 0 |
| 新 marker 下仍可还原 | 以新的内存补丁声明执行 `checkedPristine`，重放 `restore` 的 home / version / 文件对核对 | 通过；未执行真实 restore |

评审发现原计划错误地把真实安装还原放在测试之前。已修订为先完成代码、自检和副本演练，再于部署时执行 `restore → dry-run → apply → verify`。原始 `find`、构建哈希和补丁数量保持不变，`restore` 不依赖已安装内容具有旧 marker；没有必要在开发期间提前还原安装。

本轮修订后原样执行了方案内的测试示例：对现有错误补丁按预期失败；对内存中的拟修复补丁，调用边界及真实 Preact 生命周期检查通过。检查未写回补丁文件，未进行正式 build、自检、事务演练或实际安装。

## 调用链与依赖分析

```text
用户点击右侧“文件”（用户截图证明触发动作；具体按钮处理函数未追完）
  → React 外层文件树组件 OVe                  [bundle:6104]
    → Npn layout effect → model.render/hydrate [bundle:6104]
      → 文件树 model.render → Khe              [bundle:7371]
        → nNt.renderRoot → _Ct                 [bundle:7371，Preact renderer]
          → Jgn                               [bundle:7371，Preact 组件]
            → 汉化注入 le("components")         [patches.json:199]
              → P.useContext(UCi)              [bundle:3945，React Hook]
                → MOe.useContext → xy          [bundle:49]
                  → Error(Is(321))
```

此图区分了截图触发动作与源码确认路径，未把未读取的按钮处理函数伪造成已捕获调用栈。

- **上游**：外层 React 文件树封装；model 初始渲染及其后 `setComposition`、`setGitStatus`、`setIcons` 等触发的重绘。
- **下游**：共享 i18n 实例及 `FactoryZhText` 用于“Search…”和“Options”的显示。翻译函数本身直接调用实例，不是 Hook，不应删除这两处翻译。
- **数据流**：文件树 controller、路径和 git 状态传入 Preact；当前在处理这些数据前就被非法 Hook 中断。
- **影响范围**：两个支持版本的文件树入口；拟复用原生 Preact layout effect 与现有重绘 setter，不改文件读写、路径、排序、认证或守护进程协议。

## 边缘情况检查

| 维度 | 场景 | 当前行为 / 边界 | 建议 |
|---|---|---|---|
| 空值 | 无项目、空 controller、空目录 | 缺陷发生在第一个原生 ref 前；不能据此宣称这些输入均被正确处理 | 修复后分别检查有项目及无可列目录状态 |
| 语言 | 英文及中文 | 注入无语言分支，两种语言均可能触发 | 保留实时翻译；增加中→英→中切换验证 |
| 并发 | 多个文件树实例同时打开 | 每个实例都会执行同一个非法调用 | 每实例注册一个 listener，卸载移除自己的 listener |
| 生命周期 | 关闭再打开面板、重挂载 | 原补丁无法完成首次挂载 | 用 Preact effect 返回清理函数，验证重复挂载无监听累积 |
| 时序 | 快速切换语言 | 单纯删除订阅可能留下旧语言标签 | 使用同步 layout effect 订阅，现有 setter 触发重绘 |
| 数据边界 | 中文路径、长文件名、大目录 | 与此次非法 Hook 无直接关系，未进行全量 UI 验证 | 不改路径或 controller；定向检查展开、搜索、预览 |
| 超时 / 认证 | daemon 失败、权限不足 | 本次入口缺陷早于相关读取，未测试外部故障 | 保持现有错误处理，不改网络或认证配置 |
| 版本 | 0.200.0 / 0.201.0 | 两套补丁均包含相同错误，符号不同 | 分版本核对原始锚点与原生 Hook，不做全局替换 |
| 安装 | 修改补丁后真实安装仍是旧 marker | 新声明可能阻止 verify/apply，但不阻止本方案的正常 restore | 先修改、构建并通过副本演练；部署时正常退出 Factory，再 restore → dry-run → apply → verify |

## 修复建议与验收边界

建议把 `Jgn` 中新增的 React 翻译 Hook 替换为原生 Preact layout effect：订阅共享 i18n 的 `languageChanged`，调用现有 `ne` 状态更新函数重绘，并在组件卸载时 `off` 同一个 listener。同步修复旧版对应点，扩展现有自检。

实施方案见 [20261020-文件面板React321修复实施计划.md](../设计实施文档/20261020-文件面板React321修复实施计划.md)。用户明确授权后，按 iterative-plan-review 全程单 agent 完成四项任务。两版源补丁与现有自检已修改，构建、基础自检、15/15 副本事务演练通过；本机 0.201.0 已更新并验收。

评审确认的提前还原安装 P2 问题已关闭：先完成修复和副本演练，再正常退出应用并 restore → dry-run → apply → verify。两版原始固定基线、44 个唯一锚点 / marker、完整目标语法与幂等验证均通过。

### 最终验证与交付边界

- 原会话 `98c550b6-d796-43e6-af7b-0b442baf5db9` 点击文件面板、展开目录、搜索 README.md、Markdown 只读预览、隐藏后 Ctrl+P 重新打开均通过，捕获错误列表为空。
- 使用现有语言偏好 API 切换英文 / 中文时，文件树 host 未更换，占位即时在 `Search…` / `搜索…` 间更新；最终语言偏好恢复为原值 zh-CN。
- 证据汇总 `work/file-panel-acceptance.json`，首次打开截图 `work/file-panel-first-open.png`，预览截图 `work/file-panel-preview.png`，演练日志 `work/file-panel-exercise.log`、结果 `work/exercise-Uk5K7P/results.json`。
- 验收后已正常退出调试实例并普通启动，命令行无调试参数、9225 不监听、启动日志 healthy；最终完整安装校验通过。
- 未修改用户文件或发送测试消息；修复验收阶段未提交或推送，用户随后追加授权提交本次修复并推送当前分支。旧版 0.200.0 完成源补丁和边界检查，未宣称其真实 UI、全部权限、目录规模与外部故障均已验收。
