# canvas-mindmap-keyboard

> Keyboard-first MindMap overlay for Obsidian Canvas: Tab/Enter/Arrow driven, auto-layout, auto-size, **plus collapse/expand, a right-click context menu, and drag-to-re-parent**.
>
> 一个以键盘操作为主的 Obsidian Canvas 思维导图插件：Tab/Enter/方向键驱动、自动布局、自动调整节点尺寸，**并在 1.1.8 中新增了折叠/展开、右键菜单与拖拽改挂父节点**。

---

## Introduce / 简介

**EN** — The goal is to build a canvas-based mind-map plugin that can be operated almost entirely from the keyboard.

**中文** — 本插件的目标是：在 Canvas 画布上构建一个可以尽量用键盘完成全部操作思维导图插件。

---

## Development background / 开发背景

**EN** — Thanks to this repository: [Obsidian-Canvas-MindMap](https://github.com/Quorafind/Obsidian-Canvas-MindMap). To be honest, if that author had kept updating their plugin, I would not have bothered building this one.

**中文** — 感谢这个仓库：[Obsidian-Canvas-MindMap](https://github.com/Quorafind/Obsidian-Canvas-MindMap)。说实话，如果原作者一直在更新那个插件，我也就懒得再写一个了。

---

## Feature / 功能

| Name / 名称 | Introduce / 说明 | Use the premise / 生效前提 |
| --- | --- | --- |
| The plug-in takes effect by file name | Only works when the canvas file name contains the `mindmap` string (changeable in settings) | File name contains `mindmap` |
| Create a root node | Press `Enter` | No node selected + name contains `mindmap` |
| Create sub-node | Press `Tab` | One node selected + name contains `mindmap` |
| Create a sibling node | Press `Enter` | One node selected + name contains `mindmap` |
| Delete node & subtree | Press `Backspace` | One node selected + name contains `mindmap` |
| Move focus (free) | `i/j/k/l` (editable in settings) | One node selected + name contains `mindmap` |
| Move focus until end (free) | `Shift + i/j/k/l` | Name contains `mindmap` |
| Move focus (normal) | macOS: `Ctrl + i/j/k/l`; others: `Alt + i/j/k/l` | One node selected + name contains `mindmap` |
| Move focus until end (normal) | macOS: `Ctrl + Shift + i/j/k/l`; others: `Alt + Shift + i/j/k/l` | Name contains `mindmap` |
| Enter edit state | `Space` | One node selected + name contains `mindmap` |
| Select node nearest view center | `Space` | No single node selected + name contains `mindmap` |
| Auto-adjust node height | Triggered when a node exits edit state | Name contains `mindmap` |
| Automatic layout | Three levels: whole canvas / tree / none; per-file keywords supported | On create/delete + name contains `mindmap` |
| Global resize | Command: `global resize` | — |
| Global relayout | Command: `global relayout` | — |
| Global resize & relayout | Command: `global resize and relayout` | — |
| Relayout selected tree | Command: `relayout selected tree` | — |
| **Collapse / expand subtree** (new in 1.1.8) | **Hover a node → a `+`/`−` button appears at its top-right; `−` collapses the whole subtree, `+` expands only the next level. Also available via the right-click menu.** | **Name contains `mindmap`** |
| **Right-click context menu** (new in 1.1.8) | **5 items: add child / add sibling / collapse / expand / expand-next-level.** | **Name contains `mindmap`** |
| **Drag a node onto another to re-parent** (new in 1.1.8) | **Drag node A (with its whole subtree) over node B → A is detached from its old parent and appended as B's last child.** | **Name contains `mindmap` + drag enabled** |

---

## New in 1.1.8 / 1.1.8 新增功能

### 1. Collapse / Expand — 折叠 / 展开

**EN**
- Every node that has children shows a small **+ / −** button at its **top-right corner** on hover (and when the node is focused/selected).
- **−** collapses the *entire* subtree under that node (all descendants hidden).
- **+** expands **only the next level** of descendants; use the right-click menu "expand all" to reveal everything.
- The collapsed state is **saved per canvas file** (`collapsedNodes` in plugin data), so it survives reloads.
- Toggle this feature on/off in settings: **Enable collapse / expand**.

**中文**
- 任何**有子节点**的节点，鼠标悬停时会在其**右上角**出现一个 **+ / −** 按钮（节点聚焦/选中时也会显示）。
- 点 **−** 会折叠该节点**整棵子树**（所有后代节点隐藏）。
- 点 **+** 只展开**下一级**后代；如需全部展开，请用右键菜单的"展开全部"。
- 折叠状态会**按画布文件分别保存**（记录在插件数据的 `collapsedNodes` 中），刷新后依然保留。
- 可在设置中开关：**Enable collapse / expand（启用折叠/展开）**。

### 2. Right-click context menu — 右键菜单

**EN**
Right-click any canvas node to get 5 actions:
1. **Add child** (`+` 子级) — same as `Tab`
2. **Add sibling** (`+` 同级) — same as `Enter`
3. **Collapse** (折叠) — hide the whole subtree
4. **Expand** (展开) — expand everything
5. **Expand next level** (展开下级) — reveal only direct children

**中文**
在任意画布节点上右键，会出现 5 个操作：
1. **添加子节点**（+ 子级）— 等同于 `Tab`
2. **添加同级节点**（+ 同级）— 等同于 `Enter`
3. **折叠** — 隐藏整棵子树
4. **展开** — 展开全部
5. **展开下级** — 只展开直接子节点

### 3. Drag to re-parent — 拖拽改挂父节点

**EN**
- Enable in settings: **Drag a node onto another to re-parent it**.
- Drag node **A** (its whole subtree moves with it) and drop it onto node **B**: A is **detached from its old parent** and appended as **B's last child**.
- **Dragging onto A's own parent (or any ancestor) is a no-op** — it does not create a cycle; it simply flattens the subtree up one level.
- **Dragging onto one of A's own descendants is blocked** (would create a cycle).
- Works great on touch devices / trackpad where a keyboard is inconvenient.
- The drop target is highlighted with an outline while dragging.

**中文**
- 在设置中开启：**Drag a node onto another to re-parent it（拖拽节点到其他节点以重新挂接父节点）**。
- 把节点 **A**（连同其整棵子树）拖到节点 **B** 上方松手：A 会**从旧父节点断开**，并作为 **B 的最后一个子节点**接上。
- **拖到 A 自己的父节点（或任意祖先）上 = 无操作**：不会成环，只是把子树拍平上一级。
- **拖到 A 自己的后代上会被阻止**（否则会形成环）。
- 在触屏 / 触控板上没有键盘时尤其好用。
- 拖拽时，可作为落点的节点会有高亮描边提示。

### 4. Relayout scope after collapse / expand — 折叠/展开后的重排范围

**EN**
- Setting **Relayout scope after collapse / expand**:
  - **Only the affected tree (recommended):** re-arranges only the tree that contains the collapsed/expanded node. All other nodes — including loose nodes and unrelated trees — stay exactly where they are.
  - **Whole canvas:** re-arranges all root nodes and trees after every collapse/expand.

**中文**
- 设置项 **Relayout scope after collapse / expand（折叠/展开后的重排范围）**：
  - **Only the affected tree（仅受影响树，推荐）：** 只重排包含该节点的那棵树，其余所有节点（包括散落节点、其他树）位置完全不动。
  - **Whole canvas（整个画布）：** 每次折叠/展开后重排所有根节点与树。

### 5. Button colors — 按钮颜色

**EN**
- **Expanded button color** / **Collapsed button color**: pick the background color of the `+` (on a collapsed node) and `−` (on an expanded node) buttons.

**中文**
- **Expanded button color（展开按钮颜色）/ Collapsed button color（折叠按钮颜色）**：分别设置折叠节点上 `+` 按钮、展开节点上 `−` 按钮的背景色。

---

## Notes / 注意事项

- Modified key names: `Ctrl` `Shift` `Alt` `Mod` (`Mod` = `Cmd` on macOS, `Ctrl` elsewhere).
- Special key names: `ArrowUp` `ArrowDown` `ArrowLeft` `ArrowRight`.
- Using `Alt` as a modifier often fails on macOS (the input method converts `Alt`+char into special characters), so avoid `Alt`-based shortcuts on macOS.
- **Parent-child relationships are judged by the primary-color connection between nodes.** If a node has two parent nodes, the layout may misbehave. Keep one node to one parent; if multiple parents are required, use **colored (non-primary) edges**.
- **Collapse state is saved per file.** If you rename/move the canvas file, the saved collapse state keyed by file path will not carry over.
- **Drag-to-re-parent uses primary-color edges too.** A re-parented node keeps colored cross-links intact; only the primary parent edge is re-pointed.

---
