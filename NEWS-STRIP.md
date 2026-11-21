# News & Updates — publication announcements

The homepage shows **one entire publication citation at a time** in the space next to Site visits; it is NOT a horizontally scrolling text marquee. Authors, quoted paper title, and italic venue are fully wrapped without truncation.

When multiple accepted papers are eligible, the panel automatically rotates to the next paper every 12 seconds, with Previous, Next, and Pause/Resume controls. Automatic rotation pauses when hovered or keyboard-focused, when the tab is hidden, and for visitors requesting reduced motion. When no eligible paper exists, it displays a static link to the full Publications archive.

## Date policy (Asia/Kolkata)

Each paper is shown starting from its actual acceptance date until **the end of the entire calendar month after acceptance**:

- Any October acceptance (Oct. 1 or Oct. 31) remains visible **through November 30**; disappears December 1.
- Any November acceptance remains visible **through December 31**; disappears January 1.
- Any December acceptance remains visible **through January 31**; disappears February 1.
- Works accepted in the future never show prematurely.

In the implementation, `expiryExclusive` returns the first day of the month after the following month. Thus papers accepted in the current and immediately preceding month appear together, and no day-of-month anniversary is used.

## Adding papers

The source of truth is `publications.js`. Add an exact, verified acceptance date:

```js
{
  "type": "journal",
  "year": 2026,
  "title": "An example paper",
  "authors": "Author A, Author B",
  "venue": "IEEE Example Journal, Nov. 2026",
  "accepted": true,
  "acceptanceDate": "2026-11-05"
}
```

Records without `acceptanceDate` are excluded from the news rotation, since neither publication issue dates nor conference event dates establish acceptance dates. Existing published papers with a verified `acceptanceDate` remain eligible.

Optional `newsAuthors` and `newsVenue` fields override **only the announcement's bibliographic format** without changing the permanent Publications list. RM-DPU uses them to display:

> Mukul Lokhande, Akash Sankhe, and Santosh Kumar Vishvakarma, "RM-DPU: Resource-Multiplexed Digital Processing-in-Memory Unit for Edge-AI Workloads", *IEEE Transactions on Nanotechnology (TNANO), Nov. 2026*.

Papers remain in the permanent Publications archive after the announcement expires. The ticker recalculates each time the page loads or the tab regains focus and while an open tab rotates. No publisher crawling or background service is required.

Run `node --test tests/news-strip.test.cjs` for date and formatting regression coverage.
