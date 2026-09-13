// @ts-nocheck
// NOTE: This file is a faithful TypeScript transcription of the currently-running
// bundled main.js. It was restored from the minified bundle, so it intentionally
// uses loose `any` typings. When you merge the new methods (injectCollapseButtons,
// applyCollapseVisibility, refreshCollapseButtonStyles, setupDragReattach, …) into
// your fully-typed CanvasMindmap class, you can remove this header and type-check
// normally. esbuild (the actual bundler) ignores it.
import { Plugin, Notice, editorInfoField, debounce } from 'obsidian';
import * as import_obsidian from 'obsidian';
import { around } from "monkey-around";
import { DEFAULT_SETTINGS, MindMapSettings, MindMapSettingTab, AutomaticLayoutLevel } from "./mindMapSettings";
import { EditorView, ViewUpdate } from "@codemirror/view";

/**
 * Build tag — bump this on every shipped change.
 *
 * Obsidian keeps the previously-loaded main.js in memory until the plugin is
 * disabled+re-enabled (or the app is restarted), so "I changed the file on disk
 * but nothing happened" is very easy to hit. This tag makes the running bundle
 * identifiable three ways:
 *   1. command palette → "显示插件构建版本 / show plugin build tag"
 *   2. DevTools console → "[canvas-mindmap-keyboard] loaded build: …"
 *   3. `document.body.dataset.mmBuild` in the DevTools console
 */
const MM_BUILD_TAG = "1.2.0 / 2026-09-13 / fix-new-node-shrink";

function generateId(canvas: any) {
  let id = Math.random().toString(36).substr(2, 10);
  while (canvas.nodes.has(id) || canvas.edges.has(id)) {
    id = Math.random().toString(36).substr(2, 10);
  }
  return id;
}

interface CanvasNode {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  canvas: any
  child: any
  text: any
  file: any

  setIsEditing(arg0: boolean): unknown;
  resize(arg0: { width: any; height: number; }): unknown;
  render(): unknown;
}

declare module 'obsidian' {
  interface MarkdownFileInfo {
    containerEl: HTMLElement;
    node: CanvasNode;
  }

  interface View {
    canvas: any
    file: any
  }

  interface Workspace {
    getActiveFileView(): any;
  }
}

const unableCalcHeightOrWidth = (sizerEl: any) => {
  return !sizerEl ||
    sizerEl.querySelector(".HyperMD-codeblock") ||
    sizerEl.querySelector(".cm-lang-mermaid") ||
    sizerEl.querySelector("img") ||
    sizerEl.querySelector(".HyperMD-list-line") ||
    sizerEl.querySelector(".cm-embed-block") ||
    // sizerEl.querySelector(".HyperMD-header") ||
    sizerEl.querySelector(".external-link") ||
    sizerEl.querySelector(".footnote-ref") ||
    sizerEl.querySelector(".hr") ||
    sizerEl.querySelector(".HyperMD-footnote") ||
    sizerEl.querySelector(".math")
}

const updateNodeSize = (plugin: CanvasMindmap) => {
  const calcFinalWidth = (node: any, sizerEl: any) => {
    let padding = plugin.settings.nodeAutoResize.contentHorizontalPadding;
    const el = sizerEl.querySelector(".cm-gutters");
    if (el) {
      const style = window.getComputedStyle(el);
      const marginLeft = parseFloat(style.marginLeft);
      const marginRight = parseFloat(style.marginRight);
      padding += el.offsetWidth + marginLeft + marginRight + 5;
    }

    let finalWidth = node.width;
    if (plugin.settings.nodeAutoResize.autoResizeWidthSwitch) {
      const lines = sizerEl.querySelectorAll(".cm-line");
      let maxWidth = 0;
      for (const lineEl of lines) {
        const width = plugin.getTextPixelWidthFromElement(lineEl);
        if (width > maxWidth) maxWidth = width;
      }
      maxWidth += padding;
      finalWidth = plugin.settings.nodeAutoResize.maxWidth < 0
        ? maxWidth
        : Math.min(maxWidth, plugin.settings.nodeAutoResize.maxWidth); // 最大宽度限制
    }
    return finalWidth;
  };

  return EditorView.updateListener.of((v: ViewUpdate) => {
    if (v.focusChanged) {
      if (!plugin.settings.nodeAutoResize.autoResizeHeightSwitch && !plugin.settings.nodeAutoResize.autoResizeWidthSwitch) return;

      const editor = v.state.field(editorInfoField);
      const node = editor?.node;

      if (node?.canvas?.view && plugin.verifyCanvasLayout(node.canvas.view)) {
        // 进入编辑阶段：保持创建时的宽度，不要根据内容缩窄。
        if (v.view.hasFocus) return;

        // 退出编辑阶段：按内容一次性重新计算宽高并自动排版。
        setTimeout(() => {
          if (!node.text || !node.text.trim()) {
            plugin.autoLayout(node.canvas, node);
            return;
          }
          const sizerEl = node?.child?.editMode?.sizerEl;

          if (unableCalcHeightOrWidth(sizerEl)) {
            plugin.autoLayout(node.canvas, node);
            return;
          }

          const finalWidth = calcFinalWidth(node, sizerEl);
          node.resize({ width: finalWidth, height: sizerEl.innerHeight + 35 });
          node.render();
          plugin.debounceSaveCanvas(node.canvas);
          plugin.autoLayout(node.canvas, node);
        }, 100);
      }
    }
    if (v.docChanged || v.selectionSet) {
      if (!plugin.settings.nodeAutoResize.autoResizeWidthSwitch && !plugin.settings.nodeAutoResize.autoResizeHeightSwitch) return;

      const editor = v.state.field(editorInfoField);
      const node = editor?.node;

      if (node?.canvas?.view && plugin.verifyCanvasLayout(node.canvas.view)) {
        // 编辑中保持当前节点宽度不变，避免输入第一个字后节点被缩成很窄。
        if (node.isEditing) {
          node.resize({ width: node.width, height: node.height });
          node.render();
          return;
        }

        const sizerEl = node?.child?.editMode?.sizerEl;
        if (unableCalcHeightOrWidth(sizerEl)) return;

        const finalWidth = calcFinalWidth(node, sizerEl);
        node.resize({ width: finalWidth, height: node.height });
        node.render();
        plugin.debounceSaveCanvas(node.canvas);
      }
    }
  });
};

function parseChecklistProgress(text) {
  if (!text || typeof text !== "string")
    return null;
  const lines = text.split(/\r?\n/);
  let total = 0;
  let checked = 0;
  const checkboxRegex = /^([-*]|\d+\.)\s+\[[ xX]\]/;
  for (const line of lines) {
    const trimmed = line.trim();
    if (!checkboxRegex.test(trimmed))
      continue;
    total++;
    if (trimmed.includes("[x]") || trimmed.includes("[X]"))
      checked++;
  }
  if (total === 0)
    return null;
  return { checked, total, ratio: checked / total };
}

function createProgressBar(progress, settings, el) {
  const cfg = settings.checklistProgress || {};
  const height = cfg.barHeight || 8;
  const lengthPct = cfg.barLength != null ? cfg.barLength : 95;
  const doneColor = cfg.barColorDone || "#51cf66";
  const todoColor = cfg.barColorTodo || "#ff6b6b";
  const wrap = document.createElement("div");
  wrap.className = "mm-checklist-progress mm-checklist-progress-bar";
  wrap.style.setProperty("--mm-checklist-bar-height", `${height}px`);
  wrap.style.setProperty("--mm-bar-length", `${lengthPct}%`);
  wrap.style.setProperty("--mm-done", doneColor);
  wrap.style.setProperty("--mm-todo", todoColor);
  // Capsule (pill) progress bar: a rounded-pill track centred above the node.
  // Two clearly distinct segments — done (left) + todo (right) — so the
  // completed vs. remaining parts are always distinguishable. The pill's own
  // rounded ends mean the node's own corner radius no longer matters; making
  // the bar shorter (barLength) easily avoids the node corners.
  //
  // KEY: the capsule and the percentage badge live inside `pillHost`, a box
  // whose width IS the bar length. Both therefore share one coordinate system:
  // the done segment is `ratio * 100%` of pillHost and the badge is placed at
  // `ratio * 100%` of pillHost — so the badge always sits exactly above the
  // done/todo seam, no matter the node width, padding, or bar length.
  const pillHost = document.createElement("div");
  pillHost.className = "mm-checklist-progress-bar-pill-host";
  const capsule = document.createElement("div");
  capsule.className = "mm-checklist-progress-bar-capsule";
  const track = document.createElement("div");
  track.className = "mm-checklist-progress-bar-track";
  const done = document.createElement("div");
  done.className = "mm-checklist-progress-bar-done";
  done.style.width = `${progress.ratio * 100}%`;
  const todo = document.createElement("div");
  todo.className = "mm-checklist-progress-bar-todo";
  todo.style.width = `${(1 - progress.ratio) * 100}%`;
  track.appendChild(done);
  track.appendChild(todo);
  capsule.appendChild(track);
  pillHost.appendChild(capsule);
  // ONE combined badge lives ABOVE the bar, inside `pillHost`. Its horizontal
  // anchor is `ratio * 100%` of the pill — the SAME percentage base the done
  // segment's width uses — so the badge stays centred exactly over the
  // completed/remaining seam and follows it as the ratio changes, no matter the
  // node width, padding or bar length.
  //
  // The percentage and the `n/N` count are a SINGLE label joined by "=" (e.g.
  // `33%=2/6`) instead of two labels stacked above and below the bar. The old
  // below-bar counter lived INSIDE the node frame, so enlarging or shrinking
  // the node could push it onto the node text or the border line. Keeping the
  // merged badge ABOVE the bar — entirely outside the frame — makes it immune
  // to node size: it can never overlap the node's content or border.
  const seamPct = `${(progress.ratio * 100).toFixed(2)}%`;
  const showCount = cfg.showCount !== false;
  const showPct = cfg.showPercentAtJunction === true;
  if (showPct || showCount) {
    const parts = [];
    if (showPct)
      parts.push(`${Math.round(progress.ratio * 100)}%`);
    if (showCount)
      parts.push(`${progress.checked}/${progress.total}`);
    const badge = document.createElement("span");
    badge.className = "mm-checklist-progress-junction-label";
    badge.textContent = parts.join("=");
    // The badge is centred on the done/todo seam with `left` + `translateX(-50%)`,
    // using the SAME percentage base as the done segment's width, so it is always
    // exactly above the junction (e.g. `83%=5/6`) however the bar is configured.
    //
    // At the two extremes the seam sits exactly ON the pill's rounded end, so
    // centring would push half the badge past the node's left/right edge and let
    // it float over the empty canvas. There we flush the badge instead: `0%` →
    // left-aligned with the pill's left end, `100%` → right-aligned with its
    // right end. The pill is 95% of the node width, so the badge stays fully
    // inside the node either way. Written INLINE so a stale cached stylesheet
    // can never win.
    if (progress.ratio <= 0) {
      badge.style.left = "0%";
      badge.style.right = "auto";
      badge.style.transform = "none";
    } else if (progress.ratio >= 1) {
      badge.style.left = "auto";
      badge.style.right = "0%";
      badge.style.transform = "none";
    } else {
      badge.style.left = seamPct;
      badge.style.right = "auto";
      badge.style.transform = "translateX(-50%)";
    }
    pillHost.appendChild(badge);
  }
  wrap.appendChild(pillHost);
  return wrap;
}

function createProgressPie(progress, settings) {
  const cfg = settings.checklistProgress || {};
  const size = cfg.pieSize || 18;
  const doneColor = cfg.pieColorDone || "#4dabf7";
  const todoColor = cfg.pieColorTodo || "#e9ecef";
  const wrap = document.createElement("div");
  wrap.className = "mm-checklist-progress mm-checklist-progress-pie";
  wrap.style.width = `${size}px`;
  wrap.style.height = `${size}px`;
  const svgNs = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNs, "svg");
  svg.setAttribute("viewBox", "0 0 100 100");
  svg.setAttribute("width", "100%");
  svg.setAttribute("height", "100%");
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const dashDone = progress.ratio * circumference;
  const dashTodo = circumference - dashDone;
  const todo = document.createElementNS(svgNs, "circle");
  todo.setAttribute("cx", "50");
  todo.setAttribute("cy", "50");
  todo.setAttribute("r", String(radius));
  todo.setAttribute("fill", "none");
  todo.setAttribute("stroke", todoColor);
  todo.setAttribute("stroke-width", "18");
  todo.setAttribute("stroke-dasharray", `${circumference} ${circumference}`);
  todo.setAttribute("transform", "rotate(-90 50 50)");
  const done = document.createElementNS(svgNs, "circle");
  done.setAttribute("cx", "50");
  done.setAttribute("cy", "50");
  done.setAttribute("r", String(radius));
  done.setAttribute("fill", "none");
  done.setAttribute("stroke", doneColor);
  done.setAttribute("stroke-width", "18");
  done.setAttribute("stroke-dasharray", `${dashDone} ${circumference}`);
  done.setAttribute("stroke-dashoffset", "0");
  done.setAttribute("transform", "rotate(-90 50 50)");
  svg.appendChild(todo);
  svg.appendChild(done);
  wrap.appendChild(svg);
  if (cfg.showCount !== false) {
    const label = document.createElement("span");
    label.className = "mm-checklist-progress-label";
    label.textContent = `${Math.round(progress.ratio * 100)}%`;
    wrap.appendChild(label);
  }
  return wrap;
}

export default class CanvasMindmap extends Plugin {
  settings: MindMapSettings;
  constructor() {
    super(...arguments);
    this.inRelayoutCanvasSet = /* @__PURE__ */ new Set();
    this.lastRelayoutTime = 0;
    // --- Instance-scoped init state & resources (do NOT put these on `canvas`) ---
    // `leaf.view.canvas` SURVIVES a plugin disable/enable. A canvas-level flag
    // written by a previous instance (`canvas.__mmChecklistUI`) therefore made
    // the NEW instance early-return, so it never installed its MutationObserver
    // and never re-injected — the previous build's DOM (e.g. the old two-label
    // `83%` + `5/6`) then stayed on screen forever. That is the real reason
    // earlier rounds looked "not applied". Same reasoning for the observers and
    // listeners: they are owned (and torn down) per instance.
    this.ensureMmState();
    this.debounceSaveCanvas = (canvas) => {
      canvas.requestSave();
    };
    this.debounceRelayoutCanvas = (canvas) => {
      const now = Date.now();
      if (now - this.lastRelayoutTime < 200)
        return;
      this.lastRelayoutTime = now;
      this.relayoutCanvas(canvas);
    };
    this.debounceRelayoutOneTree = (node) => {
      const now = Date.now();
      if (now - this.lastRelayoutTime < 200)
        return;
      this.lastRelayoutTime = now;
      this.relayoutOneTree(node);
    };
  }
  // Lazily (re)create the instance-scoped state. Idempotent — and deliberately
  // called at the top of every setup/teardown entry point, because the plugin
  // object can be constructed WITHOUT running the constructor (the jsdom test
  // harness does exactly that via Object.create), so relying on the constructor
  // alone would throw "Cannot read properties of undefined".
  ensureMmState() {
    if (this.mmObservers)
      return;
    this.mmObservers = [];
    this.mmListeners = [];
    this.mmChecklistUI = new WeakSet();
    this.mmCollapseUI = new WeakSet();
    this.mmRestoreScheduled = new WeakSet();
    this.mmRestoreDone = new WeakSet();
    this.mmRelaidOut = new WeakSet();
  }
  async onload() {
    await this.registerSettings();
    this.registerCommands();
    this.patchCanvas();
    this.patchMarkdownFileInfo();
    this.patchMarkdownFileInfoFile();
    this.patchUpdateSelection();
    this.registerEditorExtension([updateNodeSize(this)]);
    this.registerCanvasNodeMenu();
    this.app.workspace.onLayoutReady(() => {
      setTimeout(() => this.ensureCollapseUIForAllLeaves(), 500);
      let lastEnsure = 0;
      this.registerEvent(this.app.workspace.on("active-leaf-change", () => {
        const now = Date.now();
        if (now - lastEnsure < 300)
          return;
        lastEnsure = now;
        setTimeout(() => this.ensureCollapseUIForAllLeaves(), 150);
      }));
      this.registerEvent(this.app.workspace.on("layout-change", () => {
        setTimeout(() => this.ensureCollapseUIForAllLeaves(), 200);
      }));
    });
    console.log(`[canvas-mindmap-keyboard] loaded build: ${MM_BUILD_TAG}`);
    try {
      document.body.dataset.mmBuild = MM_BUILD_TAG;
    }
    catch (e) {
      /* headless / no body — ignore */
    }
    // A plugin disable/enable does NOT clean the canvas, so a previous instance
    // may have left its injected DOM behind (bar, capsule, old two-label badges).
    // Strip it now: we always start from a clean slate and re-inject with the
    // CURRENT build, instead of showing a stale layout.
    this.removeInjectedUI();
    this.addCommand({
      id: "canvas-mindmap-keyboard-show-build-tag",
      name: "显示插件构建版本 / show plugin build tag",
      callback: () => {
        new Notice(`canvas-mindmap-keyboard\nbuild: ${MM_BUILD_TAG}`, 10000);
      },
    });
  }
  // Everything this instance owns must be torn down, otherwise a raw
  // MutationObserver / DOM listener (Obsidian does NOT auto-remove either) keeps
  // running after unload and would fight the next instance — re-injecting the
  // previous build's DOM over the new one.
  onunload() {
    this.ensureMmState();
    try {
      this.mmObservers.forEach((o) => {
        try {
          o.disconnect();
        }
        catch (e) {
        }
      });
    }
    catch (e) {
    }
    this.mmObservers = [];
    try {
      this.mmListeners.forEach((rec) => {
        try {
          rec.el.removeEventListener(rec.type, rec.fn, rec.opts);
        }
        catch (e) {
        }
      });
    }
    catch (e) {
    }
    this.mmListeners = [];
    this.removeInjectedUI();
    // Legacy canvas-level flags written by builds that had no onunload: clear
    // them so they can never block a fresh instance from initialising.
    try {
      this.app.workspace.getLeavesOfType("canvas").forEach((leaf) => {
        const c = leaf && leaf.view && leaf.view.canvas;
        if (!c)
          return;
        delete c.__mmChecklistUI;
        delete c.__mmCollapseUI;
        delete c.__mmRestoreScheduled;
        delete c.__mmRestoreDone;
        delete c.__mmRelaidOut;
      });
    }
    catch (e) {
    }
  }
  removeInjectedUI() {
    this.ensureMmState();
    try {
      document.querySelectorAll(".mm-checklist-progress").forEach((el) => el.remove());
      document.querySelectorAll(".mm-collapse-btn").forEach((el) => el.remove());
      document.querySelectorAll(".canvas-node").forEach((el) => {
        el.classList.remove("mm-checklist-pie-mode");
        el.style.removeProperty("--mm-checklist-pie-w");
      });
    }
    catch (e) {
      /* headless / no document — ignore */
    }
  }
  async registerSettings() {
    this.settingTab = new MindMapSettingTab(this.app, this);
    this.addSettingTab(this.settingTab);
    await this.loadSettings();
  }
  async loadSettings() {
    const loadedData = await this.loadData() || {};
    const mergedSettings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
    const merge = (target, source) => {
      for (const key in source) {
        if (source.hasOwnProperty(key)) {
          if (typeof target[key] === "object" && target[key] !== null && !Array.isArray(target[key])) {
            merge(target[key], source[key]);
          } else {
            target[key] = source[key];
          }
        }
      }
    };
    merge(mergedSettings, loadedData);
    this.settings = mergedSettings;
  }
  async saveSettings() {
    await this.saveData(this.settings);
  }
  registerCommands() {
    this.addCommand({
      id: "canvas-mindmap-keyboard-global-relayout",
      name: "global relayout",
      callback: () => {
        const canvasView = this.app.workspace.getActiveFileView();
        const canvas = canvasView == null ? void 0 : canvasView.canvas;
        if (!canvas)
          return;
        this.relayoutCanvas(canvas);
      }
    });
    this.addCommand({
      id: "canvas-mindmap-keyboard-global-resize",
      name: "global resize",
      callback: () => {
        const canvasView = this.app.workspace.getActiveFileView();
        const canvas = canvasView == null ? void 0 : canvasView.canvas;
        if (!canvas)
          return;
        this.resizeAllNodes(canvas);
      }
    });
    this.addCommand({
      id: "canvas-mindmap-keyboard-global-resize-and-relayout",
      name: "global resize and relayout",
      callback: () => {
        const canvasView = this.app.workspace.getActiveFileView();
        const canvas = canvasView == null ? void 0 : canvasView.canvas;
        if (!canvas)
          return;
        this.resizeAllNodes(canvas).then(() => {
          this.relayoutCanvas(canvas);
        });
      }
    });
    this.addCommand({
      id: "canvas-mindmap-keyboard-toggle-collapse-expand",
      name: "collapse / expand node (toggle)",
      checkCallback: (checking) => {
        const canvasView = this.app.workspace.getActiveFileView();
        const canvas = canvasView == null ? void 0 : canvasView.canvas;
        if (!canvas || !this.settings.collapseEnabled)
          return false;
        if (!this.isMindmapCanvas(canvasView == null ? void 0 : canvasView))
          return false;
        let node = null;
        if (canvas.selection && canvas.selection.size > 0) {
          node = canvas.selection.values().next().value;
        }
        if (!node && canvas.editingNode) {
          node = canvas.editingNode;
        }
        if (!node || !node.id)
          return false;
        if (this.getChildrenNodes(canvas, node.id).length === 0)
          return false;
        if (checking)
          return true;
        this.toggleCollapseActiveNode(canvas);
        return true;
      }
    });
    this.addCommand({
      id: "canvas-mindmap-keyboard-relayout-selected-tree",
      name: "relayout selected tree",
      callback: () => {
        const canvasView = this.app.workspace.getActiveFileView();
        const canvas = canvasView == null ? void 0 : canvasView.canvas;
        this.relayoutSelectedTree(canvas);
      }
    });
  }
  createRootNode(canvas) {
    const nodes = Array.from(canvas.nodes.values());
    let minX = 0;
    let maxY = 0;
    if (nodes.length > 0) {
      minX = Math.min(...nodes.map((n) => n.x));
      maxY = Math.max(...nodes.map((n) => n.y + n.height));
    }
    maxY += this.settings.layout.verticalGap;
    const node = canvas.createTextNode({
      pos: {
        x: minX,
        y: maxY,
        height: this.settings.creatNode.height,
        width: this.settings.creatNode.width
      },
      size: {
        x: minX,
        y: maxY,
        height: this.settings.creatNode.height,
        width: this.settings.creatNode.width
      },
      text: "",
      focus: true,
      save: true
    });
    if (!node)
      return;
    canvas.addNode(node);
    canvas.requestSave();
    if (this.layoutLevelIsCanvas(canvas)) {
      this.debounceRelayoutCanvas(canvas);
    }
    canvas.selectOnly(node);
    canvas.zoomToSelection();
    setTimeout(() => {
      node.startEditing();
    }, 100);
  }
  getFocusedNodeId(canvas) {
    var _a, _b, _c;
    return (_c = (_b = (_a = canvas == null ? void 0 : canvas.selection) == null ? void 0 : _a.values().next().value) == null ? void 0 : _b.id) != null ? _c : null;
  }
  isFocusedNodeEditing(canvas) {
    return canvas.selection.values().next().value.isEditing;
  }
  createChildNode(canvas) {
    if (!(canvas == null ? void 0 : canvas.view) || !this.verifyCanvasLayout(canvas.view))
      return;
    if (canvas.selection.size !== 1)
      return;
    if (this.isFocusedNodeEditing(canvas))
      return;
    const focusedNodeId = this.getFocusedNodeId(canvas);
    if (!focusedNodeId)
      return;
    const data = canvas.getData();
    const nodes = (data == null ? void 0 : data.nodes) || [];
    const edges = (data == null ? void 0 : data.edges) || [];
    const currentNode = canvas.nodes.get(focusedNodeId);
    if (!currentNode)
      return;
    let newY;
    if (this.layoutLevelIsNo(canvas)) {
      newY = currentNode.y + currentNode.height / 2 - this.settings.creatNode.height / 2;
    } else {
      const childNodes = this.getChildrenNodes(canvas, focusedNodeId);
      if (childNodes.length > 0) {
        let maxBottom = -Infinity;
        for (const childNode of childNodes) {
          const bottom = childNode.y + childNode.height;
          if (bottom > maxBottom)
            maxBottom = bottom;
        }
        newY = maxBottom > -Infinity ? maxBottom : currentNode.y;
      } else {
        newY = currentNode.y + currentNode.height / 2 - this.settings.creatNode.height / 2;
      }
    }
    const childId = generateId(canvas);
    const newNode = {
      id: childId,
      children: [],
      text: "",
      type: "text",
      x: currentNode.x + currentNode.width + this.settings.layout.horizontalGap,
      y: newY,
      width: this.settings.creatNode.width,
      height: this.settings.creatNode.height
    };
    const newEdge = {
      id: generateId(canvas),
      fromNode: focusedNodeId,
      toNode: childId,
      fromSide: "right",
      toSide: "left"
    };
    canvas.importData({
      nodes: [...nodes, newNode],
      edges: [...edges, newEdge]
    });
    canvas.requestFrame();
    canvas.requestSave();
    const createdNode = canvas.nodes.get(childId);
    this.autoLayout(canvas, createdNode);
    canvas.selectOnly(createdNode);
    canvas.zoomToSelection();
    setTimeout(() => {
      createdNode.startEditing();
    }, 100);
  }
  createSiblingNode(canvas) {
    if (!(canvas == null ? void 0 : canvas.view) || !this.verifyCanvasLayout(canvas.view))
      return;
    if (canvas.selection.size === 0) {
      this.createRootNode(canvas);
      return;
    }
    if (canvas.selection.size !== 1)
      return;
    if (this.isFocusedNodeEditing(canvas))
      return;
    const focusedNodeId = this.getFocusedNodeId(canvas);
    if (!focusedNodeId)
      return;
    const data = canvas.getData();
    const nodes = (data == null ? void 0 : data.nodes) || [];
    const edges = (data == null ? void 0 : data.edges) || [];
    const currentNode = canvas.nodes.get(focusedNodeId);
    if (!currentNode)
      return;
    const parentNode = this.getParentNode(canvas, focusedNodeId);
    const parentNodeId = parentNode ? parentNode.id : null;
    const verticalGap = this.layoutLevelIsCanvas(canvas) || parentNode ? 0 : this.settings.layout.verticalGap;
    const siblingId = generateId(canvas);
    const newNode = {
      id: siblingId,
      parent: parentNodeId,
      children: [],
      text: "",
      type: "text",
      x: currentNode.x,
      y: currentNode.y + currentNode.height + verticalGap,
      width: this.settings.creatNode.width,
      height: this.settings.creatNode.height
    };
    const newEdge = {
      id: generateId(canvas),
      fromNode: parentNodeId,
      toNode: siblingId,
      fromSide: "right",
      toSide: "left"
    };
    canvas.importData({
      nodes: [...nodes, newNode],
      edges: [...edges, newEdge]
    });
    canvas.requestFrame();
    canvas.requestSave();
    const createdNode = canvas.nodes.get(siblingId);
    this.autoLayout(canvas, createdNode);
    canvas.selectOnly(createdNode);
    canvas.zoomToSelection();
    setTimeout(() => {
      createdNode.startEditing();
    }, 100);
  }
  startEditingNode(canvas) {
    if (!(canvas == null ? void 0 : canvas.view) || !this.verifyCanvasLayout(canvas.view))
      return;
    const selection = canvas.selection;
    if (selection.size === 0) {
      let nodes = canvas.getViewportNodes();
      if (!nodes || nodes.length === 0) {
        nodes = Array.from(canvas.nodes.values());
      }
      if (!nodes || nodes.length === 0)
        return;
      const bbox = canvas.getViewportBBox();
      const centerX = (bbox.minX + bbox.maxX) / 2;
      const centerY = (bbox.minY + bbox.maxY) / 2;
      let closestNode = null;
      let minDist = Number.POSITIVE_INFINITY;
      for (const n of nodes) {
        const nodeCenterX = n.x + n.width / 2;
        const nodeCenterY = n.y + n.height / 2;
        const dx = nodeCenterX - centerX;
        const dy = nodeCenterY - centerY;
        const dist = dx * dx + dy * dy;
        if (dist < minDist) {
          minDist = dist;
          closestNode = n;
        }
      }
      if (!closestNode)
        return;
      canvas.selectOnly(closestNode);
      canvas.zoomToSelection();
      return;
    }
    if (selection.size !== 1)
      return;
    const node = selection.values().next().value;
    if ((node == null ? void 0 : node.label) || (node == null ? void 0 : node.url))
      return;
    if (node.isEditing)
      return;
    node.startEditing();
    canvas.zoomToSelection();
  }
  deleteNode(canvas) {
    if (!(canvas == null ? void 0 : canvas.view) || !this.verifyCanvasLayout(canvas.view))
      return;
    if (canvas.selection.size !== 1)
      return;
    if (this.isFocusedNodeEditing(canvas))
      return;
    const focusedNodeId = this.getFocusedNodeId(canvas);
    if (!focusedNodeId)
      return;
    const parentNode = this.getParentNode(canvas, focusedNodeId);
    const data = canvas.getData ? canvas.getData() : {
      nodes: Array.from(canvas.nodes.values()),
      edges: Array.from(canvas.edges.values())
    };
    const edges = data.edges || [];
    const childrenMap = {};
    edges.forEach((e) => {
      if (e.color)
        return;
      if (!childrenMap[e.fromNode])
        childrenMap[e.fromNode] = [];
      childrenMap[e.fromNode].push(e.toNode);
    });
    const subtreeNodeIds = [];
    const collectNodeIds = (id) => {
      if (subtreeNodeIds.includes(id))
        return;
      subtreeNodeIds.push(id);
      const children = childrenMap[id] || [];
      children.forEach(collectNodeIds);
    };
    collectNodeIds(focusedNodeId);
    subtreeNodeIds.forEach((id) => {
      const node = canvas.nodes.get(id);
      if (node) {
        canvas.removeNode(node);
      }
    });
    canvas.requestFrame();
    canvas.requestSave();
    if (parentNode) {
      setTimeout(() => {
        this.autoLayout(canvas, parentNode);
        canvas.selectOnly(parentNode);
        canvas.zoomToSelection();
      }, 0);
    }
  }
  getParentNode(canvas, nodeId) {
    let selectedItem = canvas.nodes.get(nodeId);
    let incomingEdges = canvas.getEdgesForNode(selectedItem).filter((e) => e.to.node.id === selectedItem.id && !e.color);
    let parentNode = incomingEdges.length > 0 ? incomingEdges[0].from.node : null;
    return parentNode;
  }
  getChildrenNodes(canvas, nodeId) {
    let selectedItem = canvas.nodes.get(nodeId);
    let outgoingEdges = canvas.getEdgesForNode(selectedItem).filter((e) => e.from.node.id === selectedItem.id && !e.color);
    let childrenNodes = outgoingEdges.map((e) => e.to.node);
    return childrenNodes;
  }
  getCollapsedSetForCanvas(canvas) {
    var _a;
    const file = (_a = canvas == null ? void 0 : canvas.view) == null ? void 0 : _a.file;
    const key = file == null ? void 0 : file.name;
    const arr = key && this.settings.collapsedNodes && this.settings.collapsedNodes[key] ? this.settings.collapsedNodes[key] : [];
    return new Set(arr);
  }
  isNodeCollapsed(canvas, nodeId) {
    return this.getCollapsedSetForCanvas(canvas).has(nodeId);
  }
  getDescendantIds(canvas, nodeId) {
    const data = canvas.getData ? canvas.getData() : {
      nodes: Array.from(canvas.nodes.values()),
      edges: Array.from(canvas.edges.values())
    };
    const edges = (data == null ? void 0 : data.edges) || [];
    const childrenMap = {};
    edges.forEach((e) => {
      if (e.color)
        return;
      if (!childrenMap[e.fromNode])
        childrenMap[e.fromNode] = [];
      childrenMap[e.fromNode].push(e.toNode);
    });
    const result = [];
    const visited = new Set();
    const stack = [nodeId];
    while (stack.length) {
      const id = stack.pop();
      const children = childrenMap[id] || [];
      for (const c of children) {
        if (!visited.has(c)) {
          visited.add(c);
          result.push(c);
          stack.push(c);
        }
      }
    }
    return result;
  }
  getHiddenNodeSet(canvas) {
    const collapsed = this.getCollapsedSetForCanvas(canvas);
    const hidden = new Set();
    for (const id of collapsed) {
      for (const d of this.getDescendantIds(canvas, id)) {
        hidden.add(d);
      }
    }
    return hidden;
  }
  setNodeCollapsed(canvas, nodeId, collapsed) {
    this.applyCollapseChange(canvas, collapsed ? [nodeId] : [], collapsed ? [] : [nodeId]);
  }
  applyCollapseChange(canvas, collapseIds, expandIds) {
    var _a;
    if (!this.isMindmapCanvas(canvas.view != null ? canvas.view : null))
      return false;
    const file = (_a = canvas == null ? void 0 : canvas.view) == null ? void 0 : _a.file;
    const key = file == null ? void 0 : file.name;
    if (!key)
      return false;
    if (!this.settings.collapsedNodes)
      this.settings.collapsedNodes = {};
    if (!this.settings.collapsedNodes[key])
      this.settings.collapsedNodes[key] = [];
    const arr = this.settings.collapsedNodes[key];
    for (const id of expandIds || []) {
      const idx = arr.indexOf(id);
      if (idx !== -1)
        arr.splice(idx, 1);
    }
    for (const id of collapseIds || []) {
      if (id && arr.indexOf(id) === -1)
        arr.push(id);
    }
    this.saveSettings();
    this.injectCollapseButtons(canvas);
    this.applyCollapseVisibility(canvas);
    this.relayoutAffectedTrees(canvas, (collapseIds || []).concat(expandIds || []));
    return true;
  }
  collapseNodeAll(canvas, nodeId) {
    return this.applyCollapseChange(canvas, [nodeId], []);
  }
  expandNodeAll(canvas, nodeId) {
    return this.applyCollapseChange(canvas, [], [nodeId].concat(this.getDescendantIds(canvas, nodeId)));
  }
  expandNodeNextLevel(canvas, nodeId) {
    const childIds = (this.getChildrenNodes(canvas, nodeId) || []).map((n) => n == null ? void 0 : n.id).filter(Boolean);
    const toCollapse = childIds.filter((id) => this.getChildrenNodes(canvas, id).length > 0);
    return this.applyCollapseChange(canvas, toCollapse, [nodeId]);
  }
  toggleCollapseNode(canvas, nodeId) {
    if (!this.isMindmapCanvas(canvas.view != null ? canvas.view : null))
      return;
    if (this.isNodeCollapsed(canvas, nodeId))
      this.expandNodeNextLevel(canvas, nodeId);
    else
      this.collapseNodeAll(canvas, nodeId);
  }
  applyCollapseVisibility(canvas) {
    if (!(canvas == null ? void 0 : canvas.nodes))
      return;
    if (!this.isMindmapCanvas(canvas.view != null ? canvas.view : null))
      return;
    const hidden = this.getHiddenNodeSet(canvas);
    canvas.nodes.forEach((node) => {
      const el = node == null ? void 0 : node.nodeEl;
      if (!el || !el.style)
        return;
      if (hidden.has(node.id))
        el.style.display = "none";
      else
        el.style.removeProperty("display");
    });
    const setElHidden = (el, hide) => {
      if (!el || !el.style)
        return;
      if (hide)
        el.style.display = "none";
      else
        el.style.removeProperty("display");
    };
    if (canvas.edges && typeof canvas.edges.forEach === "function") {
      canvas.edges.forEach((edge) => {
        var _a, _b;
        const fromId = ((_a = edge == null ? void 0 : edge.from) == null ? void 0 : _a.node) ? edge.from.node.id : edge == null ? void 0 : edge.fromNode;
        const toId = ((_b = edge == null ? void 0 : edge.to) == null ? void 0 : _b.node) ? edge.to.node.id : edge == null ? void 0 : edge.toNode;
        const hide = hidden.has(fromId) || hidden.has(toId);
        setElHidden(edge.lineGroupEl, hide);
        setElHidden(edge.lineEndGroupEl, hide);
        const _lbl = edge.labelElement;
        setElHidden(_lbl && (_lbl.wrapperEl || _lbl.labelEl || _lbl.el || _lbl.containerEl), hide);
      });
    }
  }
  injectCollapseButtons(canvas) {
    if (!(canvas == null ? void 0 : canvas.nodes))
      return;
    if (!this.settings.collapseEnabled) {
      canvas.nodes.forEach((n) => {
        const btn = n && n.nodeEl ? n.nodeEl.querySelector(".mm-collapse-btn") : null;
        if (btn)
          btn.remove();
      });
      return;
    }
    if (!this.isMindmapCanvas(canvas.view != null ? canvas.view : null)) {
      canvas.nodes.forEach((n) => {
        const btn = n && n.nodeEl ? n.nodeEl.querySelector(".mm-collapse-btn") : null;
        if (btn)
          btn.remove();
      });
      return;
    }
    const collapsedSet = this.getCollapsedSetForCanvas(canvas);
    const expColor = this.settings.collapseColorExpanded || "#8b9aaf";
    const colColor = this.settings.collapseColorCollapsed || "#18b8a6";
    let injectedCount = 0;
    canvas.nodes.forEach((node) => {
      const el = node == null ? void 0 : node.nodeEl;
      const id = node == null ? void 0 : node.id;
      if (!el || !id)
        return;
      const children = this.getChildrenNodes(canvas, id);
      const hasChildren = children.length > 0;
      let btn = el.querySelector(".mm-collapse-btn");
      if (!hasChildren) {
        if (btn)
          btn.remove();
        return;
      }
      if (!btn) {
        btn = document.createElement("div");
        btn.className = "mm-collapse-btn";
        btn.setAttribute("data-mm-node", id);
        el.appendChild(btn);
        injectedCount++;
      }
      if (!btn.hasAttribute("data-mm-bound")) {
        btn.setAttribute("data-mm-bound", "1");
        const doToggle = () => {
          const nid = btn.getAttribute("data-mm-node");
          if (!nid)
            return;
          this.toggleCollapseNode(canvas, nid);
        };
        btn.addEventListener("pointerdown", (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          btn.__mmLastToggle = Date.now();
          doToggle();
        });
        btn.addEventListener("click", (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          const last = btn.__mmLastToggle || 0;
          if (Date.now() - last < 400)
            return;
          btn.__mmLastToggle = Date.now();
          doToggle();
        });
      }
      const isCol = collapsedSet.has(id);
      const stateStr = isCol ? "1" : "0";
      if (btn.getAttribute("data-mm-state") !== stateStr) {
        btn.setAttribute("data-mm-state", stateStr);
        btn.textContent = isCol ? "+" : "\u2212";
        btn.classList.toggle("collapsed", isCol);
        btn.style.background = isCol ? expColor : colColor;
      }
    });
    if (injectedCount > 0) {
      console.log("[canvas-mindmap-keyboard] injected " + injectedCount + " collapse buttons");
    }
  }
  refreshCollapseButtonStyles() {
    var _a;
    const view = (_a = this.app.workspace.getActiveFileView()) != null ? _a : null;
    if (view && view.canvas) {
      this.injectCollapseButtons(view.canvas);
    }
    const leaves = this.app.workspace.getLeavesOfType("canvas");
    leaves.forEach((leaf) => {
      const cv = leaf.view;
      if (cv && cv.canvas && cv !== view) {
        this.injectCollapseButtons(cv.canvas);
      }
    });
  }
  injectChecklistProgress(canvas) {
    if (!(canvas == null ? void 0 : canvas.nodes))
      return;
    const enabled = this.settings.checklistProgress && this.settings.checklistProgress.enabled;
    if (!enabled) {
      canvas.nodes.forEach((n) => {
        const el = n && n.nodeEl ? n.nodeEl : null;
        if (!el)
          return;
        const indicator = el.querySelector(".mm-checklist-progress");
        if (indicator)
          indicator.remove();
        el.classList.remove("mm-checklist-pie-mode");
        el.style.removeProperty("--mm-checklist-pie-w");
      });
      return;
    }
    // 进度条功能对所有画布生效，不依赖 fileNameInclude 门控
    const style = (this.settings.checklistProgress.style || "bar");
    canvas.nodes.forEach((node) => {
      const el = node == null ? void 0 : node.nodeEl;
      const text = node == null ? void 0 : node.text;
      if (!el)
        return;
      const progress = parseChecklistProgress(text);
      let indicator = el.querySelector(".mm-checklist-progress");
      if (!progress) {
        if (indicator)
          indicator.remove();
        el.classList.remove("mm-checklist-pie-mode");
        el.style.removeProperty("--mm-checklist-pie-w");
        return;
      }
      const cfg = this.settings.checklistProgress || {};
      // Any setting that affects the rendered indicator must be part of the
      // signature, otherwise changing it in the settings tab would not refresh
      // the already-rendered bar/capsule.
      const sig = [
        // The build tag is part of the signature ON PURPOSE: when the plugin is
        // updated, every previously-rendered indicator must be rebuilt, even if
        // the ratio and all settings are unchanged. Without this, Obsidian keeps
        // the old DOM node (e.g. a counter still pinned to the top-left by an
        // older build) and the new positioning never appears — which is exactly
        // what made earlier rounds look "not applied".
        MM_BUILD_TAG,
        style,
        progress.ratio,
        cfg.showCount !== false,
        cfg.showPercentAtJunction === true,
        cfg.barLength != null ? cfg.barLength : 95,
        cfg.barHeight || 8,
        cfg.barColorDone || "",
        cfg.barColorTodo || "",
      ].join("|");
      if (!indicator || indicator.getAttribute("data-mm-sig") !== sig) {
        if (indicator)
          indicator.remove();
        indicator = style === "pie" ? createProgressPie(progress, this.settings) : createProgressBar(progress, this.settings, el);
        indicator.classList.add("mm-checklist-progress");
        indicator.setAttribute("data-mm-sig", sig);
        el.appendChild(indicator);
      }
      // pie 模式下把节点内容向右推开（仅半个饼图宽度），避免饼图与标题重叠
      if (style === "pie") {
        el.classList.add("mm-checklist-pie-mode");
        const pieW = (this.settings.checklistProgress && this.settings.checklistProgress.pieSize) || 14;
        el.style.setProperty("--mm-checklist-pie-w", `${pieW}px`);
      } else {
        el.classList.remove("mm-checklist-pie-mode");
        el.style.removeProperty("--mm-checklist-pie-w");
      }
    });
  }
  refreshChecklistProgress() {
    var _a;
    const view = (_a = this.app.workspace.getActiveFileView()) != null ? _a : null;
    if (view && view.canvas) {
      this.injectChecklistProgress(view.canvas);
    }
    const leaves = this.app.workspace.getLeavesOfType("canvas");
    leaves.forEach((leaf) => {
      const cv = leaf.view;
      if (cv && cv.canvas && cv !== view) {
        this.injectChecklistProgress(cv.canvas);
      }
    });
  }
  setupChecklistProgressUI(canvas, retryCount = 0) {
    this.ensureMmState();
    if (!canvas)
      return;
    if (!canvas.wrapperEl) {
      if (retryCount < 25) {
        setTimeout(() => this.setupChecklistProgressUI(canvas, retryCount + 1), 120);
      }
      return;
    }
    if (this.mmChecklistUI.has(canvas))
      return;
    this.mmChecklistUI.add(canvas);
    const self = this;
    const doInject = () => self.injectChecklistProgress(canvas);
    let scheduled = false;
    const schedule = () => {
      if (scheduled)
        return;
      scheduled = true;
      requestAnimationFrame(() => {
        scheduled = false;
        doInject();
      });
    };
    const observer = new MutationObserver(schedule);
    observer.observe(canvas.wrapperEl, { childList: true, subtree: true, attributes: true });
    this.mmObservers.push(observer);
    doInject();
    [50, 100, 200, 400, 800, 1500, 2500].forEach((d) => setTimeout(doInject, d));
    const onMouseOver = () => {
      requestAnimationFrame(() => doInject());
    };
    canvas.wrapperEl.addEventListener("mouseover", onMouseOver, { passive: true });
    this.mmListeners.push({ el: canvas.wrapperEl, type: "mouseover", fn: onMouseOver, opts: { passive: true } });
  }
  setupCollapseUI(canvas, retryCount = 0) {
    var _a;
    this.ensureMmState();
    if (!canvas)
      return;
    if (!this.isMindmapCanvas(canvas.view != null ? canvas.view : null))
      return;
    if (!canvas.wrapperEl) {
      if (retryCount < 25) {
        setTimeout(() => this.setupCollapseUI(canvas, retryCount + 1), 120);
      }
      return;
    }
    if (this.mmCollapseUI.has(canvas))
      return;
    this.mmCollapseUI.add(canvas);
    const self = this;
    const doInject = () => {
      self.injectCollapseButtons(canvas);
      self.applyCollapseVisibility(canvas);
      self.injectChecklistProgress(canvas);
    };
    let scheduled = false;
    const schedule = () => {
      if (scheduled)
        return;
      scheduled = true;
      requestAnimationFrame(() => {
        scheduled = false;
        doInject();
      });
    };
    const observer = new MutationObserver(schedule);
    observer.observe(canvas.wrapperEl, { childList: true, subtree: true, attributes: true });
    this.mmObservers.push(observer);
    doInject();
    [50, 100, 200, 400, 800, 1500, 2500].forEach((d) => setTimeout(doInject, d));
    this.scheduleCollapseRestore(canvas);
    this.setupDragReattach(canvas);
    let lastMouseInject = 0;
    const onMouseOver = () => {
      const now = Date.now();
      if (now - lastMouseInject < 500)
        return;
      lastMouseInject = now;
      requestAnimationFrame(() => { doInject(); });
    };
    canvas.wrapperEl.addEventListener("mouseover", onMouseOver, { passive: true });
    this.mmListeners.push({ el: canvas.wrapperEl, type: "mouseover", fn: onMouseOver, opts: { passive: true } });
  }
  scheduleCollapseRestore(canvas) {
    this.ensureMmState();
    if (!canvas || this.mmRestoreScheduled.has(canvas))
      return;
    this.mmRestoreScheduled.add(canvas);
    const tryRestore = (attempt) => {
      if (this.mmRestoreDone.has(canvas))
        return;
      const loaded = canvas.nodes && canvas.nodes.size > 0;
      if (loaded) {
        const collapsed = this.getCollapsedSetForCanvas(canvas);
        this.injectCollapseButtons(canvas);
        this.applyCollapseVisibility(canvas);
        if (collapsed.size > 0 && !this.mmRelaidOut.has(canvas)) {
          this.mmRelaidOut.add(canvas);
          try {
            this.relayoutAffectedTrees(canvas, Array.from(collapsed));
          } catch (err) {
            console.error("[canvas-mindmap-keyboard] restore relayout failed:", err);
          }
          setTimeout(() => {
            this.injectCollapseButtons(canvas);
            this.applyCollapseVisibility(canvas);
          }, 350);
        }
        this.mmRestoreDone.add(canvas);
        return;
      }
      if (attempt < 40) {
        setTimeout(() => tryRestore(attempt + 1), 100);
      }
    };
    tryRestore(0);
  }
  ensureCollapseUIForAllLeaves() {
    const leaves = this.app.workspace.getLeavesOfType("canvas");
    leaves.forEach((leaf) => {
      const cv = leaf.view;
      if (cv && cv.canvas) {
        this.setupChecklistProgressUI(cv.canvas);
        if (this.isMindmapCanvas(cv)) {
          this.setupCollapseUI(cv.canvas);
          this.scheduleCollapseRestore(cv.canvas);
        }
      }
    });
  }
  registerCanvasNodeMenu() {
    this.registerEvent(this.app.workspace.on("canvas:node-menu", (menu, node) => {
      var _a, _b;
      if (!this.settings.collapseEnabled)
        return;
      const canvasView = this.app.workspace.getActiveFileView();
      const canvas = canvasView == null ? void 0 : canvasView.canvas;
      if (!canvas || !this.isMindmapCanvas(canvasView))
        return;
      const nodeId = node == null ? void 0 : node.id;
      if (!nodeId || !(canvas.nodes && canvas.nodes.has(nodeId)))
        return;
      // 移动端友好：任何节点右键都能加子级/同级（等价 Tab/Enter 键）
      menu.addItem((item) => item.setTitle("+子级").setIcon("indent").onClick(() => {
        this.createChildNode(canvas);
      }));
      menu.addItem((item) => item.setTitle("+同级").setIcon("outdent").onClick(() => {
        this.createSiblingNode(canvas);
      }));
      // 原右键菜单项（折叠/展开/展开下级）始终保留并显示在最底部
      menu.addSeparator();
      menu.addItem((item) => item.setTitle("\u6298\u53e0").setIcon("minus-circle").onClick(() => {
        this.collapseNodeAll(canvas, nodeId);
      }));
      menu.addItem((item) => item.setTitle("\u5c55\u5f00").setIcon("plus-circle").onClick(() => {
        this.expandNodeAll(canvas, nodeId);
      }));
      menu.addItem((item) => item.setTitle("\u5c55\u5f00\u4e0b\u7ea7").setIcon("chevron-right").onClick(() => {
        this.expandNodeNextLevel(canvas, nodeId);
      }));
    }));
  }
  isMindmapCanvas(canvasView) {
    if (!canvasView)
      return false;
    const include = this.settings.condition.fileNameInclude;
    const name = canvasView.file ? canvasView.file.name : "";
    if (include !== "" && !name.includes(include))
      return false;
    return true;
  }
  toggleCollapseActiveNode(canvas) {
    if (!canvas || !this.settings.collapseEnabled)
      return;
    if (!this.isMindmapCanvas(canvas.view != null ? canvas.view : null))
      return;
    let node = null;
    if (canvas.selection && canvas.selection.size > 0) {
      node = canvas.selection.values().next().value;
    }
    if (!node && canvas.editingNode) {
      node = canvas.editingNode;
    }
    if (!node)
      return;
    const children = this.getChildrenNodes(canvas, node.id);
    if (children.length === 0)
      return;
    this.toggleCollapseNode(canvas, node.id);
  }
  getNavigateNodebyFocusNode(canvas, selectedItem, direction) {
    let targetNode = null;
    switch (direction) {
      case "ArrowLeft":
        targetNode = this.getParentNode(canvas, selectedItem.id);
        break;
      case "ArrowRight":
        const childrenNodes = this.getChildrenNodes(canvas, selectedItem.id);
        if (childrenNodes.length > 0) {
          const bestChild = childrenNodes.reduce((min, cur) => {
            return cur.y < min.y ? cur : min;
          }, childrenNodes[0]);
          targetNode = bestChild;
        }
        break;
      case "ArrowUp":
      case "ArrowDown":
        const parentNode = this.getParentNode(canvas, selectedItem.id);
        if (!parentNode) {
          const nodesArr = Array.from(canvas.nodes.values());
          const allEdges = Array.from(canvas.edges.values());
          const childIds = allEdges.map((e) => {
            var _a;
            return e.to.node ? e.to.node.id : (_a = e.toNode) != null ? _a : null;
          }).filter(Boolean);
          const rootNodes = nodesArr.filter((n) => !childIds.includes(n.id));
          rootNodes.sort((a, b) => a.y - b.y);
          const index2 = rootNodes.findIndex((n) => n.id === selectedItem.id);
          if (index2 === -1)
            break;
          if (direction === "ArrowUp" && index2 > 0)
            targetNode = rootNodes[index2 - 1];
          if (direction === "ArrowDown" && index2 < rootNodes.length - 1)
            targetNode = rootNodes[index2 + 1];
          break;
        }
        const siblingNodes = this.getChildrenNodes(canvas, parentNode.id);
        const siblings = siblingNodes.sort((a, b) => a.y - b.y);
        const index = siblings.findIndex((n) => n.id === selectedItem.id);
        if (index === -1)
          break;
        if (direction === "ArrowUp" && index > 0)
          targetNode = siblings[index - 1];
        if (direction === "ArrowDown" && index < siblings.length - 1)
          targetNode = siblings[index + 1];
        break;
    }
    return targetNode;
  }
  navigate(canvas, direction) {
    if (!(canvas == null ? void 0 : canvas.view) || !this.verifyCanvasLayout(canvas.view))
      return;
    const selected = canvas.selection;
    if (selected.size !== 1 || this.isFocusedNodeEditing(canvas))
      return;
    const currentNode = selected.values().next().value;
    const targetNode = this.getNavigateNodebyFocusNode(canvas, currentNode, direction);
    if (targetNode) {
      canvas.selectOnly(targetNode);
      canvas.zoomToSelection();
    }
  }
  navigateUtilEnd(canvas, direction) {
    if (!(canvas == null ? void 0 : canvas.view) || !this.verifyCanvasLayout(canvas.view))
      return;
    const selected = canvas.selection;
    if (selected.size !== 1 || this.isFocusedNodeEditing(canvas))
      return;
    const currentNode = selected.values().next().value;
    let lastNode = currentNode;
    const visited = /* @__PURE__ */ new Set();
    visited.add(currentNode.id);
    while (true) {
      const nextNode = this.getNavigateNodebyFocusNode(canvas, lastNode, direction);
      if (!nextNode || visited.has(nextNode.id)) {
        break;
      }
      visited.add(nextNode.id);
      lastNode = nextNode;
    }
    if (lastNode && lastNode !== currentNode) {
      canvas.selectOnly(lastNode);
      canvas.zoomToSelection();
    }
  }
  getNextNodeInFreeMode(canvas, direction, currentNode) {
    const targetNode = this.getNavigateNodebyFocusNode(canvas, currentNode, direction);
    if (targetNode) {
      return targetNode;
    }
    let nodes = [];
    if (direction === "ArrowRight") {
      const parentNode = this.getParentNode(canvas, currentNode.id);
      if (parentNode) {
        let collectDescendants = function(nodeId, canvas2, visited2) {
          const descendants = [];
          if (visited2.has(nodeId))
            return descendants;
          visited2.add(nodeId);
          const children = self.getChildrenNodes(canvas2, nodeId);
          for (const child of children) {
            if (!visited2.has(child.id)) {
              descendants.push(child);
              descendants.push(...collectDescendants(child.id, canvas2, visited2));
            }
          }
          return descendants;
        };
        const childrenNodes = this.getChildrenNodes(canvas, parentNode.id);
        const siblings = childrenNodes.filter((n) => n.id !== currentNode.id);
        const visited = /* @__PURE__ */ new Set();
        visited.add(currentNode.id);
        const self = this;
        for (const sib of siblings) {
          nodes.push(...collectDescendants(sib.id, canvas, visited));
        }
      }
    }
    nodes = nodes.length === 0 ? Array.from(canvas.nodes.values()).filter((n) => n.id !== currentNode.id) : nodes;
    if (nodes.length === 0)
      return;
    let candidates = nodes.filter((node) => {
      switch (direction) {
        case "ArrowUp":
          return node.y + node.height < currentNode.y;
        case "ArrowDown":
          return node.y > currentNode.y + currentNode.height;
        case "ArrowLeft":
          return node.x + node.width < currentNode.x;
        case "ArrowRight":
          return node.x > currentNode.x + currentNode.width;
        default:
          return false;
      }
    });
    if (candidates.length === 0)
      return;
    let betweenNodes = [];
    if (direction === "ArrowUp" || direction === "ArrowDown") {
      const xMin = currentNode.x;
      const xMax = currentNode.x + currentNode.width;
      betweenNodes = candidates.filter((node) => {
        const nodeLeft = node.x;
        const nodeRight = node.x + node.width;
        return nodeRight >= xMin && nodeLeft <= xMax;
      });
    } else if (direction === "ArrowLeft" || direction === "ArrowRight") {
      const yMin = currentNode.y;
      const yMax = currentNode.y + currentNode.height;
      betweenNodes = candidates.filter((node) => {
        const nodeTop = node.y;
        const nodeBottom = node.y + node.height;
        return nodeBottom >= yMin && nodeTop <= yMax;
      });
    }
    let bestNode = null;
    let minSegmentDist = Number.POSITIVE_INFINITY;
    for (const node of betweenNodes) {
      const segDist = this.closestSegmentLength(currentNode, node);
      if (segDist < minSegmentDist) {
        minSegmentDist = segDist;
        bestNode = node;
      }
    }
    if (!bestNode) {
      let minRangeDist = Number.POSITIVE_INFINITY;
      let bestRangeNode = null;
      if (direction === "ArrowUp" || direction === "ArrowDown") {
        const x1 = currentNode.x;
        const x2 = currentNode.x + currentNode.width;
        for (const node of candidates) {
          const nx1 = node.x;
          const nx2 = node.x + node.width;
          let dist = 0;
          if (x2 < nx1) {
            dist = nx1 - x2;
          } else if (x1 > nx2) {
            dist = x1 - nx2;
          } else {
            dist = 0;
          }
          if (dist < minRangeDist) {
            minRangeDist = dist;
            bestRangeNode = node;
          }
        }
      } else if (direction === "ArrowLeft" || direction === "ArrowRight") {
        const y1 = currentNode.y;
        const y2 = currentNode.y + currentNode.height;
        for (const node of candidates) {
          const ny1 = node.y;
          const ny2 = node.y + node.height;
          let dist = 0;
          if (y2 < ny1) {
            dist = ny1 - y2;
          } else if (y1 > ny2) {
            dist = y1 - ny2;
          } else {
            dist = 0;
          }
          if (dist < minRangeDist) {
            minRangeDist = dist;
            bestRangeNode = node;
          }
        }
      }
      if (bestRangeNode)
        bestNode = bestRangeNode;
    }
    return bestNode;
  }
  freeNavigate(canvas, direction) {
    if (!(canvas == null ? void 0 : canvas.view) || !this.verifyCanvasLayout(canvas.view))
      return;
    const selected = canvas.selection;
    if (selected.size !== 1 || this.isFocusedNodeEditing(canvas))
      return;
    const currentNode = selected.values().next().value;
    const bestNode = this.getNextNodeInFreeMode(canvas, direction, currentNode);
    if (!bestNode)
      return;
    canvas.selectOnly(bestNode);
    canvas.zoomToSelection();
  }
  freeNavigateUtilEnd(canvas, direction) {
    if (!(canvas == null ? void 0 : canvas.view) || !this.verifyCanvasLayout(canvas.view))
      return;
    const selected = canvas.selection;
    if (selected.size !== 1 || this.isFocusedNodeEditing(canvas))
      return;
    const currentNode = selected.values().next().value;
    let lastNode = currentNode;
    const visited = /* @__PURE__ */ new Set();
    visited.add(currentNode.id);
    while (true) {
      const nextNode = this.getNextNodeInFreeMode(canvas, direction, lastNode);
      if (!nextNode || visited.has(nextNode.id)) {
        break;
      }
      visited.add(nextNode.id);
      lastNode = nextNode;
    }
    if (lastNode && lastNode !== currentNode) {
      canvas.selectOnly(lastNode);
      canvas.zoomToSelection();
    }
  }
  async resizeAllNodes(canvas) {
    var _a, _b, _c, _d, _e;
    const nodes = Array.from(canvas.nodes.values());
    for (const node of nodes) {
      if (((_a = node.text) == null ? void 0 : _a.trim().length) === 0 || node.file)
        continue;
      node.canvas.selectOnly(node);
      node.canvas.zoomToSelection();
      let attempt = 0;
      while (attempt < 10) {
        await new Promise(requestAnimationFrame);
        await new Promise(requestAnimationFrame);
        if ((_e = (_d = (_c = (_b = node.child) == null ? void 0 : _b.previewMode) == null ? void 0 : _c.renderer) == null ? void 0 : _d.previewEl) == null ? void 0 : _e.isConnected) {
          if (this.resizeNode(node, "bottom") === 1) {
            await new Promise(requestAnimationFrame);
            continue;
          }
          canvas.requestFrame();
          canvas.requestSave();
          break;
        }
        attempt++;
      }
    }
  }
  relayoutCanvas(canvas) {
    if (this.inRelayoutCanvasSet.has(canvas))
      return;
    this.inRelayoutCanvasSet.add(canvas);
    try {
      const data = canvas.getData();
      const nodeMap = new Map(data.nodes.map((n) => [n.id, n]));
      const edges = data.edges;
      const noColorEdges = edges.filter((e) => !e.color);
      const childrenMap = {};
      noColorEdges.forEach((e) => {
        if (!childrenMap[e.fromNode])
          childrenMap[e.fromNode] = [];
        childrenMap[e.fromNode].push(e.toNode);
      });
      const allIds = Array.from(nodeMap.keys());
      const childIds = noColorEdges.map((e) => e.toNode);
      const rootIds = allIds.filter((id) => !childIds.includes(id));
      if (rootIds.length === 0) {
        return;
      }
      const horizontalGap = this.settings.layout.horizontalGap;
      const verticalGap = this.settings.layout.verticalGap;
      rootIds.sort((a, b) => {
        var _a, _b;
        const nodeA = nodeMap.get(a);
        const nodeB = nodeMap.get(b);
        return ((_a = nodeA == null ? void 0 : nodeA.y) != null ? _a : 0) - ((_b = nodeB == null ? void 0 : nodeB.y) != null ? _b : 0);
      });
      const collapsedSet = this.getCollapsedSetForCanvas(canvas);
      let nodeHeightMap = this.getSubtreeHeightMap(nodeMap, childrenMap, rootIds, verticalGap, collapsedSet);
      const rootNode = nodeMap.get(rootIds[0]);
      const treeHeight = nodeHeightMap.get(rootIds[0]) || rootNode.height;
      let startY = rootNode.y + (rootNode.height - treeHeight) / 2;
      const visited = /* @__PURE__ */ new Set();
      for (const rootId of rootIds) {
        this.layoutNode(rootId, rootNode.x, startY, nodeMap, nodeHeightMap, childrenMap, horizontalGap, verticalGap, visited, collapsedSet);
        const rootHeight = nodeHeightMap.get(rootId) || 0;
        startY += rootHeight + verticalGap;
      }
      canvas.importData({
        nodes: data.nodes,
        edges
      });
      canvas.requestFrame();
      canvas.requestSave();
      requestAnimationFrame(() => this.applyCollapseVisibility(canvas));
    } finally {
      this.inRelayoutCanvasSet.delete(canvas);
    }
  }
  relayoutOneTree(node) {
    if (!node)
      return;
    const canvas = node.canvas;
    if (!canvas || !canvas.nodes.get(node.id))
      return;
    if (this.inRelayoutCanvasSet.has(canvas))
      return;
    this.inRelayoutCanvasSet.add(canvas);
    try {
      const data = canvas.getData();
      const nodeMap = new Map(data.nodes.map((n) => [n.id, n]));
      const edges = data.edges;
      const childrenMap = {};
      edges.forEach((e) => {
        if (e.color)
          return;
        if (!childrenMap[e.fromNode])
          childrenMap[e.fromNode] = [];
        childrenMap[e.fromNode].push(e.toNode);
      });
      let rootId = node.id;
      const visited = /* @__PURE__ */ new Set();
      let parentNode = this.getParentNode(canvas, rootId);
      while (parentNode && !visited.has(parentNode.id)) {
        visited.add(parentNode.id);
        rootId = parentNode.id;
        parentNode = this.getParentNode(canvas, rootId);
      }
      const horizontalGap = this.settings.layout.horizontalGap;
      const verticalGap = this.settings.layout.verticalGap;
      const collapsedSet = this.getCollapsedSetForCanvas(canvas);
      let nodeHeightMap = this.getSubtreeHeightMap(nodeMap, childrenMap, [rootId], verticalGap, collapsedSet);
      const rootNode = nodeMap.get(rootId);
      const treeHeight = nodeHeightMap.get(rootId) || rootNode.height;
      let startY = rootNode.y + (rootNode.height - treeHeight) / 2;
      const visited2 = /* @__PURE__ */ new Set();
      this.layoutNode(rootId, rootNode.x, startY, nodeMap, nodeHeightMap, childrenMap, horizontalGap, verticalGap, visited2, collapsedSet);
      canvas.importData({
        nodes: data.nodes,
        edges
      });
      canvas.requestFrame();
      canvas.requestSave();
      requestAnimationFrame(() => this.applyCollapseVisibility(canvas));
    } finally {
      this.inRelayoutCanvasSet.delete(canvas);
    }
  }
  relayoutSelectedTree(canvas) {
    if (!canvas)
      return;
    if (canvas.selection.size === 0)
      return;
    const rootIds = /* @__PURE__ */ new Set();
    const visited = /* @__PURE__ */ new Set();
    for (const node of canvas.selection.values()) {
      let rootId = node.id;
      let parentNode = this.getParentNode(canvas, rootId);
      while (parentNode && !visited.has(parentNode.id)) {
        visited.add(parentNode.id);
        rootId = parentNode.id;
        parentNode = this.getParentNode(canvas, rootId);
      }
      rootIds.add(rootId);
    }
    for (const rootId of rootIds) {
      const rootNode = canvas.nodes.get(rootId);
      if (rootNode) {
        this.relayoutOneTree(rootNode);
      }
    }
  }
  // 折叠/展开后的重排：仅重排受影响节点所属的树，其他树与散落节点保持原位
  relayoutAffectedTrees(canvas, ids) {
    if (!canvas)
      return;
    if ((this.settings.collapseRelayoutScope || "tree") === "canvas") {
      this.relayoutCanvas(canvas);
      return;
    }
    const rootIds = /* @__PURE__ */ new Set();
    for (const id of ids || []) {
      if (!id || !(canvas.nodes && canvas.nodes.get(id)))
        continue;
      let rootId = id;
      const seen = /* @__PURE__ */ new Set();
      let parentNode = this.getParentNode(canvas, rootId);
      while (parentNode && parentNode.id && !seen.has(parentNode.id)) {
        seen.add(parentNode.id);
        rootId = parentNode.id;
        parentNode = this.getParentNode(canvas, rootId);
      }
      rootIds.add(rootId);
    }
    if (rootIds.size === 0)
      return;
    for (const rootId of rootIds) {
      const rootNode = canvas.nodes.get(rootId);
      if (rootNode) {
        this.relayoutOneTree(rootNode);
      }
    }
  }
  // ══════════ 拖拽改挂父节点 ══════════
  setupDragReattach(canvas) {
    if (!canvas || !canvas.wrapperEl || canvas.__mmDragBound)
      return;
    canvas.__mmDragBound = true;
    const self = this;
    const state = { node: null, startX: 0, startY: 0, dragging: false, target: null };
    const reset = () => {
      state.node = null;
      state.dragging = false;
      state.target = null;
      self.highlightDragTarget(canvas, null);
    };
    canvas.wrapperEl.addEventListener("pointerdown", (ev) => {
      if (!self.settings.dragReattachEnabled)
        return;
      if (ev.button != null && ev.button !== 0)
        return;
      const node = self.findNodeFromPointerEvent(canvas, ev);
      if (!node)
        return;
      state.node = node;
      state.startX = ev.clientX;
      state.startY = ev.clientY;
      state.dragging = false;
      state.target = null;
    }, { passive: true });
    const onMove = (ev) => {
      if (!state.node || !self.settings.dragReattachEnabled)
        return;
      if (!canvas.nodes || !canvas.nodes.get(state.node.id))
        return reset();
      if (!state.dragging) {
        if (Math.abs(ev.clientX - state.startX) + Math.abs(ev.clientY - state.startY) < 8)
          return;
        state.dragging = true;
      }
      const target = self.detectDragTarget(canvas, state.node);
      const tid = target ? target.id : null;
      const cid = state.target ? state.target.id : null;
      if (tid !== cid) {
        state.target = target;
        self.highlightDragTarget(canvas, target);
      }
    };
    const onUp = () => {
      if (!state.dragging || !state.node)
        return reset();
      const dragNode = state.node;
      const target = state.target;
      reset();
      if (!target || !canvas.nodes || !canvas.nodes.get(dragNode.id))
        return;
      self.reattachNodeToParent(canvas, dragNode.id, target.id);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerup", onUp, { passive: true });
    window.addEventListener("pointercancel", onUp, { passive: true });
  }
  findNodeFromPointerEvent(canvas, ev) {
    const el = ev.target;
    if (!el || !el.closest)
      return null;
    if (el.closest(".mm-collapse-btn"))
      return null;
    const nodeEl = el.closest(".canvas-node");
    if (!nodeEl)
      return null;
    for (const node of canvas.nodes.values()) {
      if (node.nodeEl === nodeEl)
        return node;
    }
    return null;
  }
  // 取节点矩形：优先用真实 DOM 矩形（反映拖拽时的 transform，最贴近用户所见），
  // 取不到时回退到画布坐标。
  getNodeRect(node) {
    const el = node ? node.nodeEl : null;
    if (el && typeof el.getBoundingClientRect === "function") {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0)
        return { x: r.left, y: r.top, w: r.width, h: r.height };
    }
    return { x: node.x, y: node.y, w: node.width || 0, h: node.height || 0 };
  }
  // 拖拽专用：按【全部边】（含彩色）收集后代 id，写入 out
  collectDescendantsAll(canvas, nodeId, out) {
    const data = canvas.getData ? canvas.getData() : null;
    const edges = (data == null ? void 0 : data.edges) || [];
    const childrenMap = {};
    edges.forEach((e) => {
      if (!e || !e.fromNode || !e.toNode)
        return;
      if (!childrenMap[e.fromNode])
        childrenMap[e.fromNode] = [];
      childrenMap[e.fromNode].push(e.toNode);
    });
    const stack = [nodeId];
    while (stack.length) {
      const id = stack.pop();
      for (const c of childrenMap[id] || []) {
        if (!out.has(c)) {
          out.add(c);
          stack.push(c);
        }
      }
    }
    return out;
  }
  // 拖拽专用：按【全部边】（含彩色）收集祖先 id，写入 out
  collectAncestorsAll(canvas, nodeId, out) {
    const data = canvas.getData ? canvas.getData() : null;
    const edges = (data == null ? void 0 : data.edges) || [];
    const parentMap = {};
    edges.forEach((e) => {
      if (!e || !e.fromNode || !e.toNode)
        return;
      if (!parentMap[e.toNode])
        parentMap[e.toNode] = [];
      parentMap[e.toNode].push(e.fromNode);
    });
    const stack = [nodeId];
    while (stack.length) {
      const id = stack.pop();
      for (const p of parentMap[id] || []) {
        if (!out.has(p)) {
          out.add(p);
          stack.push(p);
        }
      }
    }
    return out;
  }
  // 找出与拖拽节点重叠最多、且合法的落点节点（所有节点均可作为落点）
  detectDragTarget(canvas, dragNode) {
    const a = this.getNodeRect(dragNode);
    if (a.w <= 0 || a.h <= 0)
      return null;
    // 自身与全部后代不可作为落点（防止把节点拖到自己的后代上成环）。
    // 注意：祖先【可以】作为落点——把节点拖到其祖先上 = 把该子树「拍平」为祖先的直接子节点，
    // 不会成环（节点依然在祖先之下），是合法的重新挂接操作（例如 A→B→C 中把 C 拖到 A，
    // 即让 C 成为 A 的直接子节点、B 的同级）。
    // 这里按【全部边】计算后代（含彩色），否则「父子边是彩色」时会漏判成环。
    const forbidden = /* @__PURE__ */ new Set([dragNode.id]);
    this.collectDescendantsAll(canvas, dragNode.id, forbidden);
    const minRatio = this.settings.dragReattachOverlapRatio || 0.3;
    let best = null;
    let bestRatio = minRatio;
    for (const n of canvas.nodes.values()) {
      if (!n || forbidden.has(n.id))
        continue;
      const b = this.getNodeRect(n);
      if (b.w <= 0 || b.h <= 0)
        continue;
      const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
      const oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
      if (ox <= 0 || oy <= 0)
        continue;
      // 分母取【较小者】的面积：A 比 B 大很多时，A 完全盖住 B 也应算作命中
      const r = ox * oy / Math.min(a.w * a.h, b.w * b.h);
      if (r > bestRatio) {
        bestRatio = r;
        best = n;
      }
    }
    return best;
  }
  highlightDragTarget(canvas, target) {
    if (!canvas || !canvas.nodes)
      return;
    for (const n of canvas.nodes.values()) {
      const el = n.nodeEl;
      if (!el || !el.classList)
        continue;
      const on = !!target && n.id === target.id;
      if (on !== el.classList.contains("mm-drop-target"))
        el.classList.toggle("mm-drop-target", on);
    }
  }
  // 把 nodeId 从原父级断开，挂到 newParentId 下（作为其最后一个子节点）
  reattachNodeToParent(canvas, nodeId, newParentId) {
    if (!canvas || !canvas.nodes)
      return false;
    const node = canvas.nodes.get(nodeId);
    const newParent = canvas.nodes.get(newParentId);
    if (!node || !newParent || nodeId === newParentId)
      return false;
    const data = canvas.getData();
    const nodes = (data == null ? void 0 : data.nodes) || [];
    let edges = ((data == null ? void 0 : data.edges) || []).slice();
    // ── 原父级 D ──
    // 优先取非彩色入边（与全插件树语义一致）；若无，则回退到彩色入边。
    // 否则「父边是彩色」时会被漏判，导致改挂后旧线断不掉。
    const oldParent = this.getParentNode(canvas, nodeId);
    let oldParentId = oldParent && oldParent.id ? oldParent.id : null;
    if (!oldParentId) {
      // getParentNode 仅认非彩色入边；若原父边是彩色，这里回退识别。
      // 仅当【只有一条】入边时才把它当作原父级断开；
      // 多条入边说明还挂着彩色跨连线等，不应把彩色跨连线误判为父级而误删。
      const incoming = edges.filter((e) => e && e.toNode === nodeId);
      if (incoming.length === 1 && incoming[0].fromNode)
        oldParentId = incoming[0].fromNode;
    }
    if (oldParentId === newParentId)
      return false;
    const oldRootId = oldParentId && canvas.nodes.get(oldParentId) ? this.getTreeRootId(canvas, oldParentId) : null;
    // 断开规则：
    //  - 与原父级 D 相连的边【无论是否彩色，一律断开】；
    //  - 其余全部「非彩色」入边（普通父子层级边，全部断开）；
    //  - 仅保留「其他节点 → A」的彩色连线（视为用户自定义关联）。
    // 注意：多步拖拽时，上一次拖拽产生的父边也必须被断开，否则会累积成多个父节点。
    const dropIncoming = (e, keepId) => {
      if (!e || e.toNode !== nodeId)
        return false;
      if (keepId && e.id === keepId)
        return false;
      if (oldParentId && e.fromNode === oldParentId)
        return true;
      return !e.color;
    };
    // 只保留「应保留」的边，得到最终边集合（已剔除所有旧父边）
    const finalEdges = edges.filter((e) => !dropIncoming(e));
    // 追加 newParent -> node 的新边（放在末尾 = 成为最后一个子节点）
    let newEdgeId = null;
    const exists = finalEdges.some((e) => e && e.fromNode === newParentId && e.toNode === nodeId);
    if (!exists) {
      newEdgeId = generateId(canvas);
      finalEdges.push({
        id: newEdgeId,
        fromNode: newParentId,
        toNode: nodeId,
        fromSide: "right",
        toSide: "left"
      });
    }
    // ⚠️ 关键修复：importData 第二参数为 true 时才是「替换」语义——
    // 会移除【不在列表中的旧边】，否则是「合并」语义，旧父边会残留并随多次拖拽累积。
    // （已对照 Obsidian 源码：t 为真时 d.forEach(e => f.has(e) || n.removeEdge(e)) 才会执行）
    canvas.importData({ nodes, edges: finalEdges }, true);
    canvas.requestFrame();
    canvas.requestSave();
    const ids = [nodeId, newParentId];
    if (oldRootId)
      ids.push(oldRootId);
    this.relayoutAffectedTrees(canvas, ids);
    return true;
  }
  getTreeRootId(canvas, nodeId) {
    let rootId = nodeId;
    const seen = /* @__PURE__ */ new Set();
    let p = this.getParentNode(canvas, rootId);
    while (p && p.id && !seen.has(p.id)) {
      seen.add(p.id);
      rootId = p.id;
      p = this.getParentNode(canvas, rootId);
    }
    return rootId;
  }
  layoutNode(rootId, startX, startY, nodeMap, nodeHeightMap, childrenMap, horizontalGap, verticalGap, visited, collapsedSet) {
    const layoutNode = (nodeId, x, y) => {
      if (visited.has(nodeId)) {
        return 0;
      }
      visited.add(nodeId);
      const node = nodeMap.get(nodeId);
      if (!node)
        return;
      const height = nodeHeightMap.get(nodeId) || node.height;
      node.x = x;
      if (height > node.height) {
        node.y = y + (height - node.height) / 2;
      } else {
        node.y = y;
      }
      const children = childrenMap[nodeId] || [];
      if (children.length === 0 || (collapsedSet && collapsedSet.has(nodeId))) {
        return;
      }
      let currentY = y;
      let subTreeHeight = 0;
      for (const childId of children) {
        subTreeHeight += nodeHeightMap.get(childId) || 0;
      }
      if (subTreeHeight < node.height) {
        currentY = y + (node.height - subTreeHeight) / 2;
      }
      for (const childId of children) {
        const childHeight = nodeHeightMap.get(childId);
        if (!childHeight)
          continue;
        layoutNode(childId, x + node.width + horizontalGap, currentY);
        currentY += childHeight + verticalGap;
      }
    };
    layoutNode(rootId, startX, startY);
  }
  getSubtreeHeightMap(nodeMap, childrenMap, rootIds, verticalGap, collapsedSet) {
    const heightMap = /* @__PURE__ */ new Map();
    const visited = /* @__PURE__ */ new Set();
    function calcHeight(id) {
      if (visited.has(id)) {
        return 0;
      }
      visited.add(id);
      const node = nodeMap.get(id);
      if (!node)
        return 0;
      if (collapsedSet && collapsedSet.has(id)) {
        heightMap.set(id, node.height);
        return node.height;
      }
      const children = childrenMap[id] || [];
      const filteredChildren = children.filter((childId) => !visited.has(childId)).sort((a, b) => {
        var _a, _b;
        const nodeA = nodeMap.get(a);
        const nodeB = nodeMap.get(b);
        return ((_a = nodeA == null ? void 0 : nodeA.y) != null ? _a : 0) - ((_b = nodeB == null ? void 0 : nodeB.y) != null ? _b : 0);
      });
      childrenMap[id] = filteredChildren;
      if (filteredChildren.length === 0) {
        heightMap.set(id, node.height);
        return node.height;
      }
      let treeHeight = 0;
      for (const childId of filteredChildren) {
        const childNode = nodeMap.get(childId);
        if (!childNode)
          continue;
        const childHeight = calcHeight(childId);
        treeHeight += childHeight + verticalGap;
      }
      treeHeight -= verticalGap;
      let maxHeight = Math.max(node.height, treeHeight);
      heightMap.set(id, maxHeight);
      return maxHeight;
    }
    rootIds.forEach((root) => calcHeight(root));
    return heightMap;
  }
  verifyCanvasLayout(canvasView) {
    var _a, _b;
    if (!canvasView) {
      canvasView = this.app.workspace.getActiveFileView();
    }
    if (this.settings.condition.fileNameInclude !== "" && !((_b = (_a = canvasView == null ? void 0 : canvasView.file) == null ? void 0 : _a.name) == null ? void 0 : _b.includes(this.settings.condition.fileNameInclude)))
      return false;
    const titleEl = canvasView.headerEl.querySelector(".view-header-title");
    const isEditingTitle = document.activeElement === titleEl;
    return !isEditingTitle;
  }
  closestSegmentLength(rectA, rectB) {
    const aLeft = rectA.x, aRight = rectA.x + rectA.width;
    const aTop = rectA.y, aBottom = rectA.y + rectA.height;
    const bLeft = rectB.x, bRight = rectB.x + rectB.width;
    const bTop = rectB.y, bBottom = rectB.y + rectB.height;
    const dx = Math.max(bLeft - aRight, aLeft - bRight, 0);
    const dy = Math.max(bTop - aBottom, aTop - bBottom, 0);
    return dx * dx + dy * dy;
  }
  patchCanvas() {
    const patchCanvasKeys = () => {
      const canvasView = this.app.workspace.getActiveFileView();
      if (!(canvasView == null ? void 0 : canvasView.canvas))
        return false;
      const self = this;
      const canvasViewunistaller = around(canvasView.constructor.prototype, {
        onOpen: (next) => async function() {
          if (self.settings.hotkey.createSiblingNodeOrRootNode.key !== "" && self.settings.hotkey.createSiblingNodeOrRootNode.enabled) {
            this.scope.register(self.settings.hotkey.createSiblingNodeOrRootNode.modifiers.split("+"), self.settings.hotkey.createSiblingNodeOrRootNode.key, async () => {
              self.createSiblingNode(this.canvas);
            });
          }
          if (self.settings.hotkey.createChildNode.key !== "" && self.settings.hotkey.createChildNode.enabled) {
            this.scope.register(self.settings.hotkey.createChildNode.modifiers.split("+"), self.settings.hotkey.createChildNode.key, async (ev) => {
              self.createChildNode(this.canvas);
            });
          }
          if (self.settings.hotkey.editNodeOrSelectionNode.key !== "" && self.settings.hotkey.editNodeOrSelectionNode.enabled) {
            this.scope.register(self.settings.hotkey.editNodeOrSelectionNode.modifiers.split("+"), self.settings.hotkey.editNodeOrSelectionNode.key, async (ev) => {
              self.startEditingNode(this.canvas);
            });
          }
          if (self.settings.hotkey.deleteNode.key !== "" && self.settings.hotkey.deleteNode.enabled) {
            this.scope.register(self.settings.hotkey.deleteNode.modifiers.split("+"), self.settings.hotkey.deleteNode.key, async (ev) => {
              self.deleteNode(this.canvas);
            });
          }
          if (self.settings.hotkey.freeNavigateUp.key !== "" && self.settings.hotkey.freeNavigateUp.enabled) {
            this.scope.register(self.settings.hotkey.freeNavigateUp.modifiers.split("+"), self.settings.hotkey.freeNavigateUp.key, () => {
              self.freeNavigate(this.canvas, "ArrowUp");
            });
          }
          if (self.settings.hotkey.freeNavigateDown.key !== "" && self.settings.hotkey.freeNavigateDown.enabled) {
            this.scope.register(self.settings.hotkey.freeNavigateDown.modifiers.split("+"), self.settings.hotkey.freeNavigateDown.key, () => {
              self.freeNavigate(this.canvas, "ArrowDown");
            });
          }
          if (self.settings.hotkey.freeNavigateLeft.key !== "" && self.settings.hotkey.freeNavigateLeft.enabled) {
            this.scope.register(self.settings.hotkey.freeNavigateLeft.modifiers.split("+"), self.settings.hotkey.freeNavigateLeft.key, () => {
              self.freeNavigate(this.canvas, "ArrowLeft");
            });
          }
          if (self.settings.hotkey.freeNavigateRight.key !== "" && self.settings.hotkey.freeNavigateRight.enabled) {
            this.scope.register(self.settings.hotkey.freeNavigateRight.modifiers.split("+"), self.settings.hotkey.freeNavigateRight.key, () => {
              self.freeNavigate(this.canvas, "ArrowRight");
            });
          }
          if (self.settings.hotkey.freeNavigateUpUntilEnd.key !== "" && self.settings.hotkey.freeNavigateUpUntilEnd.enabled) {
            this.scope.register(self.settings.hotkey.freeNavigateUpUntilEnd.modifiers.split("+"), self.settings.hotkey.freeNavigateUpUntilEnd.key, () => {
              self.freeNavigateUtilEnd(this.canvas, "ArrowUp");
            });
          }
          if (self.settings.hotkey.freeNavigateDownUntilEnd.key !== "" && self.settings.hotkey.freeNavigateDownUntilEnd.enabled) {
            this.scope.register(self.settings.hotkey.freeNavigateDownUntilEnd.modifiers.split("+"), self.settings.hotkey.freeNavigateDownUntilEnd.key, () => {
              self.freeNavigateUtilEnd(this.canvas, "ArrowDown");
            });
          }
          if (self.settings.hotkey.freeNavigateLeftUntilEnd.key !== "" && self.settings.hotkey.freeNavigateLeftUntilEnd.enabled) {
            this.scope.register(self.settings.hotkey.freeNavigateLeftUntilEnd.modifiers.split("+"), self.settings.hotkey.freeNavigateLeftUntilEnd.key, () => {
              self.freeNavigateUtilEnd(this.canvas, "ArrowLeft");
            });
          }
          if (self.settings.hotkey.freeNavigateRightUntilEnd.key !== "" && self.settings.hotkey.freeNavigateRightUntilEnd.enabled) {
            this.scope.register(self.settings.hotkey.freeNavigateRightUntilEnd.modifiers.split("+"), self.settings.hotkey.freeNavigateRightUntilEnd.key, () => {
              self.freeNavigateUtilEnd(this.canvas, "ArrowRight");
            });
          }
          if (self.settings.hotkey.navigateUp.key !== "" && self.settings.hotkey.navigateUp.enabled) {
            this.scope.register(self.settings.hotkey.navigateUp.modifiers.split("+"), self.settings.hotkey.navigateUp.key, () => {
              self.navigate(this.canvas, "ArrowUp");
            });
          }
          if (self.settings.hotkey.navigateDown.key !== "" && self.settings.hotkey.navigateDown.enabled) {
            this.scope.register(self.settings.hotkey.navigateDown.modifiers.split("+"), self.settings.hotkey.navigateDown.key, () => {
              self.navigate(this.canvas, "ArrowDown");
            });
          }
          if (self.settings.hotkey.navigateLeft.key !== "" && self.settings.hotkey.navigateLeft.enabled) {
            this.scope.register(self.settings.hotkey.navigateLeft.modifiers.split("+"), self.settings.hotkey.navigateLeft.key, () => {
              self.navigate(this.canvas, "ArrowLeft");
            });
          }
          if (self.settings.hotkey.navigateRight.key !== "" && self.settings.hotkey.navigateRight.enabled) {
            this.scope.register(self.settings.hotkey.navigateRight.modifiers.split("+"), self.settings.hotkey.navigateRight.key, () => {
              self.navigate(this.canvas, "ArrowRight");
            });
          }
          if (self.settings.hotkey.navigateUpUntilEnd.key !== "" && self.settings.hotkey.navigateUpUntilEnd.enabled) {
            this.scope.register(self.settings.hotkey.navigateUpUntilEnd.modifiers.split("+"), self.settings.hotkey.navigateUpUntilEnd.key, () => {
              self.navigateUtilEnd(this.canvas, "ArrowUp");
            });
          }
          if (self.settings.hotkey.navigateDownUntilEnd.key !== "" && self.settings.hotkey.navigateDownUntilEnd.enabled) {
            this.scope.register(self.settings.hotkey.navigateDownUntilEnd.modifiers.split("+"), self.settings.hotkey.navigateDownUntilEnd.key, () => {
              self.navigateUtilEnd(this.canvas, "ArrowDown");
            });
          }
          if (self.settings.hotkey.navigateLeftUntilEnd.key !== "" && self.settings.hotkey.navigateLeftUntilEnd.enabled) {
            this.scope.register(self.settings.hotkey.navigateLeftUntilEnd.modifiers.split("+"), self.settings.hotkey.navigateLeftUntilEnd.key, () => {
              self.navigateUtilEnd(this.canvas, "ArrowLeft");
            });
          }
          if (self.settings.hotkey.navigateRightUntilEnd.key !== "" && self.settings.hotkey.navigateRightUntilEnd.enabled) {
            this.scope.register(self.settings.hotkey.navigateRightUntilEnd.modifiers.split("+"), self.settings.hotkey.navigateRightUntilEnd.key, () => {
              self.navigateUtilEnd(this.canvas, "ArrowRight");
            });
          }
          if (self.settings.hotkey.collapseExpandNode.key !== "" && self.settings.hotkey.collapseExpandNode.enabled) {
            this.scope.register(self.settings.hotkey.collapseExpandNode.modifiers.split("+"), self.settings.hotkey.collapseExpandNode.key, () => {
              self.toggleCollapseActiveNode(this.canvas);
            });
          }
          const opened = next.call(this);
          try {
            if (this.canvas) {
              self.setupChecklistProgressUI(this.canvas);
              if (self.isMindmapCanvas(this)) {
                self.setupCollapseUI(this.canvas);
              }
            }
          } catch (err) {
            console.error("[canvas-mindmap-keyboard] setupChecklistProgressUI failed:", err);
          }
          return opened;
        }
      });
      this.register(canvasViewunistaller);
      canvasView.canvas.view.leaf.rebuildView();
      return true;
    };
    this.app.workspace.onLayoutReady(() => {
      if (!patchCanvasKeys()) {
        const evt = this.app.workspace.on("layout-change", () => {
          patchCanvasKeys() && this.app.workspace.offref(evt);
        });
        this.registerEvent(evt);
      }
    });
  }
  patchMarkdownFileInfo() {
    const patchEditor = () => {
      const editorInfo = this.app.workspace.activeEditor;
      if (!(editorInfo == null ? void 0 : editorInfo.constructor) || !editorInfo.containerEl || editorInfo.containerEl.closest(".common-editor-inputer") || editorInfo.file)
        return false;
      const patchEditorInfo = editorInfo.constructor;
      const self = this;
      const uninstaller = around(patchEditorInfo.prototype, {
        showPreview: (next) => function(e) {
          var _a, _b;
          next.call(this, e);
          if (e && ((_b = (_a = this.node) == null ? void 0 : _a.canvas) == null ? void 0 : _b.view) && self.verifyCanvasLayout(this.node.canvas.view)) {
            this.node.canvas.wrapperEl.focus();
            this.node.setIsEditing(false);
            if (!self.settings.nodeAutoResize.autoResizeWidthSwitch && !self.settings.nodeAutoResize.autoResizeHeightSwitch)
              return;
            setTimeout(() => {
              var _a2, _b2, _c, _d;
              if (((_a2 = this.node.text) == null ? void 0 : _a2.trim().length) > 0) {
                const renderer = (_d = (_c = (_b2 = this.node) == null ? void 0 : _b2.child) == null ? void 0 : _c.previewMode) == null ? void 0 : _d.renderer;
                let r = renderer == null ? void 0 : renderer.previewEl;
                if (!r || !r.isShown())
                  return;
                const sizerEl = renderer == null ? void 0 : renderer.sizerEl;
                if (!sizerEl || sizerEl.querySelector(".el-pre") || sizerEl.querySelector("img") || sizerEl.querySelector(".external-link") || sizerEl.querySelector(".el-ul") || sizerEl.querySelector(".el-ol") || sizerEl.querySelector(".el-table") || sizerEl.querySelector(".footnote-ref") || sizerEl.querySelector(".math"))
                  return;
                if (self.settings.nodeAutoResize.autoResizeWidthSwitch) {
                  self.resizeNode(this.node, "left");
                  if (self.settings.nodeAutoResize.autoResizeHeightSwitch) {
                    new Promise(requestAnimationFrame);
                    new Promise(requestAnimationFrame);
                  }
                }
                if (self.settings.nodeAutoResize.autoResizeHeightSwitch) {
                  self.resizeNode(this.node, "bottom");
                }
              }
              self.autoLayout(this.node.canvas, this.node);
            }, 100);
          }
        }
      });
      this.register(uninstaller);
      return true;
    };
    this.app.workspace.onLayoutReady(() => {
      if (!patchEditor()) {
        const evt = this.app.workspace.on("file-open", () => {
          setTimeout(() => {
            patchEditor() && this.app.workspace.offref(evt);
          }, 100);
        });
        this.registerEvent(evt);
      }
    });
  }
  patchMarkdownFileInfoFile() {
    const patchEditor = () => {
      const editorInfo = this.app.workspace.activeEditor;
      if (!(editorInfo == null ? void 0 : editorInfo.constructor) || !editorInfo.containerEl || editorInfo.containerEl.closest(".common-editor-inputer") || !editorInfo.file)
        return false;
      const patchEditorInfo = editorInfo.constructor;
      const self = this;
      const uninstaller = around(patchEditorInfo.prototype, {
        showPreview: (next) => function(e) {
          var _a;
          next.call(this, e);
          const canvasView = this.app.workspace.getActiveFileView();
          if (e && ((_a = canvasView == null ? void 0 : canvasView.canvas) == null ? void 0 : _a.selection.size) === 1 && self.verifyCanvasLayout(canvasView)) {
            const node = canvasView.canvas.selection.values().next().value;
            if (node) {
              node.canvas.wrapperEl.focus();
              node.setIsEditing(false);
              setTimeout(() => {
                self.autoLayout(node.canvas, node);
              }, 100);
            }
          }
        }
      });
      this.register(uninstaller);
      return true;
    };
    this.app.workspace.onLayoutReady(() => {
      if (!patchEditor()) {
        const evt = this.app.workspace.on("file-open", () => {
          setTimeout(() => {
            patchEditor() && this.app.workspace.offref(evt);
          }, 100);
        });
        this.registerEvent(evt);
      }
    });
  }
  patchUpdateSelection() {
    const patchEditor = () => {
      var _a;
      const canvasView = this.app.workspace.getActiveFileView();
      if (!((_a = canvasView == null ? void 0 : canvasView.canvas) == null ? void 0 : _a.constructor))
        return false;
      const canvas = canvasView.canvas;
      const self = this;
      const uninstaller = around(canvas.constructor.prototype, {
        updateSelection(next) {
          return function(...args) {
            if (this.selection.size === 1 && this.view && self.verifyCanvasLayout(this.view)) {
              const node = this.selection.values().next().value;
              setTimeout(() => {
                self.autoLayout(node.canvas, node);
              }, 100);
            }
            next.apply(this, args);
            return;
          };
        }
      });
      this.register(uninstaller);
      return true;
    };
    this.app.workspace.onLayoutReady(() => {
      if (!patchEditor()) {
        const evt = this.app.workspace.on("file-open", () => {
          setTimeout(() => {
            patchEditor() && this.app.workspace.offref(evt);
          }, 100);
        });
        this.registerEvent(evt);
      }
    });
  }
  resizeNode(node, n) {
    var _a, _b;
    const renderer = (_b = (_a = node == null ? void 0 : node.child) == null ? void 0 : _a.previewMode) == null ? void 0 : _b.renderer;
    let r = renderer == null ? void 0 : renderer.previewEl;
    if (!r || !r.isShown())
      return 0;
    if (n === "top" || n === "bottom") {
      let maxHeight = null;
      if (this.settings.nodeAutoResize.maxLine >= 0) {
        const computed = window.getComputedStyle(r);
        const lineHeight = parseFloat(computed.lineHeight);
        maxHeight = lineHeight * this.settings.nodeAutoResize.maxLine;
      }
      for (let o = 0; o < 10; o++) {
        let a = r.clientHeight;
        r.style.height = "1px";
        let s = r.scrollHeight;
        if (s <= 1)
          return 1;
        r.style.height = "";
        let l = s - a + 1;
        let height = node.height + l;
        let finalHeight = maxHeight ? Math.min(maxHeight, height) : height;
        if (finalHeight >= node.height && finalHeight < node.height + 1)
          break;
        node.resize({
          width: node.width,
          height: finalHeight
        }), node.render(), node.canvas.requestSave();
      }
      return 0;
    }
    const sizerEl = renderer == null ? void 0 : renderer.sizerEl;
    if (!sizerEl)
      return 0;
    const lines = sizerEl.children;
    if (lines.length === 0)
      return 0;
    let maxWidth = 0;
    for (const lineEl of lines) {
      if (lineEl.children.length === 0)
        continue;
      const width = this.getLongestLineWidthFromElement(lineEl.children[0]);
      if (width > maxWidth)
        maxWidth = width;
    }
    maxWidth += this.settings.nodeAutoResize.contentHorizontalPadding + 1;
    const finalWidth = this.settings.nodeAutoResize.maxWidth < 0 ? maxWidth : Math.min(maxWidth, this.settings.nodeAutoResize.maxWidth);
    node.resize({
      width: finalWidth,
      height: node.height
    }), node.render(), node.canvas.requestSave();
    return 0;
  }
  autoLayout(canvas, node) {
    if (this.layoutLevelIsCanvas(canvas)) {
      this.debounceRelayoutCanvas(canvas);
    } else if (this.layoutLevelIsTree(canvas)) {
      this.debounceRelayoutOneTree(node);
    }
  }
  layoutLevelIsCanvas(canvas) {
    var _a, _b;
    if ((_b = (_a = canvas == null ? void 0 : canvas.view) == null ? void 0 : _a.file) == null ? void 0 : _b.name) {
      const fileName = canvas.view.file.name;
      if (this.settings.layout.whichFileUseCanvasLevelAutomaticLayout != "" && fileName.includes(this.settings.layout.whichFileUseCanvasLevelAutomaticLayout)) {
        return true;
      } else if (this.settings.layout.whichFileUseTreeLevelAutomaticLayout != "" && fileName.includes(this.settings.layout.whichFileUseTreeLevelAutomaticLayout)) {
        return false;
      } else if (this.settings.layout.whichFileNotAutomaticLayout != "" && fileName.includes(this.settings.layout.whichFileNotAutomaticLayout)) {
        return false;
      }
    }
    return 0 /* Canvas */ === this.settings.layout.automaticLayoutLevel;
  }
  layoutLevelIsTree(canvas) {
    var _a, _b;
    if ((_b = (_a = canvas == null ? void 0 : canvas.view) == null ? void 0 : _a.file) == null ? void 0 : _b.name) {
      const fileName = canvas.view.file.name;
      if (this.settings.layout.whichFileUseCanvasLevelAutomaticLayout != "" && fileName.includes(this.settings.layout.whichFileUseCanvasLevelAutomaticLayout)) {
        return false;
      } else if (this.settings.layout.whichFileUseTreeLevelAutomaticLayout != "" && fileName.includes(this.settings.layout.whichFileUseTreeLevelAutomaticLayout)) {
        return true;
      } else if (this.settings.layout.whichFileNotAutomaticLayout != "" && fileName.includes(this.settings.layout.whichFileNotAutomaticLayout)) {
        return false;
      }
    }
    return 1 /* Tree */ === this.settings.layout.automaticLayoutLevel;
  }
  layoutLevelIsNo(canvas) {
    var _a, _b;
    if ((_b = (_a = canvas == null ? void 0 : canvas.view) == null ? void 0 : _a.file) == null ? void 0 : _b.name) {
      const fileName = canvas.view.file.name;
      if (this.settings.layout.whichFileUseCanvasLevelAutomaticLayout != "" && fileName.includes(this.settings.layout.whichFileUseCanvasLevelAutomaticLayout)) {
        return false;
      } else if (this.settings.layout.whichFileUseTreeLevelAutomaticLayout != "" && fileName.includes(this.settings.layout.whichFileUseTreeLevelAutomaticLayout)) {
        return false;
      } else if (this.settings.layout.whichFileNotAutomaticLayout != "" && fileName.includes(this.settings.layout.whichFileNotAutomaticLayout)) {
        return true;
      }
    }
    return 2 /* None */ === this.settings.layout.automaticLayoutLevel;
  }
  getTextPixelWidthFromElement(lineEl) {
    var _a;
    const text = (_a = lineEl.textContent) != null ? _a : "";
    const style = getComputedStyle(lineEl);
    const font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx)
      return -1;
    ctx.font = font;
    const metrics = ctx.measureText(text);
    return metrics.width;
  }
  getLongestLineWidthFromElement(lineEl) {
    var _a;
    if (!lineEl)
      return 0;
    const text = (_a = lineEl.textContent) != null ? _a : "";
    const style = getComputedStyle(lineEl);
    const font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx)
      return -1;
    ctx.font = font;
    const lines = text.split("\n");
    let maxWidth = 0;
    for (const line of lines) {
      const width = ctx.measureText(line).width;
      if (width > maxWidth)
        maxWidth = width;
    }
    return maxWidth;
  }
};
