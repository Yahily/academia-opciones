"use strict";

/* ---------- utilidades ---------- */
const $ = (s) => document.querySelector(s);
const usd = new Intl.NumberFormat("es-MX", { style: "currency", currency: "USD" });

function store(key, value) {
  try {
    if (value === undefined) return JSON.parse(localStorage.getItem(key));
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) { /* almacenamiento no disponible: la página sigue funcionando */ }
  return null;
}

/* ---------- lógica del contrato (compra de opción) ---------- */
// Resultado en dólares de un contrato (100 unidades) al vencimiento.
function payoff(type, strike, premium, price) {
  const intrinsic = type === "call" ? Math.max(price - strike, 0) : Math.max(strike - price, 0);
  return (intrinsic - premium) * 100;
}
function breakeven(type, strike, premium) {
  return type === "call" ? strike + premium : strike - premium;
}

/* ---------- simulador ---------- */
const simType = $("#simType");
const simStrike = $("#simStrike");
const simPrem = $("#simPrem");
const simPrice = $("#simPrice");

function syncRange() {
  const k = Number(simStrike.value) || 1;
  const prevPct = simPrice.max ? (Number(simPrice.value) - Number(simPrice.min)) / (Number(simPrice.max) - Number(simPrice.min)) : 0.5;
  simPrice.min = (k * 0.85).toFixed(2);
  simPrice.max = (k * 1.15).toFixed(2);
  simPrice.step = Math.max(k / 1000, 0.01).toFixed(2);
  simPrice.value = (Number(simPrice.min) + prevPct * (Number(simPrice.max) - Number(simPrice.min))).toFixed(2);
}

function money(n) {
  return `<span class="${n >= 0 ? "pos" : "neg"}">${usd.format(n)}</span>`;
}

function drawChart(type, k, p, price) {
  const W = 600, H = 260, pad = 36;
  const lo = k * 0.85, hi = k * 1.15;
  const pts = [];
  for (let i = 0; i <= 60; i++) {
    const s = lo + ((hi - lo) * i) / 60;
    pts.push([s, payoff(type, k, p, s)]);
  }
  const ys = pts.map((q) => q[1]);
  const yMin = Math.min(...ys, -p * 100), yMax = Math.max(...ys, 1);
  const x = (s) => pad + ((s - lo) / (hi - lo)) * (W - 2 * pad);
  const y = (v) => H - pad - ((v - yMin) / (yMax - yMin)) * (H - 2 * pad);
  const line = pts.map((q) => `${x(q[0]).toFixed(1)},${y(q[1]).toFixed(1)}`).join(" ");
  const cur = payoff(type, k, p, price);
  const color = cur >= 0 ? "#15803d" : "#b91c1c";
  $("#simChart").innerHTML = `
    <line x1="${pad}" x2="${W - pad}" y1="${y(0)}" y2="${y(0)}" stroke="#8a99a8" stroke-dasharray="4 4"/>
    <line x1="${x(k)}" x2="${x(k)}" y1="${pad / 2}" y2="${H - pad}" stroke="#8a99a8" stroke-dasharray="2 4"/>
    <polyline points="${line}" fill="none" stroke="#0f766e" stroke-width="3"/>
    <circle cx="${x(price)}" cy="${y(cur)}" r="7" fill="${color}"/>
    <text x="${x(k)}" y="${H - 12}" text-anchor="middle" font-size="12" fill="#8a99a8">strike ${k}</text>
    <text x="${pad}" y="${y(0) - 6}" font-size="12" fill="#8a99a8">0</text>`;
}

function updateSim() {
  const type = simType.value;
  const k = Number(simStrike.value) || 1;
  const p = Math.max(Number(simPrem.value) || 0.01, 0.01);
  const price = Number(simPrice.value);
  const pnl = payoff(type, k, p, price);
  $("#simPriceLabel").textContent = usd.format(price);
  $("#rCost").textContent = usd.format(p * 100);
  $("#rBE").textContent = usd.format(breakeven(type, k, p));
  $("#rPnL").innerHTML = money(pnl);
  $("#rMaxLoss").innerHTML = money(-p * 100);
  drawChart(type, k, p, price);
}

[simType, simPrem].forEach((el) => el.addEventListener("input", updateSim));
simStrike.addEventListener("input", () => { syncRange(); updateSim(); });
simPrice.addEventListener("input", updateSim);
syncRange();
updateSim();

/* ---------- quiz ---------- */
const QUESTIONS = [
  {
    q: "¿Cuántas unidades del subyacente controla normalmente un contrato de opciones sobre acciones o ETF en Estados Unidos?",
    options: ["1", "10", "100", "1,000"],
    correct: 2,
    why: "Cada contrato cubre 100 unidades, por eso la prima cotizada se multiplica por 100.",
  },
  {
    q: "Pagaste $2 por un boleto que te deja comprar una caja de manzanas a $10 (call). ¿A qué precio de las manzanas quedas a mano?",
    options: ["$8", "$10", "$12", "$14"],
    correct: 2,
    why: "En un call, punto de equilibrio = strike + prima = 10 + 2 = 12. Arriba de $12 ya ganas.",
  },
  {
    q: "Compraste un boleto de venta (put) de peras por $2. ¿Cuánto es lo máximo que puedes perder con ese boleto?",
    options: ["$10", "$2", "$8", "Todo lo que valgan las peras"],
    correct: 1,
    why: "Quien compra una opción solo puede perder lo que pagó por ella: la prima.",
  },
  {
    q: "¿Qué derecho te da comprar un put?",
    options: ["Comprar al strike", "Vender al strike", "Recibir dividendos", "Ninguno"],
    correct: 1,
    why: "El put da el derecho a vender al precio strike; el call, a comprar.",
  },
  {
    q: "Una opción cotiza con prima de 2.50. ¿Cuánto cuesta un contrato?",
    options: ["2.50 dólares", "25 dólares", "250 dólares", "2,500 dólares"],
    correct: 2,
    why: "2.50 × 100 unidades = 250 dólares.",
  },
  {
    q: "Tu boleto de manzanas (call) dice $10, y el día del vencimiento las manzanas valen $6. ¿Qué pasa?",
    options: ["Estás obligado a comprar a $10", "El boleto no se usa y pierdes los $2 que pagaste", "Ganas $4", "El frutero te devuelve los $2"],
    correct: 1,
    why: "Comprar a $10 lo que vale $6 no tiene sentido. El boleto vence sin valor y solo pierdes lo que costó.",
  },
];

let answers = store("quizAnswers") || {};

function renderQuiz() {
  const box = $("#quiz");
  box.innerHTML = "";
  QUESTIONS.forEach((item, qi) => {
    const wrap = document.createElement("div");
    wrap.className = "q";
    const title = document.createElement("p");
    title.innerHTML = `<strong>${qi + 1}.</strong> ${item.q}`;
    wrap.appendChild(title);
    item.options.forEach((text, oi) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "opt";
      b.textContent = text;
      const chosen = answers[qi];
      if (chosen !== undefined) {
        b.disabled = true;
        if (oi === item.correct) b.classList.add("right");
        else if (oi === chosen) b.classList.add("wrong");
      }
      b.addEventListener("click", () => {
        answers[qi] = oi;
        store("quizAnswers", answers);
        renderQuiz();
        updateProgress();
      });
      wrap.appendChild(b);
    });
    if (answers[qi] !== undefined) {
      const why = document.createElement("p");
      why.className = "why";
      why.textContent = item.why;
      wrap.appendChild(why);
    }
    box.appendChild(wrap);
  });
  const done = Object.keys(answers).length;
  const ok = QUESTIONS.filter((it, i) => answers[i] === it.correct).length;
  $("#quizScore").textContent = done === QUESTIONS.length ? `Resultado: ${ok} de ${QUESTIONS.length}` : `Respondidas: ${done} de ${QUESTIONS.length}`;
}

$("#quizReset").addEventListener("click", () => {
  answers = {};
  store("quizAnswers", answers);
  renderQuiz();
  updateProgress();
});

/* ---------- progreso ---------- */
const lessons = Array.from(document.querySelectorAll(".lesson[data-lesson]"));
let completed = store("completed") || {};

function updateProgress() {
  const total = lessons.length;
  const count = lessons.filter((l) => completed[l.dataset.lesson]).length;
  const quizDone = Object.keys(answers).length === QUESTIONS.length;
  const pct = Math.round(((count + (quizDone ? 1 : 0)) / (total + 1)) * 100);
  $("#progressFill").style.width = pct + "%";
  $("#progressText").textContent = pct + "%";
}

lessons.forEach((l) => {
  const cb = l.querySelector("input[type=checkbox]");
  if (!cb) return;
  cb.checked = !!completed[l.dataset.lesson];
  cb.addEventListener("change", () => {
    completed[l.dataset.lesson] = cb.checked;
    store("completed", completed);
    updateProgress();
  });
});

renderQuiz();
updateProgress();
