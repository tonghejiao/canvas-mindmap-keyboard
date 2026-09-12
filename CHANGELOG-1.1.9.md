# Changelog 1.1.9 / 更新日志 1.1.9

> Release date: 2026-09-12

---

## English

### Added

- **Checklist progress indicator** — automatically detects `- [ ]` / `- [x]` / `- [X]` items inside a node's Markdown text and displays the completion ratio. Two display modes (switchable in settings):
  - **Capsule progress bar** — a pill-shaped bar floating just above the node's top edge (green = completed, red = remaining), with two clearly distinct coloured segments and an optional `n/N` count. Its length is adjustable (**Bar length**, % of node width) so it can be shortened (e.g. `95%`) to stay clear of the node's corners.
  - **Pie chart** — a small SVG ring pinned at the top-left corner of the node, with an optional percentage label. Pie mode automatically pushes the node's text content to the right (padding-left) so the chart never overlaps the title.
- **Bilingual settings UI** — new `Language` setting at the top of the settings tab (`English` / `中文（简体）`). All setting labels, descriptions, dropdown options, placeholders, and hotkey names are translated.
- **File-name gating is configurable** — the `Condition → File name contains` setting now clearly documents that the keyword is **not** hard-coded to `mindmap` or `mmp`. Change it to `我的脑`, `mind`, `brain`, etc. and reload the canvas / restart Obsidian to apply. Leave the field empty to enable on every `.canvas` file.
- **Colored-edge exclusion note** — README now explicitly documents that any non-primary-color edge (red / yellow / blue / green, etc.) is treated as a decorative cross-link and **is excluded** from the tree-style right-side auto layout.

### Changed

- **Pie chart spacing** reworked: only **half a pie-chart width** is reserved between the pie chart and the node text (`padding-left: calc(var(--mm-checklist-pie-w) / 2)`, where `--mm-checklist-pie-w` follows the configured pie size, default `14px` → **7px**). The pie chart stays pinned at `top:4 left:4` so the title sits tight against it instead of being pushed far to the right.
- **Progress bar reworked into a capsule (pill)** — the bar is now a rounded pill floating just above the node's top edge (it does **not** cover the node content). Two solid, clearly distinct segments: **completed** (done colour, left) and **remaining** (todo colour, right); a subtle diagonal hatch echoes the capsule reference. New **"Bar length (% of node width)"** setting (default `95`) shortens the bar so its rounded ends stay clear of the node's own corners — no more fighting the node's corner radius. The optional percentage badge tracks the done/todo seam.
- **Plugin author** field updated to `tonghejiao&Guo.r`.
- **Plugin version** aligned with the previous published line: `1.1.9` (succeeds `1.1.8`).

### Fixed

- **Done/todo two-colour distinction (core fix)** — the bar is now rendered as a plain flex track of two `div`s (completed + remaining) instead of an SVG stroke / border cap that could hide one of the colours. The two states are always visible and clearly distinguishable. The `n/N` count and the percentage badge are preserved. All bar-related settings (style, ratio, count, percentage, length, height, colours) are part of the render signature, so changing them refreshes the bar immediately.
- **Capsule ends are now true semicircles + salmon-flesh striations** — the bar's radius is `bar height ÷ 2`, so **all four corners are rounded and both left/right ends are full semicircles** (no more "rounded top / square bottom" look). The bar is also lifted `6px` clear of the node's top border so the pill silhouette reads fully. Each segment is filled with _tonal_ 45° striations — light / base / dark shades of the **same configured colour** (via `color-mix()`), i.e. the requested salmon-flesh look — instead of a plain white wash; a glassy highlight lip is drawn above the fill.
- **Percentage badge tracks the done/todo boundary** — the badge is pinned to the exact junction between the completed and remaining segments and **moves with the completion ratio**. The bar is built as `wrap → pill-host (width = bar length) → { capsule, badge }`, so the badge and the done segment share **one percentage base**: the badge reads `ratio × 100%` of the pill, exactly like the done segment's width. It therefore sits precisely on the seam for any bar length (`0%` → bar's left end, `100%` → right end, `50%` → centre) with no width arithmetic to drift.
- **Percentage and `n/N` count merged into one badge above the seam (`33%=2/6`)** — the two used to be separate labels: the `%` above the bar, and the `n/N` count *inside* the node frame just under the bar. The inside-frame counter could be pushed onto the node's text or its border line when the node was made taller or shorter. They are now **one badge joined by `=`** (e.g. `33%=2/6`), centred **directly above the done/todo seam** and following it as the ratio changes. Because it floats **above the bar — entirely outside the node frame — it can never overlap the node's text or border, whatever the node's height**. Its horizontal anchor is `left: ratio × 100%` with `translateX(-50%)`, written inline; no corner special-cases are needed any more. (Turn one part off in settings and the badge shows just the remaining part; turn both off and no badge is drawn.)
- **Removed the separate below-bar counter and its corner hacks** — the old `0%` / `100%` "pin the counter to the node's inner top-left / top-right corner" logic, the `mm-from-right` collapse-button dodge, and the `top: calc(100% + var(--mm-bar-gap) + 6px)` inside-frame anchor are all gone: with the count merged into the above-bar badge they are no longer needed. Bar mode no longer renders `.mm-checklist-progress-label` at all (that class now serves pie mode only).
- **`0%` / `100%` badges are flushed to the pill's ends instead of centred** — at the two extremes the seam sits exactly on the pill's rounded end, so a centred badge had half of itself outside the node's left/right edge, floating over the empty canvas. The badge is now aligned to that end (`0%` → `left: 0%`, `100%` → `right: 0%`, both with `transform: none`), which keeps it within the node's width. Every intermediate ratio is still centred exactly above the seam.
- **Root fix for "the change never shows up": the plugin now cleans up after itself** — the initialisation flags used to be written onto the `canvas` object (`canvas.__mmChecklistUI` / `canvas.__mmCollapseUI`). `leaf.view.canvas` **survives a plugin disable/enable**, so after toggling the plugin the NEW instance was blocked by the OLD instance's flag: it never installed its `MutationObserver` and never re-injected, leaving the previous build's DOM (e.g. the old separate `83%` and `5/6` labels) on screen forever — no reload could ever show the new layout. All init state is now scoped to the plugin **instance** (`WeakSet`), every `MutationObserver` / DOM listener is registered per instance, and a new **`onunload()`** disconnects the observers, removes the listeners, strips the injected DOM and clears the legacy canvas flags. Note: the build loaded *before* this one has no `onunload`, so its observer survives and would keep overwriting the new DOM — therefore activate this build with a **full app restart** (or *Reload app without saving*), not just a plugin toggle.
- **Indicator rebuild now keyed to the build tag (root fix for "changes not showing")** — `MM_BUILD_TAG` is part of the render signature (`data-mm-sig`). Previously, when the ratio and every setting were unchanged, Obsidian kept the **old DOM node** rendered by the previous build, so new positioning never appeared until the ratio happened to change. Now any plugin update forces every indicator to be re-rendered, so a new build is visible immediately after toggling the plugin or restarting Obsidian.
- **Running-build tag** — the bundle now carries `MM_BUILD_TAG` and exposes it three ways: the command palette command **"显示插件构建版本 / show plugin build tag"**, a `[canvas-mindmap-keyboard] loaded build: …` console line, and `document.body.dataset.mmBuild`. Use it to confirm whether Obsidian has actually loaded the latest `main.js` (Obsidian keeps the previous build in memory until the plugin is toggled or the app restarts).
- **"Bar length" setting verified present** — the settings tab renders a **Bar length (% of node width)** text field (default `95`, accepts `10`–`100`) directly below *Bar height*; this is now covered by an automated assertion. If you still cannot see it, the running plugin is an older build: fully restart Obsidian (or toggle the plugin off and on) so the new `main.js` **and** `styles.css` are loaded together.

### Compatibility

- No breaking changes. `1.1.9` is API-compatible with `1.1.8`; `versions.json` keys `1.1.0`–`1.1.9` all map to `1.4.0`.
- Hotkeys use the standard Obsidian `scope.register(...)` API (works on all current Obsidian desktop & mobile builds). Settings changes take effect on the next canvas open or after a plugin reload — no rebuild required.
- Existing user settings are merged via deep merge, so users on older versions will automatically pick up `language = "zh"` and the default `checklistProgress` block on first run after upgrade.

### Security / privacy

- No telemetry, no network requests added.
- No new permissions required.

---

## 中文

### 新增

- **清单进度指示器** — 自动识别节点 Markdown 文本中的 `- [ ]` / `- [x]` / `- [X]` 项，显示完成比例。两种显示模式（可在设置中切换）：
  - **胶囊形进度条** — 浮在节点上边之外的药丸形进度条（绿色=已完成、红色=未完成），两段颜色清晰区分，可选显示 `n/N` 计数。长度可调（**进度条长度**，占节点宽度百分比），例如 `95%` 即可避开节点边角圆角。
  - **饼图** — 节点左上角的小 SVG 圆环，可选显示百分比。饼图模式下会自动给节点内容增加 `padding-left`，确保进度图示与标题不重叠。
- **中英双语设置界面** — 设置页面顶部新增 `界面语言` 选项（`English` / `中文（简体）`），所有设置标签、说明文字、下拉选项、占位提示和快捷键名称均已翻译。
- **文件名生效条件可配置** — 在 `Condition → File name contains（文件名包含）` 说明中明确：关键字**并未硬编码**为 `mindmap` 或 `mmp`。可以改成 `我的脑`、`mind`、`brain` 等任意字符串，保存后重开画布或重启 Obsidian 立即生效；把字段清空即可对**所有** `.canvas` 文件生效。
- **彩色连线说明** — README 明确：任何**非主色**的连线（红/黄/蓝/绿等）都被视为装饰性跨接边，**不参与**树形右侧自动排版。

### 调整

- **饼图间距重做**：饼图与节点文字之间只保留**半个饼图宽度**（`padding-left: calc(var(--mm-checklist-pie-w) / 2)`，`--mm-checklist-pie-w` 跟随设置中的饼图尺寸，默认 `14px` → **7px**）。饼图仍固定在 `top:4 left:4`，标题紧贴饼图，不再被大幅右推。
- **进度条改为胶囊形（药丸形）**：不再包裹节点圆角，而是一条浮在节点上边之外的圆角药丸进度条（**不遮挡**节点内容）。左侧**已完成**（完成色）与右侧**未完成**（未完成色）两段实色，清晰可辨，并叠加轻微斜纹呼应胶囊参考样式。新增 **「进度条长度（占节点宽度百分比）」** 设置（默认 `95`），调小后两端圆角即可避开节点自身圆角，彻底绕开弧角贴合难题。百分比徽标跟随完成/未完成交界处。
- **插件作者**字段更新为 `tonghejiao&Guo.r`。
- **插件版本号**对齐到上一版发布线 `1.1.9`（接续 `1.1.8`）。

### 修复

- **完成/未完成双色区分（核心修复）** — 进度条改为普通 flex 双段结构（已完成段 + 未完成段两个 `div`），不再使用可能把某一段颜色盖住的 SVG / 边框封顶方案，两种状态现在始终可见、颜色清晰区分。同时保留 `n/N` 计数与上方百分比徽标。所有与进度条相关的设置（样式、比例、计数、百分比、长度、高度、颜色）都纳入渲染签名，改动后立即刷新。
- **胶囊两端改为真正的半圆 + 三文鱼条纹** — 进度条圆角改为「条高 ÷ 2」，因此**四角全圆、左右两端是完整半圆**（不再出现“上圆下方”的观感）；整条再抬高 `6px`，与节点上边框留出清晰间距，药丸轮廓完整可见。每段填充改为 **同色深浅三档** 的 45° 细条纹（用 `color-mix()` 生成 浅色 / 本色 / 深色），即所要的“三文鱼肉”质感，而不再是白色蒙层；条顶部再叠加一层玻璃高光。
- **百分比徽标改为跟随完成/未完成交界处** — 不再死板居中在条上方，而是精确落在**已完成段与未完成段的交界点**，并随完成度变化**动态移动**。进度条结构改为 `wrap → pill-host（宽度 = 进度条长度）→ { 胶囊, 徽标 }`，徽标与**已完成段共用同一个百分比基准**：徽标 `left = 完成比例 × 100%`（相对 pill-host），与已完成段宽度取值完全一致，因此无论条长如何设置都精确压在交界处（0% 贴条左端、100% 贴条右端、50% 居中），不再依赖任何宽度换算。
- **百分比与 `n/N` 计数合并为一枚徽标、压在交界处正上方（`33%=2/6`）** — 此前两者是分开的：`%` 在条上方，`n/N` 计数在**节点框内**（条下方）。当节点高度被拉大或缩小时，框内计数可能被压到节点文字或边框线上。现在两者**合并为一枚用 `=` 连接的徽标**（例如 `33%=2/6`），整枚**居中于完成/未完成交界处的正上方**，并随完成度动态移动。因为它浮在**进度条上方 —— 完全位于节点框之外 —— 因此无论节点高度如何，都绝不会与节点文字或边框重叠**。其水平锚点为 `left = 完成比例 × 100%` 并配 `translateX(-50%)`（内联写入），不再需要任何边界特例。（在设置中单独关闭某一项，徽标就只显示剩下的那一项；两项都关则不渲染徽标。）
- **移除独立的条下计数及其角点 hack** — 旧版 `0%` / `100%`「把计数钉在节点框内左上 / 右上角」的逻辑、`mm-from-right` 折叠按钮避让、以及 `top: calc(100% + var(--mm-bar-gap) + 6px)` 的框内锚点全部移除：计数既已并入条上方徽标，这些都不再需要。bar 模式也不再渲染 `.mm-checklist-progress-label`（该类现在只服务饼图模式）。
- **`0%` / `100%` 徽标改为贴齐药丸端头，不再居中** — 在两个端点，交界处正好落在药丸的圆弧端头上，居中的话会有半个徽标越出节点左右边缘、飘在空白画布上。现在改为对齐到该端头（`0%` → `left: 0%`、`100%` → `right: 0%`，两者都 `transform: none`），从而保持在节点宽度之内；其余任意比例仍精确居中于交界处正上方。
- **「改了永远不生效」的根因修复：插件现在会自我清理** — 初始化标记原先写在 `canvas` 对象上（`canvas.__mmChecklistUI` / `canvas.__mmCollapseUI`）。而 `leaf.view.canvas` 在**插件「禁用→启用」时并不会重建**，因此切换后新实例会被旧实例留下的标记挡住：既不安装 `MutationObserver`，也不重新注入，旧构建的 DOM（例如老的 `83%` 与 `5/6` 两枚分开的标签）就永久留在画布上 —— 无论重载多少次都看不到新版布局。现在所有初始化状态都改为插件**实例级**（`WeakSet`），每个 `MutationObserver` / DOM 监听器都按实例登记，并新增 **`onunload()`**：断开观察器、移除监听器、清掉注入的 DOM、并清除遗留的 canvas 级标记。注意：**当前正在运行的上一版没有 `onunload`**，它的观察器会残留并不断覆盖新 DOM —— 因此启用本版请用**彻底重启 Obsidian**（或「Reload app without saving」），而不要只用关闭/启用插件。
- **指示器重建以构建标记为键（「改了没生效」的根因修复）** — 渲染签名（`data-mm-sig`）现在包含 `MM_BUILD_TAG`。此前若完成比例与所有设置都没变，Obsidian 会保留**上一版构建渲染出的旧 DOM**，新定位自然不会出现，直到比例恰好变化为止。现在只要插件更新，所有指示器都会强制重建，切换插件或重启 Obsidian 后新版立即生效。
- **运行版本标记** — 打包产物内置 `MM_BUILD_TAG`，可通过三种方式确认 Obsidian 实际加载的是哪一版：命令面板 **「显示插件构建版本 / show plugin build tag」**、控制台输出 `[canvas-mindmap-keyboard] loaded build: …`、以及 `document.body.dataset.mmBuild`。（Obsidian 会把上一次加载的 `main.js` 保留在内存中，直到关闭/启用插件或重启应用。）
- **「进度条长度」设置项已核验存在** — 设置页在「进度条高度」的正下方即为 **进度条长度（占节点宽度百分比）** 输入框（默认 `95`，可填 `10`–`100`），并已纳入自动化断言。若你在插件设置中仍看不到它，说明当前加载的是旧构建 —— 请**彻底重启 Obsidian**（或把该插件关闭再启用一次），让新的 `main.js` **与** `styles.css` 同时生效。

### 兼容性

- 没有破坏性变更。`1.1.9` 与 `1.1.8` 在 API 层完全兼容；`versions.json` 中 `1.1.0`–`1.1.9` 全部映射到 `1.4.0`。
- 快捷键使用 Obsidian 标准 `scope.register(...)` API（适用于所有当前的桌面与移动版本）。设置变更后，重新打开画布或重载插件即可生效，无需重新构建。
- 已有用户设置通过深度合并自动迁移：旧版本用户升级后会自动获得 `language = "zh"` 与默认 `checklistProgress` 块。

### 安全 / 隐私

- 未增加任何 telemetry 或网络请求。
- 未增加任何新权限。