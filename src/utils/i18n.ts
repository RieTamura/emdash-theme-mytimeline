/**
 * Language support. Japanese is the default and lives at the root (/posts);
 * English mirrors every page under /en (/en/posts). Astro's i18n fallback
 * renders the same page files for both, so pages read the language from
 * the URL and pick their strings from `ui` below.
 */

export type Lang = "ja" | "en";

export const LANGS: Lang[] = ["ja", "en"];

/** Name of each language, written in that language (for the switcher). */
export const LANG_NAMES: Record<Lang, string> = {
	ja: "日本語",
	en: "English",
};

const EN_PREFIX = /^\/en(?=\/|$)/;

/** The page's language: English under /en, Japanese everywhere else. */
export function getLang(astro: {
	currentLocale?: string;
	originPathname?: string;
}): Lang {
	if (astro.currentLocale === "en") return "en";
	return EN_PREFIX.test(astro.originPathname ?? "") ? "en" : "ja";
}

/** Paths that exist once for the whole site, whatever the language. */
function isSharedPath(path: string): boolean {
	return path.startsWith("/_emdash") || path === "/rss.xml";
}

/** A site path in the given language: "/posts" → "/en/posts" for English. */
export function localizePath(path: string, lang: Lang): string {
	if (lang === "ja" || !path.startsWith("/") || path.startsWith("//")) return path;
	if (isSharedPath(path) || EN_PREFIX.test(path)) return path;
	return path === "/" ? "/en" : `/en${path}`;
}

/** The Japanese (unprefixed) form of a site path. */
export function stripLangPrefix(path: string): string {
	return path.replace(EN_PREFIX, "") || "/";
}

/**
 * Dates are shown in Japan time on every page. The server runs in UTC, so
 * without this a post written before 9am would show the day before.
 */
export const TIME_ZONE = "Asia/Tokyo";

/** Dates like "2026年10月25日" / "October 25, 2026". */
export function formatDate(date: Date, lang: Lang, month: "long" | "short" = "long") {
	return date.toLocaleDateString(lang === "en" ? "en-US" : "ja-JP", {
		year: "numeric",
		month,
		day: "numeric",
		timeZone: TIME_ZONE,
	});
}

/** Time of day like "14:05" / "2:05 PM". */
export function formatTime(date: Date, lang: Lang) {
	return date.toLocaleTimeString(lang === "en" ? "en-US" : "ja-JP", {
		hour: "numeric",
		minute: "2-digit",
		timeZone: TIME_ZONE,
	});
}

/** Month divider label: "2026年10月" / "October 2026". */
export function monthLabel(date: Date, lang: Lang): string {
	return date.toLocaleDateString(lang === "en" ? "en-US" : "ja-JP", {
		year: "numeric",
		month: "long",
		timeZone: TIME_ZONE,
	});
}

/** The calendar day a date falls on in Japan, as "2026-10-25", for grouping. */
export function dayKey(date: Date): string {
	return date.toLocaleDateString("en-CA", { timeZone: TIME_ZONE });
}

/**
 * English names for the menu items the site ships with, used while the
 * menu has no English version in the admin. Keyed by where they point.
 */
export const DEFAULT_MENU_LABELS_EN: Record<string, string> = {
	"/": "Timeline",
	"/posts": "Blog",
	"/works": "Works",
	"/pages/about": "Profile",
};

const ja = {
	skipToContent: "本文へ移動",
	backToTop: "ページの先頭へ戻る",
	menu: "メニュー",
	chooseLanguage: "言語を選ぶ",
	close: "閉じる",
	sidebar: "サイドバー",
	mainMenu: "メインメニュー",
	admin: "管理画面",
	language: "言語",
	rssFollow: "RSS でフォロー",
	rssTitle: (site: string) => `${site} の RSS フィード`,
	madeWith: "で作成",
	linkCopied: "リンクをコピーしました",
	copyFailed: "コピーできませんでした",

	homeDescription: "ブログと作ったサイトやサービスの紹介",
	postsDescription: "ブログ記事の一覧",
	worksDescription: "作ったサイトやサービスの一覧",
	blueskyDescription: "Bluesky に投稿したことの一覧",

	searchSite: "サイト内を検索",
	searchSiteLabel: "サイト内",
	searchPlaceholder: "キーワード",
	searching: "検索中…",
	noResults: "見つかりませんでした",

	authorHeading: "この記事を書いた人",
	relatedPosts: "関連記事",
	updatedOn: (date: string) => `${date} 更新`,
	breadcrumbHome: "ホーム",
	breadcrumbLabel: "パンくずリスト",

	tabsLabel: "表示の切り替え",
	tabAll: "すべて",
	tabPosts: "ブログ",
	tabWorks: "作ったもの",
	tabBluesky: "Bluesky",
	profile: "プロフィール",
	postCount: "記事",
	workCount: "作ったもの",

	emptyAll: "まだ投稿がありません",
	emptyPosts: "まだ記事がありません",
	emptyWorks: "まだ作ったものがありません",
	emptyBluesky: "まだ Bluesky の投稿がありません",
	emptyText: "公開した記事や作ったものがここに並びます。",
	noOlder: "これより前の投稿はありません",
	reachedEnd: "最後まで表示しました。",
	backToLatest: "最新の投稿に戻る",
	newerPosts: "新しい投稿に戻る",
	olderPosts: "もっと前の投稿を見る",
	pagination: "ページ送り",

	untitled: "無題",
	work: "作ったもの",
	workPublished: "作ったものを公開しました。",
	blueskyPost: "Bluesky の投稿",
	viewOnBluesky: "Bluesky で見る",
	watchOnYouTube: "YouTube で見る",
	videos: "動画",
	// "Zenn で読む" but "はてなブログで読む"
	readOn: (service: string) => `${service}${/[A-Za-z]$/.test(service) ? " " : ""}で読む`,
	hatenaBlog: "はてなブログ",
	moreOnBluesky: (n: number) => `残り ${n} 件を Bluesky タブで見る`,
	blueskyLikes: "Bluesky のいいね数",
	like: "いいね",
	likeTitle: (title: string) => `「${title}」にいいね`,
	readMore: "続きを読む",
	listSeparator: " ・ ",
	share: "シェア",
	copyLink: "リンクをコピー",
	shareTitle: (title: string) => `「${title}」をシェア`,
	copyLinkTitle: (title: string) => `「${title}」のリンクをコピー`,

	backToTimeline: "タイムラインに戻る",
	post: "投稿",
	page: "タイムライン",
	readingTime: (minutes: number) => `${minutes}分で読めます`,
	tags: "タグ",
	morePosts: "前後の投稿",
	newerPost: "新しい投稿",
	olderPost: "前の投稿",
	toc: "目次",
	onlyInJapanese: "",

	backToWorks: "作ったもの一覧に戻る",
	builtWith: "使用技術",
	visitSite: "サイトを見る",
	sourceCode: "ソースコード",

	categories: "カテゴリー",
	category: "カテゴリー",
	tag: "タグ",
	countUnit: "件",
	backToBlog: "ブログに戻る",
	viewBlog: "ブログを見る",
	termTitle: (label: string) => `「${label}」の記事`,
	termDescription: (noun: string, label: string) => `${noun}「${label}」の記事一覧`,
	termLead: (label: string) => `「${label}」の記事を新しい順に並べています。`,

	search: "検索",
	searchHeading: "何をお探しですか？",
	searchFormLabel: "サイト内検索",
	searchInputPlaceholder: "キーワードを入力",
	searchResultsTitle: (query: string) => `「${query}」の検索結果`,
	searchHint: "記事と作ったもののタイトル・本文から探せます。",
	searchHintLink: "記事一覧",
	searchHintAfter: "から見ることもできます。",
	searchSummary: (query: string) => `「${query}」の検索結果：`,
	resultCount: (n: number) => `${n} 件`,
	topResultCount: (n: number) => `上位 ${n} 件`,
	allPosts: "記事一覧",
	viewAllPosts: "記事一覧を見る",
	noMatch: (query: string) => `「${query}」に一致するものは見つかりませんでした`,
	noMatchHint: "言葉を変えたり減らしたりして、もう一度検索してみてください。",

	notFoundTitle: "ページが見つかりません",
	notFoundCode: "404 エラー",
	notFoundText: "お探しのページは存在しないか、移動した可能性があります。",
	backHome: "タイムラインへ戻る",
	searchByKeyword: "キーワードで検索",
};

export type UIStrings = typeof ja;

const en: UIStrings = {
	skipToContent: "Skip to content",
	backToTop: "Back to top",
	menu: "Menu",
	chooseLanguage: "Choose a language",
	close: "Close",
	sidebar: "Sidebar",
	mainMenu: "Main menu",
	admin: "Admin",
	language: "Language",
	rssFollow: "Follow via RSS",
	rssTitle: (site) => `${site} RSS feed`,
	madeWith: "",
	linkCopied: "Link copied",
	copyFailed: "Couldn't copy the link",

	homeDescription: "Blog posts and the sites and services I have made",
	postsDescription: "All blog posts",
	worksDescription: "The sites and services I have made",
	blueskyDescription: "My posts on Bluesky",

	searchSite: "Search this site",
	searchSiteLabel: "Site",
	searchPlaceholder: "Keywords",
	searching: "Searching…",
	noResults: "No results",

	authorHeading: "About the author",
	relatedPosts: "Related posts",
	updatedOn: (date) => `Updated ${date}`,
	breadcrumbHome: "Home",
	breadcrumbLabel: "Breadcrumb",

	tabsLabel: "Switch view",
	tabAll: "All",
	tabPosts: "Blog",
	tabWorks: "Works",
	tabBluesky: "Bluesky",
	profile: "Profile",
	postCount: "posts",
	workCount: "works",

	emptyAll: "Nothing here yet",
	emptyPosts: "No posts yet",
	emptyWorks: "No works yet",
	emptyBluesky: "No Bluesky posts yet",
	emptyText: "Published posts and works will show up here.",
	noOlder: "No older posts",
	reachedEnd: "You've reached the end.",
	backToLatest: "Back to the latest posts",
	newerPosts: "Newer posts",
	olderPosts: "Older posts",
	pagination: "Pagination",

	untitled: "Untitled",
	work: "Work",
	workPublished: "Published a new work.",
	blueskyPost: "Bluesky post",
	viewOnBluesky: "View on Bluesky",
	watchOnYouTube: "Watch on YouTube",
	videos: "Videos",
	readOn: (service: string) => `Read on ${service}`,
	hatenaBlog: "Hatena Blog",
	moreOnBluesky: (n) => `See ${n} more on the Bluesky tab`,
	blueskyLikes: "Likes on Bluesky",
	like: "Like",
	likeTitle: (title) => `Like “${title}”`,
	readMore: "Read more",
	listSeparator: " · ",
	share: "Share",
	copyLink: "Copy link",
	shareTitle: (title) => `Share “${title}”`,
	copyLinkTitle: (title) => `Copy link to “${title}”`,

	backToTimeline: "Back to the timeline",
	post: "Post",
	page: "Timeline",
	readingTime: (minutes) => `${minutes} min read`,
	tags: "Tags",
	morePosts: "More posts",
	newerPost: "Newer",
	olderPost: "Older",
	toc: "Contents",
	onlyInJapanese: "This page is only available in Japanese for now.",

	backToWorks: "Back to works",
	builtWith: "Built with",
	visitSite: "Visit site",
	sourceCode: "Source code",

	categories: "Categories",
	category: "Category",
	tag: "Tag",
	countUnit: " posts",
	backToBlog: "Back to the blog",
	viewBlog: "Go to the blog",
	termTitle: (label) => `Posts in “${label}”`,
	termDescription: (noun, label) => `All posts in the ${noun.toLowerCase()} “${label}”`,
	termLead: (label) => `Posts in “${label}”, newest first.`,

	search: "Search",
	searchHeading: "What are you looking for?",
	searchFormLabel: "Search this site",
	searchInputPlaceholder: "Enter keywords",
	searchResultsTitle: (query) => `Search results for “${query}”`,
	searchHint: "Searches the titles and text of posts and works. You can also browse ",
	searchHintLink: "all posts",
	searchHintAfter: ".",
	searchSummary: (query) => `Results for “${query}”: `,
	resultCount: (n) => `${n} ${n === 1 ? "result" : "results"}`,
	topResultCount: (n) => `top ${n} results`,
	allPosts: "All posts",
	viewAllPosts: "See all posts",
	noMatch: (query) => `Nothing matched “${query}”`,
	noMatchHint: "Try different or fewer words.",

	notFoundTitle: "Page not found",
	notFoundCode: "404 error",
	notFoundText: "The page you're looking for doesn't exist or has moved.",
	backHome: "Back to the timeline",
	searchByKeyword: "Search by keyword",
};

export const ui: Record<Lang, UIStrings> = { ja, en };
