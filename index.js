(() => {
  const publications = window.PUBLICATIONS || [];
  const list = document.querySelector("#publication-list");
  const search = document.querySelector("#publication-search");
  const count = document.querySelector("#result-count");
  const empty = document.querySelector("#empty-state");
  const filters = [...document.querySelectorAll(".filter")];
  const typeLabels = { journal: "Journal", conference: "Conference", patent: "Patent", advanced: "Advanced stage" };
  let activeFilter = "all";

  const escapeHTML = (value = "") => value.replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  })[character]);

  const render = () => {
    const query = search.value.trim().toLowerCase();
    const matches = publications.filter(publication => {
      const isType = activeFilter === "all" || publication.type === activeFilter;
      const haystack = [publication.title, publication.authors, publication.venue, publication.year, publication.status].join(" ").toLowerCase();
      return isType && haystack.includes(query);
    });

    count.textContent = `${matches.length} ${matches.length === 1 ? "work" : "works"}`;
    empty.hidden = matches.length !== 0;
    list.innerHTML = matches.map((publication) => {
      const link = publication.url
        ? `<a class="pub-link" href="${escapeHTML(publication.url)}" target="_blank" rel="noreferrer" aria-label="Open ${escapeHTML(publication.title)}">↗</a>`
        : `<span class="pub-link disabled" aria-hidden="true">·</span>`;
      return `<article class="publication-item">
        <div class="pub-meta"><span class="pub-year">${publication.year}</span><span class="pub-type">${typeLabels[publication.type]}</span></div>
        <div class="pub-main"><h3>${escapeHTML(publication.title)}</h3><p>${escapeHTML(publication.authors)}</p><p class="venue">${escapeHTML(publication.venue)}</p>${publication.status ? `<span class="pub-status">${escapeHTML(publication.status)}</span>` : ""}</div>
        ${link}
      </article>`;
    }).join("");
  };

  filters.forEach(button => button.addEventListener("click", () => {
    activeFilter = button.dataset.filter;
    filters.forEach(candidate => {
      const selected = candidate === button;
      candidate.classList.toggle("active", selected);
      candidate.setAttribute("aria-pressed", String(selected));
    });
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
  render();
})();
