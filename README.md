# canvas-mindmap-keyboard

> Keyboard-first MindMap overlay for Obsidian Canvas: Tab/Enter/Arrow driven, auto-layout, auto-size, **plus collapse/expand, a right-click context menu, drag-to-re-parent, checklist progress indicator, and bilingual settings**.
>
> 一个以键盘操作为主的 Obsidian Canvas 思维导图插件：Tab/Enter/方向键驱动、自动布局、自动调整节点尺寸，**并在 1.1.8 中新增了折叠/展开、右键菜单与拖拽改挂父节点，在 1.1.9 中新增清单进度指示器与中英双语设置界面**。

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
| The plug-in takes effect by file name | Only works when the canvas file name contains the configured keyword (default `mindmap`; editable in settings — e.g. `我的脑`, `mind`, `mmp`, etc.) | File name contains the configured keyword |
| Create a root node | Press `Enter` | No node selected + file name contains the configured keyword |
| Create sub-node | Press `Tab` | One node selected + file name contains the configured keyword |
| Create a sibling node | Press `Enter` | One node selected + file name contains the configured keyword |
| Delete node & subtree | Press `Backspace` | One node selected + file name contains the configured keyword |
| Move focus (free) | `i/j/k/l` (editable in settings) | One node selected + file name contains the configured keyword |
| Move focus until end (free) | `Shift + i/j/k/l` | File name contains the configured keyword |
| Move focus (normal) | macOS: `Ctrl + i/j/k/l`; others: `Alt + i/j/k/l` | One node selected + file name contains the configured keyword |
| Move focus until end (normal) | macOS: `Ctrl + Shift + i/j/k/l`; others: `Alt + Shift + i/j/k/l` | File name contains the configured keyword |
| Enter edit state | `Space` | One node selected + file name contains the configured keyword |
| Select node nearest view center | `Space` | No single node selected + file name contains the configured keyword |
| Auto-adjust node height | Triggered when a node exits edit state | File name contains the configured keyword |
| Automatic layout | Three levels: whole canvas / tree / none; per-file keywords supported | On create/delete + file name contains the configured keyword |
| Global resize | Command: `global resize` | — |
| Global relayout | Command: `global relayout` | — |
| Global resize & relayout | Command: `global resize and relayout` | — |
| Relayout selected tree | Command: `relayout selected tree` | — |
| **Collapse / expand subtree** (new in 1.1.8) | **Hover a node → a `+`/`−` button appears at its top-right; `−` collapses the whole subtree, `+` expands only the next level. Also available via the right-click menu.** | **File name contains the configured keyword (`mindmap` by default, editable in settings)** |
| **Right-click context menu** (new in 1.1.8) | **5 items: add child / add sibling / collapse / expand / expand-next-level.** | **File name contains the configured keyword (`mindmap` by default, editable in settings)** |
| **Drag a node onto another to re-parent** (new in 1.1.8) | **Drag node A (with its whole subtree) over node B → A is detached from its old parent and appended as B's last child.** | **File name contains the configured keyword + drag enabled** |
| **Checklist progress indicator** (new in 1.1.9) | **Parses `- [ ]` / `- [x]` and shows the completion ratio — a capsule bar above the node's top border (done/remaining two-colour + salmon-flesh striations) or a pie ring in the top-left corner. Optional junction percentage badge above the seam and an optional `n/N` counter directly below that badge (just under the bar, inside the node frame; pinned to the inner top-left/right corner at `0%`/`100%`); adjustable bar length and height.** | **Enabled in settings; works on any `.canvas`** |

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

## New in 1.1.9 / 1.1.9 新增功能

### 1. Checklist progress indicator — 清单进度指示器

**EN**
- Automatically detects checklist items (`- [ ]` / `- [x]` / `- [X]`) inside a node's Markdown text and shows the completion ratio.
- Two display modes (switchable in settings):
  - **Capsule progress bar** — a pill-shaped bar floating just above the node's top edge; it never covers the node's content. Two clearly distinct segments: **completed** (left, done colour) and **remaining** (right, remaining colour). Both ends are **true semicircles** (radius = bar height ÷ 2), and each segment is filled with **same-colour tonal 45° striations** (light / base / dark shades — the "salmon-flesh" look) rather than a flat fill.
  - **Pie chart** — a small SVG ring pinned at the top-left corner of the node, with an optional percentage label; in pie mode the node's text is pushed right (`padding-left`) so the chart never overlaps the title.
- Settings: **Bar height (px)**, **Bar length (% of node width, default `95`)**, the done/remaining colours, show/hide the count, and an optional **percentage at the junction**.
- In bar mode the percentage and the `n/N` count are **merged into a single badge joined by `=`** (e.g. **`33%=2/6`**). The whole badge is **centred directly above the done/todo seam** and follows it as the completion ratio changes (`25%`/`50%`/`75%` → pinned above the seam). Because it floats **above the bar — i.e. entirely outside the node frame — it can never overlap the node's text or border, whatever the node's height**. At the two extremes the seam lands exactly on the pill's rounded end, so instead of centring (which would push half the badge past the node's left/right edge) the badge is **flushed to that end** — `0%` left-aligned with the pill's left end, `100%` right-aligned with its right end — so it stays within the node's width either way. (Turn either part off in settings and the badge shows only the remaining part; turn both off and no badge is drawn. Pie mode keeps its own centred percentage.)
- Works on **any** `.canvas` file, not just files whose names match the `mindmap` keyword.

**中文**
- 自动识别节点 Markdown 文本中的清单项（`- [ ]` / `- [x]` / `- [X]`），显示完成比例。
- 两种显示模式（可在设置中切换）：
  - **胶囊形进度条** —— 浮在节点上边之外、**不遮挡**节点内容的药丸形进度条。左侧**已完成**（完成色）、右侧**未完成**（未完成色）两段清晰可辨；两端都是**真正的半圆**（圆角 = 条高 ÷ 2），每段以**同色深浅三档**的 45° 细条纹填充（浅 / 本色 / 深，即 "三文鱼肉" 质感），而非纯色块。
  - **饼图** —— 节点左上角的小 SVG 圆环，可选显示百分比；饼图模式下节点文字会自动右移（`padding-left`），不会与标题重叠。
- 设置项：**进度条高度（px）**、**进度条长度（占节点宽度百分比，默认 `95`）**、完成/未完成颜色、是否显示计数，以及可选的**交接处百分比**。
- 进度条模式下，百分比与 `n/N` 计数**合并为一枚用 `=` 连接的徽标**（例如 **`33%=2/6`**），整枚徽标**居中于已完成/未完成交界处的正上方**，并随完成度动态移动（`25%`/`50%`/`75%` 均压在交界处上方）。由于它浮在**进度条上方 —— 完全位于节点框之外 —— 因此无论节点高度如何，都绝不会与节点文字或边框重叠**。在两个端点，交界处正好落在药丸的圆弧端头上，此时若仍居中，半个徽标就会越过节点左右边缘飘到空白画布上，因此改为**贴齐该端头**：`0%` 左对齐于药丸左端、`100%` 右对齐于药丸右端，两种情况下都保持在节点宽度之内。（在设置中单独关闭某一项，徽标就只显示剩下的那一项；两项都关则不显示徽标。饼图模式仍保留自己的居中百分比。）
- 对**任意** `.canvas` 文件生效，不局限于文件名匹配 `mindmap` 关键字的文件。

### 2. Bilingual settings UI — 中英双语设置界面

**EN**
- A new `Language` setting at the top of the settings tab lets you switch between **English** and **中文（简体）**.
- All setting labels, descriptions, dropdown options, placeholders, and hotkey names are translated.

**中文**
- 设置页面顶部新增 `界面语言` 选项，可在 **English** 与 **中文（简体）** 之间切换。
- 所有设置标签、说明文字、下拉选项、占位提示和快捷键名称均已翻译。

### 3. File-name gating is configurable — 文件名生效条件可配置

**EN**
- The `Condition → File name contains` setting decides which `.canvas` files are treated as "mindmap" canvases (the keyword defaults to `mindmap`).
- All shortcuts (`Tab` / `Enter` / `i j k l` / etc.), automatic layout, collapse/expand, right-click menu, and drag-to-re-parent only run when the active canvas file name contains this configured keyword.
- **You can change it to anything you want** — e.g. `我的脑`, `mind`, `mmp`, `brain` — in **Settings → canvas-mindmap-keyboard → Condition → File name contains**.
- After saving, just reload the canvas (or restart Obsidian) and the change takes effect immediately. There is no code-level lock to `mindmap` or `mmp`; the keyword is read fresh from `this.settings.condition.fileNameInclude` on every check (via `isMindmapCanvas()` / `verifyCanvasLayout()`).
- To enable the plugin on **every** `.canvas` file, simply clear the field (leave it empty).

**中文**
- 设置项 `Condition → File name contains（文件名包含）` 决定哪些 `.canvas` 文件会被当作"思维导图"画布处理（默认关键字 `mindmap`）。
- 所有快捷键（`Tab` / `Enter` / `i j k l` 等）、自动布局、折叠/展开、右键菜单与拖拽改挂父节点，仅当当前画布文件名**包含**该关键字时才会执行。
- 你可以在 **设置 → canvas-mindmap-keyboard → Condition → File name contains（文件名包含）** 中**随意修改**该关键字，例如 `我的脑`、`mind`、`mmp`、`brain` 等。
- 保存后只需重新打开画布（或重启 Obsidian）即可立即生效。代码层面**并未硬编码** `mindmap` 或 `mmp`，每次执行都从 `this.settings.condition.fileNameInclude` 实时读取（通过 `isMindmapCanvas()` / `verifyCanvasLayout()` 判断）。
- 若希望对**所有** `.canvas` 文件生效，把该字段清空即可。

### 4. Colored edges are excluded from auto layout — 彩色连线不参与自动排版

**EN**
- The plugin's tree-style automatic layout (right-side expansion) considers **only primary-color (default) edges** as parent–child relationships.
- **Any edge with a non-primary color (red, yellow, blue, green, etc.) is treated as a "decorative" / cross-link edge and is ignored by the auto layout engine.** Such colored edges do not move nodes around and do not flip their side when expanding a subtree.
- This lets you freely draw colored connections (e.g. "see also", "depends on", "weak link") between nodes without disturbing the main tree layout.
- The right-click menu and drag-to-re-parent also operate only on primary-color edges.

**中文**
- 插件的树形自动布局（右侧层级展开）**仅识别默认颜色（主色）的连线**作为父子关系。
- **任何非主色（红色、黄色、蓝色、绿色等）的彩色连线都被视为"装饰性"跨接边，自动排版引擎会直接跳过它们**——不会因为这些彩色连线而去挪动节点位置，也不会在展开子树时把它们一起重新排版。
- 这样你可以自由地画彩色连接（如"参见"、"依赖"、"弱关联"等），而不会打乱主树的版式。
- 右键菜单与拖拽改挂父节点同样只针对主色连线生效。

---

## Notes / 注意事项

- Modified key names: `Ctrl` `Shift` `Alt` `Mod` (`Mod` = `Cmd` on macOS, `Ctrl` elsewhere).
- Special key names: `ArrowUp` `ArrowDown` `ArrowLeft` `ArrowRight`.
- Using `Alt` as a modifier often fails on macOS (the input method converts `Alt`+char into special characters), so avoid `Alt`-based shortcuts on macOS.
- **Parent-child relationships are judged by the primary-color connection between nodes.** If a node has two parent nodes, the layout may misbehave. Keep one node to one parent; if multiple parents are required, use **colored (non-primary) edges**.
- **Collapse state is saved per file.** If you rename/move the canvas file, the saved collapse state keyed by file path will not carry over.
- **Drag-to-re-parent uses primary-color edges too.** A re-parented node keeps colored cross-links intact; only the primary parent edge is re-pointed.

---

## Contact / 联系

**EN** — WeChat: smallconantong

**中文** — 微信：smallconantong

## Buy me a coffee / 请我喝杯咖啡

### ko-fi
[<img src="https://storage.ko-fi.com/cdn/logomarkLogo.png" width="100">](https://ko-fi.com/conantong02)

### wechat / 微信
<img width="400" height="380" alt="mm_reward_qrcode" src="https://github.com/user-attachments/assets/111ad665-4a24-4b29-8ee4-b704ff06e409" />
