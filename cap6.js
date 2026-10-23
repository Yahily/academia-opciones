"use strict";
(function () {
  const OL = window.OL, $ = OL.$;

  /* ---------- calculadora: pérdida aceptada -> prima máxima ---------- */
  const mLoss = $("#mLoss"), mCost = $("#mCost");
  function calc() {
    const loss = Math.max(Number(mLoss.value) || 0, 0);
    const cost = Math.max(Number(mCost.value) || 0, 0);
    $("#mMax").textContent = OL.usd(loss / 100);
    const n = cost > 0 ? Math.floor(loss / cost) : 0;
    $("#mN").textContent = String(n);
    $("#mRisk").textContent = OL.usd(n * cost);
    $("#mMsg").textContent = n === 0
      ? "Ese contrato cuesta más de lo que aceptas perder. Busca uno más barato, un spread de débito o espera a tener más margen."
      : "Con " + n + " contrato" + (n === 1 ? "" : "s") + " tu pérdida máxima es " + OL.usd(n * cost) + ", dentro de tu límite.";
  }
  [mLoss, mCost].forEach((e) => e.addEventListener("input", calc));
  calc();

  /* ---------- asistente para elegir ---------- */
  const wView = $("#wView"), wLevel = $("#wLevel"), wCap = $("#wCap"), wLoss = $("#wLoss"), wPrice = $("#wPrice");
  const VIEW_NAME = { sube: "que suba", baja: "que baje", lateral: "que se quede en un rango", grande: "que se mueva mucho", proteger: "proteger acciones" };

  function esc(t) { const d = document.createElement("div"); d.textContent = t; return d.innerHTML; }

  function wizard() {
    const view = wView.value;
    const level = Number(wLevel.value);
    const cap = Math.max(Number(wCap.value) || 0, 0);
    let loss = Math.max(Number(wLoss.value) || 0, 0);
    const price = Math.max(Number(wPrice.value) || 1, 1);
    const notes = [];
    if (loss > cap) { notes.push("Tu pérdida máxima no puede ser mayor que el dinero disponible. Se usó " + OL.usd0(cap) + " como límite."); loss = cap; }
    if (loss < 100) notes.push("Con una pérdida máxima menor a unos $100, en un activo de precio alto normalmente solo alcanzan contratos muy lejanos del precio, con pocas probabilidades. Considera un spread de débito o practicar en simulador mientras juntas más capital.");

    const items = OL.STRATEGIES.filter((s) => s.views.includes(view)).map((s) => {
      const needCap = OL.capitalNeeded(s.id, price);
      const levelOK = level >= s.level;
      const capOK = needCap == null || cap >= needCap;
      const lines = [];
      lines.push("Nivel requerido en Schwab: " + s.level + (level < 0 ? " (todavía no tienes aprobación)" : levelOK ? " (cumples)" : " (tienes " + level + ")"));
      if (needCap != null) lines.push("Dinero aproximado necesario: " + OL.usd0(needCap) + (capOK ? " (te alcanza)" : " (te faltan " + OL.usd0(needCap - cap) + ")"));
      const per = loss / 100;
      if (s.defined && s.type === "débito") lines.push("Débito máximo por acción para respetar tu límite: " + OL.usd(per) + ".");
      if (s.defined && s.type === "crédito") lines.push("Pérdida máxima = (ancho del spread − crédito) × 100. Para respetar tu límite, el ancho menos el crédito no debe pasar de " + OL.usd(per) + ".");
      let status, cls;
      if (!levelOK || !capOK) { status = !levelOK ? "Necesitas subir tu nivel" : "Requiere más dinero"; cls = "no"; }
      else if (!s.defined) { status = "Revisa antes: el riesgo depende de las acciones"; cls = "maybe"; }
      else if (loss < 100) { status = "Posible, con un tope de precio muy bajo"; cls = "maybe"; }
      else { status = "Encaja"; cls = "ok"; }
      return { s, lines, status, cls };
    });
    const order = { ok: 0, maybe: 1, no: 2 };
    items.sort((a, b) => order[a.cls] - order[b.cls]);

    let html = "";
    notes.forEach((n) => { html += '<p class="warn">' + esc(n) + "</p>"; });
    html += "<p><strong>Estrategias para quien espera " + VIEW_NAME[view] + ":</strong></p>";
    items.forEach((it) => {
      html += '<div class="result ' + it.cls + '"><h4>' + esc(it.s.name) + '</h4><p class="status">' + esc(it.status) + "</p><p>" + esc(it.s.desc) + "</p>" +
        "<p>" + it.lines.map(esc).join("<br>") + "</p></div>";
    });
    html += '<p class="legend">Verde: encaja con lo que indicaste. Ámbar: revisa antes de usarla. Rojo: hoy no está disponible para ti. Resultado orientativo y educativo.</p>';
    $("#wOut").innerHTML = html;
  }
  [wView, wLevel, wCap, wLoss, wPrice].forEach((e) => e.addEventListener("input", wizard));
  wizard();

  /* ---------- quiz ---------- */
  OL.initQuiz([
    { q: "Esperas que QQQ se mueva poco durante las próximas semanas. ¿Qué estrategia encaja mejor con esa idea?",
      options: ["Compra de call", "Straddle comprado", "Iron condor", "Compra de put"], correct: 2,
      why: "El iron condor gana cuando el activo se queda dentro de un rango. Las compras simples y el straddle se desgastan si el precio no se mueve." },
    { q: "Tu cuenta tiene aprobado el nivel 1 de Schwab. Según su tabla, ¿cuál de estas NO puedes usar?",
      options: ["Compra de call", "Put con efectivo asegurado", "Spread alcista de débito", "Straddle comprado"], correct: 2,
      why: "Los spreads se habilitan en el nivel 2. El nivel 1 permite compras de calls y puts, straddles y strangles comprados y puts con efectivo asegurado." },
    { q: "Aceptas perder como máximo $50 en una operación. ¿Cuál es la prima máxima por acción que debes pagar?",
      options: ["$0.05", "$0.50", "$5", "$50"], correct: 1,
      why: "Prima máxima por acción = pérdida aceptada ÷ 100 = 50 ÷ 100 = $0.50." },
    { q: "Crees que un movimiento tardará unas tres semanas, pero el contrato que miras vence en cinco días. ¿Qué problema tiene?",
      options: ["Ninguno", "Vence antes de que ocurra tu idea", "Es demasiado caro", "Solo sirve para puts"], correct: 1,
      why: "Conviene elegir un vencimiento que dé más tiempo que tu idea. Si no, puedes acertar la dirección y aun así perder la prima." },
    { q: "¿Por qué los spreads de débito se consideran una opción frecuente con presupuestos pequeños?",
      options: ["Tienen ganancia ilimitada", "Tienen riesgo definido y cuestan menos que la compra simple", "No tienen comisiones", "No les afecta el tiempo"], correct: 1,
      why: "La venta del segundo contrato abarata el costo y la pérdida máxima es el débito pagado, a cambio de limitar la ganancia." },
    { q: "¿Cuál es el orden de aprendizaje recomendado?",
      options: ["Ventas descubiertas, luego spreads y luego simulador", "Simulador, compras simples con un contrato, spreads de débito, spreads de crédito y después el resto", "Iron condor primero porque da más ganancia", "Directo a dinero real con varios contratos"], correct: 1,
      why: "Se avanza de lo simple a lo complejo, empezando sin dinero real, y se pasa de etapa cuando las reglas se cumplen de forma consistente." }
  ]);
})();
