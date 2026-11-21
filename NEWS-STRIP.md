# Automated News & Updates — acceptance ticker

The homepage ticker reads `window.PUBLICATIONS` in [publications.js](publications.js). **No edits to the ticker markup are needed** when a paper is accepted.

## To add an accepted paper

Create or update a journal/conference record in `publications.js` and add the exact acceptance date as `YYYY-MM-DD`, for example:

```js
{
  "type": "conference",
  "year": 2027,
  "title": "Example paper title",
  "authors": "Author A, Author B",
  "venue": "Example Conference, Jan. 2027",
  "accepted": true,
  "status": "[Accepted]",
  "acceptanceDate": "2026-11-20"
}
```

Only enter an acceptance date from a genuine acceptance notice. **Do not use the conference event date or publication issue date as an acceptance date.** An existing published paper with an explicit `acceptanceDate` also qualifies, even if it no longer has an `[Accepted]` badge.

## Visibility rule

- All papers with valid acceptance dates that are in the **current or previous calendar month** are considered.
- Each announcement is shown from its acceptance day up to, but **not including**, its one-calendar-month anniversary.
- Announcements are sorted newest-first and every eligible paper is shown, not just the latest one.
- Dates follow `Asia/Kolkata` for consistent display across visitors.
- If no papers qualify, the ticker shows a static link to the complete Publications archive.
- The displayed set is recalculated when a page loads, when it regains focus, and every 5 minutes in an open tab. The publications archive itself never loses entries.
- A publication without `acceptanceDate` will **not** be announced, because its expiry cannot be calculated accurately.
- End-of-month handling is calendar-based: e.g. January 31 expires on February 28 (or 29 in a leap year).

## Tests

Run `node --test tests/news-strip.test.cjs` to check expiration, sorting, month and year transitions, invalid and missing dates, and published journal records.

The source of truth is `publications.js`; this is **automatic display and expiration**, not automatic discovery of acceptance notices from publishers or email.
