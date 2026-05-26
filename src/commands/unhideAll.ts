import * as vscode from "vscode";
import { HiddenFoldersProvider } from "../providers/hiddenFolderProvider";
import { HiddenFileProvider } from "../providers/hiddenFileProvider";
import { unexcludeAll } from "../utils/settingsManager";

/**
 * Command: folderHider.unhideAll
 *
 * Triggered from the "Hidden Folders and Files" panel title bar action.
 * Shows a confirmation prompt, then bulk-removes every managed path from
 * `files.exclude` and clears the provider.
 */
export async function unhideAll(
  folderProvider: HiddenFoldersProvider,
  fileProvider: HiddenFileProvider,
): Promise<void> {

  const filePaths = fileProvider.getPaths();
  const folderPaths = folderProvider.getPaths();

  const paths = [...folderPaths, ...filePaths];

  if (paths.length === 0) {
    vscode.window.showInformationMessage(
      "Folder Hider: No hidden folders or files to restore.",
    );
    return;
  }

  const parts: string[] = [];
  if(folderPaths.length > 0) {
    const noun = folderPaths.length === 1 ? "folder" : "folders";
    parts.push(`${folderPaths.length} ${noun}`);
  }
  if(filePaths.length > 0) {
    const noun = filePaths.length === 1 ? "file" : "files";
    parts.push(`${filePaths.length} ${noun}`);
  }

  const answer = await vscode.window.showWarningMessage(
    `Unhide all ${parts.join(" and ")}?`,
    { modal: true },
    "Unhide All",
  );

  if (answer !== "Unhide All") return; // user cancelled

  try {
    unexcludeAll(paths); // removes all managed keys from files.exclude
    folderProvider.clearAll(); // clears panel + workspaceState
    fileProvider.clearAll();
    vscode.window.showInformationMessage(
      `Folder Hider: ${parts.join(" and ")} restored.`,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    vscode.window.showErrorMessage(`Folder Hider: ${message}`);
  }
}
