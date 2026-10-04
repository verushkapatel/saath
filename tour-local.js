/* Local-only polish for the public Saath tour. No account data or external services are used. */
(() => {
  "use strict";

  const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let clearFocusTimer = 0;

  document.addEventListener(
    "click",
    (event) => {
      const link = event.target instanceof Element
        ? event.target.closest('a[data-testid="intro-skip-link"]')
        : null;
      if (!link) return;

      const finale = document.getElementById("join");
      if (!finale) return; // Keep the ordinary hash link as a safe fallback.

      event.preventDefault();
      if (window.location.hash !== "#join") {
        window.history.replaceState(null, "", "#join");
      }

      const primary = finale.querySelector(".btn-primary, button[type='submit']");
      const behavior = reducedMotion() ? "auto" : "smooth";
      if (!primary) {
        finale.scrollIntoView({ behavior, block: "start" });
        return;
      }

      const box = primary.getBoundingClientRect();
      const fullyVisible = box.top >= 0 && box.bottom <= window.innerHeight;
      if (!fullyVisible) primary.scrollIntoView({ behavior, block: "center" });

      window.clearTimeout(clearFocusTimer);
      const focusPrimary = () => {
        primary.focus({ preventScroll: true });
        primary.classList.add("tour-continue-focus");
        clearFocusTimer = window.setTimeout(
          () => primary.classList.remove("tour-continue-focus"),
          1400,
        );
      };
      window.setTimeout(focusPrimary, fullyVisible || reducedMotion() ? 0 : 550);
    },
    true,
  );
})();
