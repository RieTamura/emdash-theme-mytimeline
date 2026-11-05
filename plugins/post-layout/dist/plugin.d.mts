import { SandboxedPlugin } from "emdash/plugin";

//#region src/plugin.d.ts
/**
 * Most of the plugin only keeps choices for the settings form EmDash builds
 * from `admin.settingsSchema`; the site reads them with
 * getPluginSettings("post-layout").
 *
 * The hook replaces EmDash's own BlogPosting, whose author has a name but no
 * url. The id "primary" is what makes it a replacement: the first contribution
 * with an id wins, and plugins come first. If the hook fails, EmDash's own
 * still appears. Keep the fields in step with buildBlogPostingJsonLd in EmDash.
 */
declare const plugin: SandboxedPlugin;
//#endregion
export { plugin as default };