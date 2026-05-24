import * as vscode from 'vscode';
import { HiddenFoldersProvider } from './providers/hiddenFolderProvider';
import { hideFolder } from './commands/hideFolder';
import { unhideFolder } from './commands/unhideFolder';
import { unhideAll } from './commands/unhideAll';
import { HiddenFolder } from './models/HiddenFolder';

/**
 * Called by VS Code when the extension is first activated.
 * Activation events are declared in package.json (`onView:folderHider.hiddenFolders`
 * and `onCommand:folderHider.*`).
 */
export function activate(context: vscode.ExtensionContext): void {
  // ------------------------------------------------------------------
  // Tree-view provider
  // ------------------------------------------------------------------
  const provider = new HiddenFoldersProvider(context);

  const treeView = vscode.window.createTreeView('folderHider.hiddenFoldersView', {
    treeDataProvider: provider,
    showCollapseAll: false,
    canSelectMany: false,
  });

  // ------------------------------------------------------------------
  // Commands
  // ------------------------------------------------------------------

  /**
   * folderHider.hideFolder
   * Triggered from the Explorer context menu.
   * The URI of the right-clicked item is passed automatically by VS Code.
   */
  const hideFolderCmd = vscode.commands.registerCommand(
    'folderHider.hideFolder',
    async (uri: vscode.Uri) => {
      if (!uri) {
        vscode.window.showErrorMessage('Folder Hider: No folder selected.');
        return;
      }
      await hideFolder(uri, provider);
    }
  );

  /**
   * folderHider.unhideFolder
   * Triggered from the inline action button in the Hidden Folders panel.
   * Receives the HiddenFolder tree-item as its argument.
   */
  const unhideFolderCmd = vscode.commands.registerCommand(
    'folderHider.unhideFolder',
    async (item: HiddenFolder) => {
      if (!item) {
        vscode.window.showErrorMessage('Folder Hider: No hidden folder selected.');
        return;
      }
      await unhideFolder(item, provider);
    }
  );

  /**
   * folderHider.unhideAll
   * Unhides every folder currently in the Hidden Folders panel.
   */
  const unhideAllCmd = vscode.commands.registerCommand(
    'folderHider.unhideAll',
    async () => {
      await unhideAll(provider);
    }
  );

  /**
   * folderHider.refreshPanel
   * Manual refresh — useful after external edits to .vscode/settings.json.
   */
  const refreshPanelCmd = vscode.commands.registerCommand(
    'folderHider.refreshPanel',
    () => {
      provider.refresh();
    }
  );

  // ------------------------------------------------------------------
  // Watch .vscode/settings.json for external changes
  // If someone edits files.exclude by hand, keep the panel in sync.
  // ------------------------------------------------------------------
  const settingsWatcher = createSettingsWatcher(provider);

  // ------------------------------------------------------------------
  // Register everything for clean disposal on deactivation
  // ------------------------------------------------------------------
  context.subscriptions.push(
    treeView,
    hideFolderCmd,
    unhideFolderCmd,
    unhideAllCmd,
    refreshPanelCmd,
    settingsWatcher
  );
}

/**
 * Creates a FileSystemWatcher that refreshes the Hidden Folders panel
 * whenever `.vscode/settings.json` is changed outside of this extension.
 */
function createSettingsWatcher(
  provider: HiddenFoldersProvider
): vscode.FileSystemWatcher {
  const pattern = new vscode.RelativePattern(
    vscode.workspace.workspaceFolders?.[0] ?? '',
    '.vscode/settings.json'
  );

  const watcher = vscode.workspace.createFileSystemWatcher(pattern);

  watcher.onDidChange(() => provider.refresh());
  watcher.onDidCreate(() => provider.refresh());
  watcher.onDidDelete(() => provider.refresh());

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