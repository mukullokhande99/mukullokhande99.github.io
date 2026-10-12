# Publication formatting and status rules

The website and GitHub checker share `publication-rules.js`.

The canonical website names are Mohd F. Khan, Vijay P. Sharma, and Santosh K.
Vishvakarma. Their full names and verified variants are converted to these
abbreviations in all author lists, including patents and advanced revisions.
Other authors are preserved. In `authorGroups`, the first name is the canonical
form; the remaining names are recognized aliases.

For an accepted journal or conference paper, set `accepted: true` in
`publications.js`. The website supplies `[Accepted]` automatically. Existing
`status: "[Accepted]"` entries are also supported and converted to this flag.
An entry without a link is not assumed to be accepted.

Adding an IEEE document, ScienceDirect article, or DOI link removes the
acceptance badge automatically. This checks the URL format, not the remote
publication page. Personal websites, preprints, videos, and generic publisher
homepages do not remove the badge. For another verified publisher, set
`published: true` or extend `isPublishedLink`. Advanced-revision status text
is preserved.

On a relevant push to `master`, GitHub runs regression checks, corrects author
names and status labels, updates publication totals and year filters, and
refreshes script versions using their content hashes. Corrections are committed
by `github-actions[bot]` and explicitly request a Pages rebuild. Pull requests
are checked without automatic writes. The workflow can also be run manually.

Local commands (Node 24, no third-party dependencies):

```sh
node --test tests/publication-rules.test.cjs
node scripts/check-publications.cjs --write
node scripts/check-publications.cjs
```
