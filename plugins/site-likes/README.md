# Site Likes

A login-free like button for an EmDash site. Visitors press a heart; you see the counts in the admin under **Likes**. Visitors never see the numbers.

There is no account, cookie or IP tracking. The visitor's browser remembers what it liked (localStorage) and sends an "unlike" when the heart is pressed again. Clearing site data, or another browser or device, counts again: treat the numbers as a rough signal, not a tally.

The plugin only counts. The button itself belongs to your theme (see below).

## How it works

- `POST /_emdash/api/plugins/site-likes/like` (public) with JSON `{ "collection": "posts", "id": "<entry id>", "action": "like" | "unlike" }`. It counts only published entries in collections that exist. It answers `{ ok: true }` and never returns the count.
- Send the `X-EmDash-Request: 1` header. EmDash rejects cross-site requests without it.
- Counts are stored per entry in the plugin's own storage, keyed `<collection>:<id>`, with the entry's title at the time of the last like.
- The admin page lists the 100 most-liked entries with totals.

## Theme example

```html
<button type="button" class="like-btn" data-like="posts:01ABC…" aria-pressed="false">♡</button>
<script>
	document.addEventListener("click", (event) => {
		const button = event.target.closest(".like-btn");
		if (!button) return;
		const [collection, id] = button.dataset.like.split(":");
		const pressing = button.getAttribute("aria-pressed") !== "true";
		button.setAttribute("aria-pressed", String(pressing));
		fetch("/_emdash/api/plugins/site-likes/like", {
			method: "POST",
			headers: { "Content-Type": "application/json", "X-EmDash-Request": "1" },
			body: JSON.stringify({ collection, id, action: pressing ? "like" : "unlike" }),
		});
	});
</script>
```

Remember liked entries in `localStorage` so the heart shows as pressed on the next visit.

## Capabilities

| Capability     | Why                                                        |
| -------------- | ---------------------------------------------------------- |
| `content:read` | Count only published entries; show their titles in the admin |
| `schema:read`  | Check the collection exists before reading from it         |

## Development

```sh
npm install
npm test        # validate the manifest, then run the tests in the sandbox
npm run build
```
