import type { PortableTextBlock } from "emdash";
import { extractText } from "./reading-time";
import { entryLang, loadLocalized } from "./timeline";
import type { Lang } from "./i18n";

const LIMIT = 30;
const SNIPPET_BEFORE = 30;
const SNIPPET_LENGTH = 120;
const NON_ASCII = /[^\x00-\x7f]/;
const WHITESPACE = /\s+/;

/**
 * Whether a query needs textSearch() rather than EmDash's search().
 *
 * EmDash's default index splits text on spaces, so Japanese finds only the
 * start of a run of text: 「このサイト」 but not 「サイト」. Its trigram index
 * finds nothing under three characters, such as 「開発」, and a seed can't turn
 * it on. Looking through the text directly has neither problem, and it reads
 * the same entries the timeline does. It's for sites of up to a few hundred
 * entries; English keeps the faster index.
 */
export function needsTextSearch(query: string): boolean {
	return NON_ASCII.test(query);
}

const normalize = (text: string) => text.normalize("NFKC").toLowerCase();

function escapeHtml(text: string) {
	return text
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&#39;");
}

/** Escaped text with each term in <mark>, the same form as search()'s snippets. */
function markTerms(text: string, terms: string[]): string {
	const lower = text.toLowerCase();
	const ranges: Array<[number, number]> = [];
	for (const term of terms) {
		for (let at = lower.indexOf(term); at !== -1; at = lower.indexOf(term, at + term.length)) {
			ranges.push([at, at + term.length]);
		}
	}
	ranges.sort((a, b) => a[0] - b[0]);

	let html = "";
	let position = 0;
	for (const [start, end] of ranges) {
		if (start < position) continue;
		html += `${escapeHtml(text.slice(position, start))}<mark>${escapeHtml(text.slice(start, end))}</mark>`;
		position = end;
	}
	return html + escapeHtml(text.slice(position));
}

/** The part of the text around the first term that appears in it. */
function cutSnippet(text: string, terms: string[]): string {
	const lower = text.toLowerCase();
	const first = Math.min(
		...terms.map((term) => lower.indexOf(term)).filter((at) => at !== -1),
		text.length,
	);
	const start = first === text.length ? 0 : Math.max(0, first - SNIPPET_BEFORE);
	const end = start + SNIPPET_LENGTH;
	const piece = text.slice(start, end);
	return `${start > 0 ? "…" : ""}${markTerms(piece, terms)}${end < text.length ? "…" : ""}`;
}

/**
 * The entries holding every term of the query, anywhere in their title, lead
 * or body. Titles come first, then the newest. The result has the fields
 * search.astro reads from search()'s results.
 */
export async function textSearch(query: string, lang: Lang) {
	const terms = normalize(query).split(WHITESPACE).filter(Boolean);
	// English pages search both languages, like the index does. An entry's
	// Japanese version is left out of loadLocalized("…", "en") once it has an
	// English one, so it's read separately. search.astro drops the Japanese
	// result when both versions match.
	const langs: Lang[] = lang === "en" ? ["en", "ja"] : ["ja"];
	const loaded = await Promise.all(
		langs.flatMap((each) => [loadLocalized("posts", each), loadLocalized("works", each)]),
	);
	const posts = loaded.filter((_, i) => i % 2 === 0).flatMap((result) => result.entries);
	const works = loaded.filter((_, i) => i % 2 === 1).flatMap((result) => result.entries);

	const seen = new Set<string>();
	const candidates = [
		...(posts as Array<(typeof loaded)[number]["entries"][number]>).map((entry) => ({
			collection: "posts",
			entry,
			title: entry.data.title,
			lead: (entry.data as { excerpt?: string }).excerpt,
		})),
		...(works as Array<(typeof loaded)[number]["entries"][number]>).map((entry) => ({
			collection: "works",
			entry,
			title: entry.data.title,
			lead: (entry.data as { summary?: string }).summary,
		})),
	].filter(({ entry }) => {
		if (seen.has(entry.data.id)) return false;
		seen.add(entry.data.id);
		return true;
	});

	const found = candidates.flatMap(({ collection, entry, title, lead }) => {
		const titleText = title ?? "";
		const bodyText = [lead, extractText(entry.data.content as PortableTextBlock[] | undefined)]
			.filter(Boolean)
			.join(" ");
		const titleHay = normalize(titleText);
		const bodyHay = normalize(bodyText);
		if (!terms.every((term) => titleHay.includes(term) || bodyHay.includes(term))) return [];

		const inTitle = terms.some((term) => titleHay.includes(term));
		const inBody = terms.some((term) => bodyHay.includes(term));
		return [
			{
				collection,
				id: entry.data.id,
				slug: entry.id,
				locale: entryLang(entry) as string,
				title: titleText,
				snippet: inBody ? cutSnippet(bodyText, terms) : markTerms(titleText, terms),
				inTitle,
				time: entry.data.publishedAt?.getTime() ?? 0,
			},
		];
	});
	found.sort((a, b) => Number(b.inTitle) - Number(a.inTitle) || b.time - a.time);

	return {
		items: found.slice(0, LIMIT),
		nextCursor: found.length > LIMIT ? "more" : undefined,
	};
}
