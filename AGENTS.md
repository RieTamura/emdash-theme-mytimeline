This is MyTimeline, an EmDash theme: a CMS site built on Astro, running on Cloudflare Workers with D1 and R2. It puts blog posts, works, Bluesky posts and RSS items in one SNS-style timeline. Japanese is the default language, with an English version under `/en`.

## Commands

```bash
npm run dev         # Start the Astro dev server
npm run typecheck   # astro check
npm run deploy      # Build and deploy to Cloudflare
npx emdash types    # Regenerate TypeScript types from a running site
```

The admin UI is at `http://localhost:4321/_emdash/admin`. To skip setup locally, open `/_emdash/api/setup/dev-bypass?redirect=/_emdash/admin`; add `&content=0` to leave out the sample content.

## Key files

| File | Purpose |
| --- | --- |
| `wrangler.jsonc` | Worker settings. `EMDASH_SITE_URL` here is the only place the site's address is set |
| `astro.config.mjs` | Astro and `emdash()` config, route cache rules, plugins, fonts |
| `src/worker.ts` | Worker entry: workers.dev redirect, `/en` status fix, purge on layout settings save, cron |
| `src/live.config.ts` | EmDash loader registration (boilerplate, don't modify) |
| `seed/seed.json` | Schema and sample content |
| `src/layouts/Base.astro` | Layout: main card, sidebar, menus, EmDash head wiring |
| `src/components/FeedPage.astro` | The profile, tabs and timeline page |
| `src/utils/timeline.ts` | Loads and merges the feed |
| `src/utils/text-search.ts` | Japanese search |
| `src/utils/i18n.ts` | UI strings, time zone, language paths |
| `src/styles/theme.css` | Colours and type. Override tokens here, not in `tokens.css` |
| `plugins/` | Local plugins. Their `dist/` is committed so the theme installs with no build step |

## Skills and docs

Agent skills are in `.agents/skills/`. Start with `building-emdash-site`. Use `creating-plugins` for `plugins/` and `emdash-cli` for the CLI.

The EmDash docs are an MCP server at `https://docs.emdashcms.com/mcp`. Check an API, hook or option with `search_docs` rather than relying on memory.

## Rules

- All content pages are server-rendered (`output: "server"`). No `getStaticPaths()` for CMS content.
- Every new public route needs a `routeRules` entry in `astro.config.mjs`, or it isn't cached as intended.
- Image fields are objects (`{ src, alt }`), not strings.
- `entry.id` is the slug, for URLs. `entry.data.id` is the database ID, for API calls.
- Pass cache hints to `Astro.cache.set()` for everything a cached route reads.
- Taxonomy names in queries must match the seed's `name` exactly (`category`, not `categories`).
- After changing a plugin in `plugins/`, run its `npm install` and `npm run build`, and commit `dist/`.
- Never return a host-specific response without `no-store`. The Cloudflare cache keys by path, whatever the hostname, so a cached redirect can loop.

## What this theme promises

These are the theme's character. Keep them when adding features.

**Light pages.** Measure before and after adding anything:

| Measure | Budget |
| --- | --- |
| PageSpeed Insights, mobile | 95 or more |
| Home page HTML, compressed | 60 KB or less |
| The theme's own JavaScript | Only what a feature needs, 10 KB or less in total |
| Font requests on the home page | 40 or fewer, 500 KB or less |

- Render on the server. Don't add browser JavaScript for what HTML can do.
- Always deliver images resized.
- Don't preload fonts. Zen Maru Gothic has hundreds of subsets.

**Things that aren't set up stay out of sight.** The Bluesky tab and `/bluesky` appear only once posts exist, and links to the profile appear only once that page exists. Every optional collection may be empty or missing, and the site must not break.

**Words.** Japanese UI says 作ったもの, not 作品. Dates use `TIME_ZONE` from `i18n.ts`, since the server runs in UTC. Bluesky rows use Bluesky's own blue for the logo, which is the one colour outside the theme.

**Contrast.** Text colours keep at least 4.5:1 on their backgrounds, in light and dark. Check whenever colours change.

## Testing

Test a schema or seed change on a fresh database: delete `.wrangler` and run setup, with and without sample content. A seed is not reapplied to a database that is already set up.

Local dev has no `cache.purge`, so test cache purges on a deployed site.

When testing Japanese queries from Git Bash on Windows, curl can send them in Shift-JIS. Use a script with `encodeURIComponent`.
