# pandas-ts documentation site (`api-doc` branch)

This branch contains only the documentation website for [`pandas-ts`](https://www.npmjs.com/package/pandas-ts) and the scripts that generate it. The library itself lives on `main`.

The built site is in **`html/`**. It is plain static HTML, CSS and JS with relative links and no external requests, so you can host it on any static host (GitHub Pages, Netlify, Cloudflare Pages, S3, nginx, …) at the domain root or in a sub-folder.

```
html/
  index.html, latest.html   → redirect to the latest version
  versions.json             → version list read by the version picker
  assets/                   → style.css, app.js, logo.png, favicons
  404.html, robots.txt, .nojekyll
  v1.0.0/                   → one folder per release
    index.html              → introduction
    guides/*.html           → guides
    reference/*.html        → API reference (one page per section)
    compatibility.html, changelog.html, search-index.js
```

## Preview locally

```bash
npm run build
npm run serve          # http://localhost:8000
```

Opening `html/index.html` straight from disk also works.

## Adding a new release (e.g. 1.0.1)

1. Update `versions/1.0.1/meta.json` with the new version info.
2. Copy and update guides from the previous version.
3. Update `versions/1.0.1/api.mjs` with any new API entries.
4. Add a `## 1.0.1` section at the top of `site/changelog.md`.
5. `npm run build` then commit `versions/1.0.1`, `site/` and `html/`.
