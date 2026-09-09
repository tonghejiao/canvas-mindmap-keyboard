# canvas-mindmap-keyboard 1.1.8 — Release Notes / 更新说明

> Compared to upstream **1.1.7**, this release adds collapse/expand, a right-click context menu, and drag-to-re-parent, and fixes several re-parenting edge cases.
> 相比上游 **1.1.7**，本版本新增折叠/展开、右键菜单、拖拽改挂父节点，并修复了若干重新挂接父节点的边界问题。

---

## What's new / 新增功能

- **Collapse / Expand（折叠/展开）** — Hover a node to reveal a `+`/`−` button at its top-right. `−` collapses the whole subtree; `+` expands only the next level. State is saved per canvas file.
  悬停节点，右上角出现 `+`/`−` 按钮。`−` 折叠整棵子树，`+` 只展开下一级。折叠状态按画布文件保存。
- **Right-click menu（右键菜单）** — 5 items: add child / add sibling / collapse / expand / expand-next-level.
  5 项：添加子节点 / 添加同级节点 / 折叠 / 展开 / 展开下级。
- **Drag-to-re-parent（拖拽改挂父节点）** — Drag node A (with its subtree) onto node B to make A B's last child. On touch/trackpad this replaces the keyboard for re-arranging.
  把节点 A（连同子树）拖到 B 上，使 A 成为 B 的最后一个子节点。触屏/触控板下可替代键盘重排。
- **Relayout scope option（重排范围选项）** — Choose whether collapse/expand re-arranges only the affected tree or the whole canvas.
  选择折叠/展开后只重排受影响的树，还是整个画布。
- **Button color settings（按钮颜色设置）** — Customize the `+` / `−` button background colors.
  自定义 `+` / `−` 按钮背景色。

---

## Bug fixes / 修复

- **Multi-step drag no longer accumulates phantom parents（多步拖拽不再累积多余父节点）**
  - Root cause: Obsidian's `canvas.importData(data)` with a single argument performs a *merge* (it only adds edges, never removes the old ones). Repeatedly dragging A → B1 → B2 → B3 made A a child of all four.
    根因：Obsidian 的 `canvas.importData(data)` 单参调用是*合并*语义（只加边、不删旧边）。连续把 A 拖到 B1→B2→B3，会导致 A 同时成为 4 个节点的子节点。
  - Fix: call `canvas.importData({nodes, edges}, true)` (replace semantics) so stale parent edges are cleared.
    修复：改为 `canvas.importData({nodes, edges}, true)`（替换语义），清除旧的父边。
- **Drag onto an ancestor now works (subtree flatten, 拖到祖先上现在可用)**
  - Previously the forbidden-drag set wrongly included ancestors, so dragging B onto its own ancestor A did nothing. Now only self + descendants are blocked; dropping onto an ancestor is a valid "flatten up one level" re-parent.
    此前禁拖集合误把祖先也排除，导致把 B 拖到其祖先 A 上无法挂接。现在只禁止"自身+后代"，拖到祖先上是合法的"拍平上一级"重挂。
- **Colored cross-links are preserved on re-parent（重新挂接时保留彩色跨连线）**
  - Re-parenting now re-points only the primary-color parent edge; third-party colored edges are kept intact instead of being deleted.
    重新挂接现在只改接主色父边，第三方彩色连线保留，不再被误删。
- **Relayout no longer scrambles unrelated nodes（重排不再打乱无关节点）**
  - Collapse/expand previously triggered a global `relayoutCanvas`, moving every loose node and unrelated tree. It now re-lays-out only the affected tree(s).
    折叠/展开此前会触发全局重排，把散落节点和其他树全部打乱。现在只重排受影响的树。

---

## Files changed / 变更文件

| File | Change |
| --- | --- |
| `main.ts` | Full plugin in TypeScript (1.1.7 base + all new features). Carries `// @ts-nocheck` because it was restored from the bundled `main.js`. |
| `mindMapSettings.ts` | Merged new settings: collapse enable / relayout scope / drag-reparent toggle / button colors, plus their UI. |
| `styles.css` | Added `.mm-collapse-btn` and `.canvas-node.mm-drop-target` rules. |
| `manifest.json` | `version` → `1.1.8`. |
| `versions.json` | Added `"1.1.8": "1.4.0"`. |
| `README.md` | Bilingual usage docs including the new features. |

> Note for the maintainer: `main.ts` is a faithful TypeScript transcription of the currently-running bundled `main.js`. For a fully type-checked build, merge the new methods (`injectCollapseButtons`, `applyCollapseVisibility`, `refreshCollapseButtonStyles`, `setupDragReattach`, …) into your typed `CanvasMindmap` class; the `// @ts-nocheck` header can then be removed.
> 给维护者的说明：`main.ts` 是当前运行版打包 `main.js` 的忠实 TypeScript 转录。若要做完全的 tsc 类型检查，请把新增方法并入你带类型的 `CanvasMindmap` 类，届时即可移除 `// @ts-nocheck` 头。
