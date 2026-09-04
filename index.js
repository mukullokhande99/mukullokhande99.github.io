(() => {
  const publications = window.PUBLICATIONS || [];
  const list = document.querySelector("#publication-list");
  const search = document.querySelector("#publication-search");
  const count = document.querySelector("#result-count");
  const empty = document.querySelector("#empty-state");
  const typeFilters = [...document.querySelectorAll(".type-filter")];
  const yearFilters = [...document.querySelectorAll(".year-filter")];
  const spatialToggle = document.querySelector(".spatial-toggle");
  const spatialToggleLabel = spatialToggle?.querySelector("strong");
  const spatialStage = document.querySelector(".home-hero");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const typeLabels = { journal: "Journal", conference: "Conference", patent: "Patent", advanced: "Advanced stage" };
  let activeFilter = "all";
  let activeYear = "all";
  let scholarArticles = [];

  const readSpatialPreference = () => {
    try {
      return window.localStorage.getItem("spatial-interface") !== "off";
    } catch (_error) {
      return true;
    }
  };

  const setSpatialMode = enabled => {
    document.body.dataset.spatial = enabled ? "on" : "off";
    if (!spatialToggle) return;
    spatialToggle.setAttribute("aria-pressed", String(enabled));
    spatialToggle.setAttribute("aria-label", `${enabled ? "Turn off" : "Turn on"} spatial interface`);
    if (spatialToggleLabel) spatialToggleLabel.textContent = enabled ? "Spatial on" : "Spatial off";
  };

  setSpatialMode(readSpatialPreference());

  spatialToggle?.addEventListener("click", () => {
    const enabled = document.body.dataset.spatial !== "on";
    setSpatialMode(enabled);
    try {
      window.localStorage.setItem("spatial-interface", enabled ? "on" : "off");
    } catch (_error) {
      // The control still works for this page view when storage is unavailable.
    }
  });

  if (spatialStage && window.matchMedia("(pointer: fine)").matches) {
    const resetSpatialPosition = () => {
      spatialStage.style.setProperty("--look-x", "0px");
      spatialStage.style.setProperty("--look-y", "0px");
      spatialStage.style.setProperty("--tilt-x", "0deg");
      spatialStage.style.setProperty("--tilt-y", "0deg");
    };
    spatialStage.addEventListener("pointermove", event => {
      if (document.body.dataset.spatial !== "on" || reducedMotion.matches) return;
      const bounds = spatialStage.getBoundingClientRect();
      const x = (event.clientX - bounds.left) / bounds.width - .5;
      const y = (event.clientY - bounds.top) / bounds.height - .5;
      spatialStage.style.setProperty("--look-x", `${(x * 10).toFixed(2)}px`);
      spatialStage.style.setProperty("--look-y", `${(y * 8).toFixed(2)}px`);
      spatialStage.style.setProperty("--tilt-x", `${(x * 3.2).toFixed(2)}deg`);
      spatialStage.style.setProperty("--tilt-y", `${(y * -2.6).toFixed(2)}deg`);
    }, { passive: true });
    spatialStage.addEventListener("pointerleave", resetSpatialPosition);
    reducedMotion.addEventListener?.("change", resetSpatialPosition);
  }

  const depthPointer = window.matchMedia("(pointer: fine)");
  const enableDepthCards = (root = document) => {
    const cards = [...root.querySelectorAll(".metrics-bar > div, .focus-card, .silicon-card, .publication-item, .research-method, .service-panel")];
    cards.forEach(card => {
      card.classList.add("vr-depth-card");
      if (card.dataset.vrReady || !depthPointer.matches) return;
      card.dataset.vrReady = "true";
      const reset = () => {
        card.style.setProperty("--vr-rx", "0deg");
        card.style.setProperty("--vr-ry", "0deg");
        card.style.setProperty("--vr-light-x", "50%");
        card.style.setProperty("--vr-light-y", "45%");
      };
      card.addEventListener("pointermove", event => {
        if (document.body.dataset.spatial !== "on" || reducedMotion.matches) return;
        const bounds = card.getBoundingClientRect();
        const x = (event.clientX - bounds.left) / bounds.width;
        const y = (event.clientY - bounds.top) / bounds.height;
        card.style.setProperty("--vr-rx", `${((.5 - y) * 4.5).toFixed(2)}deg`);
        card.style.setProperty("--vr-ry", `${((x - .5) * 5.5).toFixed(2)}deg`);
        card.style.setProperty("--vr-light-x", `${(x * 100).toFixed(1)}%`);
        card.style.setProperty("--vr-light-y", `${(y * 100).toFixed(1)}%`);
      }, { passive: true });
      card.addEventListener("pointerleave", reset);
      reducedMotion.addEventListener?.("change", reset);
    });
  };

  const normalizeTitle = (value = "") => String(value)
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

  const titleTokens = value => new Set(normalizeTitle(value)
    .split(" ")
    .filter(token => token.length > 2 && !["the", "and", "for", "with", "from"].includes(token)));

  const findScholarArticle = title => {
    const normalized = normalizeTitle(title);
    const compact = normalized.replaceAll(" ", "");
    const titleKey = normalizeTitle(title.split(":", 1)[0]);
    const exact = scholarArticles.find(article => {
      const candidate = normalizeTitle(article.title);
      return candidate === normalized || candidate.replaceAll(" ", "") === compact;
    });
    if (exact) return exact;

    const namedMatch = titleKey.length >= 4
      ? scholarArticles.find(article => normalizeTitle(article.title.split(":", 1)[0]) === titleKey)
      : null;
    if (namedMatch) return namedMatch;

    const expectedTokens = titleTokens(title);
    let best = null;
    let bestScore = 0;
    scholarArticles.forEach(article => {
      const candidateTokens = titleTokens(article.title);
      const overlap = [...expectedTokens].filter(token => candidateTokens.has(token)).length;
      const score = overlap / Math.max(expectedTokens.size, candidateTokens.size, 1);
      if (score > bestScore) {
        best = article;
        bestScore = score;
      }
    });
    return bestScore >= .82 ? best : null;
  };

  const totals = publications.reduce((result, publication) => {
    if (publication.type !== "advanced") result.all += 1;
    result[publication.type] = (result[publication.type] || 0) + 1;
    return result;
  }, { all: 0 });

  const paperTotal = publications.filter(publication => publication.type === "journal" || publication.type === "conference").length;
  const patentTotal = publications.filter(publication => publication.type === "patent").length;
  const heroPublicationTotal = document.querySelector("#hero-publication-total");
  const paperTotalElement = document.querySelector("#paper-total");
  const patentTotalElement = document.querySelector("#patent-total");
  if (heroPublicationTotal) heroPublicationTotal.textContent = totals.all;
  if (paperTotalElement) paperTotalElement.textContent = paperTotal;
  if (patentTotalElement) patentTotalElement.textContent = patentTotal;

  const updateScholarMetrics = async () => {
    const metricSources = [
      "https://raw.githubusercontent.com/mukullokhande99/mukullokhande99.github.io/master/data/scholar-metrics.json",
      "data/scholar-metrics.json"
    ];
    const targets = {
      citations: document.querySelector("#citation-total"),
      h_index: document.querySelector("#h-index-total"),
      i10_index: document.querySelector("#i10-index-total")
    };

    try {
      let metrics = null;
      for (const source of metricSources) {
        try {
          const response = await fetch(source, { cache: "no-store" });
          if (!response.ok) throw new Error(`Scholar metrics request failed: ${response.status}`);
          metrics = await response.json();
          break;
        } catch (sourceError) {
          console.info(`Could not load Scholar metrics from ${source}.`, sourceError);
        }
      }
      if (!metrics) throw new Error("No Scholar metrics source was available.");

      scholarArticles = Array.isArray(metrics.articles)
        ? metrics.articles.filter(article => article && typeof article.title === "string" && Number.isInteger(article.citations))
        : [];

      Object.entries(targets).forEach(([key, element]) => {
        const value = metrics[key];
        if (element && Number.isInteger(value) && value >= 0) element.textContent = value.toLocaleString("en-US");
      });

      const updatedAt = document.querySelector("#scholar-updated-at");
      const updatedDate = new Date(metrics.updated_at);
      if (updatedAt && !Number.isNaN(updatedDate.getTime())) {
        updatedAt.textContent = new Intl.DateTimeFormat("en", {
          month: "short",
          year: "numeric",
          timeZone: "UTC"
        }).format(updatedDate);
      }
      render();
    } catch (error) {
      console.info("Using the last embedded Google Scholar metrics.", error);
    }
  };

  const updateFilterCounts = () => {
    typeFilters.forEach(button => {
      const type = button.dataset.filter;
      const total = publications.filter(publication =>
        (type === "all" ? publication.type !== "advanced" : publication.type === type) &&
        (activeYear === "all" || publication.year === Number(activeYear))
      ).length;
      button.querySelector("span").textContent = total;
    });
    yearFilters.forEach(button => {
      const year = button.dataset.year;
      const total = publications.filter(publication =>
        (year === "all" || publication.year === Number(year)) &&
        (activeFilter === "all" ? publication.type !== "advanced" : publication.type === activeFilter)
      ).length;
      button.querySelector("span").textContent = total;
    });
  };

  const escapeHTML = (value = "") => String(value).replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  })[character]);

  const monthNumbers = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
  const publicationTimestamp = publication => {
    const dateMatch = publication.venue.match(/\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\.?\s+(?:(\d{1,2})(?:\s*[–-]\s*\d{1,2})?,?\s+)?(\d{4})\b/i);
    if (!dateMatch) return Date.UTC(publication.year, 0, 1);
    return Date.UTC(Number(dateMatch[3]), monthNumbers[dateMatch[1].slice(0, 3).toLowerCase()], Number(dateMatch[2] || 1));
  };

  const render = () => {
    const query = search.value.trim().toLowerCase();
    const matches = publications.filter(publication => {
      const isType = activeFilter === "all" ? publication.type !== "advanced" : publication.type === activeFilter;
      const isYear = activeYear === "all" || publication.year === Number(activeYear);
      const haystack = [publication.title, publication.authors, publication.venue, publication.year, publication.status, publication.indexing, publication.quartile, publication.impactFactor].join(" ").toLowerCase();
      return isType && isYear && haystack.includes(query);
    }).sort((a, b) => publicationTimestamp(b) - publicationTimestamp(a));

    count.textContent = `${matches.length} ${matches.length === 1 ? "work" : "works"}`;
    empty.hidden = matches.length !== 0;
    list.innerHTML = matches.map((publication) => {
      const link = publication.url
        ? `<a class="pub-link" href="${escapeHTML(publication.url)}" target="_blank" rel="noreferrer" aria-label="Open ${escapeHTML(publication.title)}">↗</a>`
        : `<span class="pub-link disabled" aria-hidden="true">·</span>`;
      const journalIndexing = publication.type === "journal" || publication.type === "advanced"
        ? `<div class="pub-indexing"><span>Venue indexing</span><strong>${escapeHTML(publication.indexing || "NR")}</strong></div>`
        : "";
      const metricItems = [];
      if (publication.type === "journal" || publication.type === "advanced") {
        metricItems.push(`<span class="pub-metric"><span>Quartile range</span><strong>${escapeHTML(publication.quartile || "NR")}</strong></span>`);
        metricItems.push(`<span class="pub-metric"><span>Impact factor</span><strong>${escapeHTML(publication.impactFactor || "NR")}</strong></span>`);
      }
      if (publication.type === "journal" || publication.type === "conference") {
        const scholarArticle = findScholarArticle(publication.title);
        const citationCount = scholarArticle ? scholarArticle.citations.toLocaleString("en-US") : "0";
        metricItems.push(`<span class="pub-metric pub-citation"><span>Citation count:</span><strong>${escapeHTML(citationCount)}</strong></span>`);
      }
      const publicationMetrics = metricItems.length
        ? `<div class="pub-metrics" aria-label="Publication metrics">${metricItems.join("")}</div>`
        : "";
      const statusClass = publication.status && /accepted/i.test(publication.status) ? " accepted" : "";
      return `<article class="publication-item">
        <div class="pub-meta"><span class="pub-year">${publication.year}</span><span class="pub-type">${typeLabels[publication.type]}</span></div>
        <div class="pub-main"><h3>${escapeHTML(publication.title)}</h3><p>${escapeHTML(publication.authors)}</p><p class="venue">${escapeHTML(publication.venue)}</p>${publication.status ? `<span class="pub-status${statusClass}">${escapeHTML(publication.status)}</span>` : ""}${journalIndexing}${publicationMetrics}</div>
        ${link}
      </article>`;
    }).join("");
    enableDepthCards(list);
  };

  typeFilters.forEach(button => button.addEventListener("click", () => {
    activeFilter = button.dataset.filter;
    typeFilters.forEach(candidate => {
      const selected = candidate === button;
      candidate.classList.toggle("active", selected);
      candidate.setAttribute("aria-pressed", String(selected));
    });
    updateFilterCounts();
    render();
  }));

  yearFilters.forEach(button => button.addEventListener("click", () => {
    activeYear = button.dataset.year;
    yearFilters.forEach(candidate => {
      const selected = candidate === button;
      candidate.classList.toggle("active", selected);
      candidate.setAttribute("aria-pressed", String(selected));
    });
    updateFilterCounts();
    render();
  }));

  search.addEventListener("input", render);

  const menuButton = document.querySelector(".menu-button");
  const nav = document.querySelector("#site-nav");
  menuButton.addEventListener("click", () => {
    const open = menuButton.getAttribute("aria-expanded") !== "true";
    menuButton.setAttribute("aria-expanded", String(open));
    nav.classList.toggle("open", open);
  });
  nav.querySelectorAll("a").forEach(link => link.addEventListener("click", () => {
    menuButton.setAttribute("aria-expanded", "false");
    nav.classList.remove("open");
  }));

  const navTargets = [...nav.querySelectorAll('a[href^="#"]')]
    .map(link => ({ link, target: document.querySelector(link.getAttribute("href")) }))
    .filter(item => item.target);
  let navTicking = false;
  const updateActiveNav = () => {
    const headerOffset = document.querySelector(".site-header").offsetHeight + 72;
    const position = window.scrollY + headerOffset;
    let current = null;
    navTargets.forEach(item => {
      if (item.target.offsetTop <= position) current = item;
    });
    navTargets.forEach(item => {
      const active = item === current;
      item.link.classList.toggle("active", active);
      if (active) item.link.setAttribute("aria-current", "location");
      else item.link.removeAttribute("aria-current");
    });
    const activeIndex = Math.max(0, navTargets.indexOf(current));
    const routeProgress = navTargets.length > 1 ? activeIndex / (navTargets.length - 1) : 0;
    nav.style.setProperty("--route-progress", routeProgress.toFixed(2));
    navTicking = false;
  };
  const queueActiveNavUpdate = () => {
    if (!navTicking) {
      navTicking = true;
      window.requestAnimationFrame(updateActiveNav);
    }
  };
  window.addEventListener("scroll", queueActiveNavUpdate, { passive: true });
  window.addEventListener("resize", queueActiveNavUpdate);

  const scrollToHash = (hash = window.location.hash) => {
    const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
    if (!hash || hash === "#top") {
      window.scrollTo({ top: 0, behavior });
      return;
    }
    const target = document.querySelector(hash);
    if (target) target.scrollIntoView({ behavior, block: "start" });
  };

  document.querySelectorAll('a[href^="#"]').forEach(link => link.addEventListener("click", event => {
    const hash = link.getAttribute("href");
    if (!hash || !document.querySelector(hash === "#top" ? "#top" : hash)) return;
    event.preventDefault();
    if (window.location.hash !== hash) history.pushState(null, "", hash);
    scrollToHash(hash);
  }));

  window.addEventListener("hashchange", () => scrollToHash());
  window.addEventListener("load", () => {
    if (window.location.hash) window.setTimeout(() => scrollToHash(), 80);
    updateActiveNav();
  });

  const revealObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08, rootMargin: "0px 0px -35px" });

  document.querySelectorAll(".reveal").forEach(element => revealObserver.observe(element));
  document.querySelector("#year").textContent = new Date().getFullYear();
  enableDepthCards();
  updateScholarMetrics();
  updateFilterCounts();
  render();
})();
