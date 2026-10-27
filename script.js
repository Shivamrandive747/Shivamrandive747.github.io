// Small interactive layer: news ticker, copy buttons. The page reads fine without it.
(() => {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

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
