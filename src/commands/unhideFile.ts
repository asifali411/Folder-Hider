import * as vscode from "vscode";
import { HiddenFile } from "../models/HiddenFile";
import { HiddenFileProvider } from "../providers/hiddenFileProvider";
import { unexcludeFile } from "../utils/settingsManager";
import { getFileName } from "../utils/pathHelper";

/**
 * Command: folderHider.unhideFile
 *
 * Triggered by clicking the inline "Unhide" button on a tree item in the
 * Hidden Folders and Files panel.  Removes the entry from `files.exclude` and from the
 * provider so the folder reappears in the Explorer.
 */
export async function unhideFile(
  item: HiddenFile,
  provider: HiddenFileProvider,
): Promise<void> {
  const fileName = getFileName(item.absolutePath);

  try {
    unexcludeFile(item.absolutePath); // removes key from files.exclude
    provider.removePath(item.absolutePath); // updates panel + workspaceState

    vscode.window.showInformationMessage(
      `Folder Hider: "${fileName}" is now visible.`,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    vscode.window.showErrorMessage(`Folder Hider: ${message}`);
  }
}
