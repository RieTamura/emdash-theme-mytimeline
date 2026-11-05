import handler, { createScheduledHandler, PluginBridge } from "@emdash-cms/cloudflare/worker";

export { PluginBridge };

// 管理画面・API と、その画面が読むファイルは移さない（古いアドレスのままの使い道を止めないため）
const KEEP_PREFIXES = ["/_emdash", "/_astro"];

// Astro は /en/... で日本語のページを代わりに出すとき、中身はそのままで状態コードだけ 302 にする。
// 転送先のない 302 はキャッシュに入らず、検索エンジンにも転送と見なされるので、200 に直す
function fixFallbackStatus(response: Response): Response {
	if (response.status !== 302 || response.headers.has("Location")) return response;
	return new Response(response.body, { status: 200, headers: response.headers });
}

// The layout settings change post pages, but saving a plugin's settings purges
// nothing, and those pages stay cached for a day. Local workerd has no cache.purge.
const POST_LAYOUT_SETTINGS = "/_emdash/api/admin/plugins/post-layout/settings";

async function purgePostPages(): Promise<void> {
	// Imported here because a top-level import of this module breaks the build.
	const { cache } = (await import("cloudflare:workers")) as unknown as {
		cache?: { purge?: (options: { tags: string[] }) => Promise<unknown> };
	};
	await cache?.purge?.({ tags: ["posts"] });
}

export default {
	...handler,
	fetch(request, env, ctx) {
		const url = new URL(request.url);
		// EMDASH_SITE_URL に独自ドメインを設定したら、workers.dev のアドレスで来た人をそちらへ移す
		const { EMDASH_SITE_URL: siteUrl } = env as { EMDASH_SITE_URL?: string };
		const siteOrigin = siteUrl ? new URL(siteUrl).origin : null;
		if (
			siteOrigin &&
			siteOrigin !== url.origin &&
			url.hostname.endsWith(".workers.dev") &&
			!KEEP_PREFIXES.some((prefix) => url.pathname.startsWith(prefix))
		) {
			// キャッシュさせない。Cloudflare のキャッシュはアドレスが違っても同じ場所に入るので、
			// 残ると独自ドメインでもこの転送が返り、同じページへの転送がくり返される
			return new Response(null, {
				status: 301,
				headers: {
					Location: `${siteOrigin}${url.pathname}${url.search}`,
					"Cache-Control": "no-store",
					"Cloudflare-CDN-Cache-Control": "no-store",
				},
			});
		}
		return handler.fetch!(request, env, ctx).then((response) => {
			if (request.method === "PUT" && url.pathname === POST_LAYOUT_SETTINGS && response.ok) {
				ctx.waitUntil(purgePostPages().catch((error) => console.error("post-layout purge", error)));
			}
			return fixFallbackStatus(response);
		});
	},
	scheduled: createScheduledHandler(),
} satisfies ExportedHandler;
