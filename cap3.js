"use strict";
(function () {
  const OL = window.OL, $ = OL.$;

  /* ---------- cadena de ejemplo (datos inventados pero coherentes con Black-Scholes) ---------- */
  const S = 500, IV = 0.20, T = 30 / 365, R = 0.04;
  const r2 = (x) => Math.round(x * 100) / 100;
  function quote(type, K) {
    const mid = OL.bs(type, S, K, T, R, IV).price;
    const w = Math.max(0.02, mid * 0.02);
    const bid = Math.max(0.01, r2(mid - w / 2));
    const ask = Math.max(r2(bid + 0.01), r2(mid + w / 2));
    return { bid, ask };
  }
  function activity(K, bias) {
    const base = 9000 * Math.exp(-Math.pow((K - S) / 18, 2)) + 60;
    return { vol: Math.round(base * 0.35 * bias), oi: Math.round(base * 1.6 * bias) };
  }
  const rows = [];
  for (let K = 470; K <= 530; K += 5) {
    rows.push({ K, call: Object.assign(quote("call", K), activity(K, 1.1)), put: Object.assign(quote("put", K), activity(K, 0.9)) });
  }
  const tbody = $("#chain tbody");
  const f = (n) => OL.num(n, 2);
  const g = (n) => n.toLocaleString("en-US");
  rows.forEach((row) => {
    const tr = document.createElement("tr");
    tr.dataset.k = row.K;
    const callItm = row.K < S ? " itm" : "";
    const putItm = row.K > S ? " itm" : "";
    tr.innerHTML =
      '<td class="' + callItm.trim() + '">' + f(row.call.bid) + '</td><td class="' + callItm.trim() + '">' + f(row.call.ask) + '</td><td class="' + callItm.trim() + '">' + g(row.call.vol) + '</td><td class="' + callItm.trim() + '">' + g(row.call.oi) + "</td>" +
      '<td class="strike">' + row.K + "</td>" +
      '<td class="' + putItm.trim() + '">' + f(row.put.bid) + '</td><td class="' + putItm.trim() + '">' + f(row.put.ask) + '</td><td class="' + putItm.trim() + '">' + g(row.put.vol) + '</td><td class="' + putItm.trim() + '">' + g(row.put.oi) + "</td>";
    tbody.appendChild(tr);
  });

  function explain(row, side) {
    const q = side === "call" ? row.call : row.put;
    const type = side === "call" ? "call" : "put";
    const itm = side === "call" ? row.K < S : row.K > S;
    const atm = Math.abs(row.K - S) < 2.5;
    const state = atm ? "en el dinero" : itm ? "dentro del dinero" : "fuera del dinero";
    const be = OL.breakeven(type, row.K, q.ask);
    const spreadPct = ((q.ask - q.bid) / q.ask) * 100;
    $("#chainInfo").innerHTML =
      "<strong>" + (side === "call" ? "Call" : "Put") + " con strike " + row.K + "</strong> (" + state + "). " +
      "Si compras al ask pagas " + f(q.ask) + " × 100 = <strong>" + OL.usd(q.ask * 100) + "</strong> por el contrato, y ese es lo máximo que puedes perder. " +
      "Tu punto de equilibrio al vencimiento sería " + OL.usd(be) + ". " +
      "El spread entre bid y ask es " + f(q.ask - q.bid) + " (" + OL.num(spreadPct, 1) + " % del ask). " +
      "Se han operado " + g(q.vol) + " contratos hoy y hay " + g(q.oi) + " vigentes.";
  }
  tbody.addEventListener("click", (e) => {
    const td = e.target.closest("td");
    const tr = e.target.closest("tr");
    if (!td || !tr) return;
    const row = rows.find((x) => x.K === Number(tr.dataset.k));
    const idx = Array.from(tr.children).indexOf(td);
    const side = idx <= 3 ? "call" : idx >= 5 ? "put" : (row.K < S ? "call" : "put");
    tbody.querySelectorAll("tr.pick").forEach((x) => x.classList.remove("pick"));
    tr.classList.add("pick");
    explain(row, side);
  });

  /* ---------- calculadora de bid y ask ---------- */
  const bBid = $("#bBid"), bAsk = $("#bAsk"), bQty = $("#bQty");
  function spreadCalc() {
    const bid = Math.max(Number(bBid.value) || 0, 0);
    const ask = Math.max(Number(bAsk.value) || 0, 0);
    const qty = Math.max(Math.round(Number(bQty.value)) || 1, 1);
    const verdict = $("#sVerdict");
    if (ask < bid) {
      ["#sSpread", "#sPct", "#sLoss", "#sMid"].forEach((id) => ($(id).textContent = "—"));
      verdict.textContent = "El ask debe ser mayor o igual que el bid. Revisa los números.";
      return;
    }
    const sp = ask - bid;
    const pct = ask > 0 ? (sp / ask) * 100 : 0;
    $("#sSpread").textContent = OL.usd(sp);
    $("#sPct").textContent = OL.num(pct, 1) + " %";
    $("#sLoss").innerHTML = OL.money(-sp * 100 * qty);
    $("#sMid").textContent = OL.usd((bid + ask) / 2);
    verdict.textContent = pct < 5
      ? "Menos de 5 % del precio: un spread razonable para empezar."
      : pct <= 10
        ? "Entre 5 % y 10 %: cuidado. Entrar y salir te costará una parte notable del contrato."
        : "Más de 10 %: caro de entrar y de salir. Considera otro strike u otro vencimiento con más liquidez. (Es una regla práctica, no una ley.)";
  }
  [bBid, bAsk, bQty].forEach((e) => e.addEventListener("input", spreadCalc));
  spreadCalc();

  /* ---------- quiz ---------- */
  OL.initQuiz([
    { q: "Un contrato tiene bid 2.40 y ask 2.60. Si compras 1 contrato al ask y lo vendes al instante al bid, ¿cuánto pierdes?",
      options: ["$0.20", "$2", "$20", "$200"], correct: 2,
      why: "El spread es 0.20 por acción. Con 100 acciones por contrato, 0.20 × 100 = $20." },
    { q: "¿Qué indica el interés abierto?",
      options: ["Cuántos contratos se operaron hoy", "Cuántos contratos siguen vigentes", "El precio más alto del día", "La volatilidad esperada"], correct: 1,
      why: "El interés abierto cuenta los contratos que todavía existen. El volumen es lo que se operó hoy." },
    { q: "¿Qué tipo de orden te permite fijar el precio máximo que estás dispuesta a pagar?",
      options: ["Market", "Limit", "Ninguna", "Cualquiera"], correct: 1,
      why: "La orden limit solo se ejecuta al precio fijado o mejor. La market se ejecuta al precio que haya." },
    { q: "Las opciones de QQQ son de estilo americano. ¿Qué significa?",
      options: ["Solo existen en Estados Unidos", "Se pueden ejercer antes del vencimiento", "Se pagan en efectivo", "Solo vencen los viernes"], correct: 1,
      why: "Estilo americano significa que el contrato puede ejercerse en cualquier momento hasta el vencimiento." },
    { q: "Compraste un call y vence dentro del dinero. Si no haces nada, ¿qué suele pasar?",
      options: ["Se cancela sin costo", "Se ejerce automáticamente y te compran 100 acciones", "Se renueva", "El broker te devuelve la prima"], correct: 1,
      why: "Los contratos dentro del dinero normalmente se ejercen solos. Por eso se recomienda cerrar la posición antes del vencimiento." },
    { q: "Un contrato tiene bid 0.04 y ask 0.06. ¿Qué lectura es la correcta?",
      options: ["Es muy barato, no hay riesgo", "El spread es un tercio del precio: es caro entrar y salir", "Tiene mucha liquidez", "Está dentro del dinero"], correct: 1,
      why: "El spread es 0.02, que es un tercio del ask de 0.06. Los contratos baratos pueden ser caros en porcentaje." }
  ]);
})();
