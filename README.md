# p5.chart.js

Interactive, mobile-responsive data visualization for p5.js.

p5.chart provides one build for p5.js 1.x and 2.x. The chart API is the same in global and instance mode, and existing script-tag sketches can continue loading `p5.chart.js` after p5.

## Compatibility

The supported peer range is **p5.js >=1.10.0 <3**.

| p5.js | Script tag | Instance mode | Data loading | Tested release |
| --- | --- | --- | --- | --- |
| 2.x | Yes | Yes | Promise-based, intended for `async setup()` | 2.3.1 |
| 1.x | Yes | Yes | `preload()` placeholder and callbacks | 1.11.13 |

The browser test suite runs locally against both exact versions. It does not require p5 compatibility add-ons or live map tiles.

## Browser setup

Load p5 first, then p5.chart, then the sketch. p5.js 2.x is shown first:

```html
<script src="https://cdn.jsdelivr.net/npm/p5@2.3.1/lib/p5.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/p5.chart/p5.chart.js"></script>
<script src="sketch.js"></script>
```

For p5.js 1.x, only the p5 script changes:

```html
<script src="https://cdn.jsdelivr.net/npm/p5@1.11.13/lib/p5.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/p5.chart/p5.chart.js"></script>
<script src="sketch.js"></script>
```

The readable build is `p5.chart.js`. The minified browser build is `dist/p5.chart.min.js`.

## Global mode

```js
function setup() {
  createCanvas(800, 500);
}

function draw() {
  background(255);
  bar(
    [
      { category: 'A', value: 12 },
      { category: 'B', value: 19 }
    ],
    { x: 'category', y: 'value', title: 'Example' }
  );
}
```

## Instance mode

```js
const sketch = p => {
  const data = p.createDataFrame([
    { category: 'A', value: 12 },
    { category: 'B', value: 19 }
  ]);

  p.setup = () => {
    p.createCanvas(800, 500);
  };

  p.draw = () => {
    p.background(255);
    p.bar(data, { x: 'category', y: 'value' });
  };
};

new p5(sketch);
```

Mutable hover, table-input, geo, and cleanup state belongs to each sketch instance. Defaults such as `p5.prototype.chart.palette`, `defaultSubtitle`, `defaultTooltipColumns`, `nanPolicy`, and `autoFitCanvas` are intentionally shared and remain configurable. An instance can override a setting through `p.chart` without changing another instance.

## npm and ESM

```sh
npm install p5 p5.chart
```

The package exports an ESM add-on and keeps the root browser artifact for existing npm and CDN paths:

```js
import p5 from 'p5';
import { installP5ChartAddon } from 'p5.chart';

installP5ChartAddon(p5);

new p5(p => {
  p.setup = () => p.createCanvas(800, 500);
  p.draw = () => {
    p.background(255);
    p.pie(
      [
        { label: 'A', value: 40 },
        { label: 'B', value: 60 }
      ],
      { label: 'label', value: 'value', donut: true }
    );
  };
});
```

Advanced integrations can import the default `p5ChartAddon` function and pass it to `p5.registerAddon()` directly. `installP5ChartAddon()` is the version-neutral entry point and is safe to call more than once.

## Loading DataFrames

In p5.js 2.x, `loadDataFrame()` and a path passed to `tableToDataFrame()` return `Promise<DataFrame>`:

```js
let data;

async function setup() {
  createCanvas(800, 500);
  data = await loadDataFrame('data.csv');
}
```

Optional success and error callbacks are also accepted:

```js
const data = await loadDataFrame(
  'data.csv',
  df => console.log(df.rows.length),
  error => console.error(error)
);
```

In p5.js 1.x, existing preload usage remains synchronous-looking. The returned DataFrame placeholder is populated before `setup()`:

```js
let data;

function preload() {
  data = loadDataFrame('data.csv');
}

function setup() {
  createCanvas(800, 500);
  console.log(data.rows.length);
}
```

Legacy callbacks remain supported:

```js
function preload() {
  loadDataFrame('data.csv', df => {
    console.log(df.rows.length);
  });
}
```

Passing a `p5.Table` to `tableToDataFrame()` is synchronous in both p5 generations.

## Public API

The maintained API includes:

- configuration and palette through `chart`
- `DataFrame`, `createDataFrame()`, `loadDataFrame()`, and `tableToDataFrame()`
- `bar()`, `pie()` with donut options, `series()`, `scatter()`, `hist()`, `table()`, and `geo()`
- `toPNG()` and `toCSV()`

All existing chart options remain available. See [documentation/p5_chart_js_documentation.tex](documentation/p5_chart_js_documentation.tex) for the maintained full option reference.

## Examples

The basic sketches in `examples/base` are shared by both p5 generations:

- add `?p5=2` to use p5.js 2.3.1, which is the default
- add `?p5=1` to use p5.js 1.11.13

Data-loading examples are separated because the recommended loading syntax differs:

- `examples/1.x slightly_more_advanced` uses `preload()`
- `examples/2.x slightly_more_advanced` uses `await` inside `async setup()` and does not define `preload()`

Each advanced folder loads its matching pinned p5 release automatically. All examples retain the original visual design. p5.sound is not loaded because p5.chart does not require it.

## Development

```sh
pnpm install
pnpm build
pnpm lint
pnpm test
```

`pnpm build` reproducibly generates the readable browser build, minified browser build, and ESM build from `src/p5.chart.js`. Do not edit generated artifacts directly.

See [CHANGELOG.md](CHANGELOG.md) and [MIGRATION.md](MIGRATION.md) for the compatibility changes.
