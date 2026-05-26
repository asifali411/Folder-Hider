import * as vscode from "vscode";
import { HiddenFileProvider } from "../providers/hiddenFileProvider";
import { excludeFile } from "../utils/settingsManager";
import { isHideableFile, getFileName } from "../utils/pathHelper";

/**
 * Command: folderHider.hideFile
 *
 * Triggered from the Explorer context menu with the right-clicked folder URI.
 * Writes the relative path into `files.exclude` in `.vscode/settings.json` and
 * registers the folder with the provider so it appears in the Hidden Folders and Files panel.
 */
export async function hideFile(
  uri: vscode.Uri,
  provider: HiddenFileProvider,
): Promise<void> {
  // Guard: must be a file inside the open workspace.
  if (!isHideableFile(uri)) {
    vscode.window.showErrorMessage(
      "Folder Hider: The selected item is not a file inside the current workspace.",
    );
    return;
  }

  // Guard: already hidden — give friendly feedback instead of silently no-op'ing.
  if (provider.getPaths().includes(uri.fsPath)) {
    vscode.window.showInformationMessage(
      `Folder Hider: "${getFileName(uri.fsPath)}" is already hidden.`,
    );
    return;
  }

  try {
    excludeFile(uri.fsPath); // writes files.exclude → settings.json
    provider.addPath(uri.fsPath); // updates panel + persists to workspaceState

    vscode.window.showInformationMessage(
      `Folder Hider: "${getFileName(uri.fsPath)}" is now hidden.`,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    vscode.window.showErrorMessage(`Folder Hider: ${message}`);
  }
}
