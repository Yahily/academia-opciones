"use strict";
(function () {
  const OL = window.OL, $ = OL.$;
  const el = { type: $("#pType"), S: $("#pS"), K: $("#pK"), D: $("#pD"), IV: $("#pIV"), R: $("#pR") };

  function read() {
    return {
      type: el.type.value,
      S: Math.max(Number(el.S.value) || 1, 0.01),
      K: Math.max(Number(el.K.value) || 1, 0.01),
      D: Math.min(Math.max(Math.round(Number(el.D.value)) || 1, 1), 365),
      iv: Number(el.IV.value),
      r: Math.max(Number(el.R.value) || 0, 0)
    };
  }

  function update() {
    const v = read();
    $("#pIVLabel").textContent = v.iv + " %";
    const g = OL.bs(v.type, v.S, v.K, v.D / 365, v.r / 100, v.iv / 100);
    const intr = OL.intrinsic(v.type, v.S, v.K);
    const extr = Math.max(g.price - intr, 0);
    const near = Math.abs(v.S - v.K) / v.K < 0.002;
    const itm = v.type === "call" ? v.S > v.K : v.S < v.K;
    $("#oPrice").textContent = OL.usd(g.price);
    $("#oCost").textContent = OL.usd(g.price * 100);
    $("#oIntr").textContent = OL.usd(intr);
    $("#oExtr").textContent = OL.usd(extr);
    $("#oMoney").textContent = near ? "En el dinero (ATM)" : itm ? "Dentro del dinero (ITM)" : "Fuera del dinero (OTM)";
    $("#oDelta").textContent = OL.num(g.delta, 2);
    $("#oTheta").innerHTML = OL.money(g.theta * 100);
    $("#oVega").innerHTML = OL.money(g.vega * 100);

    // Gráfica 1: valor según el precio del activo (hoy vs. vencimiento)
    const lo = Math.min(v.S, v.K) * 0.88, hi = Math.max(v.S, v.K) * 1.12;
    const now = [], exp = [];
    for (let i = 0; i <= 80; i++) {
      const s = lo + ((hi - lo) * i) / 80;
      now.push([s, OL.bs(v.type, s, v.K, v.D / 365, v.r / 100, v.iv / 100).price * 100]);
      exp.push([s, OL.intrinsic(v.type, s, v.K) * 100]);
    }
    OL.drawChart($("#pChart1"), {
      xmin: lo, xmax: hi, ymin: 0, xfmt: (x) => OL.usd0(x), xTitle: "Precio del activo",
      series: [
        { pts: now, color: "var(--accent)", name: "Hoy" },
        { pts: exp, color: "var(--muted)", dash: "6 5", width: 2, name: "Al vencimiento" }
      ],
      markers: [{ x: v.S, y: g.price * 100, color: "var(--accent)" }],
      vlines: [{ x: v.K, label: "strike" }]
    });

    // Gráfica 2: cómo se desinfla el valor con los días que pasan, con el activo quieto
    const t = [];
    for (let i = 0; i <= 60; i++) {
      const elapsed = (v.D * i) / 60;
      t.push([elapsed, OL.bs(v.type, v.S, v.K, (v.D - elapsed) / 365, v.r / 100, v.iv / 100).price * 100]);
    }
    OL.drawChart($("#pChart2"), {
      xmin: 0, xmax: v.D, ymin: 0, xfmt: (x) => OL.num(x, 0), xTitle: "Días que pasan desde hoy (el vencimiento es el último)",
      series: [
        { pts: t, color: "var(--accent)", name: "Valor del contrato" },
        { pts: [[0, intr * 100], [v.D, intr * 100]], color: "var(--muted)", dash: "6 5", width: 2, name: "Valor intrínseco" }
      ],
      markers: [{ x: 0, y: g.price * 100, color: "var(--accent)" }]
    });
  }

  Object.values(el).forEach((e) => e.addEventListener("input", update));
  update();

  OL.initQuiz([
    { q: "El activo está en 500. Un call con strike 490 cuesta 15. ¿Cuánto es su valor extrínseco?",
      options: ["$5", "$10", "$15", "$25"], correct: 0,
      why: "Intrínseco = 500 − 490 = 10. Extrínseco = prima − intrínseco = 15 − 10 = 5." },
    { q: "El activo está en 500. Un put con strike 510, ¿cómo está?",
      options: ["Fuera del dinero", "En el dinero", "Dentro del dinero", "Vencido"], correct: 2,
      why: "En un put, si el precio del activo (500) es menor que el strike (510), el contrato ya tiene valor intrínseco: 10. Está dentro del dinero." },
    { q: "¿Qué pasa con el valor extrínseco de un contrato al llegar el vencimiento?",
      options: ["Se duplica", "Se queda igual", "Llega a cero", "Se convierte en intrínseco"], correct: 2,
      why: "Al vencimiento ya no queda tiempo ni incertidumbre. Solo permanece el valor intrínseco, si lo hay." },
    { q: "Un call tiene delta 0.30. Si el activo sube $2, ¿cuánto sube aproximadamente el contrato por acción?",
      options: ["$0.30", "$0.60", "$2.00", "$6.00"], correct: 1,
      why: "Cambio ≈ delta × movimiento = 0.30 × 2 = 0.60 por acción, unos $60 por contrato." },
    { q: "Compraste un call antes de un reporte de resultados. El activo se mueve poco y la volatilidad implícita cae. ¿Qué le pasa a tu contrato?",
      options: ["Sube de valor", "Pierde valor aunque el activo casi no se movió", "No cambia", "Se cancela"], correct: 1,
      why: "Al caer la IV, la prima se desinfla. Este efecto se llama aplastón de IV y perjudica a quien compró." },
    { q: "Un contrato tiene theta de −0.08. ¿Cuánto pierde por día, aproximadamente, un contrato de 100 unidades?",
      options: ["$0.08", "$0.80", "$8", "$80"], correct: 2,
      why: "0.08 por acción × 100 acciones = $8 por día, si todo lo demás se mantiene igual." }
  ]);
})();
