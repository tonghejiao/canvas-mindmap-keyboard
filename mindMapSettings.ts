import { App, debounce, Platform, PluginSettingTab, Setting } from "obsidian";
import CanvasMindMap from "main";

interface Hotkey {
	modifiers: string;
	key: string;
	enabled: boolean;
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
		horizontalGap: number; // 水平间距
		verticalGap: number; // 垂直间距
	},
	nodeAutoResize: {
		maxLine: number; // 节点自动增高的最大行数，超过后不再自动增高
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
	condition: {
		fileNameInclude: 'mindmap', // 文件名包含
	},
	creatNode: {
		width: 300,
		height: 100,
	},
	layout: {
		automaticGlobalLayout: true, // 自动全局布局开关
		horizontalGap: 200, // 水平间距
		verticalGap: 80,// 垂直间距
	},
	nodeAutoResize: {
		maxLine: -1, // 节点自动增高的最大行数，超过后不再自动增高
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

export class MindMapSettingTab extends PluginSettingTab {
	plugin: CanvasMindMap;

	constructor(app: App, plugin: CanvasMindMap) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		containerEl.createEl('h1', {text: 'Canvas MindMap keyboard Settings'});

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
			.setName('automatic global layout')
			.setDesc('When enabled, the entire mind map will automatically arrange itself into a tree structure whenever a node is created or deleted.')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.layout.automaticGlobalLayout)
				.onChange(async (value) => {
					this.plugin.settings.layout.automaticGlobalLayout = value;
					await this.plugin.saveSettings();
				})
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
