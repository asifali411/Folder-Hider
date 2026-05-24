import * as vscode from "vscode";
import { HiddenFolder } from "../models/HiddenFolder";
import { HiddenFoldersProvider } from "../providers/hiddenFolderProvider";
import { unexcludeFolder } from "../utils/settingsManager";
import { getFolderName } from "../utils/pathHelper";

/**
 * Command: folderHider.unhideFolder
 *
 * Triggered by clicking the inline "Unhide" button on a tree item in the
 * Hidden Folders panel.  Removes the entry from `files.exclude` and from the
 * provider so the folder reappears in the Explorer.
 */
export async function unhideFolder(
  item: HiddenFolder,
  provider: HiddenFoldersProvider,
): Promise<void> {
  const folderName = getFolderName(item.absolutePath);

  try {
    unexcludeFolder(item.absolutePath); // removes key from files.exclude
    provider.removePath(item.absolutePath); // updates panel + workspaceState

    vscode.window.showInformationMessage(
      `Folder Hider: "${folderName}" is now visible.`,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    vscode.window.showErrorMessage(`Folder Hider: ${message}`);
  }
}
