/* Play/pause control for the automatically scrolling news strip. */
(() => {
  const strip = document.querySelector(".news-strip");
  const toggle = strip?.querySelector(".news-strip__toggle");
  if (!strip || !toggle) return;

  toggle.addEventListener("click", () => {
    const paused = strip.classList.toggle("is-paused");
    toggle.setAttribute("aria-pressed", String(paused));
    toggle.setAttribute("aria-label", paused ? "Play news ticker" : "Pause news ticker");
    toggle.textContent = paused ? "▶" : "Ⅱ";
  });
})();
