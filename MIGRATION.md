# p5.js 2.x migration

p5.chart now uses one shared implementation for p5.js 1.x and 2.x. Chart names, options, palette behavior, DataFrame transformations, and export APIs are unchanged.

## Existing script-tag sketches

Keep loading p5 before `p5.chart.js`. No chart-code changes are required when moving an existing sketch between supported p5 releases.

## Data loading

- p5.js 2.x: use `await loadDataFrame(path)` in `async setup()`.
- p5.js 1.x: existing `preload()` and callback patterns continue to work.
- `tableToDataFrame(table)` remains synchronous in both versions.
- `tableToDataFrame(path)` follows the loading model above and therefore returns a Promise on p5.js 2.x.
- Failed p5.js 2.x loads reject with a contextual error and preserve the original failure as `cause`.

The official p5 preload compatibility add-on is not required.

## Registration

The browser build installs itself when loaded after p5. ESM consumers can call `installP5ChartAddon(p5)` or pass the default export to `p5.registerAddon()`.

The p5.js 2.x path uses add-on lifecycle hooks. The p5.js 1.x adapter alone translates those hooks to `registerMethod('post', ...)` and `registerMethod('remove', ...)`.

## Instance isolation

`p.chart` contains per-instance input, hover, and geo state. Shared defaults remain available through `p5.prototype.chart`. Native geo listeners and table controls are removed when their sketch is removed.

## Intentional implementation differences

- Text layout uses `fontWidth()` on p5.js 2.x to match the space-inclusive measurements used by p5.js 1.x `textWidth()`.
- Table navigation checks held arrow keys through `keyIsDown()`.
- Canvas and color access prefer public p5 APIs; the p5.js 1.x renderer element remains isolated as a fallback.
- Geo pointer events are used when available, with mouse events as a fallback, so one physical interaction is handled once.
