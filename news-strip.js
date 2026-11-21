/*
 * Rotating News & Updates card — a full citation at a time.
 * Every acceptance is visible for its ENTIRE acceptance calendar month AND
 * the ENTIRE following month (Asia/Kolkata); no per-day anniversaries.
 *
 * October 1–31 acceptance => ends December 1 (shown through November 30).
 * November 1–30 acceptance => ends January 1 (shown through December 31).
 *
 * Source of truth: window.PUBLICATIONS loaded from publications.js.
 */
(function (root) {
  "use strict";

  const TIME_ZONE = "Asia/Kolkata";
  const ROTATION_MS = 12000;
  const DATE_PATTERN = /^([0-9]{4})-([0-9]{2})-([0-9]{2})$/;

  function parseDay(value) {
    if (typeof value !== "string") return null;
    const match = DATE_PATTERN.exec(value);
    if (!match) return null;
    const year = Number(match[1]), month = Number(match[2]), day = Number(match[3]);
    if (year < 1900 || year > 2200 || month < 1 || month > 12 || day < 1) return null;
    const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
    return day <= last ? { year, month, day } : null;
  }

  function formatDay(parts) {
    return String(parts.year).padStart(4, "0") + "-" +
      String(parts.month).padStart(2, "0") + "-" +
      String(parts.day).padStart(2, "0");
  }

  function dateInIndia(now) {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit"
    }).formatToParts(now);
    const fields = Object.fromEntries(parts
      .filter(part => ["year", "month", "day"].includes(part.type))
      .map(part => [part.type, Number(part.value)]));
    return formatDay(fields);
  }

  // Exclusive end: the first day of the month AFTER the next calendar month.
  function expiryExclusive(acceptanceDate) {
    const day = parseDay(acceptanceDate);
    if (!day) return null;
    return new Date(Date.UTC(day.year, day.month + 1, 1)).toISOString().slice(0, 10);
  }

  function recentAcceptances(publications, todayISO) {
    if (!parseDay(todayISO) || !Array.isArray(publications)) return [];
    return publications.filter(paper => {
      if (!paper || !["journal", "conference"].includes(paper.type)) return false;
      const end = expiryExclusive(paper.acceptanceDate);
      return Boolean(end && paper.acceptanceDate <= todayISO && todayISO < end);
    }).sort((a, b) =>
      b.acceptanceDate.localeCompare(a.acceptanceDate) ||
      String(a.title).localeCompare(String(b.title))
    );
  }

  function citationParts(paper) {
    const raw = String(paper.newsAuthors || paper.authors || "").trim();
    const authors = paper.newsAuthors ? raw : (() => {
      const names = raw.split(",").map(name => name.trim()).filter(Boolean);
      if (names.length <= 1) return names.join("");
      if (names.length === 2) return names.join(" and ");
      return names.slice(0, -1).join(", ") + ", and " + names[names.length - 1];
    })();
    const venueText = String(paper.newsVenue || paper.venue || "").trim();
    return {
      authors,
      title: String(paper.title || "").trim(),
      venue: venueText.endsWith(".") ? venueText.slice(0, -1) : venueText
    };
  }

  function citationPlainText(paper) {
    const { authors, title, venue } = citationParts(paper);
    return authors + ', "' + title + '", ' + venue + ".";
  }

  if (typeof module === "object" && module.exports) {
    module.exports = { parseDay, formatDay, dateInIndia, expiryExclusive,
      recentAcceptances, citationParts, citationPlainText };
  }

  if (typeof document === "undefined") return;
  const strip = document.querySelector(".news-strip");
  const viewport = strip?.querySelector(".news-strip__viewport");
  const track = strip?.querySelector(".news-strip__track");
  const controls = strip?.querySelector(".news-strip__controls");
  const counter = strip?.querySelector(".news-strip__count");
  const previous = strip?.querySelector(".news-strip__previous");
  const next = strip?.querySelector(".news-strip__next");
  const toggle = strip?.querySelector(".news-strip__toggle");
  if (!strip || !viewport || !track || !controls || !counter || !previous || !next || !toggle) return;

  const reducedMotion = root.matchMedia?.("(prefers-reduced-motion: reduce)");
  const hoverCapable = root.matchMedia?.("(hover: hover)");
  let shownDay = "";
  let items = [];
  let currentIndex = 0;
  let paused = false;

  function makeCard(paper) {
    const link = document.createElement("a");
    link.className = "news-strip__item";
    if (paper) {
      // Only open HTTP(S) paper URLs; otherwise navigate to the archive.
      let href = "#publications";
      try {
        if (typeof paper.url === "string") {
          const url = new URL(paper.url, root.location.href);
          if (url.protocol === "https:" || url.protocol === "http:") href = url.href;
        }
      } catch (_error) { /* Keep the internal archive link. */ }
      link.href = href;
      if (href !== "#publications") {
        link.target = "_blank";
        link.rel = "noopener noreferrer";
      }

      const date = parseDay(paper.acceptanceDate);
      const when = new Intl.DateTimeFormat("en-GB", {
        timeZone: "UTC", day: "numeric", month: "short", year: "numeric"
      }).format(new Date(Date.UTC(date.year, date.month - 1, date.day)));

      const tag = document.createElement("span");
      tag.className = "news-strip__tag";
      tag.textContent = (paper.type === "journal" ? "JOURNAL" : "CONFERENCE") + " · ACCEPTED " + when;

      const citation = document.createElement("p");
      citation.className = "news-strip__message";
      const { authors, title, venue } = citationParts(paper);
      citation.appendChild(document.createTextNode(authors + ', "' + title + '", '));
      const journal = document.createElement("em");
      journal.textContent = venue;
      citation.append(journal, document.createTextNode("."));
      link.append(tag, citation);
    } else {
      link.href = "#publications";
      const tag = document.createElement("span");
      tag.className = "news-strip__tag";
      tag.textContent = "PUBLICATIONS";
      const message = document.createElement("p");
      message.className = "news-strip__message";
      message.textContent = "No new acceptances this month or last month. Browse the complete publications archive ↗";
      link.append(tag, message);
    }
    return link;
  }

  function draw() {
    const count = items.length;
    const hasMultiple = count > 1;
    strip.classList.toggle("is-empty", count === 0);
    strip.classList.toggle("is-single", !hasMultiple);
    controls.hidden = !hasMultiple;
    counter.textContent = count ? String(currentIndex + 1).padStart(2, "0") + " / " +
      String(count).padStart(2, "0") : "0 / 0";
    // DOM replacement triggers a short fade-in; every full citation is visible at once.
    track.replaceChildren(makeCard(count ? items[currentIndex] : null));
  }

  function updateForDate() {
    const today = dateInIndia(new Date());
    if (today === shownDay) return;
    shownDay = today;
    items = recentAcceptances(root.PUBLICATIONS || [], today);
    currentIndex = 0;
    draw();
  }

  function switchTo(step) {
    if (items.length < 2) return;
    currentIndex = (currentIndex + step + items.length) % items.length;
    draw();
  }

  function updatePauseButton() {
    toggle.setAttribute("aria-pressed", String(paused));
    toggle.setAttribute("aria-label", paused ? "Resume automatic paper rotation" : "Pause automatic paper rotation");
    toggle.title = paused ? "Resume automatic rotation" : "Pause automatic rotation";
    toggle.textContent = paused ? "▶" : "Ⅱ";
  }

  previous.addEventListener("click", () => switchTo(-1));
  next.addEventListener("click", () => switchTo(1));
  toggle.addEventListener("click", () => {
    paused = !paused;
    updatePauseButton();
  });

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) updateForDate();
  });
  root.addEventListener("focus", updateForDate);

  root.setInterval(() => {
    updateForDate();
    if (items.length < 2 || paused || document.hidden || reducedMotion?.matches) return;
    if (strip.matches(":focus-within")) return;
    if (hoverCapable?.matches && strip.matches(":hover")) return;
    switchTo(1);
  }, ROTATION_MS);

  updatePauseButton();
  updateForDate();
})(typeof globalThis === "object" ? globalThis : this);
