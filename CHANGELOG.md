# Changelog

All notable changes to this extension are documented in this file.

## [0.1.0] - 2026-04-26
### Added
- Initial release of Folder Hider
- Hide folder command from Explorer context menu
- Hidden Folders view for restoring hidden folders
- Unhide individual folder command
- Unhide all hidden folders command
- Settings for session persistence and hidden folder count display

## [0.2.0] - 2026-05-26
### Added
- Hide File command from Explorer context menu
- Hidden Files view for restoring hidden files
- Unhide individual file command
- `HiddenFile` model and `HiddenFileProvider` tree data provider
- Separate workspace storage key for hidden files (`folderHider.hiddenFiles`)

### Changed
- Unhide All command now restores both hidden folders and files in one action
- Status bar count and Refresh command now cover both folders and files
- `settingsManager` refactored to expose shared `excludeFile`/`unexcludeFile` API alongside existing folder functions
- `saveHiddenPaths`/`loadHiddenPaths` renamed to `saveHiddenFolderPaths`/`loadHiddenFolderPaths` for clarity