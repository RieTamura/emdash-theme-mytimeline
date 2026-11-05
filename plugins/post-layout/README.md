# Post Layout

Choose where three things appear on post pages: the author card, related posts and the updated date. Open the plugin's settings in the EmDash admin and pick a position. The framed cards (the author card, and previous and next posts) also have a background choice.

Apart from that hook (see below), the plugin only keeps the choices. The site's post page reads them with `getPluginSettings("post-layout")` and draws the parts.

The Worker in `src/worker.ts` purges cached post pages when the settings are saved.

It also adds the author's profile URL to the post's structured data (`BlogPosting`), through the `page:metadata` hook. EmDash's own version has only the author's name.
