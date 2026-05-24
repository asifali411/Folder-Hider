import * as vscode from "vscode";
import { HiddenFoldersProvider } from "../providers/hiddenFolderProvider";
import { excludeFolder } from "../utils/settingsManager";
import { isHideableFolder, getFolderName } from "../utils/pathHelper";

/**
 * Command: folderHider.hideFolder
 *
 * Triggered from the Explorer context menu with the right-clicked folder URI.
 * Writes the relative path into `files.exclude` in `.vscode/settings.json` and
 * registers the folder with the provider so it appears in the Hidden Folders panel.
 */
export async function hideFolder(
  uri: vscode.Uri,
  provider: HiddenFoldersProvider,
): Promise<void> {
  // Guard: must be a directory inside the open workspace.
  if (!isHideableFolder(uri)) {
    vscode.window.showErrorMessage(
      "Folder Hider: The selected item is not a folder inside the current workspace.",
    );
    return;
  }

  // Guard: already hidden — give friendly feedback instead of silently no-op'ing.
  if (provider.getPaths().includes(uri.fsPath)) {
    vscode.window.showInformationMessage(
      `Folder Hider: "${getFolderName(uri.fsPath)}" is already hidden.`,
    );
    return;
  }

  try {
    excludeFolder(uri.fsPath); // writes files.exclude → settings.json
    provider.addPath(uri.fsPath); // updates panel + persists to workspaceState

    vscode.window.showInformationMessage(
      `Folder Hider: "${getFolderName(uri.fsPath)}" is now hidden.`,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    vscode.window.showErrorMessage(`Folder Hider: ${message}`);
  }
}
