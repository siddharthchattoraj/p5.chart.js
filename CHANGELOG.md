# Changelog

## Unreleased

### Added

- One version-neutral add-on installer for p5.js 1.x and 2.x.
- Script-tag, instance-mode, and explicit ESM registration support.
- Promise-based DataFrame loading on p5.js 2.x while retaining p5.js 1.x preload and callback loading.
- Reproducible readable, minified, and ESM builds.
- Offline Playwright coverage against p5.js 1.11.13 and 2.3.1.

### Changed

- Mutable tooltip, table-input, geo, and event-listener state is owned by each p5 instance.
- Geo tiles track pending, loaded, and failed states, and native listeners are registered once and removed with the sketch.
- Text measurement uses p5.js 2.x `fontWidth()` semantics with a p5.js 1.x `textWidth()` fallback.
- Basic examples share one cross-major set. Advanced loading examples use dedicated p5.js 1.x `preload()` and p5.js 2.x `async setup()` variants.
- Package metadata, peer dependency range, and repository URLs have been modernized.

### Removed

- Vendored, unversioned p5.js 1.10.0 and p5.sound browser files.
- Redundant versioned basic examples and the ambiguous cross-major advanced example copies.

No package version has been changed and nothing has been published.
