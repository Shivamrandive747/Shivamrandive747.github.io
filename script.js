// Small interactive layer: hero diagram, news ticker, copy buttons. The page reads fine without it.
(() => {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- hero diagram: structure -> learn -> predict -> verify ----------
     Replaces the static SVG with a live one. A highlight walks round the four
     steps; each step animates while it is active. Colours come from CSS. */
  const fig = document.querySelector(".loop");
  const staticSvg = fig && fig.querySelector("svg");
  if (staticSvg) {
    const NS = "http://www.w3.org/2000/svg";
    const el = (tag, attrs = {}, parent) => {
      const e = document.createElementNS(NS, tag);
      for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
      if (parent) parent.appendChild(e);
      return e;
    };
    const clamp = (v) => Math.max(0, Math.min(1, v));
    const ease = (v) => { v = clamp(v); return v * v * (3 - 2 * v); };

    const svg = el("svg", { class: "loop-svg", viewBox: "0 0 440 430", role: "img", "aria-labelledby": "loop-title" });
    el("title", { id: "loop-title" }, svg).textContent = staticSvg.querySelector("title").textContent;
    const defs = el("defs", {}, svg);
    for (const [id, c] of [["lpA", "var(--accent)"], ["lpB", "var(--accent-2)"]]) {
      const g = el("radialGradient", { id, cx: "35%", cy: "30%", r: "75%" }, defs);
      el("stop", { offset: "0", style: `stop-color:color-mix(in srgb, ${c} 30%, #fff)` }, g);
      el("stop", { offset: ".5", style: `stop-color:color-mix(in srgb, ${c} 85%, #fff)` }, g);
      el("stop", { offset: "1", style: `stop-color:color-mix(in srgb, ${c} 55%, #000)` }, g);
    }
    const head = el("marker", { id: "lp-head", viewBox: "0 0 10 10", refX: 8, refY: 5, markerWidth: 7,
                                markerHeight: 7, orient: "auto-start-reverse" }, defs);
    el("path", { class: "lp-head", d: "M0,0 L10,5 L0,10 z" }, head);

    const STEPS = [[20, 20, "Structure", "crystal → graph"], [240, 20, "Learn", "GNN · interatomic potential"],
                   [240, 240, "Predict", "DOS · Seebeck · κL"], [20, 240, "Verify", "against DFT & experiment"]];
    const steps = STEPS.map(([x, y, title, sub], n) => {
      const g = el("g", { class: "lp-step", transform: `translate(${x},${y})` }, svg);
      el("rect", { class: "lp-card", x: 0.5, y: 0.5, width: 179, height: 169, rx: 12 }, g);
      const t = el("text", { class: "lp-title", x: 14, y: 27 }, g);
      el("tspan", { class: "lp-num" }, t).textContent = String(n + 1);
      t.appendChild(document.createTextNode(" " + title));
      el("text", { class: "lp-sub", x: 14, y: 158 }, g).textContent = sub;
      return el("g", { class: "lp-content" }, g);
    });
    const arrows = ["M202,105 L236,105", "M330,192 L330,236", "M238,325 L204,325", "M110,238 L110,194"]
      .map((d) => el("path", { class: "lp-arrow", d, "marker-end": "url(#lp-head)" }, svg));
    el("text", { class: "lp-note", x: 122, y: 223 }, svg).textContent = "correct & retrain";

    // 1. Structure: rock-salt cell (27 sites, two species), bonds to nearest neighbours.
    const atoms = [];
    for (const i of [0, 0.5, 1]) for (const j of [0, 0.5, 1]) for (const k of [0, 0.5, 1])
      atoms.push({ p: [i - 0.5, j - 0.5, k - 0.5], a: ((i + j + k) * 2) % 2 === 0 });
    const bonds = [];
    atoms.forEach((a, m) => atoms.forEach((b, n) => {
      const d = Math.hypot(a.p[0] - b.p[0], a.p[1] - b.p[1], a.p[2] - b.p[2]);
      if (n > m && Math.abs(d - 0.5) < 1e-6) bonds.push([m, n]);
    }));
    const centre = atoms.findIndex((a) => a.p.every((v) => v === 0));
    const crystal = steps[0];
    const bondEls = bonds.map(([m, n]) => el("line", { class: m === centre || n === centre ? "lp-bond hub" : "lp-bond" }, crystal));
    const atomEls = atoms.map((a) => el("circle", { fill: `url(#${a.a ? "lpA" : "lpB"})` }, crystal));
    const halo = el("circle", { class: "lp-halo" }, crystal);
    function drawCrystal(yaw, glow, ring) {
      const pitch = -0.5, cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
      const P = atoms.map(({ p: [x, y, z] }) => {
        const x1 = x * cy + z * sy, z1 = -x * sy + z * cy;
        const y1 = y * cp - z1 * sp, z2 = y * sp + z1 * cp;
        const k = 3 / (3 + z2);
        return { x: 90 + x1 * k * 58, y: 86 - y1 * k * 58, z: z2, k };
      });
      const items = [];
      bonds.forEach(([m, n], b) => {
        const e = bondEls[b], hub = m === centre || n === centre, k = (P[m].k + P[n].k) / 2;
        e.setAttribute("x1", P[m].x.toFixed(1)); e.setAttribute("y1", P[m].y.toFixed(1));
        e.setAttribute("x2", P[n].x.toFixed(1)); e.setAttribute("y2", P[n].y.toFixed(1));
        e.setAttribute("stroke-width", ((hub ? 1.5 + 1.6 * glow : 1.5) * k).toFixed(2));
        e.style.opacity = hub ? 0.4 + 0.6 * glow : 0.4;
        items.push([(P[m].z + P[n].z) / 2 + 0.01, e]);
      });
      atoms.forEach((a, n) => {
        const e = atomEls[n];
        e.setAttribute("cx", P[n].x.toFixed(1)); e.setAttribute("cy", P[n].y.toFixed(1));
        e.setAttribute("r", ((a.a ? 5.8 : 4.2) * P[n].k).toFixed(2));
        items.push([P[n].z, e]);
      });
      items.sort((u, v) => v[0] - u[0]);           // far first
      for (const [, e] of items) crystal.appendChild(e);
      crystal.appendChild(halo);
      halo.setAttribute("cx", P[centre].x.toFixed(1)); halo.setAttribute("cy", P[centre].y.toFixed(1));
      halo.setAttribute("r", (6 + 18 * ring).toFixed(1));
      halo.style.opacity = glow * 0.7 * (1 - ring);
    }

    // 2. Learn: a small network; signals travel one layer at a time.
    const net = steps[1];
    const layers = [[28, 3], [72, 4], [116, 4], [156, 1]].map(([x, n]) =>
      Array.from({ length: n }, (_, k) => [x, 89 + (k - (n - 1) / 2) * 22]));
    const edgeSets = [0, 1, 2].map((l) => layers[l].flatMap((a) => layers[l + 1].map((b) => [a, b])));
    edgeSets.flat().forEach(([a, b]) => el("line", { class: "lp-edge", x1: a[0], y1: a[1], x2: b[0], y2: b[1] }, net));
    const dots = Array.from({ length: 16 }, () => el("circle", { class: "lp-dot", r: 2.4 }, net));
    const lag = dots.map((_, i) => ((i * 7) % 16) / 16 * 0.35);   // staggered start per edge
    const nodeEls = layers.map((L, li) => L.map(([x, y]) => el("circle", { class: "lp-node", cx: x, cy: y, r: li === 3 ? 7 : 5.5 }, net)));
    function drawNet(active, t, done) {
      const u = active ? Math.min(3, t * 3.6) : done ? 3 : -1;
      const l = Math.min(2, Math.floor(u)), f = u - l;
      nodeEls.forEach((L, li) => L.forEach((e) => e.classList.toggle("on", u >= 0 && (li <= l || (li === l + 1 && f > 0.92) || u >= 3))));
      const set = active && u < 3 ? edgeSets[l] : [];
      dots.forEach((d, i) => {
        if (i < set.length) {
          const [[x1, y1], [x2, y2]] = set[i], g = ease((f - lag[i]) / 0.6);
          d.setAttribute("cx", (x1 + (x2 - x1) * g).toFixed(1)); d.setAttribute("cy", (y1 + (y2 - y1) * g).toFixed(1));
          d.style.opacity = g > 0 && g < 1 ? 1 : 0;
        } else d.style.opacity = 0;
      });
    }

    // 3. Predict: a density of states with a gap at the Fermi level, drawn as it is predicted.
    const dos = steps[2];
    const peaks = [[32, 42, 8], [54, 62, 7], [72, 34, 6], [116, 40, 6], [134, 66, 8], [155, 38, 6]];
    const pts = [];
    for (let x = 20; x <= 164; x += 2) {
      const v = x > 84 && x < 104 ? 0 : peaks.reduce((s, [m, A, w]) => s + A * Math.exp(-(((x - m) / w) ** 2)), 0);
      pts.push(`${x},${(132 - v).toFixed(1)}`);
    }
    const line = "M" + pts.join(" L");
    // the spectrum is revealed left to right through a growing clip
    const reveal = el("rect", { x: 14, y: 36, height: 100, width: 0 }, el("clipPath", { id: "lp-reveal" }, defs));
    el("line", { class: "lp-axis", x1: 16, y1: 132, x2: 168, y2: 132 }, dos);
    const spectrum = el("g", { "clip-path": "url(#lp-reveal)" }, dos);
    el("path", { class: "lp-dos-fill", d: `${line} L164,132 L20,132 Z` }, spectrum);
    el("path", { class: "lp-dos", d: line }, spectrum);
    el("line", { class: "lp-ef", x1: 94, y1: 44, x2: 94, y2: 132 }, dos);
    const ef = el("text", { class: "lp-ef-label", x: 98, y: 54 }, dos);
    ef.textContent = "E";
    el("tspan", { dy: 3 }, ef).textContent = "F";
    function drawDos(p) { reveal.setAttribute("width", (154 * p).toFixed(1)); }

    // 4. Verify: predictions land on the parity line, then a tick.
    const ver = steps[3];
    el("path", { class: "lp-axis", d: "M30,44 L30,132 L162,132" }, ver);
    el("line", { class: "lp-diag", x1: 30, y1: 132, x2: 158, y2: 50 }, ver);
    const PTS = [[0.1, 0.05], [0.19, -0.04], [0.28, 0.06], [0.37, -0.03], [0.46, 0.06], [0.55, -0.05],
                 [0.64, 0.03], [0.73, -0.05], [0.82, 0.04], [0.91, -0.02]];
    const ptEls = PTS.map(() => el("circle", { class: "lp-pt", r: 3.8 }, ver));
    const tick = el("path", { class: "lp-check", d: "M42,60 l7,7 l14,-15" }, ver);
    tick.style.strokeDasharray = 32;
    function drawVerify(active, t) {
      PTS.forEach(([a, e], i) => {
        const s = active ? ease((t - (i / PTS.length) * 0.7) / 0.1) : 1;
        ptEls[i].setAttribute("cx", (30 + 128 * a).toFixed(1));
        ptEls[i].setAttribute("cy", (132 - 82 * (a + e) - (1 - s) * 14).toFixed(1));
        ptEls[i].style.opacity = s;
      });
      tick.style.strokeDashoffset = 32 * (1 - (active ? ease((t - 0.8) / 0.15) : 1));
    }

    const STEP_MS = 2600;
    function render(now, still) {
      const c = now / STEP_MS, stage = still ? -1 : Math.floor(c) % 4, t = c % 1;
      svg.classList.toggle("is-still", still);
      steps.forEach((g, n) => g.parentNode.classList.toggle("is-active", n === stage));
      arrows.forEach((a, n) => a.classList.toggle("is-hot", n === stage && t > 0.8));
      const glow = still ? 1 : stage === 0 ? ease(t / 0.35) : stage === 1 ? 1 - ease(t / 0.3) : 0;
      drawCrystal(0.6 + (still ? 0 : now * 0.00022), glow, still ? 0.35 : (t * 2) % 1);
      drawNet(stage === 1, t, still || stage === 2 || stage === 3);
      drawDos(still || stage !== 2 ? 1 : ease(t * 1.4));
      drawVerify(stage === 3, t);
    }

    staticSvg.replaceWith(svg);

    if (reduceMotion) {
      render(0, true);
    } else {
      let raf = 0, start = performance.now();
      const frame = (now) => { render(now - start, false); raf = requestAnimationFrame(frame); };
      const play = (on) => { cancelAnimationFrame(raf); if (on) raf = requestAnimationFrame(frame); };
      render(0, false);
      new IntersectionObserver(([e]) => play(e.isIntersecting && !document.hidden)).observe(svg);
      document.addEventListener("visibilitychange", () => play(!document.hidden));
    }
  }

  /* ---------- news ticker: one line, auto-advances, pauses on hover/focus ---------- */
  const carousel = document.querySelector(".carousel");
  if (carousel) {
    const track = carousel.querySelector(".track");
    const slides = [...track.children];
    const count = document.querySelector(".news-count");
    const box = carousel.closest(".news");
    let index = 0, timer = null;
    const go = (i) => {
      index = (i + slides.length) % slides.length;
      track.style.transform = `translateX(-${index * 100}%)`;
      slides.forEach((s, j) => s.setAttribute("aria-hidden", j === index ? "false" : "true"));
      if (count) count.textContent = `${index + 1} / ${slides.length}`;
    };
    const restart = () => {
      clearInterval(timer);
      if (!reduceMotion) timer = setInterval(() => go(index + 1), 5000);
    };
    box.querySelectorAll(".arrow").forEach((a) =>
      a.addEventListener("click", () => { go(index + Number(a.dataset.dir)); restart(); }));
    box.addEventListener("mouseenter", () => clearInterval(timer));
    box.addEventListener("mouseleave", restart);
    box.addEventListener("focusin", () => clearInterval(timer));
    box.addEventListener("focusout", restart);
    document.addEventListener("visibilitychange", () => (document.hidden ? clearInterval(timer) : restart()));
    go(0);
    restart();
  }

  /* ---------- copy DOI / BibTeX ---------- */
  const DOI = "10.48550/arXiv.2610.18179";
  const BIBTEX = `@misc{randive2026heusler,
  title         = {High-throughput screening of Heusler alloys for thermoelectrics combining machine-learned densities of states and first-principles transport},
  author        = {Randive, Shivam and Dixit, Rahul and Pandey, Himanshu},
  year          = {2026},
  eprint        = {2610.18179},
  archivePrefix = {arXiv},
  primaryClass  = {cond-mat.mtrl-sci},
  doi           = {${DOI}}
}`;
  const status = document.querySelector(".copied");
  document.querySelectorAll("[data-copy]").forEach((btn) =>
    btn.addEventListener("click", async () => {
      const text = btn.dataset.copy === "doi" ? `https://doi.org/${DOI}` : BIBTEX;
      try {
        await navigator.clipboard.writeText(text);
        status.textContent = btn.dataset.copy === "doi" ? "DOI link copied" : "BibTeX copied";
      } catch {
        status.textContent = "Copy failed";
      }
      setTimeout(() => (status.textContent = ""), 2500);
    }));
})();
