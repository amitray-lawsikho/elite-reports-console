// Build: render the pages (Python/Jinja), then bundle src/client/main.js into web/static/js/erc.js (one classic script).
import { execFileSync } from "node:child_process";
import { build } from "esbuild";

// Cloudflare Workers Builds (WORKERS_CI=1) has no Jinja: the rendered pages in web/ are committed, so it only re-bundles.
if (!process.env.WORKERS_CI) execFileSync("python3", ["tools/render_pages.py"], { stdio: "inherit" });
await build({ entryPoints: ["src/client/main.js"], bundle: true, format: "iife", target: "es2020", minify: false,
              outfile: "web/static/js/erc.js", legalComments: "none", banner: { js: "/* Elite Reports Console — built from src/client (npm run build). Do not edit. */" } });
console.log("bundled web/static/js/erc.js");
