import * as vscode from "vscode";
import { HiddenFoldersProvider } from "./providers/hiddenFolderProvider";
import { HiddenFileProvider } from "./providers/hiddenFileProvider";

import { hideFolder } from "./commands/hideFolder";
import { hideFile } from "./commands/hideFile";
import { unhideFolder } from "./commands/unhideFolder";
import { unhideFile } from "./commands/unhideFile";
import { unhideAll } from "./commands/unhideAll";
import { HiddenFolder } from "./models/HiddenFolder";
import { HiddenFile } from "./models/HiddenFile";

/**
 * Called by VS Code when the extension is first activated.
 * Activation events are declared in package.json (`onView:folderHider.hiddenFolders`
 * and `onCommand:folderHider.*`).
 */
export function activate(context: vscode.ExtensionContext): void {
  // ------------------------------------------------------------------
  // Tree-view providers
  // ------------------------------------------------------------------
  const foldersProvider = new HiddenFoldersProvider(context);
  const filesProvider = new HiddenFileProvider(context);

  const foldersTreeView = vscode.window.createTreeView(
    "folderHider.hiddenFoldersView",
    {
      treeDataProvider: foldersProvider,
      showCollapseAll: false,
      canSelectMany: false,
    },
  );

  const filesTreeView = vscode.window.createTreeView(
    "folderHider.hiddenFilesView",
    {
      treeDataProvider: filesProvider,
      showCollapseAll: false,
      canSelectMany: false,
    },
  );

  // ------------------------------------------------------------------
  // Commands — folders
  // ------------------------------------------------------------------

  /**
   * folderHider.hideFolder
   * Triggered from the Explorer context menu on a folder.
   * The URI of the right-clicked item is passed automatically by VS Code.
   */
  const hideFolderCmd = vscode.commands.registerCommand(
    "folderHider.hideFolder",
    async (uri: vscode.Uri) => {
      if (!uri) {
        vscode.window.showErrorMessage("Folder Hider: No folder selected.");
        return;
      }
      await hideFolder(uri, foldersProvider);
    },
  );

  /**
   * folderHider.unhideFolder
   * Triggered from the inline action button in the Hidden Folders panel.
   * Receives the HiddenFolder tree-item as its argument.
   */
  const unhideFolderCmd = vscode.commands.registerCommand(
    "folderHider.unhideFolder",
    async (item: HiddenFolder) => {
      if (!item) {
        vscode.window.showErrorMessage(
          "Folder Hider: No hidden folder selected.",
        );
        return;
      }
      await unhideFolder(item, foldersProvider);
    },
  );

  // ------------------------------------------------------------------
  // Commands — files
  // ------------------------------------------------------------------

  /**
   * folderHider.hideFile
   * Triggered from the Explorer context menu on a file.
   * The URI of the right-clicked item is passed automatically by VS Code.
   */
  const hideFileCmd = vscode.commands.registerCommand(
    "folderHider.hideFile",
    async (uri: vscode.Uri) => {
      if (!uri) {
        vscode.window.showErrorMessage("Folder Hider: No file selected.");
        return;
      }
      await hideFile(uri, filesProvider);
    },
  );

  /**
   * folderHider.unhideFile
   * Triggered from the inline action button in the Hidden Files panel.
   * Receives the HiddenFile tree-item as its argument.
   */
  const unhideFileCmd = vscode.commands.registerCommand(
    "folderHider.unhideFile",
    async (item: HiddenFile) => {
      if (!item) {
        vscode.window.showErrorMessage(
          "Folder Hider: No hidden file selected.",
        );
        return;
      }
      await unhideFile(item, filesProvider);
    },
  );

  // ------------------------------------------------------------------
  // Commands — shared
  // ------------------------------------------------------------------

  /**
   * folderHider.unhideAll
   * Unhides every folder and file currently in both panels.
   */
  const unhideAllCmd = vscode.commands.registerCommand(
    "folderHider.unhideAll",
    async () => {
      await unhideAll(foldersProvider, filesProvider);
    },
  );

  /**
   * folderHider.refreshPanel
   * Manual refresh — useful after external edits to .vscode/settings.json.
   */
  const refreshPanelCmd = vscode.commands.registerCommand(
    "folderHider.refreshPanel",
    () => {
      foldersProvider.refresh();
      filesProvider.refresh();
    },
  );

  // ------------------------------------------------------------------
  // Watch .vscode/settings.json for external changes.
  // If someone edits files.exclude by hand, keep both panels in sync.
  // ------------------------------------------------------------------
  const settingsWatcher = createSettingsWatcher(foldersProvider, filesProvider);

  // ------------------------------------------------------------------
  // Register everything for clean disposal on deactivation
  // ------------------------------------------------------------------
  context.subscriptions.push(
    foldersTreeView,
    filesTreeView,
    hideFolderCmd,
    hideFileCmd,
    unhideFolderCmd,
    unhideFileCmd,
    unhideAllCmd,
    refreshPanelCmd,
    settingsWatcher,
  );
}

/**
 * Creates a FileSystemWatcher that refreshes both the Hidden Folders and
 * Hidden Files panels whenever `.vscode/settings.json` is changed outside
 * of this extension.
 */
function createSettingsWatcher(
  foldersProvider: HiddenFoldersProvider,
  filesProvider: HiddenFileProvider,
): vscode.FileSystemWatcher {
  const pattern = new vscode.RelativePattern(
    vscode.workspace.workspaceFolders?.[0] ?? "",
    ".vscode/settings.json",
  );

  const watcher = vscode.workspace.createFileSystemWatcher(pattern);

  watcher.onDidChange(() => {
    foldersProvider.refresh();
    filesProvider.refresh();
  });
  watcher.onDidCreate(() => {
    foldersProvider.refresh();
    filesProvider.refresh();
  });
  watcher.onDidDelete(() => {
    foldersProvider.refresh();
    filesProvider.refresh();
  });

  return watcher;
}

/**
 * Called by VS Code when the extension is deactivated (workspace closed,
 * extension disabled, VS Code quit).  All disposables registered via
 * `context.subscriptions` are torn down automatically, so this can stay
 * empty unless you need extra async cleanup.
 */
export function deactivate(): void {
  // nothing to do — subscriptions handle cleanup
}
