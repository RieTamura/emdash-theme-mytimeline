# MyTimeline

A timeline-style theme for [EmDash](https://github.com/emdash-cms/emdash) that puts your blog posts, your works, Bluesky and RSS in one feed. It runs on Cloudflare Workers.

[日本語](README_JA.md)

## Features

- **Timeline:** posts and works, grouped by day, with tabs for each kind.
- **Works:** show what you've made, with an image, site and source links, and the stack.
- **Bluesky and RSS (optional):** bring in your own posts and new items from YouTube, note, Zenn and Hatena Blog. Nothing appears until you set them up.
- **Likes:** a heart button that needs no login.
- **Post pages:** choose in the admin where the author card, related posts and updated date go.
- **Search engines:** breadcrumbs, structured data, a sitemap and RSS.
- **Japanese and English:** Japanese is the default, with an English version under `/en`. Entries with no translation show in Japanese. Search finds Japanese words in the middle of a sentence.
- **Light pages:** speed is a policy of this theme, with very little JavaScript in the browser.

It runs on the Cloudflare free plan.

## Get started

You need Node.js and a [Cloudflare account](https://dash.cloudflare.com/sign-up).

### 1. Create the site

```sh
npm create astro@latest -- --template github:RieTamura/emdash-theme-mytimeline
```

Move into the folder it created.

```sh
cd your-folder-name
```

If you see `Dependencies failed to install`, delete the `node_modules` folder and run `npm install`.

### 2. Try it locally (optional)

```sh
npm run dev
```

Open `http://localhost:4321/_emdash/admin` and go through setup.

### 3. Deploy

In `wrangler.jsonc`, change `name` and `bucket_name` to names you like. `name` becomes part of the site's address.

```sh
npx wrangler login
npm run deploy
```

The first deploy creates the database and other resources. Open `/_emdash/admin` on the address it prints and finish setup right away.

The first deploy also writes the D1 and KV IDs into `wrangler.jsonc`. Keep them, so later deploys use the same resources.

**If you see `has reached the Workers Free limit of 5 cron triggers`:** the free plan allows 5 cron triggers per account. Your site is live, but its cron isn't registered. If you want Bluesky and RSS imports or scheduled posts, free a slot by removing a cron from another Worker, then deploy again. If you don't, remove `triggers` from `wrangler.jsonc` and the error goes away.

### 4. Set the site's address

**If you skip this, images are delivered at full size and pages get slow.**

In `wrangler.jsonc`, uncomment the `EMDASH_SITE_URL` line, enter your site's address, and deploy again.

```jsonc
"vars": {
	"EMDASH_SITE_URL": "https://mytimeline.your-name.workers.dev",
},
```

```sh
npm run deploy
```

### 5. Make it yours

The sample post 「サイトを公開したら最初にやること」 walks through the site name, profile, removing the samples and registering with search engines.

## Use your own domain

1. In `wrangler.jsonc`, uncomment the `routes` line and enter your domain.
2. Change `EMDASH_SITE_URL` to the new domain.
3. Run `npm run deploy`.
4. Follow EmDash's [guide to moving domains](https://docs.emdashcms.com/guides/change-domain/) to change the Site URL in the admin.

**Passkeys from the old address stop working after the move,** so register a new one on the new domain. Once `EMDASH_SITE_URL` is set, visitors to the `workers.dev` address are redirected to your domain. The admin isn't redirected.

## Use Bluesky and RSS

Open each plugin's settings under **Plugins** in the admin.

| Plugin | Setting | Imports |
|---|---|---|
| Bluesky To EmDash | Your handle, such as `name.bsky.social` | Every 5 minutes |
| RSS Feed To EmDash | Feed URLs, one per line | Every 30 minutes |

RSS can read YouTube, note, Zenn and Hatena Blog only. New items can take up to about 20 minutes to reach the home page.

## Post articles to Bluesky automatically (optional)

Bluesky To EmDash, above, brings posts from Bluesky to your site. To go the other way and post to Bluesky when you publish an article, add [EmDash To Bluesky](https://github.com/RieTamura/EmDash-To-Bluesky). It posts the title, link and a card with the featured image, once.

This theme doesn't include it. On the free plan, install it from GitHub:

```sh
npm install github:RieTamura/EmDash-To-Bluesky
```

Add it to `plugins` in `astro.config.mjs` and deploy:

```js
import blueskyShare from "bluesky-share";

// ...
plugins: [blueskyFeed, rssFeed, siteLikes, postLayout, blueskyShare],
```

It needs `EMDASH_ENCRYPTION_KEY` and a Bluesky app password. The plugin's [README](https://github.com/RieTamura/EmDash-To-Bluesky) has the steps.

If you also use Bluesky To EmDash, the posts it makes appear in your site's Bluesky tab too.

## Make it faster

On a site with few visitors, more page views miss the cache. They're slower when the Worker runs far from the database.

Check your D1 database's region in the Cloudflare dashboard. If it's near Japan (Asia-Pacific), uncomment this line in `wrangler.jsonc` and deploy.

```jsonc
"placement": { "mode": "targeted", "region": "aws:ap-northeast-1" },
```

On the author's site, the server's work on an uncached home page went from 0.9 seconds or more to 0.35 seconds or less. For another region, use a nearby [cloud region code](https://developers.cloudflare.com/workers/configuration/placement/). Don't combine this with D1 read replication.

## Change the design

Edit the colours in `src/styles/theme.css`. `light-dark(light, dark)` sets both modes. Keep text contrast at 4.5:1 or more.

Fonts are set under `fonts` in `astro.config.mjs`.

## Good to know

- **Updates:** the theme's files become yours when you create the site, so changes to this repository don't reach it automatically.
- **Image limit:** Cloudflare Images' free tier covers 5,000 unique transformations a month, as of the author's check. Past that, new image sizes can't be created.
- **Search:** Japanese search reads all your published posts and works. It's meant for up to a few hundred entries.
- **Comments:** this theme has no comments.
- **Automatic thumbnails:** if you write in Obsidian with [Post To EmDash](https://github.com/RieTamura/Post-To-EmDash), you can add [Auto Thumbnail Design](https://github.com/RieTamura/Auto-Thumbnail).

## License

[MIT](LICENSE)
