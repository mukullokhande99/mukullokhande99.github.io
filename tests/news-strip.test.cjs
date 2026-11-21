const test = require("node:test");
const assert = require("node:assert/strict");
const {
  parseDay, dateInIndia, expiryExclusive, recentAcceptances, citationPlainText
} = require("../news-strip.js");
const paper = (title, acceptanceDate, type = "journal") => ({
  title, type, acceptanceDate, venue: "Example Venue", authors: "Author A, Author B"
});
const titles = (papers, date) => recentAcceptances(papers, date).map(p => p.title);

test("all October acceptance days remain visible through November 30", () => {
  const papers = [paper("Oct 1", "2026-10-01"), paper("Oct 31", "2026-10-31")];
  assert.deepEqual(titles(papers, "2026-10-01"), ["Oct 1"]);
  assert.deepEqual(titles(papers, "2026-10-31"), ["Oct 31", "Oct 1"]);
  assert.deepEqual(titles(papers, "2026-11-30"), ["Oct 31", "Oct 1"]);
  assert.deepEqual(titles(papers, "2026-12-01"), []);
  assert.equal(expiryExclusive("2026-10-01"), "2026-12-01");
  assert.equal(expiryExclusive("2026-10-31"), "2026-12-01");
});

test("all November acceptances stay through December 31, then expire January 1", () => {
  const papers = [paper("RM-DPU", "2026-11-05"), paper("CORVET", "2026-11-20")];
  assert.deepEqual(titles(papers, "2026-11-04"), []);
  assert.deepEqual(titles(papers, "2026-11-21"), ["CORVET", "RM-DPU"]);
  assert.deepEqual(titles(papers, "2026-12-31"), ["CORVET", "RM-DPU"]);
  assert.deepEqual(titles(papers, "2027-01-01"), []);
});

test("December to January and January to February transitions", () => {
  assert.equal(expiryExclusive("2026-12-31"), "2027-02-01");
  assert.equal(expiryExclusive("2026-01-31"), "2026-03-01");
  assert.equal(expiryExclusive("2024-01-31"), "2024-03-01");
  assert.deepEqual(titles([paper("December", "2026-12-01")], "2027-01-31"), ["December"]);
  assert.deepEqual(titles([paper("December", "2026-12-01")], "2027-02-01"), []);
  assert.deepEqual(titles([paper("January", "2024-01-31")], "2024-02-29"), ["January"]);
});

test("exclude future, undated, invalid, and non-paper entries", () => {
  const papers = [
    paper("Future", "2026-12-01"),
    paper("Invalid", "2026-02-30"),
    paper("Missing", undefined),
    paper("Advanced", "2026-11-20", "advanced")
  ];
  assert.deepEqual(titles(papers, "2026-11-21"), []);
  assert.equal(parseDay("2026-02-30"), null);
});

test("published papers remain eligible if acceptanceDate is recorded", () => {
  const papers = [{...paper("RM-DPU", "2026-11-05"), published: true, url: "https://ieeexplore.ieee.org/document/11783159"}];
  assert.deepEqual(titles(papers, "2026-12-31"), ["RM-DPU"]);
});

test("RM-DPU uses complete exact citation format", () => {
  const rm = {
    title: "RM-DPU: Resource-Multiplexed Digital Processing-in-Memory Unit for Edge-AI Workloads",
    authors: "Mukul Lokhande, Akash Sankhe, Santosh K. Vishvakarma",
    venue: "IEEE Transactions on Nanotechnology, Nov. 2026",
    newsAuthors: "Mukul Lokhande, Akash Sankhe, and Santosh Kumar Vishvakarma",
    newsVenue: "IEEE Transactions on Nanotechnology (TNANO), Nov. 2026"
  };
  assert.equal(citationPlainText(rm),
    'Mukul Lokhande, Akash Sankhe, and Santosh Kumar Vishvakarma, "RM-DPU: Resource-Multiplexed Digital Processing-in-Memory Unit for Edge-AI Workloads", IEEE Transactions on Nanotechnology (TNANO), Nov. 2026.');
});

test("month boundaries are evaluated in India time", () => {
  assert.equal(dateInIndia(new Date("2026-11-30T18:30:00.000Z")), "2026-12-01");
});
