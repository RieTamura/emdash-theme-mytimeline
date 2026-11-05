import type { PageMetadataEvent } from "emdash/plugin";
import { describe, expect, it } from "vitest";

import plugin from "../src/plugin";

type Page = PageMetadataEvent["page"];

const article: Page = {
	url: "https://example.com/posts/hello",
	path: "/posts/hello",
	locale: "ja",
	kind: "content",
	pageType: "article",
	title: "Hello | Site",
	pageTitle: "Hello",
	description: "About hello",
	canonical: "https://example.com/posts/hello",
	image: "https://example.com/hello.png",
	articleMeta: {
		publishedTime: "2026-11-01T00:00:00.000Z",
		modifiedTime: "2026-11-02T00:00:00.000Z",
		author: "Rie",
	},
	siteName: "Site",
};

async function run(page: Page) {
	const hook = plugin.hooks?.["page:metadata"];
	if (typeof hook !== "function") throw new Error("page:metadata is missing");
	// The hook only reads the event, so no real context is needed.
	return hook({ page }, {} as Parameters<typeof hook>[1]);
}

describe("page:metadata", () => {
	it("replaces EmDash's BlogPosting and adds the author's url", async () => {
		expect(await run(article)).toEqual({
			kind: "jsonld",
			id: "primary",
			graph: {
				"@context": "https://schema.org",
				"@type": "BlogPosting",
				headline: "Hello",
				description: "About hello",
				image: "https://example.com/hello.png",
				url: "https://example.com/posts/hello",
				datePublished: "2026-11-01T00:00:00.000Z",
				dateModified: "2026-11-02T00:00:00.000Z",
				author: { "@type": "Person", name: "Rie", url: "https://example.com/pages/about" },
				publisher: { "@type": "Organization", name: "Site" },
				mainEntityOfPage: { "@type": "WebPage", "@id": "https://example.com/posts/hello" },
			},
		});
	});

	it("points English pages at the English profile", async () => {
		const result = await run({ ...article, locale: "en" });
		expect(result).toMatchObject({
			graph: { author: { url: "https://example.com/en/pages/about" } },
		});
	});

	it("leaves out values the page doesn't have", async () => {
		const result = await run({ ...article, image: null, description: null, siteName: undefined });
		const graph = (result as { graph: Record<string, unknown> }).graph;
		expect(graph).not.toHaveProperty("image");
		expect(graph).not.toHaveProperty("description");
		expect(graph).not.toHaveProperty("publisher");
	});

	it("does nothing on other pages, so EmDash's own metadata stays", async () => {
		expect(await run({ ...article, pageType: "website" })).toBeNull();
		expect(await run({ ...article, canonical: null })).toBeNull();
		expect(await run({ ...article, articleMeta: {} })).toBeNull();
	});
});
