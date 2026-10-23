"use strict";
/* Utilidades compartidas: formato, almacenamiento, progreso, quiz, listas de verificación y gráficas. */
(function () {
  const OL = (window.OL = window.OL || {});
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  OL.$ = $;
  OL.$$ = $$;

  /* ---------- formato ---------- */
  const fmt = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
  const fmt0 = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
  OL.usd = (n) => (n < 0 ? "−" : "") + fmt.format(Math.abs(n));
  OL.usd0 = (n) => (n < 0 ? "−" : "") + fmt0.format(Math.abs(n));
  OL.num = (n, d) => Number(n).toLocaleString("en-US", { minimumFractionDigits: d == null ? 2 : d, maximumFractionDigits: d == null ? 2 : d });
  // Dinero con signo explícito y color: el signo y la palabra dan la pista aunque no se distingan los colores.
  OL.money = function (n, zeroDecimals) {
    if (n === Infinity) return '<span class="pos">Ilimitada</span>';
    if (n === -Infinity) return '<span class="neg">Ilimitada</span>';
    const txt = zeroDecimals ? OL.usd0(Math.abs(n)) : OL.usd(Math.abs(n));
    if (Math.abs(n) < 0.005) return "<span>" + txt + "</span>";
    return n > 0 ? '<span class="pos">+' + txt + "</span>" : '<span class="neg">−' + txt + "</span>";
  };

  /* ---------- almacenamiento (puede no estar disponible: la página funciona igual) ---------- */
  OL.store = function (key, value) {
    try {
      if (value === undefined) return JSON.parse(localStorage.getItem("academia:" + key));
      localStorage.setItem("academia:" + key, JSON.stringify(value));
    } catch (e) { /* sin almacenamiento */ }
    return null;
  };

  /* ---------- capítulos ---------- */
  OL.CHAPTERS = [
    { id: "cap1", lessons: ["1.1", "1.2", "1.3", "1.4", "1.5", "1.6"], quiz: 6 },
    { id: "cap2", lessons: ["2.1", "2.2", "2.3", "2.4", "2.5", "2.6", "2.7"], quiz: 6 },
    { id: "cap3", lessons: ["3.1", "3.2", "3.3", "3.4", "3.5", "3.6"], quiz: 6 },
    { id: "cap4", lessons: ["4.1", "4.2", "4.3", "4.4", "4.5", "4.6", "4.7", "4.8", "4.9", "4.10", "4.11"], quiz: 7 },
    { id: "cap5", lessons: ["5.1", "5.2", "5.3", "5.4", "5.5", "5.6", "5.7", "5.8", "5.9", "5.10"], quiz: 7 },
    { id: "cap6", lessons: ["6.1", "6.2", "6.3", "6.4", "6.5", "6.6"], quiz: 6 }
  ];
  function chapterPct(c) {
    const done = OL.store("done:" + c.id) || {};
    const q = OL.store("quiz:" + c.id) || {};
    const l = c.lessons.filter((id) => done[id]).length;
    const qd = Object.keys(q).length >= c.quiz ? 1 : 0;
    return Math.round(((l + qd) / (c.lessons.length + 1)) * 100);
  }
  OL.chapterPct = chapterPct;

  function setTopProgress(pct) {
    const f = $("#progressFill"), t = $("#progressText");
    if (f) f.style.width = pct + "%";
    if (t) t.textContent = pct + "%";
  }

  /* ---------- lecciones completadas ---------- */
  const page = document.body.dataset.page;
  const chap = OL.CHAPTERS.find((c) => c.id === page);

  function refreshProgress() {
    if (chap) setTopProgress(chapterPct(chap));
    else {
      const all = OL.CHAPTERS.map(chapterPct);
      setTopProgress(Math.round(all.reduce((a, b) => a + b, 0) / all.length));
      $$("[data-chapter]").forEach((el) => {
        const c = OL.CHAPTERS.find((x) => x.id === el.dataset.chapter);
        if (!c) return;
        const p = chapterPct(c);
        const bar = $(".mini-bar span", el), lab = $(".pct", el);
        if (bar) bar.style.width = p + "%";
        if (lab) lab.textContent = p > 0 ? p + " % completado" : "Sin empezar";
      });
    }
  }
  OL.refreshProgress = refreshProgress;

  if (chap) {
    const done = OL.store("done:" + chap.id) || {};
    $$(".lesson[data-lesson]").forEach((l) => {
      const cb = l.querySelector(":scope > label.done input[type=checkbox]");
      if (!cb) return;
      cb.checked = !!done[l.dataset.lesson];
      cb.addEventListener("change", () => {
        done[l.dataset.lesson] = cb.checked;
        OL.store("done:" + chap.id, done);
        refreshProgress();
      });
    });
  }

  /* ---------- listas de verificación guardadas ---------- */
  $$(".checklist[data-check]").forEach((ul) => {
    const key = "check:" + ul.dataset.check;
    const saved = OL.store(key) || [];
    $$("input[type=checkbox]", ul).forEach((cb, i) => {
      cb.checked = !!saved[i];
      cb.addEventListener("change", () => {
        const arr = $$("input[type=checkbox]", ul).map((x) => x.checked);
        OL.store(key, arr);
      });
    });
  });

  /* ---------- quiz ---------- */
  OL.initQuiz = function (questions) {
    const box = $("#quiz");
    if (!box || !chap) return;
    let answers = OL.store("quiz:" + chap.id) || {};
    function render() {
      box.innerHTML = "";
      questions.forEach((item, qi) => {
        const wrap = document.createElement("div");
        wrap.className = "q";
        const title = document.createElement("p");
        title.innerHTML = "<strong>" + (qi + 1) + ".</strong> " + item.q;
        wrap.appendChild(title);
        item.options.forEach((text, oi) => {
          const b = document.createElement("button");
          b.type = "button";
          b.className = "opt";
          b.textContent = text;
          const chosen = answers[qi];
          if (chosen !== undefined) {
            b.disabled = true;
            if (oi === item.correct) {
              b.classList.add("right");
              const t = document.createElement("span");
              t.className = "tag";
              t.textContent = "✓ Correcta";
              b.appendChild(t);
            } else if (oi === chosen) {
              b.classList.add("wrong");
              const t = document.createElement("span");
              t.className = "tag";
              t.textContent = "✗ Tu respuesta";
              b.appendChild(t);
            }
          }
          b.addEventListener("click", () => {
            answers[qi] = oi;
            OL.store("quiz:" + chap.id, answers);
            render();
            refreshProgress();
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
      const ok = questions.filter((it, i) => answers[i] === it.correct).length;
      $("#quizScore").textContent = done === questions.length
        ? "Resultado: " + ok + " de " + questions.length
        : "Respondidas: " + done + " de " + questions.length;
    }
    $("#quizReset").addEventListener("click", () => {
      answers = {};
      OL.store("quiz:" + chap.id, answers);
      render();
      refreshProgress();
    });
    render();
  };

  /* ---------- gráficas SVG ---------- */
  // cfg: {series:[{pts:[[x,y]], color, dash, width, name}], markers:[{x,y,color}], vlines:[{x,label}],
  //       xmin,xmax,ymin,ymax, xfmt, yfmt, xTitle}
  OL.drawChart = function (svg, cfg) {
    const W = 600, H = 280, pl = 58, pr = 14, pt = 36, pb = 38;
    // Marcas "redondas" para los ejes (por ejemplo 0, 200, 400 en lugar de −95, 340, 775).
    const niceTicks = (min, max, count) => {
      const raw = (max - min) / count;
      const mag = Math.pow(10, Math.floor(Math.log10(raw)));
      const norm = raw / mag;
      const step = (norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10) * mag;
      const out = [];
      for (let v = Math.ceil(min / step - 1e-9) * step; v <= max + step * 1e-9; v += step) out.push(Math.abs(v) < step * 1e-9 ? 0 : v);
      return out;
    };
    let xmin = cfg.xmin, xmax = cfg.xmax;
    const ys = [];
    cfg.series.forEach((s) => s.pts.forEach((p) => ys.push(p[1])));
    let ymin = cfg.ymin != null ? cfg.ymin : Math.min(...ys, 0);
    let ymax = cfg.ymax != null ? cfg.ymax : Math.max(...ys, 0);
    if (ymax - ymin < 1e-9) { ymax += 1; ymin -= 1; }
    const padY = (ymax - ymin) * 0.08;
    if (cfg.ymin == null) ymin -= padY;
    if (cfg.ymax == null) ymax += padY;
    const X = (x) => pl + ((x - xmin) / (xmax - xmin)) * (W - pl - pr);
    const Y = (y) => H - pb - ((y - ymin) / (ymax - ymin)) * (H - pt - pb);
    const xf = cfg.xfmt || ((v) => OL.num(v, 0));
    const yf = cfg.yfmt || ((v) => OL.usd0(v));
    let out = "";
    // cuadrícula y etiquetas del eje Y
    niceTicks(ymin, ymax, 4).forEach((v) => {
      out += '<line x1="' + pl + '" x2="' + (W - pr) + '" y1="' + Y(v).toFixed(1) + '" y2="' + Y(v).toFixed(1) + '" style="stroke:var(--chart-grid)" stroke-width="0.5"/>';
      out += '<text x="' + (pl - 6) + '" y="' + (Y(v) + 4).toFixed(1) + '" text-anchor="end">' + yf(v) + "</text>";
    });
    // eje X
    niceTicks(xmin, xmax, 4).forEach((v) => {
      out += '<text x="' + X(v).toFixed(1) + '" y="' + (H - pb + 16) + '" text-anchor="middle">' + xf(v) + "</text>";
    });
    if (cfg.xTitle) out += '<text x="' + (W / 2) + '" y="' + (H - 4) + '" text-anchor="middle">' + cfg.xTitle + "</text>";
    if (ymin < 0 && ymax > 0) out += '<line x1="' + pl + '" x2="' + (W - pr) + '" y1="' + Y(0).toFixed(1) + '" y2="' + Y(0).toFixed(1) + '" style="stroke:var(--muted)" stroke-width="1.5" stroke-dasharray="4 4"/>';
    (cfg.vlines || []).forEach((v) => {
      if (v.x < xmin || v.x > xmax) return;
      out += '<line x1="' + X(v.x).toFixed(1) + '" x2="' + X(v.x).toFixed(1) + '" y1="' + pt + '" y2="' + (H - pb) + '" style="stroke:var(--muted)" stroke-width="1" stroke-dasharray="2 4"/>';
      if (v.label) out += '<text x="' + (X(v.x) + 4).toFixed(1) + '" y="' + (pt + 12) + '">' + v.label + "</text>";
    });
    cfg.series.forEach((s) => {
      const pts = s.pts.map((p) => X(p[0]).toFixed(1) + "," + Y(p[1]).toFixed(1)).join(" ");
      out += '<polyline points="' + pts + '" fill="none" style="stroke:' + (s.color || "var(--accent)") + '" stroke-width="' + (s.width || 3) + '"' + (s.dash ? ' stroke-dasharray="' + s.dash + '"' : "") + ' stroke-linejoin="round"/>';
    });
    (cfg.markers || []).forEach((m) => {
      out += '<circle cx="' + X(m.x).toFixed(1) + '" cy="' + Y(m.y).toFixed(1) + '" r="6" style="fill:' + (m.color || "var(--accent)") + '"/>';
    });
    // leyenda
    const named = cfg.series.filter((s) => s.name);
    named.forEach((s, i) => {
      const lx = pl + 8 + i * 150;
      out += '<line x1="' + lx + '" x2="' + (lx + 22) + '" y1="14" y2="14" style="stroke:' + (s.color || "var(--accent)") + '" stroke-width="3"' + (s.dash ? ' stroke-dasharray="' + s.dash + '"' : "") + "/>";
      out += '<text x="' + (lx + 28) + '" y="18">' + s.name + "</text>";
    });
    svg.setAttribute("viewBox", "0 0 " + W + " " + H);
    svg.innerHTML = out;
  };

  refreshProgress();
})();
