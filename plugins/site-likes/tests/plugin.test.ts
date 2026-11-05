import { afterEach, describe, expect, it } from "vitest";

import { createPluginRuntimeTestHost, type PluginRuntimeTestHost } from "@emdash-cms/plugin-test";

let host: PluginRuntimeTestHost | undefined;

afterEach(async () => {
	await host?.dispose();
	host = undefined;
});

async function setup() {
	host = await createPluginRuntimeTestHost();
	await host.fixtures.collection({
		slug: "posts",
		label: "Posts",
		supports: ["drafts", "revisions"],
		fields: [{ slug: "title", label: "Title", type: "string" }],
	});
	const published = await host.fixtures.content("posts", {
		slug: "hello",
		status: "published",
		data: { title: "Hello" },
	});
	const draft = await host.fixtures.content("posts", {
		slug: "draft",
		status: "draft",
		data: { title: "Draft" },
	});
	return { h: host, published, draft };
}

/** Sends a like the way a visitor's browser does: a public POST, no login. */
async function press(h: PluginRuntimeTestHost, body: unknown) {
	const response = await h.actions.routes.request("like", { method: "POST", body });
	return { status: response.status, body: (await response.json()) as { data?: unknown } };
}

describe("like", () => {
	it("counts likes per entry and never returns the count", async () => {
		const { h, published } = await setup();

		const first = await press(h, { collection: "posts", id: published.id });
		await press(h, { collection: "posts", id: published.id, action: "like" });

		expect(first.status).toBe(200);
		expect(first.body.data).toEqual({ ok: true });
		expect(await h.inspect.storage.get("counts", `posts:${published.id}`)).toMatchObject({
			collection: "posts",
			id: published.id,
			title: "Hello",
			count: 2,
		});
	});

	it("takes a like back, never below zero", async () => {
		const { h, published } = await setup();
		await press(h, { collection: "posts", id: published.id });
		await press(h, { collection: "posts", id: published.id, action: "unlike" });
		await press(h, { collection: "posts", id: published.id, action: "unlike" });

		expect(await h.inspect.storage.get("counts", `posts:${published.id}`)).toMatchObject({ count: 0 });
	});

	it("ignores drafts, unknown entries and unknown collections", async () => {
		const { h, draft } = await setup();

		expect((await press(h, { collection: "posts", id: draft.id })).body.data).toEqual({
			ok: false,
			error: "NOT_FOUND",
		});
		expect((await press(h, { collection: "posts", id: "01NOSUCHENTRY" })).body.data).toEqual({
			ok: false,
			error: "NOT_FOUND",
		});
		expect((await press(h, { collection: "nope", id: draft.id })).body.data).toEqual({
			ok: false,
			error: "NOT_FOUND",
		});
		expect(await h.inspect.storage.list("counts")).toHaveLength(0);
	});

	it("rejects malformed input", async () => {
		const { h, published } = await setup();
		for (const body of [
			null,
			{},
			{ collection: "Posts!", id: published.id },
			{ collection: "posts", id: "../etc" },
			{ collection: "posts", id: published.id, action: "love" },
		]) {
			expect((await press(h, body)).body.data).toEqual({ ok: false, error: "INVALID_INPUT" });
		}
	});
});

describe("admin page", () => {
	it("lists liked entries, most liked first", async () => {
		const { h, published } = await setup();
		const other = await h.fixtures.content("posts", {
			slug: "other",
			status: "published",
			data: { title: "Other" },
		});
		await press(h, { collection: "posts", id: published.id });
		await press(h, { collection: "posts", id: other.id });
		await press(h, { collection: "posts", id: other.id });

		const page = await h.admin.loadPage("/likes");
		const table = page.blocks.find((block) => block.type === "table") as unknown as {
			rows: Array<{ title: string; collection: string; count: number }>;
		};
		expect(table.rows.map((row) => [row.title, row.collection, row.count])).toEqual([
			["Other", "Posts", 2],
			["Hello", "Posts", 1],
		]);
		const stats = page.blocks.find((block) => block.type === "stats") as unknown as {
			items: Array<{ value: string }>;
		};
		expect(stats.items.map((item) => item.value)).toEqual(["3", "2"]);
	});

	it("uses the language setting over the admin's language", async () => {
		const { h } = await setup();
		await h.fixtures.plugin.setting("language", "ja");

		const page = await h.admin.loadPage("/likes", { locale: "en" });

		expect(page.blocks[0]).toMatchObject({ type: "header", text: "いいね" });
	});

	it("speaks Japanese in a Japanese admin", async () => {
		const { h, published } = await setup();
		await press(h, { collection: "posts", id: published.id });

		const page = await h.admin.loadPage("/likes", { locale: "ja" });

		expect(page.blocks[0]).toMatchObject({ type: "header", text: "いいね" });
		const table = page.blocks.find((block) => block.type === "table") as unknown as {
			columns: Array<{ label: string }>;
			rows: Array<{ updatedAt: string }>;
			empty_text: string;
		};
		expect(table.columns.map((column) => column.label)).toEqual(["記事", "種類", "いいね", "最後に押された"]);
		expect(table.rows[0]?.updatedAt).toBe("たった今");
		expect(table.empty_text).toBe("まだいいねはありません。");
	});
});
