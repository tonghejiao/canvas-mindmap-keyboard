import { Plugin, editorInfoField, debounce } from 'obsidian';
import { around } from "monkey-around";
import { DEFAULT_SETTINGS, MindMapSettings, MindMapSettingTab, AutomaticLayoutLevel } from "mindMapSettings";
import { EditorView, ViewUpdate } from "@codemirror/view";

function generateId() {
  return Math.random().toString(36).substr(2, 10);
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

const updateNodeSize = (plugin: CanvasMindmap) => {
  return EditorView.updateListener.of((v: ViewUpdate) => {
    if (v.focusChanged) {
      const editor = v.state.field(editorInfoField);
      const node = editor?.node;

      if (node?.canvas?.view && plugin.verifyCanvasLayout(node.canvas.view)) {
        setTimeout(() => {
          const sizerEl = node?.child?.editMode?.sizerEl;
          if (sizerEl) {
            node.resize({ width: node.width, height: sizerEl.innerHeight + 35 }),
              node.render(),
              plugin.debounceSaveCanvas(node.canvas)
          }
        }, 100);
      }
    }
    if (v.docChanged || v.selectionSet) {
      const editor = v.state.field(editorInfoField);
      const node = editor?.node;

      if (node?.canvas?.view && plugin.verifyCanvasLayout(node.canvas.view)) {
        const sizerEl = node?.child?.editMode?.sizerEl;
        if (sizerEl) {
          const sizerEl = node?.child?.editMode?.sizerEl;
          if (sizerEl) {
            let existMermaid = false

            existMermaid = sizerEl.querySelector(".HyperMD-codeblock") || sizerEl.querySelector(".cm-lang-mermaid")

            if (!existMermaid) {
              const lines = sizerEl.querySelectorAll(".cm-line");
              let maxWidth = 0;
              for (const lineEl of lines) {
                const width = plugin.getTextPixelWidthFromElement(lineEl);
                if (width > maxWidth) maxWidth = width;
              }
              maxWidth += plugin.settings.nodeAutoResize.contentHorizontalPadding
              const finalWidth = plugin.settings.nodeAutoResize.maxWidth < 0 ? maxWidth : Math.min(maxWidth, plugin.settings.nodeAutoResize.maxWidth); // 最大宽度限制
              node.resize({ width: finalWidth, height: 1 }),
                node.render(),
                node.resize({ width: node.width, height: sizerEl.innerHeight + 35 }),
                node.render(),
                plugin.debounceSaveCanvas(node.canvas);
            }
          }
        }
      }
    }
  });
};

export default class CanvasMindmap extends Plugin {
  settings: MindMapSettings;
  settingTab: MindMapSettingTab;

  inRelayoutCanvasSet: Set<any> = new Set();
  lastRelayoutTime: number = 0

  async onload() {
    await this.registerSettings();
    this.registerCommands();
    this.patchCanvas();
    this.patchMarkdownFileInfo();
    this.patchMarkdownFileInfoFile();
    this.patchUpdateSelection();
    this.registerEditorExtension([updateNodeSize(this)]);
    console.log('Canvas MindMap Plugin loaded');
  }

  async registerSettings() {
    this.settingTab = new MindMapSettingTab(this.app, this);
    this.addSettingTab(this.settingTab);
    await this.loadSettings();
  }

  public async loadSettings(): Promise<void> {
    const loadedData = await this.loadData() || {};

    // 深拷贝默认设置
    const mergedSettings: MindMapSettings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));

    // 遍历已有设置，逐层合并
    const merge = (target: any, source: any) => {
      for (const key in source) {
        if (source.hasOwnProperty(key)) {
          if (
            typeof target[key] === "object" &&
            target[key] !== null &&
            !Array.isArray(target[key])
          ) {
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

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  public debounceSaveCanvas = (canvas: any) => {
    canvas.requestSave();
  };

  public debounceRelayoutCanvas = (canvas: any) => {
    const now = Date.now()
    if (now - this.lastRelayoutTime < 200) return
    this.lastRelayoutTime = now
    this.relayoutCanvas(canvas)
  };

  public debounceRelayoutOneTree = (node: any) => {
    const now = Date.now()
    if (now - this.lastRelayoutTime < 200) return
    this.lastRelayoutTime = now
    this.relayoutOneTree(node)
  };

  registerCommands() {
    //全局重新布局
    this.addCommand({
      id: 'canvas-mindmap-keyboard-global-relayout',
      name: 'global relayout',
      callback: () => {
        const canvasView = this.app.workspace.getActiveFileView();
        const canvas = canvasView?.canvas;
        if (!canvas) return;
        this.relayoutCanvas(canvas);
      }
    });
    //调整所有节点的高度
    this.addCommand({
      id: 'canvas-mindmap-keyboard-global-resize',
      name: 'global resize',
      callback: () => {
        const canvasView = this.app.workspace.getActiveFileView();
        const canvas = canvasView?.canvas;
        if (!canvas) return;
        this.resizeAllNodes(canvas)
      }
    });

    //调整所有节点的高度并重新布局
    this.addCommand({
      id: 'canvas-mindmap-keyboard-global-resize-and-relayout',
      name: 'global resize and relayout',
      callback: () => {
        const canvasView = this.app.workspace.getActiveFileView();
        const canvas = canvasView?.canvas;
        if (!canvas) return;
        this.resizeAllNodes(canvas)
          .then(() => {
            this.relayoutCanvas(canvas);
          })
      }
    });

    //调整选中的节点的所在的树重新布局
    this.addCommand({
      id: 'canvas-mindmap-keyboard-relayout-selected-tree',
      name: 'relayout selected tree',
      callback: () => {
        const canvasView = this.app.workspace.getActiveFileView();
        const canvas = canvasView?.canvas;
        this.relayoutSelectedTree(canvas)
      }
    });
  }

  private createRootNode(canvas: any) {
    const nodes = Array.from(canvas.nodes.values());
    let minX = 0;
    let maxY = 0;

    if (nodes.length > 0) {
      minX = Math.min(...nodes.map((n: any) => n.x));
      maxY = Math.max(...nodes.map((n: any) => n.y + n.height));
    }

    maxY += this.settings.layout.verticalGap


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
      save: true,
    });
    if (!node) return;

    canvas.addNode(node);
    canvas.requestSave();

    if (this.layoutLevelIsCanvas(canvas)) {
      this.debounceRelayoutCanvas(canvas);
    }
    canvas.selectOnly(node)
    canvas.zoomToSelection();
    setTimeout(() => {
      node.startEditing();
    }, 100);
  }

  private getFocusedNodeId(canvas: any): string | null {
    return canvas?.selection?.values().next().value?.id ?? null;
  }

  private isFocusedNodeEditing(canvas: any): boolean {
    return canvas.selection.values().next().value.isEditing;
  }

  private createChildNode(canvas: any) {
    if (!canvas?.view || !this.verifyCanvasLayout(canvas.view)) return;

    if (canvas.selection.size !== 1) return;
    if (this.isFocusedNodeEditing(canvas)) return;

    const focusedNodeId = this.getFocusedNodeId(canvas);
    if (!focusedNodeId) return;

    // Get all nodes and edges
    const data = canvas.getData();
    const nodes = data?.nodes || [];
    const edges = data?.edges || [];
    const currentNode = canvas.nodes.get(focusedNodeId);
    if (!currentNode) return;

    let newY: number;

    if (this.layoutLevelIsNo(canvas)) {
      newY = currentNode.y + currentNode.height / 2 - this.settings.creatNode.height / 2;
    } else {
      // Find all children of the current node using canvas.getEdgesForNode for efficiency
      const outgoingEdges = canvas.getEdgesForNode(currentNode).filter((e: any) =>
        (e.from?.node?.id ?? e.fromNode) === focusedNodeId
      );
      const childIds = outgoingEdges.map((e: any) => e.to?.node?.id ?? e.toNode);
      if (childIds.length > 0) {
        // Find the maximum y+height among children
        let maxBottom = -Infinity;
        for (const childId of childIds) {
          const childNode = canvas.nodes.get(childId);
          if (childNode) {
            const bottom = childNode.y + childNode.height;
            if (bottom > maxBottom) maxBottom = bottom;
          }
        }
        // If no children found in nodes (shouldn't happen), fallback to parent y
        newY = (maxBottom > -Infinity ? maxBottom : currentNode.y);
      } else {
        // No children, place at parent's y
        newY = currentNode.y + currentNode.height / 2 - this.settings.creatNode.height / 2;
      }
    }



    const childId = generateId();
    const newNode = {
      id: childId,
      parent: focusedNodeId,
      children: [],
      text: '',
      type: 'text',
      x: currentNode.x + currentNode.width + this.settings.layout.horizontalGap,
      y: newY,
      width: this.settings.creatNode.width,
      height: this.settings.creatNode.height
    };

    // Add a new edge connecting parent and child
    const newEdge = {
      id: generateId(),
      fromNode: focusedNodeId,
      toNode: childId,
      fromSide: "right", // 父节点右边
      toSide: "left",    // 子节点左边
    };

    // Import updated nodes and edges
    canvas.importData({
      nodes: [...nodes, newNode],
      edges: [...edges, newEdge]
    });
    canvas.requestFrame();
    canvas.requestSave();

    const createdNode = canvas.nodes.get(childId);
    this.autoLayout(canvas, createdNode)
    canvas.selectOnly(createdNode)
    canvas.zoomToSelection();
    setTimeout(() => {
      createdNode.startEditing();
    }, 100);
  }

  private createSiblingNode(canvas: any) {
    if (!canvas?.view || !this.verifyCanvasLayout(canvas.view)) return;

    if (canvas.selection.size === 0) {
      this.createRootNode(canvas);
      return
    }

    if (canvas.selection.size !== 1) return;
    if (this.isFocusedNodeEditing(canvas)) return;

    const focusedNodeId = this.getFocusedNodeId(canvas);
    if (!focusedNodeId) return;

    // 获取所有节点和边
    const data = canvas.getData();
    const nodes = data?.nodes || [];
    const edges = data?.edges || [];
    const currentNode = canvas.nodes.get(focusedNodeId);
    if (!currentNode) return;

    // 没有父节点则不能创建同级节点
    const parentNode = this.getParentNode(canvas, focusedNodeId)
    const parentNodeId = parentNode ? parentNode.id : null

    const verticalGap = this.layoutLevelIsCanvas(canvas) || parentNode ? 0 : this.settings.layout.verticalGap
    // 新同级节点位置在当前节点下方
    const siblingId = generateId();
    const newNode = {
      id: siblingId,
      parent: parentNodeId,
      children: [],
      text: '',
      type: 'text',
      x: currentNode.x,
      y: currentNode.y + currentNode.height + verticalGap,
      width: this.settings.creatNode.width,
      height: this.settings.creatNode.height
    };

    // 添加新边连接父节点和新同级节点
    const newEdge = {
      id: generateId(),
      fromNode: parentNodeId,
      toNode: siblingId,
      fromSide: "right", // 父节点右边
      toSide: "left",    // 子节点左边
    };

    // 导入新数据
    canvas.importData({
      nodes: [...nodes, newNode],
      edges: [...edges, newEdge]
    });
    canvas.requestFrame();
    canvas.requestSave();

    const createdNode = canvas.nodes.get(siblingId);
    this.autoLayout(canvas, createdNode)
    canvas.selectOnly(createdNode)
    canvas.zoomToSelection();
    setTimeout(() => {
      createdNode.startEditing();
    }, 100);
  }

  private startEditingNode(canvas: any) {
    if (!canvas?.view || !this.verifyCanvasLayout(canvas.view)) return;

    const selection = canvas.selection;
    if (selection.size === 0) {
      // 先尝试获取可视范围内的节点
      let nodes = canvas.getViewportNodes();
      // 如果画布中没有节点，则遍历所有节点
      if (!nodes || nodes.length === 0) {
        nodes = Array.from(canvas.nodes.values());
      }
      if (!nodes || nodes.length === 0) return;

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

      if (!closestNode) return;
      canvas.selectOnly(closestNode);
      canvas.zoomToSelection();
      return
    }

    if (selection.size !== 1) return;
    const node = selection.values().next().value;

    if (node?.label || node?.url) return;

    if (node.isEditing) return;
    node.startEditing();
    canvas.zoomToSelection();
  }

  private deleteNode(canvas: any) {
    if (!canvas?.view || !this.verifyCanvasLayout(canvas.view)) return;

    if (canvas.selection.size !== 1) return;
    if (this.isFocusedNodeEditing(canvas)) return;

    const focusedNodeId = this.getFocusedNodeId(canvas);
    if (!focusedNodeId) return;

    const parentNode = this.getParentNode(canvas, focusedNodeId);

    //  获取所有节点和边
    const data = canvas.getData ? canvas.getData() : {
      nodes: Array.from(canvas.nodes.values()),
      edges: Array.from(canvas.edges.values())
    };
    const edges = data.edges || [];

    //  构建 parent -> children 映射
    const childrenMap: Record<string, string[]> = {};
    edges.forEach((e: any) => {
      if (!childrenMap[e.fromNode]) childrenMap[e.fromNode] = [];
      childrenMap[e.fromNode].push(e.toNode);
    });

    // 递归收集子树节点ID（包含根节点）
    const subtreeNodeIds: string[] = [];
    const collectNodeIds = (id: string) => {
      if (subtreeNodeIds.includes(id)) return;
      subtreeNodeIds.push(id);
      const children = childrenMap[id] || [];
      children.forEach(collectNodeIds);
    };
    collectNodeIds(focusedNodeId);

    //  删除节点
    subtreeNodeIds.forEach(id => {
      const node = canvas.nodes.get(id);
      if (node) {
        canvas.removeNode(node);
      }
    });

    canvas.requestFrame();
    canvas.requestSave();

    if (parentNode) {
      setTimeout(() => {
        this.autoLayout(canvas, parentNode)
        canvas.selectOnly(parentNode);
        canvas.zoomToSelection();
      }, 0);
    }
  }

  private getParentNode(canvas: any, nodeId: string): any {
    let selectedItem = canvas.nodes.get(nodeId);
    let incomingEdges = canvas.getEdgesForNode(selectedItem).filter((e: any) => e.to.node.id === selectedItem.id);
    let parentNode = incomingEdges.length > 0 ? incomingEdges[0].from.node : null;
    return parentNode
  }

  private getNavigateNodebyFocusNode(canvas: any, selectedItem: any, direction: string): any {
    let targetNode: any = null;
    switch (direction) {
      case 'ArrowLeft':
        // 移动到父节点
        targetNode = this.getParentNode(canvas, selectedItem.id);
        break;
      case 'ArrowRight':
        // 找到子节点（通过 edges）
        const outgoingEdges = canvas.getEdgesForNode(selectedItem).filter((e: any) => e.from.node.id === selectedItem.id);
        const childrenNodes = outgoingEdges.map((e: any) => e.to.node);
        // 移动到第一个子节点
        if (childrenNodes.length > 0) {
          // 找 y 轴最小的子节点
          const bestChild = childrenNodes.reduce((min: any, cur: any) => {
            return cur.y < min.y ? cur : min;
          }, childrenNodes[0]);

          targetNode = bestChild;
        }
        break;
      case 'ArrowUp':
      case 'ArrowDown':
        const parentNode = this.getParentNode(canvas, selectedItem.id);
        if (!parentNode) {
          // Handle switching between root nodes
          // Gather all root nodes: all node IDs minus all child IDs from edges
          const nodesArr = Array.from(canvas.nodes.values());
          const allEdges = Array.from(canvas.edges.values());
          const childIds = allEdges.map((e: any) => e.to.node ? e.to.node.id : (e.toNode ?? null)).filter(Boolean);
          // Root nodes = nodes whose id is not in childIds
          const rootNodes = nodesArr.filter((n: any) => !childIds.includes(n.id));
          // Sort root nodes by y coordinate
          rootNodes.sort((a: any, b: any) => a.y - b.y);
          // Find index of selectedItem in rootNodes
          const index = rootNodes.findIndex((n: any) => n.id === selectedItem.id);
          if (index === -1) break;
          if (direction === 'ArrowUp' && index > 0) targetNode = rootNodes[index - 1];
          if (direction === 'ArrowDown' && index < rootNodes.length - 1) targetNode = rootNodes[index + 1];
          break;
        }
        // 有父节点，找兄弟节点
        const siblingEdges = canvas.getEdgesForNode(parentNode).filter((e: any) => e.from.node.id === parentNode.id);
        const siblings = siblingEdges.map((e: any) => e.to.node).sort((a: any, b: any) => a.y - b.y);
        const index = siblings.findIndex((n: { id: string }) => n.id === selectedItem.id);
        if (index === -1) break;
        if (direction === 'ArrowUp' && index > 0) targetNode = siblings[index - 1];
        if (direction === 'ArrowDown' && index < siblings.length - 1) targetNode = siblings[index + 1];
        break;
    }
    return targetNode;
  }

  private navigate(canvas: any, direction: string) {
    if (!canvas?.view || !this.verifyCanvasLayout(canvas.view)) return;

    const selected = canvas.selection;
    if (selected.size !== 1 || this.isFocusedNodeEditing(canvas)) return;
    const currentNode = selected.values().next().value;

    const targetNode = this.getNavigateNodebyFocusNode(canvas, currentNode, direction);

    if (targetNode) {
      canvas.selectOnly(targetNode);
      canvas.zoomToSelection();
    }
  }

  private navigateUtilEnd(canvas: any, direction: string) {
    if (!canvas?.view || !this.verifyCanvasLayout(canvas.view)) return;

    const selected = canvas.selection;
    if (selected.size !== 1 || this.isFocusedNodeEditing(canvas)) return;
    const currentNode = selected.values().next().value;

    let lastNode = currentNode;
    const visited = new Set<string>();
    visited.add(currentNode.id);

    while (true) {
      const nextNode = this.getNavigateNodebyFocusNode(canvas, lastNode, direction);
      // 如果没有下一个节点或出现环路，终止
      if (!nextNode || visited.has(nextNode.id)) {
        break;
      }
      visited.add(nextNode.id);
      lastNode = nextNode;
    }

    // 移动到最后一个节点
    if (lastNode && lastNode !== currentNode) {
      canvas.selectOnly(lastNode);
      canvas.zoomToSelection();
    }
  }

  private getNextNodeInFreeMode(canvas: any, direction: string, currentNode: any): any {
    const targetNode = this.getNavigateNodebyFocusNode(canvas, currentNode, direction);
    if (targetNode) {
      return targetNode;
    }


    if (direction === "ArrowRight") {
      const parentNode = this.getParentNode(canvas, currentNode.id);
      if (parentNode) {
        // 获取父节点的所有子节点（兄弟）
        const siblingEdges = canvas.getEdgesForNode(parentNode).filter((e: any) => e.from.node.id === parentNode.id);
        const siblings = siblingEdges.map((e: any) => e.to.node).filter((n: any) => n.id !== currentNode.id);

        // 遍历兄弟节点，检查是否有子节点
        for (const sib of siblings) {
          const outgoingEdges = canvas.getEdgesForNode(sib).filter((e: any) => e.from.node.id === sib.id);
          const children = outgoingEdges.map((e: any) => e.to.node);
          if (children.length > 0) {
            // 找到第一个子节点直接返回
            return children[0];
          }
        }
      }
    }

    // 获取所有节点
    const nodes = Array.from(canvas.nodes.values() as CanvasNode[]).filter((n: any) => n.id !== currentNode.id);
    if (nodes.length === 0) return;

    let candidates = nodes.filter((node: any) => {
      switch (direction) {
        case "ArrowUp":
          // 节点底部必须在当前节点顶部以上
          return node.y + node.height < currentNode.y;
        case "ArrowDown":
          // 节点顶部必须在当前节点底部以下
          return node.y > currentNode.y + currentNode.height;
        case "ArrowLeft":
          // 节点右边必须在当前节点左边左侧
          return node.x + node.width < currentNode.x;
        case "ArrowRight":
          // 节点左边必须在当前节点右边右侧
          return node.x > currentNode.x + currentNode.width;
        default:
          return false;
      }
    });

    if (candidates.length === 0) return;

    let betweenNodes: any[] = [];
    if (direction === "ArrowUp" || direction === "ArrowDown") {
      // 额外过滤：获取位于当前节点左右边界(x)之间的节点
      const xMin = currentNode.x;
      const xMax = currentNode.x + currentNode.width;
      betweenNodes = candidates.filter((node: any) => {
        const nodeLeft = node.x;
        const nodeRight = node.x + node.width;
        // 判断节点是否有任意部分在两个 x 轴之间
        return (nodeRight >= xMin && nodeLeft <= xMax);
      });
    } else if (direction === "ArrowLeft" || direction === "ArrowRight") {
      // 额外过滤：获取位于当前节点上下边界(y)之间的节点
      const yMin = currentNode.y;
      const yMax = currentNode.y + currentNode.height;
      betweenNodes = candidates.filter((node: any) => {
        const nodeTop = node.y;
        const nodeBottom = node.y + node.height;
        // 判断节点是否有任意部分在两个 y 轴之间
        return (nodeBottom >= yMin && nodeTop <= yMax);
      });
    }

    // 1. 遍历filteredCandidates，使用closestSegmentLength找距离最小的节点
    let bestNode: any = null;
    let minSegmentDist = Number.POSITIVE_INFINITY;
    for (const node of betweenNodes) {
      const segDist = this.closestSegmentLength(currentNode, node);
      if (segDist < minSegmentDist) {
        minSegmentDist = segDist;
        bestNode = node;
      }
    }

    // 2. 如果没有bestNode，遍历所有candidates，计算区间距离（x区间或y区间），找最小者
    if (!bestNode) {
      let minRangeDist = Number.POSITIVE_INFINITY;
      let bestRangeNode = null;
      if (direction === "ArrowUp" || direction === "ArrowDown") {
        const x1 = currentNode.x;
        const x2 = currentNode.x + currentNode.width;
        for (const node of candidates) {
          const nx1 = node.x;
          const nx2 = node.x + node.width;
          // 计算点到区间距离
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
          // 计算点到区间距离
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
      if (bestRangeNode) bestNode = bestRangeNode;
    }

    return bestNode;
  }

  private freeNavigate(canvas: any, direction: string) {
    if (!canvas?.view || !this.verifyCanvasLayout(canvas.view)) return;

    const selected = canvas.selection;
    if (selected.size !== 1 || this.isFocusedNodeEditing(canvas)) return;

    const currentNode = selected.values().next().value;

    const bestNode = this.getNextNodeInFreeMode(canvas, direction, currentNode);
    if (!bestNode) return;
    canvas.selectOnly(bestNode);
    canvas.zoomToSelection();
  }

  private freeNavigateUtilEnd(canvas: any, direction: string) {
    if (!canvas?.view || !this.verifyCanvasLayout(canvas.view)) return;

    const selected = canvas.selection;
    if (selected.size !== 1 || this.isFocusedNodeEditing(canvas)) return;

    const currentNode = selected.values().next().value;

    let lastNode = currentNode;
    const visited = new Set<string>();
    visited.add(currentNode.id);

    while (true) {
      const nextNode = this.getNextNodeInFreeMode(canvas, direction, lastNode);
      // 如果没有下一个节点或出现环路，终止
      if (!nextNode || visited.has(nextNode.id)) {
        break;
      }
      visited.add(nextNode.id);
      lastNode = nextNode;
    }

    // 移动到最后一个节点
    if (lastNode && lastNode !== currentNode) {
      canvas.selectOnly(lastNode);
      canvas.zoomToSelection();
    }
  }

  private async resizeAllNodes(canvas: any): Promise<void> {
    const nodes = Array.from(canvas.nodes.values() as CanvasNode[]);
    for (const node of nodes) {
      if (node.text?.trim().length === 0 || node.file) continue

      node.canvas.selectOnly(node);
      node.canvas.zoomToSelection();
      let attempt = 0;
      while (attempt < 10) {
        await new Promise(requestAnimationFrame); // 等一帧
        await new Promise(requestAnimationFrame); // 等一帧
        if (node.child?.previewMode?.renderer?.previewEl?.isConnected) {
          if (this.resizeNode(node, "bottom") === 1) {
            await new Promise(requestAnimationFrame); // 等一帧
            continue
          }
          canvas.requestFrame();
          canvas.requestSave();
          break
        }
        attempt++;
      }
    }
  }


  private relayoutCanvas(canvas: any) {
    if (this.inRelayoutCanvasSet.has(canvas)) return;
    this.inRelayoutCanvasSet.add(canvas);

    try {
      const data = canvas.getData();
      const nodeMap = new Map((data.nodes as CanvasNode[]).map((n: any) => [n.id, n]));
      const edges = data.edges;

      // 构建父子关系
      const childrenMap: Record<string, string[]> = {};
      edges.forEach((e: any) => {
        if (!childrenMap[e.fromNode]) childrenMap[e.fromNode] = [];
        childrenMap[e.fromNode].push(e.toNode);
      });

      // 找到根节点
      const allIds = Array.from(nodeMap.keys());
      const childIds = edges.map((e: any) => e.toNode);
      const rootIds = allIds.filter(id => !childIds.includes(id));

      if (rootIds.length === 0) {
        // 没有根节点，直接返回
        return;
      }

      const horizontalGap = this.settings.layout.horizontalGap; // 水平间距
      const verticalGap = this.settings.layout.verticalGap; // 垂直间距

      let nodeHeightMap = this.getSubtreeHeightMap(nodeMap, childrenMap, rootIds, verticalGap);

      // 从根节点开始布局
      // 排序根节点，按 y 坐标升序
      rootIds.sort((a, b) => {
        const nodeA = nodeMap.get(a);
        const nodeB = nodeMap.get(b);
        return (nodeA?.y ?? 0) - (nodeB?.y ?? 0);
      });
      const rootNode = nodeMap.get(rootIds[0])
      const treeHeight = nodeHeightMap.get(rootIds[0]) || rootNode.height;

      let startY = rootNode.y + (rootNode.height - treeHeight) / 2;

      for (const rootId of rootIds) {
        this.layoutNode(rootId, rootNode.x, startY, nodeMap, nodeHeightMap, childrenMap, horizontalGap, verticalGap);
        const rootHeight = nodeHeightMap.get(rootId) || 0;
        startY += rootHeight + verticalGap;
      }

      canvas.importData({
        nodes: data.nodes,
        edges: edges
      });
      canvas.requestFrame();
      canvas.requestSave();
    } finally {
      this.inRelayoutCanvasSet.delete(canvas);
    }
  }

  private relayoutOneTree(node: any) {
    if (!node) return;
    const canvas = node.canvas;
    if (!canvas || !canvas.nodes.get(node.id)) return;

    if (this.inRelayoutCanvasSet.has(canvas)) return;
    this.inRelayoutCanvasSet.add(canvas);

    try {
      const data = canvas.getData();
      const nodeMap = new Map((data.nodes as CanvasNode[]).map((n: any) => [n.id, n]));
      const edges = data.edges;

      // 构建父子关系
      const childrenMap: Record<string, string[]> = {};
      edges.forEach((e: any) => {
        if (!childrenMap[e.fromNode]) childrenMap[e.fromNode] = [];
        childrenMap[e.fromNode].push(e.toNode);
      });

      // 找到当前节点所在树的根节点
      let rootId = node.id;
      const visited = new Set<string>();
      let parentNode = this.getParentNode(canvas, rootId);
      while (parentNode && !visited.has(parentNode.id)) {
        visited.add(parentNode.id);
        rootId = parentNode.id;
        parentNode = this.getParentNode(canvas, rootId);
      }


      const horizontalGap = this.settings.layout.horizontalGap; // 水平间距
      const verticalGap = this.settings.layout.verticalGap; // 垂直间距

      let nodeHeightMap = this.getSubtreeHeightMap(nodeMap, childrenMap, [rootId], verticalGap);

      // 从根节点开始布局
      const rootNode = nodeMap.get(rootId)
      const treeHeight = nodeHeightMap.get(rootId) || rootNode.height;

      let startY = rootNode.y + (rootNode.height - treeHeight) / 2;

      this.layoutNode(rootId, rootNode.x, startY, nodeMap, nodeHeightMap, childrenMap, horizontalGap, verticalGap);

      canvas.importData({
        nodes: data.nodes,
        edges: edges
      });
      canvas.requestFrame();
      canvas.requestSave();
    } finally {
      this.inRelayoutCanvasSet.delete(canvas);
    }

  }

  private relayoutSelectedTree(canvas: any) {
    if (!canvas) return;
    if (canvas.selection.size === 0) return;

    // 收集所有选中节点的根节点
    const rootIds = new Set<string>();
    const visited = new Set<string>();
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

    // 遍历每个根节点，重新布局
    for (const rootId of rootIds) {
      const rootNode = canvas.nodes.get(rootId);
      if (rootNode) {
        this.relayoutOneTree(rootNode);
      }
    }
  }

  private layoutNode(rootId: string, startX: number, startY: number, nodeMap: Map<string, any>, nodeHeightMap: Map<string, number>,
    childrenMap: Record<string, string[]>, horizontalGap: number, verticalGap: number) {
    const visited = new Set<string>(); // 用于检测环路

    // 递归布局函数，调整节点位置，不返回高度
    const layoutNode = (nodeId: string, x: number, y: number) => {
      if (visited.has(nodeId)) {
        // 检测到环路，返回0防止无限递归
        return 0;
      }
      visited.add(nodeId);

      const node = nodeMap.get(nodeId);
      if (!node) return;

      const height = nodeHeightMap.get(nodeId) || node.height;

      // 设置当前节点位置
      node.x = x;
      if (height > node.height) {
        node.y = y + (height - node.height) / 2;
      } else {
        node.y = y;
      }

      const children = childrenMap[nodeId] || [];
      if (children.length === 0) {
        return;
      }

      // 从y开始，逐个放置子节点
      let currentY = y;
      let subTreeHeight = 0
      for (const childId of children) {
        subTreeHeight += nodeHeightMap.get(childId) || 0;
      }
      if (subTreeHeight < node.height) {
        currentY = y + (node.height - subTreeHeight) / 2;
      }

      const sortedChildrenIds = children
        .filter((id: string) => nodeMap.has(id))       // 先过滤掉不存在的节点
        .sort((a: string, b: string) => {
          const nodeA = nodeMap.get(a);
          const nodeB = nodeMap.get(b);
          return (nodeA?.y ?? 0) - (nodeB?.y ?? 0);    // 按 y 轴升序
        });

      for (const childId of sortedChildrenIds) {
        const childHeight = nodeHeightMap.get(childId);
        if (!childHeight) continue;
        // 递归布局子节点，横向偏移，纵向位置为currentY
        layoutNode(childId, x + node.width + horizontalGap, currentY);
        currentY += childHeight + verticalGap;
      }
    };

    layoutNode(rootId, startX, startY)
  }

  private getSubtreeHeightMap(nodeMap: Map<string, any>, childrenMap: Record<string, string[]>, rootIds: string[], verticalGap: number): Map<string, number> {
    const heightMap = new Map<string, number>();
    const visited = new Set<string>(); // 用于检测环路

    function calcHeight(id: string): number {
      if (visited.has(id)) {
        // 检测到环路，返回0防止无限递归
        return 0;
      }
      visited.add(id);

      const node = nodeMap.get(id);
      if (!node) return 0;

      const children = childrenMap[id] || [];
      if (children.length === 0) {
        heightMap.set(id, node.height);
        return node.height;
      }

      let treeHeight = 0
      for (const childId of children) {
        const childNode = nodeMap.get(childId);
        if (!childNode) continue;

        // 递归计算子树高度
        const childHeight = calcHeight(childId);
        treeHeight += childHeight + verticalGap
      }
      treeHeight -= verticalGap

      let maxHeight = Math.max(node.height, treeHeight);
      heightMap.set(id, maxHeight);
      return maxHeight;
    }

    rootIds.forEach(root => calcHeight(root));

    return heightMap;
  }

  verifyCanvasLayout(canvasView: any): boolean {
    if (!canvasView) {
      canvasView = this.app.workspace.getActiveFileView();
    }

    if (this.settings.condition.fileNameInclude !== "" && !canvasView?.file?.name?.includes(this.settings.condition.fileNameInclude)) return false;

    const titleEl = canvasView.headerEl.querySelector(".view-header-title") as HTMLElement;

    // 判断是不是正在编辑标题
    const isEditingTitle = (document.activeElement === titleEl);

    return !isEditingTitle;
  }

  closestSegmentLength(rectA: CanvasNode, rectB: CanvasNode): number {
    const aLeft = rectA.x, aRight = rectA.x + rectA.width;
    const aTop = rectA.y, aBottom = rectA.y + rectA.height;

    const bLeft = rectB.x, bRight = rectB.x + rectB.width;
    const bTop = rectB.y, bBottom = rectB.y + rectB.height;

    // 水平和垂直距离：如果矩形相交/重叠则距离为 0
    const dx = Math.max(bLeft - aRight, aLeft - bRight, 0);
    const dy = Math.max(bTop - aBottom, aTop - bBottom, 0);

    // 直接返回两矩形最近距离
    return dx * dx + dy * dy;
  }

  patchCanvas() {
    // Patch all existing Canvas leaves
    const patchCanvasKeys = () => {
      const canvasView = this.app.workspace.getActiveFileView();
      if (!canvasView?.canvas) return false;

      const self = this;

      const canvasViewunistaller = around(canvasView.constructor.prototype, {
        onOpen: (next) =>
          async function () {
            if (self.settings.hotkey.createSiblingNodeOrRootNode.key !== "" && self.settings.hotkey.createSiblingNodeOrRootNode.enabled) {
              this.scope.register(self.settings.hotkey.createSiblingNodeOrRootNode.modifiers.split("+"),
                self.settings.hotkey.createSiblingNodeOrRootNode.key, async () => {
                  self.createSiblingNode(this.canvas);
                });
            }

            if (self.settings.hotkey.createChildNode.key !== "" && self.settings.hotkey.createChildNode.enabled) {
              this.scope.register(self.settings.hotkey.createChildNode.modifiers.split("+"),
                self.settings.hotkey.createChildNode.key, async (ev: KeyboardEvent) => {
                  self.createChildNode(this.canvas);
                });
            }

            if (self.settings.hotkey.editNodeOrSelectionNode.key !== "" && self.settings.hotkey.editNodeOrSelectionNode.enabled) {
              this.scope.register(self.settings.hotkey.editNodeOrSelectionNode.modifiers.split("+"),
                self.settings.hotkey.editNodeOrSelectionNode.key, async (ev: KeyboardEvent) => {
                  self.startEditingNode(this.canvas);
                });
            }

            if (self.settings.hotkey.deleteNode.key !== "" && self.settings.hotkey.deleteNode.enabled) {
              this.scope.register(self.settings.hotkey.deleteNode.modifiers.split("+"),
                self.settings.hotkey.deleteNode.key, async (ev: KeyboardEvent) => {
                  self.deleteNode(this.canvas);
                });
            }

            if (self.settings.hotkey.freeNavigateUp.key !== "" && self.settings.hotkey.freeNavigateUp.enabled) {
              this.scope.register(self.settings.hotkey.freeNavigateUp.modifiers.split("+"),
                self.settings.hotkey.freeNavigateUp.key, () => {
                  self.freeNavigate(this.canvas, "ArrowUp");
                });
            }

            if (self.settings.hotkey.freeNavigateDown.key !== "" && self.settings.hotkey.freeNavigateDown.enabled) {
              this.scope.register(self.settings.hotkey.freeNavigateDown.modifiers.split("+"),
                self.settings.hotkey.freeNavigateDown.key, () => {
                  self.freeNavigate(this.canvas, "ArrowDown");
                });
            }

            if (self.settings.hotkey.freeNavigateLeft.key !== "" && self.settings.hotkey.freeNavigateLeft.enabled) {
              this.scope.register(self.settings.hotkey.freeNavigateLeft.modifiers.split("+"),
                self.settings.hotkey.freeNavigateLeft.key, () => {
                  self.freeNavigate(this.canvas, "ArrowLeft");
                });
            }

            if (self.settings.hotkey.freeNavigateRight.key !== "" && self.settings.hotkey.freeNavigateRight.enabled) {
              this.scope.register(self.settings.hotkey.freeNavigateRight.modifiers.split("+"),
                self.settings.hotkey.freeNavigateRight.key, () => {
                  self.freeNavigate(this.canvas, "ArrowRight");
                });
            }

            if (self.settings.hotkey.freeNavigateUpUntilEnd.key !== "" && self.settings.hotkey.freeNavigateUpUntilEnd.enabled) {
              this.scope.register(self.settings.hotkey.freeNavigateUpUntilEnd.modifiers.split("+"),
                self.settings.hotkey.freeNavigateUpUntilEnd.key, () => {
                  self.freeNavigateUtilEnd(this.canvas, "ArrowUp");
                });
            }

            if (self.settings.hotkey.freeNavigateDownUntilEnd.key !== "" && self.settings.hotkey.freeNavigateDownUntilEnd.enabled) {
              this.scope.register(self.settings.hotkey.freeNavigateDownUntilEnd.modifiers.split("+"),
                self.settings.hotkey.freeNavigateDownUntilEnd.key, () => {
                  self.freeNavigateUtilEnd(this.canvas, "ArrowDown");
                });
            }

            if (self.settings.hotkey.freeNavigateLeftUntilEnd.key !== "" && self.settings.hotkey.freeNavigateLeftUntilEnd.enabled) {
              this.scope.register(self.settings.hotkey.freeNavigateLeftUntilEnd.modifiers.split("+"),
                self.settings.hotkey.freeNavigateLeftUntilEnd.key, () => {
                  self.freeNavigateUtilEnd(this.canvas, "ArrowLeft");
                });
            }

            if (self.settings.hotkey.freeNavigateRightUntilEnd.key !== "" && self.settings.hotkey.freeNavigateRightUntilEnd.enabled) {
              this.scope.register(self.settings.hotkey.freeNavigateRightUntilEnd.modifiers.split("+"),
                self.settings.hotkey.freeNavigateRightUntilEnd.key, () => {
                  self.freeNavigateUtilEnd(this.canvas, "ArrowRight");
                });
            }

            if (self.settings.hotkey.navigateUp.key !== "" && self.settings.hotkey.navigateUp.enabled) {
              this.scope.register(self.settings.hotkey.navigateUp.modifiers.split("+"),
                self.settings.hotkey.navigateUp.key, () => {
                  self.navigate(this.canvas, "ArrowUp");
                });
            }

            if (self.settings.hotkey.navigateDown.key !== "" && self.settings.hotkey.navigateDown.enabled) {
              this.scope.register(self.settings.hotkey.navigateDown.modifiers.split("+"),
                self.settings.hotkey.navigateDown.key, () => {
                  self.navigate(this.canvas, "ArrowDown");
                });
            }

            if (self.settings.hotkey.navigateLeft.key !== "" && self.settings.hotkey.navigateLeft.enabled) {
              this.scope.register(self.settings.hotkey.navigateLeft.modifiers.split("+"),
                self.settings.hotkey.navigateLeft.key, () => {
                  self.navigate(this.canvas, "ArrowLeft");
                });
            }

            if (self.settings.hotkey.navigateRight.key !== "" && self.settings.hotkey.navigateRight.enabled) {
              this.scope.register(self.settings.hotkey.navigateRight.modifiers.split("+"),
                self.settings.hotkey.navigateRight.key, () => {
                  self.navigate(this.canvas, "ArrowRight");
                });
            }

            if (self.settings.hotkey.navigateUpUntilEnd.key !== "" && self.settings.hotkey.navigateUpUntilEnd.enabled) {
              this.scope.register(self.settings.hotkey.navigateUpUntilEnd.modifiers.split("+"),
                self.settings.hotkey.navigateUpUntilEnd.key, () => {
                  self.navigateUtilEnd(this.canvas, "ArrowUp");
                });
            }

            if (self.settings.hotkey.navigateDownUntilEnd.key !== "" && self.settings.hotkey.navigateDownUntilEnd.enabled) {
              this.scope.register(self.settings.hotkey.navigateDownUntilEnd.modifiers.split("+"),
                self.settings.hotkey.navigateDownUntilEnd.key, () => {
                  self.navigateUtilEnd(this.canvas, "ArrowDown");
                });
            }

            if (self.settings.hotkey.navigateLeftUntilEnd.key !== "" && self.settings.hotkey.navigateLeftUntilEnd.enabled) {
              this.scope.register(self.settings.hotkey.navigateLeftUntilEnd.modifiers.split("+"),
                self.settings.hotkey.navigateLeftUntilEnd.key, () => {
                  self.navigateUtilEnd(this.canvas, "ArrowLeft");
                });
            }

            if (self.settings.hotkey.navigateRightUntilEnd.key !== "" && self.settings.hotkey.navigateRightUntilEnd.enabled) {
              this.scope.register(self.settings.hotkey.navigateRightUntilEnd.modifiers.split("+"),
                self.settings.hotkey.navigateRightUntilEnd.key, () => {
                  self.navigateUtilEnd(this.canvas, "ArrowRight");
                });
            }

            return next.call(this);
          }
      });

      this.register(canvasViewunistaller);
      canvasView.canvas.view.leaf.rebuildView();

      return true;
    };

    // Ensure patch runs after layout ready, and for all future Canvas leaves
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
      if (!editorInfo?.constructor || !editorInfo.containerEl || editorInfo.containerEl.closest('.common-editor-inputer') || editorInfo.file) return false;

      const patchEditorInfo = editorInfo.constructor;

      const self = this

      const uninstaller = around(patchEditorInfo.prototype, {
        showPreview: (next) =>
          function (e: any) {
            next.call(this, e);
            if (e && this.node?.canvas?.view && self.verifyCanvasLayout(this.node.canvas.view)) {
              this.node.canvas.wrapperEl.focus();
              this.node.setIsEditing(false);
              setTimeout(() => {
                if (this.node.text?.trim().length > 0) {
                  self.resizeNode(this.node, "left");
                  new Promise(requestAnimationFrame);
                  self.resizeNode(this.node, "bottom");
                }
                self.autoLayout(this.node.canvas, this.node)
              }, 100);
            }
          },
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

      if (!editorInfo?.constructor || !editorInfo.containerEl || editorInfo.containerEl.closest('.common-editor-inputer') || !editorInfo.file) return false;

      const patchEditorInfo = editorInfo.constructor;

      const self = this

      const uninstaller = around(patchEditorInfo.prototype, {
        showPreview: (next) =>
          function (e: any) {
            next.call(this, e);
            const canvasView = this.app.workspace.getActiveFileView()
            if (e && canvasView?.canvas?.selection.size === 1 && self.verifyCanvasLayout(canvasView)) {
              const node = canvasView.canvas.selection.values().next().value
              if (node) {
                node.canvas.wrapperEl.focus();
                node.setIsEditing(false);
                setTimeout(() => {
                  self.autoLayout(node.canvas, node)
                }, 100);
              }
            }
          },
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
      const canvasView = this.app.workspace.getActiveFileView();
      if (!canvasView?.canvas?.constructor) return false;

      const canvas = canvasView.canvas;

      const self = this

      const uninstaller = around(canvas.constructor.prototype, {
        updateSelection(next) {
          return function (...args: any[]) {
            if (this.selection.size === 1 && this.view && self.verifyCanvasLayout(this.view)) {
              const node = this.selection.values().next().value
              setTimeout(() => {
                self.autoLayout(node.canvas, node)
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

  resizeNode(node: any, n: string): number {
    const renderer = node?.child?.previewMode?.renderer
    let r = renderer?.previewEl;
    if (!r || !r.isShown())
      return 0;
    if ("top" === n || "bottom" === n) {
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
        if (s <= 1) return 1
        r.style.height = "";
        let l = s - a + 1;
        let height = node.height + l
        let finalHeight = maxHeight ? Math.min(maxHeight, height) : height
        if (finalHeight >= node.height && finalHeight < node.height + 1) break
        node.resize({
          width: node.width,
          height: finalHeight
        }),
          node.render(),
          node.canvas.requestSave();
      }
      return 0
    }
    const lines = renderer?.sizerEl?.children;
    let maxWidth = 0;

    for (const lineEl of lines) {
      if (lineEl.classList.contains("el-pre")) {
        return 0; //存在 .el-pre 类型元素 不修改宽度
      }
      const width = this.getLongestLineWidthFromElement(lineEl);
      if (width > maxWidth) maxWidth = width;
    }
    maxWidth += this.settings.nodeAutoResize.contentHorizontalPadding
    const finalWidth = this.settings.nodeAutoResize.maxWidth < 0 ? maxWidth : Math.min(maxWidth, this.settings.nodeAutoResize.maxWidth); // 最大宽度限制

    node.resize({
      width: finalWidth,
      height: node.height
    }),
      node.render(),
      node.canvas.requestSave();

    return 0
  }

  autoLayout(canvas: any, node: any) {
    if (this.layoutLevelIsCanvas(canvas)) {
      this.debounceRelayoutCanvas(canvas)
    } else if (this.layoutLevelIsTree(canvas)) {
      this.debounceRelayoutOneTree(node)
    }
  }

  layoutLevelIsCanvas(canvas: any): boolean {
    if (canvas?.view?.file?.name) {
      const fileName = canvas.view.file.name
      if ("" != this.settings.layout.whichFileUseCanvasLevelAutomaticLayout && fileName.includes(this.settings.layout.whichFileUseCanvasLevelAutomaticLayout)) {
        return true
      } else if ("" != this.settings.layout.whichFileUseTreeLevelAutomaticLayout && fileName.includes(this.settings.layout.whichFileUseTreeLevelAutomaticLayout)) {
        return false
      } else if ("" != this.settings.layout.whichFileNotAutomaticLayout && fileName.includes(this.settings.layout.whichFileNotAutomaticLayout)) {
        return false
      }
    }

    return AutomaticLayoutLevel.Canvas === this.settings.layout.automaticLayoutLevel
  }

  layoutLevelIsTree(canvas: any): boolean {
    if (canvas?.view?.file?.name) {
      const fileName = canvas.view.file.name
      if ("" != this.settings.layout.whichFileUseCanvasLevelAutomaticLayout && fileName.includes(this.settings.layout.whichFileUseCanvasLevelAutomaticLayout)) {
        return false
      } else if ("" != this.settings.layout.whichFileUseTreeLevelAutomaticLayout && fileName.includes(this.settings.layout.whichFileUseTreeLevelAutomaticLayout)) {
        return true
      } else if ("" != this.settings.layout.whichFileNotAutomaticLayout && fileName.includes(this.settings.layout.whichFileNotAutomaticLayout)) {
        return false
      }
    }
    return AutomaticLayoutLevel.Tree === this.settings.layout.automaticLayoutLevel
  }

  layoutLevelIsNo(canvas: any): boolean {
    if (canvas?.view?.file?.name) {
      const fileName = canvas.view.file.name
      if ("" != this.settings.layout.whichFileUseCanvasLevelAutomaticLayout && fileName.includes(this.settings.layout.whichFileUseCanvasLevelAutomaticLayout)) {
        return false
      } else if ("" != this.settings.layout.whichFileUseTreeLevelAutomaticLayout && fileName.includes(this.settings.layout.whichFileUseTreeLevelAutomaticLayout)) {
        return false
      } else if ("" != this.settings.layout.whichFileNotAutomaticLayout && fileName.includes(this.settings.layout.whichFileNotAutomaticLayout)) {
        return true
      }
    }
    return AutomaticLayoutLevel.None === this.settings.layout.automaticLayoutLevel
  }

  getTextPixelWidthFromElement(lineEl: HTMLElement): number {
    const text = lineEl.textContent ?? "";
    const style = getComputedStyle(lineEl);
    const font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return -1
    ctx.font = font;
    const metrics = ctx.measureText(text);
    return metrics.width;
  }

  getLongestLineWidthFromElement(lineEl: HTMLElement): number {
    if (!lineEl) return 0;
    const text = lineEl.textContent ?? "";
    const style = getComputedStyle(lineEl);
    const font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;

    // 创建 canvas 测文字
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return -1
    ctx.font = font;

    // 按换行符分行（<br> 变成了 \n）
    const lines = text.split("\n");

    let maxWidth = 0;
    for (const line of lines) {
      const width = ctx.measureText(line).width;
      if (width > maxWidth) maxWidth = width;
    }
    return maxWidth;
  }
}