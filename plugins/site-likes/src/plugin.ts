import type { StorageCollection } from "emdash";
import type { PluginContext, SandboxedPlugin } from "emdash/plugin";

/**
 * A login-free like button. Visitors' browsers remember what they liked
 * and send an "unlike" on the second press; the plugin only keeps a count
 * per entry, which the admin "Likes" page lists. Counts are never sent to
 * visitors.
 */

/** One liked entry, keyed "<collection>:<id>". */
interface LikeCount {
	collection: string;
	id: string;
	/** The entry's title when it was last liked, for the admin list. */
	title: string;
	count: number;
	updatedAt: string;
}

type LikeInput = { collection: string; id: string; action: "like" | "unlike" };

type LikeResult = { ok: true } | { ok: false; error: "INVALID_INPUT" | "NOT_FOUND" };

const COLLECTION_PATTERN = /^[a-z][a-z0-9_]{0,63}$/;
const ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;
/** How many liked entries the admin page lists. */
const ADMIN_LIMIT = 100;

function parseLikeInput(input: unknown): LikeInput | null {
	if (typeof input !== "object" || input === null) return null;
	const { collection, id, action = "like" } = input as Record<string, unknown>;
	if (typeof collection !== "string" || !COLLECTION_PATTERN.test(collection)) return null;
	if (typeof id !== "string" || !ID_PATTERN.test(id)) return null;
	if (action !== "like" && action !== "unlike") return null;
	return { collection, id, action };
}

function countsOf(ctx: PluginContext) {
	return ctx.storage.counts as StorageCollection<LikeCount>;
}

/** The entry's title if it is published, so likes can't pile up on drafts or made-up ids. */
async function publishedTitle(ctx: PluginContext, collection: string, id: string) {
	// Reading from a collection that doesn't exist makes the host log a database error.
	if (!(await ctx.schema!.getCollection(collection))) return null;
	try {
		const item = await ctx.content!.get(collection, id);
		if (!item || item.status !== "published") return null;
		const title = item.data.title;
		return typeof title === "string" && title.trim() ? title.trim() : (item.slug ?? id);
	} catch {
		return null;
	}
}

async function like(ctx: PluginContext, input: LikeInput): Promise<LikeResult> {
	const title = await publishedTitle(ctx, input.collection, input.id);
	if (title === null) return { ok: false, error: "NOT_FOUND" };

	const counts = countsOf(ctx);
	const key = `${input.collection}:${input.id}`;
	const updatedAt = new Date().toISOString();

	if (input.action === "unlike") {
		await counts.updateIf(key, {
			where: { count: { gte: 1 } },
			delta: { count: { dec: 1 } },
			set: { updatedAt },
		});
		return { ok: true };
	}

	// Increment in place; the first like creates the record. Two first likes
	// at once: one creates, the other retries the increment.
	for (let attempt = 0; attempt < 3; attempt++) {
		const bumped = await counts.updateIf(key, {
			where: {},
			delta: { count: { inc: 1 } },
			set: { title, updatedAt },
		});
		if (bumped.applied) return { ok: true };
		const created = await counts.compareAndSet(key, null, {
			collection: input.collection,
			id: input.id,
			title,
			count: 1,
			updatedAt,
		});
		if (created.applied) return { ok: true };
	}
	return { ok: true };
}

/** Admin page text. The admin tells the route its language; anything not Japanese gets English. */
const ADMIN_TEXT = {
	en: {
		title: "Likes",
		note: "Hearts pressed on the site. Visitors don't see these numbers. One browser counts once per entry; another browser or device counts again.",
		total: "Total likes",
		entries: "Liked entries",
		entry: "Entry",
		collection: "Collection",
		likes: "Likes",
		updated: "Last change",
		empty: "No likes yet.",
	},
	ja: {
		title: "いいね",
		note: "サイトで押されたハートの数です。訪問者には表示されません。同じブラウザからは1つの記事に1回だけ数えます（別のブラウザや端末からなら、また数えます）。",
		total: "いいねの合計",
		entries: "いいねされた記事",
		entry: "記事",
		collection: "種類",
		likes: "いいね",
		updated: "最後に押された",
		empty: "まだいいねはありません。",
	},
};

/**
 * "36分前" / "36 minutes ago". The table's built-in relative_time format
 * is English only, so the page writes the text itself.
 */
function timeAgo(iso: string, japanese: boolean, now = Date.now()): string {
	const seconds = Math.max(0, Math.round((now - Date.parse(iso)) / 1000));
	const steps: Array<[number, string, string]> = [
		[60, "秒", "second"],
		[60, "分", "minute"],
		[24, "時間", "hour"],
		[30, "日", "day"],
		[12, "か月", "month"],
		[Number.POSITIVE_INFINITY, "年", "year"],
	];
	let value = seconds;
	for (const [size, ja, en] of steps) {
		if (value < size) {
			if (en === "second" && value < 60) return japanese ? "たった今" : "just now";
			return japanese ? `${value}${ja}前` : `${value} ${en}${value === 1 ? "" : "s"} ago`;
		}
		value = Math.floor(value / size);
	}
	return iso;
}

async function likesPage(ctx: PluginContext, adminLocale: string | undefined) {
	// The "language" setting wins; "auto" (the default) follows the admin.
	const setting = await ctx.settings.get<string>("language");
	const locale = setting === "ja" || setting === "en" ? setting : adminLocale;
	const japanese = locale?.toLowerCase().startsWith("ja") ?? false;
	const text = japanese ? ADMIN_TEXT.ja : ADMIN_TEXT.en;
	const { items } = await countsOf(ctx).query({
		where: { count: { gte: 1 } },
		orderBy: { count: "desc" },
		limit: ADMIN_LIMIT,
	});
	const total = items.reduce((sum, item) => sum + item.data.count, 0);

	// Show each collection by its admin label ("Blog") rather than its slug ("posts").
	const slugs = [...new Set(items.map((item) => item.data.collection))];
	const labels = new Map(
		await Promise.all(
			slugs.map(async (slug) => {
				const info = await ctx.schema!.getCollection(slug).catch(() => null);
				return [slug, info?.label ?? slug] as const;
			}),
		),
	);

	return {
		blocks: [
			{ type: "header", text: text.title },
			{ type: "context", text: text.note },
			{
				type: "stats",
				items: [
					{ label: text.total, value: String(total) },
					{ label: text.entries, value: String(items.length) },
				],
			},
			{
				type: "table",
				page_action_id: "likes_page",
				columns: [
					{ key: "title", label: text.entry },
					{ key: "collection", label: text.collection, format: "badge" },
					{ key: "count", label: text.likes, format: "number" },
					{ key: "updatedAt", label: text.updated },
				],
				rows: items.map(({ data }) => ({
					title: data.title,
					collection: labels.get(data.collection) ?? data.collection,
					count: data.count,
					updatedAt: timeAgo(data.updatedAt, japanese),
				})),
				empty_text: text.empty,
			},
		],
	};
}

const plugin: SandboxedPlugin = {
	routes: {
		// Public: called by the heart button. Returns no count on purpose.
		like: {
			public: true,
			methods: ["POST"],
			handler: async (routeCtx, ctx): Promise<LikeResult> => {
				const input = parseLikeInput(routeCtx.input);
				if (!input) return { ok: false, error: "INVALID_INPUT" };
				return like(ctx, input);
			},
		},
		// Admin page (default `plugins:manage` permission).
		admin: {
			handler: async (routeCtx, ctx) => likesPage(ctx, routeCtx.ui?.locale),
		},
	},
};

export default plugin;
