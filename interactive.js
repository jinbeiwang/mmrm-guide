/* ============================================
   MMRM Interactive Demos — v2.0
   6 demos: CovMatrix, MatMult, MissingData,
   ParamCurve, DataCode, ModelBuilder
   ============================================ */

/* ==========================================
   DEMO 1: Covariance Matrix Visualizer
   ========================================== */
(function () {
  var demo = document.getElementById('covDemo');
  if (!demo) return;

  var typeSelect = document.getElementById('covType');
  var visitsRange = document.getElementById('covVisits');
  var visitsVal = document.getElementById('covVisitsVal');
  var rhoRange = document.getElementById('covRho');
  var rhoVal = document.getElementById('covRhoVal');
  var infoEl = document.getElementById('covInfo');
  var matrixEl = document.getElementById('covMatrix');

  var paramInfo = {
    UN:   { name: 'Unstructured',    params: function(t) { return t*(t+1)/2; }, desc: 'Each variance and covariance freely estimated' },
    CS:   { name: 'Compound Symmetry', params: function() { return 2; }, desc: 'Common variance + common covariance' },
    AR1:  { name: 'AR(1)',            params: function() { return 2; }, desc: 'Correlation decays geometrically with lag' },
    TOEP: { name: 'Toeplitz',         params: function(t) { return t; }, desc: 'Same-lag covariances shared' },
    CSH:  { name: 'Heterogeneous CS', params: function(t) { return t+1; }, desc: 'Different variances, common covariance' },
    ARH1: { name: 'Heterogeneous AR(1)', params: function(t) { return t+1; }, desc: 'Different variances, AR(1) correlation' },
    SPPOW:{ name: 'Spatial Power',         params: function() { return 2; }, desc: 'rho^|t_i - t_j| on real visit times; handles unequal visit spacing' }
  };

  // SP(POW) 的演示访视计划（周）；不等距是它与 AR(1) 的关键区别
  var SPPOW_WEEK = [2, 4, 8, 12, 16, 20, 24, 28, 32, 36, 40, 44];

  function sppowInfo(t) {
    var wk = SPPOW_WEEK.slice(0, t);
    return 'SP(POW)：示例访视周次 ' + wk.join('/') + '，相关 = ρ^(|tᵢ−tⱼ|/2)（以 2 周为 1 个时间单位）';
  }

  function generateMatrix(type, t, rho) {
    var m = [];
    for (var i = 0; i < t; i++) {
      m[i] = [];
      for (var j = 0; j < t; j++) {
        if (i === j) {
          m[i][j] = 1;
        } else {
          var lag = Math.abs(i - j);
          switch (type) {
            case 'UN':   m[i][j] = +(rho * (0.7 + 0.3 * Math.sin(i * j * 0.5))).toFixed(2); break;
            case 'CS':   m[i][j] = +rho.toFixed(2); break;
            case 'AR1':  m[i][j] = +Math.pow(rho, lag).toFixed(3); break;
            case 'TOEP': m[i][j] = +(rho * Math.pow(0.85, lag - 1)).toFixed(3); break;
            case 'CSH':  m[i][j] = +(rho * Math.sqrt((1 + 0.1*i) * (1 + 0.1*j))).toFixed(3); break;
            case 'ARH1': m[i][j] = +(Math.pow(rho, lag) * Math.sqrt((1+0.1*i)*(1+0.1*j))).toFixed(3); break;
            case 'SPPOW': m[i][j] = +Math.pow(rho, Math.abs(SPPOW_WEEK[i] - SPPOW_WEEK[j]) / 2).toFixed(3); break;
            default:     m[i][j] = 0;
          }
        }
      }
    }
    return m;
  }

  function colorFor(v) {
    if (v > 0) {
      var intensity = Math.min(1, v);
      var r = Math.round(255 - intensity * 200);
      var g = Math.round(255 - intensity * 100);
      var b = Math.round(255 - intensity * 220);
      return 'rgb(' + r + ',' + g + ',' + b + ')';
    } else if (v < 0) {
      var intensity = Math.min(1, -v);
      var r = Math.round(255 - intensity * 100);
      var g = Math.round(255 - intensity * 100);
      var b = Math.round(255 - intensity * 50);
      return 'rgb(' + r + ',' + g + ',' + b + ')';
    }
    return '#f8fafc';
  }

  function render() {
    var type = typeSelect.value;
    var t = parseInt(visitsRange.value);
    var rho = parseInt(rhoRange.value) / 100;
    visitsVal.textContent = t;
    rhoVal.textContent = rho.toFixed(2);

    var info = paramInfo[type];
    var nParams = info.params(t);
    var extra = (type === 'SPPOW') ? ('<br><span style="font-size:12px;opacity:.85">' + sppowInfo(t) + '</span>') : '';
    infoEl.innerHTML = '<strong>' + info.name + '</strong> &mdash; ' + nParams + ' covariance parameter' + (nParams !== 1 ? 's' : '') + ' for ' + t + ' visits. ' + info.desc + '.' + extra;

    var matrix = generateMatrix(type, t, rho);
    matrixEl.style.gridTemplateColumns = 'repeat(' + t + ', 48px)';
    matrixEl.innerHTML = '';

    for (var i = 0; i < t; i++) {
      for (var j = 0; j < t; j++) {
        var cell = document.createElement('div');
        cell.className = 'cov-cell';
        cell.style.background = colorFor(matrix[i][j]);
        cell.textContent = matrix[i][j].toFixed(2);
        cell.title = 'Row ' + (i+1) + ', Col ' + (j+1) + ': ' + matrix[i][j].toFixed(3);
        matrixEl.appendChild(cell);
      }
    }
  }

  typeSelect.addEventListener('change', render);
  visitsRange.addEventListener('input', render);
  rhoRange.addEventListener('input', render);
  render();
})();

/* ==========================================
   DEMO 2: Matrix Multiplication Animation
   ========================================== */
var matState = { playing: false, step: 0, timer: null };

function matMultInit() {
  var container = document.getElementById('matGridContainer');
  if (!container) return;

  var A = [[2,1,3],[1,4,2]];
  var B = [[1,2],[3,1],[2,3]];
  var rowsA = A.length, colsA = A[0].length;
  var rowsB = B.length, colsB = B[0].length;

  function buildGrid(matrix, rows, cols, id) {
    var grid = document.createElement('div');
    grid.className = 'mat-grid';
    grid.id = id;
    grid.style.gridTemplateColumns = 'repeat(' + cols + ', 44px)';
    for (var i = 0; i < rows; i++) {
      for (var j = 0; j < cols; j++) {
        var cell = document.createElement('div');
        cell.className = 'mat-cell';
        cell.id = id + '_' + i + '_' + j;
        cell.textContent = matrix[i][j];
        grid.appendChild(cell);
      }
    }
    return grid;
  }

  function buildResult(rows, cols, id) {
    var grid = document.createElement('div');
    grid.className = 'mat-grid';
    grid.id = id;
    grid.style.gridTemplateColumns = 'repeat(' + cols + ', 44px)';
    for (var i = 0; i < rows; i++) {
      for (var j = 0; j < cols; j++) {
        var cell = document.createElement('div');
        cell.className = 'mat-cell';
        cell.id = id + '_' + i + '_' + j;
        cell.textContent = '?';
        grid.appendChild(cell);
      }
    }
    return grid;
  }

  container.innerHTML = '';
  container.appendChild(buildGrid(A, rowsA, colsA, 'matA'));
  var op = document.createElement('div');
  op.className = 'mat-op';
  op.textContent = '\u00d7';
  container.appendChild(op);
  container.appendChild(buildGrid(B, rowsB, colsB, 'matB'));
  var eq = document.createElement('div');
  eq.className = 'mat-op';
  eq.textContent = '=';
  container.appendChild(eq);
  container.appendChild(buildResult(rowsA, colsB, 'matC'));

  matState.totalSteps = rowsA * colsB;
}

function matMultPlay() {
  if (matState.playing) return;
  matState.playing = true;
  matState.step = 0;
  matMultInit();
  matMultStep();
}

function matMultStep() {
  var A = [[2,1,3],[1,4,2]];
  var B = [[1,2],[3,1],[2,3]];
  var rowsA = A.length, colsB = B[0].length;
  var total = rowsA * colsB;

  if (matState.step >= total) {
    matState.playing = false;
    document.getElementById('matStatus').textContent = '演示完成！C = A \u00d7 B';
    return;
  }

  var i = Math.floor(matState.step / colsB);
  var j = matState.step % colsB;
  var status = document.getElementById('matStatus');

  // Highlight row i in A and col j in B
  for (var c = 0; c < A[0].length; c++) {
    var cellA = document.getElementById('matA_' + i + '_' + c);
    if (cellA) cellA.className = 'mat-cell hl-row';
  }
  for (var r = 0; r < B.length; r++) {
    var cellB = document.getElementById('matB_' + r + '_' + j);
    if (cellB) cellB.className = 'mat-cell hl-col';
  }

  // Compute dot product
  var sum = 0;
  var terms = [];
  for (var k = 0; k < A[0].length; k++) {
    sum += A[i][k] * B[k][j];
    terms.push(A[i][k] + '\u00d7' + B[k][j]);
  }

  status.textContent = 'C[' + (i+1) + ',' + (j+1) + '] = ' + terms.join(' + ') + ' = ' + sum;

  // Set result
  var cellC = document.getElementById('matC_' + i + '_' + j);
  if (cellC) {
    cellC.textContent = sum;
    cellC.className = 'mat-cell result';
  }

  matState.step++;
  matState.timer = setTimeout(matMultStep, 1200);
}

function matMultReset() {
  clearTimeout(matState.timer);
  matState.playing = false;
  matState.step = 0;
  matMultInit();
  document.getElementById('matStatus').textContent = '点击播放开始演示';
}

// Initialize on load
matMultInit();

/* ==========================================
   DEMO 3: Missing Data Mechanisms
   ========================================== */
var missingData = [];

function generateMissingData() {
  missingData = [];
  for (var i = 0; i < 80; i++) {
    var x = Math.random() * 10;
    var y = 2 + 0.5 * x + (Math.random() - 0.5) * 4;
    missingData.push({ x: x, y: y, missing: false });
  }
}

function applyMissingness(mechanism) {
  generateMissingData();
  switch (mechanism) {
    case 'MCAR':
      missingData.forEach(function (d) { d.missing = Math.random() < 0.25; });
      break;
    case 'MAR':
      missingData.forEach(function (d) { d.missing = d.x > 6 && Math.random() < 0.6; });
      break;
    case 'MNAR':
      missingData.forEach(function (d) { d.missing = d.y < 2 && Math.random() < 0.5; });
      break;
  }
}

function renderMissingChart() {
  var chart = document.getElementById('missingChart');
  if (!chart) return;
  var mechanism = document.getElementById('missingMechanism').value;
  applyMissingness(mechanism);

  var w = chart.clientWidth || 500;
  var h = 300;
  var pad = 40;

  var svg = '<svg viewBox="0 0 ' + w + ' ' + h + '" xmlns="http://www.w3.org/2000/svg">';
  svg += '<rect width="' + w + '" height="' + h + '" fill="#fff" rx="8"/>';

  // Axes
  svg += '<line x1="' + pad + '" y1="' + (h-pad) + '" x2="' + (w-pad) + '" y2="' + (h-pad) + '" stroke="#e2e8f0" stroke-width="1"/>';
  svg += '<line x1="' + pad + '" y1="' + pad + '" x2="' + pad + '" y2="' + (h-pad) + '" stroke="#e2e8f0" stroke-width="1"/>';
  svg += '<text x="' + (w/2) + '" y="' + (h-8) + '" text-anchor="middle" font-size="12" fill="#64748b">X (observed covariate)</text>';
  svg += '<text x="14" y="' + (h/2) + '" text-anchor="middle" font-size="12" fill="#64748b" transform="rotate(-90,14,' + (h/2) + ')">Y (outcome)</text>';

  var xMin = 0, xMax = 10, yMin = -2, yMax = 8;
  function sx(x) { return pad + (x - xMin) / (xMax - xMin) * (w - 2*pad); }
  function sy(y) { return h - pad - (y - yMin) / (yMax - yMin) * (h - 2*pad); }

  var observed = 0, missing = 0;
  missingData.forEach(function (d) {
    var cx = sx(d.x), cy = sy(d.y);
    if (d.missing) {
      svg += '<circle cx="' + cx + '" cy="' + cy + '" r="5" fill="none" stroke="#dc2626" stroke-width="2"/>';
      missing++;
    } else {
      svg += '<circle cx="' + cx + '" cy="' + cy + '" r="5" fill="#059669" opacity="0.7"/>';
      observed++;
    }
  });

  svg += '</svg>';
  chart.innerHTML = svg;

  var descs = {
    MCAR: 'MCAR: Missing completely at random. 缺失点（红圈）随机分布，与 X 和 Y 都无关。观测值（绿点）和缺失值的分布相似。',
    MAR: 'MAR: Missing at random. 缺失概率依赖于已观测的 X 值（X > 6 时更可能缺失）。在给定 X 的条件下，缺失与 Y 无关。',
    MNAR: 'MNAR: Missing not at random. 缺失概率依赖于未观测的 Y 值本身（Y < 2 时更可能缺失）。这是最难处理的缺失机制。'
  };
  document.getElementById('missingDesc').textContent = descs[mechanism] + ' 观测: ' + observed + ', 缺失: ' + missing;
}

function missingRegenerate() {
  renderMissingChart();
}

// Initialize
var missingSelect = document.getElementById('missingMechanism');
if (missingSelect) {
  missingSelect.addEventListener('change', renderMissingChart);
  renderMissingChart();
}

/* ==========================================
   DEMO 4: Parameter Count Growth Curve
   ========================================== */
(function () {
  var demo = document.getElementById('paramCurveDemo');
  if (!demo) return;

  var visitsRange = document.getElementById('pcVisits');
  var visitsVal = document.getElementById('pcVisitsVal');
  var chartEl = document.getElementById('pcChart');
  var tableEl = document.getElementById('pcTable');

  function countParams(type, t) {
    switch (type) {
      case 'UN': return t * (t + 1) / 2;
      case 'CS': return 2;
      case 'AR1': return 2;
      case 'TOEP': return t;
      case 'CSH': return t + 1;
      case 'ARH1': return t + 1;
      case 'SPPOW': return 2;
      default: return 0;
    }
  }

  function render() {
    var t = parseInt(visitsRange.value);
    visitsVal.textContent = t;

    var types = ['UN', 'CS', 'AR1', 'TOEP', 'CSH', 'ARH1', 'SPPOW'];
    var colors = ['#dc2626', '#059669', '#2563eb', '#d97706', '#7c3aed', '#0d9488', '#db2777'];

    // SVG chart
    var w = chartEl.clientWidth || 500;
    var h = 250;
    var pad = 50;
    var maxVal = countParams('UN', 12);

    var svg = '<svg viewBox="0 0 ' + w + ' ' + h + '" xmlns="http://www.w3.org/2000/svg">';
    svg += '<rect width="' + w + '" height="' + h + '" fill="#fff" rx="8"/>';

    // Grid lines
    for (var v = 0; v <= maxVal; v += Math.ceil(maxVal / 5)) {
      var y = h - pad - (v / maxVal) * (h - 2 * pad);
      svg += '<line x1="' + pad + '" y1="' + y + '" x2="' + (w - pad) + '" y2="' + y + '" stroke="#f1f5f9" stroke-width="1"/>';
      svg += '<text x="' + (pad - 8) + '" y="' + (y + 4) + '" text-anchor="end" font-size="10" fill="#94a3b8">' + v + '</text>';
    }

    // X axis labels
    for (var i = 3; i <= 12; i++) {
      var x = pad + (i - 3) / 9 * (w - 2 * pad);
      svg += '<text x="' + x + '" y="' + (h - pad + 18) + '" text-anchor="middle" font-size="10" fill="#94a3b8">' + i + '</text>';
    }

    // Lines
    types.forEach(function (type, ti) {
      var points = [];
      for (var i = 3; i <= 12; i++) {
        var x = pad + (i - 3) / 9 * (w - 2 * pad);
        var y = h - pad - (countParams(type, i) / maxVal) * (h - 2 * pad);
        points.push(x + ',' + y);
      }
      svg += '<polyline points="' + points.join(' ') + '" fill="none" stroke="' + colors[ti] + '" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>';
    });

    // Legend
    var lx = pad;
    types.forEach(function (type, ti) {
      svg += '<rect x="' + lx + '" y="10" width="12" height="12" rx="3" fill="' + colors[ti] + '"/>';
      svg += '<text x="' + (lx + 16) + '" y="20" font-size="11" fill="#475569">' + type + '</text>';
      lx += 56;
    });

    svg += '</svg>';
    chartEl.innerHTML = svg;

    // Table
    var html = '<table><thead><tr><th>结构</th>';
    for (var i = 3; i <= t; i++) html += '<th>' + i + ' 访视</th>';
    html += '</tr></thead><tbody>';
    types.forEach(function (type, ti) {
      html += '<tr><td style="color:' + colors[ti] + ';font-weight:600;">' + type + '</td>';
      for (var i = 3; i <= t; i++) html += '<td>' + countParams(type, i) + '</td>';
      html += '</tr>';
    });
    html += '</tbody></table>';
    tableEl.innerHTML = html;
  }

  visitsRange.addEventListener('input', render);
  render();
})();

/* ==========================================
   DEMO 5: Data-to-Code Step-Through
   ========================================== */
var dcState = { step: 0, playing: false, timer: null };

var dcData = [
  ['101-001', 'Drug A',  4,  'Week 4',  22.0, 20.1],
  ['101-001', 'Drug A',  8,  'Week 8',  22.0, 19.3],
  ['101-001', 'Drug A',  16, 'Week 16', 22.0, 18.5],
  ['101-001', 'Drug A',  24, 'Week 24', 22.0, 18.0],
  ['101-002', 'Placebo', 4,  'Week 4',  24.0, 23.2],
  ['101-002', 'Placebo', 8,  'Week 8',  24.0, 23.1],
  ['101-002', 'Placebo', 16, 'Week 16', 24.0, 24.0],
  ['101-002', 'Placebo', 24, 'Week 24', 24.0, null],
  ['101-003', 'Drug A',  4,  'Week 4',  19.0, 18.2],
  ['101-003', 'Drug A',  8,  'Week 8',  19.0, null],
  ['101-003', 'Drug A',  16, 'Week 16', 19.0, 16.1],
  ['101-003', 'Drug A',  24, 'Week 24', 19.0, 16.0]
];

var dcSteps = [
  { cols: [], codeHL: [], explanation: '初始状态：ADaM BDS 长格式数据集，3 名受试者 × 4 访视 = 12 条观测，其中 2 条 AVAL 缺失。' },
  { cols: [0], codeHL: ['CLASS USUBJID'], explanation: 'CLASS USUBJID：声明受试者标识为分类变量。SAS 将为每个唯一的 USUBJID 创建指示变量。' },
  { cols: [1], codeHL: ['CLASS TRTP'], explanation: 'CLASS TRTP：声明治疗组为分类变量。Drug A 和 Placebo 两个水平。注意 ORDER=DATA 确保按数据顺序排列。' },
  { cols: [2, 3], codeHL: ['CLASS AVISIT', 'REPEATED AVISIT'], explanation: 'CLASS AVISIT + REPEATED AVISIT：声明访视为分类变量，并在 REPEATED 中指定访视为重复测量维度。SAS 将按访视构造受试者内协方差矩阵的行。' },
  { cols: [4], codeHL: ['BASE'], explanation: 'MODEL 中的 BASE：基线值作为连续协变量。用于提高估计精度（基线校正）。有些 SAP 还加 BASE*AVISIT 允许基线效应随时间变化。' },
  { cols: [1, 2], codeHL: ['TRTP*AVISIT'], explanation: 'TRTP*AVISIT 交互项：这是 MMRM 的灵魂！允许每个访视有各自的治疗组间差异。去掉它就拿不到分访视的 LS Mean 差值。' },
  { cols: [5], codeHL: ['MODEL CHG ='], explanation: '因变量 CHG = AVAL - BASE。注意：AVAL 有 2 个缺失值（红色）。MMRM 在 MAR 假设下直接利用所有可用数据，不需要插补。' },
  { cols: [0, 2], codeHL: ['SUBJECT=USUBJID'], explanation: 'SUBJECT=USUBJID：定义分块。具有相同 USUBJID 的记录属于同一个重复测量簇。R 矩阵按受试者分块对角构造。' },
  { cols: [], codeHL: ['TYPE=UN', 'DDFM=KR'], explanation: 'TYPE=UN：非结构化协方差，6 访视需要 21 个参数。DDFM=KR：Kenward-Roger 自由度校正，同时校正 SE 和 DF，小样本下最准确。' }
];

var dcCodeLines = [
  'PROC MIXED DATA=ADQS_SORTED METHOD=REML;',
  '  CLASS TRTP AVISIT USUBJID;',
  '  MODEL CHG = TRTP AVISIT TRTP*AVISIT BASE',
  '        / DDFM=KR SOLUTION CL;',
  '  REPEATED AVISIT /',
  '    SUBJECT=USUBJID',
  '    TYPE=UN R RCORR;',
  '  LSMEANS TRTP*AVISIT / DIFF CL;',
  'RUN;'
];

function renderDataCode() {
  var step = dcState.step;
  var s = dcSteps[step];

  // Data table
  var tableHtml = '<table><thead><tr><th>USUBJID</th><th>TRTP</th><th>AVISITN</th><th>AVISIT</th><th>BASE</th><th>AVAL</th></tr></thead><tbody>';
  dcData.forEach(function (row, ri) {
    var hlClass = '';
    s.cols.forEach(function (ci) { if (ci === 0 || ci === 1) hlClass = 'hl-row'; });
    tableHtml += '<tr class="' + hlClass + '">';
    row.forEach(function (cell, ci) {
      var colHL = s.cols.indexOf(ci) >= 0 ? ' style="background:var(--accent-soft);font-weight:600;"' : '';
      var val = cell === null ? '<span style="color:var(--danger);font-weight:700;">.</span>' : cell;
      tableHtml += '<td' + colHL + '>' + val + '</td>';
    });
    tableHtml += '</tr>';
  });
  tableHtml += '</tbody></table>';
  document.getElementById('dcDataTable').innerHTML = tableHtml;

  var missingCount = dcData.filter(function (r) { return r[5] === null; }).length;
  document.getElementById('dcDataFooter').innerHTML = '12 obs \u00b7 3 subjects \u00b7 <strong style="color:var(--danger);">' + missingCount + ' obs missing AVAL</strong>';

  // Code block
  var codeHtml = '';
  dcCodeLines.forEach(function (line, li) {
    var hl = s.codeHL.some(function (kw) { return line.toUpperCase().indexOf(kw.toUpperCase()) >= 0; });
    codeHtml += '<div style="' + (hl ? 'background:rgba(13,148,136,0.2);margin:0 -18px;padding:2px 18px;border-left:3px solid var(--accent);' : '') + '">' + escHtml(line) + '</div>';
  });
  document.getElementById('dcCodeBlock').innerHTML = codeHtml;

  // Explanation
  document.getElementById('dcExplanation').innerHTML = '<strong>Step ' + (step + 1) + ':</strong> ' + s.explanation;

  // Step label
  document.getElementById('dcStepLabel').textContent = (step + 1) + ' / ' + dcSteps.length;
}

function escHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function dataCodeNext() {
  if (dcState.step < dcSteps.length - 1) {
    dcState.step++;
    renderDataCode();
  }
}
function dataCodePrev() {
  if (dcState.step > 0) {
    dcState.step--;
    renderDataCode();
  }
}
function dataCodePlay() {
  if (dcState.playing) return;
  dcState.playing = true;
  dcState.step = 0;
  renderDataCode();
  function next() {
    if (dcState.step < dcSteps.length - 1) {
      dcState.step++;
      renderDataCode();
      dcState.timer = setTimeout(next, 2000);
    } else {
      dcState.playing = false;
    }
  }
  dcState.timer = setTimeout(next, 2000);
}

// Initialize
if (document.getElementById('dataCodeDemo')) {
  renderDataCode();
}

/* ==========================================
   DEMO 6: Interactive Model Builder
   ========================================== */
(function () {
  var demo = document.getElementById('modelBuilderDemo');
  if (!demo) return;

  var controls = document.getElementById('mbControls');
  var eqEl = document.getElementById('mbEquation');
  var codeEl = document.getElementById('mbCode');

  var terms = {
    intercept:  { label: '\\mu',           sas: '',                     r: '1' },
    treatment:  { label: '\\tau_{t(i)}',   sas: 'TRTP',                 r: 'TRTP' },
    visit:      { label: '\\gamma_j',      sas: 'AVISIT',               r: 'AVISIT' },
    interaction:{ label: '(\\tau\\gamma)_{tj}', sas: 'TRTP*AVISIT',     r: 'TRTP:AVISIT' },
    baseline:   { label: '\\beta \\cdot \\text{base}', sas: 'BASE',     r: 'BASE' },
    strata:     { label: '\\delta_s',      sas: 'STRATAN',              r: 'STRATAN' }
  };

  function update() {
    var checkboxes = controls.querySelectorAll('input[type="checkbox"]');
    var activeTerms = [];
    var sasTerms = [];
    var rTerms = [];

    checkboxes.forEach(function (cb) {
      if (cb.checked) {
        var t = terms[cb.dataset.term];
        activeTerms.push(t.label);
        if (t.sas) sasTerms.push(t.sas);
        if (t.r) rTerms.push(t.r);
      }
    });

    // Equation
    var eq = '$$Y_{ij} = ' + (activeTerms.length ? activeTerms.join(' + ') : '0') + ' + \\varepsilon_{ij}$$';
    eqEl.innerHTML = eq;
    if (window.MathJax && MathJax.typesetPromise) {
      MathJax.typesetPromise([eqEl]).catch(function() {});
    }

    // SAS code
    var modelLine = sasTerms.length ? 'MODEL CHG = ' + sasTerms.join(' ') + ' / DDFM=KR;' : 'MODEL CHG = / DDFM=KR;';
    codeEl.innerHTML = '<span class="tok-kw">PROC MIXED</span> DATA=adqs METHOD=REML;\n' +
      '  <span class="tok-kw">CLASS</span> TRTP AVISIT USUBJID;\n' +
      '  ' + modelLine + '\n' +
      '  <span class="tok-kw">REPEATED</span> AVISIT / SUBJECT=USUBJID TYPE=UN;\n' +
      '<span class="tok-kw">RUN</span>;';
  }

  controls.addEventListener('change', update);
  update();
})();

/* ==========================================
   DEMO: Sandbox (S11)
   ========================================== */
(function () {
  var demo = document.getElementById('sandboxDemo');
  if (!demo) return;

  var methodSel = document.getElementById('sbMethod');
  var typeSel = document.getElementById('sbType');
  var ddfmSel = document.getElementById('sbDDFM');
  var groupSel = document.getElementById('sbGroup');
  var outputEl = document.getElementById('sbOutput');

  function paramCount(type, visits) {
    var base = { UN: 21, CS: 2, AR1: 2, TOEP: 6, CSH: 7, ARH1: 7, SPPOW: 2 }[type] || 0;
    return base;
  }

  function update() {
    var method = methodSel.value;
    var type = typeSel.value;
    var ddfm = ddfmSel.value;
    var group = groupSel.value;

    var nParams = paramCount(type, 6);
    if (group === 'TRTP') nParams *= 2;

    var html = '<div style="margin-bottom:12px;">';
    html += '<strong>模型规格：</strong><br>';
    var typeLabel = { UN: 'UN', CS: 'CS', AR1: 'AR(1)', TOEP: 'TOEP', CSH: 'CSH', ARH1: 'ARH(1)', SPPOW: 'SP(POW)(WEEK)' }[type] || type;
    html += 'METHOD=' + method + ' | TYPE=' + typeLabel + ' | DDFM=' + ddfm;
    if (group !== 'none') html += ' | GROUP=TRTP';
    html += '</div>';
    if (type === 'SPPOW') {
      html += '<div style="margin-bottom:12px;font-size:13px;color:var(--ink-secondary);">'
           +  '<strong>SP(POW) 需要一个连续时间变量：</strong>'
           +  '<code>REPEATED AVISITN / SUBJECT=USUBJID TYPE=SP(POW)(WEEK);</code>'
           +  ' 相关结构为 ρ<sup>|t<sub>i</sub>−t<sub>j</sub>|</sup>，t 取 WEEK 的实际数值，'
           +  '因此天然支持不等距访视；ρ 的解释依赖于 WEEK 的单位。</div>';
    }

    html += '<div style="margin-bottom:12px;">';
    html += '<strong>协方差参数数量：</strong> ' + nParams + ' 个';
    if (nParams > 30) html += ' <span style="color:var(--warning);font-weight:600;">⚠ 参数较多，注意收敛</span>';
    if (nParams > 40) html += ' <span style="color:var(--danger);font-weight:600;">⚠ 参数过多，收敛风险高</span>';
    html += '</div>';

    html += '<div style="margin-bottom:12px;">';
    html += '<strong>预期输出：</strong><ul style="margin:8px 0 0 20px;font-size:14px;color:var(--ink-secondary);">';
    html += '<li>Fit Statistics: -2 Res Log Likelihood, AIC, AICC, BIC</li>';
    html += '<li>Covariance Parameter Estimates: ' + nParams + ' rows</li>';
    html += '<li>Type 3 Tests: TRTP, AVISIT, TRTP*AVISIT, BASE</li>';
    html += '<li>LS Means: 2 treatments × 6 visits = 12 LS Means</li>';
    html += '<li>Differences: 1 pairwise comparison × 6 visits = 6 differences</li>';
    html += '</ul></div>';

    html += '<div>';
    html += '<strong>推荐度：</strong> ';
    if (method === 'REML' && ddfm === 'KR' && type === 'UN' && group === 'none') {
      html += '<span class="badge badge-success">标准配置，推荐</span>';
    } else if (method === 'ML') {
      html += '<span class="badge badge-warning">ML 有协方差偏倚，建议改用 REML</span>';
    } else if (ddfm !== 'KR') {
      html += '<span class="badge badge-info">' + ddfm + ' 可用，但 KR 更推荐</span>';
    } else {
      html += '<span class="badge badge-accent">可行配置</span>';
    }
    html += '</div>';

    outputEl.innerHTML = html;
  }

  methodSel.addEventListener('change', update);
  typeSel.addEventListener('change', update);
  ddfmSel.addEventListener('change', update);
  groupSel.addEventListener('change', update);
  update();
})();


/* ============================================================
   v2.4 · 协方差参数数推导面板（S11 参数沙盘）
   参数个数随所选结构（UN/CS/AR1/TOEP/CSH/ARH1/SPPOW）与访视数 n 动态计算
   ============================================================ */
(function () {
  var panel = document.getElementById('unParamPanel');
  if (!panel) return;
  var selN  = document.getElementById('unParamN');
  /* 结构唯一入口 = 模型规格的 sbType；面板只读，不再自带下拉 */
  var sbType = document.getElementById('sbType');
  function curKey() { return (sbType && STRUCTS[sbType.value]) ? sbType.value : 'UN'; }
  var title = document.getElementById('unpTitle');
  var fmlEl = document.getElementById('unpFml');
  var noteEl= document.getElementById('unpNote');
  var steps = document.getElementById('unpSteps');
  var calc  = document.getElementById('unpCalc');
  var grid  = document.getElementById('unpGrid');
  var cap   = document.getElementById('unpCap');
  var tbody = document.getElementById('unpTableBody');
  var tip   = document.getElementById('unpTip');

  var SUB = '₀₁₂₃₄₅₆₇';
  function sub(k) { return String(k).split('').map(function (d) { return SUB[+d]; }).join(''); }

  /* 每种结构：参数数 q(n)、公式、说明、推导步骤、矩阵格子着色、图例、对照行、提示 */
  var STRUCTS = {
    UN: {
      label: 'UN（非结构化）', short: 'UN',
      q: function (n) { return n * (n + 1) / 2; },
      fml: 'q_{\\mathrm{UN}} = \\dfrac{n(n+1)}{2}',
      note: '$n$ = 重复测量的访视数（即 $\\Sigma$ 的阶数）。UN 不对方差、协方差施加任何约束，所以 $\\Sigma$ 里<strong>每一个自由格子都是一个待估参数</strong>。',
      steps: function (n) {
        var d = n, o = n * (n - 1) / 2;
        return '<li>$\\Sigma$ 是 $' + n + '\\times' + n + '$ 的<strong>对称</strong>矩阵，共有 $' + n + '^2 = ' + (n * n) + '$ 个格子。</li>' +
          '<li>对称性 $\\sigma_{ij}=\\sigma_{ji}$ 让下三角不再独立：<b>' + o + '</b> 个协方差只看上三角。<br>' +
          '<span style="color:var(--ink-tertiary)">上三角格子数 $= \\frac{' + n + '\\times' + (n - 1) + '}{2} = ' + o + '$</span></li>' +
          '<li>对角线上的 <b>' + d + '</b> 个方差各自独立（各访视的方差互不相同）。</li>' +
          '<li>合计：<b>' + d + '（方差）+ ' + o + '（协方差）= ' + (d + o) + '</b>，即 $\\frac{' + n + '\\times' + (n + 1) + '}{2} = ' + (d + o) + '$。</li>';
      },
      cell: function (i, j) {
        if (i === j) return { c: 'diag', l: 'σᵢ' };
        if (j > i) return { c: 'on', l: 'σ' };
        return { c: '', l: '·' };
      },
      cap: function (n) {
        return '<span class="lg" style="background:var(--primary)"></span><b>' + n + '</b> 个自由方差（对角）<br>' +
               '<span class="lg" style="background:var(--accent-soft)"></span><b>' + (n * (n - 1) / 2) + '</b> 个自由协方差（上三角）<br>' +
               '<span class="lg"></span>灰 = 由对称性决定，不另计<br>' +
               '<b style="font-size:14px">合计 ' + (n * (n + 1) / 2) + ' 个自由参数</b>';
      },
      comp: function (n) { return n + ' 方差 + ' + (n * (n - 1) / 2) + ' 协方差'; },
      trend: '每加 1 访视 +n（快增）',
      tip: '递推规律：访视数从 $n-1$ 增到 $n$，UN 参数<strong>增加 $n$ 个</strong>（$T_n-T_{n-1}=n$）——多出来的正是新访视自身的方差与它和原有 $n-1$ 个访视的协方差。' +
           '本例 36 例受试者、6 个访视，UN 要估 <b>21</b> 个协方差参数，这正是它在小样本下容易不收敛、需要按 SAP 回退链降级到 CS 的原因（见 <a href="#s24">S24</a>）。作为对照，CS 无论多少个访视都只有 <b>2</b> 个参数。'
    },
    CS: {
      label: 'CS（复合对称）', short: 'CS', q: function () { return 2; },
      fml: 'q_{\\mathrm{CS}} = 2',
      note: 'CS 假定<strong>方差齐性、相关恒定</strong>：整张 $\\Sigma$ 只由两个数生成。',
      steps: function (n) {
        return '<li>$\\Sigma$ 的 $' + (n * n) + '$ 个格子被强行压成两种取值。</li>' +
          '<li>对角线元素<strong>全部相等</strong> → 只估 <b>1</b> 个方差参数（SAS 输出中的 Residual）。</li>' +
          '<li>所有非对角元素<strong>全部相等</strong> → 只估 <b>1</b> 个协方差参数（SAS 输出中的 CS）。</li>' +
          '<li>合计：1 + 1 = <b>2</b>，与访视数 $n$ 无关。</li>';
      },
      cell: function (i, j) {
        if (i === j) return { c: 'shr', l: 'σ²' };
        if (j > i) return { c: 'shr', l: 'c' };
        return { c: '', l: '·' };
      },
      cap: function () {
        return '<span class="lg" style="background:#fff4e0"></span>琥珀 = 同一参数的重复格子（对角共享 σ²、非对角共享 c）<br>' +
               '<span class="lg"></span>灰 = 由对称性决定<br><b style="font-size:14px">合计 2 个自由参数</b>';
      },
      comp: function () { return '1 共享方差 + 1 共享协方差'; },
      trend: '恒定',
      tip: 'CS 恒为 <b>2</b> 个参数——本例 SAS 最终报告 CS，正是 UN（6 访视 21 个）在 36 例小样本下不收敛后按 SAP 回退链降级的结果（见 <a href="#s24">S24</a>）。参数少而稳，但若真实方差随访视变化，会有模型误设风险（对照见 5.2）。'
    },
    AR1: {
      label: 'AR(1)', short: 'AR(1)', q: function () { return 2; },
      fml: 'q_{\\mathrm{AR(1)}} = 2',
      note: '$\\Sigma_{ij}=\\sigma^2\\rho^{|i-j|}$：方差齐性，相关随滞后阶几何衰减。',
      steps: function (n) {
        return '<li>对角元素共享同一方差 $\\sigma^2$（<b>1</b> 个参数）。</li>' +
          '<li>协方差不由参数直接给出，而是 $\\sigma^2\\rho^{|i-j|}$ 生成——$\\rho$ 是唯一的自相关参数（<b>1</b> 个）。</li>' +
          '<li>上三角各格子的<strong>数值</strong>随滞后阶不同，但都由 $\\sigma^2$ 与 $\\rho$ 算出，<strong>不是自由参数</strong>。</li>' +
          '<li>合计：$\\sigma^2 + \\rho$ = <b>2</b>，与 $n$ 无关。</li>';
      },
      cell: function (i, j) {
        if (i === j) return { c: 'shr', l: 'σ²' };
        if (j > i) return { c: 'det', l: 'ρ' };
        return { c: '', l: '·' };
      },
      cap: function () {
        return '<span class="lg" style="background:#fff4e0"></span>琥珀 = 共享的 σ²（1 个参数）<br>' +
               '<span class="lg" style="background:#eef1f6"></span>蓝灰 = 由 σ² 与 ρ 决定，不另计参数<br>' +
               '<b style="font-size:14px">合计 2 个自由参数</b>';
      },
      comp: function () { return '1 方差 + 1 自相关'; },
      trend: '恒定',
      tip: 'AR(1) 恒为 <b>2</b> 个参数。它假设等间距的相关衰减——若访视间隔不等（如 2/4/8/12/16 周），应改用按真实时间计距离的 SP(POW)。'
    },
    TOEP: {
      label: 'TOEP', short: 'TOEP', q: function (n) { return n; },
      fml: 'q_{\\mathrm{TOEP}} = n',
      note: 'TOEP = 自回归协方差带 + <strong>共享方差</strong>：每个滞后阶一个自由协方差。',
      steps: function (n) {
        return '<li>对角元素共享同一方差 $\\sigma_0$（<b>1</b> 个参数）。</li>' +
          '<li>滞后 1, 2, …, $' + (n - 1) + '$ 阶的协方差各自独立：$\\sigma_1, \\sigma_2, \\ldots, \\sigma_{' + (n - 1) + '}$（<b>' + (n - 1) + '</b> 个参数）。</li>' +
          '<li>同一滞后阶的格子（与对角线平行的斜线）共享同一个参数。</li>' +
          '<li>合计：1 + ' + (n - 1) + ' = <b>' + n + '</b>。</li>';
      },
      cell: function (i, j) {
        if (i === j) return { c: 'shr', l: 'σ₀' };
        if (j > i) return { c: 'lag', l: 'σ' + sub(j - i) };
        return { c: '', l: '·' };
      },
      cap: function (n) {
        return '<span class="lg" style="background:#fff4e0"></span>琥珀 = 共享方差 σ₀（1 个参数）<br>' +
               '<span class="lg" style="background:var(--teal-soft)"></span>青 = 各滞后阶协方差 σ₁…σ' + sub(n - 1) + '（' + (n - 1) + ' 个参数）<br>' +
               '<b style="font-size:14px">合计 ' + n + ' 个自由参数</b>';
      },
      comp: function (n) { return '1 共享方差 + ' + (n - 1) + ' 滞后协方差'; },
      trend: '每加 1 访视 +1',
      tip: 'TOEP 每多一个访视只多 <b>1</b> 个参数，是 UN（快增）与 CS（恒定）之间的折中：保留"近相关强、远相关弱"的结构，但放弃异质方差。'
    },
    CSH: {
      label: 'CSH（异质 CS）', short: 'CSH', q: function (n) { return n + 1; },
      fml: 'q_{\\mathrm{CSH}} = n + 1',
      note: 'CSH = CS 的<strong>异质方差</strong>版：对角各自独立，相关仍恒定。',
      steps: function (n) {
        return '<li>方差异质：$\\sigma_1^2, \\ldots, \\sigma_{' + n + '}^2$ 各自独立（<b>' + n + '</b> 个参数）。</li>' +
          '<li>所有协方差共享同一相关系数 $\\rho$：$\\Sigma_{ij}=\\rho\\,\\sigma_i\\sigma_j$（<b>1</b> 个参数）。</li>' +
          '<li>合计：' + n + ' + 1 = <b>' + (n + 1) + '</b>。</li>';
      },
      cell: function (i, j) {
        if (i === j) return { c: 'diag', l: 'σᵢ' };
        if (j > i) return { c: 'shr', l: 'ρ' };
        return { c: '', l: '·' };
      },
      cap: function (n) {
        return '<span class="lg" style="background:var(--primary)"></span><b>' + n + '</b> 个异质方差（对角各自自由）<br>' +
               '<span class="lg" style="background:#fff4e0"></span>琥珀 = 共享相关 ρ（1 个参数）<br>' +
               '<b style="font-size:14px">合计 ' + (n + 1) + ' 个自由参数</b>';
      },
      comp: function (n) { return n + ' 异质方差 + 1 共享相关'; },
      trend: '每加 1 访视 +1',
      tip: 'CSH 比多一个访视多 <b>1</b> 个参数。SAP 回退链里的 TOEPH(1)/HCS 即这一族的成员——异质方差常是 UN 收敛失败后仍想保留的第一步放松。'
    },
    ARH1: {
      label: 'ARH(1)', short: 'ARH(1)', q: function (n) { return n + 1; },
      fml: 'q_{\\mathrm{ARH(1)}} = n + 1',
      note: 'ARH(1) = AR(1) 的<strong>异质方差</strong>版：$\\Sigma_{ij}=\\sigma_i\\sigma_j\\rho^{|i-j|}$。',
      steps: function (n) {
        return '<li>对角 $\\sigma_1^2, \\ldots, \\sigma_{' + n + '}^2$ 各自独立（<b>' + n + '</b> 个参数）。</li>' +
          '<li>协方差由 $\\sigma_i\\sigma_j\\rho^{|i-j|}$ 生成，除方差外只含 <b>1</b> 个自相关 $\\rho$。</li>' +
          '<li>合计：' + n + ' + 1 = <b>' + (n + 1) + '</b>。</li>';
      },
      cell: function (i, j) {
        if (i === j) return { c: 'diag', l: 'σᵢ' };
        if (j > i) return { c: 'det', l: 'ρ' };
        return { c: '', l: '·' };
      },
      cap: function (n) {
        return '<span class="lg" style="background:var(--primary)"></span><b>' + n + '</b> 个异质方差（对角各自自由）<br>' +
               '<span class="lg" style="background:#eef1f6"></span>蓝灰 = 由方差与 ρ 决定，不另计参数<br>' +
               '<b style="font-size:14px">合计 ' + (n + 1) + ' 个自由参数</b>';
      },
      comp: function (n) { return n + ' 异质方差 + 1 自相关'; },
      trend: '每加 1 访视 +1',
      tip: 'ARH(1) 同样是 <b>n+1</b>：多出来的参数全花在异质方差上。若相关结构近似 AR(1) 而方差明显随访视变化，它比 UN 省得多又比 AR(1) 灵活。'
    },
    SPPOW: {
      label: 'SP(POW)', short: 'SP(POW)', q: function () { return 2; },
      fml: 'q_{\\mathrm{SP(POW)}} = 2',
      note: '$\\Sigma_{ij}=\\sigma^2\\rho^{\\,|t_i-t_j|}$：距离用<strong>真实时间</strong>而非滞后阶数。',
      steps: function (n) {
        return '<li>对角元素共享同一方差 $\\sigma^2$（<b>1</b> 个参数）。</li>' +
          '<li>协方差由 $\\sigma^2\\rho^{\\,|t_i-t_j|}$ 生成：$\\rho$ 是每单位时间的衰减（<b>1</b> 个参数）。</li>' +
          '<li>本演示的访视计划为 2/4/8/12/16 周：W2 与 W4 相关 $=\\rho^{2/2}$，W2 与 W16 相关 $=\\rho^{14/2}$。</li>' +
          '<li>合计：<b>2</b>，与 $n$ 无关。</li>';
      },
      cell: function (i, j) {
        if (i === j) return { c: 'shr', l: 'σ²' };
        if (j > i) return { c: 'det', l: 'ρᵈ' };
        return { c: '', l: '·' };
      },
      cap: function () {
        return '<span class="lg" style="background:#fff4e0"></span>琥珀 = 共享的 σ²（1 个参数）<br>' +
               '<span class="lg" style="background:#eef1f6"></span>蓝灰 = 由 σ²、ρ 与时间距离决定<br>' +
               '<b style="font-size:14px">合计 2 个自由参数</b>';
      },
      comp: function () { return '1 方差 + 1 距离相关'; },
      trend: '恒定',
      tip: 'SP(POW) 恒为 <b>2</b> 个参数。它与 AR(1) 的本质区别：AR(1) 按"隔几个访视"衰减，SP(POW) 按"隔几周"衰减——不等间距设计下二者给出的 $\\Sigma$ 完全不同。'
    }
  };

  var ORDER = ['UN', 'CS', 'AR1', 'TOEP', 'CSH', 'ARH1', 'SPPOW'];
  function nameOf(k) {
    return { UN: 'UN', CS: 'CS', AR1: 'AR(1)', TOEP: 'TOEP', CSH: 'CSH', ARH1: 'ARH(1)', SPPOW: 'SP(POW)' }[k] || k;
  }

  function render() {
    var key = curKey();
    var S = STRUCTS[key];
    if (!S) return;
    var n = parseInt(selN.value, 10);
    var q = S.q(n);

    title.innerHTML = S.label + ' 协方差参数数：$n=' + n + '$ 时 <b>' + q + '</b> 个 —— 公式与代入';
    fmlEl.innerHTML = '$' + S.fml.replace(/n/g, 'n') + '$';
    noteEl.innerHTML = S.note;
    steps.innerHTML = S.steps(n);
    calc.textContent = 'n = ' + n + '  →  q = ' + q + ' 个协方差参数';

    var gh = '';
    for (var i = 0; i < n; i++) {
      for (var jj = 0; jj < n; jj++) {
        var sp = S.cell(i, jj, n);
        var cls = 'unp-cell' + (sp.c ? ' ' + sp.c : '');
        gh += '<div class="' + cls + '" title="第 ' + (i + 1) + ' 行 · 第 ' + (jj + 1) + ' 列">' + sp.l + '</div>';
      }
    }
    grid.style.gridTemplateColumns = 'repeat(' + n + ', 34px)';
    grid.innerHTML = gh;
    cap.innerHTML = S.cap(n);

    var rows = '';
    for (var r = 0; r < ORDER.length; r++) {
      var k = ORDER[r], Sk = STRUCTS[k], qk = Sk.q(n);
      rows += '<tr' + (k === key ? ' class="hi"' : '') + '>' +
              '<td>' + nameOf(k) + (k === key ? ' ←' : '') + '</td>' +
              '<td>$' + Sk.fml + '$</td>' +
              '<td>' + Sk.comp(n) + '</td>' +
              '<td><b>' + qk + '</b></td>' +
              '<td>' + Sk.trend + '</td></tr>';
    }
    tbody.innerHTML = rows;
    tip.innerHTML = S.tip;

    if (window.MathJax && window.MathJax.typesetPromise) {
      window.MathJax.typesetPromise([panel]).catch(function () {});
    }
  }

  selN.addEventListener('change', render);
  if (sbType) sbType.addEventListener('change', render);

  render();
})();

/* ============================================================
   v2.5 · archify 图窗缩放：子页面按 1280×DH 固定排版（?kiosk=1），
   宿主按容器宽度 transform:scale 等比缩放 —— 任何窗口尺寸都完整显示。
   ============================================================ */
(function () {
  var DW = 1280;

  function poke(f) {
    if (!f || !f.contentWindow) return;
    try {
      f.contentWindow.dispatchEvent(new Event('resize'));
      var d = f.contentWindow.document;
      if (d && d.dispatchEvent) d.dispatchEvent(new Event('resize'));
    } catch (e) { /* 跨域忽略 */ }
  }

  function dhOf(f) { return parseFloat(f.getAttribute('data-dh')) || parseFloat(f.style.height) || 800; }

  /* 宿主侧缩放：宽度铺满容器，高度按比例收缩 */
  function fit(w) {
    var f = w.querySelector('iframe');
    if (!f) return;
    var cw = w.clientWidth;
    if (!cw) return;
    var dh = dhOf(f);
    var sc = cw / DW;
    f.style.transform = 'scale(' + sc + ')';
    w.style.height = (cw * dh / DW) + 'px';
  }

  function fitAll() {
    document.querySelectorAll('.figframe .fig-scale').forEach(fit);
    var m = document.getElementById('figModalFrame');
    if (m && window.fitModal) window.fitModal();
  }

  function wire(f) {
    if (!f || f.dataset.figWired === '1') return;
    f.dataset.figWired = '1';
    f.addEventListener('load', function () {
      poke(f);
      setTimeout(function () { poke(f); }, 150);
      setTimeout(function () { poke(f); }, 700);
    });
  }

  function wireAll() {
    document.querySelectorAll('.figframe iframe').forEach(wire);
    var m = document.getElementById('figModalFrame');
    if (m) wire(m);
    fitAll();
  }

  var t = null;
  window.addEventListener('resize', function () {
    clearTimeout(t);
    t = setTimeout(function () {
      document.querySelectorAll('.figframe iframe').forEach(poke);
      fitAll();
    }, 180);
  });

  var modal = document.getElementById('figModal');
  if (modal && window.MutationObserver) {
    new MutationObserver(function () {
      if (modal.classList.contains('open')) {
        var m = document.getElementById('figModalFrame');
        if (m) { poke(m); setTimeout(function () { poke(m); }, 220); setTimeout(function () { poke(m); }, 800); }
      }
    }).observe(modal, { attributes: true, attributeFilter: ['class'] });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wireAll);
  else wireAll();
})();
