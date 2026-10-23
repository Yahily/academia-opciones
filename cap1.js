"use strict";
(function () {
  const OL = window.OL, $ = OL.$;

  /* ---------- simulador de un contrato comprado ---------- */
  const simType = $("#simType"), simStrike = $("#simStrike"), simPrem = $("#simPrem"), simPrice = $("#simPrice");

  function syncRange() {
    const k = Number(simStrike.value) || 1;
    const prev = simPrice.max ? (Number(simPrice.value) - Number(simPrice.min)) / (Number(simPrice.max) - Number(simPrice.min)) : 0.5;
    simPrice.min = (k * 0.85).toFixed(2);
    simPrice.max = (k * 1.15).toFixed(2);
    simPrice.step = Math.max(k / 1000, 0.01).toFixed(2);
    simPrice.value = (Number(simPrice.min) + prev * (Number(simPrice.max) - Number(simPrice.min))).toFixed(2);
  }

  function update() {
    const type = simType.value;
    const k = Number(simStrike.value) || 1;
    const p = Math.max(Number(simPrem.value) || 0.01, 0.01);
    const price = Number(simPrice.value);
    const pnl = OL.payoff(type, k, p, price);
    $("#simPriceLabel").textContent = OL.usd(price);
    $("#rCost").textContent = OL.usd(p * 100);
    $("#rBE").textContent = OL.usd(OL.breakeven(type, k, p));
    $("#rPnL").innerHTML = OL.money(pnl);
    $("#rMaxLoss").innerHTML = OL.money(-p * 100);

    const lo = k * 0.85, hi = k * 1.15, pts = [];
    for (let i = 0; i <= 60; i++) { const s = lo + ((hi - lo) * i) / 60; pts.push([s, OL.payoff(type, k, p, s)]); }
    OL.drawChart($("#simChart"), {
      xmin: lo, xmax: hi, xfmt: (v) => OL.usd0(v), xTitle: "Precio del activo al vencimiento",
      series: [{ pts: pts, color: "var(--accent)" }],
      markers: [{ x: price, y: pnl, color: pnl >= 0 ? "var(--good)" : "var(--bad)" }],
      vlines: [{ x: k, label: "strike" }]
    });
  }

  [simType, simPrem].forEach((el) => el.addEventListener("input", update));
  simStrike.addEventListener("input", () => { syncRange(); update(); });
  simPrice.addEventListener("input", update);
  syncRange();
  update();

  /* ---------- quiz ---------- */
  OL.initQuiz([
    { q: "¿Cuántas unidades del subyacente controla normalmente un contrato de opciones sobre acciones o ETF en Estados Unidos?",
      options: ["1", "10", "100", "1,000"], correct: 2,
      why: "Cada contrato cubre 100 unidades, por eso la prima cotizada se multiplica por 100." },
    { q: "Pagaste $20 por congelar el precio de un vuelo en $300 (un call). ¿A qué precio del vuelo quedas a mano?",
      options: ["$280", "$300", "$320", "$340"], correct: 2,
      why: "En un call, punto de equilibrio = strike + prima = 300 + 20 = 320. Arriba de $320 ya ganas." },
    { q: "Pagaste $300 por poder vender tu auto a $10,000 dentro de un mes (un put). ¿Cuánto es lo máximo que puedes perder con ese contrato?",
      options: ["$10,000", "$300", "$9,700", "Todo lo que valga el auto"], correct: 1,
      why: "Quien compra una opción solo puede perder lo que pagó por ella: la prima." },
    { q: "¿Qué derecho te da comprar un put?",
      options: ["Comprar al strike", "Vender al strike", "Recibir dividendos", "Ninguno"], correct: 1,
      why: "El put da el derecho a vender al precio strike; el call, a comprar." },
    { q: "Una opción cotiza con prima de 2.50. ¿Cuánto cuesta un contrato?",
      options: ["2.50 dólares", "25 dólares", "250 dólares", "2,500 dólares"], correct: 2,
      why: "2.50 × 100 unidades = 250 dólares." },
    { q: "Congelaste el precio de un vuelo en $300 y el viernes cuesta $250. ¿Qué pasa?",
      options: ["Estás obligado a comprar a $300", "No usas el derecho y pierdes los $20 que pagaste", "Ganas $50", "La aerolínea te devuelve los $20"], correct: 1,
      why: "Pagar $300 por lo que cuesta $250 no tiene sentido. El contrato vence sin valor y solo pierdes la prima." }
  ]);
})();
