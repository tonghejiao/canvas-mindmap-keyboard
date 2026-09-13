# canvas-mindmap-keyboard 1.2.0 — Release Notes / 更新说明

> Compared to **1.1.9**, this release fixes a long-standing bug where a newly created node's frame shrank while typing, and removes the now-redundant "extra vertical gap" setting.
> 相比 **1.1.9**，本版本修复了新建节点编辑时边框缩窄的长期问题，并移除了已无用的「进度条额外垂直间距」设置项。

---

## Bug fixes / 修复

- **New node no longer shrinks while editing（新建节点编辑时不再缩窄）**
  - Root cause: the node-size updater (`updateNodeSize`) recomputed the node width from the typed text on every `docChanged`, so the very first character collapsed the frame to the text width.
    根因：节点尺寸更新器在每次 `docChanged` 都按输入内容重算宽度，导致输入第一个字就把边框缩到文字宽度。
  - Fix: while a node is being edited (`node.isEditing`), the resizer holds `width: node.width` (the creation width) and does not shrink; width/height are recomputed **once** when editing ends, then the tree is auto-laid-out.
    修复：编辑中保持创建宽度（`node.isEditing` 时 `width: node.width` 不变）；**退出编辑时**才一次性按内容重算宽高并自动排版。

- **Removed "Extra vertical gap for bar" setting（移除「进度条额外垂直间距」设置项）**
  - The bar-mode checklist progress indicator now uses the global vertical gap (default 30) for spacing, so the dedicated extra-gap control was redundant and has been removed.
    进度条（bar 模式）现在使用全局垂直间距（默认 30）来排版，专用额外间距控制已无意义，故移除。
  - Overlap between a bar/badge and the node above is resolved by increasing the global vertical gap or by manually widening the node.
    进度条/徽标与上方节点重叠时，调大全局垂直间距或手动拉宽节点即可。

---

## Files changed / 变更文件

| File | Change |
| --- | --- |
| `main.ts` | Fixed `updateNodeSize`: hold creation width while editing, recompute on exit; removed `extraVerticalGap` usage. Build tag `1.2.0 / 2026-09-13 / fix-new-node-shrink`. |
| `mindMapSettings.ts` | Removed `checklistProgress.extraVerticalGap` (interface, default, I18N, UI). |
| `manifest.json` | `version` → `1.2.0`. |
| `versions.json` | Added `"1.2.0": "1.4.0"`. |
| `README.md` | Added 1.2.0 fix notes + a "drag to reorder siblings" feature row. |
