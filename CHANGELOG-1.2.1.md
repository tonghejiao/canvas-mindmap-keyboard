# Changelog 1.2.1 — 修复手工拖动连接线刚拖出就消失（2026-11-12）

> ⚠️ **版本识别（必读）**：本文件记录的是**现行 1.2.1**（2026-11-12，连线修复版），构建标记 `1.2.1 / 2026-11-12 / fix-edge-drag-disappear`。
> 2026-09-13 曾有一个**同名**「普通 md 笔记内 `cmk-todolist` 进度条」实验版 1.2.1，因 CM6 导入缺失导致插件整体加载失败，当日即回退到 1.2.0，**从未发布**。
> 若 GitHub 仓库或本地残留那份废弃版 `CHANGELOG-1.2.1.md`，请用**本文件整体覆盖**，避免对外说明错版。

---

## Fixed / 修复

### 从节点边框中点手工拖出的连线，刚拖出就消失

**现象 / Symptom**
在画布上先建好一个自由节点，再从已纳入导图树的某节点**右侧边框中点**手工拖连接线过去，连线经常刚拖出就消失，需要反复尝试几次才能连上。

**根因 / Root cause**（不是 Obsidian 的 bug，是插件自动排版抢跑）
从边框中点拖线时，Canvas 会先**选中**源节点。插件给 `Canvas.updateSelection()` 打的补丁会在 **100 ms 后**调 `autoLayout()` → `debounceRelayout*()`（200 ms 节流）→ `relayoutCanvas()` → `canvas.importData({nodes, edges})` + `requestFrame()`。而 `relayoutCanvas()` 把**所有没有主色入边的节点都当作根**重新排版——包括正瞄准的那个自由节点，整张画布随之位移，Obsidian 正在创建的草稿连线（draft edge）端点失效被丢弃。200 ms 防抖让现象时有时无，于是「试几次就能成功」。

第二重风险：`setupDragReattach()` 在同一个 `pointerdown` 上把边框中点的连接手柄当成「开始拖动节点」，若 `pointerup` 时误判出落点，会走 `reattachNodeToParent()` → `importData(..., true)` 整图替换，把刚连好的线再抹一次。

**修复（四层，全部作用在 1.2.0 生产产物上）/ Fix (4 layers)**

| 层 | 改动 |
|---|---|
| ① 指针守卫 | 新增模块级 `MM_POINTER` + `mmBindPointerGuard()` / `mmPointerBusy()`：`pointerdown` → `pointerup` 期间，以及松手后 350 ms 宽限内，判定为「指针正忙」 |
| ② 掐断触发链 | `updateSelection` 补丁里那个 100 ms 延迟的 `autoLayout()` 遇 `mmPointerBusy()` 直接跳过。单纯选中节点本不需要重排；新建节点、编辑退出等其它自动排版路径**不受影响** |
| ③ 兜底 | 真实的 `relayoutCanvas()` / `relayoutOneTree()` 在 `MM_POINTER.down === true` 时直接返回（只覆盖「指针物理按下」瞬间，松手后一切正常，不会误伤右键菜单 / 命令触发的重排） |
| ④ 区分拖线与拖节点 | `setupDragReattach()` 忽略落在节点**边框带**（距边缘内 12 px / 外 16 px）的 `pointerdown`——这正是四个原生连接手柄与缩放手柄的位置；从节点中心拖动仍然正常改挂父节点 |

**验证 / Verification**
`reproduce/test_edge_drag.cjs` 从**真实部署的 `main.js`** 加载插件类（真实 `onload` / `updateSelection` 补丁 / `autoLayout` / `debounceRelayout*` / `setupDragReattach`），模拟指针序列：

| 对象 | 结果 |
|---|---|
| 改前基线产物（`--baseline`） | **2/2 复现**「拖线期间发生 `importData()`」 |
| 1.2.1 产物 | **6/6 通过**：拖拽期间不重写画布、松手后恢复正常排版、真实重排方法按下时跳过、边框中点不误判改挂、**从节点中心拖动仍能改挂**（既有功能回归） |

---

## Build & packaging / 构建与产物

- 本版**在 1.2.0 生产 bundle 上打补丁**产出（该插件历史上一直如此维护）。**`assets/main.js` 是权威产物**，构建标记 `1.2.1 / 2026-11-12 / fix-edge-drag-disappear`，出现在命令面板 / 控制台 / `document.body.dataset.mmBuild`，并在 `data-mm-sig` 首项。
- `reproduce/patch_edge_drag.cjs` 为**幂等**补丁脚本：默认 dry-run，`--apply` 才写盘并自动留时间戳备份，重复执行输出 `SKIP ... already applied`。
- ⚠️ **源码目录里的 `main.ts` / `main.js` 是 9 月实验版的转写稿，不是本版构建来源**，请勿据此重新编译覆盖 `main.js`。
- 仓库 `main.js` 被 `.gitignore` 排除，**仅作为 Release 资产上传**；`manifest.json` / `versions.json` 必须同步更新到仓库 `main` 分支，社区插件才能识别 1.2.1。

---

## Upgrade notes / 升级注意

- 从节点**边框中点**拖线现在完全交给 Canvas 原生；若想「拖动节点改挂父节点」，请从节点**中间 / 文字区**起拖（边框带 12 px 内不再触发改挂）。
- 手工拉出的默认是**主色边**，插件会把它当作父子关系并纳入自动排版；若只想画一条「参见 / 依赖」这类关联而不想让自由节点被排进树里，请把这条边改成**彩色**。
- 更新 `main.js` 后需**完全退出并重启 Obsidian**（Obsidian 不会热重载 `main.js`）。
- 升级时**保留自己的 `data.json`**，发布包内不含也不覆盖该文件。
