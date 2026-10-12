(function (root, factory) {
  const rules = factory();
  if (typeof module === "object" && module.exports) module.exports = rules;
  else root.PublicationRules = rules;
})(typeof globalThis === "object" ? globalThis : this, function () {
  "use strict";

  // The first name is the canonical website form. Add only verified aliases.
  const authorGroups = [
    ["Mohd F. Khan", "Mohd Faisal Khan", "Mohd. F. Khan", "Mohd. Faisal Khan"],
    ["Vijay P. Sharma", "Vijay Pratap Sharma"],
    ["Santosh K. Vishvakarma", "Santosh Kumar Vishvakarma", "Santosh Vishvakarma"],
    ["Mohd S. Mansoori", "Mohd. S. Mansoori"]
  ];
  const authorKey = name => name.normalize("NFKC").replace(/\./g, "").replace(/\s+/g, " ").trim().toLowerCase();
  const authorAliases = new Map(authorGroups.flatMap(group => group.map(name => [authorKey(name), group[0]])));
  const nameParticles = new Set(["van", "von", "de", "del", "da", "di", "dos", "bin", "bint", "al", "el"]);
  const canonicalizeAuthor = name => {
    const cleaned = name.replace(/\s+/g, " ").trim();
    const known = authorAliases.get(authorKey(cleaned));
    if (known) return known;
    const parts = cleaned.split(" ");
    if (parts.length !== 3) return cleaned;
    // Honorifics, suffixes, and surname particles are not middle names.
    if (/^(Mr|Mrs|Ms|Dr|Prof)\.?$/i.test(parts[0]) || /^(Jr|Sr|II|III|IV)\.?$/i.test(parts[2])) return cleaned;
    if (nameParticles.has(parts[1].toLowerCase())) return cleaned;
    if (!/^\p{L}[\p{L}'’\-]*\.?$/u.test(parts[1])) return cleaned;
    const initial = Array.from(parts[1])[0].toUpperCase();
    return `${parts[0]} ${initial}. ${parts[2]}`;
  };
  const canonicalizeAuthors = authors => String(authors).split(",").map(canonicalizeAuthor).join(", ");

  // A personal page, preprint, recording, or generic publisher homepage is
  // not evidence of publication. Check both the exact hostname and path.
  const isPublishedLink = value => {
    try {
      const url = new URL(value);
      if (url.protocol !== "https:" && url.protocol !== "http:") return false;
      const host = url.hostname.toLowerCase();
      const path = url.pathname;
      if (host === "doi.org" || host === "dx.doi.org") return /^\/10\.\d{4,9}\/\S+/i.test(path);
      if (host === "ieeexplore.ieee.org") return /^\/(?:abstract\/)?document\/\d+(?:\/|$)/.test(path);
      if (host === "sciencedirect.com" || host === "www.sciencedirect.com") return /^\/science\/article\/(?:pii|abs\/pii)\/[a-z0-9]+(?:\/|$)/i.test(path);
      return false;
    } catch (_error) {
      return false;
    }
  };

  const normalizePublication = publication => {
    const result = { ...publication, authors: canonicalizeAuthors(publication.authors) };
    if (result.type !== "journal" && result.type !== "conference") return result;
    const acceptedLabel = /^\[?\s*accepted\s*\]?$/i.test(String(result.status || "").trim());
    const accepted = result.accepted === true || acceptedLabel;
    if (accepted) result.accepted = true;
    const published = result.published === true || isPublishedLink(result.url);
    if (published) {
      if (acceptedLabel) delete result.status;
    } else if (accepted) {
      result.status = "[Accepted]";
    }
    return result;
  };

  const normalizePublications = publications => {
    if (!Array.isArray(publications)) throw new Error("PUBLICATIONS must be an array.");
    const seen = new Set();
    return publications.map((publication, index) => {
      const label = `Publication ${index + 1}`;
      if (!publication || !["journal", "conference", "advanced", "patent"].includes(publication.type)) throw new Error(`${label}: invalid type.`);
      if (!Number.isInteger(publication.year) || publication.year < 1900 || publication.year > 2200) throw new Error(`${label}: invalid year.`);
      for (const field of ["title", "authors", "venue"]) {
        if (typeof publication[field] !== "string" || !publication[field].trim()) throw new Error(`${label}: missing ${field}.`);
      }
      for (const field of ["accepted", "published"]) {
        if (publication[field] !== undefined && typeof publication[field] !== "boolean") throw new Error(`${label}: ${field} must be true or false.`);
      }
      const key = publication.title.trim().toLowerCase().replace(/\s+/g, " ");
      if (seen.has(key)) throw new Error(`${label}: duplicate title ${publication.title}.`);
      seen.add(key);
      return normalizePublication(publication);
    });
  };

  return { canonicalizeAuthors, isPublishedLink, normalizePublication, normalizePublications };
});
