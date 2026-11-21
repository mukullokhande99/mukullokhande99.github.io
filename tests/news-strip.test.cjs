const test = require("node:test");
const assert = require("node:assert/strict");
const { parseDay, addCalendarMonth, formatDay, recentAcceptances } = require("../news-strip.js");
const paper = (title, acceptanceDate, type = "journal") => ({title, type, acceptanceDate, venue: "Example venue"});
const titles = (papers, today) => recentAcceptances(papers, today).map(x => x.title);

test("November acceptance appears immediately and expires on its December anniversary", () => {
  const items = [paper("CORVET", "2026-11-20")];
  assert.deepEqual(titles(items, "2026-11-19"), []);
  assert.deepEqual(titles(items, "2026-11-20"), ["CORVET"]);
  assert.deepEqual(titles(items, "2026-12-19"), ["CORVET"]);
  assert.deepEqual(titles(items, "2026-12-20"), []);
});

test("second acceptance has its own independent expiration", () => {
  const items = [paper("RM-DPU", "2026-11-05"), paper("CORVET", "2026-11-20")];
  assert.deepEqual(titles(items, "2026-11-21"), ["CORVET", "RM-DPU"]);
  assert.deepEqual(titles(items, "2026-12-05"), ["CORVET"]);
});

test("an October acceptance can remain visible into November, but not forever", () => {
  const items = [paper("October paper", "2026-10-25", "conference")];
  assert.deepEqual(titles(items, "2026-11-21"), ["October paper"]);
  assert.deepEqual(titles(items, "2026-11-25"), []);
});

test("end-of-month dates clamp to the final day of the following month", () => {
  assert.equal(formatDay(addCalendarMonth(parseDay("2026-01-31"))), "2026-02-28");
  assert.equal(formatDay(addCalendarMonth(parseDay("2024-01-31"))), "2024-02-29");
  assert.equal(formatDay(addCalendarMonth(parseDay("2026-12-31"))), "2027-01-31");
});

test("January transition and leap-year expiration are calendar correct", () => {
  assert.deepEqual(titles([paper("Year-end", "2026-12-31")], "2027-01-30"), ["Year-end"]);
  assert.deepEqual(titles([paper("Year-end", "2026-12-31")], "2027-01-31"), []);
  assert.deepEqual(titles([paper("Leap", "2024-01-31")], "2024-02-28"), ["Leap"]);
  assert.deepEqual(titles([paper("Leap", "2024-01-31")], "2024-02-29"), []);
});

test("dated published papers are included even without an accepted status flag", () => {
  const items = [{...paper("RM-DPU", "2026-11-05"), url: "https://ieeexplore.ieee.org/document/11783159"}];
  assert.deepEqual(titles(items, "2026-11-21"), ["RM-DPU"]);
});

test("undated and invalidly dated records are excluded, not guessed", () => {
  const items = [
    {type:"conference", title:"No date", accepted:true, year:2027, venue:"January event"},
    paper("Invalid day", "2026-02-30"),
    paper("Wrong format", "05-11-2026"),
    paper("Advanced", "2026-11-20", "advanced")
  ];
  assert.deepEqual(titles(items, "2026-11-21"), []);
});

test("paper ticker shows authors, quoted title, and venue as a full citation", () => {
  const { citationPlainText } = require("../news-strip.js");
  assert.equal(
    citationPlainText({
      title: "RM-DPU: Resource-Multiplexed Digital Processing-in-Memory Unit for Edge-AI Workloads",
      authors: "Mukul Lokhande, Akash Sankhe, Santosh K. Vishvakarma",
      venue: "IEEE Transactions on Nanotechnology, Nov. 2026",
      newsAuthors: "Mukul Lokhande, Akash Sankhe, and Santosh Kumar Vishvakarma",
      newsVenue: "IEEE Transactions on Nanotechnology (TNANO), Nov. 2026"
    }),
    'Mukul Lokhande, Akash Sankhe, and Santosh Kumar Vishvakarma, "RM-DPU: Resource-Multiplexed Digital Processing-in-Memory Unit for Edge-AI Workloads", IEEE Transactions on Nanotechnology (TNANO), Nov. 2026.'
  );
});

test("default citation formats additional accepted papers without custom overrides", () => {
  const { citationPlainText } = require("../news-strip.js");
  assert.equal(
    citationPlainText({ authors: "Author A, Author B, Author C", title: "Example", venue: "IEEE Journal." }),
    'Author A, Author B, and Author C, "Example", IEEE Journal.'
  );
});
