"use strict";
(function () {
  const OL = window.OL, $ = OL.$;
  const sel = $("#stSel"), inS = $("#stS"), inD = $("#stD"), inIV = $("#stIV"), box = $("#stLegs");

  OL.STRATEGIES.forEach((s) => {
    const o = document.createElement("option");
    o.value = s.id;
    o.textContent = s.name;
    sel.appendChild(o);
  });

  let legs = [];

  function params() {
    return {
      S: Math.max(Number(inS.value) || 1, 0.5),
      D: Math.min(Math.max(Math.round(Number(inD.value)) || 1, 1), 365),
      IV: Math.min(Math.max(Number(inIV.value) || 20, 5), 100)
    };
  }

  function rebuild() {
    const p = params();
    legs = OL.buildLegs(sel.value, p.S, p.D, p.IV, 4);
    $("#stDesc").textContent = OL.strategy(sel.value).desc;
    box.innerHTML = "";
    legs.forEach((l, i) => {
      const row = document.createElement("div");
      row.className = "legrow";
      const name = document.createElement("div");
      name.className = "name";
      name.textContent = l.label + (l.kind === "stock" ? "" : " (" + (l.side > 0 ? "compra" : "venta") + ")");
      row.appendChild(name);
      if (l.kind === "stock") {
        row.innerHTML += '<label>Costo por acción<input type="number" step="0.5" data-i="' + i + '" data-f="price" value="' + l.price + '"></label><label>Acciones<input type="number" value="' + l.qty + '" disabled></label>';
      } else {
        row.innerHTML += '<label>Strike<input type="number" step="' + OL.stepFor(p.S) + '" data-i="' + i + '" data-f="strike" value="' + l.strike + '"></label>' +
          '<label>Prima por acción<input type="number" step="0.05" min="0.01" data-i="' + i + '" data-f="price" value="' + l.price + '"></label>';
      }
      box.appendChild(row);
    });
    draw();
  }

  function draw() {
    legs.forEach((l) => {
      if (!isFinite(l.price)) l.price = 0;
    });
    const a = OL.analyze(legs);
    const net = a.netCredit;
    $("#stNetLabel").textContent = net >= 0 ? "Crédito neto cobrado" : "Débito neto pagado";
    $("#stNet").innerHTML = OL.money(net, true);
    $("#stMaxG").innerHTML = OL.money(a.maxGain, true);
    $("#stMaxL").innerHTML = OL.money(a.maxLoss, true);
    $("#stBE").textContent = a.breakevens.length ? a.breakevens.map((b) => OL.usd(b)).join(" y ") : "—";

    const strikes = legs.filter((l) => l.kind !== "stock").map((l) => l.strike);
    const ref = params().S;
    const lo = Math.min(...strikes, ref) * 0.9, hi = Math.max(...strikes, ref) * 1.1;
    const pts = [];
    for (let i = 0; i <= 120; i++) { const s = lo + ((hi - lo) * i) / 120; pts.push([s, OL.totalPL(legs, s)]); }
    OL.drawChart($("#stChart"), {
      xmin: lo, xmax: hi, xfmt: (v) => OL.usd0(v), xTitle: "Precio del activo al vencimiento",
      series: [{ pts: pts, color: "var(--accent)" }],
      markers: a.breakevens.filter((b) => b >= lo && b <= hi).map((b) => ({ x: b, y: 0, color: "var(--muted)" })),
      vlines: [{ x: ref, label: "hoy" }]
    });
    const st = OL.strategy(sel.value);
    const cap = OL.capitalNeeded(st.id, ref);
    $("#stNote").textContent = "Los círculos grises marcan los puntos de equilibrio. Resultados al vencimiento, antes de comisiones." +
      (cap ? " Capital aproximado necesario para esta estrategia: " + OL.usd0(cap) + "." : "");
  }

  box.addEventListener("input", (e) => {
    const t = e.target;
    if (!t.dataset || t.dataset.i == null) return;
    const v = Number(t.value);
    if (!isFinite(v)) return;
    legs[Number(t.dataset.i)][t.dataset.f] = v;
    draw();
  });
  sel.addEventListener("change", rebuild);
  [inS, inD, inIV].forEach((e) => e.addEventListener("change", rebuild));

  // Botones "Probar en el simulador" de cada lección
  OL.$$("[data-try]").forEach((b) => b.addEventListener("click", () => {
    sel.value = b.dataset.try;
    rebuild();
    $("#simulador").scrollIntoView({ behavior: "smooth", block: "start" });
  }));

  rebuild();

  /* ---------- quiz ---------- */
  OL.initQuiz([
    { q: "Compras un call 500 pagando 12 y vendes un call 510 cobrando 7. ¿Cuál es tu pérdida máxima?",
      options: ["$500", "$700", "$1,200", "Ilimitada"], correct: 0,
      why: "El débito neto es 12 − 7 = 5 por acción, o $500 por contrato. En un spread de débito, esa es la pérdida máxima." },
    { q: "Vendes un put con strike 480 y cobras 4 (con el efectivo asegurado). ¿Cuál es tu punto de equilibrio?",
      options: ["484", "480", "476", "400"], correct: 2,
      why: "Equilibrio = strike − prima cobrada = 480 − 4 = 476. Por debajo de ese precio empiezas a perder." },
    { q: "¿Qué necesitas para vender un call cubierto?",
      options: ["Solo la prima", "100 acciones del activo", "Nivel 3 de aprobación", "Un spread"], correct: 1,
      why: "Cubierto significa que ya tienes las 100 acciones que entregarías si te ejercen el call." },
    { q: "¿Para qué visión del mercado se usa un iron condor?",
      options: ["Que el activo suba mucho", "Que el activo baje mucho", "Que el activo se quede dentro de un rango", "Que el activo se mueva mucho"], correct: 2,
      why: "El iron condor gana cuando el activo termina entre los dos strikes vendidos." },
    { q: "Un straddle comprado gana cuando…",
      options: ["El activo no se mueve", "El activo se mueve más que el costo de las dos primas, hacia cualquier lado", "Solo cuando sube", "Solo cuando baja"], correct: 1,
      why: "Compras un call y un put. Ganas si el movimiento es lo bastante grande en cualquier dirección como para cubrir ambas primas." },
    { q: "¿Cuál de estas estrategias tiene pérdida teórica ilimitada?",
      options: ["Compra de call", "Spread de débito", "Venta de call descubierto", "Iron condor"], correct: 2,
      why: "Al vender un call sin cobertura, si el activo sube sin límite, tu pérdida también. Por eso exige el nivel 3 y no es para principiantes." },
    { q: "Vendes un put 490 cobrando 5 y compras un put 480 pagando 2. ¿Cuál es tu pérdida máxima?",
      options: ["$300", "$700", "$1,000", "$500"], correct: 1,
      why: "Crédito = 5 − 2 = 3. Ancho = 10. Pérdida máxima = (10 − 3) × 100 = $700." }
  ]);
})();
