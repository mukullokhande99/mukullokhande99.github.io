(() => {
  const publications = window.PUBLICATIONS || [];
  const list = document.querySelector("#publication-list");
  const search = document.querySelector("#publication-search");
  const count = document.querySelector("#result-count");
  const empty = document.querySelector("#empty-state");
  const typeFilters = [...document.querySelectorAll(".type-filter")];
  const yearFilters = [...document.querySelectorAll(".year-filter")];
  const typeLabels = { journal: "Journal", conference: "Conference", patent: "Patent", advanced: "Advanced stage" };
  let activeFilter = "all";
  let activeYear = "all";

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

  const render = () => {
    const query = search.value.trim().toLowerCase();
    const matches = publications.filter(publication => {
      const isType = activeFilter === "all" ? publication.type !== "advanced" : publication.type === activeFilter;
      const isYear = activeYear === "all" || publication.year === Number(activeYear);
      const haystack = [publication.title, publication.authors, publication.venue, publication.year, publication.status, publication.indexing, publication.quartile, publication.impactFactor].join(" ").toLowerCase();
      return isType && isYear && haystack.includes(query);
    });

    count.textContent = `${matches.length} ${matches.length === 1 ? "work" : "works"}`;
    empty.hidden = matches.length !== 0;
    list.innerHTML = matches.map((publication) => {
      const link = publication.url
        ? `<a class="pub-link" href="${escapeHTML(publication.url)}" target="_blank" rel="noreferrer" aria-label="Open ${escapeHTML(publication.title)}">↗</a>`
        : `<span class="pub-link disabled" aria-hidden="true">·</span>`;
      const journalIndexing = publication.type === "journal" || publication.type === "advanced"
        ? `<div class="pub-indexing"><span>${publication.type === "advanced" ? "Target venue indexing" : "Venue indexing"}</span><strong>${escapeHTML(publication.indexing || "NR")}</strong></div>`
        : "";
      const journalMetrics = publication.type === "journal" || publication.type === "advanced"
        ? `<div class="pub-metrics" aria-label="${publication.type === "advanced" ? "Target venue metrics" : "Journal metrics"}"><span class="pub-metric"><span>Quartile range</span><strong>${escapeHTML(publication.quartile || "NR")}</strong></span><span class="pub-metric"><span>Impact factor</span><strong>${escapeHTML(publication.impactFactor || "NR")}</strong></span></div>`
        : "";
      const statusClass = publication.status && /accepted/i.test(publication.status) ? " accepted" : "";
      return `<article class="publication-item">
        <div class="pub-meta"><span class="pub-year">${publication.year}</span><span class="pub-type">${typeLabels[publication.type]}</span></div>
        <div class="pub-main"><h3>${escapeHTML(publication.title)}</h3><p>${escapeHTML(publication.authors)}</p><p class="venue">${escapeHTML(publication.venue)}</p>${publication.status ? `<span class="pub-status${statusClass}">${escapeHTML(publication.status)}</span>` : ""}${journalIndexing}${journalMetrics}</div>
        ${link}
      </article>`;
    }).join("");
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
  updateFilterCounts();
  render();
})();
