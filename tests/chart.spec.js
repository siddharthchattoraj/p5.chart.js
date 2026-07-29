import { expect, test } from '@playwright/test';
import { readFileSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const versions = [
  { major: '1', exact: '1.11.13' },
  { major: '2', exact: '2.3.1' }
];
const charts = ['bar', 'pie', 'donut', 'series', 'scatter', 'hist', 'table', 'geo'];

function listExamples(directory) {
  return readdirSync(directory, { recursive: true })
    .filter(file => file.endsWith('.html'))
    .map(file => `/${directory}/${file.replaceAll('\\', '/')}`);
}

const exampleFiles = {
  1: [
    ...listExamples('examples/base'),
    ...listExamples('examples/1.x slightly_more_advanced')
  ].sort(),
  2: [
    ...listExamples('examples/base'),
    ...listExamples('examples/2.x slightly_more_advanced')
  ].sort()
};
const tile = readFileSync('tests/fixtures/map-tile.png');
const require = createRequire(resolve('tests/chart.spec.js'));

async function routeTiles(page, requests) {
  await page.route('https://tile.openstreetmap.org/**', async route => {
    requests.push(route.request().url());
    await route.fulfill({
      body: tile,
      contentType: 'image/png',
      headers: { 'Access-Control-Allow-Origin': '*' },
      status: 200
    });
  });
}

async function openHarness(page, options = {}) {
  const query = new URLSearchParams({
    chart: options.chart || 'bar',
    mode: options.mode || 'instance',
    version: options.version || '2'
  });
  if (options.donut) query.set('donut', '1');
  if (options.loop) query.set('loop', '1');
  if (options.transparent) query.set('transparent', '1');
  if (options.width) query.set('width', String(options.width));
  await page.goto(`/tests/fixtures/harness.html?${query}`);
  try {
    await page.waitForFunction(() => window.__ready === true, null, { timeout: 10000 });
  } catch (error) {
    const state = await page.evaluate(() => ({
      canvasCount: document.querySelectorAll('canvas').length,
      errors: window.__errors,
      frameCount: window.frameCount,
      ready: window.__ready,
      tileStates: window.p5 && window.p5.instance &&
        window.p5.instance.chart._geoState
        ? Object.values(window.p5.instance.chart._geoState.tiles).map(tile => tile.status)
        : []
    }));
    throw new Error(`${error.message}\nHarness state: ${JSON.stringify(state)}`);
  }
}

async function expectNoErrors(page) {
  expect(await page.evaluate(() => window.__errors)).toEqual([]);
}

for (const version of versions) {
  test.describe(`p5 ${version.exact}`, () => {
    for (const chart of charts) {
      test(`global ${chart} renders`, async ({ page }) => {
        const tileRequests = [];
        await routeTiles(page, tileRequests);
        await openHarness(page, {
          chart,
          donut: chart === 'donut',
          mode: 'global',
          version: version.major
        });

        await expect(page.locator('canvas')).toHaveCount(1);
        if (chart === 'geo') {
          await page.evaluate(async () => {
            await Promise.resolve(p5.instance.redraw());
          });
          await page.waitForTimeout(100);
        }
        await expect(page.locator('canvas')).toHaveScreenshot(
          `p5-${version.exact}-${chart}.png`
        );
        if (chart === 'geo') {
          const loadImageCalls = await page.evaluate(() => window.__loadImageCalls);
          expect(new Set(loadImageCalls).size).toBe(loadImageCalls.length);
          expect(tileRequests.length).toBeGreaterThan(0);
          const tileDetails = await page.evaluate(() => {
            const loaded = Object.values(p5.instance.chart._geoState.tiles)
              .filter(tile => tile.status === 'loaded');
            return {
              sample: loaded[0].img.get(10, 10),
              sizes: loaded.map(tile => [tile.img.width, tile.img.height])
            };
          });
          expect(tileDetails.sizes).toContainEqual([256, 256]);
          expect(tileDetails.sample).toEqual([219, 234, 254, 255]);
        }
        await expectNoErrors(page);
      });
    }

    test('instance mode exposes the complete API', async ({ page }) => {
      await openHarness(page, { mode: 'instance', version: version.major });
      const api = await page.evaluate(() => {
        const p = window.__instance;
        return [
          'bar', 'pie', 'series', 'scatter', 'hist', 'table', 'geo',
          'DataFrame', 'createDataFrame', 'loadDataFrame', 'tableToDataFrame',
          'toPNG', 'toCSV'
        ].every(name => typeof p[name] === 'function');
      });
      expect(api).toBe(true);
      await expectNoErrors(page);
    });

    test('DataFrame transformations preserve data and columns', async ({ page }) => {
      await openHarness(page, { mode: 'instance', version: version.major });
      const result = await page.evaluate(() => {
        const p = window.__instance;
        const df = p.createDataFrame([
          { group: 'A', value: 2 },
          { group: 'B', value: 5 },
          { group: 'A', value: 7 }
        ])
          .filter('value', '>', 2)
          .addColumn('double', row => row.value * 2)
          .sort('value', 'descending')
          .select(['group', 'double']);
        return { columns: df.columns, rows: df.rows };
      });
      expect(result.rows).toEqual([
        { group: 'A', double: 14 },
        { group: 'B', double: 10 }
      ]);
      expect(result.columns).toEqual(['group', 'double']);
    });

    test('p5.Table conversion is synchronous', async ({ page }) => {
      await openHarness(page, { mode: 'instance', version: version.major });
      const result = await page.evaluate(() => {
        const p = window.__instance;
        const source = new p5.Table();
        source.addColumn('category');
        source.addColumn('value');
        const row = source.addRow();
        row.setString('category', 'A');
        row.setNum('value', 7);
        const converted = p.tableToDataFrame(source);
        return {
          isDataFrame: converted instanceof p.DataFrame,
          isPromise: typeof converted.then === 'function',
          rows: converted.rows
        };
      });
      expect(result).toEqual({
        isDataFrame: true,
        isPromise: false,
        rows: [{ category: 'A', value: 7 }]
      });
    });

    test('loadDataFrame uses the supported loading model', async ({ page }) => {
      await openHarness(page, {
        chart: 'load',
        mode: 'instance',
        version: version.major
      });
      expect(await page.evaluate(() => window.__loadedCallback)).toBe(true);
      expect(await page.evaluate(() => window.__loadedRows.length)).toBe(3);
      expect(await page.evaluate(() => window.__loadedColumns)).toEqual([
        'category', 'value', 'group', 'lat', 'lon'
      ]);
      await expectNoErrors(page);
    });

    test('hover state activates and the deferred tooltip renders', async ({ page }) => {
      await openHarness(page, {
        chart: 'bar',
        loop: true,
        mode: 'instance',
        version: version.major
      });

      await page.evaluate(() => {
        window.__tooltipTextSeen = false;
        const p = window.__instance;
        const originalText = p.text.bind(p);
        p.text = function(value, ...args) {
          if (String(value).startsWith('value: ')) {
            window.__tooltipTextSeen = true;
          }
          return originalText(value, ...args);
        };
      });

      const candidates = [];
      for (const y of [100, 180, 270, 360, 420]) {
        for (const x of [170, 250, 350, 450, 550, 650]) {
          candidates.push([x, y]);
        }
      }
      let tooltipRendered = false;
      for (const [x, y] of candidates) {
        await page.mouse.move(x, y);
        await page.waitForTimeout(50);
        tooltipRendered = await page.evaluate(() => window.__tooltipTextSeen);
        if (tooltipRendered) break;
      }

      expect(tooltipRendered).toBe(true);
      await expect(page.locator('canvas')).toHaveCSS('cursor', 'pointer');
      await expectNoErrors(page);
    });

    test('table keyboard navigation uses held-key state', async ({ page }) => {
      await openHarness(page, {
        chart: 'table',
        loop: true,
        mode: 'instance',
        version: version.major
      });
      const before = await page.evaluate(
        () => window.__instance.chart._tableStates['test-table'].currentPage
      );
      await page.keyboard.down('ArrowRight');
      await page.waitForTimeout(500);
      await page.keyboard.up('ArrowRight');
      const after = await page.evaluate(
        () => window.__instance.chart._tableStates['test-table'].currentPage
      );
      expect(after).toBeGreaterThan(before);
      await expectNoErrors(page);
    });

    test('transparent backgrounds retain canvas alpha', async ({ page }) => {
      await openHarness(page, {
        chart: 'bar',
        mode: 'instance',
        transparent: true,
        version: version.major
      });
      const alpha = await page.evaluate(() => {
        const canvas = document.querySelector('canvas');
        return canvas.getContext('2d').getImageData(0, 0, 1, 1).data[3];
      });
      expect(alpha).toBe(0);
    });

    test('responsive canvas follows a narrower display width', async ({ page }) => {
      await openHarness(page, {
        chart: 'bar',
        loop: true,
        mode: 'instance',
        version: version.major,
        width: 800
      });
      await page.evaluate(() => {
        document.getElementById('mount').style.width = '420px';
      });
      await page.waitForFunction(
        () => document.querySelector('canvas').width <= 420
      );
      expect(await page.locator('canvas').getAttribute('width')).toBe('420');
    });

    test('PNG and CSV exports trigger downloads', async ({ page }) => {
      await openHarness(page, { mode: 'instance', version: version.major });

      const pngEvent = page.waitForEvent('download');
      await page.evaluate(() => window.__instance.toPNG('chart-export'));
      const png = await pngEvent;
      expect(png.suggestedFilename()).toBe('chart-export.png');

      const csvEvent = page.waitForEvent('download');
      await page.evaluate(() => {
        const p = window.__instance;
        p.toCSV(p.createDataFrame([{ name: 'A', value: 4 }]), 'data-export');
      });
      const csv = await csvEvent;
      expect(csv.suggestedFilename()).toBe('data-export.csv');
      const csvPath = await csv.path();
      expect(await readFile(csvPath, 'utf8')).toBe('name,value\nA,4\n');
    });

    test('two instances isolate chart state', async ({ page }) => {
      await openHarness(page, { mode: 'instance', version: version.major });
      const isolated = await page.evaluate(async () => {
        const first = window.__instance;
        const host = document.createElement('div');
        document.body.appendChild(host);
        const second = new p5(p => {
          p.setup = function() {
            p.createCanvas(120, 80);
            p.noLoop();
          };
        }, host);
        await new Promise(resolve => setTimeout(resolve, 50));
        const result = first.chart !== second.chart &&
          first.chart.inputs !== second.chart.inputs &&
          first.chart.hoverState !== second.chart.hoverState;
        await Promise.resolve(second.remove());
        return result;
      });
      expect(isolated).toBe(true);
    });

    test('loading the browser build twice does not duplicate lifecycle hooks', async ({ page }) => {
      await openHarness(page, { mode: 'instance', version: version.major });
      const before = await page.evaluate(() => {
        if (p5.lifecycleHooks) {
          return {
            post: p5.lifecycleHooks.postdraw.length,
            remove: p5.lifecycleHooks.remove.length
          };
        }
        return {
          post: p5.prototype._registeredMethods.post.length,
          remove: p5.prototype._registeredMethods.remove.length
        };
      });
      await page.addScriptTag({ url: '/p5.chart.js' });
      const after = await page.evaluate(() => {
        if (p5.lifecycleHooks) {
          return {
            post: p5.lifecycleHooks.postdraw.length,
            remove: p5.lifecycleHooks.remove.length
          };
        }
        return {
          post: p5.prototype._registeredMethods.post.length,
          remove: p5.prototype._registeredMethods.remove.length
        };
      });
      expect(after).toEqual(before);
    });

    test('geo listeners are registered once and cleaned on removal', async ({ page }) => {
      const tileRequests = [];
      await routeTiles(page, tileRequests);
      await openHarness(page, {
        chart: 'geo',
        loop: true,
        mode: 'instance',
        version: version.major
      });

      const result = await page.evaluate(async () => {
        const p = window.__instance;
        const chart = p.chart;
        const state = chart._geoState;
        const canvas = chart._geoHandlers.canvas;
        const listenerCount = chart._geoHandlers.listeners.length;
        const listenerTypes = chart._geoHandlers.listeners.map(item => item.type);
        p.redraw();
        const sameCount = chart._geoHandlers.listeners.length;

        const rect = canvas.getBoundingClientRect();
        const inside = new WheelEvent('wheel', {
          bubbles: true,
          cancelable: true,
          clientX: rect.left + 20,
          clientY: rect.top + 20,
          deltaY: -10
        });
        canvas.dispatchEvent(inside);
        const zoomAfterInside = state.zoom;

        const outside = new WheelEvent('wheel', {
          bubbles: true,
          cancelable: true,
          clientX: rect.right + 20,
          clientY: rect.bottom + 20,
          deltaY: -10
        });
        canvas.dispatchEvent(outside);

        await Promise.resolve(p.remove());
        const zoomBeforeDetachedEvent = state.zoom;
        canvas.dispatchEvent(new WheelEvent('wheel', {
          bubbles: true,
          cancelable: true,
          clientX: rect.left + 20,
          clientY: rect.top + 20,
          deltaY: -10
        }));

        return {
          insidePrevented: inside.defaultPrevented,
          listenerCount,
          listenerTypes,
          outsidePrevented: outside.defaultPrevented,
          sameCount,
          zoomAfterInside,
          zoomBeforeDetachedEvent,
          zoomAfterDetachedEvent: state.zoom,
          cleaned: chart._geoHandlers === null
        };
      });

      expect(result.listenerCount).toBe(result.sameCount);
      expect(
        result.listenerTypes.includes('pointerdown') &&
        result.listenerTypes.includes('mousedown')
      ).toBe(false);
      expect(result.insidePrevented).toBe(true);
      expect(result.outsidePrevented).toBe(false);
      expect(result.zoomAfterDetachedEvent).toBe(result.zoomBeforeDetachedEvent);
      expect(result.cleaned).toBe(true);
    });

    test('a removed sketch can be recreated without stale state', async ({ page }) => {
      await openHarness(page, {
        chart: 'table',
        mode: 'instance',
        version: version.major
      });
      const result = await page.evaluate(async () => {
        const first = window.__instance;
        const firstChart = first.chart;
        const oldInput = Object.values(firstChart.inputs)[0];
        await Promise.resolve(first.remove());
        const host = document.getElementById('mount');
        const second = new p5(p => {
          p.setup = function() {
            p.createCanvas(160, 100);
            p.noLoop();
          };
        }, host);
        await new Promise(resolve => setTimeout(resolve, 50));
        const isolated = firstChart !== second.chart &&
          typeof second.bar === 'function';
        await Promise.resolve(second.remove());
        return {
          inputDisconnected: !oldInput || !oldInput.elt.isConnected,
          inputsCleared: Object.keys(firstChart.inputs).length === 0,
          isolated
        };
      });
      expect(result).toEqual({
        inputDisconnected: true,
        inputsCleared: true,
        isolated: true
      });
    });

    test('two simultaneous geo instances do not share map state', async ({ page }) => {
      const tileRequests = [];
      await routeTiles(page, tileRequests);
      await openHarness(page, {
        chart: 'geo',
        loop: true,
        mode: 'instance',
        version: version.major
      });

      const result = await page.evaluate(async () => {
        const first = window.__instance;
        const host = document.createElement('div');
        document.body.appendChild(host);
        const data = [{ label: 'London', value: 1, lat: 51.5072, lon: -0.1276 }];
        const second = new p5(p => {
          p.setup = function() {
            p.createCanvas(240, 160);
          };
          p.draw = function() {
            p.geo(data, {
              centerLat: 51.5072,
              centerLon: -0.1276,
              label: 'label',
              lat: 'lat',
              lon: 'lon',
              showControls: false,
              value: 'value',
              zoom: 5
            });
          };
        }, host);

        await new Promise(resolve => setTimeout(resolve, 150));
        const firstHandlers = first.chart._geoHandlers;
        const secondHandlers = second.chart._geoHandlers;
        const isolated = first.chart._geoState !== second.chart._geoState &&
          firstHandlers !== secondHandlers &&
          firstHandlers.canvas !== secondHandlers.canvas;
        await Promise.resolve(second.remove());
        const firstStillRegistered = first.chart._geoHandlers === firstHandlers;
        await Promise.resolve(first.remove());
        return { firstStillRegistered, isolated };
      });

      expect(result).toEqual({
        firstStillRegistered: true,
        isolated: true
      });
    });
  });
}

test('p5 2.3.1 ESM registration renders in instance mode', async ({ page }) => {
  await page.goto('/tests/fixtures/esm.html');
  await page.waitForFunction(() => window.__ready === true);
  expect(await page.evaluate(() => typeof window.__instance.bar)).toBe('function');
  expect(await page.evaluate(() => window.__addonExports)).toEqual({
    default: 'function',
    installer: 'function'
  });
  await expectNoErrors(page);
});

test('the browser build exposes CommonJS installer exports', () => {
  const browserBuild = require('../p5.chart.js');
  expect(typeof browserBuild.p5ChartAddon).toBe('function');
  expect(typeof browserBuild.installP5ChartAddon).toBe('function');
});

test('p5 2.3.1 path conversion is a Promise and failures reject', async ({ page }) => {
  await openHarness(page, { mode: 'instance', version: '2' });
  const result = await page.evaluate(async () => {
    const p = window.__instance;
    const loading = p.tableToDataFrame(
      '/tests/fixtures/data.csv',
      'csv',
      'header'
    );
    const isPromise = typeof loading.then === 'function';
    const converted = await loading;

    let callbackMessage = '';
    let rejectionMessage = '';
    try {
      await p.loadDataFrame(
        '/tests/fixtures/does-not-exist.csv',
        undefined,
        error => { callbackMessage = error.message; }
      );
    } catch (error) {
      rejectionMessage = error.message;
    }

    return {
      callbackMessage,
      columns: converted.columns,
      isPromise,
      rejectionMessage,
      rows: converted.rows.length
    };
  });

  expect(result.isPromise).toBe(true);
  expect(result.rows).toBe(3);
  expect(result.columns).toEqual(['category', 'value', 'group', 'lat', 'lon']);
  expect(result.callbackMessage).toContain('Failed to load DataFrame');
  expect(result.rejectionMessage).toContain('Failed to load DataFrame');
  await expectNoErrors(page);
});

test('failed geo tiles clear pending state and can retry', async ({ page }) => {
  const attempts = new Map();
  await page.route('https://tile.openstreetmap.org/**', async route => {
    const url = route.request().url();
    const count = (attempts.get(url) || 0) + 1;
    attempts.set(url, count);
    if (count === 1) {
      await route.abort('failed');
      return;
    }
    await route.fulfill({
      body: tile,
      contentType: 'image/png',
      headers: { 'Access-Control-Allow-Origin': '*' },
      status: 200
    });
  });
  await openHarness(page, {
    chart: 'geo',
    loop: true,
    mode: 'instance',
    version: '2'
  });
  await page.waitForFunction(() => {
    const tiles = Object.values(window.__instance.chart._geoState.tiles);
    return tiles.some(tile => tile.attempts >= 2 && tile.status === 'loaded');
  }, null, { timeout: 10000 });

  const result = await page.evaluate(() => {
    const tiles = Object.values(window.__instance.chart._geoState.tiles);
    const calls = window.__loadImageCalls;
    return {
      retriedAndLoaded: tiles.some(tile => tile.attempts >= 2 && tile.status === 'loaded'),
      repeatedRequest: new Set(calls).size < calls.length
    };
  });

  expect(result).toEqual({
    retriedAndLoaded: true,
    repeatedRequest: true
  });
  await expectNoErrors(page);
});

for (const version of versions) {
  test(`all examples load with p5 ${version.exact}`, async ({ page }) => {
    test.setTimeout(120000);
    const p5Source = await readFile(
      version.major === '1'
        ? 'node_modules/p5-v1/lib/p5.min.js'
        : 'node_modules/p5-v2/lib/p5.min.js'
    );
    await page.route('https://cdn.jsdelivr.net/npm/p5@*/lib/p5.min.js', route =>
      route.fulfill({
        body: p5Source,
        contentType: 'application/javascript',
        status: 200
      })
    );
    const tileRequests = [];
    await routeTiles(page, tileRequests);
    await page.addInitScript(() => {
      window.__exampleErrors = [];
      window.addEventListener('error', event => {
        window.__exampleErrors.push(String(event.error || event.message));
      });
      window.addEventListener('unhandledrejection', event => {
        window.__exampleErrors.push(String(event.reason));
      });
    });

    for (const file of exampleFiles[version.major]) {
      const url = file.includes('slightly_more_advanced')
        ? file
        : `${file}?p5=${version.major}`;
      await page.goto(url);
      await expect(page.locator('canvas')).toHaveCount(1, { timeout: 10000 });
      await page.waitForTimeout(file.includes('slightly_more_advanced') ? 750 : 200);
      const loadedVersion = await page.evaluate(() => window.p5ChartP5Version);
      const errors = await page.evaluate(() => window.__exampleErrors);
      expect(loadedVersion, file).toBe(version.exact);
      expect(errors, file).toEqual([]);
    }
  });
}
