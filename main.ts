import { Plugin, WorkspaceLeaf, Notice } from 'obsidian';
import { around } from "monkey-around";
import { DEFAULT_SETTINGS, MindMapSettings, MindMapSettingTab } from "mindMapSettings";

function generateId() {
  return Math.random().toString(36).substr(2, 10);
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
    if (!canvas) return null;
    const selectedNodes = Array.from(canvas.selection) as Array<{ id: string } | string>;
    if (selectedNodes.length === 0) return null;

    const node = selectedNodes[0];
    return typeof node === 'string' ? node : node.id ?? null;
  }

  private isFocusedNodeEditing(canvas: any): boolean {
    const parentNode = canvas.selection.entries().next().value[1];

    return parentNode.isEditing;
  }

  private createChildNode(canvas: any) {
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

    this.relayoutCanvas(canvas)
    setTimeout(() => {
      const createdNode = canvas.nodes.get(childId);
      createdNode.startEditing();
      canvas.zoomToSelection();
    }, 100);
  }

  private createSiblingNode(canvas: any) {
    if (!canvas) return;

    if (canvas.selection.size === 0){
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

  private deleteNode(canvas: any) {
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

  private getParentNode(canvas: any, nodeId: string) : any {
    let selectedItem = canvas.nodes.get(nodeId);
    let incomingEdges = canvas.getEdgesForNode(selectedItem).filter((e: any) => e.to.node.id === selectedItem.id);
    let parentNode = incomingEdges.length > 0 ? incomingEdges[0].from.node : null;
    return parentNode
  }

  private navigate(canvas: any, direction: string) {
    if (!canvas) return;

    const focusedNodeId = this.getFocusedNodeId(canvas);
    if (!focusedNodeId) return;

    let targetNode: any = null;
    let selectedItem = canvas.nodes.get(focusedNodeId);
    // 找到父节点（通过 edges）
    const parentNode = this.getParentNode(canvas, focusedNodeId);

    switch (direction) {
      case 'ArrowLeft':
        // 移动到父节点
        targetNode = parentNode;
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

    if (targetNode) {
      canvas.selectOnly(targetNode);
      canvas.zoomToSelection();
    }
  };

  private relayoutCanvas(canvas: any) {
    const data = canvas.getData();
    const nodeMap = new Map((data.nodes as any[]).map((n: any) => [n.id, n]));
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
            this.scope.register(["Alt"], "ArrowUp", () => {
              self.navigate(this.canvas, "ArrowUp");
            });
            this.scope.register(["Alt"], "ArrowDown", () => {
              self.navigate(this.canvas, "ArrowDown");
            });
            this.scope.register(["Alt"], "ArrowLeft", () => {
              self.navigate(this.canvas, "ArrowLeft");
            });
            this.scope.register(["Alt"], "ArrowRight", () => {
              self.navigate(this.canvas, "ArrowRight");
            });

            this.scope.register([], "Enter", async () => {
              self.createSiblingNode(this.canvas);
            });

            this.scope.register([], "Tab", async (ev: KeyboardEvent) => {
              self.createChildNode(this.canvas);
            });

            this.scope.register([], ' ', async (ev: KeyboardEvent) => {
              const selection = this.canvas.selection;
              if (selection.size !== 1) return;
              const node = selection.entries().next().value[1];

              if (node?.label || node?.url) return;

              if (node.isEditing) return;
              node.startEditing();
              this.canvas.zoomToSelection();
            });

            this.scope.register([], "Backspace", async (ev: KeyboardEvent) => {
              self.deleteNode(this.canvas);
            });

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
              this.node?.canvas.wrapperEl.focus();
              this.node?.setIsEditing(false);
              if(this.node?.text?.length > 0){
                setTimeout(() => {
                  const fakeEvent = new MouseEvent('dblclick', { bubbles: true });
                  this.node?.onResizeDblclick(fakeEvent, 'bottom');
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
}