var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// main.ts
var main_exports = {};
__export(main_exports, {
  default: () => MermaidVSCodeLinkerPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian2 = require("obsidian");

// settings.ts
var import_obsidian = require("obsidian");
var DEFAULT_SETTINGS = {
  basePath: "",
  editor: "code",
  customEditorPath: "",
  clickModifier: "none",
  directoryPrefixes: [
    "app",
    "features",
    "components",
    "hooks",
    "store",
    "lib",
    "utils",
    "constants"
  ]
};
var MermaidLinkerSettingTab = class extends import_obsidian.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    new import_obsidian.Setting(containerEl).setName("Base Path").setDesc("Absolute path to source code root directory").addText(
      (text) => text.setPlaceholder("/path/to/project").setValue(this.plugin.settings.basePath).onChange(async (value) => {
        this.plugin.settings.basePath = value;
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian.Setting(containerEl).setName("Editor").setDesc("Select which editor to use").addDropdown(
      (dropdown) => dropdown.addOption("code", "VS Code").addOption("cursor", "Cursor").addOption("webstorm", "WebStorm").setValue(this.plugin.settings.editor).onChange(async (value) => {
        this.plugin.settings.editor = value;
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian.Setting(containerEl).setName("Custom Editor Path").setDesc("Override editor path (leave empty to use default)").addText(
      (text) => text.setPlaceholder("/usr/local/bin/code").setValue(this.plugin.settings.customEditorPath).onChange(async (value) => {
        this.plugin.settings.customEditorPath = value;
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian.Setting(containerEl).setName("Directory Prefixes").setDesc("Directory names to match in Mermaid nodes").addButton(
      (button) => button.setButtonText("+ Add").setCta().onClick(async () => {
        this.plugin.settings.directoryPrefixes.push("");
        await this.plugin.saveSettings();
        this.display();
      })
    );
    this.plugin.settings.directoryPrefixes.forEach((prefix, index) => {
      new import_obsidian.Setting(containerEl).addText(
        (text) => text.setPlaceholder("e.g. components").setValue(prefix).onChange(async (value) => {
          this.plugin.settings.directoryPrefixes[index] = value;
          await this.plugin.saveSettings();
        })
      ).addExtraButton(
        (button) => button.setIcon("trash").setTooltip("Remove").onClick(async () => {
          this.plugin.settings.directoryPrefixes.splice(index, 1);
          await this.plugin.saveSettings();
          this.display();
        })
      );
    });
    new import_obsidian.Setting(containerEl).setName("Click Modifier").setDesc("Modifier key required for click (none = direct click)").addDropdown(
      (dropdown) => dropdown.addOption("none", "None (direct click)").addOption("ctrl", "Ctrl + Click").addOption("cmd", "Cmd + Click").setValue(this.plugin.settings.clickModifier).onChange(async (value) => {
        this.plugin.settings.clickModifier = value;
        await this.plugin.saveSettings();
      })
    );
  }
};

// main.ts
var MermaidVSCodeLinkerPlugin = class extends import_obsidian2.Plugin {
  constructor() {
    super(...arguments);
    this.settings = DEFAULT_SETTINGS;
    this.observer = null;
    this.processed = /* @__PURE__ */ new WeakSet();
    this.filePathRegex = null;
  }
  async onload() {
    await this.loadSettings();
    this.addSettingTab(new MermaidLinkerSettingTab(this.app, this));
    this.app.workspace.onLayoutReady(() => {
      this.scanAll();
    });
    this.observer = new MutationObserver(() => {
      this.scanAll();
    });
    this.observer.observe(document.body, { childList: true, subtree: true });
    this.registerEvent(
      this.app.workspace.on("layout-change", () => {
        setTimeout(() => this.scanAll(), 500);
      })
    );
    this.registerEvent(
      this.app.workspace.on("active-leaf-change", () => {
        setTimeout(() => this.scanAll(), 1e3);
      })
    );
  }
  onunload() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
  }
  buildFilePathRegex() {
    const prefixes = this.settings.directoryPrefixes.map((s) => s.trim()).filter(Boolean).map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    if (prefixes.length === 0) return null;
    return new RegExp(`((?:${prefixes.join("|")})\\/[\\w\\-\\/\\.]+\\.\\w+)`);
  }
  refreshRegex() {
    this.filePathRegex = this.buildFilePathRegex();
  }
  scanAll() {
    if (!this.filePathRegex) return;
    const nodes = document.querySelectorAll(".mermaid svg .node");
    nodes.forEach((node) => {
      if (this.processed.has(node)) return;
      const text = node.textContent;
      const match = text == null ? void 0 : text.match(this.filePathRegex);
      if (!match) return;
      const relativePath = match[1];
      const nodeEl = node;
      nodeEl.style.cursor = "pointer";
      nodeEl.classList.add("mermaid-clickable");
      nodeEl.addEventListener("click", (e) => {
        if (!this.isModifierSatisfied(e)) return;
        e.stopPropagation();
        e.preventDefault();
        const fullPath = `${this.settings.basePath}/${relativePath}`;
        this.openInEditor(fullPath);
      });
      this.processed.add(node);
    });
  }
  isModifierSatisfied(e) {
    switch (this.settings.clickModifier) {
      case "ctrl":
        return e.ctrlKey;
      case "cmd":
        return e.metaKey;
      default:
        return true;
    }
  }
  openInEditor(filePath) {
    const { exec } = require("child_process");
    const { existsSync } = require("fs");
    if (!existsSync(filePath)) {
      new import_obsidian2.Notice(`File not found: ${filePath}`);
      return;
    }
    const editorPath = this.settings.customEditorPath ? this.settings.customEditorPath : this.resolveEditorPath(this.settings.editor);
    const command = `${editorPath} "${filePath}"`;
    exec(command, (err) => {
      if (err) {
        new import_obsidian2.Notice(`Failed to open editor: ${err.message}`);
      }
    });
  }
  resolveEditorPath(editor) {
    const { existsSync } = require("fs");
    if (editor.startsWith("/")) return editor;
    const knownPaths = {
      code: ["/usr/local/bin/code", "/opt/homebrew/bin/code"],
      cursor: ["/usr/local/bin/cursor", "/opt/homebrew/bin/cursor"],
      webstorm: ["/usr/local/bin/webstorm"]
    };
    const candidates = knownPaths[editor];
    if (candidates) {
      for (const p of candidates) {
        if (existsSync(p)) return p;
      }
    }
    return editor;
  }
  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    if (this.settings.editor === "vscode") {
      this.settings.editor = "code";
    }
    if (typeof this.settings.directoryPrefixes === "string") {
      this.settings.directoryPrefixes = this.settings.directoryPrefixes.split(",").map((s) => s.trim()).filter(Boolean);
    }
    this.refreshRegex();
  }
  async saveSettings() {
    await this.saveData(this.settings);
    this.refreshRegex();
  }
};
