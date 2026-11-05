import { getPluginSettings } from "emdash";

/**
 * Where the author card, related posts and updated date go on a post page,
 * chosen in the admin (the post-layout plugin). Nothing is stored until the
 * form is first saved, and the plugin may be removed, so each has a default.
 */
function choice<T extends string>(value: unknown, options: readonly T[], fallback: T): T {
	return options.includes(value as T) ? (value as T) : fallback;
}

/**
 * Backgrounds a framed card can have. Each keeps the muted text at 4.5:1 or
 * better in both colour schemes; --color-fill-strong doesn't, so it isn't here.
 */
const CARD_BACKGROUNDS = {
	surface: "var(--color-surface)",
	fill: "var(--color-fill)",
	mint: "var(--color-cat-mint-soft)",
	butter: "var(--color-cat-butter-soft)",
} as const;

function background(value: unknown) {
	return CARD_BACKGROUNDS[choice(value, Object.keys(CARD_BACKGROUNDS) as (keyof typeof CARD_BACKGROUNDS)[], "surface")];
}

export async function getPostLayout() {
	const settings = await getPluginSettings("post-layout").catch(
		() => ({}) as Record<string, unknown>,
	);
	return {
		author: choice(settings.authorPosition, ["after", "before", "sidebar", "off"], "after"),
		related: choice(settings.relatedPosition, ["after", "sidebar", "off"], "after"),
		updated: choice(settings.updatedPosition, ["dateline", "after", "off"], "dateline"),
		authorBackground: background(settings.authorBackground),
		aroundBackground: background(settings.aroundBackground),
	};
}
