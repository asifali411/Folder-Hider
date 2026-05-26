import * as vscode from "vscode";
import * as path from "path";

/**
 * Represents a single hidden file in the "Hidden Files" tree view.
 *
 * Extends `vscode.TreeItem` so it can be returned directly from
 * `HiddenFileProvider.getChildren()` without any mapping step.
 */
export class HiddenFile extends vscode.TreeItem {
  /** Absolute path to the folder on disk. */
  readonly absolutePath: string;

  /** Path relative to the workspace root (used as the `files.exclude` key). */
  readonly relativePath: string;

  /**
   * @param absolutePath  Absolute path to the hidden file.
   * @param workspaceRoot Absolute path to the workspace root folder.
   */
  constructor(absolutePath: string, workspaceRoot: string) {
    // Label shown in the tree — just the files's own name, not the full path.
    const label = path.basename(absolutePath);

    // Tree items that represent files/folders are always leaves — no children.
    super(label, vscode.TreeItemCollapsibleState.None);

    this.absolutePath = absolutePath;
    this.relativePath = path.relative(workspaceRoot, absolutePath);

    // ----------------------------------------------------------------
    // Tooltip — shown on hover; includes the full relative path so the
    // user can distinguish same-named files in different sub-directories.
    // ----------------------------------------------------------------
    this.tooltip = new vscode.MarkdownString(
      `**${label}**\n\n\`${this.relativePath}\``,
    );

    // ----------------------------------------------------------------
    // Description — the relative path rendered in muted text to the
    // right of the label inside the tree row.
    // Only show it when the folder is nested (not at the workspace root).
    // ----------------------------------------------------------------
    const parentDir = path.dirname(this.relativePath);
    if (parentDir !== ".") {
      this.description = parentDir;
    }

    // ----------------------------------------------------------------
    // Icon — use VS Code's built-in file icon.
    // ----------------------------------------------------------------
    this.iconPath = new vscode.ThemeIcon(
      "file",
      new vscode.ThemeColor("folderHider.hiddenFileForeground"),
    );

    // ----------------------------------------------------------------
    // Context value — matched in package.json `when` clauses to show
    // the inline "Unhide" button only on HiddenFile items.
    // Must equal the string used in package.json:
    //   "when": "viewItem == hiddenFile"
    // ----------------------------------------------------------------
    this.contextValue = "hiddenFile";

    // ----------------------------------------------------------------
    // resourceUri — lets VS Code apply file-decoration providers and
    // keeps the item linked to the real path on disk.
    // ----------------------------------------------------------------
    this.resourceUri = vscode.Uri.file(absolutePath);
  }
}

/**
 * Plain-object shape used to persist hidden files in workspace storage.
 * Keeping it separate from the TreeItem means storage stays serialisable
 * and decoupled from the VS Code API.
 */
export interface HiddenFileRecord {
  /** Absolute path to the file. */
  absolutePath: string;
  /** ISO-8601 timestamp of when the file was hidden. */
  hiddenAt: string;
}
