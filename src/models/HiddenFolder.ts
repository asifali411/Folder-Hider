import * as vscode from "vscode";
import * as path from "path";

/**
 * Represents a single hidden folder in the "Hidden Folders" tree view.
 *
 * Extends `vscode.TreeItem` so it can be returned directly from
 * `HiddenFoldersProvider.getChildren()` without any mapping step.
 */
export class HiddenFolder extends vscode.TreeItem {
  /** Absolute path to the folder on disk. */
  readonly absolutePath: string;

  /** Path relative to the workspace root (used as the `files.exclude` key). */
  readonly relativePath: string;

  /**
   * @param absolutePath  Absolute path to the hidden folder.
   * @param workspaceRoot Absolute path to the workspace root folder.
   */
  constructor(absolutePath: string, workspaceRoot: string) {
    // Label shown in the tree — just the folder's own name, not the full path.
    const label = path.basename(absolutePath);

    // Tree items that represent files/folders are always leaves — no children.
    super(label, vscode.TreeItemCollapsibleState.None);

    this.absolutePath = absolutePath;
    this.relativePath = path.relative(workspaceRoot, absolutePath);

    // ----------------------------------------------------------------
    // Tooltip — shown on hover; includes the full relative path so the
    // user can distinguish same-named folders in different sub-directories.
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
    // Icon — use VS Code's built-in folder icon.
    // ----------------------------------------------------------------
    this.iconPath = new vscode.ThemeIcon(
      "folder",
      new vscode.ThemeColor("folderHider.hiddenFolderForeground"),
    );

    // ----------------------------------------------------------------
    // Context value — matched in package.json `when` clauses to show
    // the inline "Unhide" button only on HiddenFolder items.
    // Must equal the string used in package.json:
    //   "when": "viewItem == hiddenFolder"
    // ----------------------------------------------------------------
    this.contextValue = "hiddenFolder";

    // ----------------------------------------------------------------
    // resourceUri — lets VS Code apply file-decoration providers and
    // keeps the item linked to the real path on disk.
    // ----------------------------------------------------------------
    this.resourceUri = vscode.Uri.file(absolutePath);
  }
}

/**
 * Plain-object shape used to persist hidden folders in workspace storage.
 * Keeping it separate from the TreeItem means storage stays serialisable
 * and decoupled from the VS Code API.
 */
export interface HiddenFolderRecord {
  /** Absolute path to the folder. */
  absolutePath: string;
  /** ISO-8601 timestamp of when the folder was hidden. */
  hiddenAt: string;
}
