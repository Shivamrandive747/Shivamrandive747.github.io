// Small interactive layer: crystal viewer, news ticker, copy buttons. The page reads fine without it.
(() => {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* =====================================================================
     Crystal viewer: conventional cubic cell of half-Heusler ZrNiSn (C1b).
     Zr on 4a (0,0,0), Sn on 4b (1/2,1/2,1/2), Ni on 4c (1/4,1/4,1/4),
     4d (3/4,3/4,3/4) empty. Ball-and-stick, Jmol element colours.
     ===================================================================== */
  const canvas = document.querySelector(".crystal-canvas");
  if (canvas && canvas.getContext) {
    const ctx = canvas.getContext("2d");
    const SPECIES = {
      Zr: { color: [148, 224, 224], r: 0.085 },
      Ni: { color: [80, 208, 80], r: 0.072 },
      Sn: { color: [102, 128, 128], r: 0.08 },
    };
    const FCC = [[0, 0, 0], [0, 0.5, 0.5], [0.5, 0, 0.5], [0.5, 0.5, 0]];
    const atoms = [];
    const seen = new Set();
    const add = (el, p) => {
      const key = p.map((v) => v.toFixed(3)).join(",");
      if (!seen.has(key)) { seen.add(key); atoms.push({ el, p }); }
    };
    // Every image of each site that lies inside the closed unit cube.
    const sites = [["Zr", [0, 0, 0]], ["Sn", [0.5, 0.5, 0.5]], ["Ni", [0.25, 0.25, 0.25]]];
    for (const [el, off] of sites)
      for (const f of FCC)
        for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) for (let k = -1; k <= 1; k++) {
          const p = [f[0] + off[0] + i, f[1] + off[1] + j, f[2] + off[2] + k];
          if (p.every((v) => v > -1e-6 && v < 1 + 1e-6)) add(el, p);
        }
    // Bonds: Ni to its nearest Zr and Sn neighbours, at a*sqrt(3)/4.
    const NN = Math.sqrt(3) / 4;
    const bonds = [];
    atoms.forEach((a, i) => {
      if (a.el !== "Ni") return;
      atoms.forEach((b, j) => {
        if (b.el === "Ni") return;
        const d = Math.hypot(a.p[0] - b.p[0], a.p[1] - b.p[1], a.p[2] - b.p[2]);
        if (Math.abs(d - NN) < 1e-3) bonds.push([i, j]);
      });
    });
    const corners = [];
    for (let i = 0; i < 8; i++) corners.push([i & 1, (i >> 1) & 1, (i >> 2) & 1]);
    const edges = [];
    for (let a = 0; a < 8; a++) for (let b = a + 1; b < 8; b++) {
      const diff = corners[a].reduce((s, v, n) => s + Math.abs(v - corners[b][n]), 0);
      if (diff === 1) edges.push([a, b]);
    }

    const shade = ([r, g, b], f) =>
      f >= 0 ? `rgb(${r + (255 - r) * f | 0},${g + (255 - g) * f | 0},${b + (255 - b) * f | 0})`
             : `rgb(${r * (1 + f) | 0},${g * (1 + f) | 0},${b * (1 + f) | 0})`;

    let size = 0, DPR = 1, yaw = 0.62, pitch = -0.42, dragging = false, lastX = 0, lastY = 0;
    let lineColor = "#8a929d", bondColor = "#b7bcc4";
    function readColors() {
      const cs = getComputedStyle(document.documentElement);
      lineColor = cs.getPropertyValue("--faint").trim() || lineColor;
      bondColor = window.matchMedia("(prefers-color-scheme: dark)").matches ? "#5b6572" : "#c3c8cf";
    }
    function resize() {
      DPR = Math.min(window.devicePixelRatio || 1, 2);
      size = canvas.clientWidth;
      canvas.width = Math.round(size * DPR);
      canvas.height = Math.round(size * DPR);
      draw();
    }
    function project(p) {
      const x = p[0] - 0.5, y = p[1] - 0.5, z = p[2] - 0.5;
      const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
      const x1 = x * cy + z * sy, z1 = -x * sy + z * cy;
      const y1 = y * cp - z1 * sp, z2 = y * sp + z1 * cp;
      const k = 3.2 / (3.2 + z2);                 // gentle perspective
      const s = size * 0.4;                       // keeps the rotated cell inside the frame
      return { x: size / 2 + x1 * k * s, y: size / 2 - y1 * k * s, z: z2, k };
    }
    function draw() {
      if (!size) return;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      ctx.clearRect(0, 0, size, size);
      const P = atoms.map((a) => project(a.p));
      const C = corners.map(project);
      // cell edges (thin, dashed for the far ones)
      ctx.lineWidth = 1;
      ctx.strokeStyle = lineColor;
      for (const [a, b] of edges) {
        ctx.setLineDash((C[a].z + C[b].z) / 2 > 0 ? [3, 4] : []);
        ctx.globalAlpha = 0.7;
        ctx.beginPath(); ctx.moveTo(C[a].x, C[a].y); ctx.lineTo(C[b].x, C[b].y); ctx.stroke();
      }
      ctx.setLineDash([]); ctx.globalAlpha = 1;

      // painter's algorithm over bonds and atoms
      const items = [];
      bonds.forEach(([a, b]) => items.push({ z: (P[a].z + P[b].z) / 2 + 0.02, bond: [a, b] }));
      atoms.forEach((_, i) => items.push({ z: P[i].z, atom: i }));
      items.sort((m, n) => n.z - m.z);
      for (const it of items) {
        if (it.bond) {
          const [a, b] = it.bond, pa = P[a], pb = P[b];
          const w = 4.5 * size / 460 * (pa.k + pb.k) / 2;
          ctx.lineCap = "round";
          ctx.lineWidth = w + 1.5; ctx.strokeStyle = "rgba(0,0,0,.18)";
          ctx.beginPath(); ctx.moveTo(pa.x, pa.y); ctx.lineTo(pb.x, pb.y); ctx.stroke();
          ctx.lineWidth = w; ctx.strokeStyle = bondColor;
          ctx.beginPath(); ctx.moveTo(pa.x, pa.y); ctx.lineTo(pb.x, pb.y); ctx.stroke();
        } else {
          const i = it.atom, p = P[i], sp = SPECIES[atoms[i].el];
          const r = sp.r * size * 0.4 * p.k * 1.1;
          const g = ctx.createRadialGradient(p.x - r * 0.38, p.y - r * 0.42, r * 0.08, p.x, p.y, r);
          g.addColorStop(0, shade(sp.color, 0.75));
          g.addColorStop(0.45, shade(sp.color, 0.05));
          g.addColorStop(1, shade(sp.color, -0.45));
          ctx.fillStyle = g;
          ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fill();
        }
      }
    }

    canvas.addEventListener("pointerdown", (e) => { dragging = true; lastX = e.clientX; lastY = e.clientY; canvas.setPointerCapture(e.pointerId); });
    canvas.addEventListener("pointermove", (e) => {
      if (!dragging) return;
      yaw += (e.clientX - lastX) * 0.01;
      pitch = Math.max(-1.4, Math.min(1.4, pitch + (e.clientY - lastY) * 0.01));
      lastX = e.clientX; lastY = e.clientY;
      draw();
    });
    const endDrag = () => { dragging = false; };
    canvas.addEventListener("pointerup", endDrag);
    canvas.addEventListener("pointercancel", endDrag);

    let visible = true, raf = 0, last = performance.now();
    function frame(now) {
      const dt = Math.min(50, now - last); last = now;
      if (!dragging) { yaw += dt * 0.00022; draw(); }
      raf = requestAnimationFrame(frame);
    }
    readColors();
    resize();
    window.addEventListener("resize", resize);
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => { readColors(); draw(); });
    if (!reduceMotion) {
      new IntersectionObserver(([e]) => {
        visible = e.isIntersecting;
        cancelAnimationFrame(raf);
        if (visible) { last = performance.now(); raf = requestAnimationFrame(frame); }
      }).observe(canvas);
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
