/* =========================================
P5.CHART.JS: Interactive Charting Library for p5.js
By: Siddharth Chattoraj

Table of Contents:
  0. GLOBALS & CONFIG - OVERALL AESTHETICS
  1. DATAFRAME AND LOADING
  2. UTILS
  3. BAR CHART
  4. PIE CHART (Donut embedded)
  5. SERIES CHART (Line plot)
  6. SCATTER PLOT
  7. HISTOGRAM
  8. TABLE
  9. GEO MAP (OpenStreetMap Integration)
  10. EXPORT UTIITIES
   ========================================= */

/* 0. GLOBALS & CONFIG - OVERALL AESTHETICS */

const INSTALL_MARKER = typeof Symbol === 'function'
  ? Symbol.for('p5.chart.addon.installed')
  : '__p5ChartAddonInstalled';

// Helper: Format value labels to avoid floating point artifacts
function formatValueLabel(val, maxDecimals = 2) {
  if (typeof val !== 'number') return String(val);
  if (Math.abs(val) < 1e-6) return '0';
  let rounded = Math.round((val + Number.EPSILON) * Math.pow(10, maxDecimals)) / Math.pow(10, maxDecimals);
  if (Math.abs(rounded - Math.round(rounded)) < 1e-9) return String(Math.round(rounded));
  let s = rounded.toFixed(maxDecimals);
  s = s.replace(/\.0+$/, '');
  s = s.replace(/(\.[0-9]*[1-9])0+$/, '$1');
  return s;
}

// Helper: Get luminance of a hex color
function getLuminance(hex) {
  hex = String(hex).replace('#', '');
  if (hex.length === 3) {
    hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
  }
  if (hex.length === 8) {
    hex = hex.substring(0, 6);
  }
  if (hex.length !== 6) return 1;
  const r = parseInt(hex.substring(0,2), 16) / 255;
  const g = parseInt(hex.substring(2,4), 16) / 255;
  const b = parseInt(hex.substring(4,6), 16) / 255;
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

// Helper: Choose label color based on background
function getAutoLabelColor(p, bgColor) {
  if (typeof bgColor === 'number') {
    const v = Math.max(0, Math.min(255, bgColor));
    const lum = v / 255;
    return lum > 0.6 ? '#111' : '#fff';
  }

  if (bgColor && typeof bgColor === 'object') {
    try {
      const r = Math.max(0, Math.min(255, Number(p.red(bgColor)) || 0)) / 255;
      const g = Math.max(0, Math.min(255, Number(p.green(bgColor)) || 0)) / 255;
      const b = Math.max(0, Math.min(255, Number(p.blue(bgColor)) || 0)) / 255;
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      return lum > 0.6 ? '#111' : '#fff';
    } catch (e) {
      return '#111';
    }
  }

  let hex = bgColor;
  if (typeof hex === 'string' && hex.startsWith('rgb')) {
    const nums = hex.match(/\d+/g);
    if (nums && nums.length >= 3) {
      hex = '#' + nums.slice(0,3).map(x => (+x).toString(16).padStart(2,'0')).join('');
    }
  }
  const lum = getLuminance(hex);
  return lum > 0.6 ? '#111' : '#fff';
}

// Helper: Transparent background option.
function isTransparentBackground(bg) {
  if (bg === null) return true;
  if (typeof bg !== 'string') return false;
  const s = bg.trim().toLowerCase();
  return s === 'transparent' || s === 'none' || s === 'rgba(0,0,0,0)' || s === 'rgba(0, 0, 0, 0)';
}

export function p5ChartAddon(p5, fn, lifecycles = {}) {
  if (!p5 || !fn || fn[INSTALL_MARKER]) return;

  Object.defineProperty(fn, INSTALL_MARKER, {
    configurable: false,
    enumerable: false,
    value: true
  });

  const sharedChart = fn.chart && typeof fn.chart === 'object' ? fn.chart : {};
  const instanceCharts = new WeakMap();
  const createHoverState = () => ({
    active: false,
    x: 0,
    y: 0,
    content: [],
    tooltipScale: undefined,
    tooltipTextSize: undefined,
    tooltipFont: undefined
  });
  const createInstanceChart = () => Object.assign(Object.create(sharedChart), {
    inputs: {},
    hoverState: createHoverState()
  });

  Object.defineProperty(fn, 'chart', {
    configurable: true,
    enumerable: true,
    get() {
      if (this === fn) return sharedChart;
      if (!instanceCharts.has(this)) {
        instanceCharts.set(this, createInstanceChart());
      }
      return instanceCharts.get(this);
    },
    set(value) {
      if (this === fn) {
        if (value && value !== sharedChart && typeof value === 'object') {
          Object.assign(sharedChart, value);
        }
        return;
      }
      instanceCharts.set(this, value);
    }
  });

  sharedChart.defaultTooltipColumns = sharedChart.defaultTooltipColumns || null;
  sharedChart.defaultSubtitle = sharedChart.defaultSubtitle || null;

  // Default color palette for all charts: Warm Pastels
  if (!Array.isArray(sharedChart.palette)) {
    sharedChart.palette = [
      "#D4A373", // sand
      "#E76F51", // coral
      "#F4A261", // apricot
      "#E9C46A", // honey
      "#F28482", // soft red
      "#E5989B", // dusty rose
      "#B5838D", // mauve
      "#F7B267"  // peach
    ];
  }

  // Typography
  const DEFAULT_FONT = '"Roboto", "Helvetica Neue", "Helvetica", "Arial", sans-serif';
  const TEXT_COLOR = "#333333";
  const SUBTEXT_COLOR = "#666666";
  const TITLE_SIZE = 16;
  const SUBTITLE_SIZE = 13;
  const AXIS_LABEL_SIZE = 12;
  const TICK_LABEL_SIZE = 10;
  const DATA_LABEL_SIZE = 11;
  const SOURCE_AUTHOR_SIZE = 7;

  // Margins
  const DEFAULT_MARGIN = { top: 60, right: 40, bottom: 60, left: 80 };

  // Lines
  const AXIS_COLOR = "#333333";
  const AXIS_WEIGHT = 2;
  const TICK_COLOR = "#333333";
  const TICK_WEIGHT = 1;
  const TICK_LENGTH = 5;
  const NUM_TICKS = 5;

  // Points
  const DEFAULT_POINT_SIZE = 6;
  const DEFAULT_POINT_SIZE_SCATTER = 8;
  const MIN_POINT_SIZE = 5;
  const MAX_POINT_SIZE = 20;
  const POINT_HOVER_SCALE = 1.5;
  const POINT_STROKE_WEIGHT = 2;
  const POINT_HOVER_STROKE_WEIGHT = 3;

  // Lines
  const DEFAULT_LINE_SIZE = 2;

  // Bars
  const BAR_GAP_RATIO = 0.8;
  const BAR_LABEL_POS = 'auto';
  const BAR_LABEL_SIZE = 10;

  // Pie/Donut
  const PIE_LABEL_SIZE = 11;
  const PIE_STROKE_WEIGHT = 2;
  const PIE_STROKE_COLOR = "#FFFFFF";
  const PIE_HOVER_SCALE = 1.05;
  const DONUT_HOLE_RADIUS = 0.6;

  // Histogram
  const HIST_DEFAULT_BINS = 10;
  const HIST_BORDER_WEIGHT = 1;
  const HIST_LABEL_SIZE = 10;

  // Table
  const TABLE_ROW_HEIGHT = 30;
  const TABLE_MAX_ROWS = 10;
  const TABLE_HEADER_COLOR = "#F0F0F0";
  const TABLE_ROW_COLOR_1 = "#FFFFFF";
  const TABLE_ROW_COLOR_2 = "#FAFAFA";
  const TABLE_HOVER_COLOR = "#96C8FF";
  const TABLE_BORDER_COLOR = "#C8C8C8";
  const TABLE_TEXT_SIZE = 12;
  const TABLE_SEARCH_WIDTH = 150;
  const TABLE_ARROW_SIZE = 24;

  // Geo
  const GEO_DEFAULT_ZOOM = 4;
  const GEO_POINT_SIZE = 12;
  const GEO_POINT_COLOR = "#D62728";
  const GEO_POINT_HOVER_SCALE = 1.3;
  const GEO_LABEL_SIZE = 11;
  const GEO_PAN_AMOUNT = 0.5;

  // Tooltips
  const TOOLTIP_BG_COLOR = "rgba(0, 0, 0, 0.86)";
  const TOOLTIP_TEXT_COLOR = "#FFFFFF";
  const TOOLTIP_TEXT_SIZE = 12;
  const TOOLTIP_PADDING = 10;
  const TOOLTIP_LINE_HEIGHT = 18;
  const TOOLTIP_BORDER_RADIUS = 4;
  const TOOLTIP_OFFSET = 15;

  // Backgrounds
  const DEFAULT_BG_COLOR = "#FFFFFF";

  // Hover
  const HOVER_ALPHA = 200; // Alpha for hover state (out of 255)
  const HOVER_CURSOR = 'HAND';

  // Labels
  const LABEL_OFFSET = 10;
  const LABEL_PADDING = 5;

  // Truncation
  const TRUNCATE_SUFFIX = "...";

  // NaN Handling
  // 'warn' (default): Logs warnings and handles gracefully with visual indicators
  // 'silent': Silently filters/skips NaN values without warnings
  // 'strict': Throws errors when NaN values are detected
  const NAN_POLICY = {
    WARN: 'warn',
    SILENT: 'silent',
    STRICT: 'strict'
  };


  if (sharedChart.nanPolicy === undefined) {
    sharedChart.nanPolicy = NAN_POLICY.WARN;
  }

  // Chart-Specific Behavior:
  //   Bar        - SKIP:    Bars with NaN not rendered
  //   Series     - BREAK:   Creates gaps in series where NaN occurs
  //   Histogram  - FILTER:  NaN values excluded from binning
  //   Scatter    - SKIP:    Points with NaN not drawn
  //   Geo        - SKIP:    Points with NaN not drawn
  //   Pie        - STRICT:  Shows error message (defaults to strict mode)
  //   Table      - DISPLAY: Shows "—" with gray styling

  // Auto-fit canvas
  if (fn.chart.autoFitCanvas === undefined) {
    fn.chart.autoFitCanvas = true;
  }

  // Mobile sizing
  (function ensureResponsiveCanvasCSS() {
    try {
      const styleId = 'p5chart-responsive-canvas';
      if (typeof document === 'undefined') return;
      if (document.getElementById(styleId)) return;
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
canvas.p5Canvas, canvas[id^="defaultCanvas"]{max-width:100%;height:auto;}
`;
      document.head.appendChild(style);
    } catch (e) {
      // ignore
    }
  })();


/* 1. DATAFRAME AND LOADING */

  fn.chart.DataFrame = class DataFrame {
    constructor(data, columns) {
      this._rows = [];
      this._columns = [];

      // If initialized with no data (placeholder), return empty
      if (!data) return;

      if (Array.isArray(data) && data.length > 0) {
        if (Array.isArray(data[0])) {
          if (!columns) throw new Error("DataFrame: Columns required for array data.");
          this._columns = columns;
          this._rows = data.map(row => {
            let obj = {};
            columns.forEach((col, i) => obj[col] = row[i]);
            return obj;
          });
        } else {
          this._rows = data.map(d => ({ ...d }));
          this._columns = Object.keys(data[0]);
        }
      } else if (Array.isArray(data) && columns) {
          // Empty data but columns provided
          this._columns = columns;
      }
    }

    get columns() { return [...this._columns]; }
    get rows() { return this._rows.map(r => ({ ...r })); }
    col(name) { return this._rows.map(r => r[name]); }

    filter(colNameOrFn, operator, value) {
        if (typeof colNameOrFn === 'function') {
            return new fn.chart.DataFrame(this._rows.filter(colNameOrFn), this._columns);
        }
        const filtered = this._rows.filter(row => {
            const colVal = row[colNameOrFn];
            if (operator === '>') return colVal > value;
            if (operator === '<') return colVal < value;
            if (operator === '>=') return colVal >= value;
            if (operator === '<=') return colVal <= value;
            if (operator === '===' || operator === '==') return colVal === value;
            if (operator === '!==' || operator === '!=') return colVal !== value;
            return true;
        });
        return new fn.chart.DataFrame(filtered, this._columns);
    }

    transform(colName, fn) {
        this._rows.forEach(row => {
            if (row[colName] !== undefined) {
                row[colName] = fn(row[colName]);
            }
        });
        return this;
    }

    addColumn(colName, valueOrFn) {
      if (!colName) throw new Error('addColumn: colName is required');
      const isFn = typeof valueOrFn === 'function';
      this._rows.forEach((row, i) => {
        row[colName] = isFn ? valueOrFn(row, i) : valueOrFn;
      });
      if (!this._columns.includes(colName)) {
        this._columns.push(colName);
      }
      return this;
    }

    rename(oldName, newName) {
        const idx = this._columns.indexOf(oldName);
        if (idx === -1) throw new Error(`Column "${oldName}" not found`);
        this._columns[idx] = newName;
        this._rows.forEach(row => {
            row[newName] = row[oldName];
            delete row[oldName];
        });
        return this;
    }

    select(columnNames) {
        if (!Array.isArray(columnNames)) columnNames = [columnNames];
        const newRows = this._rows.map(row => {
            let newRow = {};
            columnNames.forEach(col => {
                if (row[col] !== undefined) newRow[col] = row[col];
            });
            return newRow;
        });
        return new fn.chart.DataFrame(newRows, columnNames);
    }

    drop(columnNames) {
        if (!Array.isArray(columnNames)) columnNames = [columnNames];
        const keepCols = this._columns.filter(col => !columnNames.includes(col));
        return this.select(keepCols);
    }

    group(groupCols, agg) {
      const keys = Array.isArray(groupCols) ? groupCols : [groupCols];
      if (!keys || keys.length === 0 || !keys[0]) {
        throw new Error('group: groupCols is required');
      }

      const SEP = '\u0000';
      const groups = new Map();

      for (const row of this._rows) {
        const keyParts = keys.map(k => row[k]);
        const mapKey = keyParts.map(v => String(v)).join(SEP);
        let g = groups.get(mapKey);
        if (!g) {
          g = { keyParts, rows: [] };
          groups.set(mapKey, g);
        }
        g.rows.push(row);
      }

      const result = [];

      if (typeof agg === 'function') {
        for (const [, g] of groups) {
          const aggregated = agg(g.rows);
          result.push({ ...Object.fromEntries(keys.map((k, i) => [k, g.keyParts[i]])), ...aggregated });
        }
        return new fn.chart.DataFrame(result);
      }

      if (!agg || typeof agg !== 'object') {
        throw new Error('group: agg must be a function or an aggregation object');
      }

      const aggEntries = Object.entries(agg);
      const toNumber = (v) => {
        const num = Number(v);
        return Number.isFinite(num) ? num : NaN;
      };

      for (const [, g] of groups) {
        const outRow = {};
        keys.forEach((k, i) => { outRow[k] = g.keyParts[i]; });

        for (const [colName, op] of aggEntries) {
          if (typeof op === 'function') {
            outRow[colName] = op(g.rows.map(r => r[colName]), g.rows);
            continue;
          }

          const values = g.rows.map(r => r[colName]).map(toNumber).filter(v => Number.isFinite(v));
          const opName = String(op).toLowerCase();

          if (opName === 'count') {
            outRow[colName] = g.rows.length;
          } else if (opName === 'sum') {
            outRow[colName] = values.reduce((a, b) => a + b, 0);
          } else if (opName === 'mean' || opName === 'avg') {
            outRow[colName] = values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
          } else if (opName === 'min') {
            outRow[colName] = values.length ? Math.min(...values) : 0;
          } else if (opName === 'max') {
            outRow[colName] = values.length ? Math.max(...values) : 0;
          } else {
            throw new Error(`group: unsupported aggregation "${op}" for column "${colName}"`);
          }
        }

        result.push(outRow);
      }

      const resultColumns = [...keys, ...aggEntries.map(([c]) => c)];
      return new fn.chart.DataFrame(result, resultColumns);
    }

    pivot(indexCol, columnCol, valueCol, aggFunc = 'sum') {
        const pivotData = {};
        const columnValues = new Set();

        this._rows.forEach(row => {
            const indexVal = row[indexCol];
            const colVal = row[columnCol];
            const val = row[valueCol];

            if (!pivotData[indexVal]) pivotData[indexVal] = {};
            if (!pivotData[indexVal][colVal]) pivotData[indexVal][colVal] = [];

            pivotData[indexVal][colVal].push(val);
            columnValues.add(colVal);
        });

        const result = [];
        const sortedCols = Array.from(columnValues).sort();

        for (let indexVal in pivotData) {
            let row = { [indexCol]: indexVal };
            sortedCols.forEach(colVal => {
                const values = pivotData[indexVal][colVal] || [];
                if (aggFunc === 'sum') {
                    row[colVal] = values.reduce((a, b) => a + b, 0);
                } else if (aggFunc === 'mean' || aggFunc === 'avg') {
                    row[colVal] = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
                } else if (aggFunc === 'count') {
                    row[colVal] = values.length;
                } else if (aggFunc === 'min') {
                    row[colVal] = values.length > 0 ? Math.min(...values) : 0;
                } else if (aggFunc === 'max') {
                    row[colVal] = values.length > 0 ? Math.max(...values) : 0;
                }
            });
            result.push(row);
        }

        return new fn.chart.DataFrame(result);
    }

    sort(colName, order = 'ascending') {
        const sortedRows = [...this._rows].sort((a, b) => {
            const valA = a[colName];
            const valB = b[colName];

            if (typeof valA === 'number' && typeof valB === 'number') {
                return order === 'ascending' ? valA - valB : valB - valA;
            }

            const strA = String(valA).toLowerCase();
            const strB = String(valB).toLowerCase();
            if (order === 'ascending') {
                return strA < strB ? -1 : strA > strB ? 1 : 0;
            } else {
                return strA > strB ? -1 : strA < strB ? 1 : 0;
            }
        });

        return new fn.chart.DataFrame(sortedRows, this._columns);
    }

      head(n = 5) {
        const count = Math.max(0, Number(n) || 0);
        return new fn.chart.DataFrame(this._rows.slice(0, count), this._columns);
      }

      tail(n = 5) {
        const count = Math.max(0, Number(n) || 0);
        return new fn.chart.DataFrame(this._rows.slice(Math.max(0, this._rows.length - count)), this._columns);
      }

      unique(colName) {
        const seen = new Set();
        const out = [];
        for (const row of this._rows) {
          const v = row ? row[colName] : undefined;
          if (!seen.has(v)) {
            seen.add(v);
            out.push(v);
          }
        }
        return out;
      }

      convertDate(colName, parserOrOptions) {
        if (!colName) throw new Error('convertDate: colName is required');

        let options = {};
        if (typeof parserOrOptions === 'function') {
          options.parser = parserOrOptions;
        } else if (typeof parserOrOptions === 'string') {
          options.format = parserOrOptions;
        } else if (parserOrOptions && typeof parserOrOptions === 'object') {
          options = { ...parserOrOptions };
        }

        const format = options.format ? String(options.format).toUpperCase() : null;
        const output = options.output === 'timestamp' ? 'timestamp' : 'date';
        const unit = options.unit === 's' ? 's' : 'ms';
        const onInvalid = options.onInvalid ? String(options.onInvalid).toLowerCase() : 'null';
        const userParser = typeof options.parser === 'function' ? options.parser : null;

        const parseKnownFormat = (raw) => {
          const s = String(raw).trim();
          if (!s) return null;

          if (format === 'YYYY-MM-DD') {
            const m = /^([0-9]{4})-([0-9]{1,2})-([0-9]{1,2})$/.exec(s);
            if (!m) return null;
            const y = Number(m[1]);
            const mo = Number(m[2]);
            const d = Number(m[3]);
            return new Date(y, mo - 1, d);
          }
          if (format === 'MM/DD/YYYY') {
            const m = /^([0-9]{1,2})\/([0-9]{1,2})\/([0-9]{4})$/.exec(s);
            if (!m) return null;
            const mo = Number(m[1]);
            const d = Number(m[2]);
            const y = Number(m[3]);
            return new Date(y, mo - 1, d);
          }
          if (format === 'DD/MM/YYYY') {
            const m = /^([0-9]{1,2})\/([0-9]{1,2})\/([0-9]{4})$/.exec(s);
            if (!m) return null;
            const d = Number(m[1]);
            const mo = Number(m[2]);
            const y = Number(m[3]);
            return new Date(y, mo - 1, d);
          }
          if (format === 'ISO') {
            const dt = new Date(s);
            return Number.isFinite(dt.getTime()) ? dt : null;
          }
          return null;
        };

        const coerceToDate = (value) => {
          if (value === null || value === undefined || value === '') return null;
          if (value instanceof Date) {
            return Number.isFinite(value.getTime()) ? value : null;
          }
          if (typeof value === 'number') {
            const ms = unit === 's' ? value * 1000 : value;
            const dt = new Date(ms);
            return Number.isFinite(dt.getTime()) ? dt : null;
          }
          if (typeof value === 'string') {
            const s = value.trim();
            if (!s) return null;
            if (!format && /^([0-9]{4})-([0-9]{2})-([0-9]{2})$/.test(s)) {
              const m = /^([0-9]{4})-([0-9]{2})-([0-9]{2})$/.exec(s);
              const y = Number(m[1]);
              const mo = Number(m[2]);
              const d = Number(m[3]);
              const dt = new Date(y, mo - 1, d);
              return Number.isFinite(dt.getTime()) ? dt : null;
            }
            const dt = new Date(s);
            return Number.isFinite(dt.getTime()) ? dt : null;
          }
          const dt = new Date(value);
          return Number.isFinite(dt.getTime()) ? dt : null;
        };

        this._rows.forEach((row, i) => {
          if (!row || row[colName] === undefined) return;

          let parsed;
          if (userParser) {
            parsed = userParser(row[colName], row, i);
          } else if (format) {
            parsed = parseKnownFormat(row[colName]);
          } else {
            parsed = coerceToDate(row[colName]);
          }

          let dt;
          if (parsed instanceof Date) dt = parsed;
          else if (typeof parsed === 'number') dt = new Date(unit === 's' ? parsed * 1000 : parsed);
          else if (parsed === null || parsed === undefined || parsed === '') dt = null;
          else dt = coerceToDate(parsed);

          const ok = dt === null ? true : Number.isFinite(dt.getTime());
          if (!ok) {
            if (onInvalid === 'throw') {
              throw new Error(`convertDate: invalid date in column "${colName}" at row ${i}`);
            }
            if (onInvalid === 'keep') return;
            dt = null;
          }
          row[colName] = output === 'timestamp' ? (dt === null ? null : dt.getTime()) : dt;
        });

        return this;
      }
  };

  fn.createDataFrame = function(data, cols) {
    return new this.chart.DataFrame(data, cols);
  };

  fn.DataFrame = fn.chart.DataFrame;

  const compatibility = {
    usesPromiseLoaders: typeof fn.registerPreloadMethod !== 'function',
    tableArguments(path, type, options) {
      const format = type || 'csv';
      const header = options === undefined ? 'header' : options;
      if (!this.usesPromiseLoaders) return [path, format, header];

      const separators = { csv: ',', ssv: ';', tsv: '\t' };
      const separator = separators[format] || format || ',';
      return [path, separator, header];
    },
    canvasElement(p) {
      if (p.canvas) return p.canvas;
      return p._renderer && p._renderer.elt ? p._renderer.elt : null;
    },
    removalSignal(p) {
      return p && p._removeSignal ? p._removeSignal : undefined;
    },
    loadImage(p, path, success, failure) {
      let settled = false;
      const resolve = image => {
        if (settled) return;
        settled = true;
        success(image);
      };
      const reject = error => {
        if (settled) return;
        settled = true;
        failure(error);
      };
      const result = p.loadImage(path, resolve, reject);
      if (result && typeof result.then === 'function') {
        result.then(resolve, reject);
      }
      return result;
    }
  };

  function convertTable(p, table) {
    if (!table || typeof table.getRowCount !== 'function') {
      throw new TypeError('tableToDataFrame: Expected a p5.Table.');
    }

    let columns = Array.isArray(table.columns) ? [...table.columns] : [];
    if (columns.length === 0 && table.getRowCount() > 0) {
      const first = table.getRow(0);
      if (first && first.obj && typeof first.obj === 'object') {
        columns = Object.keys(first.obj);
      }
    }
    const data = [];
    const rowCount = table.getRowCount();

    for (let i = 0; i < rowCount; i++) {
      let row = table.getRow(i);
      let obj = {};
      columns.forEach((col, columnIndex) => {
        let val = row.get(columnIndex);
        if (val !== null && val !== '' && !isNaN(Number(val))) {
          val = Number(val);
        }
        obj[col] = val;
      });
      data.push(obj);
    }

    return new p.chart.DataFrame(data, columns);
  }

  function loadDataFrameFromPath(p, path, type, options, callback, errorCallback) {
    const tableArgs = compatibility.tableArguments(path, type, options);

    if (!compatibility.usesPromiseLoaders) {
      const df = new p.chart.DataFrame([], []);
      const onSuccess = table => {
        const loaded = convertTable(p, table);
        df._rows = loaded._rows;
        df._columns = loaded._columns;
        if (typeof callback === 'function') callback(df);
      };
      const onError = error => {
        if (typeof errorCallback === 'function') {
          errorCallback(error);
        } else {
          console.error(`[p5.chart] Failed to load DataFrame from ${path}:`, error);
        }
      };
      p.loadTable(...tableArgs, onSuccess, onError);
      return df;
    }

    return new Promise((resolve, reject) => {
      let settled = false;
      const onSuccess = table => {
        if (settled) return;
        settled = true;
        try {
          const df = convertTable(p, table);
          if (typeof callback === 'function') callback(df);
          resolve(df);
        } catch (error) {
          reject(error);
        }
      };
      const onError = cause => {
        if (settled) return;
        settled = true;
        const error = new Error(`[p5.chart] Failed to load DataFrame from ${path}.`);
        error.cause = cause;
        if (typeof errorCallback === 'function') errorCallback(error);
        reject(error);
      };

      try {
        const result = p.loadTable(...tableArgs, onSuccess, onError);
        if (result && typeof result.then === 'function') {
          result.then(onSuccess, onError);
        }
      } catch (error) {
        onError(error);
      }
    });
  }

  fn.loadDataFrame = function(path, callback, errorCallback) {
    return loadDataFrameFromPath(this, path, 'csv', 'header', callback, errorCallback);
  };

  fn.tableToDataFrame = function(pathOrTable, type, options) {
    if (typeof pathOrTable === 'string') {
      return loadDataFrameFromPath(this, pathOrTable, type, options);
    }

    return convertTable(this, pathOrTable);
  };

/* 2. UTILS */

  // Get color from palette
  function getColor(p, i, customPalette) {
    const pal = customPalette && Array.isArray(customPalette) && customPalette.length > 0
        ? customPalette
        : p.chart.palette || ["#395B64", "#A5C9CA", "#E7F6F2", "#2C3333", "#FF8B8B", "#EB4747", "#ABC9FF", "#FFD966"];

    if (p.debug || (customPalette && customPalette.debug)) {
        console.log("Using palette:", pal);
        console.log("Returning color at index", i, ":", pal[i % pal.length]);
    }

    return pal[i % pal.length];
  }

  /**
   * Calculate nice tick interval for axes
   * Returns a "nice" number for the given range
   * @param {number} range - The data range (max - min)
   * @param {number} targetTicks - Target number of ticks (default 5)
   * @returns {number} Nice interval value
   */
  function niceInterval(range, targetTicks = NUM_TICKS) {
    if (range === 0) return 1;
    const roughInterval = range / targetTicks;
    const magnitude = Math.pow(10, Math.floor(Math.log10(roughInterval)));
    const normalized = roughInterval / magnitude;

    let niceFactor;
    if (normalized <= 1) niceFactor = 1;
    else if (normalized <= 2) niceFactor = 2;
    else if (normalized <= 5) niceFactor = 5;
    else niceFactor = 10;

    return niceFactor * magnitude;
  }

  /**
   * Calculate nice axis bounds and tick values
   * @param {number} dataMin - Minimum value in data
   * @param {number} dataMax - Maximum value in data
   * @param {number} targetTicks - Target number of ticks
   * @returns {Object} { min, max, interval, ticks }
   */
  function niceAxisBounds(dataMin, dataMax, targetTicks = NUM_TICKS) {
    const range = dataMax - dataMin;
    const interval = niceInterval(range, targetTicks);

    const niceMin = Math.floor(dataMin / interval) * interval;
    const niceMax = Math.ceil(dataMax / interval) * interval;

    const ticks = [];
    for (let tick = niceMin; tick <= niceMax; tick += interval) {
      ticks.push(tick);
    }

    return { min: niceMin, max: niceMax, interval, ticks };
  }

  /**
   * Validates data for NaN/null values with consistent policy handling
   * @param {DataFrame} df - The DataFrame to validate
   * @param {Array<string>} columns - Columns to check for NaN values
   * @param {Object} options - Chart options including nanPolicy
   * @param {string} chartType - Type of chart (for logging)
   * @returns {Object} { hasNaN: boolean, nanCount: number, nanIndices: Array, cleanData: Array }
   */
  function validateData(df, columns, options = {}, chartType = 'chart') {
    const policy = options.nanPolicy || fn.chart.nanPolicy || 'warn';
    const rows = df.rows;

    let nanCount = 0;
    let nanIndices = [];
    let nanDetails = {};

    rows.forEach((row, idx) => {
      let hasNaN = false;
      columns.forEach(col => {
        const val = row[col];
        if (val === null || val === '' || val === undefined ||
            (typeof val === 'number' && isNaN(val)) ||
            (typeof val === 'string' && isNaN(Number(val)) && val !== '')) {
          hasNaN = true;
          if (!nanDetails[col]) nanDetails[col] = 0;
          nanDetails[col]++;
        }
      });
      if (hasNaN) {
        nanCount++;
        nanIndices.push(idx);
      }
    });

    const hasNaN = nanCount > 0;

    // Handle based on policy
    if (hasNaN) {
      const detailsStr = Object.entries(nanDetails)
        .map(([col, count]) => `${col} (${count})`)
        .join(', ');

      if (policy === 'strict') {
        throw new Error(
          `[p5.chart.${chartType}] Data contains ${nanCount} row(s) with NaN/null values in columns: ${detailsStr}. ` +
          `Set nanPolicy: 'warn' or 'silent' to handle automatically.`
        );
      } else if (policy === 'warn') {
        console.warn(
          `[p5.chart.${chartType}] Data Quality Warning: ${nanCount} of ${rows.length} rows contain NaN/null values.`,
          `\n  Affected columns: ${detailsStr}`,
          `\n  These values will be handled according to chart type behavior.`,
          `\n  To suppress this warning, set nanPolicy: 'silent' in chart options.`,
          `\n  To throw an error instead, set nanPolicy: 'strict'.`
        );
      }
      // 'silent' mode: no output
    }

    return {
      hasNaN,
      nanCount,
      nanIndices,
      nanDetails,
      totalRows: rows.length,
      policy
    };
  }


  // Responsive Helpers

  function clampNumber(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function getCanvasElement(p) {
    return compatibility.canvasElement(p);
  }

  function measureText(p, value) {
    const text = String(value);
    return typeof p.fontWidth === 'function'
      ? p.fontWidth(text)
      : p.textWidth(text);
  }

  function getCanvasDisplayMetrics(p) {
    const elt = getCanvasElement(p);
    if (!elt || !elt.getBoundingClientRect) {
      return { left: 0, top: 0, width: p.width || 0, height: p.height || 0, scaleX: 1, scaleY: 1, scale: 1 };
    }
    const rect = elt.getBoundingClientRect();
    const scaleX = rect.width ? (p.width / rect.width) : 1;
    const scaleY = rect.height ? (p.height / rect.height) : 1;
    const cssPerCanvasX = rect.width && p.width ? (rect.width / p.width) : 1;
    const cssPerCanvasY = rect.height && p.height ? (rect.height / p.height) : 1;
    const cssPerCanvas = Math.min(cssPerCanvasX, cssPerCanvasY);

    return {
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
      scaleX,
      scaleY,
      scale: cssPerCanvas
    };
  }

  function isMobileLayout(p, options = {}) {
    if (options && options.responsive === false) return false;
    if (options && options.mobilePadding === false) return false;
    if (options && options.mobilePadding === true) return true;
    const metrics = getCanvasDisplayMetrics(p);
    const displayW = metrics.width || p.width || 0;
    return displayW > 0 && displayW < 640;
  }

  function getMobileRightPadding(p, options = {}) {
    if (!isMobileLayout(p, options)) return 0;
    return scalePx(p, options, 20, 8, 24);
  }

  function withMobileRightPadding(p, options, margin) {
    const m0 = margin || DEFAULT_MARGIN;
    const m = {
      top: m0.top || 0,
      right: m0.right || 0,
      bottom: m0.bottom || 0,
      left: m0.left || 0
    };
    const pad = getMobileRightPadding(p, options);
    if (pad > 0) m.right += pad;
    return m;
  }

  // Auto-fit canvas to parent container
  function ensureCanvasMatchesDisplay(p, options = {}) {
    const globalEnabled = fn.chart.autoFitCanvas !== false;
    const localEnabled = options.autoFitCanvas !== false;
    if (!globalEnabled || !localEnabled) return;
    if (!p || typeof p.resizeCanvas !== 'function') return;

    const elt = getCanvasElement(p);
    if (!elt || !elt.getBoundingClientRect) return;

    if (!p.chart._designCanvasSize) {
      p.chart._designCanvasSize = { w: p.width || 0, h: p.height || 0 };
    }
    const designW = Math.max(1, Math.round(p.chart._designCanvasSize.w || p.width || 1));
    const designH = Math.max(1, Math.round(p.chart._designCanvasSize.h || p.height || 1));

    // Determine available size from parent container
    let availW = (typeof window !== 'undefined' && window.innerWidth) ? window.innerWidth : designW;
    let availH = (typeof window !== 'undefined' && window.innerHeight) ? window.innerHeight : designH;
    try {
      const parent = elt.parentElement;
      if (parent && parent.getBoundingClientRect) {
        const pr = parent.getBoundingClientRect();
        if (pr.width && pr.width > 0) availW = pr.width;
        if (pr.height && pr.height >= 80) availH = pr.height;
      }
    } catch (e) {
      // ignore
    }

    // Fit to available space, but never grow beyond the design size.
    const targetW = Math.max(1, Math.round(Math.min(designW, availW)));
    const targetH = Math.max(1, Math.round(Math.min(designH, availH)));

    if (Math.abs((p.width || 0) - targetW) > 1 || Math.abs((p.height || 0) - targetH) > 1) {
      if (!p.chart._lastAutoFit) p.chart._lastAutoFit = { w: 0, h: 0, frame: -1 };
      const last = p.chart._lastAutoFit;
      if (last.w === targetW && last.h === targetH && last.frame === p.frameCount) return;
      last.w = targetW;
      last.h = targetH;
      last.frame = p.frameCount;
      try {
        p.resizeCanvas(targetW, targetH);
      } catch (e) {
        // ignore
      }
    }
  }

  // Mobile-first scaling
  function getResponsiveScale(p, options = {}) {
    if (options && options.responsive === false) return 1;
    if (options && typeof options.responsiveScale === 'number') {
      return clampNumber(options.responsiveScale, 0.4, 2);
    }

    // Prefer displayed canvas size
    const metrics = getCanvasDisplayMetrics(p);
    const displayW = metrics.width || ((options && options.width) ? options.width : p.width);
    const displayH = metrics.height || ((options && options.height) ? options.height : p.height);
    const minDim = Math.max(1, Math.min(displayW || 1, displayH || 1));

    // Scale down typography when the displayed canvas is actually smaller than that
    const BASE_MIN_DIM = 400;
    if (minDim >= BASE_MIN_DIM) return 1;
    const displayScale = minDim / BASE_MIN_DIM;
    return clampNumber(displayScale, 0.6, 1);
  }

  function scalePx(p, options, px, min = 1, max = Infinity) {
    const s = getResponsiveScale(p, options);
    const v = Math.round(px * s);
    return clampNumber(v, min, max);
  }

  function getResponsiveMargin(p, options, baseMargin) {
    const s = getResponsiveScale(p, options);
    const baseW = (options && options.width) ? options.width : p.width;
    const baseH = (options && options.height) ? options.height : p.height;

    const m0 = baseMargin || DEFAULT_MARGIN;
    const m = {
      top: Math.round((m0.top || 0) * s),
      right: Math.round((m0.right || 0) * s),
      bottom: Math.round((m0.bottom || 0) * s),
      left: Math.round((m0.left || 0) * s)
    };

    // Keep margins usable on very small screens
    const minMargin = 10;
    m.top = Math.max(minMargin, m.top);
    m.right = Math.max(minMargin, m.right);
    m.bottom = Math.max(minMargin, m.bottom);
    m.left = Math.max(minMargin, m.left);

    // Ensure space for titles and footer/axis labels
    const needsTop = !!(options && (options.title || options.subtitle));
    const topMin = needsTop ? Math.round(50 * s) : Math.round(18 * s);
    m.top = Math.max(m.top, topMin);

    const needsBottom = !!(options && (options.xLabel || options.yLabel || options.source || options.author));
    const bottomMin = needsBottom ? Math.round(60 * s) : Math.round(18 * s);
    m.bottom = Math.max(m.bottom, bottomMin);

    // Prevent margins from swallowing the plot area
    const maxLR = Math.max(40, Math.floor((baseW || 0) * 0.32));
    const maxTB = Math.max(40, Math.floor((baseH || 0) * 0.36));
    m.left = Math.min(m.left, maxLR);
    m.right = Math.min(m.right, maxLR);
    m.top = Math.min(m.top, maxTB);
    m.bottom = Math.min(m.bottom, maxTB);

    return m;
  }

  function normalizeLegendSpec(legend) {
    if (!legend) return { enabled: false, layout: 'horizontal' };

    if (legend === true) return { enabled: true, layout: 'horizontal' };
    if (legend === 'horizontal') return { enabled: true, layout: 'horizontal' };
    if (legend === 'vertical') return { enabled: true, layout: 'vertical' };

    if (typeof legend === 'object') {
      const enabled = (legend.enabled !== undefined) ? !!legend.enabled : true;
      const layoutRaw = legend.layout || legend.orientation || legend.direction;
      const layout = (layoutRaw === 'vertical') ? 'vertical' : 'horizontal';
      return { enabled, layout };
    }

    return { enabled: false, layout: 'horizontal' };
  }

  function getLegendEntriesFromOptions(p, opts) {
    if (!opts) return [];

    const palette = opts.palette || (p && p.chart ? p.chart.palette : undefined);

    // Internal precomputed legend
    if (Array.isArray(opts._legendEntries) && opts._legendEntries.length > 0) {
      const colors = Array.isArray(opts._legendColors) ? opts._legendColors : [];
      return opts._legendEntries
        .map((label, i) => ({
          label: String(label),
          color: colors[i] !== undefined ? colors[i] : getColor(p, i, palette)
        }))
        .filter(e => e.label.trim().length > 0);
    }

    const legendItems = (opts.legend && typeof opts.legend === 'object' && Array.isArray(opts.legend.items))
      ? opts.legend.items
      : opts.legendItems;
    if (Array.isArray(legendItems) && legendItems.length > 0) {
      return legendItems
        .map((it, i) => {
          if (it == null) return null;
          if (typeof it === 'string' || typeof it === 'number') {
            return { label: String(it), color: getColor(p, i, palette) };
          }
          if (typeof it === 'object') {
            const label = (it.label !== undefined) ? it.label : it.name;
            const color = (it.color !== undefined) ? it.color : getColor(p, i, palette);
            if (label === undefined) return null;
            return { label: String(label), color };
          }
          return null;
        })
        .filter(Boolean)
        .filter(e => e.label.trim().length > 0);
    }

    if (Array.isArray(opts.legendLabels) && opts.legendLabels.length > 0) {
      const colors = Array.isArray(opts.legendColors) ? opts.legendColors : (Array.isArray(opts.colors) ? opts.colors : []);
      return opts.legendLabels
        .map((label, i) => ({
          label: String(label),
          color: colors[i] !== undefined ? colors[i] : getColor(p, i, palette)
        }))
        .filter(e => e.label.trim().length > 0);
    }

    if (Array.isArray(opts.y) && opts.y.length > 1) {
      return opts.y
        .map((label, i) => ({ label: String(label), color: getColor(p, i, palette) }))
        .filter(e => e.label.trim().length > 0);
    }

    return [];
  }

  function computeLegendLayout(p, opts, w, entries, legendSpec) {
    const enabled = !!(legendSpec && legendSpec.enabled);
    if (!enabled || !entries || entries.length === 0) {
      return { enabled: false, layout: 'horizontal', rows: [], height: 0, boxSize: 0, textSize: 0, gap: 0, itemGap: 0, rowGap: 0 };
    }

    const scale = (opts && typeof opts._responsiveScale === 'number')
      ? opts._responsiveScale
      : getResponsiveScale(p, opts);

    const textSize = (opts && opts.legendTextSize) ? opts.legendTextSize : Math.round(11 * scale);
    const boxSize = (opts && opts.legendBoxSize) ? opts.legendBoxSize : Math.round(10 * scale);
    const gap = Math.round(8 * scale);
    const itemGap = Math.round(14 * scale);
    const rowGap = Math.round(6 * scale);
    const itemH = Math.max(textSize, boxSize) + Math.round(2 * scale);

    p.push();
    // Support async font loading when the installed p5 loader returns a Promise.
    if (opts && opts.font && typeof opts.font.then === 'function') {
      // If font is a Promise, await it (async setup required in user code)
      opts.font.then(f => p.textFont(f));
    } else {
      p.textFont((opts && opts.font) ? opts.font : DEFAULT_FONT);
    }
    p.textSize(textSize);
    p.textStyle(p.NORMAL);

    const rows = [];
    const layout = (legendSpec.layout === 'vertical') ? 'vertical' : 'horizontal';

    if (layout === 'vertical') {
      entries.forEach(entry => rows.push([entry]));
    } else {
      let row = [];
      let rowW = 0;
      const maxW = Math.max(10, w);

      entries.forEach((entry, i) => {
        const labelW = measureText(p, entry.label);
        const itemW = boxSize + gap + labelW + itemGap;
        const nextW = rowW + (row.length ? itemW : (itemW));

        if (row.length > 0 && nextW > maxW) {
          rows.push(row);
          row = [entry];
          rowW = itemW;
        } else {
          row.push(entry);
          rowW = nextW;
        }
      });
      if (row.length) rows.push(row);
    }

    p.pop();

    const rowCount = rows.length;
    const height = rowCount * itemH + Math.max(0, rowCount - 1) * rowGap;

    return { enabled: true, layout, rows, height, boxSize, textSize, gap, itemGap, rowGap, itemH };
  }

  function formatLegendNumber(val) {
    const num = Number(val);
    if (!isFinite(num)) return String(val);
    if (Math.abs(num - Math.round(num)) < 1e-9) return String(Math.round(num));
    const absVal = Math.abs(num);
    if (absVal >= 1000) return (num / 1000).toFixed(1) + 'k';
    if (absVal >= 10) return num.toFixed(1);
    return num.toFixed(2);
  }

  function wrapTextLines(p, text, maxW) {
    const raw = String(text);
    if (!raw) return [''];
    const paragraphs = raw.split(/\r?\n/);
    const out = [];

    const pushWrappedWord = (word) => {
      let chunk = '';
      for (let i = 0; i < word.length; i++) {
        const next = chunk + word[i];
        if (chunk.length > 0 && measureText(p, next) > maxW) {
          out.push(chunk);
          chunk = word[i];
        } else {
          chunk = next;
        }
      }
      if (chunk.length) out.push(chunk);
    };

    paragraphs.forEach(par => {
      const trimmed = par.trim();
      if (!trimmed) {
        out.push('');
        return;
      }

      const words = trimmed.split(/\s+/);
      let line = '';

      words.forEach(word => {
        const candidate = line ? (line + ' ' + word) : word;

        if (measureText(p, candidate) <= maxW) {
          line = candidate;
          return;
        }

        if (line) out.push(line);

        if (measureText(p, word) <= maxW) {
          line = word;
        } else {
          pushWrappedWord(word);
          line = '';
        }
      });

      if (line) out.push(line);
    });

    return out.length ? out : [''];
  }

  function computeLegendGradientLayout(p, opts, w, legendSpec) {
    const enabled = !!(legendSpec && legendSpec.enabled);
    if (!enabled) return { enabled: false, height: 0 };

    const scale = (opts && typeof opts._responsiveScale === 'number')
      ? opts._responsiveScale
      : getResponsiveScale(p, opts);

    const textSize = (opts && opts.legendTextSize) ? opts.legendTextSize : Math.round(11 * scale);
    const barH = (opts && opts.legendBarHeight) ? opts.legendBarHeight : Math.round(10 * scale);
    const gap = Math.round(6 * scale);
    const barW = (opts && opts.legendBarWidth)
      ? opts.legendBarWidth
      : Math.min(Math.max(60, Math.round(220 * scale)), Math.max(60, w));

    const height = barH + gap + textSize;
    return { enabled: true, textSize, barH, barW, gap, height };
  }

  function computeSideLegendItemsLayout(p, opts, entries, legendSpec) {
    const enabled = !!(legendSpec && legendSpec.enabled);
    if (!enabled || !entries || entries.length === 0) return { enabled: false, width: 0, height: 0 };

    const scale = (opts && typeof opts._responsiveScale === 'number')
      ? opts._responsiveScale
      : getResponsiveScale(p, opts);

    const textSize = (opts && opts.legendTextSize) ? opts.legendTextSize : Math.round(11 * scale);
    const boxSize = (opts && opts.legendBoxSize) ? opts.legendBoxSize : Math.round(10 * scale);
    const gap = Math.round(8 * scale);
    const rowGap = Math.round(6 * scale);
    const itemH = Math.max(textSize, boxSize) + Math.round(2 * scale);

    p.push();
    p.textFont((opts && opts.font) ? opts.font : DEFAULT_FONT);
    p.textSize(textSize);
    p.textStyle(p.NORMAL);
    let maxLabelW = 0;
    entries.forEach(entry => {
      const w0 = measureText(p, entry.label);
      if (w0 > maxLabelW) maxLabelW = w0;
    });
    p.pop();

    const width = boxSize + gap + maxLabelW;
    const height = entries.length * itemH + Math.max(0, entries.length - 1) * rowGap;

    return { enabled: true, textSize, boxSize, gap, rowGap, itemH, width, height };
  }

  function computeMetaLayout(p, opts, w) {
    const scale = (opts && typeof opts._responsiveScale === 'number')
      ? opts._responsiveScale
      : getResponsiveScale(p, opts);

    const titleSize = (opts && opts.titleSize) ? opts.titleSize : Math.round(TITLE_SIZE * scale);
    const subtitleSize = (opts && opts.subtitleSize) ? opts.subtitleSize : Math.round(SUBTITLE_SIZE * scale);

    const legendSpec = normalizeLegendSpec(opts && opts.legend);
    const entries = getLegendEntriesFromOptions(p, opts);

    const gradientSpec = (opts && opts._legendGradient) ? opts._legendGradient : null;
    const useGradient = !!(legendSpec.enabled && gradientSpec && (!entries || entries.length === 0));

    // Legend positioning
    const isSideLegend = (legendSpec.layout === 'vertical');

    const legendLayout = isSideLegend
      ? (useGradient
          ? computeLegendGradientLayout(p, opts, Math.max(60, Math.round(220 * scale)), legendSpec)
          : computeSideLegendItemsLayout(p, opts, entries, legendSpec))
      : (useGradient
          ? computeLegendGradientLayout(p, opts, w, legendSpec)
          : computeLegendLayout(p, opts, w, entries, legendSpec));

    const metaPadTop = Math.round(10 * scale);
    const metaGap = Math.round(6 * scale);
    const plotPad = Math.round(4 * scale);
    const metaPad = Math.round(10 * scale);
    const maxMetaW = Math.max(10, w - metaPad * 2);
    const titleLineGap = Math.round(3 * scale);
    const subtitleLineGap = Math.round(3 * scale);

    // Title/subtitle wrapping
    let titleLines = null;
    let subtitleLines = null;
    let titleHeight = 0;
    let subtitleHeight = 0;
    const titleWrap = !(opts && opts.titleWrap === false);
    const subtitleWrap = !(opts && opts.subtitleWrap === false);

    p.push();
    p.textFont((opts && opts.font) ? opts.font : DEFAULT_FONT);

    if (opts && opts.title) {
      p.textSize(titleSize);
      p.textStyle(p.BOLD);
      titleLines = titleWrap ? wrapTextLines(p, opts.title, maxMetaW) : [String(opts.title)];
      titleHeight = titleLines.length * titleSize + Math.max(0, titleLines.length - 1) * titleLineGap;
    }
    if (opts && opts.subtitle) {
      p.textSize(subtitleSize);
      p.textStyle((opts && opts.subtitleBold) ? p.BOLD : p.NORMAL);
      subtitleLines = subtitleWrap ? wrapTextLines(p, opts.subtitle, maxMetaW) : [String(opts.subtitle)];
      subtitleHeight = subtitleLines.length * subtitleSize + Math.max(0, subtitleLines.length - 1) * subtitleLineGap;
    }

    p.pop();

    // Legend flow
    let legendTopY = null;
    let legendBottomY = null;

    let yCursor = -plotPad;
    if (legendLayout.enabled && !isSideLegend) {
      legendBottomY = yCursor;
      legendTopY = legendBottomY - legendLayout.height;
      yCursor = legendTopY - metaGap;
    }

    let subtitleTopY = null;
    if (subtitleLines) {
      subtitleTopY = yCursor - subtitleHeight;
      yCursor = subtitleTopY - metaGap;
    }

    let titleTopY = null;
    if (titleLines) {
      titleTopY = yCursor - titleHeight;
      yCursor = titleTopY - metaGap;
    }

    // Compute required top space
    let topmostY = 0;
    if (titleTopY !== null) topmostY = Math.min(topmostY, titleTopY);
    if (subtitleTopY !== null) topmostY = Math.min(topmostY, subtitleTopY);
    if (!isSideLegend && legendTopY !== null) topmostY = Math.min(topmostY, legendTopY);
    const requiredTop = Math.max(0, -topmostY + metaPadTop);

    return {
      scale,
      titleSize,
      subtitleSize,
      title: {
        lines: titleLines,
        topY: titleTopY,
        height: titleHeight,
        lineGap: titleLineGap
      },
      subtitle: {
        lines: subtitleLines,
        topY: subtitleTopY,
        height: subtitleHeight,
        lineGap: subtitleLineGap
      },
      legend: {
        enabled: legendLayout.enabled,
        position: isSideLegend ? 'right' : 'top',
        mode: useGradient ? 'gradient' : 'items',
        entries,
        gradient: useGradient ? gradientSpec : null,
        layout: legendLayout,
        topY: legendTopY,
        bottomY: legendBottomY
      },
      requiredTop
    };
  }

  function ensureMetaTopMargin(p, opts, margin, plotW) {
    try {
      const layout = computeMetaLayout(p, opts, plotW);
      if (!layout || !isFinite(layout.requiredTop)) return margin;
      if (margin && typeof margin.top === 'number' && margin.top >= layout.requiredTop) return margin;
      return Object.assign({}, margin, { top: Math.max((margin && margin.top) ? margin.top : 0, layout.requiredTop) });
    } catch (e) {
      return margin;
    }
  }

  function ensureMetaRightMargin(p, opts, margin) {
    try {
      const legendSpec = normalizeLegendSpec(opts && opts.legend);
      if (!legendSpec.enabled || legendSpec.layout !== 'vertical') return margin;

      const scale = (opts && typeof opts._responsiveScale === 'number')
        ? opts._responsiveScale
        : getResponsiveScale(p, opts);
      const sidePad = Math.round(10 * scale);

      const entries = getLegendEntriesFromOptions(p, opts);
      const gradientSpec = (opts && opts._legendGradient) ? opts._legendGradient : null;
      const useGradient = !!(gradientSpec && (!entries || entries.length === 0));

      const layout = useGradient
        ? computeLegendGradientLayout(p, opts, Math.max(60, Math.round(220 * scale)), legendSpec)
        : computeSideLegendItemsLayout(p, opts, entries, legendSpec);

      if (!layout || !layout.enabled) return margin;
      const legendW = (layout.width !== undefined) ? layout.width : layout.barW;
      const neededRight = sidePad * 2 + Math.ceil(legendW || 0);
      if (!isFinite(neededRight) || neededRight <= 0) return margin;

      return Object.assign({}, margin, { right: Math.max((margin && margin.right) ? margin.right : 0, neededRight) });
    } catch (e) {
      return margin;
    }
  }

  // Axis Label and Footer Layout
  function computeAxisLabelLayout(p, opts, plotW, plotH) {
    const scale = (opts && typeof opts._responsiveScale === 'number')
      ? opts._responsiveScale
      : getResponsiveScale(p, opts);

    const axisLabelSize = (opts && opts.axisLabelSize) ? opts.axisLabelSize : Math.round(AXIS_LABEL_SIZE * scale);
    const sourceAuthorSize = (opts && opts.sourceAuthorSize)
      ? opts.sourceAuthorSize
      : (Math.round(SOURCE_AUTHOR_SIZE * scale) + 4);

    const metaPad = Math.round(10 * scale);
    const axisLineGap = Math.round(3 * scale);
    const xLabelOffsetY = Math.round(40 * scale);
    const yLabelBaseOffsetX = -Math.round(30 * scale);

    const yLabelPadX = (opts && opts.yLabelX !== undefined && isFinite(Number(opts.yLabelX))) ? Number(opts.yLabelX) : 0;
    const yLabelPadY = (opts && opts.yLabelY !== undefined && isFinite(Number(opts.yLabelY))) ? Number(opts.yLabelY) : 0;

    const yTickLabelW = (opts && opts._yTickLabelW !== undefined && isFinite(Number(opts._yTickLabelW)))
      ? Math.max(0, Number(opts._yTickLabelW))
      : 0;
    const outerPad = Math.round(10 * scale);
    const gapToPlot = (opts && opts.yLabelGapToPlot !== undefined)
      ? Math.max(0, Number(opts.yLabelGapToPlot))
      : Math.round(18 * scale);

    const gapToTicks = (opts && opts.yLabelGapToTicks !== undefined)
      ? Math.max(0, Number(opts.yLabelGapToTicks))
      : Math.round(10 * scale);

    const xLabelWrap = !(opts && opts.xLabelWrap === false);
    const yLabelWrap = !(opts && opts.yLabelWrap === false);
    const footerWrap = !(opts && opts.sourceAuthorWrap === false);
    const footerEnabled = !!(opts && opts.showSourceAuthor);

    const xLabelText = (opts && opts.xLabel !== undefined && opts.xLabel !== null) ? String(opts.xLabel) : null;
    const yLabelText = (opts && opts.yLabel !== undefined && opts.yLabel !== null) ? String(opts.yLabel) : null;

    let footerText = null;
    if (footerEnabled && opts && (opts.source || opts.author)) {
      let t = '';
      if (opts.source) t += `Source: ${opts.source}`;
      if (opts.author) {
        if (opts.source) t += '  |  ';
        t += `Chart: ${opts.author}`;
      }
      footerText = t;
    }

    let xLines = null;
    let xHeight = 0;
    let xTopOffset = 0;
    if (xLabelText) {
      p.push();
      p.textFont((opts && opts.font) ? opts.font : DEFAULT_FONT);
      p.textSize(axisLabelSize);
      p.textStyle(p.NORMAL);
      const maxW = Math.max(10, Math.round(plotW - metaPad * 2));
      xLines = xLabelWrap ? wrapTextLines(p, xLabelText, maxW) : [xLabelText];
      xHeight = xLines.length * axisLabelSize + Math.max(0, xLines.length - 1) * axisLineGap;
      p.pop();

      xTopOffset = xLabelOffsetY - axisLabelSize;
    }

    let yLines = null;
    let yHeight = 0;
    let yOffsetX = yLabelBaseOffsetX;
    if (yLabelText) {
      p.push();
      p.textFont((opts && opts.font) ? opts.font : DEFAULT_FONT);
      p.textSize(axisLabelSize);
      p.textStyle(p.NORMAL);
      const maxW = Math.max(10, Math.round(plotH - metaPad * 2));
      yLines = yLabelWrap ? wrapTextLines(p, yLabelText, maxW) : [yLabelText];
      yHeight = yLines.length * axisLabelSize + Math.max(0, yLines.length - 1) * axisLineGap;
      p.pop();

      const desiredOffset = -Math.round((yHeight / 2) + gapToPlot + gapToTicks + yTickLabelW);

      yOffsetX = Math.min(yLabelBaseOffsetX, desiredOffset);
    }

    let requiredBottom = 0;
    if (xLines) {
      requiredBottom = Math.max(requiredBottom, xTopOffset + xHeight + outerPad);
    }
    if (footerText) {

      const footerBase = (opts.xLabel || opts.yLabel) ? Math.round(50 * scale) : Math.round(30 * scale);
      let footerOffset = footerBase;
      if (xLines) footerOffset = Math.max(footerOffset, xTopOffset + xHeight + outerPad);

      p.push();
      p.textFont((opts && opts.font) ? opts.font : DEFAULT_FONT);
      p.textSize(sourceAuthorSize);
      p.textStyle(p.NORMAL);
      const footerMaxW = Math.max(10, Math.round(plotW - metaPad * 2));
      const footerLines = footerWrap ? wrapTextLines(p, footerText, footerMaxW) : [footerText];
      const footerLineGap = Math.round(3 * scale);
      const footerHeight = footerLines.length * sourceAuthorSize + Math.max(0, footerLines.length - 1) * footerLineGap;
      p.pop();

      requiredBottom = Math.max(requiredBottom, footerOffset + footerHeight + outerPad);
    }

    let requiredLeft = 0;
    if (yLines) {
      const yTranslateX = yOffsetX + yLabelPadX;
      requiredLeft = Math.max(requiredLeft, (-yTranslateX) + (yHeight / 2) + outerPad);
    }

    return {
      scale,
      axisLabelSize,
      sourceAuthorSize,
      x: {
        lines: xLines,
        height: xHeight,
        lineGap: axisLineGap,
        topOffsetFromPlotBottom: xTopOffset,
        offsetY: xLabelOffsetY
      },
      y: {
        lines: yLines,
        height: yHeight,
        lineGap: axisLineGap,
        offsetX: yOffsetX + yLabelPadX,
        baseOffsetX: yLabelBaseOffsetX
      },
      footer: {
        enabled: !!footerText,
        text: footerText,
        wrap: footerWrap
      },
      requiredBottom,
      requiredLeft
    };
  }

  function ensureMetaAxisMargins(p, opts, margin, baseW, baseH) {
    try {
      let m = Object.assign({}, margin);
      for (let i = 0; i < 2; i++) {
        const plotW = Math.max(10, baseW - m.left - m.right);
        const plotH = Math.max(10, baseH - m.top - m.bottom);
        const ax = computeAxisLabelLayout(p, opts, plotW, plotH);
        if (!ax) return m;
        if (isFinite(ax.requiredLeft) && ax.requiredLeft > 0) {
          m.left = Math.max(m.left || 0, ax.requiredLeft);
        }
        if (isFinite(ax.requiredBottom) && ax.requiredBottom > 0) {
          m.bottom = Math.max(m.bottom || 0, ax.requiredBottom);
        }
      }
      return m;
    } catch (e) {
      return margin;
    }
  }

  function drawSideLegend(p, opts, w, h) {
    const metaLayout = computeMetaLayout(p, opts, w);
    if (!metaLayout || !metaLayout.legend || !metaLayout.legend.enabled) return;
    if (metaLayout.legend.position !== 'right') return;

    const scale = metaLayout.scale;
    const sidePad = Math.round(10 * scale);
    const legendXOverride = (opts && opts.legendX !== undefined && isFinite(Number(opts.legendX))) ? Number(opts.legendX) : null;
    const legendYOverride = (opts && opts.legendY !== undefined && isFinite(Number(opts.legendY))) ? Number(opts.legendY) : null;
    const x0 = (legendXOverride !== null) ? legendXOverride : (w + sidePad);
    const y0 = (legendYOverride !== null) ? legendYOverride : 0;

    if (metaLayout.legend.mode === 'gradient') {
      const ll = metaLayout.legend.layout;
      const g = metaLayout.legend.gradient;
      if (!ll || !g) return;

      const textColor = (opts && opts.legendTextColor) ? opts.legendTextColor : TEXT_COLOR;
      const minLabel = (g.minLabel !== undefined) ? String(g.minLabel) : formatLegendNumber(g.min);
      const maxLabel = (g.maxLabel !== undefined) ? String(g.maxLabel) : formatLegendNumber(g.max);

      p.push();
      p.noStroke();
      const ctx = p.drawingContext;
      if (ctx && typeof ctx.createLinearGradient === 'function') {
        const grad = ctx.createLinearGradient(x0, 0, x0 + ll.barW, 0);
        grad.addColorStop(0, String(g.c1));
        grad.addColorStop(1, String(g.c2));
        ctx.fillStyle = grad;
        ctx.fillRect(x0, y0, ll.barW, ll.barH);
      } else {
        p.fill(String(g.c1));
        p.rect(x0, y0, ll.barW, ll.barH);
      }

      p.fill(textColor);
      p.textFont((opts && opts.font) ? opts.font : DEFAULT_FONT);
      p.textSize(ll.textSize);
      p.textStyle(p.NORMAL);
      const labelY = y0 + ll.barH + ll.gap + ll.textSize / 2;
      p.textAlign(p.LEFT, p.CENTER);
      p.text(minLabel, x0, labelY);
      p.textAlign(p.RIGHT, p.CENTER);
      p.text(maxLabel, x0 + ll.barW, labelY);
      p.pop();
      return;
    }

    const legendSpec = normalizeLegendSpec(opts && opts.legend);
    const entries = getLegendEntriesFromOptions(p, opts);
    const ll = computeSideLegendItemsLayout(p, opts, entries, legendSpec);
    if (!ll || !ll.enabled) return;

    const textColor = (opts && opts.legendTextColor) ? opts.legendTextColor : TEXT_COLOR;

    p.push();
    p.noStroke();
    p.textFont((opts && opts.font) ? opts.font : DEFAULT_FONT);
    p.textSize(ll.textSize);
    p.textStyle(p.NORMAL);
    p.textAlign(p.LEFT, p.CENTER);

    let y = y0;
    entries.forEach(entry => {
      p.fill(entry.color);
      p.rect(x0, y + (ll.itemH - ll.boxSize) / 2, ll.boxSize, ll.boxSize);
      p.fill(textColor);
      p.text(String(entry.label), x0 + ll.boxSize + ll.gap, y + ll.itemH / 2);
      y += ll.itemH + ll.rowGap;
    });

    p.pop();
  }

  function drawLegend(p, opts, w, metaLayout) {
    if (!metaLayout || !metaLayout.legend || !metaLayout.legend.enabled) return;
    const entries = metaLayout.legend.entries || [];
    const ll = metaLayout.legend.layout;
    if (!ll || !ll.rows || ll.rows.length === 0) return;

    const legendXOverride = (opts && opts.legendX !== undefined && isFinite(Number(opts.legendX))) ? Number(opts.legendX) : null;
    const legendYOverride = (opts && opts.legendY !== undefined && isFinite(Number(opts.legendY))) ? Number(opts.legendY) : null;

    const align = (opts && opts.textAlign) ? opts.textAlign : p.LEFT;
    const textColor = (opts && opts.legendTextColor) ? opts.legendTextColor : TEXT_COLOR;

    p.push();
    p.noStroke();
    p.textFont((opts && opts.font) ? opts.font : DEFAULT_FONT);
    p.textSize(ll.textSize);
    p.textStyle(p.NORMAL);
    p.fill(textColor);
    p.textAlign(p.LEFT, p.CENTER);

    const startY = (legendYOverride !== null) ? legendYOverride : metaLayout.legend.topY;
    let y = startY;

    ll.rows.forEach(rowEntries => {
      // Measure row width for alignment.
      let rowW = 0;
      p.textSize(ll.textSize);
      rowEntries.forEach((entry) => {
        const labelW = measureText(p, entry.label);
        rowW += ll.boxSize + ll.gap + labelW + ll.itemGap;
      });
      if (rowW > 0) rowW -= ll.itemGap; // last item doesn't need trailing gap

      let x = 0;
      if (align === p.CENTER) x = (w - rowW) / 2;
      else if (align === p.RIGHT) x = (w - rowW);
      x = Math.max(0, x);
      if (legendXOverride !== null) x = legendXOverride;

      rowEntries.forEach((entry, i) => {
        const label = String(entry.label);
        const labelW = measureText(p, label);

        p.noStroke();
        p.fill(entry.color);
        p.rect(x, y + (ll.itemH - ll.boxSize) / 2, ll.boxSize, ll.boxSize);

        p.noStroke();
        p.fill(textColor);
        p.text(label, x + ll.boxSize + ll.gap, y + ll.itemH / 2);

        x += ll.boxSize + ll.gap + labelW + ll.itemGap;
      });

      y += ll.itemH + ll.rowGap;
    });

    p.pop();
  }

  function drawLegendGradient(p, opts, w, metaLayout) {
    if (!metaLayout || !metaLayout.legend || !metaLayout.legend.enabled) return;
    if (metaLayout.legend.mode !== 'gradient') return;
    const ll = metaLayout.legend.layout;
    const g = metaLayout.legend.gradient;
    if (!ll || !g) return;

    const align = (opts && opts.textAlign) ? opts.textAlign : p.LEFT;
    const textColor = (opts && opts.legendTextColor) ? opts.legendTextColor : TEXT_COLOR;
    const minLabel = (g.minLabel !== undefined) ? String(g.minLabel) : formatLegendNumber(g.min);
    const maxLabel = (g.maxLabel !== undefined) ? String(g.maxLabel) : formatLegendNumber(g.max);
    const c1 = g.c1;
    const c2 = g.c2;

    const legendXOverride = (opts && opts.legendX !== undefined && isFinite(Number(opts.legendX))) ? Number(opts.legendX) : null;
    const legendYOverride = (opts && opts.legendY !== undefined && isFinite(Number(opts.legendY))) ? Number(opts.legendY) : null;
    const startY = (legendYOverride !== null) ? legendYOverride : metaLayout.legend.topY;

    let x = 0;
    if (align === p.CENTER) x = (w - ll.barW) / 2;
    else if (align === p.RIGHT) x = (w - ll.barW);
    x = Math.max(0, x);
    if (legendXOverride !== null) x = legendXOverride;

    p.push();
    p.noStroke();

    // Gradient bar
    const ctx = p.drawingContext;
    if (ctx && typeof ctx.createLinearGradient === 'function') {
      const grad = ctx.createLinearGradient(x, 0, x + ll.barW, 0);
      grad.addColorStop(0, String(c1));
      grad.addColorStop(1, String(c2));
      ctx.fillStyle = grad;
      ctx.fillRect(x, startY, ll.barW, ll.barH);
    } else {
      // Solid fill if gradient unavailable
      p.fill(String(c1));
      p.rect(x, startY, ll.barW, ll.barH);
    }

    // Min/Max labels
    p.fill(textColor);
    p.textFont((opts && opts.font) ? opts.font : DEFAULT_FONT);
    p.textSize(ll.textSize);
    p.textStyle(p.NORMAL);
    const labelY = startY + ll.barH + ll.gap + ll.textSize / 2;
    p.textAlign(p.LEFT, p.CENTER);
    p.text(minLabel, x, labelY);
    p.textAlign(p.RIGHT, p.CENTER);
    p.text(maxLabel, x + ll.barW, labelY);

    p.pop();
  }

  function drawMeta(p, opts, w, h) {
      p.push();
      p.noStroke();
      p.textFont(opts.font || DEFAULT_FONT);

      const metaLayout = computeMetaLayout(p, opts, w);
      const scale = metaLayout.scale;
      let titleSize = metaLayout.titleSize;
      let subtitleSize = metaLayout.subtitleSize;
      const axisLabelSize = (opts && opts.axisLabelSize) ? opts.axisLabelSize : Math.round(AXIS_LABEL_SIZE * scale);
      const sourceAuthorSize = (opts && opts.sourceAuthorSize) ? opts.sourceAuthorSize : Math.round(SOURCE_AUTHOR_SIZE * scale);

      const titleTopY = (metaLayout.title && metaLayout.title.topY !== null) ? metaLayout.title.topY : null;
      const subtitleTopY = (metaLayout.subtitle && metaLayout.subtitle.topY !== null) ? metaLayout.subtitle.topY : null;
      const axisLayout = computeAxisLabelLayout(p, opts, w, h);
      const yLabelOffsetX = (axisLayout && axisLayout.y && typeof axisLayout.y.offsetX === 'number')
        ? axisLayout.y.offsetX
        : -Math.round(30 * scale);
      const xLabelOffsetY = (axisLayout && axisLayout.x && typeof axisLayout.x.offsetY === 'number')
        ? axisLayout.x.offsetY
        : Math.round(40 * scale);

      p.drawingContext.font = 'bold ' + titleSize + 'px Roboto, sans-serif';

      const align = opts.textAlign || p.LEFT;
      let xPos = 0;
      if (align === p.CENTER) xPos = w/2;
      if (align === p.RIGHT) xPos = w;

      const titleXOverride = (opts && opts.titleX !== undefined && isFinite(Number(opts.titleX))) ? Number(opts.titleX) : null;
      const titleYOverride = (opts && opts.titleY !== undefined && isFinite(Number(opts.titleY))) ? Number(opts.titleY) : null;
      const subtitleXOverride = (opts && opts.subtitleX !== undefined && isFinite(Number(opts.subtitleX))) ? Number(opts.subtitleX) : null;
      const subtitleYOverride = (opts && opts.subtitleY !== undefined && isFinite(Number(opts.subtitleY))) ? Number(opts.subtitleY) : null;
      const xLabelXOverride = (opts && opts.xLabelX !== undefined && isFinite(Number(opts.xLabelX))) ? Number(opts.xLabelX) : null;
      const xLabelYOverride = (opts && opts.xLabelY !== undefined && isFinite(Number(opts.xLabelY))) ? Number(opts.xLabelY) : null;
      const yLabelPadY = (opts && opts.yLabelY !== undefined && isFinite(Number(opts.yLabelY))) ? Number(opts.yLabelY) : 0;
      const sourceAuthorXOverride = (opts && opts.sourceAuthorX !== undefined && isFinite(Number(opts.sourceAuthorX))) ? Number(opts.sourceAuthorX) : null;
      const sourceAuthorYOverride = (opts && opts.sourceAuthorY !== undefined && isFinite(Number(opts.sourceAuthorY))) ? Number(opts.sourceAuthorY) : null;

      // Title
      if (opts.title && metaLayout.title && Array.isArray(metaLayout.title.lines) && titleTopY !== null) {
          p.fill(TEXT_COLOR);
          p.textSize(titleSize);
          p.textStyle(p.BOLD);
          p.drawingContext.fontWeight = 'bold';
          p.textAlign(align, p.TOP);
          p.textLeading(titleSize + (metaLayout.title.lineGap || 0));
          const tx = (titleXOverride !== null) ? titleXOverride : xPos;
          const ty = (titleYOverride !== null) ? titleYOverride : titleTopY;
          p.text(metaLayout.title.lines.join('\n'), tx, ty);
      }

      // Subtitle
      if (opts.subtitle && metaLayout.subtitle && Array.isArray(metaLayout.subtitle.lines) && subtitleTopY !== null) {
          p.drawingContext.font = (opts.subtitleBold ? 'bold' : 'normal') + ' ' + subtitleSize + 'px Roboto, sans-serif';
          p.fill(SUBTEXT_COLOR);
          p.textSize(subtitleSize);
          p.textStyle(opts.subtitleBold ? p.BOLD : p.NORMAL);
          p.textAlign(align, p.TOP);
          p.textLeading(subtitleSize + (metaLayout.subtitle.lineGap || 0));
          const sx = (subtitleXOverride !== null) ? subtitleXOverride : xPos;
          const sy = (subtitleYOverride !== null) ? subtitleYOverride : subtitleTopY;
          p.text(metaLayout.subtitle.lines.join('\n'), sx, sy);
      }

      // Legend
      if (metaLayout && metaLayout.legend && metaLayout.legend.enabled) {
        if (metaLayout.legend.position !== 'right') {
          if (metaLayout.legend.mode === 'gradient') drawLegendGradient(p, opts, w, metaLayout);
          else drawLegend(p, opts, w, metaLayout);
        }
      }
      if (axisLayout && axisLayout.footer && axisLayout.footer.enabled && axisLayout.footer.text) {
          p.fill(SUBTEXT_COLOR); p.textSize(sourceAuthorSize);
          p.textAlign(p.LEFT, p.TOP);
          const footerBase = (opts.xLabel || opts.yLabel) ? Math.round(50 * scale) : Math.round(30 * scale);
          let footerY = h + footerBase;
          if (axisLayout.x && Array.isArray(axisLayout.x.lines) && axisLayout.x.lines.length) {
            const xTop = h + axisLayout.x.topOffsetFromPlotBottom;
            const xBottom = xTop + axisLayout.x.height;
            footerY = Math.max(footerY, xBottom + Math.round(10 * scale));
          }

          p.textLeading(sourceAuthorSize + Math.round(3 * scale));
          const footerLines = (axisLayout.footer.wrap === false)
            ? [String(axisLayout.footer.text)]
            : wrapTextLines(p, axisLayout.footer.text, Math.max(10, Math.round(w - Math.round(10 * scale) * 2)));
          const fx = (sourceAuthorXOverride !== null) ? sourceAuthorXOverride : 0;
          const fy = (sourceAuthorYOverride !== null) ? sourceAuthorYOverride : footerY;
          p.text(footerLines.join('\n'), fx, fy);
      }

        // X-axis label
        if (opts.xLabel) {
          p.drawingContext.font = 'normal ' + axisLabelSize + 'px Roboto, sans-serif';
          p.fill(TEXT_COLOR); p.textSize(axisLabelSize); p.textStyle(p.NORMAL);
          const xLines = (axisLayout && axisLayout.x && Array.isArray(axisLayout.x.lines)) ? axisLayout.x.lines : [String(opts.xLabel)];
          const xTopAuto = (axisLayout && axisLayout.x)
            ? (h + axisLayout.x.topOffsetFromPlotBottom)
            : (h + (xLabelOffsetY - axisLabelSize));
          const xTop = (xLabelYOverride !== null) ? xLabelYOverride : xTopAuto;
          p.textAlign(p.CENTER, p.TOP);
          p.textLeading(axisLabelSize + ((axisLayout && axisLayout.x && axisLayout.x.lineGap) ? axisLayout.x.lineGap : 0));
          const xx = (xLabelXOverride !== null) ? xLabelXOverride : (w/2);
          p.text(xLines.join('\n'), xx, xTop);
        }

        // Y-axis label
        if (opts.yLabel) {
          p.drawingContext.font = 'normal ' + axisLabelSize + 'px Roboto, sans-serif';
          p.fill(TEXT_COLOR); p.textSize(axisLabelSize); p.textStyle(p.NORMAL);
          const yLines = (axisLayout && axisLayout.y && Array.isArray(axisLayout.y.lines)) ? axisLayout.y.lines : [String(opts.yLabel)];
          p.push();
          // yLabelOffsetX already includes yLabelX padding via computeAxisLabelLayout().
          const yx = yLabelOffsetX;
          const yy = (h/2) + yLabelPadY;
          p.translate(yx, yy);
          p.rotate(-p.HALF_PI);
          p.textAlign(p.CENTER, p.CENTER);
          p.textLeading(axisLabelSize + ((axisLayout && axisLayout.y && axisLayout.y.lineGap) ? axisLayout.y.lineGap : 0));
          p.text(yLines.join('\n'), 0, 0);
          p.pop();
        }

      p.pop();
  }

  // Hover detection
  function rectHover(p, gx, gy, w, h, content, options) {
    let pointerX = p.mouseX, pointerY = p.mouseY;

    if (Array.isArray(p.touches) && p.touches.length > 0) {
      pointerX = p.touches[0].x;
      pointerY = p.touches[0].y;
    }

    if (pointerX >= gx && pointerX <= gx + w && pointerY >= gy && pointerY <= gy + h) {
      p.chart.hoverState = {
        active: true,
        x: pointerX,
        y: pointerY,
        content: content,
        tooltipScale: options && options.tooltipScale,
        tooltipTextSize: options && options.tooltipTextSize,
        tooltipFont: options && options.tooltipFont
      };
      p.cursor(p.HAND);
      return true;
    }
    return false;
  }

  // Draw deferred tooltip
  function drawTooltip(p) {
    const h = p.chart.hoverState;

    if (!h.active || !h.content || h.content.length === 0) {
      if (!p.mouseIsPressed) p.cursor(p.ARROW);
      p.chart.hoverState.active = false;
      return;
    }

    p.push();

    if (typeof p.resetMatrix === 'function') p.resetMatrix();

    p.noStroke();
    p.fill(0, 0, 0, 220);
    p.rectMode(p.CORNER);

    const metrics = getCanvasDisplayMetrics(p);
    const displayW = metrics.width || p.width;
    const displayH = metrics.height || p.height;
    const minDim = Math.max(1, Math.min(displayW, displayH));
    const BASE_MIN_DIM = 400;
    const responsiveScale = clampNumber(minDim / BASE_MIN_DIM, 0.6, 1);

    let effectiveScale = responsiveScale;
    const scaleMult = (h.tooltipScale !== undefined) ? Number(h.tooltipScale) : 1;
    if (Number.isFinite(scaleMult) && scaleMult !== 1) {
      effectiveScale = clampNumber(effectiveScale * scaleMult, 0.4, 2);
    }
    if (h.tooltipTextSize !== undefined) {
      const forcedPx = clampNumber(Number(h.tooltipTextSize), 6, 32);
      if (Number.isFinite(forcedPx)) {
        effectiveScale = forcedPx / TOOLTIP_TEXT_SIZE;
      }
    }

    const tipTextSize = Math.round(TOOLTIP_TEXT_SIZE * effectiveScale);
    const tipPad = Math.round(TOOLTIP_PADDING * effectiveScale);
    const tipLineH = Math.round(TOOLTIP_LINE_HEIGHT * effectiveScale);
    const tipOffset = Math.round(TOOLTIP_OFFSET * effectiveScale);
    const tipRadius = Math.round(TOOLTIP_BORDER_RADIUS * effectiveScale);

    p.textSize(tipTextSize);
    p.textFont(h.tooltipFont || DEFAULT_FONT);

    let maxWidth = 0;
    h.content.forEach(l => {
      let w = measureText(p, l);
      if (w > maxWidth) maxWidth = w;
    });
    let boxW = maxWidth + (tipPad * 2);
    let boxH = h.content.length * tipLineH + tipPad;

    let tx = h.x + tipOffset;
    let ty = h.y + tipOffset;

    if (tx + boxW > p.width) tx = h.x - boxW - tipOffset;
    if (ty + boxH > p.height) ty = h.y - boxH - tipOffset;
    tx = Math.max(0, tx);
    ty = Math.max(0, ty);

    p.translate(tx, ty);
    p.rect(0, 0, boxW, boxH, tipRadius);
    p.fill(255);
    p.textAlign(p.LEFT, p.TOP);
    h.content.forEach((l, i) => p.text(l, tipPad, Math.round(8 * effectiveScale) + i * tipLineH));
    p.pop();

    p.chart.hoverState.active = false;
  }

  function truncate(p, str, w) {
    str = String(str);
    if (measureText(p, str) <= w) return str;
    let len = str.length;
    while (measureText(p, str + "...") > w && len > 0) {
      str = str.substring(0, len - 1); len--;
    }
    return str + "...";
  }

 /* 3. BAR CHART */

  /**
   * Creates a bar chart
   * NaN Handling: Bars with NaN values are SKIPPED (not rendered).
   * A warning is logged showing which rows/values are missing.
   * Set nanPolicy: 'silent' to suppress warnings, or 'strict' to throw an error.
   */
  fn.bar = function(data, options = {}) {
    const p = this;
    ensureCanvasMatchesDisplay(p, options);
    let df = (data instanceof p.chart.DataFrame) ? data : new p.chart.DataFrame(data);

    const orient = options.orientation || 'horizontal';
    const stacked = options.mode === 'stacked';
    const labelCol = options.x || options.category || df.columns[0];
    let valCols = options.y || options.values || [df.columns[1]];
    if (!Array.isArray(valCols)) valCols = [valCols];

    // Validate data
    const validation = validateData(df, valCols, options, 'bar');

    const labelPos = options.labelPos || 'auto';
    const labelBold = options.labelBold === true;
    const labels = df.col(labelCol);
    const rows = df.rows;

    // Precompute value axis ticks
    let maxVal = 0;
    rows.forEach(row => {
      let sum = stacked
        ? valCols.reduce((acc, c) => acc + (Number(row[c]) || 0), 0)
        : Math.max(...valCols.map(c => Number(row[c]) || 0));
      if (sum > maxVal) maxVal = sum;
    });
    if (maxVal === 0) maxVal = 1;

    const targetTicks = (options.numTicks !== undefined)
      ? options.numTicks
      : ((options.tickCount !== undefined) ? options.tickCount : NUM_TICKS);
    const valueAxis = niceAxisBounds(0, maxVal, targetTicks);

    function formatBarTick(val) {
      const num = Number(val);
      if (!isFinite(num)) return String(val);
      // Show integers as integers, otherwise keep a minimal number of decimals
      if (Math.abs(num - Math.round(num)) < 1e-9) return String(Math.round(num));
      const absVal = Math.abs(num);
      if (absVal >= 1000) return (num / 1000).toFixed(1) + 'k';
      let decimals = 0;
      let t = absVal;
      while (t !== 0 && t < 1 && decimals < 6) { t *= 10; decimals++; }
      return num.toFixed(Math.min(Math.max(decimals, 1), 3));
    }

    // Calculate label space dynamically for horizontal bars
    let labelSpace = options.labelSpace;
    if (!labelSpace && orient === 'horizontal') {
      const labelMeasureSize = scalePx(p, options, 12, 8, 16);
      p.textSize(labelMeasureSize);
      p.textFont(options.font || DEFAULT_FONT);
      let maxLabelWidth = 0;
      labels.forEach(lbl => {
        let lblWidth = measureText(p, lbl);
        if (lblWidth > maxLabelWidth) maxLabelWidth = lblWidth;
      });
      labelSpace = maxLabelWidth + scalePx(p, options, 20, 10, 40);
    } else if (!labelSpace) {
      labelSpace = scalePx(p, options, 70, 40, 120);
    }

    if (options.xLabel === undefined) options.xLabel = labelCol;
    if (options.yLabel === undefined) options.yLabel = Array.isArray(valCols) ? valCols.join(', ') : valCols;
    if (options.title === undefined) options.title = df.columns.join(' vs. ');
    const leftMargin = options.yLabel ? scalePx(p, options, 50, 0, 120) : 0;
    const baseMargin = { top: DEFAULT_MARGIN.top, right: DEFAULT_MARGIN.right, bottom: DEFAULT_MARGIN.bottom, left: leftMargin };

    // Legend entries
    const legendEntries = (Array.isArray(valCols) && valCols.length > 1)
      ? valCols.slice()
      : labels.map(v => String(v));
    const legendColors = legendEntries.map((_, i) => getColor(p, i, options.palette));

    const _responsiveScale = getResponsiveScale(p, options);
    const metaOpts = Object.assign({}, options, { _responsiveScale, _legendEntries: legendEntries, _legendColors: legendColors });

    // Measure the widest y-axis tick label
    if (orient === 'vertical') {
      const tickLabelSizeForMeasure = scalePx(p, options, TICK_LABEL_SIZE, 8, 14);
      p.push();
      p.textSize(tickLabelSizeForMeasure);
      p.textFont(options.font || DEFAULT_FONT);
      p.textStyle(p.NORMAL);
      let maxTickW = 0;
      valueAxis.ticks.forEach(tickVal => {
        const w0 = measureText(p, formatBarTick(tickVal));
        if (w0 > maxTickW) maxTickW = w0;
      });
      p.pop();
      metaOpts._yTickLabelW = maxTickW;
    }

    let margin0 = options.margin || getResponsiveMargin(p, options, baseMargin);
    margin0 = withMobileRightPadding(p, options, margin0);

    // Reserve space for right-side vertical legends
    margin0 = ensureMetaRightMargin(p, metaOpts, margin0);
    const canvasW = p.width;
    const canvasH = p.height;
    const baseW = (options.width !== undefined) ? Math.min(options.width, canvasW) : canvasW;
    const baseH = (options.height !== undefined) ? Math.min(options.height, canvasH) : canvasH;

    // Expand top margin if legend/title/subtitle need more space
    margin0 = ensureMetaTopMargin(p, metaOpts, margin0, baseW - margin0.left - margin0.right);

    // Expand left/bottom margins if x/y axis labels (or footer) need more space
    margin0 = ensureMetaAxisMargins(p, metaOpts, margin0, baseW, baseH);

    // Axis margins can change plot width; re-run top layout once
    margin0 = ensureMetaTopMargin(p, metaOpts, margin0, baseW - margin0.left - margin0.right);

    const margin = margin0;
    const w = baseW - margin.left - margin.right;
    const h = baseH - margin.top - margin.bottom;

    const tickLen = scalePx(p, options, TICK_LENGTH, 3, 10);
    const tickLabelSize = scalePx(p, options, TICK_LABEL_SIZE, 8, 14);
    const axisLabelSize = scalePx(p, options, AXIS_LABEL_SIZE, 9, 16);
    const barLabelSize = scalePx(p, options, BAR_LABEL_SIZE, 8, 14);
    const tickTextOffset = scalePx(p, options, 8, 6, 12);

    p.push();
    p.translate(margin.left, margin.top);
    drawMeta(p, metaOpts, w, h);

    // Right-side vertical legend
    drawSideLegend(p, metaOpts, w, h);

    if (options.background !== undefined && !isTransparentBackground(options.background)) {
      p.noStroke();
      p.fill(options.background);
      p.rect(0, 0, w, h);
    }

    const showGrid = (options.showGrid === true) || (options.grid === true);
    const gridColor = options.gridColor || options.gridColour || TICK_COLOR;
    const gridWeight = (options.gridWeight !== undefined) ? options.gridWeight : TICK_WEIGHT;

    if (orient === 'horizontal') {
        const rowH = h / labels.length;
        const barH = stacked ? (rowH * BAR_GAP_RATIO) : (rowH * BAR_GAP_RATIO / valCols.length);

        // Reserve space for labels on the left
        const barStartX = labelSpace;
        const barWidth = w - labelSpace;

        if (showGrid) {
          p.push();
          p.stroke(gridColor);
          p.strokeWeight(gridWeight);
          valueAxis.ticks.forEach(tickVal => {
            let xVal = barStartX + p.map(tickVal, valueAxis.min, valueAxis.max, 0, barWidth);
            p.line(xVal, 0, xVal, h);
          });
          p.pop();
        }

        p.stroke(AXIS_COLOR); p.strokeWeight(AXIS_WEIGHT); p.line(barStartX, 0, barStartX, h);
        p.stroke(AXIS_COLOR); p.strokeWeight(AXIS_WEIGHT); p.line(barStartX, h, w, h);
        p.stroke(TICK_COLOR); p.strokeWeight(TICK_WEIGHT);
        valueAxis.ticks.forEach(tickVal => {
          let xVal = barStartX + p.map(tickVal, valueAxis.min, valueAxis.max, 0, barWidth);
          p.line(xVal, h, xVal, h + tickLen);
          p.noStroke(); p.fill(SUBTEXT_COLOR); p.textSize(tickLabelSize); p.textAlign(p.CENTER, p.TOP);
          p.text(formatBarTick(tickVal), xVal, h + tickTextOffset);
          p.stroke(TICK_COLOR);
        });

        labels.forEach((lbl, i) => {
            let yBase = i * rowH + (rowH * 0.1);
            let xStack = 0;
            valCols.forEach((col, j) => {
                let rawVal = rows[i][col];
                // Skip if NaN
                if (rawVal === null || rawVal === '' || rawVal === undefined ||
                    (typeof rawVal === 'number' && isNaN(rawVal)) ||
                    (typeof rawVal === 'string' && isNaN(Number(rawVal)))) {
                    return; // Skip this bar
                }

                let val = Number(rawVal);
                let rectW = p.map(val, valueAxis.min, valueAxis.max, 0, barWidth);
                let rectX = barStartX + (stacked ? xStack : 0);
                if (stacked) xStack += rectW;
                let by = stacked ? yBase : yBase + (j * barH);

                let colorIndex = valCols.length > 1 ? j : i;
                let c = getColor(p, colorIndex, options.palette);

                let colColor = p.color(c);
                p.noStroke();
                p.fill(colColor);

                const gx = margin.left + rectX;
                const gy = margin.top + by;

                if (rectHover(p, gx, gy, rectW, barH, [`${lbl}`, `${col}: ${val}`], options)) {
                  let hoverColor = p.color(c);
                  hoverColor.setAlpha(200);
                  p.fill(hoverColor);
                }
                p.rect(rectX, by, rectW, barH);

                if (labelPos !== 'none') {
                  p.textSize(barLabelSize);
                  p.textAlign(p.LEFT, p.CENTER);
                  p.textStyle(labelBold ? p.BOLD : p.NORMAL);
                  let txt = String(val);
                  let tw = measureText(p, txt);
                  // Use label color protection for all label positions
                  if (labelPos === 'inside') {
                    p.fill(getAutoLabelColor(p, c));
                    p.text(txt, rectX + rectW - tw - 5, by + barH/2);
                  } else if (labelPos === 'outside') {
                    p.fill(getAutoLabelColor(p, isTransparentBackground(options.background) ? 255 : (options.background || 255)));
                    p.text(txt, rectX + rectW + 5, by + barH/2);
                  } else if (labelPos === 'bottom') {
                    p.fill(getAutoLabelColor(p, isTransparentBackground(options.background) ? 255 : (options.background || 255)));
                    p.text(txt, rectX + 5, by + barH/2);
                  } else if (labelPos === 'auto') {
                    if (rectW > tw + 10) {
                      p.fill(getAutoLabelColor(p, c));
                      p.text(txt, rectX + rectW - tw - 5, by + barH/2);
                    } else {
                      p.fill(getAutoLabelColor(p, isTransparentBackground(options.background) ? 255 : (options.background || 255)));
                      p.text(txt, rectX + rectW + 5, by + barH/2);
                    }
                  }
                }
            });
            p.fill(TEXT_COLOR); p.textAlign(p.RIGHT, p.CENTER); p.textSize(axisLabelSize); p.textStyle(p.NORMAL);
            p.text(truncate(p, lbl, labelSpace - 10), barStartX - 10, i * rowH + rowH/2);
        });

          // Draw axis lines over the data
          p.stroke(AXIS_COLOR); p.strokeWeight(AXIS_WEIGHT);
          p.line(barStartX, 0, barStartX, h);
          p.line(barStartX, h, w, h);
    } else {
        const colW = w / labels.length;
        const barW = stacked ? (colW * BAR_GAP_RATIO) : (colW * BAR_GAP_RATIO / valCols.length);

        if (showGrid) {
          p.push();
          p.stroke(gridColor);
          p.strokeWeight(gridWeight);
          valueAxis.ticks.forEach(tickVal => {
            let yVal = p.map(tickVal, valueAxis.min, valueAxis.max, h, 0);
            p.line(0, yVal, w, yVal);
          });
          p.pop();
        }

        // X-axis
        p.stroke(AXIS_COLOR); p.strokeWeight(AXIS_WEIGHT); p.line(0, h, w, h);
        // Y-axis
        p.stroke(AXIS_COLOR); p.strokeWeight(AXIS_WEIGHT); p.line(0, 0, 0, h);
        p.stroke(TICK_COLOR); p.strokeWeight(TICK_WEIGHT);
        valueAxis.ticks.forEach(tickVal => {
          let yVal = p.map(tickVal, valueAxis.min, valueAxis.max, h, 0);
          p.line(-tickLen, yVal, 0, yVal);
          p.noStroke(); p.fill(SUBTEXT_COLOR); p.textSize(tickLabelSize); p.textAlign(p.RIGHT, p.CENTER);
          p.text(formatBarTick(tickVal), -8, yVal);
          p.stroke(TICK_COLOR);
        });
        labels.forEach((lbl, i) => {
            let xBase = i * colW + (colW * 0.1);
            let yStack = h;
            valCols.forEach((col, j) => {
                let rawVal = rows[i][col];
                // Skip if NaN/null/empty
                if (rawVal === null || rawVal === '' || rawVal === undefined ||
                    (typeof rawVal === 'number' && isNaN(rawVal)) ||
                    (typeof rawVal === 'string' && isNaN(Number(rawVal)))) {
                    return; // Skip this bar
                }

                let val = Number(rawVal);
                let rectH = p.map(val, valueAxis.min, valueAxis.max, 0, h);
                let rectY = stacked ? (yStack - rectH) : (h - rectH);
                if (stacked) yStack -= rectH;
                let bx = stacked ? xBase : xBase + (j * barW);

                let colorIndex = valCols.length > 1 ? j : i;
                let c = getColor(p, colorIndex, options.palette);

                let colColor = p.color(c);
                p.noStroke();
                p.fill(colColor);

                const gx = margin.left + bx;
                const gy = margin.top + rectY;

                if (rectHover(p, gx, gy, barW, rectH, [`${lbl}`, `${col}: ${val}`], options)) {
                  let hoverColor = p.color(c);
                  hoverColor.setAlpha(200);
                  p.fill(hoverColor);
                }

                p.rect(bx, rectY, barW, rectH);

                if (labelPos !== 'none') {
                  p.textSize(barLabelSize);
                  p.textAlign(p.CENTER, p.BOTTOM);
                  p.textStyle(labelBold ? p.BOLD : p.NORMAL);
                  let txt = String(val);
                  // Use label color protection for all label positions
                  if (labelPos === 'inside') {
                    p.fill(getAutoLabelColor(p, c));
                    p.text(txt, bx + barW/2, rectY + rectH - 5);
                  } else if (labelPos === 'outside') {
                    p.fill(getAutoLabelColor(p, isTransparentBackground(options.background) ? 255 : (options.background || 255)));
                    p.text(txt, bx + barW/2, rectY - 2);
                  } else if (labelPos === 'bottom') {
                    p.fill(getAutoLabelColor(p, isTransparentBackground(options.background) ? 255 : (options.background || 255)));
                    p.text(txt, bx + barW/2, rectY + rectH + 2);
                  } else if (labelPos === 'auto') {
                    if (rectH > 20) {
                      p.fill(getAutoLabelColor(p, c));
                      p.text(txt, bx + barW/2, rectY + rectH - 5);
                    } else {
                      p.fill(getAutoLabelColor(p, isTransparentBackground(options.background) ? 255 : (options.background || 255)));
                      p.text(txt, bx + barW/2, rectY - 2);
                    }
                  }
                }
            });
            let centerX = i * colW + colW/2;
            p.stroke(TICK_COLOR); p.strokeWeight(TICK_WEIGHT);
            p.line(centerX, h, centerX, h + tickLen);
            p.noStroke();
            p.fill(TEXT_COLOR); p.textAlign(p.CENTER, p.TOP); p.textSize(axisLabelSize); p.textStyle(p.NORMAL);
            p.text(truncate(p, lbl, colW), centerX, h + scalePx(p, options, 10, 8, 14));
        });

          // Draw axis lines over the data
          p.stroke(AXIS_COLOR); p.strokeWeight(AXIS_WEIGHT);
          p.line(0, h, w, h);
          p.line(0, 0, 0, h);
    }
    p.pop();
  };

  /* 4. PIE CHART (Donut embedded) */

  /**
   * Creates a pie/donut chart
   * NaN Handling: Pie charts are STRICT by default - will display error message if NaN values exist.
   * This prevents misleading visualizations where percentages don't add up to 100%.
   * Set nanPolicy: 'warn' to filter out NaN values and render remaining data (with warning).
   * Set nanPolicy: 'silent' to filter out NaN values silently.
   */
  fn.pie = function(data, options = {}) {
    const p = this;
    ensureCanvasMatchesDisplay(p, options);
    let df = (data instanceof p.chart.DataFrame) ? data : new p.chart.DataFrame(data);

    const valCol = options.value || df.columns[1];
    const lblCol = options.label || df.columns[0];

    // Validate data
    const pieOptions = Object.assign({}, options);
    if (pieOptions.nanPolicy === undefined) {
        pieOptions.nanPolicy = 'strict';
    }

    // Data Processing
    const allValues = df.col(valCol).map(Number);
    const allLabels = df.col(lblCol);

    // Check for NaN values
    const nanIndices = [];
    allValues.forEach((v, i) => {
        if (isNaN(v)) nanIndices.push(i);
    });

    if (nanIndices.length > 0) {
        const policy = pieOptions.nanPolicy;

        if (policy === 'strict') {
            // Display error message on canvas instead of rendering
            p.push();
            p.fill(255, 240, 240);
            p.stroke(180, 0, 0);
            p.strokeWeight(2);
            p.rect(0, 0, p.width, p.height);

            p.fill(180, 0, 0);
            p.noStroke();
            p.textAlign(p.CENTER, p.CENTER);
            p.textSize(scalePx(p, options, 16, 11, 18));
            p.text('Pie Chart Error: NaN Values Detected', p.width/2, p.height/2 - 40);

            p.textSize(scalePx(p, options, 12, 10, 14));
            p.fill(100, 0, 0);
            p.text(`${nanIndices.length} of ${allValues.length} values in '${valCol}' are NaN/null.`, p.width/2, p.height/2);
            p.text(`Pie charts cannot render with missing values.`, p.width/2, p.height/2 + 20);
            p.text(`Set nanPolicy: 'warn' or 'silent' to filter out NaN values.`, p.width/2, p.height/2 + 40);
            p.pop();

            console.error(
                `[p5.chart.pie] Cannot render pie chart: ${nanIndices.length} NaN values in column '${valCol}'.`,
                `\n  Affected rows: ${nanIndices.join(', ')}`,
                `\n  Set nanPolicy: 'warn' or 'silent' in options to filter out NaN values automatically.`
            );
            return; // Don't render the chart
        } else if (policy === 'warn') {
            console.warn(
                `[p5.chart.pie] Data Quality Warning: ${nanIndices.length} of ${allValues.length} values are NaN/null.`,
                `\n  Column: ${valCol}`,
                `\n  Affected rows: ${nanIndices.join(', ')}`,
                `\n  These values will be filtered out. Percentages based on ${allValues.length - nanIndices.length} valid values.`
            );
        }
        // 'silent' mode: no output
    }

    // Filter out NaN values
    const values = [];
    const labels = [];
    allValues.forEach((v, i) => {
        if (!isNaN(v)) {
            values.push(v);
            labels.push(allLabels[i]);
        }
    });

    if (values.length === 0) {
        p.push();
        p.fill(255, 240, 240);
        p.rect(0, 0, p.width, p.height);
        p.fill(180, 0, 0);
        p.textAlign(p.CENTER, p.CENTER);
        p.text('No valid data to display', p.width/2, p.height/2);
        p.pop();
        return;
    }

    const total = values.reduce((a,b) => a+b, 0);

    // Layout
    options.textAlign = options.textAlign || p.LEFT;

    const baseMargin = { top: DEFAULT_MARGIN.top, right: DEFAULT_MARGIN.right, bottom: 40, left: DEFAULT_MARGIN.right };

    // Legend entries
    const legendEntries = labels.slice();
    const legendColors = legendEntries.map((_, i) => getColor(p, i, options.palette));

    const _responsiveScale = getResponsiveScale(p, options);
    const metaOpts = Object.assign({}, options, { _responsiveScale, _legendEntries: legendEntries, _legendColors: legendColors });

    let margin0 = options.margin || getResponsiveMargin(p, options, baseMargin);
    margin0 = withMobileRightPadding(p, options, margin0);

    // Reserve space for right-side vertical legends
    margin0 = ensureMetaRightMargin(p, metaOpts, margin0);
    const canvasW = p.width;
    const canvasH = p.height;
    const baseW = (options.width !== undefined) ? Math.min(options.width, canvasW) : canvasW;
    const baseH = (options.height !== undefined) ? Math.min(options.height, canvasH) : canvasH;

    // Expand top margin if legend/title/subtitle need more space
    margin0 = ensureMetaTopMargin(p, metaOpts, margin0, baseW - margin0.left - margin0.right);

    // Expand left/bottom margins if x/y axis labels (or footer) need more space
    margin0 = ensureMetaAxisMargins(p, metaOpts, margin0, baseW, baseH);

    // Axis margins can change plot width; re-run top layout once
    margin0 = ensureMetaTopMargin(p, metaOpts, margin0, baseW - margin0.left - margin0.right);

    const margin = margin0;
    const w = baseW - margin.left - margin.right;
    const h = baseH - margin.top - margin.bottom;
    const cx = w/2;
    const cy = h/2;
    const r = options.radius || Math.min(w, h) / 2.5;

    const pieLabelSize = scalePx(p, options, PIE_LABEL_SIZE, 9, 14);
    const pieOutsideOffset = isMobileLayout(p, options)
      ? scalePx(p, options, 18, 12, 26)
      : scalePx(p, options, 30, 18, 50);
    const pieVerticalShift = (options.labelPos === 'outside') ? scalePx(p, options, 20, 10, 40) : 0;

    // Style check
    const isDonut = options.style === 'donut';

    p.push();
    p.translate(margin.left, margin.top);

    // Auto title
    if (options.title === undefined) {
      options.title = `${lblCol} vs. ${valCol}`;
    }
    // Draw Metadata
    let pieMetaOpts = Object.assign({}, metaOpts, { textAlign: p.LEFT });
    drawMeta(p, pieMetaOpts, w, h);

    // Right-side vertical legend
    drawSideLegend(p, pieMetaOpts, w, h);

    // Shift the pie center down
    p.translate(cx, cy + pieVerticalShift);

    let startA = -p.HALF_PI;

    values.forEach((v, i) => {
      let ang = (v/total)*p.TWO_PI;
      let endA = startA + ang;
      let c = getColor(p, i, options.palette);

      // Hover Detection
      let mx = p.mouseX - (margin.left + cx);
      let my = p.mouseY - (margin.top + cy + pieVerticalShift);
      let d = p.dist(0, 0, mx, my);
      let mouseAng = p.atan2(my, mx);

      const norm = (a) => {
        a = a % p.TWO_PI;
        if (a < 0) a += p.TWO_PI;
        return a;
      };
      let am = norm(mouseAng);
      let a0 = norm(startA);
      let a1 = norm(endA);

      // Donut/Pie Hover
      let holeRadius = options.holeRadius || 0.6;
      let inRing = isDonut ? (d < r && d > r * holeRadius) : (d < r);

      let inAngle = (a0 <= a1) ? (am >= a0 && am <= a1) : (am >= a0 || am <= a1);
      let isHover = inRing && inAngle;

      // Draw Slice
      let colColor = p.color(c);
      p.stroke(options.lineColor || PIE_STROKE_COLOR);
      p.strokeWeight(options.lineSize || PIE_STROKE_WEIGHT);

      if (isHover) {
        p.cursor(p.HAND);
        p.push();
        p.scale(PIE_HOVER_SCALE);
        colColor.setAlpha(230);
        p.fill(colColor);
        p.arc(0, 0, r*2, r*2, startA, endA, p.PIE);
        p.pop();

        let pct = Math.round((v/total)*100);
        let content;
        if (typeof options.tooltip === 'function') {
          content = options.tooltip(labels[i], v, i, {percent: pct});
          if (!Array.isArray(content)) content = [String(content)];
        } else {
          let tooltipCols = options.tooltipColumns || fn.chart.defaultTooltipColumns;
          if (Array.isArray(tooltipCols)) {
            content = tooltipCols.map(tc => {
              if (tc.col === 'label') return (tc.label || 'Label') + ': ' + labels[i];
              if (tc.col === 'value') return (tc.label || 'Value') + ': ' + v;
              if (tc.col === 'percent') return (tc.label || 'Percent') + ': ' + pct + '%';
              return null;
            }).filter(x => x !== null);
            if (content.length === 0) content = [`${labels[i]}`, `${v} (${pct}%)`];
          } else {
            content = [`${labels[i]}`, `${v} (${pct}%)`];
          }
        }
        p.chart.hoverState = {
          active: true,
          x: p.mouseX,
          y: p.mouseY,
          content: content,
          tooltipScale: options && options.tooltipScale,
          tooltipTextSize: options && options.tooltipTextSize,
          tooltipFont: options && options.tooltipFont
        };
      } else {
        p.fill(colColor);
        p.arc(0, 0, r*2, r*2, startA, endA, p.PIE);
      }

      // Donut Hole Drawing
      if (isDonut) {
        let hole = options.holeRadius || DONUT_HOLE_RADIUS;
        p.noStroke();
        if (isTransparentBackground(options.background)) {
          if (typeof p.erase === 'function') {
            p.erase();
            p.ellipse(0, 0, r*2*hole, r*2*hole);
            p.noErase();
          }
          // Hole fill functionality skipping
        } else {
          p.fill(options.background || 255);
          p.ellipse(0, 0, r*2*hole, r*2*hole);
        }
      }

      // Draw Labels and Connectors
      if (options.labelPos !== 'none') {
          let mid = startA + ang/2;
          // Label anchor radius
          let tr = (options.labelPos === 'outside')
                   ? r + pieOutsideOffset
                   : r * (isDonut ? (1 + (options.holeRadius || DONUT_HOLE_RADIUS)) / 2 : 0.65); // Center of ring

          let tx = Math.cos(mid) * tr;
          let ty = Math.sin(mid) * tr;

          let pct = Math.round((v/total)*100);
          let labelText = String(labels[i]);

          // Label Content Logic
          switch (options.labelContent) {
              case 'value': labelText = String(v); break;
              case 'percent': labelText = `${pct}%`; break;
              case 'name_value': labelText = `${labels[i]} (${v})`; break;
              case 'name_percent': labelText = `${labels[i]} (${pct}%)`; break;
              case 'all': case 'name_value_percent': labelText = `${labels[i]} (${v} | ${pct}%)`; break;
              default: break;
          }

          // Draw Connector Line
          if (options.showConnectors && options.labelPos === 'outside') {
              const r_diag = r + 10;

              let x1 = Math.cos(mid) * r;
              let y1 = Math.sin(mid) * r;

              let x2 = Math.cos(mid) * r_diag;
              let y2 = Math.sin(mid) * r_diag;

              p.push();
              p.stroke(TEXT_COLOR);
              p.strokeWeight(1);
              p.noFill();
              p.beginShape();
              p.vertex(x1, y1); // Start on pie edge
              p.vertex(x2, y2); // Elbow point
              p.vertex(tx, y2); // Horizontal line to text anchor X (at elbow's Y level)
              p.endShape();
              p.pop();
          }
          // End Connector Line


          // Positioning and Alignment
          p.noStroke();
          p.textSize(options.labelSize || pieLabelSize);

          // On mobile, outline ALL pie/donut labels for a unified look
          const outlineActive = isMobileLayout(p, options);
          const outlineW = scalePx(p, options, 2, 1, 3);

          if (options.labelPos === 'outside') {
              // Anchor away from pie center
              let align = (tx > 0) ? p.LEFT : p.RIGHT;
              let buffer = (tx > 0) ? scalePx(p, options, 5, 3, 10) : -scalePx(p, options, 5, 3, 10);

              p.textAlign(align, p.CENTER);
              if (outlineActive) {
                p.stroke(255, 220);
                p.strokeWeight(outlineW);
              } else {
                p.noStroke();
              }
              p.fill(TEXT_COLOR);
              tx += buffer;

              // Keep outside labels within chart bounds
              const labelPad = scalePx(p, options, 6, 4, 10);
              const maxOutsideLabelW = (options.outsideLabelMaxWidth !== undefined)
                ? options.outsideLabelMaxWidth
                : Math.min(
                    scalePx(p, options, 140, 90, 180),
                    Math.max(70, Math.floor(w * (isMobileLayout(p, options) ? 0.26 : 0.32)))
                  );

              // Truncate outside labels too
              labelText = truncate(p, labelText, maxOutsideLabelW);
              const tw = measureText(p, labelText);

              if (align === p.LEFT) {
                tx = Math.min(tx, (cx - labelPad) - tw);
              } else {
                tx = Math.max(tx, (-cx + labelPad) + tw);
              }
          } else {
              p.textAlign(p.CENTER, p.CENTER);
              // Contrast check for inside labels
              let sliceColor = p.color(c);
              let brightness = (p.red(sliceColor) * 299 + p.green(sliceColor) * 587 + p.blue(sliceColor) * 114) / 1000;
              const useDark = brightness > 150;
              if (outlineActive) {
                p.stroke(useDark ? 255 : 0, 200);
                p.strokeWeight(outlineW);
              } else {
                p.noStroke();
              }
              p.fill(useDark ? TEXT_COLOR : 255);
          }

          // Truncation and Visibility
          let maxLabelW = (options.labelPos === 'outside') ? scalePx(p, options, 100, 70, 160) : Math.abs(tr * ang * 0.9);

            if (options.labelPos !== 'outside' && measureText(p, labelText) > maxLabelW) {
             while (labelText.length > 2 && measureText(p, labelText + '…') > maxLabelW) {
                 labelText = labelText.slice(0, -1);
             }
             labelText += '…';
          }

          // Hide label if slice is too small to fit text
           if (options.labelPos === 'outside' || ang > 0.15) {
             p.text(labelText, tx, ty);
           }
      }

      startA = endA;
    });

    p.pop();
  };

/* 5. SERIES CHART (Line plot) */

  /**
  * Creates a series chart
  * NaN Handling: Creates BREAKS (gaps) in the series where NaN values occur.
   * Points with NaN are NOT drawn. A warning is logged showing affected data.
   * Set nanPolicy: 'silent' to suppress warnings, or 'strict' to throw an error.
   */
  fn.series = function(data, options = {}) {
      const p = this;
      ensureCanvasMatchesDisplay(p, options);
      let df = (data instanceof p.chart.DataFrame) ? data : new p.chart.DataFrame(data);
      const xCol = options.x || df.columns[0];
      const yCols = Array.isArray(options.y) ? options.y : [options.y || df.columns[1]];

      // Validate data
      const validation = validateData(df, yCols, options, 'series');

      // Legend entries
      const legendEntries = yCols.slice();
      const legendColors = legendEntries.map((_, i) => getColor(p, i, options.palette));

      const _responsiveScale = getResponsiveScale(p, options);
      const metaOpts = Object.assign({}, options, { _responsiveScale, _legendEntries: legendEntries, _legendColors: legendColors });

      let margin0 = options.margin || getResponsiveMargin(p, options, DEFAULT_MARGIN);
      margin0 = withMobileRightPadding(p, options, margin0);

      // Reserve space for right-side vertical legends
      margin0 = ensureMetaRightMargin(p, metaOpts, margin0);
      const canvasW = p.width;
      const canvasH = p.height;
      const baseW = (options.width !== undefined) ? Math.min(options.width, canvasW) : canvasW;
      const baseH = (options.height !== undefined) ? Math.min(options.height, canvasH) : canvasH;

      // Expand top margin if legend/title/subtitle need more space
      margin0 = ensureMetaTopMargin(p, metaOpts, margin0, baseW - margin0.left - margin0.right);

      // Expand left/bottom margins if x/y axis labels (or footer) need more space
      margin0 = ensureMetaAxisMargins(p, metaOpts, margin0, baseW, baseH);

      // Axis margins can change plot width; re-run top layout once
      margin0 = ensureMetaTopMargin(p, metaOpts, margin0, baseW - margin0.left - margin0.right);

      const margin = margin0;
      const w = baseW - margin.left - margin.right;
      const h = baseH - margin.top - margin.bottom;

      const tickLen = scalePx(p, options, TICK_LENGTH, 3, 10);
      const tickLabelSize = scalePx(p, options, TICK_LABEL_SIZE, 8, 14);
      const dataLabelSize = scalePx(p, options, DATA_LABEL_SIZE, 9, 14);
      const pointStrokeW = scalePx(p, options, POINT_STROKE_WEIGHT, 1, 4);
      const pointHoverStrokeW = scalePx(p, options, POINT_HOVER_STROKE_WEIGHT, 1, 5);
      const tickTextOffset = scalePx(p, options, 8, 6, 12);

      const ptSz = options.pointSize || DEFAULT_POINT_SIZE;
      const lnSz = options.lineSize || DEFAULT_LINE_SIZE;
      const isHollow = options.pointStyle === 'hollow';
      const isTransparentBg = isTransparentBackground(options.background);
      const bgColor = isTransparentBg ? 255 : (options.background || 255);

      const showVals = options.showValues !== undefined ? options.showValues : false;
      const lblPos = options.labelPos || 'auto';


      // Gather all X and Y values
      const xs = df.col(xCol).map(Number);
      const rows = df.rows;
      let allY = [];
      yCols.forEach(c => allY.push(...df.col(c).map(v => Number(v))));
      // Filter out NaN
      const validXs = xs.filter(x => !isNaN(x));
      const validYs = allY.filter(y => !isNaN(y));
      if (validYs.length === 0) return;
      // Axis bounds
      const minX = (options.minX !== undefined) ? options.minX : (validXs.length > 0 ? Math.min(0, ...validXs) : 0);
      const maxX = (options.maxX !== undefined) ? options.maxX : (validXs.length > 0 ? Math.max(0, ...validXs) : 1);
      const minY = (options.minY !== undefined) ? options.minY : (validYs.length > 0 ? Math.min(0, ...validYs) : 0);
      const maxY = (options.maxY !== undefined) ? options.maxY : (validYs.length > 0 ? Math.max(0, ...validYs) : 1);

      if (options.xLabel === undefined) options.xLabel = xCol;
      if (options.yLabel === undefined) options.yLabel = yCols.join(', ');
      if (options.title === undefined) options.title = yCols.join(' vs. ');

      p.push();
      p.translate(margin.left, margin.top);
      drawMeta(p, metaOpts, w, h);

      // Right-side vertical legend
      drawSideLegend(p, metaOpts, w, h);

      // Axes
      p.stroke(AXIS_COLOR); p.strokeWeight(AXIS_WEIGHT);
      p.line(0, h, w, h);
      p.line(0, 0, 0, h);

      // Calculate nice axis bounds
      const yAxis = niceAxisBounds(minY, maxY);

      p.stroke(TICK_COLOR); p.strokeWeight(TICK_WEIGHT);
          function formatTick(val) {
            let num = Number(val);
            if (isNaN(num)) return String(val);
            if (num === 0) return '0';
            let absVal = Math.abs(num);
            if (Number.isInteger(num)) return num.toFixed(0);
            let decimals = 0;
            while (absVal < 1 && absVal !== 0 && decimals < 10) {
              absVal *= 10;
              decimals++;
            }
            return num.toFixed(decimals);
          }
      // Y-Ticks
      yAxis.ticks.forEach(tickVal => {
          let yVal = p.map(tickVal, yAxis.min, yAxis.max, h, 0);
          p.line(-tickLen, yVal, 0, yVal);
          p.noStroke(); p.fill(SUBTEXT_COLOR); p.textSize(tickLabelSize); p.textAlign(p.RIGHT, p.CENTER);
          p.text(formatTick(tickVal), -8, yVal);
          p.stroke(TICK_COLOR);
      });

      // X-Ticks
      const xAxis = niceAxisBounds(minX, maxX);
      xAxis.ticks.forEach(tickVal => {
        let xVal = p.map(tickVal, minX, maxX, 0, w);
        p.stroke(TICK_COLOR); p.line(xVal, h, xVal, h + tickLen);
        p.noStroke(); p.fill(SUBTEXT_COLOR); p.textSize(tickLabelSize); p.textAlign(p.CENTER, p.TOP);
        p.text(formatTick(tickVal), xVal, h + tickTextOffset);
      });

      // Draw Lines
      yCols.forEach((col, i) => {
        let c = getColor(p, i, options.palette);
        p.stroke(c); p.strokeWeight(lnSz); p.noFill();
        p.beginShape();
        xs.forEach((xVal, j) => {
          let val = rows[j][col];
          // Check for NaN/null/empty
          if (val === null || val === '' || val === undefined ||
              (typeof val === 'number' && isNaN(val)) ||
              (typeof val === 'string' && isNaN(Number(val)))) {
            p.endShape();
            p.beginShape();
            return;
          }
          let px = p.map(xs[j], minX, maxX, 0, w);
          let py = p.map(Number(val), yAxis.min, yAxis.max, h, 0);
          p.vertex(px, py);
        });
        p.endShape();
      });

      // Draw Points and Labels
      if (options.dots !== false) {
          yCols.forEach((col, i) => {
              let c = getColor(p, i, options.palette);

                xs.forEach((xVal, j) => {
                  let val = Number(rows[j][col]);
                  if (isNaN(val)) return;
                  let r = rows[j];
                  let px = p.map(xs[j], minX, maxX, 0, w);
                  let py = p.map(val, yAxis.min, yAxis.max, h, 0);
                  let d = p.dist(p.mouseX-margin.left, p.mouseY-margin.top, px, py);
                  let isHover = d < (ptSz + 4);
                  let isClicked = isHover && p.mouseIsPressed;

                  // Draw Dot
                  p.strokeWeight(isHollow ? pointStrokeW : 0);
                  if (isHollow) {
                    p.stroke(c);
                    if (isTransparentBg) p.noFill();
                    else p.fill(bgColor);
                  }
                  else { p.noStroke(); p.fill(c); }

                  if (isHover) {
                      p.cursor(p.HAND);
                      if(isHollow) p.strokeWeight(pointHoverStrokeW);
                      else { let hc = p.color(c); hc.setAlpha(HOVER_ALPHA); p.fill(hc); p.circle(px, py, ptSz * POINT_HOVER_SCALE); }

                      // Only show tooltip if not showing static labels
                      if (showVals !== true) {
                        let content;
                        if (typeof options.tooltip === 'function') {
                          content = options.tooltip(col, val, i, {row: r, col: col});
                          if (!Array.isArray(content)) content = [String(content)];
                        } else {
                          // Check for tooltips
                          let tooltipCols = options.tooltipColumns || fn.chart.defaultTooltipColumns;
                          if (Array.isArray(tooltipCols) && r) {
                            content = tooltipCols.map(tc => {
                              let v = r[tc.col];
                              let label = tc.label || tc.col;
                              return (v !== undefined) ? `${label}: ${v}` : null;
                            }).filter(x => x !== null);
                            if (content.length === 0) content = [`${col}`, `${val}`];
                          } else if (options.seriesTooltipColumn && r && r[options.seriesTooltipColumn] !== undefined) {
                            content = [String(r[options.seriesTooltipColumn])];
                          } else {
                            content = [`${col}`, `${val}`];
                          }
                        }
                        p.chart.hoverState = {
                          active: true,
                          x: p.mouseX,
                          y: p.mouseY,
                          content: content,
                          tooltipScale: options && options.tooltipScale,
                          tooltipTextSize: options && options.tooltipTextSize,
                          tooltipFont: options && options.tooltipFont
                        };
                      }
                  }
                  if (!isHover || isHollow) p.circle(px, py, ptSz);

                  let drawThisLabel = false;

                  if (showVals === true) drawThisLabel = true;

                  else if (showVals === 'click' && isClicked) drawThisLabel = true;

                    if (drawThisLabel) {
                      p.noStroke();
                      // Use label color protection
                      let labelBg = c;
                      p.fill(getAutoLabelColor(p, labelBg));
                      p.textSize(dataLabelSize);
                      p.textAlign(p.CENTER, p.CENTER);

                      let txt = String(val);
                      let offset = ptSz/2 + LABEL_OFFSET;
                      let ly = py - offset;

                      if (lblPos === 'bottom') {
                        ly = py + offset;
                      } else if (lblPos === 'auto') {
                        if (py < 25) ly = py + offset;
                        else if (yCols.length > 1 && i % 2 !== 0) ly = py + offset;
                      }

                      p.text(txt, px, ly);
                    }
              });
          });
      }

            // Draw axis lines
            p.stroke(AXIS_COLOR); p.strokeWeight(AXIS_WEIGHT);
            p.line(0, h, w, h); // X
            p.line(0, 0, 0, h); // Y
      p.pop();
  };

/* 6. SCATTER PLOT */

  /**
   * Creates a scatter plot
   * NaN Handling: Points with NaN in x or y are SKIPPED (not drawn).
   * A warning is logged showing how many points were skipped.
   * Set nanPolicy: 'silent' to suppress warnings, or 'strict' to throw an error.
   */
  fn.scatter = function(data, options = {}) {
      const p = this;
      ensureCanvasMatchesDisplay(p, options);
      let df = (data instanceof p.chart.DataFrame) ? data : new p.chart.DataFrame(data);
      const xCol = options.x || df.columns[0];
      const yCol = options.y || df.columns[1];

      // Validate data
      const validation = validateData(df, [xCol, yCol], options, 'scatter');


      const _responsiveScale = getResponsiveScale(p, options);

      let margin0 = options.margin || getResponsiveMargin(p, options, DEFAULT_MARGIN);
      margin0 = withMobileRightPadding(p, options, margin0);
      const canvasW = p.width;
      const canvasH = p.height;
      const baseW = (options.width !== undefined) ? Math.min(options.width, canvasW) : canvasW;
      const baseH = (options.height !== undefined) ? Math.min(options.height, canvasH) : canvasH;

      // Data Extraction
      const rows = df.rows;
      const xs = df.col(xCol).map(Number);
      const ys = df.col(yCol).map(Number);
      if (xs.length === 0 || ys.length === 0) return;

      // Variable Size Logic
      let sizes = [];
      const sizeCol = options.size;
      let minS = 0, maxS = 0;
      if (sizeCol && rows[0][sizeCol] !== undefined) {
          sizes = df.col(sizeCol).map(Number);
          const validSizes = sizes.filter(s => !isNaN(s));
          if (validSizes.length > 0) {
              minS = Math.min(...validSizes);
              maxS = Math.max(...validSizes);
          }
      }
      const minPtSz = options.minSize || MIN_POINT_SIZE;
      const maxPtSz = options.maxSize || MAX_POINT_SIZE;
      const fixedPtSz = options.pointSize || DEFAULT_POINT_SIZE_SCATTER;

      // Variable Color Logic
      let colors = [];
      const colorCol = options.color;
      let colorDomain = [];
      let minC = 0, maxC = 0;
      let isColorNumeric = false;

      if (colorCol && rows[0][colorCol] !== undefined) {
          // Check type of first non-null value
          let sample = rows.find(r => r[colorCol] !== null && r[colorCol] !== "")[colorCol];
          isColorNumeric = !isNaN(Number(sample));

          if (isColorNumeric) {
             let vals = df.col(colorCol).map(Number).filter(v => !isNaN(v));
             if (vals.length > 0) {
                 minC = Math.min(...vals);
                 maxC = Math.max(...vals);
             }
          } else {
             colorDomain = [...new Set(df.col(colorCol))];
          }
      }

      // Bounds, filter NaNs
      const validXs = xs.filter(x => !isNaN(x));
      const validYs = ys.filter(y => !isNaN(y));
      const minX = (options.minX !== undefined) ? options.minX : (validXs.length > 0 ? Math.min(0, ...validXs) : 0);
      const maxX = (options.maxX !== undefined) ? options.maxX : (validXs.length > 0 ? Math.max(0, ...validXs) : 1);
      const minY = (options.minY !== undefined) ? options.minY : (validYs.length > 0 ? Math.min(0, ...validYs) : 0);
      const maxY = (options.maxY !== undefined) ? options.maxY : (validYs.length > 0 ? Math.max(0, ...validYs) : 1);

      if (options.xLabel === undefined) options.xLabel = xCol;
      if (options.yLabel === undefined) options.yLabel = yCol;
      if (options.title === undefined) options.title = `${yCol} vs. ${xCol}`;

      const isHollow = options.pointStyle === 'hollow';
      const isTransparentBg = isTransparentBackground(options.background);
      const bgColor = isTransparentBg ? 255 : (options.background || 255);
      const showVals = options.showValues !== undefined ? options.showValues : false;
      const lblPos = options.labelPos || 'auto';
      const palette = options.palette || p.chart.palette;

      // Legend
      let legendEntries = [];
      let legendColors = [];
      let legendGradient = null;
      if (colorCol && rows[0] && rows[0][colorCol] !== undefined) {
        if (isColorNumeric) {
          legendGradient = {
            min: minC,
            max: maxC,
            c1: getColor(p, 0, palette),
            c2: getColor(p, 1, palette),
            label: String(colorCol)
          };
        } else if (Array.isArray(colorDomain) && colorDomain.length > 0) {
          legendEntries = colorDomain.map(v => String(v));
          legendColors = legendEntries.map((_, i) => getColor(p, i, palette));
        }
      }

      const metaOpts = Object.assign({}, options, {
        _responsiveScale,
        _legendEntries: legendEntries,
        _legendColors: legendColors,
        _legendGradient: legendGradient
      });

      // Reserve space for right-side vertical legends
      margin0 = ensureMetaRightMargin(p, metaOpts, margin0);

      // Expand top margin if legend/title/subtitle need more space
      margin0 = ensureMetaTopMargin(p, metaOpts, margin0, baseW - margin0.left - margin0.right);

      // Expand left/bottom margins if x/y axis labels (or footer) need more space
      margin0 = ensureMetaAxisMargins(p, metaOpts, margin0, baseW, baseH);

      // Axis margins can change plot width; re-run top layout once
      margin0 = ensureMetaTopMargin(p, metaOpts, margin0, baseW - margin0.left - margin0.right);

      const margin = margin0;
      const w = baseW - margin.left - margin.right;
      const h = baseH - margin.top - margin.bottom;

      const tickLen = scalePx(p, options, TICK_LENGTH, 3, 10);
      const tickLabelSize = scalePx(p, options, TICK_LABEL_SIZE, 8, 14);
      const dataLabelSize = scalePx(p, options, DATA_LABEL_SIZE, 9, 14);
      const pointStrokeW = scalePx(p, options, POINT_STROKE_WEIGHT, 1, 4);
      const pointHoverStrokeW = scalePx(p, options, POINT_HOVER_STROKE_WEIGHT, 1, 5);
      const tickTextOffset = scalePx(p, options, 8, 6, 12);

      p.push();
      p.translate(margin.left, margin.top);
      drawMeta(p, metaOpts, w, h);

      // Right-side vertical legend
      drawSideLegend(p, metaOpts, w, h);

      // Axes
      p.stroke(AXIS_COLOR); p.strokeWeight(AXIS_WEIGHT);
      p.line(0, h, w, h); // X
      p.line(0, 0, 0, h); // Y

      // Calculate nice tick intervals
      const xAxis = niceAxisBounds(minX, maxX);
      const yAxis = niceAxisBounds(minY, maxY);

      // Ticks Helper
      function formatTick(val) {
        if (val === 0) return '0';
        let absVal = Math.abs(val);
        if (Number.isInteger(val)) return val.toFixed(0);
        if (absVal > 1000) return (val/1000).toFixed(1) + 'k';
        let decimals = 0;
        while (absVal < 1 && absVal !== 0 && decimals < 5) { absVal *= 10; decimals++; }
        return val.toFixed(decimals);
      }

      // X-Ticks
      p.stroke(TICK_COLOR); p.strokeWeight(TICK_WEIGHT);
      xAxis.ticks.forEach(tickVal => {
        let xVal = p.map(tickVal, xAxis.min, xAxis.max, 0, w);
        p.line(xVal, h, xVal, h + tickLen);
        p.noStroke(); p.fill(SUBTEXT_COLOR); p.textSize(tickLabelSize); p.textAlign(p.CENTER, p.TOP);
        p.text(formatTick(tickVal), xVal, h + tickTextOffset);
        p.stroke(TICK_COLOR);
      });

      // Y-Ticks
      yAxis.ticks.forEach(tickVal => {
        let yVal = p.map(tickVal, yAxis.min, yAxis.max, h, 0);
        p.stroke(TICK_COLOR); p.line(-tickLen, yVal, 0, yVal);
        p.noStroke(); p.fill(SUBTEXT_COLOR); p.textSize(tickLabelSize); p.textAlign(p.RIGHT, p.CENTER);
        p.text(formatTick(tickVal), -8, yVal);
        p.stroke(TICK_COLOR);
      });

      // Connect Lines
      if (options.connect) {
          let lineC = options.lineColor || palette[0];
          p.noFill(); p.stroke(lineC); p.strokeWeight(options.lineSize || DEFAULT_LINE_SIZE);
          p.beginShape();
          for(let i=0; i<xs.length; i++) {
             let cx = p.map(xs[i], xAxis.min, xAxis.max, 0, w);
             let cy = p.map(ys[i], yAxis.min, yAxis.max, h, 0);
             p.vertex(cx, cy);
          }
          p.endShape();
      }

      // Scatter points
      p.noStroke();
      const baseColor = options.baseColor || palette[0];

      for(let i=0; i<xs.length; i++) {
          // Skip if x or y is NaN
          if (isNaN(xs[i]) || isNaN(ys[i])) continue;

          let cx = p.map(xs[i], xAxis.min, xAxis.max, 0, w);
          let cy = p.map(ys[i], yAxis.min, yAxis.max, h, 0);

          // Determine Radius
          let r = fixedPtSz;
          if (sizeCol && sizes[i] !== undefined && !isNaN(sizes[i])) {
             let norm = (sizes[i] - minS) / (maxS - minS || 1);
             r = p.map(norm, 0, 1, minPtSz, maxPtSz);
          }

          // Determine Color
          let ptColor = p.color(baseColor);
          if (colorCol) {
             let val = rows[i][colorCol];
             if (isColorNumeric) {
                 // Interpolate between first two palette colors
                 let norm = (Number(val) - minC) / (maxC - minC || 1);
                 let c1 = p.color(palette[0]);
                 let c2 = p.color(palette[1] || palette[0]);
                 ptColor = p.lerpColor(c1, c2, norm);
             } else {
                 // Categorical
                 let idx = colorDomain.indexOf(val);
                 if (idx === -1) idx = 0;
                 ptColor = p.color(getColor(p, idx, palette));
             }
          }

          // Draw Point
          let d = p.dist(p.mouseX-margin.left, p.mouseY-margin.top, cx, cy);
          // Hit area includes radius + buffer
          let isHover = d < (r/2 + 4);
          let isClicked = isHover && p.mouseIsPressed;

          // Style Setup

            p.strokeWeight(isHollow ? pointStrokeW : 0);
            if (isHollow) {
              p.stroke(ptColor);
              if (isTransparentBg) p.noFill();
              else p.fill(bgColor);
            } else {
              p.noStroke();
              p.fill(ptColor);
            }

            // Hover State
            if (isHover) {
               p.cursor(p.HAND);
               if(isHollow) p.strokeWeight(pointHoverStrokeW);
               else {
                 let hc = p.color(ptColor);
                 hc.setAlpha(HOVER_ALPHA);
                 p.fill(hc);
                 p.circle(cx, cy, r * POINT_HOVER_SCALE);
               }
               // Tooltip
               if (showVals !== true) {
                 let content;
                 if (typeof options.tooltip === 'function') {
                   content = options.tooltip(rows[i], i, {x: xs[i], y: ys[i], size: sizes[i], color: rows[i][colorCol]});
                   if (!Array.isArray(content)) content = [String(content)];
                 } else {
                   let tooltipCols = options.tooltipColumns || fn.chart.defaultTooltipColumns;
                   if (Array.isArray(tooltipCols) && rows[i]) {
                     content = tooltipCols.map(tc => {
                       let v = rows[i][tc.col];
                       let label = tc.label || tc.col;
                       return (v !== undefined) ? `${label}: ${v}` : null;
                     }).filter(x => x !== null);
                     if (content.length === 0) content = [`X: ${xs[i]}`, `Y: ${ys[i]}`];
                   } else {
                     content = [`X: ${xs[i]}`, `Y: ${ys[i]}`];
                     if (sizeCol) content.push(`${sizeCol}: ${sizes[i]}`);
                     if (colorCol) content.push(`${colorCol}: ${rows[i][colorCol]}`);
                   }
                 }
                 p.chart.hoverState = {
                   active: true,
                   x: p.mouseX,
                   y: p.mouseY,
                   content: content,
                   tooltipScale: options && options.tooltipScale,
                   tooltipTextSize: options && options.tooltipTextSize,
                   tooltipFont: options && options.tooltipFont
                 };
               }
            }

          if (!isHover || isHollow) p.circle(cx, cy, r);

          // Value Labels
          let drawLabel = false;
          if (showVals === true) drawLabel = true;
          else if (showVals === 'click' && isClicked) drawLabel = true;

          if (drawLabel) {
              p.noStroke();
              p.fill(TEXT_COLOR);
              p.textSize(dataLabelSize);
              p.textAlign(p.CENTER, p.CENTER);

              let txt = sizeCol ? String(sizes[i]) : String(ys[i]);

              let offset = r/2 + (LABEL_OFFSET - 2);
              let ly = cy - offset;

              if (lblPos === 'bottom') ly = cy + offset;
              else if (lblPos === 'auto' && cy < 20) ly = cy + offset;

              p.text(txt, cx, ly);
          }
      }

            // Draw axis lines
            p.stroke(AXIS_COLOR); p.strokeWeight(AXIS_WEIGHT);
            p.line(0, h, w, h);
            p.line(0, 0, 0, h);
      p.pop();
  };

/* 7. HISTOGRAM */

/**
 * Creates a histogram
 * NaN Handling: Values are FILTERED OUT (excluded from binning).
 * A warning is logged showing how many values were removed.
 * Set nanPolicy: 'silent' to suppress warnings, or 'strict' to throw an error.
 */
fn.hist = function(data, options = {}) {
    const p = this;
  ensureCanvasMatchesDisplay(p, options);
    let df = (data instanceof p.chart.DataFrame) ? data : new p.chart.DataFrame(data);
    const col = options.x || options.column || df.columns[0];

    // Validate data
    const allVals = df.col(col);
    const originalCount = allVals.length;

    // Data Preparation
    const vals = allVals.map(Number).filter(v => !isNaN(v));
    if (vals.length === 0) return;

    // Report filtered values
    const filteredCount = originalCount - vals.length;
    if (filteredCount > 0) {
        const policy = options.nanPolicy || fn.chart.nanPolicy || 'warn';
        if (policy === 'strict') {
            throw new Error(
                `[p5.chart.hist] Data contains ${filteredCount} NaN/null values in column '${col}'. ` +
                `Set nanPolicy: 'warn' or 'silent' to handle automatically.`
            );
        } else if (policy === 'warn') {
            console.warn(
                `[p5.chart.hist] Data Quality Warning: ${filteredCount} of ${originalCount} values filtered out due to NaN/null.`,
                `\n  Column: ${col}`,
                `\n  Histogram will display ${vals.length} valid values.`,
                `\n  To suppress this warning, set nanPolicy: 'silent' in chart options.`
            );
        }
    }

    // Determine bounds and optimal bin size
    const requestedBins = options.bins || HIST_DEFAULT_BINS;
    const minRaw = Math.min(...vals);
    const maxRaw = Math.max(...vals);
    const span = maxRaw - minRaw;
    const roughBinWidth = span / requestedBins;

    const powersOf10 = Math.pow(10, Math.floor(Math.log10(roughBinWidth)));
    const factors = [1, 2, 5, 10];
    let step = powersOf10;

    for (const factor of factors) {
        if (factor * powersOf10 >= roughBinWidth) {
            step = factor * powersOf10;
            break;
        }
    }

    const minV = Math.floor(minRaw / step) * step;
    const maxV = Math.ceil(maxRaw / step) * step;
    const finalSpan = maxV - minV;
    const finalBins = Math.round(finalSpan / step);

    let counts = new Array(finalBins).fill(0);

    vals.forEach(v => {
        let idx = Math.floor((v - minV) / step);
        if (idx < 0) idx = 0;
        if (idx >= finalBins) idx = finalBins - 1;
        counts[idx]++;
    });

    const binEdges = Array.from({ length: finalBins + 1 }, (_, i) => minV + step * i);

    // Layout and Scaling
    const maxCount = Math.max(...counts);

    // Legend entry
    const _responsiveScale = getResponsiveScale(p, options);
    const legendEntries = [String(col)];
    const legendColors = [getColor(p, 0, options.palette)];
    const metaOpts = Object.assign({}, options, { _responsiveScale, _legendEntries: legendEntries, _legendColors: legendColors });

    let margin0 = options.margin || getResponsiveMargin(p, options, DEFAULT_MARGIN);
    margin0 = withMobileRightPadding(p, options, margin0);

    // Reserve space for right-side vertical legends
    margin0 = ensureMetaRightMargin(p, metaOpts, margin0);
    const canvasW = p.width;
    const canvasH = p.height;
    const baseW = (options.width !== undefined) ? Math.min(options.width, canvasW) : canvasW;
    const baseH = (options.height !== undefined) ? Math.min(options.height, canvasH) : canvasH;

    // Expand top margin if legend/title/subtitle need more space
    margin0 = ensureMetaTopMargin(p, metaOpts, margin0, baseW - margin0.left - margin0.right);

    // Expand left/bottom margins if x/y axis labels (or footer) need more space
    margin0 = ensureMetaAxisMargins(p, metaOpts, margin0, baseW, baseH);

    // Axis margins can change plot width; re-run top layout once
    margin0 = ensureMetaTopMargin(p, metaOpts, margin0, baseW - margin0.left - margin0.right);

    const margin = margin0;
    const w = baseW - margin.left - margin.right;
    const h = baseH - margin.top - margin.bottom;

    const tickLen = scalePx(p, options, TICK_LENGTH, 3, 10);
    const tickLabelSize = scalePx(p, options, TICK_LABEL_SIZE, 8, 14);
    const histLabelSize = scalePx(p, options, HIST_LABEL_SIZE, 8, 14);
    const tickTextOffset = scalePx(p, options, 8, 6, 12);

    const maxAxisVal = Math.ceil(maxCount / 5) * 5;
    const barW = w / finalBins;

    // Determine Background Luminance
    const bgColor = isTransparentBackground(options.background) ? p.color(255) : (options.background || p.color(255));
    const bg = p.color(bgColor);
    const bgLuminance = (p.red(bg) * 0.299 + p.green(bg) * 0.587 + p.blue(bg) * 0.114);

    // Set Default Border Color for Reproducible Contrast
    const defaultContrastColor = (bgLuminance > 128) ? p.color('#333333') : p.color('#CCCCCC');

    const borderWeight = options.borderWeight || HIST_BORDER_WEIGHT;
    const borderColor = options.borderColor || defaultContrastColor;
    const color = getColor(p, 0, options.palette);

    // Text color contrast for labels on top of bars
    const barColorLuminance = (p.red(p.color(color)) * 0.299 + p.green(p.color(color)) * 0.587 + p.blue(p.color(color)) * 0.114);
    const textColorContrast = (barColorLuminance > 128) ? TEXT_COLOR : p.color(255);

    const showLabels = options.showLabels !== undefined ? options.showLabels : true;

    p.push();
    p.translate(margin.left, margin.top);

    // Titles, Labels
    options.xLabel = options.xLabel || col;
    options.yLabel = options.yLabel || "Count";
    options.title = options.title || `Histogram of ${col}`;

    p.textFont(options.font || DEFAULT_FONT);
    drawMeta(p, metaOpts, w, h);

    // Right-side vertical legend
    drawSideLegend(p, metaOpts, w, h);

    // Axes and Ticks
    p.textFont(options.font || DEFAULT_FONT);

    // X-axis
    p.stroke(AXIS_COLOR); p.strokeWeight(AXIS_WEIGHT); p.line(0, h, w, h);

    // Y-axis
    p.line(0, 0, 0, h);

    // Calculate nice Y-axis bounds
    const yAxis = niceAxisBounds(0, maxCount);

    // Y-ticks
    p.stroke(TICK_COLOR); p.strokeWeight(TICK_WEIGHT);
    yAxis.ticks.forEach(tickVal => {
        let yVal = p.map(tickVal, yAxis.min, yAxis.max, h, 0);
      p.line(-tickLen, yVal, 0, yVal);

        // Ensure Y-axis labels have no stroke
      p.noStroke(); p.fill(SUBTEXT_COLOR); p.textSize(tickLabelSize);
        p.textAlign(p.RIGHT, p.CENTER);
        p.text(tickVal, -8, yVal);
        p.stroke(TICK_COLOR);
    });

    // X-Ticks
    p.fill(TEXT_COLOR); p.textSize(tickLabelSize);
    const TEXT_BOX_WIDTH = scalePx(p, options, 30, 22, 40);
    const TICK_LABEL_PADDING = scalePx(p, options, 3, 2, 6);

    // Estimate the space needed for a label
    const minLabelSpace = scalePx(p, options, 25, 18, 40);

    // 2. Calculate how many bins fit in that space
    let labelEvery = Math.max(1, Math.ceil(minLabelSpace / barW));

    binEdges.forEach((edgeValue, i) => {
        const xPos = i * barW;

        p.stroke(TICK_COLOR);
        p.line(xPos, h, xPos, h + tickLen);

        // Decide if we should show the label
        const showLabel = (i % labelEvery === 0 || i === finalBins || i === 0);

        if (showLabel) {
            p.noStroke();

            let align = p.CENTER;
            let textX = xPos;

            let labelText = Number.isInteger(edgeValue) ? String(edgeValue) : edgeValue.toFixed(1);

            // Handle start and end edge alignment
            if (i === 0) {
                align = p.LEFT;

                p.textAlign(align, p.TOP);
                p.text(labelText, textX, h + tickTextOffset, TEXT_BOX_WIDTH);

            } else if (i === finalBins) {
                align = p.RIGHT;

                p.textAlign(align, p.TOP);
                p.text(labelText, xPos + TICK_LABEL_PADDING, h + tickTextOffset);

            } else {
                align = p.CENTER;
                textX -= TEXT_BOX_WIDTH / 2;

                p.textAlign(align, p.TOP);

                p.text(labelText, textX, h + tickTextOffset, TEXT_BOX_WIDTH);
            }
        }
    });

    // Draw Bars
    p.textFont(options.font || DEFAULT_FONT);

    counts.forEach((count, i) => {
        const rectX = i * barW;
        const rectH = p.map(count, yAxis.min, yAxis.max, 0, h);
        const rectY = h - rectH;

        // Tooltip
        const gx = margin.left + rectX;
        const gy = margin.top + rectY;

        const binStart = binEdges[i];
        const binEnd = binEdges[i+1];

        let isHover = false;
        if (p.mouseX >= gx && p.mouseX <= gx + barW && p.mouseY >= gy && p.mouseY <= gy + rectH) {
            isHover = true;
            let content;
            if (typeof options.tooltip === 'function') {
              content = options.tooltip(binStart, binEnd, count, i, {bin: i, value: count, binStart, binEnd});
              if (!Array.isArray(content)) content = [String(content)];
            } else {
              let tooltipCols = options.tooltipColumns || fn.chart.defaultTooltipColumns;
              if (Array.isArray(tooltipCols)) {
                content = tooltipCols.map(tc => {
                  if (tc.col === 'bin' || tc.col === 'binStart') return (tc.label || 'Bin') + ': ' + formatValueLabel(binStart);
                  if (tc.col === 'binEnd') return (tc.label || 'Bin End') + ': ' + formatValueLabel(binEnd);
                  if (tc.col === 'count' || tc.col === 'value') return (tc.label || 'Count') + ': ' + count;
                  return null;
                }).filter(x => x !== null);
                if (content.length === 0) content = [`Bin: ${formatValueLabel(binStart)} - ${formatValueLabel(binEnd)}`, `Count: ${count}`];
              } else {
                content = [`Bin: ${formatValueLabel(binStart)} - ${formatValueLabel(binEnd)}`, `Count: ${count}`];
              }
            }
            p.chart.hoverState = {
              active: true,
              x: p.mouseX,
              y: p.mouseY,
              content: content,
              tooltipScale: options && options.tooltipScale,
              tooltipTextSize: options && options.tooltipTextSize,
              tooltipFont: options && options.tooltipFont
            };
            p.cursor(p.HAND);
        }

        // Coloring and Drawing
        p.stroke(borderColor);
        p.strokeWeight(borderWeight);
        p.fill(color);

        if (isHover) {
            let hoverColor = p.color(color);
            hoverColor.setAlpha(200);
            p.fill(hoverColor);
        }

        p.rect(rectX, rectY, barW, rectH);

        // Value Labels
        if (showLabels) {
          p.noStroke();
          p.textSize(histLabelSize);
          let label = formatValueLabel(count);
          let labelY = rectY + 4 + histLabelSize;
          if (rectH < histLabelSize + 8) {
            labelY = rectY - 2;
            p.fill(TEXT_COLOR);
            p.textAlign(p.CENTER, p.BOTTOM);
          } else {
            p.fill(textColorContrast);
            p.textAlign(p.CENTER, p.TOP);
          }
          if (labelY < -margin.top + 18) labelY = -margin.top + 18;
          p.text(label, rectX + barW / 2, labelY);
        }
    });

        p.stroke(AXIS_COLOR); p.strokeWeight(AXIS_WEIGHT);
        p.line(0, h, w, h);
        p.line(0, 0, 0, h);

    p.pop();
};

  /* 8. TABLE */

  // Creates an interactive table with hover effects, optional search, and pagination
  /**
   * Creates an interactive data table
   * NaN Handling: NaN/null values are DISPLAYED with visual indicator (grayed style).
   * A warning is logged showing which cells contain NaN values.
   * Set nanPolicy: 'silent' to suppress warnings.
   * Set nanIndicator: false to disable visual styling of NaN cells.
   */
  fn.table = function(data, options = {}) {
      const p = this;
      ensureCanvasMatchesDisplay(p, options);
      let df = (data instanceof p.chart.DataFrame) ? data : new p.chart.DataFrame(data);
      const id = options.id || 'p5chart_table';

      // Validate
      const validation = validateData(df, df.columns, options, 'table');

      // Auto-enable searchable and pagination
      const totalRowCount = df.rows.length;
      const searchable = options.searchable !== undefined ? options.searchable : (totalRowCount > TABLE_MAX_ROWS);
      const pagination = options.pagination !== undefined ? options.pagination : (totalRowCount > TABLE_MAX_ROWS);

      const sortable = options.sortable !== undefined ? options.sortable : true;

      if (!p.chart._tableStates) p.chart._tableStates = {};
      if (!p.chart._tableStates[id]) {
          p.chart._tableStates[id] = {
            currentPage: options.page || 0,
            sortColumn: null,
            sortDirection: 'asc',
            _mouseWasPressed: false
          };
      }
      const state = p.chart._tableStates[id];
      if (options.page !== undefined) {
        state.currentPage = options.page;
      }

      // Layout dimensions
      const _responsiveScale = getResponsiveScale(p, options);
      let x = (options.x !== undefined) ? options.x : scalePx(p, options, 20, 8, 24);
      let y = (options.y !== undefined) ? options.y : scalePx(p, options, 80, 40, 100);
      if (options.responsive !== false) {
        x = clampNumber(x, 0, Math.max(0, p.width - 10));
        y = clampNumber(y, 0, Math.max(0, Math.round(p.height * 0.25)));
      }

      // Mobile-only right padding
      const rightPad = getMobileRightPadding(p, options);
      const maxTableW = Math.max(50, p.width - x - rightPad);
      const w = Math.min(
        (options.width !== undefined) ? options.width : (p.width - scalePx(p, options, 40, 16, 60)),
        maxTableW
      );
      let rowH = scalePx(p, options, TABLE_ROW_HEIGHT, 22, 40);
      const tableTextSize = scalePx(p, options, TABLE_TEXT_SIZE, 10, 14);
      const titleSize = scalePx(p, options, TITLE_SIZE, 12, 18);
      const axisLabelSize = scalePx(p, options, AXIS_LABEL_SIZE, 10, 16);
      const searchWidth = Math.min(scalePx(p, options, TABLE_SEARCH_WIDTH, 110, 220), Math.max(110, Math.floor(w * 0.7)));
      const arrowSize = scalePx(p, options, TABLE_ARROW_SIZE, 18, 28);

      // Search input
      if (searchable) {
          if (!p.chart.inputs[id]) {
              let inp = p.createInput('');
              inp.position(x, y + 400);
              inp.attribute('placeholder', 'Search...');
              inp.style('padding', '4px 8px');
              inp.style('font-family', 'sans-serif');
            inp.style('font-size', axisLabelSize + 'px');
            inp.style('width', searchWidth + 'px');
              inp.style('border', '1px solid #ccc');
              inp.style('border-radius', '3px');
              p.chart.inputs[id] = inp;
          }
      }

      // Filter rows
      const search = searchable && p.chart.inputs[id] ? p.chart.inputs[id].value().toLowerCase() : '';
      let rows = df.rows;
      if (search) rows = rows.filter(r => Object.values(r).some(v => String(v).toLowerCase().includes(search)));

      // Sort
      if (sortable && state.sortColumn) {
        const sortCol = state.sortColumn;
        const dir = state.sortDirection === 'desc' ? -1 : 1;
        const isNil = (v) => v === null || v === undefined || v === '';
        const toNumberOrNull = (v) => {
          if (typeof v === 'number') return Number.isFinite(v) ? v : null;
          if (typeof v === 'string') {
            const n = Number(v);
            return Number.isFinite(n) ? n : null;
          }
          return null;
        };
        rows = rows.slice().sort((a, b) => {
          const av = a[sortCol];
          const bv = b[sortCol];
          const aNil = isNil(av);
          const bNil = isNil(bv);
          if (aNil && bNil) return 0;
          if (aNil) return 1;
          if (bNil) return -1;

          const an = toNumberOrNull(av);
          const bn = toNumberOrNull(bv);
          if (an !== null && bn !== null) {
            if (an === bn) return 0;
            return an < bn ? -1 * dir : 1 * dir;
          }

          const as = String(av).toLowerCase();
          const bs = String(bv).toLowerCase();
          if (as === bs) return 0;
          return as < bs ? -1 * dir : 1 * dir;
        });
      }

      let maxRows = options.maxRows || TABLE_MAX_ROWS;

      // Auto-fit table
      if (options.responsive !== false) {
        const bottomChrome = scalePx(p, options, 90, 70, 140);
        const availableH = p.height - y - bottomChrome;
        if (availableH > 0) {
          const fitRows = Math.max(1, Math.floor(availableH / rowH) - 1);
          maxRows = Math.min(maxRows, fitRows);
          if ((maxRows + 1) * rowH > availableH) {
            rowH = Math.max(18, Math.floor(availableH / (maxRows + 1)));
          }
        }
      }
      const totalPages = Math.ceil(rows.length / maxRows);
      const currentPage = Math.min(state.currentPage, totalPages - 1);
      state.currentPage = Math.max(0, currentPage);

      const startIdx = state.currentPage * maxRows;
      const endIdx = Math.min(startIdx + maxRows, rows.length);
      const dispRows = rows.slice(startIdx, endIdx);
      const cols = df.columns;

      const colW = w / cols.length;

      // Search input
      if (searchable && p.chart.inputs[id]) {
          const tableBottom = y + (dispRows.length + 1) * rowH;
          const m = getCanvasDisplayMetrics(p);
          const pageX = m.left + x * (m.width && p.width ? (m.width / p.width) : 1);
          const pageY = m.top + (tableBottom + scalePx(p, options, 15, 10, 22)) * (m.height && p.height ? (m.height / p.height) : 1);
          p.chart.inputs[id].position(pageX, pageY);
          p.chart.inputs[id].style('font-size', axisLabelSize + 'px');
          const widthScale = m.width && p.width ? (m.width / p.width) : 1;
          p.chart.inputs[id].style('width', Math.max(90, Math.round(searchWidth * widthScale)) + 'px');
      }

      // Interactive hover
      let hoveredCell = null;
      const mx = p.mouseX - x;
      const my = p.mouseY - y;

      if (mx >= 0 && mx <= w && my >= 0 && my <= (dispRows.length + 1) * rowH) {
          const hovCol = Math.floor(mx / colW);
          const hovRow = Math.floor(my / rowH);
          if (hovCol >= 0 && hovCol < cols.length && hovRow >= 0 && hovRow <= dispRows.length) {
              hoveredCell = { row: hovRow, col: hovCol };
          }
      }

      // Header click-to-sort
      const mouseJustPressed = p.mouseIsPressed && !state._mouseWasPressed;
      const mouseJustReleased = !p.mouseIsPressed && state._mouseWasPressed;
      if (mouseJustPressed) state._mouseWasPressed = true;
      if (mouseJustReleased) state._mouseWasPressed = false;

      if (sortable && mouseJustPressed && hoveredCell && hoveredCell.row === 0) {
        const clickedColName = cols[hoveredCell.col];
        if (state.sortColumn !== clickedColName) {
          state.sortColumn = clickedColName;
          state.sortDirection = 'asc';
        } else {
          if (state.sortDirection === 'asc') {
            state.sortDirection = 'desc';
          } else if (state.sortDirection === 'desc') {
            state.sortColumn = null;
            state.sortDirection = 'asc';
          } else {
            state.sortDirection = 'asc';
          }
        }
        state.currentPage = 0;
        if (options.onPageChange) options.onPageChange(state.currentPage);
      }

      const tooltipMsg = options.tooltip;

      // Colors
      const headerColor = options.headerColor || p.color(TABLE_HEADER_COLOR);
      const rowColor1 = options.rowColor1 || p.color(TABLE_ROW_COLOR_1);
      const rowColor2 = options.rowColor2 || p.color(TABLE_ROW_COLOR_2);
      const hoverColor = options.hoverColor || p.color(TABLE_HOVER_COLOR);
      const borderColor = options.borderColor || p.color(TABLE_BORDER_COLOR);

      // Draw title/subtitles
      const metaOpts = Object.assign({}, options);
      if (metaOpts.title === undefined) metaOpts.title = 'Data Table';
      if (metaOpts.subtitle === undefined) metaOpts.subtitle = fn.chart.defaultSubtitle;

      // Draw table
      p.push();
      p.translate(x, y);
      drawMeta(p, metaOpts, w, (dispRows.length + 1) * rowH);
        p.fill(headerColor); p.noStroke(); p.rect(0, 0, w, rowH);

        let headerTextColor;
        if (typeof headerColor === 'number') {
            headerTextColor = headerColor > 128 ? 0 : 255;
        } else {
            let r = p.red(headerColor);
            let g = p.green(headerColor);
            let b = p.blue(headerColor);
            let luminance = 0.299 * r/255 + 0.587 * g/255 + 0.114 * b/255;
            headerTextColor = luminance > 0.6 ? 0 : 255;
        }

        p.fill(headerTextColor); p.textAlign(p.LEFT, p.CENTER); p.textStyle(p.NORMAL); p.textFont(DEFAULT_FONT);
        p.textSize(tableTextSize);
        cols.forEach((c, i) => {
            if (hoveredCell && hoveredCell.row === 0 && hoveredCell.col === i) {
                p.fill(p.lerpColor(headerColor, p.color(200), 0.3)); p.rect(i*colW, 0, colW, rowH);
            }
            p.fill(headerTextColor);

            const activeSort = sortable && state.sortColumn === c;
            const rightGutter = activeSort ? 18 : 6;
            p.text(truncate(p, c, colW - 10 - rightGutter), i*colW + 5, rowH/2);

            if (activeSort) {
              p.push();
              p.noStroke();
              p.fill(80);
              const cx = i * colW + colW - 10;
              const cy = rowH / 2;
              if (state.sortDirection === 'asc') {
                p.triangle(cx - 4, cy + 3, cx + 4, cy + 3, cx, cy - 4);
              } else {
                p.triangle(cx - 4, cy - 3, cx + 4, cy - 3, cx, cy + 4);
              }
              p.pop();
            }
        });

        // Data rows
        p.textStyle(p.NORMAL);
        dispRows.forEach((r, i) => {
          let ry = (i+1)*rowH;
          let bg = i % 2 === 0 ? rowColor1 : rowColor2;

          if (hoveredCell && hoveredCell.row === i + 1) {
              bg = p.lerpColor(bg, hoverColor, 0.3);
          }

          p.fill(bg); p.rect(0, ry, w, rowH);

          let cellTextColor;
          if (typeof bg === 'number') {
              cellTextColor = bg > 128 ? 0 : 255;
          } else {
              let r = p.red(bg);
              let g = p.green(bg);
              let b = p.blue(bg);
              let luminance = 0.299 * r/255 + 0.587 * g/255 + 0.114 * b/255;
              cellTextColor = luminance > 0.6 ? 0 : 255;
          }

          p.fill(cellTextColor);

          // Draw cell values
          cols.forEach((c, j) => {
              const cellValue = r[c];
              const isNaN = cellValue === null || cellValue === '' || cellValue === undefined ||
                           (typeof cellValue === 'number' && Number.isNaN(cellValue));
              const showNaNIndicator = options.nanIndicator !== false;

              if (hoveredCell && hoveredCell.row === i + 1 && hoveredCell.col === j) {
                  let content;
                  if (typeof options.tooltip === 'function') {
                    content = options.tooltip(r[c], r, c, {row: i, col: j});
                    if (!Array.isArray(content)) content = [String(content)];
                  } else {
                    let tooltipCols = options.tooltipColumns || fn.chart.defaultTooltipColumns;
                    if (Array.isArray(tooltipCols)) {
                      content = tooltipCols.map(tc => {
                        let v = r[tc.col];
                        let label = tc.label || tc.col;
                        return (v !== undefined) ? `${label}: ${v}` : null;
                      }).filter(x => x !== null);
                      if (content.length === 0) content = [`${c}: ${r[c]}`];
                    } else {
                      content = [`${c}: ${r[c]}`];
                    }
                  }
                  const tooltipMsg = content.join('\n');
                  p.push();
                  const tooltipW = measureText(p, tooltipMsg) + 20;
                  const tooltipH = 25;
                  const tooltipX = j*colW + colW/2 - tooltipW/2;
                  const tooltipY = ry - tooltipH - 5;
                  p.fill(50, 50, 50, 230);
                  p.noStroke();
                  p.rect(tooltipX, tooltipY, tooltipW, tooltipH, 4);
                  p.fill(255);
                  p.textAlign(p.CENTER, p.CENTER);
                  p.text(tooltipMsg, tooltipX + tooltipW/2, tooltipY + tooltipH/2);
                  p.pop();
              }

              // NaN
              if (isNaN && showNaNIndicator) {
                  p.fill(220, 220, 220, 100);
                  p.noStroke();
                  p.rect(j*colW + 1, ry + 1, colW - 2, rowH - 2);

                  p.fill(150, 150, 150);
                  p.textStyle(p.ITALIC);
                  p.text('—', j*colW + 5, ry + rowH/2);
                  p.textStyle(p.NORMAL);
              } else {
                  p.fill(cellTextColor);
                  p.text(truncate(p, cellValue, colW-10), j*colW + 5, ry + rowH/2);
              }
          });
        });
      p.stroke(borderColor); p.noFill(); p.rect(0, 0, w, (dispRows.length + 1) * rowH);
      p.pop();

      // Pagination
      if (pagination && totalPages > 1) {
          const tableBottom = y + (dispRows.length + 1) * rowH;
          const paginationY = tableBottom + 15;
          const paginationX = x + w;

          p.push();
          p.textFont(DEFAULT_FONT);
          p.textSize(tableTextSize);

          // Arrows
          const spacing = scalePx(p, options, 5, 3, 8);
          const pageTextWidth = scalePx(p, options, 50, 40, 70);

          // Page text
          const pageText = `${state.currentPage + 1} of ${totalPages}`;
          const textX = paginationX - arrowSize - spacing - pageTextWidth/2;
          const prevX = paginationX - arrowSize * 2 - spacing * 2 - pageTextWidth;
          const nextX = paginationX - arrowSize;

          // Hover
          const hoverPrev = p.mouseX > prevX && p.mouseX < prevX + arrowSize &&
                           p.mouseY > paginationY && p.mouseY < paginationY + arrowSize;
          const hoverNext = p.mouseX > nextX && p.mouseX < nextX + arrowSize &&
                           p.mouseY > paginationY && p.mouseY < paginationY + arrowSize;

          // Previous Arrows
          if (state.currentPage > 0) {
              p.fill(hoverPrev ? p.color(150, 180, 255) : p.color(100, 150, 255));
          } else {
              p.fill(220);
          }
          p.noStroke();
          p.rect(prevX, paginationY, arrowSize, arrowSize, 3);
          p.fill(255);
          p.triangle(prevX + 8, paginationY + 12,
                    prevX + 16, paginationY + 6,
                    prevX + 16, paginationY + 18);

          // Page text
          p.fill(100);
          p.textAlign(p.CENTER, p.CENTER);
          p.text(pageText, textX, paginationY + arrowSize/2);

          // Next arrow button
          if (state.currentPage < totalPages - 1) {
              p.fill(hoverNext ? p.color(150, 180, 255) : p.color(100, 150, 255));
          } else {
              p.fill(220);
          }
          p.rect(nextX, paginationY, arrowSize, arrowSize, 3);
          // Draw right arrow
          p.fill(255);
          p.triangle(nextX + 16, paginationY + 12,
                    nextX + 8, paginationY + 6,
                    nextX + 8, paginationY + 18);

          p.pop();

          // Clicks
          if (p.mouseIsPressed && p.frameCount % 10 === 0) {
              if (hoverPrev && state.currentPage > 0) {
                  state.currentPage--;
                  if (options.onPageChange) options.onPageChange(state.currentPage);
              } else if (hoverNext && state.currentPage < totalPages - 1) {
                  state.currentPage++;
                  if (options.onPageChange) options.onPageChange(state.currentPage);
              }
          }

          // Keyboard
          if (p.keyIsPressed) {
              if (p.keyIsDown(p.LEFT_ARROW) && state.currentPage > 0 && p.frameCount % 10 === 0) {
                  state.currentPage--;
                  if (options.onPageChange) options.onPageChange(state.currentPage);
              } else if (p.keyIsDown(p.RIGHT_ARROW) && state.currentPage < totalPages - 1 && p.frameCount % 10 === 0) {
                  state.currentPage++;
                  if (options.onPageChange) options.onPageChange(state.currentPage);
              }
          }
      }
  };

  /* 9. GEO MAP (OpenStreetMap Integration) */

  function cleanupGeoHandlers(chart) {
    const registration = chart && chart._geoHandlers;
    if (!registration) return;

    registration.listeners.forEach(({ target, type, listener, options }) => {
      try {
        target.removeEventListener(type, listener, options);
      } catch (e) {
        // ignore
      }
    });
    chart._geoHandlers = null;
  }

  function bindGeoHandlers(p, state, canvas, getCoords) {
    if (!canvas) return;
    const chart = p.chart;
    if (chart._geoHandlers && chart._geoHandlers.canvas === canvas) return;

    cleanupGeoHandlers(chart);
    const view = canvas.ownerDocument && canvas.ownerDocument.defaultView
      ? canvas.ownerDocument.defaultView
      : window;
    const signal = compatibility.removalSignal(p);
    const listeners = [];
    const add = (target, type, listener, options = {}) => {
      const withSignal = signal ? { ...options, signal } : options;
      target.addEventListener(type, listener, withSignal);
      listeners.push({ target, type, listener, options: withSignal });
    };
    const isOverCanvas = event => {
      const point = getCoords(event);
      return point.x >= 0 && point.x <= p.width && point.y >= 0 && point.y <= p.height;
    };
    const press = event => {
      if (!state.interaction || !isOverCanvas(event)) return;
      const point = getCoords(event);
      state.interaction.press(point.x, point.y);
    };
    const move = event => {
      if (!state.interaction || !state.isDragging) return;
      const point = getCoords(event);
      state.interaction.move(point.x, point.y);
    };
    const release = () => {
      if (state.interaction) state.interaction.release();
    };
    const wheel = event => {
      if (!state.interaction || !isOverCanvas(event)) return;
      const handled = state.interaction.wheel(event);
      if (handled) event.preventDefault();
    };

    add(canvas, 'wheel', wheel, { passive: false });
    if (typeof view.PointerEvent === 'function') {
      add(canvas, 'pointerdown', press);
      add(view, 'pointermove', move);
      add(view, 'pointerup', release);
      add(view, 'pointercancel', release);
    } else {
      add(canvas, 'mousedown', press);
      add(view, 'mousemove', move);
      add(view, 'mouseup', release);
    }

    chart._geoHandlers = { canvas, listeners };
  }

  /**
  * Creates a geo chart with geographic points
   * NaN Handling: Points with NaN in lat/lon are SKIPPED (not drawn).
   * A warning is logged showing how many points were skipped.
   * Set nanPolicy: 'silent' to suppress warnings, or 'strict' to throw an error.
   */
  fn.geo = function(data, options = {}) {
      const p = this;
      ensureCanvasMatchesDisplay(p, options);
      let df = (data instanceof p.chart.DataFrame) ? data : new p.chart.DataFrame(data);

      const getCanvasCoordsFromEvent = (e) => {
        const elt = getCanvasElement(p);
        if (!elt || !e) return { x: p.mouseX, y: p.mouseY };
        const rect = elt.getBoundingClientRect();
        const scaleX = rect.width ? (p.width / rect.width) : 1;
        const scaleY = rect.height ? (p.height / rect.height) : 1;
        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;
        return { x, y };
      };

      // Columns
      const latCol = options.lat || options.latitude || 'lat';
      const lonCol = options.lon || options.longitude || 'lon';
      const labelCol = options.label || 'label';
      const valueCol = options.value || 'value';

      // Validate
      const validation = validateData(df, [latCol, lonCol], options, 'geo');

      let autoCenterLat = 37.8;
      let autoCenterLon = -96;
      let autoZoom = GEO_DEFAULT_ZOOM;

      const lats = df.col(latCol).map(Number).filter(v => !isNaN(v));
      const lons = df.col(lonCol).map(Number).filter(v => !isNaN(v));

      if (lats.length > 0 && lons.length > 0) {
          const minLat = Math.min(...lats);
          const maxLat = Math.max(...lats);
          const minLon = Math.min(...lons);
          const maxLon = Math.max(...lons);

          autoCenterLat = (minLat + maxLat) / 2;
          autoCenterLon = (minLon + maxLon) / 2;

          const latRange = maxLat - minLat;
          const lonRange = maxLon - minLon;

          const WORLD_DIM = { height: 256, width: 256 };
          const zoomLat = Math.floor(Math.log2(p.height * 0.85 / (latRange * WORLD_DIM.height / 180)));
          const zoomLon = Math.floor(Math.log2(p.width * 0.85 / (lonRange * WORLD_DIM.width / 360)));
          autoZoom = Math.min(Math.max(Math.min(zoomLat, zoomLon), 2), 18);
      }

      // Geo state
        if (!p.chart._geoState) {
          p.chart._geoState = {
              centerLat: options.centerLat || autoCenterLat,
              centerLon: options.centerLon || autoCenterLon,
              zoom: options.zoom || autoZoom,
              tiles: {},
              hoveredPoint: null,
              isDragging: false,
              dragStartX: 0,
              dragStartY: 0,
              dragStartLat: 0,
            dragStartLon: 0,
            _lastCanvasW: p.width,
              _lastCanvasH: p.height,
              _userZoom: false,
              _needsTileReload: false
          };
      }
      const state = p.chart._geoState;

        // If the canvas size changes adjust zoom.
        if (options.zoom === undefined) {
          const sizeChanged = state._lastCanvasW !== p.width || state._lastCanvasH !== p.height;
          if (sizeChanged) {
              if (!state._userZoom) {
                state.zoom = autoZoom;
              }
              state.tiles = {};
            state._lastCanvasW = p.width;
            state._lastCanvasH = p.height;
            state._needsTileReload = true;
          }
        }

      // Style options
      const _responsiveScale = getResponsiveScale(p, options);
      const pointColor = options.pointColor || p.color(GEO_POINT_COLOR);
      const pointSize = options.pointSize || scalePx(p, options, GEO_POINT_SIZE, 8, 16);
      const showLabels = options.showLabels !== false;
      const showControls = options.showControls !== false;

      // Helper: Convert lat/lon to pixel coordinates
      const latLonToPixel = (lat, lon) => {
          let x = (lon + 180) / 360 * Math.pow(2, state.zoom) * 256;
          let latRad = lat * p.PI / 180;
          let y = (1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / p.PI) / 2 * Math.pow(2, state.zoom) * 256;

          let centerX = (state.centerLon + 180) / 360 * Math.pow(2, state.zoom) * 256;
          let centerLatRad = state.centerLat * p.PI / 180;
          let centerY = (1 - Math.log(Math.tan(centerLatRad) + 1 / Math.cos(centerLatRad)) / p.PI) / 2 * Math.pow(2, state.zoom) * 256;

          return {
              x: p.width / 2 + (x - centerX),
              y: p.height / 2 + (y - centerY)
          };
      };

      // Helper: Convert pixel coordinates to lat/lon
      const pixelToLatLon = (x, y) => {
          let centerX = (state.centerLon + 180) / 360 * Math.pow(2, state.zoom) * 256;
          let centerLatRad = state.centerLat * p.PI / 180;
          let centerY = (1 - Math.log(Math.tan(centerLatRad) + 1 / Math.cos(centerLatRad)) / p.PI) / 2 * Math.pow(2, state.zoom) * 256;

          let worldX = centerX + (x - p.width / 2);
          let worldY = centerY + (y - p.height / 2);

          let lon = worldX / (Math.pow(2, state.zoom) * 256) * 360 - 180;
          let n = p.PI - 2 * p.PI * worldY / (Math.pow(2, state.zoom) * 256);
          let lat = 180 / p.PI * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));

          return { lat, lon };
      };

      // Helper: Load visible tiles
      const loadVisibleTiles = () => {
          let tileSize = 256;
          let numTiles = Math.pow(2, state.zoom);

          let centerTileX = Math.floor((state.centerLon + 180) / 360 * numTiles);
          let centerTileY = Math.floor((1 - Math.log(Math.tan(state.centerLat * p.PI / 180) + 1 / Math.cos(state.centerLat * p.PI / 180)) / p.PI) / 2 * numTiles);

          let tilesWide = Math.ceil(p.width / tileSize) + 2;
          let tilesHigh = Math.ceil(p.height / tileSize) + 2;

          for (let x = -tilesWide; x <= tilesWide; x++) {
              for (let y = -tilesHigh; y <= tilesHigh; y++) {
                  let tileX = (centerTileX + x + numTiles) % numTiles;
                  let tileY = centerTileY + y;
                  if (tileY >= 0 && tileY < numTiles) {
                      let key = `${state.zoom}/${tileX}/${tileY}`;
                      const current = state.tiles[key];
                      if (!current || (current.status === 'failed' && Date.now() >= current.retryAt)) {
                          let url = `https://tile.openstreetmap.org/${state.zoom}/${tileX}/${tileY}.png`;
                          const entry = {
                            status: 'pending',
                            img: null,
                            retryAt: 0,
                            attempts: current ? current.attempts + 1 : 1
                          };
                          state.tiles[key] = entry;
                          try {
                            compatibility.loadImage(p, url, img => {
                              if (state.tiles[key] !== entry) return;
                              entry.img = img;
                              entry.status = 'loaded';
                            }, error => {
                              if (state.tiles[key] !== entry) return;
                              entry.status = 'failed';
                              entry.error = error;
                              entry.retryAt = Date.now() + 1000;
                            });
                          } catch (error) {
                            entry.status = 'failed';
                            entry.error = error;
                            entry.retryAt = Date.now() + 1000;
                          }
                      }
                  }
              }
          }
      };

      // Helper: Draw tiles
      const drawTiles = () => {
          let tileSize = 256;
          let numTiles = Math.pow(2, state.zoom);

          let centerTileX = Math.floor((state.centerLon + 180) / 360 * numTiles);
          let centerTileY = Math.floor((1 - Math.log(Math.tan(state.centerLat * p.PI / 180) + 1 / Math.cos(state.centerLat * p.PI / 180)) / p.PI) / 2 * numTiles);

          let centerPixelX = (state.centerLon + 180) / 360 * numTiles * tileSize;
          let centerPixelY = (1 - Math.log(Math.tan(state.centerLat * p.PI / 180) + 1 / Math.cos(state.centerLat * p.PI / 180)) / p.PI) / 2 * numTiles * tileSize;

          let offsetX = p.width / 2 - centerPixelX;
          let offsetY = p.height / 2 - centerPixelY;

          for (let key in state.tiles) {
              if (state.tiles[key].img) {
                  let parts = key.split('/');
                  let z = parseInt(parts[0]);
                  let x = parseInt(parts[1]);
                  let y = parseInt(parts[2]);

                  if (z === state.zoom) {
                      let px = x * tileSize + offsetX;
                      let py = y * tileSize + offsetY;
                      p.image(state.tiles[key].img, px, py);
                  }
              }
          }
      };

      state._needsTileReload = false;
      loadVisibleTiles();

      // Draw geo chart
      p.push();
      drawTiles();

      // Draw data points
      state.hoveredPoint = null;
      p.noStroke();

      df.rows.forEach(row => {
          let lat = Number(row[latCol]);
          let lon = Number(row[lonCol]);

          if (isNaN(lat) || isNaN(lon)) return;

          let pos = latLonToPixel(lat, lon);

          if (pos.x >= 0 && pos.x <= p.width && pos.y >= 0 && pos.y <= p.height) {
              let d = p.dist(p.mouseX, p.mouseY, pos.x, pos.y);
              let isHovered = d < pointSize;

              if (isHovered) {
                  state.hoveredPoint = { row, pos, labelCol, valueCol };
              }

              const r = p.red(pointColor);
              const g = p.green(pointColor);
              const b = p.blue(pointColor);

              p.fill(r, g, b, isHovered ? 255 : HOVER_ALPHA);
              p.ellipse(pos.x, pos.y, isHovered ? pointSize * GEO_POINT_HOVER_SCALE : pointSize, isHovered ? pointSize * GEO_POINT_HOVER_SCALE : pointSize);
              p.fill(255);
              p.ellipse(pos.x, pos.y, isHovered ? pointSize * 0.5 : pointSize * 0.33, isHovered ? pointSize * 0.5 : pointSize * 0.33);

              if (showLabels && row[labelCol]) {
                  p.fill(0);
                  p.textAlign(p.CENTER, p.BOTTOM);
                  p.textSize(scalePx(p, options, GEO_LABEL_SIZE, 9, 14));
                  p.text(row[labelCol], pos.x, pos.y - (isHovered ? pointSize * 0.6 : pointSize * 0.5));
              }
          }
      });

      // Draw tooltip
      if (state.hoveredPoint) {
          p.cursor(p.HAND);
          let h = state.hoveredPoint;
          let lines = [];
          let tooltipCols = options.tooltipColumns || fn.chart.defaultTooltipColumns;
          if (Array.isArray(tooltipCols)) {
            lines = tooltipCols.map(tc => {
              let v = h.row[tc.col];
              let label = tc.label || tc.col;
              if (v !== undefined) return `${label}: ${v}`;
              if (tc.col === latCol) return `${label}: ${Number(h.row[latCol]).toFixed(4)}`;
              if (tc.col === lonCol) return `${label}: ${Number(h.row[lonCol]).toFixed(4)}`;
              return null;
            }).filter(x => x !== null);
            if (lines.length === 0) {
              if (h.row[labelCol]) lines.push(String(h.row[labelCol]));
              if (h.row[valueCol]) lines.push(`${valueCol}: ${Number(h.row[valueCol]).toLocaleString()}`);
              lines.push(`Lat: ${Number(h.row[latCol]).toFixed(4)}, Lon: ${Number(h.row[lonCol]).toFixed(4)}`);
            }
          } else {
            if (h.row[labelCol]) lines.push(String(h.row[labelCol]));
            if (h.row[valueCol]) lines.push(`${valueCol}: ${Number(h.row[valueCol]).toLocaleString()}`);
            lines.push(`Lat: ${Number(h.row[latCol]).toFixed(4)}, Lon: ${Number(h.row[lonCol]).toFixed(4)}`);
          }

          const tipTextSize = scalePx(p, options, TOOLTIP_TEXT_SIZE, 10, 14);
          const tipPad = scalePx(p, options, TOOLTIP_PADDING, 6, 14);
          const tipLineH = scalePx(p, options, TOOLTIP_LINE_HEIGHT, 12, 22);
          const tipOffset = scalePx(p, options, TOOLTIP_OFFSET, 10, 18);
          const tipRadius = scalePx(p, options, TOOLTIP_BORDER_RADIUS, 3, 6);

          p.textSize(tipTextSize);
          let maxWidth = 0;
          lines.forEach(l => { maxWidth = Math.max(maxWidth, measureText(p, l)); });
          let boxW = maxWidth + (tipPad * 2);
          let boxH = lines.length * tipLineH + tipPad;

          let tx = p.mouseX + tipOffset;
          let ty = p.mouseY + tipOffset;
          if (tx + boxW > p.width) tx = p.mouseX - boxW - tipOffset;
          if (ty + boxH > p.height) ty = p.mouseY - boxH - tipOffset;

          p.noStroke();
          p.fill(0, 0, 0, 220);
          p.rect(tx, ty, boxW, boxH, tipRadius);
          p.fill(255);
          p.textAlign(p.LEFT, p.TOP);
          lines.forEach((l, i) => p.text(l, tx + tipPad, ty + scalePx(p, options, 8, 6, 10) + i * tipLineH));
      } else {
          p.cursor(p.ARROW);
      }

      // Draw controls
      if (showControls) {
          p.fill(255, 240);
          p.noStroke();
          const pad = scalePx(p, options, 10, 6, 14);
          const boxW = scalePx(p, options, 150, 120, 200);
          const boxH = scalePx(p, options, 60, 48, 90);
          p.rect(pad, pad, boxW, boxH, scalePx(p, options, 5, 3, 8));
          p.fill(0);
          p.textAlign(p.LEFT, p.TOP);
          p.textSize(scalePx(p, options, AXIS_LABEL_SIZE, 10, 16));
          p.text('Drag: Pan', pad + scalePx(p, options, 5, 3, 8), pad + scalePx(p, options, 5, 3, 8));
          p.text('Scroll: Zoom', pad + scalePx(p, options, 5, 3, 8), pad + scalePx(p, options, 22, 16, 34));
          p.text(`Zoom: ${state.zoom}`, pad + scalePx(p, options, 5, 3, 8), pad + scalePx(p, options, 39, 28, 58));
      }

      p.pop();

      state.interaction = {
        press(x, y) {
          if (x >= 0 && x <= p.width && y >= 0 && y <= p.height) {
            state.isDragging = true;
            state.dragStartX = x;
            state.dragStartY = y;
            state.dragStartLat = state.centerLat;
            state.dragStartLon = state.centerLon;
          }
        },
        release() {
          state.isDragging = false;
        },
        move(x, y) {
          if (!state.isDragging) return;

            let startLatLon = pixelToLatLon(state.dragStartX, state.dragStartY);
            let endLatLon = pixelToLatLon(x, y);

            let deltaLat = startLatLon.lat - endLatLon.lat;
            let deltaLon = startLatLon.lon - endLatLon.lon;

            state.centerLat = Math.max(-85, Math.min(85, state.dragStartLat + deltaLat));
            state.centerLon = state.dragStartLon + deltaLon;
            while (state.centerLon < -180) state.centerLon += 360;
            while (state.centerLon > 180) state.centerLon -= 360;
            loadVisibleTiles();
        },
        wheel(event) {
          const delta = (event && (event.delta !== undefined
            ? event.delta
            : (event.deltaY !== undefined ? event.deltaY : 0))) || 0;
          const previous = state.zoom;
          if (delta > 0) {
            state.zoom = Math.max(2, state.zoom - 1);
          } else if (delta < 0) {
            state.zoom = Math.min(18, state.zoom + 1);
          }
          if (state.zoom !== previous) {
            state._userZoom = true;
            state.tiles = {};
            loadVisibleTiles();
            return true;
          }
          return false;
        }
      };

      bindGeoHandlers(p, state, getCanvasElement(p), getCanvasCoordsFromEvent);
  };

  /* 10. EXPORT UTILITIES */

  /**
   * Export current canvas as PNG image
   * @param {string} filename - Name of file (default: 'chart.png')
   */
  fn.toPNG = function(filename = 'chart.png') {
    const p = this;

    if (!filename.endsWith('.png')) {
      filename += '.png';
    }
    p.save(filename);
  };

  /**
   * Export table data as CSV file
   * Works for table visualizations
   * @param {DataFrame|Array|Object} data - The data to export (DataFrame, array of objects, or 2D array)
   * @param {string} filename - Name of the file (default: 'data.csv')
   * @param {Object} options - Export options
   *   - columns: Array of column names to include (default: all columns)
   *   - delimiter: Character to use as delimiter (default: ',')
   *   - includeHeader: Whether to include header row (default: true)
   */
  fn.toCSV = function(data, filename = 'data.csv', options = {}) {
    const p = this;

    // Ensure filename has .csv extension
    if (!filename.endsWith('.csv')) {
      filename += '.csv';
    }

    // Convert data to DataFrame if not already
    let df;
    if (data instanceof p.chart.DataFrame) {
      df = data;
    } else if (Array.isArray(data)) {
      df = new p.chart.DataFrame(data);
    } else {
      console.error('toCSV: Data must be a DataFrame, array of objects, or 2D array');
      return;
    }

    const delimiter = options.delimiter || ',';
    const includeHeader = options.includeHeader !== false;
    const columns = options.columns || df.columns;

    let csvContent = '';

    if (includeHeader) {
      csvContent += columns.map(col => escapeCSVField(col, delimiter)).join(delimiter) + '\n';
    }

    // Data
    const rows = df.rows;
    rows.forEach(row => {
      const rowValues = columns.map(col => {
        const value = row[col];
        if (value === null || value === undefined ||
            (typeof value === 'number' && isNaN(value))) {
          return '';
        }
        return escapeCSVField(String(value), delimiter);
      });
      csvContent += rowValues.join(delimiter) + '\n';
    });

    // Download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');

    if (link.download !== undefined) {
      // Feature detection for download
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } else {
      console.error('toCSV: Browser does not support download attribute');
    }
  };

  /**
   * Helper function to escape CSV field values
   * Handles quotes, commas, and newlines properly
   */
  function escapeCSVField(field, delimiter = ',') {
    field = String(field);

    if (field.includes(delimiter) || field.includes('"') || field.includes('\n') || field.includes('\r')) {
      field = field.replace(/"/g, '""');
      return `"${field}"`;
    }

    return field;
  }

  function cleanupInstance(p) {
    const chart = instanceCharts.get(p);
    if (!chart) return;

    Object.keys(chart.inputs || {}).forEach(id => {
      const input = chart.inputs[id];
      if (input && typeof input.remove === 'function') input.remove();
    });
    chart.inputs = {};
    cleanupGeoHandlers(chart);
    if (chart._geoState) {
      chart._geoState.isDragging = false;
      chart._geoState.interaction = null;
      chart._geoState.tiles = {};
    }
    instanceCharts.delete(p);
  }

  lifecycles.postdraw = function() {
    if (instanceCharts.has(this)) drawTooltip(this);
  };
  lifecycles.remove = function() {
    cleanupInstance(this);
  };
}

export function installP5ChartAddon(p5Constructor) {
  if (!p5Constructor || !p5Constructor.prototype) return false;
  const fn = p5Constructor.prototype;
  if (fn[INSTALL_MARKER]) return false;

  if (typeof p5Constructor.registerAddon === 'function') {
    p5Constructor.registerAddon(p5ChartAddon);
    return true;
  }

  const lifecycles = {};
  p5ChartAddon(p5Constructor, fn, lifecycles);
  if (typeof fn.registerMethod === 'function') {
    if (typeof lifecycles.postdraw === 'function') {
      fn.registerMethod('post', lifecycles.postdraw);
    }
    if (typeof lifecycles.remove === 'function') {
      fn.registerMethod('remove', lifecycles.remove);
    }
  }
  return true;
}

const globalP5 = typeof globalThis !== 'undefined' ? globalThis.p5 : undefined;
if (globalP5) installP5ChartAddon(globalP5);

export default p5ChartAddon;
