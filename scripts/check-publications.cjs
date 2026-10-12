const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const crypto = require("node:crypto");
const rules = require("../publication-rules.js");

function synchronize(root, write = false) {
  const read = file => fs.readFileSync(path.join(root, file), "utf8");
  const original = read("publications.js");
  const context = { window: {} };
  vm.runInNewContext(original, context, { timeout: 1000, filename: "publications.js" });
  const publications = rules.normalizePublications(context.window.PUBLICATIONS);
  const normalized = JSON.stringify(publications) === JSON.stringify(context.window.PUBLICATIONS)
    ? original
    : `window.PUBLICATIONS = [\n${publications.map(p => "  " + JSON.stringify(p)).join(",\n")}\n];\n`;
  const totals = { all: publications.length, journal: 0, conference: 0, advanced: 0, patent: 0 };
  const years = {};
  publications.forEach(p => { totals[p.type]++; years[p.year] = (years[p.year] || 0) + 1; });
  let html = read("index.html");
  const setText = (id, value) => {
    const pattern = new RegExp(`(<([a-z]+)\\b[^>]*\\bid="${id}"[^>]*>)[^<]*(</\\2>)`, "i");
    if (!pattern.test(html)) throw new Error(`Missing count element: ${id}`);
    html = html.replace(pattern, (_match, open, _tag, close) => open + value + close);
  };
  setText("hero-publication-total", totals.all);
  setText("paper-total", totals.journal + totals.conference);
  setText("paper-breakdown", `${totals.journal} journals · ${totals.conference} conferences`);
  setText("patent-total", totals.patent);
  setText("result-count", `${totals.all} ${totals.all === 1 ? "work" : "works"}`);
  for (const [type, total] of Object.entries(totals)) {
    const pattern = new RegExp(`(data-filter="${type}"[^>]*>[^<]*<span>)\\d+(</span>)`);
    if (!pattern.test(html)) throw new Error(`Missing type filter: ${type}`);
    html = html.replace(pattern, (_m, open, close) => open + total + close);
  }
  const yearGroup = /(<div class="filter-group year-filter-group"[^>]*>)[\s\S]*?(<\/div>)/;
  if (!yearGroup.test(html)) throw new Error("Missing year filters.");
  const yearButtons = `<button class="filter year-filter active" type="button" data-year="all" aria-pressed="true">All years <span>${totals.all}</span></button>`
    + Object.keys(years).sort((a, b) => Number(b) - Number(a)).map(year => `<button class="filter year-filter" type="button" data-year="${year}" aria-pressed="false">${year} <span>${years[year]}</span></button>`).join("");
  html = html.replace(yearGroup, (_m, open, close) => open + yearButtons + close);

  const files = { "publications.js": normalized, "publication-rules.js": read("publication-rules.js"), "index.js": read("index.js") };
  for (const [file, content] of Object.entries(files)) {
    const hash = crypto.createHash("sha256").update(content).digest("hex").slice(0, 12);
    const escaped = file.replace(/\./g, "\\.");
    const pattern = new RegExp(`(<script\\s+src=")${escaped}(?:\\?[^\"]*)?(\")`);
    if (!pattern.test(html)) throw new Error(`Missing script: ${file}`);
    html = html.replace(pattern, (_m, open, close) => `${open}${file}?v=${hash}${close}`);
  }
  const candidates = { "publications.js": normalized, "index.html": html };
  const changed = Object.entries(candidates).filter(([file, content]) => read(file) !== content);
  if (write) changed.forEach(([file, content]) => fs.writeFileSync(path.join(root, file), content));
  return { changed: changed.map(([file]) => file), totals, years };
}

if (require.main === module) {
  try {
    const write = process.argv.includes("--write");
    const result = synchronize(path.resolve(__dirname, ".."), write);
    console.log(JSON.stringify(result, null, 2));
    if (result.changed.length && !write) {
      console.error("Run node scripts/check-publications.cjs --write to apply corrections.");
      process.exitCode = 1;
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
module.exports = { synchronize };
