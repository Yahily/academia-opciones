"use strict";
(function () {
  const OL = window.OL, $ = OL.$;

  /* ---------- esquema de la pantalla de TradingView ---------- */
  (function mock() {
    const box = (x, y, w, h, fill) => '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="4" style="fill:' + (fill || "var(--bg)") + ';stroke:var(--chart-grid)" stroke-width="1"/>';
    const txt = (x, y, t, anchor) => '<text x="' + x + '" y="' + y + '"' + (anchor ? ' text-anchor="' + anchor + '"' : "") + ">" + t + "</text>";
    const badge = (x, y, n) => '<circle cx="' + x + '" cy="' + y + '" r="10" style="fill:var(--accent)"/><text x="' + x + '" y="' + (y + 4) + '" text-anchor="middle" style="fill:var(--accent-ink);font-weight:700">' + n + "</text>";
    let s = box(0, 0, 600, 330, "var(--card)");
    s += box(0, 0, 600, 34) + box(0, 34, 34, 262) + box(450, 34, 150, 262) + box(0, 296, 600, 34);
    // barra superior
    s += box(8, 6, 66, 22, "var(--card)") + txt(41, 21, "QQQ", "middle");
    s += box(84, 6, 34, 22, "var(--card)") + txt(101, 21, "1D", "middle");
    s += box(128, 6, 34, 22, "var(--card)") + txt(145, 21, "▮▯▮", "middle");
    s += box(172, 6, 86, 22, "var(--card)") + txt(215, 21, "Indicadores", "middle");
    s += box(268, 6, 58, 22, "var(--card)") + txt(297, 21, "Alerta", "middle");
    // herramientas
    for (let i = 0; i < 6; i++) s += box(8, 74 + i * 34, 18, 18, "var(--card)");
    // lista de seguimiento
    s += txt(462, 54, "Seguimiento");
    ["QQQ", "IWM", "DIA"].forEach((t, i) => { s += box(458, 66 + i * 30, 134, 24, "var(--card)") + txt(468, 82 + i * 30, t); });
    // barra inferior
    s += txt(46, 317, "1D   5D   1M   3M   1A");
    // velas
    const C = [[70, 170, 230, 185, 215, 1], [98, 160, 225, 170, 205, 1], [126, 150, 210, 160, 195, 1], [154, 145, 200, 165, 190, 0], [182, 150, 215, 160, 200, 1],
      [210, 130, 195, 140, 180, 1], [238, 120, 180, 125, 165, 1], [266, 125, 185, 135, 175, 0], [294, 110, 170, 115, 160, 1], [322, 100, 160, 105, 150, 1],
      [350, 105, 165, 115, 155, 0], [378, 90, 150, 95, 140, 1], [406, 80, 140, 85, 130, 1]];
    C.forEach((c) => {
      const col = c[5] ? "var(--good)" : "var(--bad)";
      s += '<line x1="' + c[0] + '" x2="' + c[0] + '" y1="' + c[1] + '" y2="' + c[2] + '" style="stroke:' + col + '" stroke-width="2"/>';
      s += '<rect x="' + (c[0] - 8) + '" y="' + c[3] + '" width="16" height="' + (c[4] - c[3]) + '" style="fill:' + col + '"/>';
    });
    // insignias numeradas
    s += badge(41, 40, 1) + badge(101, 40, 2) + badge(145, 40, 3) + badge(215, 40, 4) + badge(297, 40, 5);
    s += badge(17, 64, 6) + badge(570, 50, 7) + badge(250, 230, 8) + badge(300, 312, 9);
    $("#mockUI").setAttribute("viewBox", "0 0 600 330");
    $("#mockUI").innerHTML = s;
  })();

  /* ---------- armar una vela ---------- */
  const vo = $("#cO"), vh = $("#cH"), vl = $("#cL"), vc = $("#cC");
  function candle() {
    const o = Number(vo.value), h = Number(vh.value), l = Number(vl.value), c = Number(vc.value);
    const msg = $("#cMsg"), svg = $("#candleSvg");
    const fields = [o, h, l, c];
    if (fields.some((x) => !isFinite(x)) || [vo, vh, vl, vc].some((e) => e.value === "")) {
      msg.hidden = false; msg.textContent = "Escribe los cuatro números."; svg.innerHTML = ""; return;
    }
    if (h < Math.max(o, c) || l > Math.min(o, c) || h < l) {
      msg.hidden = false;
      msg.textContent = "Los datos no son posibles: el máximo debe ser el valor más alto y el mínimo el más bajo, incluyendo la apertura y el cierre.";
      svg.innerHTML = ""; $("#cKind").textContent = "—"; $("#cBody").textContent = "—"; $("#cWicks").textContent = "—"; $("#cRange").textContent = "—";
      return;
    }
    msg.hidden = true;
    const up = c >= o;
    const pad = Math.max((h - l) * 0.18, 0.5);
    const lo = l - pad, hi = h + pad;
    const Y = (v) => 20 + ((hi - v) / (hi - lo)) * 240;
    const col = up ? "var(--good)" : "var(--bad)";
    const bt = Y(Math.max(o, c)), bb = Y(Math.min(o, c));
    let s = '<line x1="300" x2="300" y1="' + Y(h) + '" y2="' + Y(l) + '" style="stroke:' + col + '" stroke-width="3"/>';
    s += '<rect x="265" y="' + bt + '" width="70" height="' + Math.max(bb - bt, 2) + '" style="fill:' + col + '"/>';
    const lab = [[h, "Máximo"], [Math.max(o, c), up ? "Cierre" : "Apertura"], [Math.min(o, c), up ? "Apertura" : "Cierre"], [l, "Mínimo"]];
    lab.forEach((q, i) => {
      const y = Y(q[0]);
      s += '<line x1="340" x2="372" y1="' + y + '" y2="' + y + '" style="stroke:var(--muted)" stroke-width="1" stroke-dasharray="3 3"/>';
      s += '<text x="378" y="' + (y + 4) + '">' + q[1] + " " + OL.num(q[0], 2) + "</text>";
    });
    s += '<text x="40" y="40" style="font-weight:700;fill:' + col + '">' + (up ? "Vela alcista" : "Vela bajista") + "</text>";
    svg.setAttribute("viewBox", "0 0 600 280");
    svg.innerHTML = s;
    $("#cKind").textContent = c === o ? "Neutra (cierre igual a apertura)" : up ? "Alcista (cierre sobre apertura)" : "Bajista (cierre bajo apertura)";
    $("#cBody").textContent = OL.num(Math.abs(c - o), 2);
    $("#cWicks").textContent = OL.num(h - Math.max(o, c), 2) + " / " + OL.num(Math.min(o, c) - l, 2);
    $("#cRange").textContent = OL.num(h - l, 2);
  }
  [vo, vh, vl, vc].forEach((e) => e.addEventListener("input", candle));
  candle();

  /* ---------- serie de ejemplo (datos inventados) ---------- */
  const SERIES = [103, 105, 107, 108.5, 109, 108, 106, 104, 102, 101, 102.5, 104, 106, 108, 109.2, 108.5, 107, 105, 103, 101.2, 100.8, 102, 104, 106,
    107.5, 108.8, 109.1, 108, 106.5, 104.5, 102.5, 101.5, 103, 105, 107, 108.7, 109.3, 110.5, 112, 113.5, 112.5, 111, 110, 111.5, 113, 114.5, 115.5,
    114.5, 113.2, 112, 111, 112.5, 114, 115.8, 117];
  const N = SERIES.length;
  const price = SERIES.map((v, i) => [i + 1, v]);
  const yf = (v) => OL.num(v, 0);

  function sr() {
    const on = $("#srToggle").checked;
    const series = [{ pts: price, color: "var(--accent)", name: "Precio de ejemplo" }];
    if (on) {
      series.push({ pts: [[1, 109], [N, 109]], color: "var(--bad)", dash: "7 5", width: 2, name: "Resistencia ≈ 109" });
      series.push({ pts: [[1, 101], [N, 101]], color: "var(--good)", dash: "7 5", width: 2, name: "Soporte ≈ 101" });
    }
    OL.drawChart($("#srChart"), { xmin: 1, xmax: N, ymin: 98, ymax: 120, xfmt: (x) => OL.num(x, 0), yfmt: yf, xTitle: "Velas (días de ejemplo)", series: series });
  }
  $("#srToggle").addEventListener("change", sr);
  sr();

  function sma(n) {
    const out = [];
    for (let i = n - 1; i < N; i++) {
      let a = 0;
      for (let j = i - n + 1; j <= i; j++) a += SERIES[j];
      out.push([i + 1, a / n]);
    }
    return out;
  }
  function smaDraw() {
    const n = Number($("#smaN").value);
    $("#smaLabel").textContent = n + " cierres";
    OL.drawChart($("#smaChart"), {
      xmin: 1, xmax: N, ymin: 98, ymax: 120, xfmt: (x) => OL.num(x, 0), yfmt: yf, xTitle: "Velas (días de ejemplo)",
      series: [
        { pts: price, color: "var(--muted)", width: 2, name: "Precio" },
        { pts: sma(n), color: "var(--accent)", width: 3, name: "Media móvil " + n }
      ]
    });
  }
  $("#smaN").addEventListener("input", smaDraw);
  smaDraw();

  /* ---------- quiz ---------- */
  OL.initQuiz([
    { q: "Una vela tiene apertura 100, cierre 104, mínimo 98 y máximo 106. ¿Cómo es y cuánto mide su cuerpo?",
      options: ["Bajista, cuerpo de 4", "Alcista, cuerpo de 4", "Alcista, cuerpo de 8", "Bajista, cuerpo de 8"], correct: 1,
      why: "Cerró (104) por encima de donde abrió (100): es alcista. El cuerpo va de la apertura al cierre: 104 − 100 = 4. El rango total (8) incluye las mechas." },
    { q: "¿Qué es un soporte?",
      options: ["Una zona donde el precio ha frenado sus caídas", "Un indicador de volumen", "El precio máximo del día", "Una orden de venta"], correct: 0,
      why: "Un soporte es una zona de precios donde el activo ha rebotado hacia arriba en el pasado, como el piso de la habitación." },
    { q: "¿Qué temporalidad conviene mirar primero para obtener el panorama general?",
      options: ["1 minuto", "5 minutos", "Diaria", "Da igual"], correct: 2,
      why: "Se analiza de lo grande a lo pequeño: primero la diaria para el contexto, y después una hora para el detalle." },
    { q: "¿Qué calcula una media móvil de 20?",
      options: ["El precio más alto de 20 días", "El promedio de los últimos 20 cierres", "El volumen de 20 días", "Veinte por ciento del precio"], correct: 1,
      why: "Es el promedio de los últimos 20 cierres, recalculado en cada vela." },
    { q: "El RSI marca 75. ¿Qué significa en términos estrictos?",
      options: ["El precio va a bajar seguro", "Subió rápido: se considera sobrecompra, pero no garantiza una caída", "El volumen es alto", "Hay que vender"], correct: 1,
      why: "Sobre 70 se llama sobrecompra por convención. En tendencias fuertes puede mantenerse alto mucho tiempo, así que no es una señal por sí solo." },
    { q: "¿Para qué sirve una alerta de TradingView?",
      options: ["Para comprar automáticamente", "Para que te avise cuando el precio cumpla una condición", "Para borrar el gráfico", "Para cambiar de broker"], correct: 1,
      why: "La alerta solo avisa. La compra o venta se hace en tu broker." },
    { q: "¿TradingView es tu broker?",
      options: ["Sí, ahí se ejecutan las operaciones", "No, es una plataforma de gráficos; las operaciones se ejecutan en el broker", "Solo si pagas un plan", "Solo en la aplicación de escritorio"], correct: 1,
      why: "TradingView sirve para analizar. Las operaciones de este manual se ejecutan en Schwab u otro broker." }
  ]);
})();
