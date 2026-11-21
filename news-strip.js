/*
 * Automatically display recently accepted journal and conference papers.
 *
 * Source: window.PUBLICATIONS from publications.js
 * Eligibility: explicit YYYY-MM-DD acceptanceDate, accepted in the current
 * or previous calendar month, and not past the one-calendar-month anniversary.
 * Dates use Asia/Kolkata so all visitors see the same cut-off day.
 *
 * Example: accepted 2026-11-20 => shown through 2026-12-19,
 * disappears on 2026-12-20 (IST), without needing to edit the ticker.
 */
(function (root) {
  "use strict";

  const TIME_ZONE = "Asia/Kolkata";
  const DAY = /^([0-9]{4})-([0-9]{2})-([0-9]{2})$/;

  function parseDay(value) {
    if (typeof value !== "string") return null;
    const match = DAY.exec(value);
    if (!match) return null;
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    if (year < 1900 || year > 2200 || month < 1 || month > 12 || day < 1) return null;
    const max = new Date(Date.UTC(year, month, 0)).getUTCDate();
    return day <= max ? { year, month, day } : null;
  }

  function formatDay(parts) {
    return String(parts.year).padStart(4, "0") + "-" +
      String(parts.month).padStart(2, "0") + "-" +
      String(parts.day).padStart(2, "0");
  }

  function addCalendarMonth(date) {
    const year = date.month === 12 ? date.year + 1 : date.year;
    const month = date.month === 12 ? 1 : date.month + 1;
    const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
    return { year, month, day: Math.min(date.day, lastDay) };
  }

  function dateInIndia(now) {
    const format = new Intl.DateTimeFormat("en-GB", {
      timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit"
    });
    const parts = Object.fromEntries(format.formatToParts(now)
      .filter(part => ["year", "month", "day"].includes(part.type))
      .map(part => [part.type, Number(part.value)]));
    return formatDay(parts);
  }

  function recentAcceptances(publications, todayISO) {
    const today = parseDay(todayISO);
    if (!today || !Array.isArray(publications)) return [];

    return publications.filter(paper => {
      if (!paper || !["journal", "conference"].includes(paper.type)) return false;
      const accepted = parseDay(paper.acceptanceDate);
      if (!accepted) return false; // Never infer an unrecorded acceptance date.
      const monthsAgo = (today.year - accepted.year) * 12 + today.month - accepted.month;
      if (monthsAgo < 0 || monthsAgo > 1) return false;
      const expiry = formatDay(addCalendarMonth(accepted));
      return todayISO >= paper.acceptanceDate && todayISO < expiry;
    }).sort((a, b) =>
      b.acceptanceDate.localeCompare(a.acceptanceDate) ||
      String(a.title).localeCompare(String(b.title))
    );
  }

  // Export only the pure date functions in Node (used by the regression tests).
  if (typeof module === "object" && module.exports) {
    module.exports = { parseDay, formatDay, addCalendarMonth, dateInIndia, recentAcceptances };
  }
  if (typeof document === "undefined") return;

  const strip = document.querySelector(".news-strip");
  const viewport = strip?.querySelector(".news-strip__viewport");
  const track = strip?.querySelector(".news-strip__track");
  const toggle = strip?.querySelector(".news-strip__toggle");
  if (!strip || !viewport || !track || !toggle) return;

  let renderedDay = "";
  let resizeQueued = false;
  let displayedPapers = [];

  function makeLink(paper, duplicated) {
    const link = document.createElement("a");
    link.className = "news-strip__item";
    const source = paper?.url;
    let external = null;
    if (typeof source === "string") {
      try {
        const resolved = new URL(source, window.location.href);
        if (resolved.protocol === "https:" || resolved.protocol === "http:") external = resolved.href;
      } catch (_error) { /* Fallback to the publication archive. */ }
    }
    link.href = external || "#publications";
    if (external) {
      link.target = "_blank";
      link.rel = "noopener noreferrer";
    }
    if (duplicated) {
      link.tabIndex = -1;
      link.setAttribute("aria-hidden", "true");
    }

    const tag = document.createElement("span");
    tag.className = "news-strip__tag";
    tag.textContent = paper ? (paper.type === "journal" ? "JOURNAL ACCEPTED" : "CONFERENCE ACCEPTED") : "PUBLICATIONS";

    const message = document.createElement("span");
    message.className = "news-strip__message";
    if (paper) {
      const date = parseDay(paper.acceptanceDate);
      const acceptedOn = new Intl.DateTimeFormat("en-GB", {
        day: "numeric", month: "short", year: "numeric", timeZone: "UTC"
      }).format(new Date(Date.UTC(date.year, date.month - 1, date.day)));
      message.textContent = acceptedOn + " · " + paper.title + " — " + paper.venue;
    } else {
      message.textContent = "No new paper acceptances in the past month · Browse all publications";
    }
    const arrow = document.createElement("span");
    arrow.className = "news-strip__arrow";
    arrow.textContent = "↗";
    arrow.setAttribute("aria-hidden", "true");

    link.append(tag, message, arrow);
    return link;
  }

  function draw() {
    const hasPapers = displayedPapers.length > 0;
    strip.classList.toggle("is-empty", !hasPapers);
    toggle.hidden = !hasPapers;
    const first = document.createElement("div");
    first.className = "news-strip__items";
    const papers = hasPapers ? displayedPapers : [null];
    papers.forEach(paper => first.appendChild(makeLink(paper, false)));
    track.replaceChildren(first);

    if (!hasPapers) return;

    // Repeat the first sequence if too short to cover a wide viewport.
    // All repeated links are hidden from assistive tech and tab navigation.
    const minimumWidth = viewport.clientWidth + 50;
    let repetitions = 0;
    while (first.getBoundingClientRect().width < minimumWidth && repetitions < 8) {
      papers.forEach(paper => first.appendChild(makeLink(paper, true)));
      repetitions++;
    }

    const second = first.cloneNode(true);
    second.setAttribute("aria-hidden", "true");
    second.querySelectorAll("a").forEach(link => {
      link.tabIndex = -1;
      link.setAttribute("aria-hidden", "true");
    });
    track.appendChild(second);
  }

  function update() {
    const today = dateInIndia(new Date());
    if (renderedDay === today) return;
    renderedDay = today;
    displayedPapers = recentAcceptances(root.PUBLICATIONS || [], today);
    draw();
  }

  toggle.addEventListener("click", () => {
    const paused = strip.classList.toggle("is-paused");
    toggle.setAttribute("aria-pressed", String(paused));
    toggle.setAttribute("aria-label", paused ? "Play news ticker" : "Pause news ticker");
    toggle.title = paused ? "Play news" : "Pause news";
    toggle.textContent = paused ? "▶" : "Ⅱ";
  });

  if ("ResizeObserver" in root) {
    new ResizeObserver(() => {
      if (resizeQueued) return;
      resizeQueued = true;
      requestAnimationFrame(() => {
        resizeQueued = false;
        draw();
      });
    }).observe(viewport);
  }
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) update();
  });
  window.addEventListener("focus", update);
  // Handles a site tab left open across the month-anniversary deadline.
  window.setInterval(update, 5 * 60 * 1000);
  update();
})(typeof globalThis === "object" ? globalThis : this);
