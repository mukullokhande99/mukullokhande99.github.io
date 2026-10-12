const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const vm = require("node:vm");
const rules = require("../publication-rules.js");
const { synchronize } = require("../scripts/check-publications.cjs");
const root = path.resolve(__dirname, "..");
const fixture = extra => ({ type: "conference", year: 2027, title: "Example paper", authors: "Mohd Faisal Khan, Vijay Pratap Sharma, Santosh Kumar Vishvakarma", venue: "Example Conference, Jan. 2027", ...extra });

test("verified name aliases use canonical abbreviations without changing unrelated people", () => {
  assert.equal(rules.canonicalizeAuthors(" Mohd. F. Khan, VIJAY  P SHARMA, Santosh Vishvakarma, Adam Teman, Ratko Pilipović "), "Mohd F. Khan, Vijay P. Sharma, Santosh K. Vishvakarma, Adam Teman, Ratko Pilipović");
  assert.equal(rules.canonicalizeAuthors("Vijay P. Sharma Jr., Other Khan"), "Vijay P. Sharma Jr., Other Khan");
  for (const type of ["conference", "journal", "advanced", "patent"]) {
    assert.equal(rules.normalizePublication(fixture({type})).authors, "Mohd F. Khan, Vijay P. Sharma, Santosh K. Vishvakarma");
  }
});

test("acceptance requires an explicit flag or accepted label", () => {
  assert.equal(rules.normalizePublication(fixture({accepted:true})).status, "[Accepted]");
  assert.equal(rules.normalizePublication(fixture({status:" accepted "})).status, "[Accepted]");
  assert.equal(rules.normalizePublication(fixture({status:"[ACCEPTED]"})).accepted, true);
  assert.equal(rules.normalizePublication(fixture({})).status, undefined);
  assert.equal(rules.normalizePublication(fixture({status:"Not accepted"})).status, "Not accepted");
});

test("recognized publication links suppress stale acceptance badges", () => {
  for (const url of ["https://ieeexplore.ieee.org/document/12345/", "https://ieeexplore.ieee.org/abstract/document/12345", "https://www.sciencedirect.com/science/article/pii/S0167926026002579", "https://doi.org/10.1109/TEST.2026.1"]) {
    const p = rules.normalizePublication(fixture({accepted:true,status:"[Accepted]",url}));
    assert.equal(p.status, undefined, url);
    assert.equal(p.url, url);
  }
  assert.equal(rules.normalizePublication(fixture({accepted:true,published:true,status:"[Accepted]",url:"https://other-publisher.example/article/1"})).status, undefined);
});

test("unrelated and malformed URLs do not remove acceptance", () => {
  for (const url of [undefined, "", "not a url", "https://arxiv.org/abs/1234.56789", "https://www.youtube.com/watch?v=test", "https://www.sciencedirect.com", "https://ieeexplore.ieee.org.evil.example/document/1234", "https://example.com/document/1234", "https://doi.org/not-a-doi"]) {
    assert.equal(rules.normalizePublication(fixture({accepted:true,url})).status, "[Accepted]", url);
  }
  assert.equal(rules.normalizePublication(fixture({type:"advanced",status:"Advanced revision",url:"https://doi.org/10.1234/example"})).status, "Advanced revision");
});

test("normalization preserves metadata and is idempotent", () => {
  const p = fixture({accepted:true,recordingUrl:"https://www.youtube.com/watch?v=test",indexing:"Scopus"});
  const n = rules.normalizePublication(p);
  assert.equal(n.title,p.title);
  assert.equal(n.recordingUrl,p.recordingUrl);
  assert.equal(n.indexing,p.indexing);
  assert.equal(p.status,undefined);
  assert.deepEqual(rules.normalizePublication(n),n);
  assert.throws(()=>rules.normalizePublications([p,{...p,title:" example   PAPER "}]),/duplicate title/);
  assert.throws(()=>rules.normalizePublications([fixture({authors:""})]),/missing authors/);
  assert.throws(()=>rules.normalizePublications([fixture({accepted:"true"})]),/must be true or false/);
  assert.throws(()=>rules.normalizePublications([fixture({year:"2027"})]),/invalid year/);
});

test("source correction updates names, badges, totals, new years, and cache versions", () => {
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),"publication-check-"));
  try {
    for(const file of ["index.html","index.js","publication-rules.js"]) fs.copyFileSync(path.join(root,file),path.join(dir,file));
    const input=[fixture({accepted:true}),fixture({title:"Published paper",year:2028,status:"[Accepted]",url:"https://ieeexplore.ieee.org/document/12345"})];
    fs.writeFileSync(path.join(dir,"publications.js"),"window.PUBLICATIONS = "+JSON.stringify(input)+";\n");
    const original=fs.readFileSync(path.join(dir,"publications.js"),"utf8");
    assert.ok(synchronize(dir).changed.includes("publications.js"));
    assert.equal(fs.readFileSync(path.join(dir,"publications.js"),"utf8"),original);
    const result=synchronize(dir,true);
    assert.equal(result.totals.all,2);
    const c={window:{}};
    vm.runInNewContext(fs.readFileSync(path.join(dir,"publications.js"),"utf8"),c);
    assert.equal(c.window.PUBLICATIONS[0].status,"[Accepted]");
    assert.equal(c.window.PUBLICATIONS[1].status,undefined);
    assert.equal(c.window.PUBLICATIONS[0].authors,"Mohd F. Khan, Vijay P. Sharma, Santosh K. Vishvakarma");
    const html=fs.readFileSync(path.join(dir,"index.html"),"utf8");
    assert.match(html,/id="paper-breakdown">0 journals · 2 conferences/);
    assert.match(html,/data-year="2028"[^>]*>2028 <span>1<\/span>/);
    assert.match(html,/id="hero-publication-total"[^>]*>2</);
    assert.match(html,/publications\.js\?v=[a-f0-9]{12}/);
    assert.deepEqual(synchronize(dir).changed,[]);
    const previousHash=html.match(/publications\.js\?v=([a-f0-9]+)/)[1];
    c.window.PUBLICATIONS[0].title="Updated paper";
    fs.writeFileSync(path.join(dir,"publications.js"),"window.PUBLICATIONS = "+JSON.stringify(c.window.PUBLICATIONS)+";\n");
    synchronize(dir,true);
    assert.notEqual(fs.readFileSync(path.join(dir,"index.html"),"utf8").match(/publications\.js\?v=([a-f0-9]+)/)[1],previousHash);
  } finally { fs.rmSync(dir,{recursive:true,force:true}); }
});

test("browser rendering uses the same correction rules and emits acceptance badges", () => {
  const c={URL};
  c.window=c;
  vm.createContext(c);
  vm.runInContext(fs.readFileSync(path.join(root,"publication-rules.js"),"utf8"),c);
  vm.runInContext(fs.readFileSync(path.join(root,"publications.js"),"utf8"),c);
  const prime=c.PUBLICATIONS.find(p=>p.title.startsWith("PRIME:"));
  prime.authors="Mohd Faisal Khan, Vijay Pratap Sharma, Santosh Kumar Vishvakarma";
  prime.accepted=true;
  delete prime.status;
  c.PUBLICATIONS.find(p=>p.title.startsWith("FALCON-XR:")).status="[Accepted]";
  const js=fs.readFileSync(path.join(root,"index.js"),"utf8");
  // Exercise the site's actual data initialization and card renderer.
  const initialization=js.slice(js.indexOf('  const publications ='),js.indexOf('  const list ='));
  Object.assign(c,{activeFilter:"conference",activeYear:"all",search:{value:"PRIME:"},count:{},empty:{},list:{innerHTML:""},typeLabels:{conference:"Conference"},findScholarArticle:()=>null,enableDepthCards:()=>{}});
  const rendering=js.slice(js.indexOf('  const escapeHTML ='),js.indexOf('  const collaboratorProfiles ='))+js.slice(js.indexOf('  const render ='),js.indexOf('  typeFilters.forEach(button => button.addEventListener'));
  vm.runInContext(initialization+rendering+'render();',c);
  assert.equal(c.count.textContent,"1 work");
  assert.match(c.list.innerHTML,/<span class="pub-status accepted">\[Accepted\]<\/span>/);
  assert.ok(c.list.innerHTML.includes("Mohd F. Khan, Vijay P. Sharma, Santosh K. Vishvakarma"));
  c.search.value="VALQER:";
  vm.runInContext('render();',c);
  assert.equal(c.count.textContent,"1 work");
  assert.match(c.list.innerHTML,/<span class="pub-status accepted">\[Accepted\]<\/span>/);
  c.activeFilter="journal";c.activeYear="all";c.search.value="FALCON-XR";
  vm.runInContext('render();',c);
  assert.doesNotMatch(c.list.innerHTML,/pub-status/);
});
