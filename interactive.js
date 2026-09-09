/* ============================================================
   MMRM 指南 · 交互演示组件 JS
   ============================================================ */

/* ---- 1. 协方差结构对比器 ---- */
(function () {
  function generateMatrix(type, T, rho) {
    var m = [];
    for (var i = 0; i < T; i++) {
      m[i] = [];
      for (var j = 0; j < T; j++) {
        m[i][j] = 0;
      }
    }
    switch (type) {
      case 'UN':
        for (var i = 0; i < T; i++) {
          for (var j = 0; j < T; j++) {
            if (i === j) m[i][j] = 1;
            else {
              var seed = Math.sin(i * 7.1 + j * 3.3) * 0.5 + 0.5;
              m[i][j] = Math.round(seed * 80 + 10) / 100;
              m[j][i] = m[i][j];
            }
          }
        }
        break;
      case 'CS':
        for (var i = 0; i < T; i++) {
          for (var j = 0; j < T; j++) {
            m[i][j] = i === j ? 1 : rho;
          }
        }
        break;
      case 'AR1':
        for (var i = 0; i < T; i++) {
          for (var j = 0; j < T; j++) {
            m[i][j] = Math.pow(rho, Math.abs(i - j));
          }
        }
        break;
      case 'TOEP':
        for (var i = 0; i < T; i++) {
          for (var j = 0; j < T; j++) {
            var lag = Math.abs(i - j);
            if (lag === 0) m[i][j] = 1;
            else {
              var v = rho * Math.pow(0.85, lag - 1);
              m[i][j] = Math.round(v * 100) / 100;
            }
          }
        }
        break;
    }
    return m;
  }

  function countParams(type, T) {
    switch (type) {
      case 'UN': return T * (T + 1) / 2;
      case 'CS': return 2;
      case 'AR1': return 2;
      case 'TOEP': return T;
      default: return 0;
    }
  }

  function colorFor(val) {
    // val 0..1 -> blue to white to red
    var t = (val + 1) / 2; // 0..1
    var r, g, b;
    if (t < 0.5) {
      var f = t * 2;
      r = Math.round(58 + (255 - 58) * f);
      g = Math.round(120 + (255 - 120) * f);
      b = Math.round(165 + (255 - 165) * f);
    } else {
      var f = (t - 0.5) * 2;
      r = 255;
      g = Math.round(255 - (255 - 100) * f);
      b = Math.round(255 - (255 - 100) * f);
    }
    return 'rgb(' + r + ',' + g + ',' + b + ')';
  }

  function renderCovDemo(el) {
    var typeSel = el.querySelector('.cov-type');
    var tSlider = el.querySelector('.cov-t-slider');
    var rhoSlider = el.querySelector('.cov-rho-slider');
    var tVal = el.querySelector('.cov-t-val');
    var rhoVal = el.querySelector('.cov-rho-val');
    var matrixEl = el.querySelector('.cov-matrix');
    var paramsEl = el.querySelector('.cov-params');
    var patternEl = el.querySelector('.cov-pattern');

    function update() {
      var type = typeSel.value;
      var T = parseInt(tSlider.value, 10);
      var rho = parseFloat(rhoSlider.value);
      tVal.textContent = T;
      rhoVal.textContent = rho.toFixed(2);

      var m = generateMatrix(type, T, rho);
      matrixEl.style.gridTemplateColumns = 'repeat(' + T + ', 56px)';
      matrixEl.innerHTML = '';
      for (var i = 0; i < T; i++) {
        for (var j = 0; j < T; j++) {
          var cell = document.createElement('div');
          cell.className = 'cov-cell' + (i === j ? ' diag' : '');
          var v = m[i][j];
          cell.style.background = colorFor(v);
          cell.textContent = typeof v === 'number' ? v.toFixed(2) : v;
          cell.title = 'Σ[' + i + ',' + j + '] = ' + v;
          matrixEl.appendChild(cell);
        }
      }

      paramsEl.textContent = countParams(type, T);

      var patterns = {
        'UN': '每个元素自由估计，最灵活',
        'CS': '所有非对角元素相同（ρ）',
        'AR1': '按间隔指数衰减：ρ, ρ², ρ³…',
        'TOEP': '仅取决于间隔步数，不强制衰减'
      };
      patternEl.textContent = patterns[type] || '';
    }

    typeSel.addEventListener('change', update);
    tSlider.addEventListener('input', update);
    rhoSlider.addEventListener('input', update);
    update();
  }

  document.querySelectorAll('.cov-demo').forEach(renderCovDemo);
})();


/* ---- 2. 矩阵乘法动画 ---- */
(function () {
  function renderMatMult(el) {
    var A = [[1, 2, 3], [4, 5, 6]];  // 2x3
    var B = [[7, 8], [9, 10], [11, 12]]; // 3x2
    var rowsA = A.length, colsA = A[0].length;
    var rowsB = B.length, colsB = B[0].length;

    var gridA = el.querySelector('.mat-a');
    var gridB = el.querySelector('.mat-b');
    var gridC = el.querySelector('.mat-c');
    var playBtn = el.querySelector('.mat-play');
    var resetBtn = el.querySelector('.mat-reset');
    var stepInfo = el.querySelector('.mat-step-info');

    function buildGrid(grid, data, cls) {
      var rows = data.length, cols = data[0].length;
      grid.style.gridTemplateColumns = 'repeat(' + cols + ', 44px)';
      grid.innerHTML = '';
      for (var i = 0; i < rows; i++) {
        for (var j = 0; j < cols; j++) {
          var c = document.createElement('div');
          c.className = 'mcell';
          c.textContent = data[i][j];
          c.dataset.row = i;
          c.dataset.col = j;
          grid.appendChild(c);
        }
      }
    }

    function buildEmptyResult(grid, rows, cols) {
      grid.style.gridTemplateColumns = 'repeat(' + cols + ', 44px)';
      grid.innerHTML = '';
      for (var i = 0; i < rows; i++) {
        for (var j = 0; j < cols; j++) {
          var c = document.createElement('div');
          c.className = 'mcell';
          c.textContent = '?';
          c.dataset.row = i;
          c.dataset.col = j;
          grid.appendChild(c);
        }
      }
    }

    function clearHL(grid) {
      grid.querySelectorAll('.mcell').forEach(function (c) {
        c.classList.remove('hl-row', 'hl-col', 'hl-both');
      });
    }

    function highlightRow(grid, r) {
      grid.querySelectorAll('.mcell').forEach(function (c) {
        if (parseInt(c.dataset.row, 10) === r) c.classList.add('hl-row');
      });
    }

    function highlightCol(grid, col) {
      grid.querySelectorAll('.mcell').forEach(function (c) {
        if (parseInt(c.dataset.col, 10) === col) c.classList.add('hl-col');
      });
    }

    var animating = false;

    function animate() {
      if (animating) return;
      animating = true;
      playBtn.disabled = true;
      buildGrid(gridA, A, 'a');
      buildGrid(gridB, B, 'b');
      buildEmptyResult(gridC, rowsA, colsB);

      var i = 0, j = 0;

      function nextCell() {
        if (i >= rowsA) {
          animating = false;
          playBtn.disabled = false;
          stepInfo.textContent = '✓ 完成：C = A × B（' + rowsA + '×' + colsB + '）';
          clearHL(gridA);
          clearHL(gridB);
          return;
        }

        clearHL(gridA);
        clearHL(gridB);
        highlightRow(gridA, i);
        highlightCol(gridB, j);

        // 计算点积
        var sum = 0;
        var parts = [];
        for (var k = 0; k < colsA; k++) {
          sum += A[i][k] * B[k][j];
          parts.push(A[i][k] + '×' + B[k][j]);
        }

        stepInfo.textContent = 'C[' + i + ',' + j + '] = ' + parts.join(' + ') + ' = ' + sum;

        setTimeout(function () {
          var cell = gridC.querySelector('.mcell[data-row="' + i + '"][data-col="' + j + '"]');
          if (cell) {
            cell.textContent = sum;
            cell.classList.add('result-new');
          }
          j++;
          if (j >= colsB) { j = 0; i++; }
          setTimeout(nextCell, 550);
        }, 450);
      }

      stepInfo.textContent = '开始计算…';
      setTimeout(nextCell, 300);
    }

    function reset() {
      animating = false;
      playBtn.disabled = false;
      buildGrid(gridA, A, 'a');
      buildGrid(gridB, B, 'b');
      buildEmptyResult(gridC, rowsA, colsB);
      stepInfo.textContent = '点击"开始"观看乘法过程';
    }

    playBtn.addEventListener('click', animate);
    resetBtn.addEventListener('click', reset);
    reset();
  }

  document.querySelectorAll('.mat-mult-demo').forEach(renderMatMult);
})();


/* ---- 3. 缺失数据机制散点图 ---- */
(function () {
  function randn() {
    // Box-Muller
    var u1 = Math.random(), u2 = Math.random();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }

  function generateData(n) {
    var pts = [];
    for (var i = 0; i < n; i++) {
      var x = 50 + randn() * 15;
      var y = 30 + 0.6 * x + randn() * 8;
      pts.push({ x: x, y: y, observed: true });
    }
    return pts;
  }

  function applyMissing(pts, mechanism, rate) {
    pts.forEach(function (p) { p.observed = true; });
    var n = pts.length;
    var toMiss = Math.floor(n * rate);

    if (mechanism === 'MCAR') {
      // 完全随机：纯随机选择
      var indices = [];
      for (var i = 0; i < n; i++) indices.push(i);
      shuffle(indices);
      for (var i = 0; i < toMiss; i++) {
        pts[indices[i]].observed = false;
      }
    } else if (mechanism === 'MAR') {
      // 随机缺失：取决于 x（已观测值）
      // x 越大，缺失概率越高
      var sorted = pts.slice().sort(function (a, b) { return a.x - b.x; });
      // 让 x 最高的 toMiss 个有更高概率缺失
      var startIdx = Math.floor(n * 0.4);
      var candidates = sorted.slice(startIdx);
      shuffle(candidates);
      for (var i = 0; i < toMiss && i < candidates.length; i++) {
        candidates[i].observed = false;
      }
    } else if (mechanism === 'MNAR') {
      // 非随机缺失：取决于 y 本身（未观测值）
      // y 越小，缺失概率越高（比如病情越重越不来）
      var sorted = pts.slice().sort(function (a, b) { return a.y - b.y; });
      for (var i = 0; i < toMiss; i++) {
        sorted[i].observed = false;
      }
    }
    return pts;
  }

  function shuffle(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
  }

  function renderChart(svg, pts, w, h) {
    var pad = 30;
    var xMin = 10, xMax = 90;
    var yMin = 20, yMax = 90;

    function sx(x) { return pad + (x - xMin) / (xMax - xMin) * (w - pad * 2); }
    function sy(y) { return h - pad - (y - yMin) / (yMax - yMin) * (h - pad * 2); }

    var ns = 'http://www.w3.org/2000/svg';
    svg.innerHTML = '';
    svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', w > 400 ? '280' : '220');

    // 坐标轴
    var xAxis = document.createElementNS(ns, 'line');
    xAxis.setAttribute('x1', pad); xAxis.setAttribute('y1', h - pad);
    xAxis.setAttribute('x2', w - pad); xAxis.setAttribute('y2', h - pad);
    xAxis.setAttribute('stroke', '#ccc'); xAxis.setAttribute('stroke-width', '1');
    svg.appendChild(xAxis);

    var yAxis = document.createElementNS(ns, 'line');
    yAxis.setAttribute('x1', pad); yAxis.setAttribute('y1', pad);
    yAxis.setAttribute('x2', pad); yAxis.setAttribute('y2', h - pad);
    yAxis.setAttribute('stroke', '#ccc'); yAxis.setAttribute('stroke-width', '1');
    svg.appendChild(yAxis);

    // 轴标签
    var xLab = document.createElementNS(ns, 'text');
    xLab.setAttribute('x', w - pad); xLab.setAttribute('y', h - 8);
    xLab.setAttribute('text-anchor', 'end'); xLab.setAttribute('font-size', '11');
    xLab.setAttribute('fill', '#888');
    xLab.textContent = '基线值 / 访视1';
    svg.appendChild(xLab);

    var yLab = document.createElementNS(ns, 'text');
    yLab.setAttribute('x', 8); yLab.setAttribute('y', pad + 4);
    yLab.setAttribute('font-size', '11'); yLab.setAttribute('fill', '#888');
    yLab.textContent = '终点值';
    svg.appendChild(yLab);

    // 画点
    pts.forEach(function (p) {
      var cx = sx(p.x), cy = sy(p.y);
      if (cx < pad || cx > w - pad || cy < pad || cy > h - pad) return;
      var circle = document.createElementNS(ns, 'circle');
      circle.setAttribute('cx', cx);
      circle.setAttribute('cy', cy);
      circle.setAttribute('r', p.observed ? 4 : 4);
      if (p.observed) {
        circle.setAttribute('fill', '#2d7a2d');
        circle.setAttribute('opacity', '0.7');
      } else {
        circle.setAttribute('fill', 'none');
        circle.setAttribute('stroke', '#c0392b');
        circle.setAttribute('stroke-width', '2');
        circle.setAttribute('opacity', '0.8');
      }
      svg.appendChild(circle);
    });

    // 统计文字
    var obs = pts.filter(function (p) { return p.observed; }).length;
    var miss = pts.length - obs;
    var statText = document.createElementNS(ns, 'text');
    statText.setAttribute('x', w - pad);
    statText.setAttribute('y', pad + 12);
    statText.setAttribute('text-anchor', 'end');
    statText.setAttribute('font-size', '11.5');
    statText.setAttribute('fill', '#666');
    statText.textContent = '观测 ' + obs + ' · 缺失 ' + miss + ' (' + Math.round(miss / pts.length * 100) + '%)';
    svg.appendChild(statText);
  }

  function renderMissingDemo(el) {
    var sel = el.querySelector('.missing-type');
    var btn = el.querySelector('.missing-regen');
    var svg = el.querySelector('svg');
    var desc = el.querySelector('.missing-desc');
    var allData = generateData(80);

    var descriptions = {
      'MCAR': '缺失完全随机，与观测值和未观测值都无关。散点均匀分布，缺失点随机散布。',
      'MAR': '缺失取决于已观测到的数据（如基线值高的受试者更易缺失）。注意右侧缺失更多。',
      'MNAR': '缺失取决于未观测值本身（如病情越重越不来随访）。下方低值点大量缺失。'
    };

    function update() {
      var type = sel.value;
      var pts = applyMissing(allData.slice().map(function(p){return {x:p.x,y:p.y,observed:true};}), type, 0.3);
      renderChart(svg, pts, 440, 280);
      desc.textContent = descriptions[type] || '';
    }

    sel.addEventListener('change', update);
    btn.addEventListener('click', function () {
      allData = generateData(80);
      update();
    });
    update();
  }

  document.querySelectorAll('.missing-demo').forEach(renderMissingDemo);
})();


/* ---- 4. 参数数量增长曲线 ---- */
(function () {
  function renderParamCurve(el) {
    var svg = el.querySelector('svg');
    var w = 500, h = 260;
    var pad = { l: 40, r: 20, t: 20, b: 30 };
    var ns = 'http://www.w3.org/2000/svg';

    svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '260');

    var structures = [
      { name: 'UN', color: '#c0392b', fn: function (T) { return T * (T + 1) / 2; } },
      { name: 'TOEP', color: '#e67e22', fn: function (T) { return T; } },
      { name: 'AR(1)', color: '#27ae60', fn: function (T) { return 2; } },
      { name: 'CS', color: '#2980b9', fn: function (T) { return 2; } }
    ];

    var tMax = 10;
    var yMax = 55;

    function sx(t) { return pad.l + (t - 1) / (tMax - 1) * (w - pad.l - pad.r); }
    function sy(v) { return h - pad.b - (v / yMax) * (h - pad.t - pad.b); }

    // 网格线
    for (var i = 0; i <= 5; i++) {
      var y = pad.t + (h - pad.t - pad.b) * i / 5;
      var line = document.createElementNS(ns, 'line');
      line.setAttribute('x1', pad.l); line.setAttribute('y1', y);
      line.setAttribute('x2', w - pad.r); line.setAttribute('y2', y);
      line.setAttribute('stroke', '#e0d8c0'); line.setAttribute('stroke-width', '0.5');
      svg.appendChild(line);

      var label = document.createElementNS(ns, 'text');
      label.setAttribute('x', pad.l - 6); label.setAttribute('y', y + 4);
      label.setAttribute('text-anchor', 'end'); label.setAttribute('font-size', '10');
      label.setAttribute('fill', '#8a7a5a');
      label.textContent = Math.round(yMax - yMax * i / 5);
      svg.appendChild(label);
    }

    // x 轴标签
    for (var t = 1; t <= tMax; t++) {
      var xlab = document.createElementNS(ns, 'text');
      xlab.setAttribute('x', sx(t)); xlab.setAttribute('y', h - pad.b + 16);
      xlab.setAttribute('text-anchor', 'middle'); xlab.setAttribute('font-size', '10');
      xlab.setAttribute('fill', '#8a7a5a');
      xlab.textContent = t;
      svg.appendChild(xlab);
    }

    // 轴标题
    var xt = document.createElementNS(ns, 'text');
    xt.setAttribute('x', w / 2); xt.setAttribute('y', h - 4);
    xt.setAttribute('text-anchor', 'middle'); xt.setAttribute('font-size', '11');
    xt.setAttribute('fill', '#6b5a3a');
    xt.textContent = '访视数 T';
    svg.appendChild(xt);

    var yt = document.createElementNS(ns, 'text');
    yt.setAttribute('x', 10); yt.setAttribute('y', pad.t + 40);
    yt.setAttribute('font-size', '11'); yt.setAttribute('fill', '#6b5a3a');
    yt.setAttribute('transform', 'rotate(-90, 10, ' + (pad.t + 40) + ')');
    yt.textContent = '参数个数';
    svg.appendChild(yt);

    // 画线
    structures.forEach(function (s) {
      var path = '';
      var pts = [];
      for (var t = 1; t <= tMax; t++) {
        var v = s.fn(t);
        pts.push({ t: t, v: v });
        if (t === 1) path += 'M' + sx(t) + ',' + sy(v);
        else path += ' L' + sx(t) + ',' + sy(v);
      }

      var p = document.createElementNS(ns, 'path');
      p.setAttribute('d', path);
      p.setAttribute('fill', 'none');
      p.setAttribute('stroke', s.color);
      p.setAttribute('stroke-width', '2.5');
      p.setAttribute('stroke-linecap', 'round');
      p.setAttribute('stroke-linejoin', 'round');
      svg.appendChild(p);

      // 端点标注
      var lastPt = pts[pts.length - 1];
      var txt = document.createElementNS(ns, 'text');
      txt.setAttribute('x', sx(lastPt.t) + 8);
      txt.setAttribute('y', sy(lastPt.v) + 4);
      txt.setAttribute('font-size', '11');
      txt.setAttribute('font-weight', '600');
      txt.setAttribute('fill', s.color);
      txt.textContent = s.name + ' (' + lastPt.v + ')';
      svg.appendChild(txt);

      // 圆点
      pts.forEach(function (pt) {
        var c = document.createElementNS(ns, 'circle');
        c.setAttribute('cx', sx(pt.t));
        c.setAttribute('cy', sy(pt.v));
        c.setAttribute('r', 3);
        c.setAttribute('fill', s.color);
        c.setAttribute('stroke', '#fff');
        c.setAttribute('stroke-width', '1.5');
        svg.appendChild(c);
      });
    });
  }

  document.querySelectorAll('.param-curve-demo').forEach(renderParamCurve);
})();
