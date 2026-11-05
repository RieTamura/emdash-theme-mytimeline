import { getEmDashEntry } from "emdash";

/** Resolved media reference from getSiteSettings() */
export interface MediaReference {
	mediaId: string;
	alt?: string;
	url?: string;
}

export interface BlogSiteIdentitySettings {
	title?: string;
	tagline?: string;
	logo?: MediaReference;
	favicon?: MediaReference;
}

const DEFAULT_SITE_TITLE = "My Blog";
const DEFAULT_SITE_TAGLINE = "Thoughts, stories, and ideas.";

export function resolveBlogSiteIdentity(settings?: BlogSiteIdentitySettings) {
	return {
		siteTitle: settings?.title ?? DEFAULT_SITE_TITLE,
		siteTagline: settings?.tagline ?? DEFAULT_SITE_TAGLINE,
		siteLogo: settings?.logo?.url ? settings.logo : null,
	};
}

/** Where the "プロフィール" buttons point. */
export const PROFILE_URL = "/pages/about";

/**
 * Whether the profile page exists. A site set up without the sample content
 * has none until the owner makes it, so nothing should link there yet.
 */
export async function loadProfilePage() {
	const { entry, cacheHint } = await getEmDashEntry("pages", "about", { locale: "ja" });
	return { exists: !!entry, cacheHint };
}
