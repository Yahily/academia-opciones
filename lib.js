"use strict";
/* Matemática de la academia: payoff de contratos, Black-Scholes y estrategias.
   Funciona en el navegador (window.OL) y en Node (module.exports) para poder probarse. */
(function (root) {
  const OL = {};

  /* ---------- contrato simple ---------- */
  OL.intrinsic = function (type, S, K) {
    return type === "call" ? Math.max(S - K, 0) : Math.max(K - S, 0);
  };
  // Resultado en dólares de COMPRAR un contrato (100 unidades) al vencimiento.
  OL.payoff = function (type, strike, premium, price) {
    return (OL.intrinsic(type, price, strike) - premium) * 100;
  };
  OL.breakeven = function (type, strike, premium) {
    return type === "call" ? strike + premium : strike - premium;
  };

  /* ---------- Black-Scholes (modelo teórico, sin dividendos) ---------- */
  function erfc(x) {
    const z = Math.abs(x);
    const t = 1 / (1 + 0.5 * z);
    const r = t * Math.exp(-z * z - 1.26551223 + t * (1.00002368 + t * (0.37409196 + t * (0.09678418 +
      t * (-0.18628806 + t * (0.27886807 + t * (-1.13520398 + t * (1.48851587 + t * (-0.82215223 + t * 0.17087277)))))))));
    return x >= 0 ? r : 2 - r;
  }
  const N = (x) => 0.5 * erfc(-x / Math.SQRT2);
  const n = (x) => Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);

  // T en años, r y sigma en decimales (0.04 = 4 %). theta por día, vega por 1 punto de volatilidad.
  OL.bs = function (type, S, K, T, r, sigma) {
    if (T <= 0 || sigma <= 0) {
      const iv = OL.intrinsic(type, S, K);
      const itm = type === "call" ? S > K : S < K;
      return { price: iv, delta: itm ? (type === "call" ? 1 : -1) : 0, gamma: 0, theta: 0, vega: 0 };
    }
    const sq = Math.sqrt(T);
    const d1 = (Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * sq);
    const d2 = d1 - sigma * sq;
    const disc = Math.exp(-r * T);
    let price, delta, theta;
    if (type === "call") {
      price = S * N(d1) - K * disc * N(d2);
      delta = N(d1);
      theta = (-S * n(d1) * sigma / (2 * sq) - r * K * disc * N(d2)) / 365;
    } else {
      price = K * disc * N(-d2) - S * N(-d1);
      delta = N(d1) - 1;
      theta = (-S * n(d1) * sigma / (2 * sq) + r * K * disc * N(-d2)) / 365;
    }
    const gamma = n(d1) / (S * sigma * sq);
    const vega = (S * n(d1) * sq) / 100;
    return { price, delta, gamma, theta, vega };
  };

  /* ---------- estrategias de varias patas ---------- */
  // Pata de opción: {kind:"call"|"put", side:+1 compra | -1 venta, strike, price (prima por unidad), qty (contratos)}
  // Pata de acciones: {kind:"stock", side:+1, price (costo por acción), qty (acciones)}
  OL.legPL = function (leg, S) {
    if (leg.kind === "stock") return leg.side * (S - leg.price) * leg.qty;
    return leg.side * (OL.intrinsic(leg.kind, S, leg.strike) - leg.price) * 100 * leg.qty;
  };
  OL.totalPL = function (legs, S) {
    return legs.reduce((a, l) => a + OL.legPL(l, S), 0);
  };

  // Analiza el resultado AL VENCIMIENTO. Es lineal por tramos, así que basta evaluar en los strikes.
  OL.analyze = function (legs) {
    const strikes = legs.filter((l) => l.kind !== "stock").map((l) => l.strike);
    const prices = legs.map((l) => (l.kind === "stock" ? l.price : l.strike));
    const far = Math.max(...prices, 1) * 10;
    const pts = Array.from(new Set([0, ...strikes])).sort((a, b) => a - b);
    const all = pts.concat([far]);
    const vals = all.map((s) => OL.totalPL(legs, s));
    const slopeRight = OL.totalPL(legs, far + 1) - OL.totalPL(legs, far);
    const eps = 1e-9;
    const unlimitedGain = slopeRight > eps;
    const unlimitedLoss = slopeRight < -eps;
    const maxGain = unlimitedGain ? Infinity : Math.max(...vals);
    const maxLoss = unlimitedLoss ? -Infinity : Math.min(...vals);
    const breakevens = [];
    const add = (x) => { if (!breakevens.some((b) => Math.abs(b - x) < 1e-6)) breakevens.push(x); };
    for (let i = 0; i < all.length; i++) {
      const a = vals[i];
      if (Math.abs(a) < eps) { add(all[i]); continue; }
      if (i < all.length - 1) {
        const b = vals[i + 1];
        if ((a < 0 && b > eps) || (a > 0 && b < -eps)) add(all[i] + ((all[i + 1] - all[i]) * (0 - a)) / (b - a));
      }
    }
    breakevens.sort((a, b) => a - b);
    // Crédito neto recibido (positivo) o débito pagado (negativo), solo opciones.
    const netCredit = legs.filter((l) => l.kind !== "stock")
      .reduce((a, l) => a - l.side * l.price * 100 * l.qty, 0);
    return { maxGain, maxLoss, breakevens, netCredit, unlimitedGain, unlimitedLoss };
  };

  /* ---------- catálogo de estrategias ---------- */
  // level = nivel de aprobación de opciones en Schwab según su tabla de ayuda (0 a 3).
  // off = distancia del strike respecto al precio actual (0.03 = 3 % arriba).
  OL.STRATEGIES = [
    { id: "longCall", name: "Compra de call", views: ["sube"], level: 1, type: "débito", defined: true,
      desc: "Esperas que el activo suba con fuerza y a tiempo. Pierdes como máximo la prima.",
      legs: [{ kind: "call", side: 1, off: 0, label: "Compra call" }] },
    { id: "longPut", name: "Compra de put", views: ["baja"], level: 1, type: "débito", defined: true,
      desc: "Esperas que el activo baje con fuerza y a tiempo. Pierdes como máximo la prima.",
      legs: [{ kind: "put", side: 1, off: 0, label: "Compra put" }] },
    { id: "bullCallSpread", name: "Spread alcista de débito (bull call spread)", views: ["sube"], level: 2, type: "débito", defined: true,
      desc: "Compras un call y vendes otro más lejano. Cuesta menos que el call solo, pero limitas la ganancia.",
      legs: [{ kind: "call", side: 1, off: 0, label: "Compra call (strike bajo)" }, { kind: "call", side: -1, off: 0.04, label: "Venta call (strike alto)" }] },
    { id: "bearPutSpread", name: "Spread bajista de débito (bear put spread)", views: ["baja"], level: 2, type: "débito", defined: true,
      desc: "Compras un put y vendes otro más bajo. Cuesta menos que el put solo, pero limitas la ganancia.",
      legs: [{ kind: "put", side: 1, off: 0, label: "Compra put (strike alto)" }, { kind: "put", side: -1, off: -0.04, label: "Venta put (strike bajo)" }] },
    { id: "bullPutSpread", name: "Spread alcista de crédito (bull put spread)", views: ["sube", "lateral"], level: 2, type: "crédito", defined: true,
      desc: "Vendes un put y compras otro más bajo como protección. Cobras al entrar y ganas si el activo no cae.",
      legs: [{ kind: "put", side: -1, off: -0.02, label: "Venta put (strike alto)" }, { kind: "put", side: 1, off: -0.06, label: "Compra put (strike bajo)" }] },
    { id: "bearCallSpread", name: "Spread bajista de crédito (bear call spread)", views: ["baja", "lateral"], level: 2, type: "crédito", defined: true,
      desc: "Vendes un call y compras otro más alto como protección. Cobras al entrar y ganas si el activo no sube.",
      legs: [{ kind: "call", side: -1, off: 0.02, label: "Venta call (strike bajo)" }, { kind: "call", side: 1, off: 0.06, label: "Compra call (strike alto)" }] },
    { id: "coveredCall", name: "Call cubierto (covered call)", views: ["lateral", "sube"], level: 0, type: "crédito", defined: false, capital: "stock",
      desc: "Tienes 100 acciones y vendes un call por encima. Cobras una prima a cambio de limitar la ganancia de las acciones.",
      legs: [{ kind: "stock", side: 1, off: 0, label: "Compra 100 acciones", qty: 100 }, { kind: "call", side: -1, off: 0.03, label: "Venta call" }] },
    { id: "cashSecuredPut", name: "Put con efectivo asegurado (cash-secured put)", views: ["lateral", "sube"], level: 1, type: "crédito", defined: false, capital: "strike",
      desc: "Vendes un put y apartas el efectivo para comprar 100 acciones si te las asignan. Cobras prima por esperar un precio más bajo.",
      legs: [{ kind: "put", side: -1, off: -0.03, label: "Venta put" }] },
    { id: "protectivePut", name: "Put protector (protective put)", views: ["proteger"], level: 1, type: "débito", defined: false, capital: "stock",
      desc: "Tienes 100 acciones y compras un put como seguro contra una caída. La prima es el costo del seguro.",
      legs: [{ kind: "stock", side: 1, off: 0, label: "Compra 100 acciones", qty: 100 }, { kind: "put", side: 1, off: -0.03, label: "Compra put" }] },
    { id: "longStraddle", name: "Straddle comprado", views: ["grande"], level: 1, type: "débito", defined: true,
      desc: "Compras un call y un put con el mismo strike. Ganas si el activo se mueve mucho, en cualquier dirección.",
      legs: [{ kind: "call", side: 1, off: 0, label: "Compra call" }, { kind: "put", side: 1, off: 0, label: "Compra put" }] },
    { id: "longStrangle", name: "Strangle comprado", views: ["grande"], level: 1, type: "débito", defined: true,
      desc: "Compras un call y un put con strikes distintos y fuera del dinero. Más barato que el straddle, pero necesita un movimiento mayor.",
      legs: [{ kind: "call", side: 1, off: 0.03, label: "Compra call" }, { kind: "put", side: 1, off: -0.03, label: "Compra put" }] },
    { id: "ironCondor", name: "Iron condor", views: ["lateral"], level: 2, type: "crédito", defined: true,
      desc: "Combinas un spread de crédito de puts con uno de calls. Ganas si el activo se queda dentro de un rango.",
      legs: [{ kind: "put", side: 1, off: -0.06, label: "Compra put (protección)" }, { kind: "put", side: -1, off: -0.03, label: "Venta put" },
        { kind: "call", side: -1, off: 0.03, label: "Venta call" }, { kind: "call", side: 1, off: 0.06, label: "Compra call (protección)" }] }
  ];
  OL.strategy = (id) => OL.STRATEGIES.find((s) => s.id === id);

  OL.stepFor = (S) => (S >= 200 ? 1 : S >= 50 ? 0.5 : 0.25);
  OL.roundTo = (x, step) => Math.round(x / step) * step;

  // Arma las patas con strikes y primas teóricas de ejemplo.
  OL.buildLegs = function (strategyId, S, days, ivPct, ratePct) {
    const st = OL.strategy(strategyId);
    const T = Math.max(days, 1) / 365;
    const step = OL.stepFor(S);
    return st.legs.map((l) => {
      if (l.kind === "stock") return { kind: "stock", side: l.side, price: S, qty: l.qty || 100, label: l.label };
      const K = OL.roundTo(S * (1 + l.off), step);
      const p = Math.max(OL.bs(l.kind, S, K, T, ratePct / 100, ivPct / 100).price, 0.01);
      return { kind: l.kind, side: l.side, strike: K, price: Math.round(p * 100) / 100, qty: 1, label: l.label };
    });
  };

  // Dinero aproximado que exige tener disponible (solo estrategias con acciones o efectivo asegurado).
  OL.capitalNeeded = function (strategyId, S) {
    const st = OL.strategy(strategyId);
    if (st.capital === "stock") return S * 100;
    if (st.capital === "strike") {
      const l = st.legs[0];
      return OL.roundTo(S * (1 + l.off), OL.stepFor(S)) * 100;
    }
    return null;
  };

  if (typeof module !== "undefined" && module.exports) module.exports = OL;
  else root.OL = Object.assign(root.OL || {}, OL);
})(typeof window !== "undefined" ? window : globalThis);
