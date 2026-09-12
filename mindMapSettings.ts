import { App, debounce, Platform, PluginSettingTab, Setting } from "obsidian";
import CanvasMindMap from "main";

interface Hotkey {
	modifiers: string;
	key: string;
	enabled: boolean;
}

export enum AutomaticLayoutLevel {
	Canvas = 0,
	Tree = 1,
	None = 2,
}

export type PluginLanguage = "en" | "zh";

export interface MindMapSettings {
	language: PluginLanguage;
	condition: {
		fileNameInclude: string; // 文件名包含
	},
	creatNode: {
		width: number;
		height: number;		
	},
	layout: {
		automaticGlobalLayout: boolean; // 自动全局布局开关
		automaticLayoutLevel: number;
		whichFileUseCanvasLevelAutomaticLayout: string;
		whichFileUseTreeLevelAutomaticLayout: string;
		whichFileNotAutomaticLayout: string;
		horizontalGap: number; // 水平间距
		verticalGap: number; // 垂直间距
	},
	nodeAutoResize: {
		autoResizeWidthSwitch: boolean; // 是否开启节点自动宽度
		autoResizeHeightSwitch: boolean; // 是否开启节点自动高度
		maxLine: number; // 节点自动增高的最大行数，超过后不再自动增高
		maxWidth: number;
		contentHorizontalPadding: number;
	}
	collapseEnabled: boolean;
	collapsedNodes: { [key: string]: string[] };
	collapseRelayoutScope: string; // "tree" | "canvas"
	collapseColorExpanded: string;
	collapseColorCollapsed: string;
	dragReattachEnabled: boolean;
	dragReattachOverlapRatio: number;
	checklistProgress: {
		enabled: boolean;
		style: "bar" | "pie";
		barHeight: number;
		barLength: number; // 进度条长度（占节点宽度百分比）
		barColorDone: string;
		barColorTodo: string;
		pieSize: number;
		pieColorDone: string;
		pieColorTodo: string;
		showCount: boolean;
		showPercentAtJunction: boolean;
	}
	hotkey: {
		createChildNode: Hotkey,
		createSiblingNodeOrRootNode: Hotkey,
		deleteNode: Hotkey,
		editNodeOrSelectionNode: Hotkey,
		navigateUp: Hotkey,
		navigateDown: Hotkey,
		navigateLeft: Hotkey,
		navigateRight: Hotkey,
		freeNavigateUp: Hotkey,
		freeNavigateDown: Hotkey,
		freeNavigateLeft: Hotkey,
		freeNavigateRight: Hotkey,
		navigateUpUntilEnd: Hotkey,
		navigateDownUntilEnd: Hotkey,
		navigateLeftUntilEnd: Hotkey,
		navigateRightUntilEnd: Hotkey,
		freeNavigateUpUntilEnd: Hotkey,
		freeNavigateDownUntilEnd: Hotkey,
		freeNavigateLeftUntilEnd: Hotkey,
		freeNavigateRightUntilEnd: Hotkey,
	}
}


export const DEFAULT_SETTINGS: MindMapSettings = {
	language: 'zh',
	condition: {
		fileNameInclude: 'mindmap', // 文件名包含
	},
	creatNode: {
		width: 300,
		height: 54,
	},
	layout: {
		automaticGlobalLayout: true, // 自动全局布局开关 (弃用)
		automaticLayoutLevel: AutomaticLayoutLevel.Tree,
		whichFileUseCanvasLevelAutomaticLayout: "canvaslal",
		whichFileUseTreeLevelAutomaticLayout: "treelal",
		whichFileNotAutomaticLayout: "notal",
		horizontalGap: 100, // 水平间距
		verticalGap: 30,// 垂直间距
	},
	nodeAutoResize: {
		autoResizeWidthSwitch: true, // 是否开启节点自动宽度
		autoResizeHeightSwitch: true, // 是否开启节点自动高度
		maxLine: -1, // 节点自动增高的最大行数，超过后不再自动增高
		maxWidth: 380,
		contentHorizontalPadding: Platform.isMacOS ? 40 : 35,
	},
	collapseEnabled: true,
	collapsedNodes: {},
	collapseRelayoutScope: "tree",
	collapseColorExpanded: "#8b9aaf",
	collapseColorCollapsed: "#18b8a6",
	dragReattachEnabled: true,
	dragReattachOverlapRatio: 0.3,
	checklistProgress: {
		enabled: true,
		style: "bar",
		barHeight: 8,
		barLength: 95,
		barColorDone: "#51cf66",
		barColorTodo: "#ff6b6b",
		pieSize: 14,
		pieColorDone: "#4dabf7",
		pieColorTodo: "#e9ecef",
		showCount: true,
		showPercentAtJunction: false,
	},
	hotkey: {
		createChildNode: { modifiers: "", key: "Tab", enabled: true },
		createSiblingNodeOrRootNode: { modifiers: "", key: "Enter", enabled: true },
		deleteNode: { modifiers: "", key: "Backspace", enabled: true },
		editNodeOrSelectionNode: { modifiers: "", key: " ", enabled: true },
		navigateUp: { modifiers: Platform.isMacOS ? "Ctrl" : "Alt", key: "i", enabled: true },
		navigateDown: { modifiers: Platform.isMacOS ? "Ctrl" : "Alt", key: "k", enabled: true },
		navigateLeft: { modifiers: Platform.isMacOS ? "Ctrl" : "Alt", key: "j", enabled: true },
		navigateRight: { modifiers: Platform.isMacOS ? "Ctrl" : "Alt", key: "l", enabled: true },
		freeNavigateUp: { modifiers: "", key: "i", enabled: true },
		freeNavigateDown: { modifiers: "", key: "k", enabled: true },
		freeNavigateLeft: { modifiers: "", key: "j", enabled: true },
		freeNavigateRight: { modifiers: "", key: "l", enabled: true },
		navigateUpUntilEnd: { modifiers: Platform.isMacOS ? "Ctrl+Shift" : "Alt+Shift", key: "i", enabled: true },
		navigateDownUntilEnd: { modifiers: Platform.isMacOS ? "Ctrl+Shift" : "Alt+Shift", key: "k", enabled: true },
		navigateLeftUntilEnd: { modifiers: Platform.isMacOS ? "Ctrl+Shift" : "Alt+Shift", key: "j", enabled: true },
		navigateRightUntilEnd: { modifiers: Platform.isMacOS ? "Ctrl+Shift" : "Alt+Shift", key: "l", enabled: true },
		freeNavigateUpUntilEnd: { modifiers: "Shift", key: "i", enabled: true },
		freeNavigateDownUntilEnd: { modifiers: "Shift", key: "k", enabled: true },
		freeNavigateLeftUntilEnd: { modifiers: "Shift", key: "j", enabled: true },
		freeNavigateRightUntilEnd: { modifiers: "Shift", key: "l", enabled: true },
	}
};

const I18N = {
	en: {
		donate: "Donate",
		donateDesc: "If you like this plugin, consider donating to support continued development:",
		language: "Language",
		languageDesc: "Select the language for the plugin settings interface.",
		langEn: "English",
		langZh: "中文",
		condition: "condition",
		filenameInclude: "filename include",
		filenameIncludeDesc: "Only files with names containing this string will have the mind map feature enabled.",
		filenameIncludePlaceholder: "filename include",
		createNode: "create node",
		width: "width",
		widthPlaceholder: "width",
		height: "height",
		heightPlaceholder: "height",
		layout: "layout",
		defaultAutomaticLayoutLevel: "default automatic layout level",
		layoutCanvas: "automatic layout in the canvas",
		layoutTree: "automatic layout in the tree",
		layoutNone: "not automatic layout",
		whichFileUseCanvasLevel: "Which type of file uses canvas-level automatic layout?",
		whichFileUseTreeLevel: "Which type of file uses tree-level automatic layout?",
		whichFileNotAutomatic: "Which type of file are not automatic layout?",
		fileNameContainsPlaceholder: "The file name contains",
		horizontalGap: "horizontal gap",
		horizontalGapPlaceholder: "horizontal gap",
		verticalGap: "vertical gap",
		verticalGapPlaceholder: "vertical gap",
		nodeAutoResize: "node auto resize",
		autoResizeWidthSwitch: "auto resize width switch",
		autoResizeHeightSwitch: "auto resize height switch",
		maxLine: "max line",
		maxLineDesc: "The maximum number of lines for automatic height increase of nodes. If exceeded, the height will no longer increase automatically. Set to -1 for unlimited lines.",
		maxLinePlaceholder: "max line",
		maxWidth: "max Width",
		maxWidthPlaceholder: "max Width",
		contentHorizontalPadding: "Content Horizontal Padding",
		contentHorizontalPaddingPlaceholder: "Content Horizontal Padding",
		collapseSection: "collapse / expand (fold & drag re-parent)",
		enableCollapse: "Enable collapse / expand",
		enableCollapseDesc: "Show a +/- button on any node that has children. - collapses the whole subtree; + expands only the next level. Right-click a node for collapse / expand / expand next level. The collapsed state is saved per canvas file.",
		relayoutScope: "Relayout scope after collapse / expand",
		relayoutScopeDesc: "Which nodes get re-arranged after a collapse/expand action. 'Only the affected tree' (default) keeps every other node exactly where it is; 'Whole canvas' re-arranges all root nodes and trees.",
		scopeTree: "Only the affected tree (recommended)",
		scopeCanvas: "Whole canvas",
		dragReparent: "Drag a node onto another to re-parent it",
		dragReparentDesc: "Drag node A (with its whole subtree) over node B: A is detached from its old parent and appended as B's last child. Enable this on touch devices to re-arrange the tree without a keyboard.",
		expandedButtonColor: "Expanded button color",
		expandedButtonColorDesc: "Background color of the + (expand) button shown on a collapsed node.",
		collapsedButtonColor: "Collapsed button color",
		collapsedButtonColorDesc: "Background color of the - (collapse) button shown on an expanded node.",
		checklistProgress: "checklist progress",
		checklistProgressDesc: "Show a completion indicator on canvas nodes that contain checklist items (- [ ] / - [x]).",
		enableChecklistProgress: "Enable checklist progress",
		enableChecklistProgressDesc: "Show progress bar or pie chart on nodes with checkboxes.",
		progressStyle: "Progress style",
		progressStyleDesc: "Choose how the completion is visualized.",
		styleBar: "Horizontal progress bar",
		stylePie: "Pie chart (top-left corner)",
		showCount: "Show count / percentage",
		showCountDesc: 'Bar: merged with the percentage into one badge above the junction, e.g. "33%=2/6". Pie: shows "75%".',
		showPercentAtJunction: "Show percentage at junction",
		showPercentAtJunctionDesc: 'In bar mode, show the percentage above the done/todo seam. When "Show count" is also on, the two merge into one badge, e.g. "33%=2/6".',
		barHeight: "Bar height (px)",
		barHeightPlaceholder: "6",
		barLength: "Bar length (% of node width)",
		barLengthDesc: "Length of the capsule progress bar as a percentage of the node's top-edge width. Slightly less than 100% (e.g. 95%) keeps the rounded ends clear of the node corners.",
		barLengthPlaceholder: "95",
		barDoneColor: "Bar done color",
		barTodoColor: "Bar todo color",
		pieSize: "Pie size (px)",
		pieSizePlaceholder: "18",
		pieDoneColor: "Pie done color",
		pieTodoColor: "Pie todo color",
		hotkey: "hotkey",
		hotkeyDesc: "After modification, it needs to be restarted before it will take effect.",
		modifiersPlaceholder: "modifiers, use + to separate, e.g. Ctrl+Shift",
		keyPlaceholder: "key",
		createChildNode: "create child node",
		createSiblingNodeOrRootNode: "create sibling node or root node",
		deleteNode: "delete node",
		editNodeOrSelectionNode: "edit node or selection node",
		navigateUp: "navigate up",
		navigateDown: "navigate down",
		navigateLeft: "navigate left",
		navigateRight: "navigate right",
		freeNavigateUp: "free navigate up",
		freeNavigateDown: "free navigate down",
		freeNavigateLeft: "free navigate left",
		freeNavigateRight: "free navigate right",
		navigateUpUntilEnd: "navigate up until end",
		navigateDownUntilEnd: "navigate down until end",
		navigateLeftUntilEnd: "navigate left until end",
		navigateRightUntilEnd: "navigate right until end",
		freeNavigateUpUntilEnd: "free navigate up until end",
		freeNavigateDownUntilEnd: "free navigate down until end",
		freeNavigateLeftUntilEnd: "free navigate left until end",
		freeNavigateRightUntilEnd: "free navigate right until end",
	},
	zh: {
		donate: "捐赠",
		donateDesc: "如果你喜欢这个插件，可以考虑捐赠以支持持续开发：",
		language: "界面语言",
		languageDesc: "选择插件设置界面的显示语言。",
		langEn: "English",
		langZh: "中文",
		condition: "触发条件",
		filenameInclude: "文件名包含",
		filenameIncludeDesc: "只有文件名包含此字符串的画布才会启用思维导图功能。",
		filenameIncludePlaceholder: "文件名包含",
		createNode: "创建节点",
		width: "宽度",
		widthPlaceholder: "宽度",
		height: "高度",
		heightPlaceholder: "高度",
		layout: "布局",
		defaultAutomaticLayoutLevel: "默认自动布局范围",
		layoutCanvas: "整个画布自动布局",
		layoutTree: "仅当前树自动布局",
		layoutNone: "不自动布局",
		whichFileUseCanvasLevel: "哪些文件使用画布级自动布局？",
		whichFileUseTreeLevel: "哪些文件使用树级自动布局？",
		whichFileNotAutomatic: "哪些文件不自动布局？",
		fileNameContainsPlaceholder: "文件名包含",
		horizontalGap: "水平间距",
		horizontalGapPlaceholder: "水平间距",
		verticalGap: "垂直间距",
		verticalGapPlaceholder: "垂直间距",
		nodeAutoResize: "节点自动尺寸",
		autoResizeWidthSwitch: "自动调整宽度",
		autoResizeHeightSwitch: "自动调整高度",
		maxLine: "最大行数",
		maxLineDesc: "节点自动增高的最大行数，超过后不再自动增高。设为 -1 表示不限制。",
		maxLinePlaceholder: "最大行数",
		maxWidth: "最大宽度",
		maxWidthPlaceholder: "最大宽度",
		contentHorizontalPadding: "内容水平内边距",
		contentHorizontalPaddingPlaceholder: "内容水平内边距",
		collapseSection: "折叠 / 展开（含拖拽改挂父节点）",
		enableCollapse: "启用折叠 / 展开",
		enableCollapseDesc: "在有子节点的节点上显示 +/− 按钮：− 折叠整棵子树，+ 只展开下一级。右键节点可 折叠 / 展开 / 展开下级。折叠状态按画布文件保存。",
		relayoutScope: "折叠/展开后重排范围",
		relayoutScopeDesc: "折叠/展开后哪些节点会被重新排列。'只重排受影响的树'（推荐）保持其他节点位置不变；'整个画布'会重排所有根节点和树。",
		scopeTree: "只重排受影响的树（推荐）",
		scopeCanvas: "整个画布",
		dragReparent: "拖拽节点到另一个节点上改挂父节点",
		dragReparentDesc: "把节点 A（含整棵子树）拖到节点 B 上：A 会从旧父节点脱离，挂到 B 下作为最后一个子节点。拖到 A 的父节点或祖先上无效。在触屏设备上可不用键盘直接调整树结构。",
		expandedButtonColor: "展开按钮颜色",
		expandedButtonColorDesc: "折叠节点上显示的 +（展开）按钮背景色。",
		collapsedButtonColor: "折叠按钮颜色",
		collapsedButtonColorDesc: "展开节点上显示的 −（折叠）按钮背景色。",
		checklistProgress: "清单进度",
		checklistProgressDesc: "在包含清单项（- [ ] / - [x]）的画布节点上显示完成度指示器。",
		enableChecklistProgress: "启用清单进度",
		enableChecklistProgressDesc: "在有复选框的节点上显示进度条或饼图。",
		progressStyle: "进度样式",
		progressStyleDesc: "选择完成度的可视化方式。",
		styleBar: "水平进度条",
		stylePie: "饼图（左上角）",
		showCount: "显示计数 / 百分比",
		showCountDesc: "进度条模式：与百分比合并为一枚徽标显示在交界处上方（例如 33%=2/6）；饼图模式：显示 75%。",
		showPercentAtJunction: "在交接处显示百分比",
		showPercentAtJunctionDesc: "进度条模式下，在完成与未完成的分界线上方显示百分比；开启「显示计数」时两者合并为一枚徽标，例如 33%=2/6。",
		barHeight: "进度条高度（px）",
		barHeightPlaceholder: "6",
		barLength: "进度条长度（占节点宽度百分比）",
		barLengthDesc: "胶囊形进度条的长度，占节点上边框宽度的百分比。略小于 100%（例如 95%）可让两端圆角避开节点边角，避免生硬。",
		barLengthPlaceholder: "95",
		barDoneColor: "进度条完成色",
		barTodoColor: "进度条未完成色",
		pieSize: "饼图大小（px）",
		pieSizePlaceholder: "18",
		pieDoneColor: "饼图完成色",
		pieTodoColor: "饼图未完成色",
		hotkey: "快捷键",
		hotkeyDesc: "修改后需要重启 Obsidian 才能生效。",
		modifiersPlaceholder: "修饰键，用 + 分隔，例如 Ctrl+Shift",
		keyPlaceholder: "按键",
		createChildNode: "创建子节点",
		createSiblingNodeOrRootNode: "创建同级/根节点",
		deleteNode: "删除节点",
		editNodeOrSelectionNode: "编辑节点/选中节点",
		navigateUp: "向上导航",
		navigateDown: "向下导航",
		navigateLeft: "向左导航",
		navigateRight: "向右导航",
		freeNavigateUp: "自由向上导航",
		freeNavigateDown: "自由向下导航",
		freeNavigateLeft: "自由向左导航",
		freeNavigateRight: "自由向右导航",
		navigateUpUntilEnd: "向上导航到末尾",
		navigateDownUntilEnd: "向下导航到末尾",
		navigateLeftUntilEnd: "向左导航到末尾",
		navigateRightUntilEnd: "向右导航到末尾",
		freeNavigateUpUntilEnd: "自由向上到末尾",
		freeNavigateDownUntilEnd: "自由向下到末尾",
		freeNavigateLeftUntilEnd: "自由向左到末尾",
		freeNavigateRightUntilEnd: "自由向右到末尾",
	},
} as const;

type LangKey = keyof typeof I18N.en;

function t(plugin: CanvasMindMap, key: LangKey): string {
	const lang = plugin.settings.language || 'zh';
	return (I18N[lang as keyof typeof I18N] || I18N.zh)[key] || I18N.en[key];
}

export class MindMapSettingTab extends PluginSettingTab {
	plugin: CanvasMindMap;

	constructor(app: App, plugin: CanvasMindMap) {
		super(app, plugin);
		this.plugin = plugin;
	}



	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName(t(this.plugin, 'language'))
			.setDesc(t(this.plugin, 'languageDesc'))
			.addDropdown(dropdown => {
				dropdown.addOption('en', t(this.plugin, 'langEn'));
				dropdown.addOption('zh', t(this.plugin, 'langZh'));
				dropdown
					.setValue(this.plugin.settings.language || 'zh')
					.onChange(async (value) => {
						this.plugin.settings.language = value as PluginLanguage;
						await this.plugin.saveSettings();
						this.display();
					});
			});

		new Setting(containerEl)
			.setName(t(this.plugin, 'donate'))
			.setDesc(t(this.plugin, 'donateDesc'))
			.addButton((bt) => {
				bt.buttonEl.outerHTML = `<a href="https://ko-fi.com/conantong02"><img src="https://storage.ko-fi.com/cdn/logomarkLogo.png" width=60></a>`;
			});

		containerEl.createEl('h2', { text: t(this.plugin, 'condition') });
		new Setting(containerEl)
			.setName(t(this.plugin, 'filenameInclude'))
			.setDesc(t(this.plugin, 'filenameIncludeDesc'))
			.addText(text => text
				.setPlaceholder(t(this.plugin, 'filenameIncludePlaceholder'))
				.setValue(this.plugin.settings.condition.fileNameInclude)
				.onChange(debounce(async (value) => {
					this.plugin.settings.condition.fileNameInclude = value;
					await this.plugin.saveSettings();
				}, 500))
			);

		containerEl.createEl('h2', { text: t(this.plugin, 'createNode') });
		new Setting(containerEl)
			.setName(t(this.plugin, 'width'))
			.addText(text => text
				.setPlaceholder(t(this.plugin, 'widthPlaceholder'))
				.setValue(this.plugin.settings.creatNode.width.toString())
				.onChange(debounce(async (value) => {
					const intValue = parseInt(value);
					if (!isNaN(intValue) && intValue > 0) {
						this.plugin.settings.creatNode.width = intValue;
						await this.plugin.saveSettings();
					}
				}, 500))
			);

		new Setting(containerEl)
			.setName(t(this.plugin, 'height'))
			.addText(text => text
				.setPlaceholder(t(this.plugin, 'heightPlaceholder'))
				.setValue(this.plugin.settings.creatNode.height.toString())
				.onChange(debounce(async (value) => {
					const intValue = parseInt(value);
					if (!isNaN(intValue) && intValue > 0) {
						this.plugin.settings.creatNode.height = intValue;
						await this.plugin.saveSettings();
					}
				}, 500))
			);

		containerEl.createEl('h2', { text: t(this.plugin, 'layout') });
		new Setting(containerEl)
			.setName(t(this.plugin, 'defaultAutomaticLayoutLevel'))
			.addDropdown(dropdown => {
				dropdown.addOption(AutomaticLayoutLevel.Canvas.toString(), t(this.plugin, "layoutCanvas"));
				dropdown.addOption(AutomaticLayoutLevel.Tree.toString(), t(this.plugin, "layoutTree"));
				dropdown.addOption(AutomaticLayoutLevel.None.toString(), t(this.plugin, "layoutNone"));

				dropdown
					.setValue(this.plugin.settings.layout.automaticLayoutLevel.toString())
					.onChange(async (value) => {
						const intValue = parseInt(value);
						if (!isNaN(intValue)) {
							this.plugin.settings.layout.automaticLayoutLevel = intValue;
							await this.plugin.saveSettings();
						}
					});
			});

		new Setting(containerEl)
			.setName(t(this.plugin, 'whichFileUseCanvasLevel'))
			.addText(text => text
				.setPlaceholder(t(this.plugin, 'fileNameContainsPlaceholder'))
				.setValue(this.plugin.settings.layout.whichFileUseCanvasLevelAutomaticLayout)
				.onChange(debounce(async (value) => {
					this.plugin.settings.layout.whichFileUseCanvasLevelAutomaticLayout = value;
				}, 500))
			);

		new Setting(containerEl)
			.setName(t(this.plugin, 'whichFileUseTreeLevel'))
			.addText(text => text
				.setPlaceholder(t(this.plugin, 'fileNameContainsPlaceholder'))
				.setValue(this.plugin.settings.layout.whichFileUseTreeLevelAutomaticLayout)
				.onChange(debounce(async (value) => {
					this.plugin.settings.layout.whichFileUseTreeLevelAutomaticLayout = value;
				}, 500))
			);

		new Setting(containerEl)
			.setName(t(this.plugin, 'whichFileNotAutomatic'))
			.addText(text => text
				.setPlaceholder(t(this.plugin, 'fileNameContainsPlaceholder'))
				.setValue(this.plugin.settings.layout.whichFileNotAutomaticLayout)
				.onChange(debounce(async (value) => {
					this.plugin.settings.layout.whichFileNotAutomaticLayout = value;
				}, 500))
			);

		new Setting(containerEl)
			.setName(t(this.plugin, 'horizontalGap'))
			.addText(text => text
				.setPlaceholder(t(this.plugin, 'horizontalGapPlaceholder'))
				.setValue(this.plugin.settings.layout.horizontalGap.toString())
				.onChange(debounce(async (value) => {
					const intValue = parseInt(value);
					if (!isNaN(intValue) && intValue > 0) {
						this.plugin.settings.layout.horizontalGap = intValue;
						await this.plugin.saveSettings();
					}
				}, 500))
			);

		new Setting(containerEl)
			.setName(t(this.plugin, 'verticalGap'))
			.addText(text => text
				.setPlaceholder(t(this.plugin, 'verticalGapPlaceholder'))
				.setValue(this.plugin.settings.layout.verticalGap.toString())
				.onChange(debounce(async (value) => {
					const intValue = parseInt(value);
					if (!isNaN(intValue) && intValue > 0) {
						this.plugin.settings.layout.verticalGap = intValue;
						await this.plugin.saveSettings();
					}
				}, 500))
			);

		containerEl.createEl('h2', { text: t(this.plugin, 'nodeAutoResize') });
		new Setting(containerEl)
			.setName(t(this.plugin, 'autoResizeWidthSwitch'))
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.nodeAutoResize.autoResizeWidthSwitch)
				.onChange(async (value) => {
					this.plugin.settings.nodeAutoResize.autoResizeWidthSwitch = value;
					await this.plugin.saveSettings();
				})
			);

		new Setting(containerEl)
			.setName(t(this.plugin, 'autoResizeHeightSwitch'))
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.nodeAutoResize.autoResizeHeightSwitch)
				.onChange(async (value) => {
					this.plugin.settings.nodeAutoResize.autoResizeHeightSwitch = value;
					await this.plugin.saveSettings();
				})
			);
		
		new Setting(containerEl)
			.setName(t(this.plugin, 'maxLine'))
			.setDesc(t(this.plugin, 'maxLineDesc'))
			.addText(text => text
				.setPlaceholder(t(this.plugin, 'maxLinePlaceholder'))
				.setValue(this.plugin.settings.nodeAutoResize.maxLine.toString())
				.onChange(debounce(async (value) => {
					const intValue = parseInt(value);
					if (!isNaN(intValue) && intValue >= -1) {
						this.plugin.settings.nodeAutoResize.maxLine = intValue;
						await this.plugin.saveSettings();
					}
				}, 500))
			);

		new Setting(containerEl)
			.setName(t(this.plugin, 'maxWidth'))
			.addText(text => text
				.setPlaceholder(t(this.plugin, 'maxWidthPlaceholder'))
				.setValue(this.plugin.settings.nodeAutoResize.maxWidth.toString())
				.onChange(debounce(async (value) => {
					const intValue = parseInt(value);
					if (!isNaN(intValue) && intValue >= -1) {
						this.plugin.settings.nodeAutoResize.maxWidth = intValue;
						await this.plugin.saveSettings();
					}
				}, 500))
			);

		new Setting(containerEl)
			.setName(t(this.plugin, 'contentHorizontalPadding'))
			.addText(text => text
				.setPlaceholder(t(this.plugin, 'contentHorizontalPaddingPlaceholder'))
				.setValue(this.plugin.settings.nodeAutoResize.contentHorizontalPadding.toString())
				.onChange(debounce(async (value) => {
					const intValue = parseInt(value);
					if (!isNaN(intValue) && intValue > 0) {
						this.plugin.settings.nodeAutoResize.contentHorizontalPadding = intValue;
						await this.plugin.saveSettings();
					}
				}, 500))
			);
		containerEl.createEl('h2', { text: t(this.plugin, 'collapseSection') });
		new Setting(containerEl)
			.setName(t(this.plugin, 'enableCollapse'))
			.setDesc(t(this.plugin, 'enableCollapseDesc'))
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.collapseEnabled)
				.onChange(async (value) => {
					this.plugin.settings.collapseEnabled = value;
					await this.plugin.saveSettings();
					const leaves = this.plugin.app.workspace.getLeavesOfType("canvas");
					leaves.forEach((leaf) => {
						const cv = leaf.view;
						if (cv && cv.canvas) {
							this.plugin.injectCollapseButtons(cv.canvas);
							this.plugin.applyCollapseVisibility(cv.canvas);
						}
					});
				}));
		new Setting(containerEl)
			.setName(t(this.plugin, 'relayoutScope'))
			.setDesc(t(this.plugin, 'relayoutScopeDesc'))
			.addDropdown(dropdown => {
				dropdown.addOption("tree", t(this.plugin, "scopeTree"));
				dropdown.addOption("canvas", t(this.plugin, "scopeCanvas"));
				dropdown
					.setValue(this.plugin.settings.collapseRelayoutScope || "tree")
					.onChange(async (value) => {
						this.plugin.settings.collapseRelayoutScope = value;
						await this.plugin.saveSettings();
					});
			});
		new Setting(containerEl)
			.setName(t(this.plugin, 'dragReparent'))
			.setDesc(t(this.plugin, 'dragReparentDesc'))
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.dragReattachEnabled)
				.onChange(async (value) => {
					this.plugin.settings.dragReattachEnabled = value;
					await this.plugin.saveSettings();
				}));
		new Setting(containerEl)
			.setName(t(this.plugin, 'expandedButtonColor'))
			.setDesc(t(this.plugin, 'expandedButtonColorDesc'))
			.addColorPicker(picker => picker
				.setValue(this.plugin.settings.collapseColorExpanded)
				.onChange(async (value) => {
					this.plugin.settings.collapseColorExpanded = value;
					await this.plugin.saveSettings();
					this.plugin.refreshCollapseButtonStyles();
				}));
		new Setting(containerEl)
			.setName(t(this.plugin, 'collapsedButtonColor'))
			.setDesc(t(this.plugin, 'collapsedButtonColorDesc'))
			.addColorPicker(picker => picker
				.setValue(this.plugin.settings.collapseColorCollapsed)
				.onChange(async (value) => {
					this.plugin.settings.collapseColorCollapsed = value;
				await this.plugin.saveSettings();
				this.plugin.refreshCollapseButtonStyles();
			}));

		containerEl.createEl('h2', { text: t(this.plugin, 'checklistProgress') });
		containerEl.createEl('p', { text: t(this.plugin, 'checklistProgressDesc') });
		new Setting(containerEl)
			.setName(t(this.plugin, 'enableChecklistProgress'))
			.setDesc(t(this.plugin, 'enableChecklistProgressDesc'))
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.checklistProgress.enabled)
				.onChange(async (value) => {
					this.plugin.settings.checklistProgress.enabled = value;
					await this.plugin.saveSettings();
					this.plugin.refreshChecklistProgress();
				}));
		new Setting(containerEl)
			.setName(t(this.plugin, 'progressStyle'))
			.setDesc(t(this.plugin, 'progressStyleDesc'))
			.addDropdown(dropdown => {
				dropdown.addOption("bar", t(this.plugin, "styleBar"));
				dropdown.addOption("pie", t(this.plugin, "stylePie"));
				dropdown
					.setValue(this.plugin.settings.checklistProgress.style)
					.onChange(async (value) => {
						const v = value === "pie" ? "pie" : "bar";
						this.plugin.settings.checklistProgress.style = v;
						await this.plugin.saveSettings();
						this.plugin.refreshChecklistProgress();
					});
			});
		new Setting(containerEl)
			.setName(t(this.plugin, 'showCount'))
			.setDesc(t(this.plugin, 'showCountDesc'))
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.checklistProgress.showCount)
				.onChange(async (value) => {
					this.plugin.settings.checklistProgress.showCount = value;
					await this.plugin.saveSettings();
					this.plugin.refreshChecklistProgress();
				}));
		new Setting(containerEl)
			.setName(t(this.plugin, 'showPercentAtJunction'))
			.setDesc(t(this.plugin, 'showPercentAtJunctionDesc'))
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.checklistProgress.showPercentAtJunction)
				.onChange(async (value) => {
					this.plugin.settings.checklistProgress.showPercentAtJunction = value;
					await this.plugin.saveSettings();
					this.plugin.refreshChecklistProgress();
				}));
		new Setting(containerEl)
			.setName(t(this.plugin, 'barHeight'))
			.addText(text => text
				.setPlaceholder(t(this.plugin, 'barHeightPlaceholder'))
				.setValue(this.plugin.settings.checklistProgress.barHeight.toString())
				.onChange(debounce(async (value) => {
					const intValue = parseInt(value);
					if (!isNaN(intValue) && intValue > 0) {
						this.plugin.settings.checklistProgress.barHeight = intValue;
						await this.plugin.saveSettings();
						this.plugin.refreshChecklistProgress();
					}
				}, 500))
			);
		new Setting(containerEl)
			.setName(t(this.plugin, 'barLength'))
			.setDesc(t(this.plugin, 'barLengthDesc'))
			.addText(text => text
				.setPlaceholder(t(this.plugin, 'barLengthPlaceholder'))
				.setValue(String(this.plugin.settings.checklistProgress.barLength ?? 95))
				.onChange(debounce(async (value) => {
					const intValue = parseInt(value);
					if (!isNaN(intValue) && intValue >= 10 && intValue <= 100) {
						this.plugin.settings.checklistProgress.barLength = intValue;
						await this.plugin.saveSettings();
						this.plugin.refreshChecklistProgress();
					}
				}, 500))
			);
		new Setting(containerEl)
			.setName(t(this.plugin, 'barDoneColor'))
			.addColorPicker(picker => picker
				.setValue(this.plugin.settings.checklistProgress.barColorDone)
				.onChange(async (value) => {
					this.plugin.settings.checklistProgress.barColorDone = value;
					await this.plugin.saveSettings();
					this.plugin.refreshChecklistProgress();
				}));
		new Setting(containerEl)
			.setName(t(this.plugin, 'barTodoColor'))
			.addColorPicker(picker => picker
				.setValue(this.plugin.settings.checklistProgress.barColorTodo)
				.onChange(async (value) => {
					this.plugin.settings.checklistProgress.barColorTodo = value;
					await this.plugin.saveSettings();
					this.plugin.refreshChecklistProgress();
				}));
		new Setting(containerEl)
			.setName(t(this.plugin, 'pieSize'))
			.addText(text => text
				.setPlaceholder(t(this.plugin, 'pieSizePlaceholder'))
				.setValue(this.plugin.settings.checklistProgress.pieSize.toString())
				.onChange(debounce(async (value) => {
					const intValue = parseInt(value);
					if (!isNaN(intValue) && intValue > 0) {
						this.plugin.settings.checklistProgress.pieSize = intValue;
						await this.plugin.saveSettings();
						this.plugin.refreshChecklistProgress();
					}
				}, 500))
			);
		new Setting(containerEl)
			.setName(t(this.plugin, 'pieDoneColor'))
			.addColorPicker(picker => picker
				.setValue(this.plugin.settings.checklistProgress.pieColorDone)
				.onChange(async (value) => {
					this.plugin.settings.checklistProgress.pieColorDone = value;
					await this.plugin.saveSettings();
					this.plugin.refreshChecklistProgress();
				}));
		new Setting(containerEl)
			.setName(t(this.plugin, 'pieTodoColor'))
			.addColorPicker(picker => picker
				.setValue(this.plugin.settings.checklistProgress.pieColorTodo)
				.onChange(async (value) => {
					this.plugin.settings.checklistProgress.pieColorTodo = value;
					await this.plugin.saveSettings();
					this.plugin.refreshChecklistProgress();
				}));

		containerEl.createEl('h2', { text: t(this.plugin, 'hotkey') });
		containerEl.createEl('p', { text: t(this.plugin, 'hotkeyDesc') });
		const hotkeySettings = [
			{ name: 'createChildNode', key: 'createChildNode' },
			{ name: 'createSiblingNodeOrRootNode', key: 'createSiblingNodeOrRootNode' },
			{ name: 'deleteNode', key: 'deleteNode' },
			{ name: 'editNodeOrSelectionNode', key: 'editNodeOrSelectionNode' },
			{ name: 'navigateUp', key: 'navigateUp' },
			{ name: 'navigateDown', key: 'navigateDown' },
			{ name: 'navigateLeft', key: 'navigateLeft' },
			{ name: 'navigateRight', key: 'navigateRight' },
			{ name: 'freeNavigateUp', key: 'freeNavigateUp' },
			{ name: 'freeNavigateDown', key: 'freeNavigateDown' },
			{ name: 'freeNavigateLeft', key: 'freeNavigateLeft' },
			{ name: 'freeNavigateRight', key: 'freeNavigateRight' },
			{ name: 'navigateUpUntilEnd', key: 'navigateUpUntilEnd' },
			{ name: 'navigateDownUntilEnd', key: 'navigateDownUntilEnd' },
			{ name: 'navigateLeftUntilEnd', key: 'navigateLeftUntilEnd' },
			{ name: 'navigateRightUntilEnd', key: 'navigateRightUntilEnd' },
			{ name: 'freeNavigateUpUntilEnd', key: 'freeNavigateUpUntilEnd' },
			{ name: 'freeNavigateDownUntilEnd', key: 'freeNavigateDownUntilEnd' },
			{ name: 'freeNavigateLeftUntilEnd', key: 'freeNavigateLeftUntilEnd' },
			{ name: 'freeNavigateRightUntilEnd', key: 'freeNavigateRightUntilEnd' },
		];

		hotkeySettings.forEach(hotkey => {
			new Setting(containerEl)
				.setName(t(this.plugin, hotkey.name as LangKey))
				.addText(text => text
					.setPlaceholder(t(this.plugin, 'modifiersPlaceholder'))
					.setValue(this.plugin.settings.hotkey[hotkey.key as keyof MindMapSettings['hotkey']].modifiers)
					.onChange(debounce(async (value) => {
						this.plugin.settings.hotkey[hotkey.key as keyof MindMapSettings['hotkey']].modifiers = value;
						await this.plugin.saveSettings();
					}, 500))
				)
				.addText(text => text
					.setPlaceholder(t(this.plugin, 'keyPlaceholder'))
					.setValue(this.plugin.settings.hotkey[hotkey.key as keyof MindMapSettings['hotkey']].key)
					.onChange(debounce(async (value) => {
						this.plugin.settings.hotkey[hotkey.key as keyof MindMapSettings['hotkey']].key = value;
						await this.plugin.saveSettings();
					}, 500))
				)
				.addToggle(toggle => toggle
					.setValue(this.plugin.settings.hotkey[hotkey.key as keyof MindMapSettings['hotkey']].enabled)
					.onChange(async (value) => {
						this.plugin.settings.hotkey[hotkey.key as keyof MindMapSettings['hotkey']].enabled = value;
						await this.plugin.saveSettings();
					})
				);
		});
	}
}
