import type { PageMetadataEvent, SandboxedPlugin } from "emdash/plugin";

/** The profile page, the same one src/utils/site-identity.ts links to. */
const PROFILE_PATH = "/pages/about";
const DEFAULT_LOCALE = "ja";

/** The page's address for the author, in the language of the page. */
function profileUrl(page: PageMetadataEvent["page"], canonical: string): string {
	const prefix = page.locale && page.locale !== DEFAULT_LOCALE ? `/${page.locale}` : "";
	return new URL(`${prefix}${PROFILE_PATH}`, canonical).href;
}

/**
 * Most of the plugin only keeps choices for the settings form EmDash builds
 * from `admin.settingsSchema`; the site reads them with
 * getPluginSettings("post-layout").
 *
 * The hook replaces EmDash's own BlogPosting, whose author has a name but no
 * url. The id "primary" is what makes it a replacement: the first contribution
 * with an id wins, and plugins come first. If the hook fails, EmDash's own
 * still appears. Keep the fields in step with buildBlogPostingJsonLd in EmDash.
 */
const plugin: SandboxedPlugin = {
	hooks: {
		"page:metadata": async ({ page }) => {
			if (page.pageType !== "article" || !page.canonical || !page.articleMeta?.author) return null;

			const { publishedTime, modifiedTime, author } = page.articleMeta;
			const graph: Record<string, unknown> = {
				"@context": "https://schema.org",
				"@type": "BlogPosting",
				headline: page.seo?.ogTitle ?? page.pageTitle ?? page.title,
				description: page.seo?.ogDescription || page.description,
				image: page.seo?.ogImage || page.image,
				url: page.canonical,
				datePublished: publishedTime,
				dateModified: modifiedTime || publishedTime,
				author: { "@type": "Person", name: author, url: profileUrl(page, page.canonical) },
				publisher: page.siteName ? { "@type": "Organization", name: page.siteName } : undefined,
				mainEntityOfPage: { "@type": "WebPage", "@id": page.canonical },
			};
			for (const key of Object.keys(graph)) {
				if (graph[key] === null || graph[key] === undefined || graph[key] === "") delete graph[key];
			}
			return { kind: "jsonld", id: "primary", graph };
		},
	},
};

export default plugin;
