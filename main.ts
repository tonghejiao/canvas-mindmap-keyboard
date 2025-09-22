import { Plugin } from 'obsidian';
import { around } from "monkey-around";
import { DEFAULT_SETTINGS, MindMapSettings, MindMapSettingTab } from "mindMapSettings";

function generateId() {
  return Math.random().toString(36).substr(2, 10);
}

interface CanvasNode {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

declare module 'obsidian' {
  interface MarkdownFileInfo {
    containerEl: HTMLElement;
  }
}

export default class CanvasMindmap extends Plugin {
  settings: MindMapSettings;
  settingTab: MindMapSettingTab;

  async onload() {
    await this.registerSettings();
    this.patchCanvas();
    this.patchMarkdownFileInfo();
    console.log('Canvas MindMap Plugin loaded');
  }

  async registerSettings() {
    this.settingTab = new MindMapSettingTab(this.app, this);
    this.addSettingTab(this.settingTab);
    await this.loadSettings();
  }

  public async loadSettings(): Promise<void> {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  private createRootNode(canvas: any) {
    const node = canvas.createTextNode({
      pos: {
        x: 0,
        y: 0,
        height: this.settings.creatNode.height,
        width: this.settings.creatNode.width
      },
      size: {
        x: 0,
        y: 0,
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
    this.relayoutCanvas(canvas);

    setTimeout(() => {
      node.startEditing();
      canvas.zoomToSelection();
    }, 0);
  }

  private getFocusedNodeId(canvas: any): string | null {
    return canvas?.selection?.values().next().value?.id ?? null;
  }

  private isFocusedNodeEditing(canvas: any): boolean {
    return canvas.selection.values().next().value.isEditing;
  }

  private createChildNode(canvas: any) {
    if (!this.verifyCanvasLayout()) return;

    if (!canvas) return;

    if (canvas.selection.size !== 1) return;
    if (this.isFocusedNodeEditing(canvas)) return;

    const focusedNodeId = this.getFocusedNodeId(canvas);
    if (!focusedNodeId) return;

    // Get all nodes and edges
    const data = canvas.getData();
    const nodes = data?.nodes || [];
    const edges = data?.edges || [];
    const parentNode = nodes.find((n: any) => n.id === focusedNodeId);
    if (!parentNode) return;

    // Create new child node relative to parent
    const childId = generateId();
    const newNode = {
      id: childId,
      parent: focusedNodeId,
      children: [],
      text: '',
      type: 'text',
      x: parentNode.x + parentNode.width + this.settings.layout.horizontalGap,
      y: parentNode.y,
      width: this.settings.creatNode.width,
      height: this.settings.creatNode.height
    };

    // Add a new edge connecting parent and child
    const newEdge = {
      id: generateId(),
      fromNode: focusedNodeId,
      toNode: childId
    };

    // Import updated nodes and edges
    canvas.importData({
      nodes: [...nodes, newNode],
      edges: [...edges, newEdge]
    });
    canvas.requestFrame();
    canvas.requestSave();

    setTimeout(() => {
      const createdNode = canvas.nodes.get(childId);
      createdNode.startEditing();
      canvas.zoomToSelection();
      this.relayoutCanvas(canvas)
    }, 100);
  }

  private createSiblingNode(canvas: any) {
    if (!this.verifyCanvasLayout()) return;

    if (!canvas) return;

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
    const currentNode = nodes.find((n: any) => n.id === focusedNodeId);
    if (!currentNode) return;

    // 没有父节点则不能创建同级节点
    const parentId = currentNode.parent;

    if (parentId) {
      const parentNode = nodes.find((n: any) => n.id === parentId);
      if (!parentNode) return;
    }

    // 新同级节点位置在当前节点下方
    const siblingId = generateId();
    const newNode = {
      id: siblingId,
      parent: parentId,
      children: [],
      text: '',
      type: 'text',
      x: currentNode.x,
      y: currentNode.y + currentNode.height + this.settings.layout.horizontalGap,
      width: this.settings.creatNode.width,
      height: this.settings.creatNode.height
    };

    // 添加新边连接父节点和新同级节点
    const newEdge = {
      id: generateId(),
      fromNode: parentId,
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

    this.relayoutCanvas(canvas);
    setTimeout(() => {
      const createdNode = canvas.nodes.get(siblingId);
      createdNode.startEditing();
      canvas.zoomToSelection();
    }, 100);
  }

  private startEditingNode(canvas: any) {
    if (!this.verifyCanvasLayout()) return;
    if (!canvas) return;

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
    if (!this.verifyCanvasLayout()) return;

    if (!canvas) return;

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

    this.relayoutCanvas(canvas);
    if (parentNode) {
      setTimeout(() => {
        canvas.selectOnly(parentNode);
        canvas.zoomToSelection();
      }, 100);
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
        if (childrenNodes.length > 0) targetNode = childrenNodes[0];
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
    if (!this.verifyCanvasLayout()) return;

    if (!canvas) return;

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
    if (!this.verifyCanvasLayout()) return;

    if (!canvas) return;

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
    if (!this.verifyCanvasLayout()) return;
    if (!canvas) return;

    const selected = canvas.selection;
    if (selected.size !== 1 || this.isFocusedNodeEditing(canvas)) return;

    const currentNode = selected.values().next().value;

    const bestNode = this.getNextNodeInFreeMode(canvas, direction, currentNode);
    if (!bestNode) return;
    canvas.selectOnly(bestNode);
    canvas.zoomToSelection();
  }

  private freeNavigateUtilEnd(canvas: any, direction: string) {
    if (!this.verifyCanvasLayout()) return;
    if (!canvas) return;

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

  private relayoutCanvas(canvas: any) {
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

    const horizontalGap = this.settings.layout.horizontalGap; // 水平间距
    const verticalGap = this.settings.layout.verticalGap; // 垂直间距

    let nodeHeightMap = this.getSubtreeHeightMap(nodeMap, childrenMap, rootIds, verticalGap);

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

      for (const childId of children) {
        const childHeight = nodeHeightMap.get(childId);
        if (!childHeight) continue;
        // 递归布局子节点，横向偏移，纵向位置为currentY
        layoutNode(childId, x + node.width + horizontalGap, currentY);
        currentY += childHeight + verticalGap;
      }
    };

    // 从根节点开始布局
    let startY = 0;
    for (const rootId of rootIds) {
      layoutNode(rootId, 0, startY);
      const rootHeight = nodeHeightMap.get(rootId) || 0;
      startY += rootHeight + verticalGap;
    }

    canvas.importData({
      nodes: data.nodes,
      edges: edges
    });
    canvas.requestFrame();
    canvas.requestSave();
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
        const top = node.y;
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

  verifyCanvasLayout(): boolean {
    const canvasView = this.app.workspace.getLeavesOfType("canvas").first()?.view;
    // @ts-ignore
    if (!canvasView?.file?.name?.includes(this.settings.condition.fileNameInclude)) return false;
    return true;
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
      const canvasView = this.app.workspace.getLeavesOfType("canvas").first()?.view;
      if (!canvasView) return false;
      // @ts-ignore
      const canvas = canvasView.canvas;

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
      canvas?.view.leaf.rebuildView();
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

      if (!editorInfo) return false;
      if (!editorInfo || !editorInfo.containerEl || editorInfo.containerEl.closest('.common-editor-inputer')) return false;

      const patchEditorInfo = editorInfo.constructor;

      const self = this

      const uninstaller = around(patchEditorInfo.prototype, {
        showPreview: (next) =>
          function (e: any) {
            next.call(this, e);
            if (e) {
              if (!self.verifyCanvasLayout()) return;
              this.node?.canvas.wrapperEl.focus();
              this.node?.setIsEditing(false);
              if (this.node?.text?.trim().length > 0) {
                setTimeout(() => {
                  self.resizeNode(this.node, "bottom");
                  self.relayoutCanvas(this.node?.canvas);
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

  resizeNode(node: any, n: string) {
    var i = node.child;
    var r = i.previewMode.renderer.previewEl;
    if (!r.isShown())
      return;
    if ("top" === n || "bottom" === n) {
      let maxHeight = null;
      if (this.settings.nodeAutoResize.maxLine >= 0) {
        const computed = window.getComputedStyle(r);
        const lineHeight = parseFloat(computed.lineHeight);
        maxHeight = lineHeight * this.settings.nodeAutoResize.maxLine;
      }
      
      for (var o = 0; o < 10; o++) {
        var a = r.clientHeight;
        r.style.height = "1px";
        var s = r.scrollHeight;
        r.style.height = "";
        var l = s - a + 1;
        node.resize({
          width: node.width,
          height: maxHeight ? Math.min(maxHeight, node.height + l) : node.height + l
        }),
          node.render(),
          node.canvas.requestSave()
      }
      return
    }
    r.style.height = "1px";
    try {
      var c = r.scrollHeight + .1
        , u = node.width
        , h = 0
        , p = u;
      for (o = 0; o < 10; o++) {
        var d = Math.round((h + p) / 2);
        if (node.resize({
          width: d,
          height: node.height
        }),
          node.render(),
          r.scrollHeight > c ? h = d : p = d,
          p - h < 1)
          break
      }
      node.resize({
        width: p,
        height: node.height
      }),
        r.scrollHeight > c ? (node.resize({
          width: u,
          height: node.height
        }),
          node.render()) : node.canvas.requestSave()
    } finally {
      r.style.height = ""
    }
  }
}