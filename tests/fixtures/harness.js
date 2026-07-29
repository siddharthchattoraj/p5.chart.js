const params = new URLSearchParams(location.search);
const version = params.get('version') === '1' ? '1' : '2';
const mode = params.get('mode') === 'global' ? 'global' : 'instance';
const chartName = params.get('chart') || 'bar';
const keepLooping = params.get('loop') === '1';
const transparent = params.get('transparent') === '1';
const canvasWidth = Number(params.get('width') || 800);
const canvasHeight = Number(params.get('height') || 500);

window.__ready = false;
window.__errors = [];
window.__loadImageCalls = [];
window.__loadedCallback = false;
window.addEventListener('error', event => {
  window.__errors.push(String(event.error || event.message));
});
window.addEventListener('unhandledrejection', event => {
  window.__errors.push(String(event.reason));
});

const chartData = {
  bar: [
    { category: 'Alpha', value: 12 },
    { category: 'Beta', value: 21 },
    { category: 'Gamma', value: 8 },
    { category: 'Delta', value: 17 }
  ],
  pie: [
    { label: 'Alpha', value: 12 },
    { label: 'Beta', value: 21 },
    { label: 'Gamma', value: 8 },
    { label: 'Delta', value: 17 }
  ],
  series: [
    { x: 0, value: 12 },
    { x: 1, value: 21 },
    { x: 2, value: 8 },
    { x: 3, value: 17 }
  ],
  scatter: [
    { x: 1, y: 12, size: 4 },
    { x: 2, y: 21, size: 8 },
    { x: 3, y: 8, size: 6 },
    { x: 4, y: 17, size: 10 }
  ],
  hist: [
    { value: 2 }, { value: 3 }, { value: 4 }, { value: 4 },
    { value: 5 }, { value: 6 }, { value: 6 }, { value: 7 },
    { value: 8 }, { value: 9 }, { value: 10 }, { value: 11 }
  ],
  table: Array.from({ length: 18 }, (_, index) => ({
    name: `Row ${index + 1}`,
    value: index * 3,
    group: index % 2 ? 'Two' : 'One'
  })),
  geo: [
    { label: 'San Francisco', value: 12, lat: 37.7749, lon: -122.4194 },
    { label: 'Los Angeles', value: 21, lat: 34.0522, lon: -118.2437 }
  ]
};

function renderChart(p) {
  const background = transparent ? 'transparent' : '#ffffff';
  const common = {
    background,
    title: `${chartName} chart`
  };

  if (chartName === 'bar') {
    p.bar(chartData.bar, { ...common, x: 'category', y: 'value' });
  } else if (chartName === 'pie' || chartName === 'donut') {
    p.pie(chartData.pie, {
      ...common,
      label: 'label',
      value: 'value',
      style: chartName === 'donut' || params.get('donut') === '1'
        ? 'donut'
        : 'pie'
    });
  } else if (chartName === 'series') {
    p.series(chartData.series, { ...common, x: 'x', y: 'value' });
  } else if (chartName === 'scatter') {
    p.scatter(chartData.scatter, { ...common, x: 'x', y: 'y', size: 'size' });
  } else if (chartName === 'hist') {
    p.hist(chartData.hist, { ...common, x: 'value', bins: 5 });
  } else if (chartName === 'table') {
    p.table(chartData.table, {
      ...common,
      id: 'test-table',
      maxRows: 5,
      pagination: true,
      searchable: true
    });
  } else if (chartName === 'geo') {
    p.geo(chartData.geo, {
      ...common,
      centerLat: 36,
      centerLon: -120,
      label: 'label',
      lat: 'lat',
      lon: 'lon',
      showControls: false,
      value: 'value',
      zoom: 5
    });
  }
}

function canFinish(p) {
  if (chartName !== 'geo') return p.frameCount > 3;
  const state = p.chart._geoState;
  return p.frameCount > 3 &&
    state &&
    Object.values(state.tiles).some(tile => tile.status === 'loaded');
}

function configureSketch(p) {
  let loadedData;

  if (chartName === 'load' && version === '1') {
    p.preload = function() {
      loadedData = p.loadDataFrame(
        '/tests/fixtures/data.csv',
        () => { window.__loadedCallback = true; },
        error => { window.__errors.push(String(error)); }
      );
    };
  }

  p.setup = async function() {
    p.createCanvas(canvasWidth, canvasHeight);
    if (chartName === 'geo') {
      const target = mode === 'global' && p5.instance ? p5.instance : p;
      const originalLoadImage = target.loadImage.bind(target);
      target.loadImage = function(path, ...args) {
        window.__loadImageCalls.push(path);
        return originalLoadImage(path, ...args);
      };
    }
    if (chartName === 'load' && version === '2') {
      loadedData = await p.loadDataFrame(
        '/tests/fixtures/data.csv',
        () => { window.__loadedCallback = true; },
        error => { window.__errors.push(String(error)); }
      );
    }
    if (chartName === 'load') {
      window.__loadedRows = loadedData.rows;
      window.__loadedColumns = loadedData.columns;
    }
  };

  p.draw = function() {
    if (chartName === 'load') {
      p.background(255);
      p.text(`Loaded ${loadedData.rows.length} rows`, 20, 30);
    } else {
      renderChart(p);
    }

    if (!keepLooping && canFinish(p)) {
      p.noLoop();
      window.__ready = true;
    } else if (keepLooping && p.frameCount > 3) {
      window.__ready = true;
    }
  };
}

if (mode === 'global') {
  const proxy = {};
  configureSketch(proxy);
  window.preload = proxy.preload;
  window.setup = proxy.setup;
  window.draw = proxy.draw;
  const methods = [
    'background', 'bar', 'createCanvas', 'geo', 'hist', 'loadDataFrame',
    'noLoop', 'pie', 'scatter', 'series', 'table', 'text'
  ];
  methods.forEach(name => {
    proxy[name] = (...args) => window[name](...args);
  });
  Object.defineProperties(proxy, {
    chart: { get: () => p5.instance ? p5.instance.chart : window.chart },
    frameCount: { get: () => window.frameCount }
  });
} else {
  window.__instance = new p5(p => configureSketch(p), document.getElementById('mount'));
}
