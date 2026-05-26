import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import {
  getSettingsFilePath,
  ensureVscodeDir,
  toRelativePath,
  requireWorkspaceRoot,
} from "./pathHelper";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * The shape of a parsed `.vscode/settings.json` file.
 * We only care about `files.exclude`; all other keys are preserved as-is.
 */
interface WorkspaceSettings {
  "files.exclude"?: Record<string, boolean>;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Low-level read / write
// ---------------------------------------------------------------------------

/**
 * Reads and parses `.vscode/settings.json`.
 *
 * - Returns an empty object `{}` if the file does not exist yet.
 * - Throws a user-friendly error if the file exists but contains invalid JSON
 *   (we never silently overwrite a file the user has manually edited).
 */
function readSettings(): WorkspaceSettings {
  const filePath = getSettingsFilePath();
  if (!filePath || !fs.existsSync(filePath)) {
    return {};
  }

  const raw = fs.readFileSync(filePath, "utf8").trim();
  if (!raw) {
    return {};
  }

  try {
    return JSON.parse(raw) as WorkspaceSettings;
  } catch {
    throw new Error(
      `Folder Hider: Could not parse ${filePath}.\n` +
        "Please fix any JSON syntax errors and try again.",
    );
  }
}

/**
 * Serialises `settings` and writes it to `.vscode/settings.json`.
 * Creates the `.vscode` directory if it does not already exist.
 *
 * Uses 2-space indentation to match VS Code's own formatter output.
 */
function writeSettings(settings: WorkspaceSettings): void {
  ensureVscodeDir();

  const filePath = getSettingsFilePath();
  if (!filePath) {
    throw new Error("Folder Hider: No workspace folder is open.");
  }

  fs.writeFileSync(filePath, JSON.stringify(settings, null, 2) + "\n", "utf8");
}

// ---------------------------------------------------------------------------
// files.exclude helpers
// ---------------------------------------------------------------------------

/**
 * Returns the current `files.exclude` map, defaulting to `{}` when absent.
 */
function getFilesExclude(): Record<string, boolean> {
  return readSettings()["files.exclude"] ?? {};
}

/**
 * Overwrites the `files.exclude` section while preserving every other key
 * in `settings.json` exactly as it was.
 */
function setFilesExclude(exclude: Record<string, boolean>): void {
  const settings = readSettings();
  settings["files.exclude"] = exclude;
  writeSettings(settings);
  // Also update VS Code's configuration so the change is applied immediately
  try {
    vscode.workspace
      .getConfiguration()
      .update("files.exclude", exclude, vscode.ConfigurationTarget.Workspace);
  } catch {
    // Best-effort: if the workspace update fails, the file write still persisted the change.
  }
}

// ---------------------------------------------------------------------------
// Shared exclude/unexclude primitive
// ---------------------------------------------------------------------------

/**
 * Adds any path (file or folder) to `files.exclude`.
 * Both `excludeFolder` and `excludeFile` delegate here.
 *
 * @returns The workspace-relative key written (e.g. `"src/generated"` or `"src/config.ts"`).
 */
function excludePath(absolutePath: string): string {
  const root = requireWorkspaceRoot();
  const key = toRelativePath(absolutePath, root);

  const exclude = getFilesExclude();
  if (exclude[key] === true) {
    return key; // Already excluded — nothing to do.
  }

  exclude[key] = true;
  setFilesExclude(exclude);
  return key;
}

/**
 * Removes any path (file or folder) from `files.exclude`.
 * Both `unexcludeFolder` and `unexcludeFile` delegate here.
 *
 * Cleans up `files.exclude` entirely when it becomes empty after removal,
 * to avoid leaving a stale `"files.exclude": {}` in `settings.json`.
 *
 * @returns The workspace-relative key removed.
 */
function unexcludePath(absolutePath: string): string {
  const root = requireWorkspaceRoot();
  const key = toRelativePath(absolutePath, root);

  const exclude = getFilesExclude();
  if (!(key in exclude)) {
    return key; // Not excluded — nothing to do.
  }

  delete exclude[key];

  if (Object.keys(exclude).length === 0) {
    const settings = readSettings();
    delete settings["files.exclude"];
    writeSettings(settings);
    try {
      vscode.workspace
        .getConfiguration()
        .update("files.exclude", undefined, vscode.ConfigurationTarget.Workspace);
    } catch {
      // ignore
    }
  } else {
    setFilesExclude(exclude);
  }

  return key;
}

// ---------------------------------------------------------------------------
// Public API — folders
// ---------------------------------------------------------------------------

/**
 * Adds the folder at `absolutePath` to `files.exclude`, hiding it from the
 * VS Code Explorer.
 *
 * - Derives the workspace-relative key automatically.
 * - Is idempotent: calling it on an already-hidden folder is a no-op.
 *
 * @returns The relative-path key that was written (e.g. `"src/generated"`).
 */
export function excludeFolder(absolutePath: string): string {
  return excludePath(absolutePath);
}

/**
 * Removes the folder at `absolutePath` from `files.exclude`, making it
 * visible again in the VS Code Explorer.
 *
 * - Is idempotent: calling it on a folder that isn't excluded is a no-op.
 *
 * @returns The relative-path key that was removed (e.g. `"src/generated"`).
 */
export function unexcludeFolder(absolutePath: string): string {
  return unexcludePath(absolutePath);
}

/**
 * Returns `true` if the folder at `absolutePath` is currently listed in
 * `files.exclude` with a value of `true`.
 */
export function isFolderExcluded(absolutePath: string): boolean {
  const root = getWorkspaceRoot();
  if (!root) {
    return false;
  }
  const key = toRelativePath(absolutePath, root);
  return getFilesExclude()[key] === true;
}

// ---------------------------------------------------------------------------
// Public API — files
// ---------------------------------------------------------------------------

/**
 * Adds the file at `absolutePath` to `files.exclude`, hiding it from the
 * VS Code Explorer.
 *
 * Behaves identically to `excludeFolder` — `files.exclude` treats file and
 * folder keys the same way.
 *
 * - Is idempotent: calling it on an already-hidden file is a no-op.
 *
 * @returns The relative-path key that was written (e.g. `"src/config.ts"`).
 */
export function excludeFile(absolutePath: string): string {
  return excludePath(absolutePath);
}

/**
 * Removes the file at `absolutePath` from `files.exclude`, making it
 * visible again in the VS Code Explorer.
 *
 * - Is idempotent: calling it on a file that isn't excluded is a no-op.
 *
 * @returns The relative-path key that was removed (e.g. `"src/config.ts"`).
 */
export function unexcludeFile(absolutePath: string): string {
  return unexcludePath(absolutePath);
}

/**
 * Returns `true` if the file at `absolutePath` is currently listed in
 * `files.exclude` with a value of `true`.
 */
export function isFileExcluded(absolutePath: string): boolean {
  const root = getWorkspaceRoot();
  if (!root) {
    return false;
  }
  const key = toRelativePath(absolutePath, root);
  return getFilesExclude()[key] === true;
}

// ---------------------------------------------------------------------------
// Public API — mixed (operates on both files and folders)
// ---------------------------------------------------------------------------

/**
 * Removes every path that the extension added from `files.exclude`.
 * Only keys present in `managedPaths` are touched — any exclusions the user
 * added manually are left untouched.
 *
 * Pass the combined list of hidden folder + hidden file absolute paths.
 *
 * @param managedPaths  Absolute paths of all items currently tracked by
 *                      the extension (sourced from workspace storage).
 */
export function unexcludeAll(managedPaths: string[]): void {
  if (managedPaths.length === 0) {
    return;
  }

  const root = requireWorkspaceRoot();
  const settings = readSettings();
  const exclude = settings["files.exclude"] ?? {};

  for (const absolutePath of managedPaths) {
    const key = toRelativePath(absolutePath, root);
    delete exclude[key];
  }

  if (Object.keys(exclude).length === 0) {
    delete settings["files.exclude"];
  } else {
    settings["files.exclude"] = exclude;
  }

  writeSettings(settings);
  try {
    const newExclude = Object.keys(exclude).length === 0 ? undefined : exclude;
    vscode.workspace.getConfiguration().update(
      "files.exclude",
      newExclude,
      vscode.ConfigurationTarget.Workspace,
    );
  } catch {
    // ignore
  }
}

/**
 * Returns all paths currently in `files.exclude` that are set to `true`,
 * resolved back to absolute paths.
 *
 * Covers both files and folders — useful for reconciling workspace storage
 * against what's actually in the settings file after an external edit.
 */
export function getExcludedAbsolutePaths(): string[] {
  const root = getWorkspaceRoot();
  if (!root) {
    return [];
  }

  const exclude = getFilesExclude();

  return Object.entries(exclude)
    .filter(([, value]) => value === true)
    .map(([key]) => path.resolve(root, key));
}

// ---------------------------------------------------------------------------
// Workspace-storage helpers — folders
// ---------------------------------------------------------------------------

const FOLDER_STORAGE_KEY = "folderHider.hiddenFolders";

/**
 * Persists the list of hidden folder absolute paths to VS Code workspace
 * storage so the panel survives session restarts.
 */
export function saveHiddenFolderPaths(
  context: vscode.ExtensionContext,
  paths: string[],
): void {
  context.workspaceState.update(FOLDER_STORAGE_KEY, paths);
}

/**
 * Retrieves the persisted list of hidden folder absolute paths from workspace
 * storage. Returns `[]` when nothing has been stored yet.
 */
export function loadHiddenFolderPaths(
  context: vscode.ExtensionContext,
): string[] {
  return context.workspaceState.get<string[]>(FOLDER_STORAGE_KEY) ?? [];
}

// ---------------------------------------------------------------------------
// Workspace-storage helpers — files
// ---------------------------------------------------------------------------

const FILE_STORAGE_KEY = "folderHider.hiddenFiles";

/**
 * Persists the list of hidden file absolute paths to VS Code workspace
 * storage so the panel survives session restarts.
 */
export function saveHiddenFilePaths(
  context: vscode.ExtensionContext,
  paths: string[],
): void {
  context.workspaceState.update(FILE_STORAGE_KEY, paths);
}

/**
 * Retrieves the persisted list of hidden file absolute paths from workspace
 * storage. Returns `[]` when nothing has been stored yet.
 */
export function loadHiddenFilePaths(
  context: vscode.ExtensionContext,
): string[] {
  return context.workspaceState.get<string[]>(FILE_STORAGE_KEY) ?? [];
}

// ---------------------------------------------------------------------------
// Private re-export (used only inside utils/)
// ---------------------------------------------------------------------------

function getWorkspaceRoot(): string | undefined {
  return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
}