import {
	decodeSlug,
	getEmDashCollection,
	getTaxonomyTerms,
	getTaxonomyTermsWithCacheHint,
	getTermsForEntries,
	getTranslations,
	type CacheHint,
	type ContentEntry,
	type InferCollectionData,
	type TaxonomyTerm,
} from "emdash";
import { dayKey, localizePath, ui, type Lang } from "./i18n";

type PostData = InferCollectionData<"posts">;
type WorkData = InferCollectionData<"works">;
type BlueskyData = InferCollectionData<"bluesky">;
type FeedItemData = InferCollectionData<"feed_items">;

export type FeedType = "all" | "posts" | "works" | "bluesky";
export type BadgeTone = "mint" | "peach" | "butter" | "ink";

export interface TimelineBadge {
	label: string;
	tone: BadgeTone;
}

/** A run of Bluesky post text; `href` is set for links, mentions and hashtags. */
export interface BlueskySegment {
	text: string;
	href?: string;
}

export interface BlueskyImage {
	thumb: string;
	fullsize: string;
	alt: string;
	width: number | null;
	height: number | null;
}

export interface BlueskyLinkCard {
	url: string;
	title: string;
	description: string;
	thumb: string | null;
}

/** What a Bluesky row shows in place of a title and excerpt. */
export interface BlueskyContent {
	/** The post's at:// URI, for fetching its like count from Bluesky */
	uri: string;
	segments: BlueskySegment[];
	images: BlueskyImage[];
	linkCard: BlueskyLinkCard | null;
}

/** What a feed row (rss-feed plugin) shows besides its title. */
export interface FeedContent {
	/** A YouTube video, or a post on note, Zenn or Hatena Blog */
	kind: "video" | "article";
	thumbnail: string | null;
	/** Where the item came from, as the plugin stored it: youtube, note, zenn, hatena */
	source: string;
}

/**
 * One row of the timeline: a post, a work, a Bluesky post, or a feed item
 * (a video or a post elsewhere), flattened to what the row renders.
 * Bluesky and feed rows link out.
 */
export interface TimelineEntry {
	kind: "post" | "work" | "bluesky" | "feed";
	key: string;
	href: string;
	title: string;
	excerpt: string | null;
	/** Tag or stack names, shown as hashtags under the excerpt */
	hashtags: string[];
	image: PostData["featured_image"];
	date: Date | null;
	badge: TimelineBadge | null;
	edit: ContentEntry["edit"];
	/** Field name to spread visual-editing annotations from for the excerpt */
	excerptField: "excerpt" | null;
	/** Set when the entry is shown in a language other than the page's */
	contentLang: Lang | null;
	/** Bluesky rows only */
	bluesky: BlueskyContent | null;
	/** Feed rows only */
	feed: FeedContent | null;
	/** The entry the heart button likes (site-likes plugin) */
	likeTarget: { collection: "posts" | "works" | "bluesky" | "feed_items"; id: string };
}

export const PAGE_SIZE = 10;

const KNOWN_CATEGORY_TONES: Record<string, BadgeTone> = {
	development: "mint",
	design: "peach",
	notes: "butter",
};
const TONE_CYCLE: BadgeTone[] = ["mint", "peach", "butter"];

/** Colour family for a category: fixed for the seeded ones, stable per slug otherwise. */
export function categoryTone(slug: string): Exclude<BadgeTone, "ink"> {
	const known = KNOWN_CATEGORY_TONES[slug];
	if (known && known !== "ink") return known;
	let hash = 0;
	for (const char of slug) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
	return TONE_CYCLE[hash % TONE_CYCLE.length] as Exclude<BadgeTone, "ink">;
}

/** System fields every entry carries but the generated types leave out. */
interface LocaleFields {
	id: string;
	slug: string | null;
	locale?: string | null;
	translationGroup?: string | null;
}

function localeFields(entry: ContentEntry<object>): LocaleFields {
	return entry.data as LocaleFields;
}

/** The id shared by an entry and its translations. */
export function translationGroupOf(entry: ContentEntry<object>): string {
	const data = localeFields(entry);
	return data.translationGroup ?? data.id;
}

/** The language an entry is written in. */
export function entryLang(entry: ContentEntry<object>): Lang {
	return localeFields(entry).locale === "en" ? "en" : "ja";
}

/** Public URL of an entry, under the page's language. */
export function entryHref(
	collection: "posts" | "works" | "pages",
	entry: ContentEntry<object>,
	lang: Lang,
): string {
	const slug = localeFields(entry).slug ?? entry.id;
	return localizePath(`/${collection}/${slug}`, lang);
}

/**
 * Where an entry page lives in each language, for the language switcher
 * and hreflang links, and which language its text is in when that isn't
 * the page's (an English page showing a Japanese entry).
 */
export async function entryLanguages(
	collection: "posts" | "works" | "pages",
	entry: ContentEntry<object>,
	lang: Lang,
	fallbackLocale: string | undefined,
) {
	const { translations } = await getTranslations(collection, localeFields(entry).id);
	const published = new Map(
		translations
			.filter((tr) => tr.status === "published" && tr.slug)
			.map((tr) => [tr.locale as Lang, tr.slug as string]),
	);
	const jaSlug = published.get("ja") ?? localeFields(entry).slug ?? entry.id;
	const alternates: Record<Lang, string> = {
		ja: `/${collection}/${jaSlug}`,
		en: `/en/${collection}/${published.get("en") ?? jaSlug}`,
	};
	const contentLang: Lang | undefined =
		fallbackLocale === "ja" && lang !== "ja" ? "ja" : undefined;
	return {
		alternates,
		contentLangs: [...published.keys()],
		contentLang,
		/** The page search engines should index for this text */
		canonicalPath: contentLang ? alternates.ja : alternates[lang],
	};
}

function entryTime(entry: ContentEntry<PostData | WorkData | BlueskyData>): number {
	return (entry.data.publishedAt ?? entry.data.createdAt)?.getTime() ?? 0;
}

type Where = Record<string, string>;

/**
 * Published entries of a collection in the page's language, newest first.
 *
 * Japanese pages list the Japanese entries. English pages list the same
 * entries, swapping in the English version wherever one has been written
 * and keeping the Japanese one otherwise, plus any English-only entries.
 */
export async function loadLocalized<C extends "posts" | "works">(
	collection: C,
	lang: Lang,
	where?: Where,
): Promise<{ entries: ContentEntry<InferCollectionData<C>>[]; cacheHints: CacheHint[] }> {
	const orderBy = { published_at: "desc" } as const;
	const japanese = await getEmDashCollection(collection, { locale: "ja", orderBy, where });
	if (lang === "ja") {
		return { entries: japanese.entries, cacheHints: [japanese.cacheHint] };
	}

	const [english, englishMatching] = await Promise.all([
		getEmDashCollection(collection, { locale: "en", orderBy }),
		where ? getEmDashCollection(collection, { locale: "en", orderBy, where }) : null,
	]);
	const englishByGroup = new Map(
		english.entries.map((entry) => [translationGroupOf(entry), entry]),
	);

	const seen = new Set<string>();
	const entries = japanese.entries.map((entry) => {
		const group = translationGroupOf(entry);
		seen.add(group);
		return englishByGroup.get(group) ?? entry;
	});
	for (const entry of (englishMatching ?? english).entries) {
		if (!seen.has(translationGroupOf(entry))) entries.push(entry);
	}
	entries.sort((a, b) => entryTime(b) - entryTime(a));

	return {
		entries,
		cacheHints: [japanese.cacheHint, english.cacheHint],
	};
}

/** Every term of a taxonomy, children included, in one flat list. */
export function flattenTerms(terms: TaxonomyTerm[]): TaxonomyTerm[] {
	return terms.flatMap((term) => [term, ...flattenTerms(term.children ?? [])]);
}

type TermLike = Pick<TaxonomyTerm, "id" | "label"> & {
	translationGroup?: string | null;
};

/**
 * Turns a term into its label for the page's language. Terms are named in
 * Japanese; on English pages a term shows its English name when one has
 * been added in the admin, and its Japanese name otherwise.
 */
/**
 * The term a /category or /tag URL names. Terms are filed under their Japanese
 * slug, which the URL carries in both languages. Pages call this before they
 * start rendering, because a page can only switch to the 404 page at that point.
 */
export async function findTerm(
	taxonomy: "category" | "tag",
	rawSlug: string | undefined,
	lang: Lang,
): Promise<{ term: TaxonomyTerm | null; cacheHint: CacheHint | undefined }> {
	const slug = decodeSlug(rawSlug ?? "");
	const { data, cacheHint } = await getTaxonomyTermsWithCacheHint(taxonomy, {
		locale: "ja",
		includeCounts: false,
	});
	const japaneseTerms = flattenTerms(data);
	let term = slug ? (japaneseTerms.find((item) => item.slug === slug) ?? null) : null;
	// A link built from an English term's own slug: find its Japanese original.
	if (!term && slug && lang === "en") {
		const english = flattenTerms(await getTaxonomyTerms(taxonomy, { locale: "en" })).find(
			(item) => item.slug === slug && item.locale === "en",
		);
		const group = english?.translationGroup;
		term = group ? (japaneseTerms.find((item) => item.translationGroup === group) ?? null) : null;
	}
	return { term, cacheHint };
}

export async function termLabeler(
	taxonomy: string,
	lang: Lang,
): Promise<{ label: (term: TermLike) => string; cacheHint?: CacheHint }> {
	if (lang === "ja") return { label: (term) => term.label };

	const { data, cacheHint } = await getTaxonomyTermsWithCacheHint(taxonomy, {
		locale: "en",
		includeCounts: false,
	});
	const english = new Map(
		flattenTerms(data)
			.filter((term) => term.locale === "en")
			.map((term) => [term.translationGroup ?? term.id, term.label]),
	);
	return {
		label: (term) => english.get(term.translationGroup ?? term.id) ?? term.label,
		cacheHint,
	};
}

export function postToEntry(
	post: ContentEntry<PostData>,
	lang: Lang,
	category?: { slug: string; label: string },
	tags: string[] = [],
): TimelineEntry {
	const contentLang = entryLang(post);
	return {
		kind: "post",
		key: `posts:${post.data.id}`,
		href: entryHref("posts", post, lang),
		title: post.data.title || ui[lang].untitled,
		excerpt: post.data.excerpt || null,
		hashtags: tags,
		image: post.data.featured_image,
		date: post.data.publishedAt ?? post.data.createdAt ?? null,
		badge: category
			? { label: category.label, tone: categoryTone(category.slug) }
			: null,
		edit: post.edit,
		excerptField: "excerpt",
		contentLang: contentLang === lang ? null : contentLang,
		bluesky: null,
		feed: null,
		likeTarget: { collection: "posts", id: post.data.id },
	};
}

export function workToEntry(
	work: ContentEntry<WorkData>,
	lang: Lang,
	stack: string[] = [],
): TimelineEntry {
	const t = ui[lang];
	const contentLang = entryLang(work);
	const lead = work.data.summary || ui[contentLang].workPublished;
	return {
		kind: "work",
		key: `works:${work.data.id}`,
		href: entryHref("works", work, lang),
		title: work.data.title || t.untitled,
		excerpt: lead,
		hashtags: stack,
		image: work.data.featured_image,
		date: work.data.publishedAt ?? work.data.createdAt ?? null,
		badge: { label: t.work, tone: "ink" },
		edit: work.edit,
		excerptField: null,
		contentLang: contentLang === lang ? null : contentLang,
		bluesky: null,
		feed: null,
		likeTarget: { collection: "works", id: work.data.id },
	};
}

/** When a Bluesky post was written, as the plugin stored it. */
function blueskyTime(entry: ContentEntry<BlueskyData>): number {
	const postedAt = entry.data.posted_at as string | Date | undefined;
	const time = postedAt ? new Date(postedAt).getTime() : Number.NaN;
	return Number.isNaN(time) ? entryTime(entry) : time;
}

const asArray = <T>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);

/**
 * Link to a Bluesky post. Built from the post's AT URI, whose DID stays the same
 * when the author changes handle; the stored `post_url` contains the handle at
 * import time and stops working after a change, so it is only the fallback.
 */
function blueskyPostUrl(data: BlueskyData): string {
	const match = /^at:\/\/(did:[^/]+)\/app\.bsky\.feed\.post\/([^/]+)$/.exec(data.post_uri ?? "");
	return match ? `https://bsky.app/profile/${match[1]}/post/${match[2]}` : (data.post_url ?? "");
}

export function blueskyToEntry(entry: ContentEntry<BlueskyData>, lang: Lang): TimelineEntry {
	const data = entry.data;
	const text = data.text ?? "";
	const segments = asArray<BlueskySegment>(data.segments);
	const contentLang: Lang = asArray<string>(data.langs)[0]?.startsWith("en") ? "en" : "ja";
	return {
		kind: "bluesky",
		key: `bluesky:${data.id}`,
		href: blueskyPostUrl(data),
		title: data.title || ui[lang].blueskyPost,
		excerpt: null,
		hashtags: [],
		image: undefined,
		date: new Date(blueskyTime(entry)),
		badge: null,
		edit: entry.edit,
		excerptField: null,
		contentLang: contentLang === lang ? null : contentLang,
		bluesky: {
			uri: data.post_uri ?? "",
			segments: segments.length > 0 ? segments : [{ text }],
			images: asArray<BlueskyImage>(data.images),
			linkCard: (data.link_card as BlueskyLinkCard | null | undefined) ?? null,
		},
		feed: null,
		likeTarget: { collection: "bluesky", id: data.id },
	};
}

/**
 * Bluesky posts copied in by the bluesky-feed plugin, newest first. They
 * are written in one language and have no translations, so English pages
 * show the same entries.
 */
async function loadBluesky(): Promise<{
	entries: ContentEntry<BlueskyData>[];
	cacheHints: CacheHint[];
}> {
	const { entries, cacheHint, error } = await getEmDashCollection("bluesky", { locale: "ja" });
	// A site without the collection (or a failed read) still shows its posts and works.
	if (error) return { entries: [], cacheHints: [] };
	return {
		entries: [...entries].sort((a, b) => blueskyTime(b) - blueskyTime(a)),
		cacheHints: [cacheHint],
	};
}

/** When a feed item was published, as the rss-feed plugin stored it. */
function feedItemTime(entry: ContentEntry<FeedItemData>): number {
	const postedAt = entry.data.posted_at as string | Date | undefined;
	const time = postedAt ? new Date(postedAt).getTime() : Number.NaN;
	return Number.isNaN(time) ? entryTime(entry) : time;
}

const isArticle = (entry: ContentEntry<FeedItemData>) => entry.data.kind === "article";

export function feedItemToEntry(entry: ContentEntry<FeedItemData>, lang: Lang): TimelineEntry {
	const data = entry.data;
	const thumbnail = data.thumbnail as { url?: string } | null | undefined;
	return {
		kind: "feed",
		key: `feed_items:${data.id}`,
		href: data.item_url ?? "",
		title: data.title || ui[lang].untitled,
		excerpt: isArticle(entry) ? data.summary || null : null,
		hashtags: [],
		image: undefined,
		date: new Date(feedItemTime(entry)),
		badge: null,
		edit: entry.edit,
		excerptField: null,
		// Titles come from the feed as they are, untranslated
		contentLang: lang === "ja" ? null : "ja",
		bluesky: null,
		feed: {
			kind: isArticle(entry) ? "article" : "video",
			thumbnail: thumbnail?.url ?? null,
			source: data.source ?? "",
		},
		likeTarget: { collection: "feed_items", id: data.id },
	};
}

/**
 * Items copied in by the rss-feed plugin, newest first: YouTube videos and
 * posts on note, Zenn and Hatena Blog. Shorts are left out; the plugin only
 * saves them when its setting asks for them. They are written in one
 * language and have no translations, so English pages show the same items.
 */
export async function loadFeedItems(
	only?: "video" | "article",
): Promise<{ entries: ContentEntry<FeedItemData>[]; cacheHints: CacheHint[] }> {
	const { entries, cacheHint, error } = await getEmDashCollection("feed_items", { locale: "ja" });
	// A site without the collection (or a failed read) shows no feed items.
	if (error) return { entries: [], cacheHints: [] };
	return {
		entries: entries
			.filter((entry) => entry.data.kind === "video" || entry.data.kind === "article")
			.filter((entry) => !only || entry.data.kind === only)
			.sort((a, b) => feedItemTime(b) - feedItemTime(a)),
		cacheHints: [cacheHint],
	};
}

/** YouTube videos copied in by the rss-feed plugin, newest first, for VideoGrid. */
export const loadVideos = () => loadFeedItems("video");

/** Category terms for a batch of posts, first term per post, labelled for the page. */
export async function categoriesFor(posts: ContentEntry<PostData>[], lang: Lang) {
	const [byEntry, labeler] = await Promise.all([
		getTermsForEntries(
			"posts",
			posts.map((p) => p.data.id),
			"category",
		),
		termLabeler("category", lang),
	]);
	return (post: ContentEntry<PostData>) => {
		const term = byEntry.get(post.data.id)?.[0];
		return term ? { slug: term.slug, label: labeler.label(term) } : undefined;
	};
}

/** Term names in one taxonomy for a batch of entries, labelled for the page. */
async function termNamesFor<T extends { id: string }>(
	collection: "posts" | "works",
	entries: ContentEntry<T>[],
	taxonomy: string,
	lang: Lang,
) {
	const [byEntry, labeler] = await Promise.all([
		getTermsForEntries(
			collection,
			entries.map((e) => e.data.id),
			taxonomy,
		),
		termLabeler(taxonomy, lang),
	]);
	return (entry: ContentEntry<T>) =>
		(byEntry.get(entry.data.id) ?? []).map((term) => labeler.label(term));
}

/** Posts as timeline rows, with their categories and tags. */
export async function postsToEntries(posts: ContentEntry<PostData>[], lang: Lang) {
	const [categoryOf, tagsOf] = await Promise.all([
		categoriesFor(posts, lang),
		termNamesFor("posts", posts, "tag", lang),
	]);
	return posts.map((post) => postToEntry(post, lang, categoryOf(post), tagsOf(post)));
}

export interface FeedPage {
	entries: TimelineEntry[];
	/** すべて only: the page's entries grouped by day */
	days: TimelineDay[] | null;
	postCount: number;
	blueskyCount: number;
	workCount: number;
	page: number;
	hasMore: boolean;
	cacheHints: CacheHint[];
}

/** One day on すべて: its posts, works and feed items, then a few Bluesky posts. */
export interface TimelineDay {
	key: string;
	date: Date;
	entries: TimelineEntry[];
	/** Bluesky posts that day beyond BLUESKY_PER_DAY, left to the Bluesky tab */
	moreBluesky: number;
}

/** Bluesky posts shown per day on すべて; the rest are on the Bluesky tab. */
export const BLUESKY_PER_DAY = 5;

type FeedItem =
	| { kind: "post"; entry: ContentEntry<PostData>; time: number }
	| { kind: "work"; entry: ContentEntry<WorkData>; time: number }
	| { kind: "bluesky"; entry: ContentEntry<BlueskyData>; time: number }
	| { kind: "feed"; entry: ContentEntry<FeedItemData>; time: number };

/** Mix feed items (rss-feed plugin) into すべて. They have no tab of their own. */
const FEED_ITEMS_ON_ALL = true;

/**
 * Posts, works, Bluesky posts and feed items merged into one feed, newest first.
 *
 * The collections are read in full: that gives the header its counts and
 * lets them be interleaved by date before paging. Fine for a personal
 * site with tens or hundreds of entries; the route cache absorbs the cost.
 */
export async function loadFeed(type: FeedType, page: number, lang: Lang): Promise<FeedPage> {
	const showFeedItems = type === "all" && FEED_ITEMS_ON_ALL;
	const [posts, works, bluesky, feedItems] = await Promise.all([
		loadLocalized("posts", lang),
		loadLocalized("works", lang),
		loadBluesky(),
		showFeedItems ? loadFeedItems() : { entries: [], cacheHints: [] },
	]);

	const shows = (kind: FeedType) => type === "all" || type === kind;
	const merged: FeedItem[] = [
		...(shows("posts")
			? posts.entries.map((entry) => ({ kind: "post" as const, entry, time: entryTime(entry) }))
			: []),
		...(shows("works")
			? works.entries.map((entry) => ({ kind: "work" as const, entry, time: entryTime(entry) }))
			: []),
		...(shows("bluesky")
			? bluesky.entries.map((entry) => ({
					kind: "bluesky" as const,
					entry,
					time: blueskyTime(entry),
				}))
			: []),
		...feedItems.entries.map((entry) => ({
			kind: "feed" as const,
			entry,
			time: feedItemTime(entry),
		})),
	];
	merged.sort((a, b) => b.time - a.time);

	let pageItems: FeedItem[];
	let pageDays: Array<{ key: string; items: FeedItem[]; moreBluesky: number }> | null = null;
	let hasMore: boolean;
	if (type === "all") {
		const result = pageOfDays(groupByDay(merged), page);
		pageDays = result.days;
		pageItems = pageDays.flatMap((day) => day.items);
		hasMore = result.hasMore;
	} else {
		const start = (page - 1) * PAGE_SIZE;
		pageItems = merged.slice(start, start + PAGE_SIZE);
		hasMore = merged.length > start + PAGE_SIZE;
	}

	const pagePosts = pageItems.flatMap((item) =>
		item.kind === "post" ? [item.entry] : [],
	);
	const pageWorks = pageItems.flatMap((item) =>
		item.kind === "work" ? [item.entry] : [],
	);
	const [categoryOf, tagsOf, stackOf] = await Promise.all([
		categoriesFor(pagePosts, lang),
		termNamesFor("posts", pagePosts, "tag", lang),
		termNamesFor("works", pageWorks, "stack", lang),
	]);
	const toEntry = (item: FeedItem): TimelineEntry => {
		switch (item.kind) {
			case "post":
				return postToEntry(item.entry, lang, categoryOf(item.entry), tagsOf(item.entry));
			case "work":
				return workToEntry(item.entry, lang, stackOf(item.entry));
			case "bluesky":
				return blueskyToEntry(item.entry, lang);
			case "feed":
				return feedItemToEntry(item.entry, lang);
		}
	};

	return {
		entries: pageItems.map(toEntry),
		days:
			pageDays?.map((day) => ({
				key: day.key,
				date: new Date(day.items[0]?.time ?? 0),
				entries: day.items.map(toEntry),
				moreBluesky: day.moreBluesky,
			})) ?? null,
		postCount: posts.entries.length,
		blueskyCount: bluesky.entries.length,
		workCount: works.entries.length,
		page,
		hasMore,
		cacheHints: [
			...posts.cacheHints,
			...works.cacheHints,
			...bluesky.cacheHints,
			...feedItems.cacheHints,
		],
	};
}

/**
 * Splits a newest-first feed into days (in Japan time). Within a day, posts
 * and works come first, then up to BLUESKY_PER_DAY Bluesky posts.
 */
function groupByDay(items: FeedItem[]) {
	const days: Array<{ key: string; main: FeedItem[]; bluesky: FeedItem[] }> = [];
	for (const item of items) {
		const key = dayKey(new Date(item.time));
		let day = days.at(-1);
		if (day?.key !== key) {
			day = { key, main: [], bluesky: [] };
			days.push(day);
		}
		(item.kind === "bluesky" ? day.bluesky : day.main).push(item);
	}
	return days.map((day) => ({
		key: day.key,
		items: [...day.main, ...day.bluesky.slice(0, BLUESKY_PER_DAY)],
		moreBluesky: Math.max(0, day.bluesky.length - BLUESKY_PER_DAY),
	}));
}

/**
 * Whole days per page, so a day is never split across pages. Each post or
 * work counts as one, and a day's Bluesky posts count as one together; a
 * page closes once it reaches PAGE_SIZE.
 */
function pageOfDays<T extends { items: FeedItem[] }>(days: T[], page: number) {
	let current = 1;
	let size = 0;
	const pageDays: T[] = [];
	for (const [i, day] of days.entries()) {
		if (current === page) pageDays.push(day);
		const main = day.items.filter((item) => item.kind !== "bluesky").length;
		size += main + (main < day.items.length ? 1 : 0);
		if (size >= PAGE_SIZE) {
			if (current === page) return { days: pageDays, hasMore: i < days.length - 1 };
			current++;
			size = 0;
		}
	}
	return { days: pageDays, hasMore: false };
}

/** `?page=` as a positive integer, defaulting to 1. */
export function readPage(url: URL): number {
	const page = Number.parseInt(url.searchParams.get("page") ?? "", 10);
	return Number.isFinite(page) && page > 1 ? page : 1;
}

/** How many related posts a post page shows. */
const RELATED_LIMIT = 3;

/**
 * The posts most like this one: a shared category counts for more than a
 * shared tag, and newer posts win ties (`posts` is newest first).
 */
export async function relatedPostsFor(post: ContentEntry<PostData>, posts: ContentEntry<PostData>[]) {
	const ids = [post, ...posts].map((p) => p.data.id);
	const [categories, tags] = await Promise.all([
		getTermsForEntries("posts", ids, "category"),
		getTermsForEntries("posts", ids, "tag"),
	]);
	const slugs = (terms: Map<string, { slug: string }[]>, id: string) =>
		new Set((terms.get(id) ?? []).map((term) => term.slug));
	const myCategories = slugs(categories, post.data.id);
	const myTags = slugs(tags, post.data.id);
	const group = translationGroupOf(post);

	return posts
		.filter((other) => translationGroupOf(other) !== group)
		.map((other) => ({
			other,
			score:
				2 * [...slugs(categories, other.data.id)].filter((s) => myCategories.has(s)).length +
				[...slugs(tags, other.data.id)].filter((s) => myTags.has(s)).length,
		}))
		.filter(({ score }) => score > 0)
		.sort((a, b) => b.score - a.score)
		.slice(0, RELATED_LIMIT)
		.map(({ other }) => ({
			slug: other.id,
			title: other.data.title,
			date: other.data.publishedAt ?? null,
		}));
}
