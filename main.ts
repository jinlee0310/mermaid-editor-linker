import { Notice, Plugin } from "obsidian";
import {
  MermaidLinkerSettings,
  DEFAULT_SETTINGS,
  MermaidLinkerSettingTab,
} from "./settings";

export default class MermaidVSCodeLinkerPlugin extends Plugin {
  settings: MermaidLinkerSettings = DEFAULT_SETTINGS;
  private observer: MutationObserver | null = null;
  private processed = new WeakSet<Element>();
  private filePathRegex: RegExp | null = null;

  async onload() {
    await this.loadSettings();
    this.addSettingTab(new MermaidLinkerSettingTab(this.app, this));

    // Scan existing nodes on layout ready
    this.app.workspace.onLayoutReady(() => {
      this.scanAll();
    });

    // Watch for new Mermaid SVGs via MutationObserver on document body
    this.observer = new MutationObserver(() => {
      this.scanAll();
    });
    this.observer.observe(document.body, { childList: true, subtree: true });

    // Also scan on layout change (tab switch, file open)
    this.registerEvent(
      this.app.workspace.on("layout-change", () => {
        setTimeout(() => this.scanAll(), 500);
      })
    );
    this.registerEvent(
      this.app.workspace.on("active-leaf-change", () => {
        setTimeout(() => this.scanAll(), 1000);
      })
    );
  }

  onunload() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
  }

  private buildFilePathRegex(): RegExp | null {
    const prefixes = this.settings.directoryPrefixes
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
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
      const match = text?.match(this.filePathRegex!);
      if (!match) return;

      const relativePath = match[1];
      const nodeEl = node as SVGElement;
      nodeEl.style.cursor = "pointer";
      nodeEl.classList.add("mermaid-clickable");

      nodeEl.addEventListener("click", (e) => {
        if (!this.isModifierSatisfied(e as MouseEvent)) return;
        e.stopPropagation();
        e.preventDefault();
        const fullPath = `${this.settings.basePath}/${relativePath}`;
        this.openInEditor(fullPath);
      });

      this.processed.add(node);
    });
  }

  isModifierSatisfied(e: MouseEvent): boolean {
    switch (this.settings.clickModifier) {
      case "ctrl":
        return e.ctrlKey;
      case "cmd":
        return e.metaKey;
      default:
        return true;
    }
  }

  openInEditor(filePath: string) {
    const { exec } = require("child_process");
    const { existsSync } = require("fs");

    if (!existsSync(filePath)) {
      new Notice(`File not found: ${filePath}`);
      return;
    }

    const editorPath = this.settings.customEditorPath
      ? this.settings.customEditorPath
      : this.resolveEditorPath(this.settings.editor);
    const command = `"${editorPath}" "${filePath}"`;

    exec(command, (err: Error | null) => {
      if (err) {
        new Notice(`Failed to open editor: ${err.message}`);
      }
    });
  }

  private resolveEditorPath(editor: string): string {
    const { existsSync } = require("fs");

    // If already an absolute path, use as-is
    if (editor.startsWith("/")) return editor;

    // Known editor CLI paths for macOS (GUI apps don't inherit shell PATH)
    const knownPaths: Record<string, string[]> = {
      code: ["/usr/local/bin/code", "/opt/homebrew/bin/code"],
      cursor: ["/usr/local/bin/cursor", "/opt/homebrew/bin/cursor"],
      webstorm: ["/usr/local/bin/webstorm"],
    };

    const candidates = knownPaths[editor];
    if (candidates) {
      for (const p of candidates) {
        if (existsSync(p)) return p;
      }
    }

    // Fallback: try the command as-is (works if PATH is available)
    return editor;
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());

    // Migrate old "vscode" enum value to CLI command
    if (this.settings.editor === "vscode") {
      this.settings.editor = "code";
    }

    // Migrate old comma-separated string to array
    if (typeof (this.settings.directoryPrefixes as unknown) === "string") {
      this.settings.directoryPrefixes = (
        this.settings.directoryPrefixes as unknown as string
      )
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }

    this.refreshRegex();
  }

  async saveSettings() {
    await this.saveData(this.settings);
    this.refreshRegex();
  }
}
