import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";

// ---------------------------------------------------------------------------
// Workspace root
// ---------------------------------------------------------------------------

/**
 * Returns the absolute path of the first workspace folder, or `undefined`
 * if no workspace is open.
 *
 * Nearly all helpers below depend on this, so callers should guard against
 * `undefined` and surface a friendly message when no workspace is open.
 */
export function getWorkspaceRoot(): string | undefined {
  return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
}

/**
 * Like `getWorkspaceRoot()` but throws a descriptive error instead of
 * returning `undefined`. Use inside commands where a missing workspace
 * is truly unexpected and should abort the operation.
 */
export function requireWorkspaceRoot(): string {
  const root = getWorkspaceRoot();
  if (!root) {
    throw new Error(
      "Folder Hider: No workspace folder is open. Please open a folder first.",
    );
  }
  return root;
}

// ---------------------------------------------------------------------------
// Absolute ↔ relative conversions
// ---------------------------------------------------------------------------

/**
 * Converts an absolute path to a workspace-relative path using forward
 * slashes — the format VS Code expects in `files.exclude` keys.
 *
 * @example
 * toRelativePath('/projects/my-app/src/generated', '/projects/my-app')
 * // → 'src/generated'
 */
export function toRelativePath(
  absolutePath: string,
  workspaceRoot: string,
): string {
  const rel = path.relative(workspaceRoot, absolutePath);
  // Normalise to forward slashes on Windows.
  return rel.split(path.sep).join("/");
}

/**
 * Converts a workspace-relative path (as stored in `files.exclude`) back to
 * an absolute path.
 *
 * @example
 * toAbsolutePath('src/generated', '/projects/my-app')
 * // → '/projects/my-app/src/generated'
 */
export function toAbsolutePath(
  relativePath: string,
  workspaceRoot: string,
): string {
  return path.resolve(workspaceRoot, relativePath);
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/**
 * Returns `true` if the given path is inside (or equal to) the workspace root.
 * Prevents hiding folders that live outside the current workspace.
 */
export function isInsideWorkspace(
  absolutePath: string,
  workspaceRoot: string,
): boolean {
  const rel = path.relative(workspaceRoot, absolutePath);
  // `path.relative` returns a path starting with '..' when the target is
  // above the base, and `path.isAbsolute` catches drive-letter mismatches
  // on Windows.
  return !rel.startsWith("..") && !path.isAbsolute(rel);
}

/**
 * Returns `true` if the path points to an existing directory.
 */
export function isDirectory(absolutePath: string): boolean {
  try {
    return fs.statSync(absolutePath).isDirectory();
  } catch {
    return false;
  }
}

/**
 * Returns `true` if the given URI represents a directory that exists on disk
 * and lives inside the current workspace. Convenience wrapper used by the
 * `hideFolder` command before proceeding.
 */
export function isHideableFolder(uri: vscode.Uri): boolean {
  const root = getWorkspaceRoot();
  if (!root) {
    return false;
  }
  return isDirectory(uri.fsPath) && isInsideWorkspace(uri.fsPath, root);
}

// ---------------------------------------------------------------------------
// .vscode directory & settings.json
// ---------------------------------------------------------------------------

/**
 * Returns the absolute path to `.vscode/settings.json` for the workspace,
 * or `undefined` if no workspace is open.
 */
export function getSettingsFilePath(): string | undefined {
  const root = getWorkspaceRoot();
  if (!root) {
    return undefined;
  }
  return path.join(root, ".vscode", "settings.json");
}

/**
 * Ensures the `.vscode` directory exists, creating it if necessary.
 * Does nothing (and does not throw) if it already exists.
 */
export function ensureVscodeDir(): void {
  const root = requireWorkspaceRoot();
  const vscodeDir = path.join(root, ".vscode");
  if (!fs.existsSync(vscodeDir)) {
    fs.mkdirSync(vscodeDir, { recursive: true });
  }
}

// ---------------------------------------------------------------------------
// Display helpers
// ---------------------------------------------------------------------------

/**
 * Returns the folder name (last segment) of a path — used for labels and
 * notification messages.
 *
 * @example
 * getFolderName('/projects/my-app/src/generated') // → 'generated'
 */
export function getFolderName(absolutePath: string): string {
  return path.basename(absolutePath);
}

/**
 * Returns the parent directory as a workspace-relative path — used for the
 * `description` field in `HiddenFolder` tree items.
 *
 * Returns `undefined` when the folder sits directly at the workspace root
 * (parent would be `.`).
 *
 * @example
 * getRelativeParentDir('/projects/app/src/gen', '/projects/app')
 * // → 'src'
 */
export function getRelativeParentDir(
  absolutePath: string,
  workspaceRoot: string,
): string | undefined {
  const rel = toRelativePath(absolutePath, workspaceRoot);
  const parent = path.dirname(rel);
  return parent === "." ? undefined : parent;
}
