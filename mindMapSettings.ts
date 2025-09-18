import { App, debounce, Platform, PluginSettingTab, Setting } from "obsidian";
import CanvasMindMap from "main";

export interface MindMapSettings {
	condition: {
		fileNameInclude: string; // 文件名包含
	},
	creatNode: {
		width: number;
		height: number;		
	};
	layout: {
		horizontalGap: number; // 水平间距
		verticalGap: number; // 垂直间距
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
		horizontalGap: 200, // 水平间距
		verticalGap: 80,// 垂直间距
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

		containerEl.createEl('h2', { text: 'createNode' });
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
			.setName('horizontalGap')
			.addText(text => text
				.setPlaceholder('horizontalGap')
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
			.setName('verticalGap')
			.addText(text => text
				.setPlaceholder('verticalGap')
				.setValue(this.plugin.settings.layout.verticalGap.toString())
				.onChange(debounce(async (value) => {
					const intValue = parseInt(value);
					if (!isNaN(intValue) && intValue > 0) {
						this.plugin.settings.layout.verticalGap = intValue;
						await this.plugin.saveSettings();
					}
				}, 500))
			);
	}
}
