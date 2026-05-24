import * as vscode from "vscode";
import { HiddenFolder } from "../models/HiddenFolder";
import {
  loadHiddenPaths,
  saveHiddenPaths,
  getExcludedAbsolutePaths,
} from "../utils/settingsManager";
import { requireWorkspaceRoot, isDirectory } from "../utils/pathHelper";

/**
 * Provides the data for the "Hidden Folders" tree view in the Explorer sidebar.
 *
 * On construction it reconciles workspace storage with `files.exclude`:
 *   - Any path in storage that is no longer excluded (e.g. manually removed from
 *     settings.json) is silently dropped so the two sources stay in sync.
 *   - Any path present in `files.exclude` that was added outside the extension is
 *     NOT automatically imported; we only track what the extension manages.
 */
export class HiddenFoldersProvider implements vscode.TreeDataProvider<HiddenFolder> {
  private readonly _onDidChangeTreeData = new vscode.EventEmitter<
    HiddenFolder | undefined | null | void
  >();

  readonly onDidChangeTreeData: vscode.Event<
    HiddenFolder | undefined | null | void
  > = this._onDidChangeTreeData.event;

  /** Ordered list of absolute paths the extension is managing. */
  private hiddenPaths: string[] = [];

  constructor(private readonly context: vscode.ExtensionContext) {
    this.reconcile();
  }

  // ─── Public API ────────────────────────────────────────────────────────────

  /** Fire a full tree refresh (called by commands and the settings file watcher). */
  refresh(): void {
    this.reconcile();
    this._onDidChangeTreeData.fire();
  }

  /**
   * Add a path to the managed list and persist it.
   * Callers are responsible for writing to `files.exclude` first.
   */
  addPath(absolutePath: string): void {
    if (!this.hiddenPaths.includes(absolutePath)) {
      this.hiddenPaths.push(absolutePath);
      this.persist();
      this._onDidChangeTreeData.fire();
    }
  }

  /**
   * Remove a single path from the managed list and persist.
   * Callers are responsible for removing the entry from `files.exclude` first.
   */
  removePath(absolutePath: string): void {
    const before = this.hiddenPaths.length;
    this.hiddenPaths = this.hiddenPaths.filter((p) => p !== absolutePath);
    if (this.hiddenPaths.length !== before) {
      this.persist();
      this._onDidChangeTreeData.fire();
    }
  }

  /**
   * Remove ALL managed paths and persist.
   * Callers are responsible for cleaning `files.exclude` first.
   */
  clearAll(): void {
    if (this.hiddenPaths.length === 0) return;
    this.hiddenPaths = [];
    this.persist();
    this._onDidChangeTreeData.fire();
  }

  /** Snapshot of currently managed absolute paths (do not mutate). */
  getPaths(): readonly string[] {
    return this.hiddenPaths;
  }

  // ─── TreeDataProvider ──────────────────────────────────────────────────────

  getTreeItem(element: HiddenFolder): vscode.TreeItem {
    return element;
  }

  getChildren(element?: HiddenFolder): vscode.ProviderResult<HiddenFolder[]> {
    // The tree is flat — no nesting.
    if (element) return [];

    let root: string;
    try {
      root = requireWorkspaceRoot();
    } catch {
      return [];
    }

    return this.hiddenPaths
      .slice()
      .sort((a, b) => a.localeCompare(b))
      .map((absPath) => new HiddenFolder(absPath, root));
  }

  // ─── Private helpers ───────────────────────────────────────────────────────

  /**
   * Reconcile workspace storage against `files.exclude`.
   *
   * We keep only the paths that:
   *   1. Were previously saved by the extension (stored in workspaceState), AND
   *   2. Are still excluded in `files.exclude` (could have been manually re-added), AND
   *   3. Actually exist on disk as directories (handles deleted folders gracefully).
   */
  private reconcile(): void {
    const stored = loadHiddenPaths(this.context);
    const currentlyExcluded = new Set(getExcludedAbsolutePaths());

    const valid = stored.filter(
      (p) => currentlyExcluded.has(p) && isDirectory(p),
    );

    // Only persist if we actually dropped something, to avoid unnecessary writes.
    if (valid.length !== stored.length) {
      saveHiddenPaths(this.context, valid);
    }

    this.hiddenPaths = valid;
  }

  private persist(): void {
    saveHiddenPaths(this.context, this.hiddenPaths);
  }
}