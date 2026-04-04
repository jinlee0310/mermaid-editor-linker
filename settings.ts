import { App, PluginSettingTab, Setting } from "obsidian";
import type MermaidVSCodeLinkerPlugin from "./main";

export interface MermaidLinkerSettings {
  basePath: string;
  editor: string;
  customEditorPath: string;
  clickModifier: "none" | "ctrl" | "cmd";
  directoryPrefixes: string;
}

export const DEFAULT_SETTINGS: MermaidLinkerSettings = {
  basePath: "",
  editor: "code",
  customEditorPath: "",
  clickModifier: "none",
  directoryPrefixes: "app,features,components,hooks,store,lib,utils,constants",
};

export class MermaidLinkerSettingTab extends PluginSettingTab {
  plugin: MermaidVSCodeLinkerPlugin;

  constructor(app: App, plugin: MermaidVSCodeLinkerPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl)
      .setName("Base Path")
      .setDesc("Absolute path to source code root directory")
      .addText((text) =>
        text
          .setPlaceholder("/path/to/project")
          .setValue(this.plugin.settings.basePath)
          .onChange(async (value) => {
            this.plugin.settings.basePath = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Editor")
      .setDesc("Select which editor to use")
      .addDropdown((dropdown) =>
        dropdown
          .addOption("code", "VS Code")
          .addOption("cursor", "Cursor")
          .addOption("webstorm", "WebStorm")
          .setValue(this.plugin.settings.editor)
          .onChange(async (value) => {
            this.plugin.settings.editor = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Custom Editor Path")
      .setDesc("Override editor path (leave empty to use default)")
      .addText((text) =>
        text
          .setPlaceholder("/usr/local/bin/code")
          .setValue(this.plugin.settings.customEditorPath)
          .onChange(async (value) => {
            this.plugin.settings.customEditorPath = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Directory Prefixes")
      .setDesc("Comma-separated directory names to match in Mermaid nodes")
      .addText((text) =>
        text
          .setPlaceholder("app,features,components,hooks,store")
          .setValue(this.plugin.settings.directoryPrefixes)
          .onChange(async (value) => {
            this.plugin.settings.directoryPrefixes = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Click Modifier")
      .setDesc("Modifier key required for click (none = direct click)")
      .addDropdown((dropdown) =>
        dropdown
          .addOption("none", "None (direct click)")
          .addOption("ctrl", "Ctrl + Click")
          .addOption("cmd", "Cmd + Click")
          .setValue(this.plugin.settings.clickModifier)
          .onChange(async (value) => {
            this.plugin.settings.clickModifier = value as MermaidLinkerSettings["clickModifier"];
            await this.plugin.saveSettings();
          })
      );
  }
}
