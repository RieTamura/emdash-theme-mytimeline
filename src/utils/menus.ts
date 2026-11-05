import { getMenuWithCacheHint, type CacheHint, type MenuItem } from "emdash";
import { DEFAULT_MENU_LABELS_EN, localizePath, type Lang } from "./i18n";

/**
 * A menu's items for the page's language, with site links pointing at
 * that language's pages.
 *
 * English pages use the menu's English version when one has been made in
 * the admin (メニュー > translate). Until then they reuse the Japanese menu,
 * renaming the items the site ships with (タイムライン → Timeline, ...).
 */
export async function getLocalizedMenu(
	name: string,
	lang: Lang,
): Promise<{ items: MenuItem[]; cacheHints: CacheHint[] }> {
	const english = lang === "en" ? await getMenuWithCacheHint(name, { locale: "en" }) : null;
	const useEnglish = english?.data?.locale === "en";
	const source = useEnglish ? english : await getMenuWithCacheHint(name, { locale: "ja" });

	const items = (source?.data?.items ?? []).map((item) => {
		const path = item.url.replace(/(?<=.)\/$/, "");
		const label =
			lang === "en" && !useEnglish ? (DEFAULT_MENU_LABELS_EN[path] ?? item.label) : item.label;
		return { ...item, label, url: localizePath(item.url, lang) };
	});

	return {
		items,
		cacheHints: [english?.cacheHint, source?.cacheHint].filter(
			(hint): hint is CacheHint => !!hint,
		),
	};
}
