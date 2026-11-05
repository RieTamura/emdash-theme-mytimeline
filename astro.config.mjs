import cloudflare from "@astrojs/cloudflare";
import { cacheCloudflare } from "@astrojs/cloudflare/cache";
import react from "@astrojs/react";
import { d1, r2 } from "@emdash-cms/cloudflare";
import { defineConfig, fontProviders } from "astro/config";
import blueskyFeed from "bluesky-feed";
import postLayout from "post-layout";
import rssFeed from "rss-feed";
import siteLikes from "site-likes";
import emdash from "emdash/astro";
import { readFileSync } from "node:fs";

// The site's address, kept in one place: wrangler.jsonc. A line that is
// commented out doesn't match, so nothing is set until the owner sets it.
const siteUrl = readFileSync(new URL("./wrangler.jsonc", import.meta.url), "utf8").match(
	/^s*"EMDASH_SITE_URL":s*"([^"]+)"/m,
)?.[1];

// Pages that show Bluesky posts. The plugin publishes from cron, and the purge
// after that publish can be missed, so these pages must not depend on it: stale for 20 minutes at the very most.
const BLUESKY_PAGE_CACHE = { maxAge: 600, swr: 600 };

export default defineConfig({
	output: "server",
	adapter: cloudflare(),
	i18n: {
		defaultLocale: "ja",
		locales: ["ja", "en"],
		// /en/... renders the same pages in English. Entries without an
		// English version show their Japanese text instead.
		fallback: { en: "ja" },
		routing: { prefixDefaultLocale: false, fallbackType: "rewrite" },
	},
	// Serve public pages from Cloudflare's edge cache. EmDash purges the
	// matching collection tags on publish, so edits show up right away.
	cache: {
		provider: cacheCloudflare(),
	},
	routeRules: {
		"/": { ...BLUESKY_PAGE_CACHE, tags: ["posts", "works", "pages", "bluesky", "feed_items"] },
		"/posts": { maxAge: 86_400, swr: 604_800, tags: ["posts", "works"] },
		"/posts/[slug]": { maxAge: 86_400, swr: 604_800, tags: ["posts"] },
		"/works": { maxAge: 86_400, swr: 604_800, tags: ["posts", "works"] },
		"/works/[slug]": { maxAge: 86_400, swr: 604_800, tags: ["works"] },
		"/bluesky": { ...BLUESKY_PAGE_CACHE, tags: ["posts", "works", "bluesky"] },
		"/pages/[slug]": { maxAge: 86_400, swr: 604_800, tags: ["pages"] },
		"/category/[slug]": { maxAge: 86_400, swr: 604_800, tags: ["posts"] },
		"/tag/[slug]": { maxAge: 86_400, swr: 604_800, tags: ["posts"] },
		"/rss.xml": { maxAge: 86_400, swr: 604_800, tags: ["posts"] },
		// The same pages in English
		"/en": { ...BLUESKY_PAGE_CACHE, tags: ["posts", "works", "pages", "bluesky", "feed_items"] },
		"/en/posts": { maxAge: 86_400, swr: 604_800, tags: ["posts", "works"] },
		"/en/posts/[slug]": { maxAge: 86_400, swr: 604_800, tags: ["posts"] },
		"/en/works": { maxAge: 86_400, swr: 604_800, tags: ["posts", "works"] },
		"/en/works/[slug]": { maxAge: 86_400, swr: 604_800, tags: ["works"] },
		"/en/bluesky": { ...BLUESKY_PAGE_CACHE, tags: ["posts", "works", "bluesky"] },
		"/en/pages/[slug]": { maxAge: 86_400, swr: 604_800, tags: ["pages"] },
		"/en/category/[slug]": { maxAge: 86_400, swr: 604_800, tags: ["posts"] },
		"/en/tag/[slug]": { maxAge: 86_400, swr: 604_800, tags: ["posts"] },
	},
	image: {
		layout: "constrained",
		responsiveStyles: true,
		// EmDash only allows its own media to be resized when it knows the site's
		// address at build time, and EMDASH_SITE_URL is set only at runtime here.
		// Without this, every width in a srcset is the full-size original.
		remotePatterns: siteUrl
			? [{ hostname: new URL(siteUrl).hostname, pathname: "/_emdash/api/media/file/**" }]
			: [],
	},
	integrations: [
		react(),
		emdash({
			database: d1({ binding: "DB", session: "auto", coalesce: true }),
			storage: r2({ binding: "MEDIA" }),
			// Keeps cached HTML identical for visitors and signed-in editors.
			toolbar: "client",
			// All four run in-process, so they need no Worker Loader or paid plan.
			// bluesky-feed copies Bluesky posts into the `bluesky` collection and does
			// nothing until a handle is set; rss-feed copies feed items into
			// `feed_items`; site-likes counts the heart buttons; post-layout keeps where
			// the author card, related posts and updated date go on post pages.
			plugins: [blueskyFeed, rssFeed, siteLikes, postLayout],
		}),
	],
	fonts: [
		{
			provider: fontProviders.google(),
			name: "Zen Maru Gothic",
			cssVariable: "--font-body",
			weights: [400, 700],
			subsets: ["japanese", "latin"],
			fallbacks: ["sans-serif"],
		},
		{
			provider: fontProviders.google(),
			name: "JetBrains Mono",
			cssVariable: "--font-mono",
			weights: [400, 500],
			fallbacks: ["monospace"],
		},
	],
	devToolbar: { enabled: false },
});
