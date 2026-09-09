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

export interface MindMapSettings {
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
			.setName('Donate')
			.setDesc('If you like this plugin, consider donating to support continued development:')
			.addButton((bt) => {
				bt.buttonEl.outerHTML = `<a href="https://ko-fi.com/conantong02"><img src="https://storage.ko-fi.com/cdn/logomarkLogo.png" width=60></a>`;
			});

		containerEl.createEl('h2', { text: 'condition' });
		new Setting(containerEl)
			.setName('filename include')
			.setDesc('Only files with names containing this string will have the mind map feature enabled.')
			.addText(text => text
				.setPlaceholder('filename include')
				.setValue(this.plugin.settings.condition.fileNameInclude)
				.onChange(debounce(async (value) => {
					this.plugin.settings.condition.fileNameInclude = value;
					await this.plugin.saveSettings();
				}, 500))
			);

		containerEl.createEl('h2', { text: 'create node' });
		new Setting(containerEl)
			.setName('width')
			.addText(text => text
				.setPlaceholder('width')
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
			.setName('height')
			.addText(text => text
				.setPlaceholder('height')
				.setValue(this.plugin.settings.creatNode.height.toString())
				.onChange(debounce(async (value) => {
					const intValue = parseInt(value);
					if (!isNaN(intValue) && intValue > 0) {
						this.plugin.settings.creatNode.height = intValue;
						await this.plugin.saveSettings();
					}
				}, 500))
			);

		containerEl.createEl('h2', { text: 'layout' });
		new Setting(containerEl)
			.setName('default automatic layout level')
			.addDropdown(dropdown => {
				dropdown.addOption(AutomaticLayoutLevel.Canvas.toString(), "automatic layout in the canvas");
				dropdown.addOption(AutomaticLayoutLevel.Tree.toString(), "automatic layout in the tree");
				dropdown.addOption(AutomaticLayoutLevel.None.toString(), "not automatic layout");

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
			.setName('Which type of file uses canvas-level automatic layout?')
			.addText(text => text
				.setPlaceholder('The file name contains')
				.setValue(this.plugin.settings.layout.whichFileUseCanvasLevelAutomaticLayout)
				.onChange(debounce(async (value) => {
					this.plugin.settings.layout.whichFileUseCanvasLevelAutomaticLayout = value;
				}, 500))
			);

		new Setting(containerEl)
			.setName('Which type of file uses tree-level automatic layout?')
			.addText(text => text
				.setPlaceholder('The file name contains')
				.setValue(this.plugin.settings.layout.whichFileUseTreeLevelAutomaticLayout)
				.onChange(debounce(async (value) => {
					this.plugin.settings.layout.whichFileUseTreeLevelAutomaticLayout = value;
				}, 500))
			);

		new Setting(containerEl)
			.setName('Which type of file are not automatic layout?')
			.addText(text => text
				.setPlaceholder('The file name contains')
				.setValue(this.plugin.settings.layout.whichFileNotAutomaticLayout)
				.onChange(debounce(async (value) => {
					this.plugin.settings.layout.whichFileNotAutomaticLayout = value;
				}, 500))
			);

		new Setting(containerEl)
			.setName('horizontal gap')
			.addText(text => text
				.setPlaceholder('horizontal gap')
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
			.setName('vertical gap')
			.addText(text => text
				.setPlaceholder('vertical gap')
				.setValue(this.plugin.settings.layout.verticalGap.toString())
				.onChange(debounce(async (value) => {
					const intValue = parseInt(value);
					if (!isNaN(intValue) && intValue > 0) {
						this.plugin.settings.layout.verticalGap = intValue;
						await this.plugin.saveSettings();
					}
				}, 500))
			);

		containerEl.createEl('h2', { text: 'node auto resize' });
		new Setting(containerEl)
			.setName('auto resize width switch')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.nodeAutoResize.autoResizeWidthSwitch)
				.onChange(async (value) => {
					this.plugin.settings.nodeAutoResize.autoResizeWidthSwitch = value;
					await this.plugin.saveSettings();
				})
			);

		new Setting(containerEl)
			.setName('auto resize height switch')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.nodeAutoResize.autoResizeHeightSwitch)
				.onChange(async (value) => {
					this.plugin.settings.nodeAutoResize.autoResizeHeightSwitch = value;
					await this.plugin.saveSettings();
				})
			);
		
		new Setting(containerEl)
			.setName('max line')
			.setDesc('The maximum number of lines for automatic height increase of nodes. If exceeded, the height will no longer increase automatically. Set to -1 for unlimited lines.')
			.addText(text => text
				.setPlaceholder('max line')
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
			.setName('max Width')
			.addText(text => text
				.setPlaceholder('max Width')
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
			.setName('Content Horizontal Padding')
			.addText(text => text
				.setPlaceholder('Content Horizontal Padding')
				.setValue(this.plugin.settings.nodeAutoResize.contentHorizontalPadding.toString())
				.onChange(debounce(async (value) => {
					const intValue = parseInt(value);
					if (!isNaN(intValue) && intValue > 0) {
						this.plugin.settings.nodeAutoResize.contentHorizontalPadding = intValue;
						await this.plugin.saveSettings();
					}
				}, 500))
			);
		containerEl.createEl('h2', { text: 'collapse / expand (fold & drag re-parent)' });
		new Setting(containerEl)
			.setName('Enable collapse / expand')
			.setDesc('Show a +/− button on any node that has children. − collapses the whole subtree; + expands only the next level. Right-click a node for 折叠 / 展开 / 展开下级. The collapsed state is saved per canvas file.')
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
			.setName('Relayout scope after collapse / expand')
			.setDesc('Which nodes get re-arranged after a collapse/expand action. "Only the affected tree" (default) keeps every other node — including loose nodes and other trees — exactly where it is; "Whole canvas" re-arranges all root nodes and trees.')
			.addDropdown(dropdown => {
				dropdown.addOption("tree", "Only the affected tree (recommended)");
				dropdown.addOption("canvas", "Whole canvas");
				dropdown
					.setValue(this.plugin.settings.collapseRelayoutScope || "tree")
					.onChange(async (value) => {
						this.plugin.settings.collapseRelayoutScope = value;
						await this.plugin.saveSettings();
					});
			});
		new Setting(containerEl)
			.setName('Drag a node onto another to re-parent it')
			.setDesc('Drag node A (with its whole subtree) over node B: A is detached from its old parent and appended as B\'s last child. Dragging onto A\'s own parent (or any ancestor) does nothing. Enable this on touch devices to re-arrange the tree without a keyboard.')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.dragReattachEnabled)
				.onChange(async (value) => {
					this.plugin.settings.dragReattachEnabled = value;
					await this.plugin.saveSettings();
				}));
		new Setting(containerEl)
			.setName('Expanded button color')
			.setDesc('Background color of the + (expand) button shown on a collapsed node.')
			.addColorPicker(picker => picker
				.setValue(this.plugin.settings.collapseColorExpanded)
				.onChange(async (value) => {
					this.plugin.settings.collapseColorExpanded = value;
					await this.plugin.saveSettings();
					this.plugin.refreshCollapseButtonStyles();
				}));
		new Setting(containerEl)
			.setName('Collapsed button color')
			.setDesc('Background color of the − (collapse) button shown on an expanded node.')
			.addColorPicker(picker => picker
				.setValue(this.plugin.settings.collapseColorCollapsed)
				.onChange(async (value) => {
					this.plugin.settings.collapseColorCollapsed = value;
					await this.plugin.saveSettings();
					this.plugin.refreshCollapseButtonStyles();
				}));



		containerEl.createEl('h2', { text: 'hotkey' });
		containerEl.createEl('p', { text: 'After modification, it needs to be restarted before it will take effect.' });
		const hotkeySettings = [
			{ name: 'create child node', key: 'createChildNode' },
			{ name: 'create sibling node or root node', key: 'createSiblingNodeOrRootNode' },
			{ name: 'delete node', key: 'deleteNode' },
			{ name: 'edit node or selection node', key: 'editNodeOrSelectionNode' },
			{ name: 'navigate up', key: 'navigateUp' },
			{ name: 'navigate down', key: 'navigateDown' },
			{ name: 'navigate left', key: 'navigateLeft' },
			{ name: 'navigate right', key: 'navigateRight' },
			{ name: 'free navigate up', key: 'freeNavigateUp' },
			{ name: 'free navigate down', key: 'freeNavigateDown' },
			{ name: 'free navigate left', key: 'freeNavigateLeft' },
			{ name: 'free navigate right', key: 'freeNavigateRight' },
			{ name: 'navigate up until end', key: 'navigateUpUntilEnd' },
			{ name: 'navigate down until end', key: 'navigateDownUntilEnd' },
			{ name: 'navigate left until end', key: 'navigateLeftUntilEnd' },
			{ name: 'navigate right until end', key: 'navigateRightUntilEnd' },
			{ name: 'free navigate up until end', key: 'freeNavigateUpUntilEnd' },
			{ name: 'free navigate down until end', key: 'freeNavigateDownUntilEnd' },
			{ name: 'free navigate left until end', key: 'freeNavigateLeftUntilEnd' },
			{ name: 'free navigate right until end', key: 'freeNavigateRightUntilEnd' },
		];

		hotkeySettings.forEach(hotkey => {
			new Setting(containerEl)
				.setName(hotkey.name)
				.addText(text => text
					.setPlaceholder('modifiers, use + to separate, e.g. Ctrl+Shift')
					.setValue(this.plugin.settings.hotkey[hotkey.key as keyof MindMapSettings['hotkey']].modifiers)
					.onChange(debounce(async (value) => {
						this.plugin.settings.hotkey[hotkey.key as keyof MindMapSettings['hotkey']].modifiers = value;
						await this.plugin.saveSettings();
					}, 500))
				)
				.addText(text => text
					.setPlaceholder('key')
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
