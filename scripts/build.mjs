// Builds the static documentation site into html/.
//
//   node scripts/build.mjs
//
// Output:
//   html/index.html              redirects to the latest version
//   html/versions.json
//   html/assets/
//   html/v<version>/...

import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { esc, highlight } from "./lib/highlight.mjs";
import { inline, renderMarkdown, slugify } from "./lib/markdown.mjs";
import { page, SITE, logo } from "./lib/layout.mjs";

const here = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outRoot = join(here, "html");

const cmpVer = (a, b) => {
  const pa = a.split(/[.-]/).map((x) => (isNaN(+x) ? x : +x));
  const pb = b.split(/[.-]/).map((x) => (isNaN(+x) ? x : +x));
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    if (pa[i] === pb[i]) continue;
    if (pa[i] === undefined) return -1;
    if (pb[i] === undefined) return 1;
    return pa[i] < pb[i] ? -1 : 1;
  }
  return 0;
};

const versions = readdirSync(join(here, "versions"))
  .filter((v) => existsSync(join(here, "versions", v, "meta.json")))
  .sort(cmpVer)
  .reverse();
const latest = versions[0];

const anchor = (name) => name.replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "");

const GROUPS = [
  ["Core", ["series", "dataframe"]],
  ["Operations", ["functions", "groupby"]],
  ["IO and utilities", ["io", "offsets", "testing"]],
];

rmSync(outRoot, { recursive: true, force: true });
mkdirSync(join(outRoot, "assets"), { recursive: true });
cpSync(join(here, "site/assets"), join(outRoot, "assets"), { recursive: true });

const allPages = {};
const built = [];
for (const version of versions) built.push(await loadVersion(version));
for (const v of built) allPages[v.version] = v.pages.map((p) => p.path);
for (const v of built) writeVersion(v);

writeFileSync(join(outRoot, "versions.json"), JSON.stringify({ latest, versions }, null, 1) + "\n");
writeFileSync(join(outRoot, "index.html"), redirectPage(`v${latest}/index.html`));
writeFileSync(join(outRoot, "latest.html"), redirectPage(`v${latest}/index.html`));
writeFileSync(join(outRoot, "404.html"), notFound());
writeFileSync(join(outRoot, "robots.txt"), "User-agent: *\nAllow: /\n");
writeFileSync(join(outRoot, ".nojekyll"), "");
console.log(`html/: ${built.map((v) => `v${v.version} (${v.pages.length} pages)`).join(", ")}; latest v${latest}`);

// ---------------------------------------------------------------------------

async function loadVersion(version) {
  const dir = join(here, "versions", version);
  const meta = JSON.parse(readFileSync(join(dir, "meta.json"), "utf8"));
  const { categories } = await import(pathToFileURL(join(dir, "api.mjs")).href);
  const guideOrder = JSON.parse(readFileSync(join(dir, "guides/nav.json"), "utf8"));
  const compat = readFileSync(join(dir, "COMPATIBILITY.md"), "utf8");
  const changelog = readFileSync(join(here, "site/changelog.md"), "utf8");

  const entryLoc = new Map();
  for (const c of categories) {
    for (const e of c.entries) {
      entryLoc.set(e.name, { cat: c, entry: e, href: `reference/${c.id}.html#${anchor(e.name)}` });
    }
  }

  const pages = [];
  return { version, meta, categories, guideOrder, compat, changelog, entryLoc, pages };
}

function fillTokens(text, V) {
  const m = V.meta;
  return text
    .replace(/\{\{version\}\}/g, m.version)
    .replace(/\{\{package\}\}/g, m.package)
    .replace(/\{\{date\}\}/g, m.date)
    .replace(/\{\{node\}\}/g, m.node)
    .replace(/\{\{pandas\}\}/g, m.pandas ?? "2.2.3")
    .replace(/\{\{coverage\}\}/g, `~${m.coverage.coverage}%`)
    .replace(/\{\{series_methods\}\}/g, String(m.coverage.implemented_series))
    .replace(/\{\{df_methods\}\}/g, String(m.coverage.implemented_dataframe));
}

function writeVersion(V) {
  const vDir = join(outRoot, `v${V.version}`);
  mkdirSync(join(vDir, "guides"), { recursive: true });
  mkdirSync(join(vDir, "reference"), { recursive: true });

  const ver = { version: V.version, latest, versions };

  const guidesSidebar = buildGuidesSidebar(V, "guides/");
  const refSidebar = buildRefSidebar(V, "reference/");

  // Guide pages
  for (const section of V.guideOrder) {
    for (const g of section.pages) {
      const mdPath = join(here, "versions", V.version, "guides", `${g.file}.md`);
      if (!existsSync(mdPath)) continue;
      const md = readFileSync(mdPath, "utf8");
      const link = (href) => resolveLink(href, `guides/${g.file}.html`, V);
      const r = renderMarkdown(fillTokens(md, V), { link });
      const html = page({
        title: g.title,
        description: g.description,
        body: `<article class="prose">${r.html}</article>`,
        toRoot: "../../",
        toVer: "../",
        path: `guides/${g.file}.html`,
        tab: "guides",
        sidebar: guidesSidebar(`guides/${g.file}.html`),
        toc: r.headings,
        ver,
        bodyClass: "guide",
      });
      writeFileSync(join(vDir, "guides", `${g.file}.html`), html);
      V.pages.push({ path: `guides/${g.file}.html`, title: g.title, description: g.description });
    }
  }

  // Reference index
  {
    const body = refIndexBody(V, "reference/index.html");
    const html = page({
      title: "API Reference",
      description: `Complete API reference for pandas-ts ${V.version}.`,
      body,
      toRoot: "../../",
      toVer: "../",
      path: "reference/index.html",
      tab: "reference",
      sidebar: refSidebar("reference/index.html"),
      ver,
    });
    writeFileSync(join(vDir, "reference", "index.html"), html);
    V.pages.push({ path: "reference/index.html", title: "API Reference" });
  }

  // Reference section pages
  for (const cat of V.categories) {
    const { toc, body } = categoryBody(V, cat, `reference/${cat.id}.html`);
    const html = page({
      title: cat.title,
      description: cat.intro,
      body,
      toRoot: "../../",
      toVer: "../",
      path: `reference/${cat.id}.html`,
      tab: "reference",
      sidebar: refSidebar(`reference/${cat.id}.html`),
      toc,
      ver,
    });
    writeFileSync(join(vDir, "reference", `${cat.id}.html`), html);
    V.pages.push({ path: `reference/${cat.id}.html`, title: cat.title });
  }

  // Compatibility page
  {
    const link = (href) => resolveLink(href, "compatibility.html", V);
    const r = renderMarkdown(fillTokens(V.compat, V), { link });
    const html = page({
      title: "pandas compatibility",
      description: "Known differences between pandas-ts and Python pandas.",
      body: `<article class="prose">${r.html}</article>`,
      toRoot: "../../",
      toVer: "../",
      path: "compatibility.html",
      tab: "compat",
      sidebar: "",
      toc: r.headings,
      ver,
    });
    writeFileSync(join(vDir, "compatibility.html"), html);
    V.pages.push({ path: "compatibility.html", title: "pandas compatibility" });
  }

  // Changelog
  {
    const link = (href) => resolveLink(href, "changelog.html", V);
    const r = renderMarkdown(fillTokens(V.changelog, V), { link });
    const html = page({
      title: "Changelog",
      description: "pandas-ts release notes.",
      body: `<article class="prose">${r.html}</article>`,
      toRoot: "../../",
      toVer: "../",
      path: "changelog.html",
      tab: "changelog",
      sidebar: "",
      toc: r.headings,
      ver,
    });
    writeFileSync(join(vDir, "changelog.html"), html);
    V.pages.push({ path: "changelog.html", title: "Changelog" });
  }

  // Version index (redirect to guides/index.html)
  writeFileSync(join(vDir, "index.html"), redirectPage(`guides/index.html`));
  V.pages.push({ path: "index.html", title: "Index" });

  // search-index.js
  const idx = V.pages.map((p) => ({ path: p.path, title: p.title, description: p.description ?? "" }));
  writeFileSync(join(vDir, "search-index.js"), `window.__searchIndex = ${JSON.stringify(idx)};`);

  console.log(`  v${V.version}: ${V.pages.length} pages`);
}

function buildGuidesSidebar(V, prefix) {
  return (activePath) => {
    const items = V.guideOrder.map((section) => {
      const links = section.pages.map((g) => {
        const href = `${prefix}${g.file}.html`;
        return `<li${activePath === href ? ' class="active"' : ""}><a href="${esc(g.file)}.html">${esc(g.title)}</a></li>`;
      }).join("");
      return `<li class="section"><span>${esc(section.title)}</span><ul>${links}</ul></li>`;
    }).join("");
    return `<ul class="nav">${items}</ul>`;
  };
}

function buildRefSidebar(V, prefix) {
  return (activePath) => {
    const items = GROUPS.map(([title, ids]) => {
      const links = ids.map((id) => {
        const cat = V.categories.find((c) => c.id === id);
        if (!cat) return "";
        const href = `${prefix}${id}.html`;
        return `<li${activePath === href ? ' class="active"' : ""}><a href="${esc(id)}.html">${esc(cat.title)}</a></li>`;
      }).filter(Boolean).join("");
      if (!links) return "";
      return `<li class="section"><span>${esc(title)}</span><ul>${links}</ul></li>`;
    }).join("");
    const indexActive = activePath === `${prefix}index.html` ? ' class="active"' : "";
    return `<ul class="nav"><li${indexActive}><a href="index.html">Overview</a></li>${items}</ul>`;
  };
}

function resolveLink(href, fromPath, V) {
  if (href.startsWith("http")) return href;
  if (href.startsWith("/guides/")) return href.slice(1);
  if (href.startsWith("/reference/")) return href.slice(1);
  return href;
}

function refIndexBody(V, path) {
  const m = V.meta;
  const sections = GROUPS.map(([title, ids]) => {
    const cards = ids.map((id) => {
      const c = V.categories.find((x) => x.id === id);
      if (!c) return "";
      return `<a class="card" href="${c.id}.html"><h3>${esc(c.title)}</h3><p>${inline(c.intro?.slice(0, 100) ?? "")}</p><span class="count">${c.entries.length} entries</span></a>`;
    }).filter(Boolean).join("");
    return `<section><h2 id="${slugify(title)}">${esc(title)}</h2><div class="cards">${cards}</div></section>`;
  }).join("");
  return `<article class="prose wide-prose">
<p class="eyebrow">API reference · v${esc(m.version)}</p>
<h1>API reference</h1>
<p class="lede">This reference describes every function, class and option in pandas-ts ${esc(m.version)}, grouped by topic. Each entry gives the TypeScript signature, its arguments, the return type and an example.</p>
${sections}
</article>`;
}

function categoryBody(V, cat, path) {
  const toc = [];
  const items = cat.entries.map((e) => {
    const id = anchor(e.name);
    toc.push({ id, text: e.name.split(" ").pop() ?? e.name, level: 3 });
    const args = e.args?.length
      ? `<h4>Parameters</h4><dl class="params">${e.args.map((a) => `<div><dt><code>${esc(a.name)}</code>${a.type ? `<span class="ty">${esc(a.type)}</span>` : ""}</dt><dd>${inline(a.desc)}</dd></div>`).join("")}</dl>`
      : "";
    return `<article class="api" id="${id}">
<header class="api-head"><h3><code>${esc(e.name)}</code></h3><a class="anchor" href="#${id}" aria-label="Link to ${esc(e.name)}">#</a></header>
<pre class="sig"><code>${esc(e.sig)}</code></pre>
<p>${inline(e.desc)}</p>
${args}
<h4>Returns</h4><p class="ret"><code>${esc(e.returns)}</code></p>
<h4>Example</h4><div class="codeblock"><div class="codehead"><span>TypeScript</span><button class="copy" type="button" aria-label="Copy code">Copy</button></div><pre><code>${highlight(e.example)}</code></pre></div>
</article>`;
  });
  return {
    toc,
    body: `<article class="prose ref">
<p class="eyebrow">API reference</p>
<h1>${esc(cat.title)}</h1>
${cat.intro ? `<p class="lede">${inline(cat.intro)}</p>` : ""}
<div class="summary-table table"><table><thead><tr><th>Name</th><th>Summary</th></tr></thead><tbody>${cat.entries
      .map((e) => `<tr><td><a href="#${anchor(e.name)}"><code>${esc(e.name)}</code></a></td><td>${inline(e.desc.slice(0, 80))}</td></tr>`)
      .join("")}</tbody></table></div>
${items.join("\n")}
</article>`,
  };
}

function redirectPage(to) {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>pandas-ts documentation</title>
<meta http-equiv="refresh" content="0; url=${to}">
<link rel="canonical" href="${to}">
<script>location.replace(${JSON.stringify(to)} + location.hash)</script>
</head><body><p>Redirecting to <a href="${to}">the latest pandas-ts documentation</a>…</p></body></html>
`;
}

function notFound() {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Page not found · pandas-ts</title>
<style>body{font:16px/1.6 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;display:grid;place-items:center;min-height:100vh;margin:0;background:#fbfaf7;color:#1d1f23}a{color:#1565c0}.logo-mark{width:56px;height:56px;margin:0 auto}main{text-align:center;padding:24px}</style></head>
<body><main><h1>Page not found</h1><p>This page does not exist in this version of the docs.</p><p><a id="home" href="/latest.html">Go to the latest documentation</a></p></main>
<script>{const m=location.pathname.match(/^(.*?\/)v\d+\.\d+\.\d+[^/]*\//);if(m){document.getElementById("home").href=m[1]+"latest.html";}}</script></body></html>
`;
}
