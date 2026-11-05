# MyTimeline

ブログ、作ったもの、Bluesky、RSS をひとつのタイムラインにまとめる、[EmDash](https://github.com/emdash-cms/emdash) のテーマです。Cloudflare Workers で動きます。

[English](README.md)

## できること

- **タイムライン：** 記事と作ったものを日付ごとに並べます。タブで種類を切り替えられます。
- **作ったものの紹介：** 画像、サイトの URL、ソースコードの URL、使った技術を載せられます。
- **Bluesky と RSS（任意）：** 自分の投稿や、YouTube、note、Zenn、はてなブログの新しい項目を自動で取り込みます。設定しなければ何も表示されません。
- **いいね：** ログインなしで押せるハートのボタンです。
- **記事のページ：** 「この記事を書いた人」、関連記事、更新日の場所を管理画面で選べます。
- **検索エンジン向け：** パンくず、構造化データ、サイトマップ、RSS を備えています。
- **日本語と英語：** 日本語が既定で、`/en` に英語版があります。翻訳がない記事は日本語で表示します。日本語は文の途中の語でも検索できます。
- **軽さ：** 表示の速さを方針にしています。ブラウザーで動く JavaScript はごくわずかです。

Cloudflare の無料プランで動きます。

## 始め方

Node.js と [Cloudflare のアカウント](https://dash.cloudflare.com/sign-up)が必要です。

### 1. 作る

```sh
npm create astro@latest -- --template github:RieTamura/emdash-theme-mytimeline
```

作ったフォルダーに移動します。

```sh
cd フォルダーの名前
```

`Dependencies failed to install` と出たときは、`node_modules` フォルダーを削除してから `npm install` を実行してください。

### 2. 手元で試す（省略できます）

```sh
npm run dev
```

`http://localhost:4321/_emdash/admin` を開き、初期設定を進めます。

### 3. 公開する

`wrangler.jsonc` の `name` と `bucket_name` を好きな名前に変えます。`name` は公開先の URL に使われます。

```sh
npx wrangler login
npm run deploy
```

データベースなどは、最初のデプロイで自動で作られます。表示された URL の `/_emdash/admin` を開いて、初期設定を進めてください。初期設定は、公開したらすぐに終えてください。

最初のデプロイで、`wrangler.jsonc` に D1 と KV の ID が書き込まれます。次のデプロイでも同じものを使うために、消さずに残してください。

**`has reached the Workers Free limit of 5 cron triggers` と出たとき：** 無料プランの定期実行は、アカウント全体で 5 個までです。サイトは公開されていますが、定期実行だけが登録されていません。Bluesky と RSS の取り込み、予約投稿を使うなら、ほかの Worker の定期実行を止めて枠を空け、もう一度デプロイしてください。使わないなら、`wrangler.jsonc` の `triggers` を消すとエラーが出なくなります。

### 4. サイトの URL を設定する

**この手順を飛ばすと、画像が原寸のまま届いて表示が遅くなります。**

`wrangler.jsonc` の `EMDASH_SITE_URL` の行のコメントを外し、サイトの URL を書いて、デプロイし直します。

```jsonc
"vars": {
	"EMDASH_SITE_URL": "https://mytimeline.あなたの名前.workers.dev",
},
```

```sh
npm run deploy
```

### 5. 自分のサイトにする

公開されたサンプル記事「サイトを公開したら最初にやること」に、サイト名、プロフィール、サンプルの片づけ、検索エンジンへの登録の手順があります。

## 独自ドメインを使う

1. `wrangler.jsonc` の `routes` の行のコメントを外し、ドメインを書きます。
2. `EMDASH_SITE_URL` を新しいドメインに変えます。
3. `npm run deploy` を実行します。
4. EmDash の[ドメインの移動の手順](https://docs.emdashcms.com/guides/change-domain/)に沿って、管理画面でサイトの URL を変えます。

**ドメインを変えると、それまでのパスキーではログインできなくなります。** 新しいドメインでパスキーを登録してください。`EMDASH_SITE_URL` を設定すると、`workers.dev` のアドレスで来た人は独自ドメインへ転送されます。管理画面は転送されません。

## Bluesky と RSS を使う

管理画面の「プラグイン」で、それぞれの設定を開きます。

| プラグイン | 設定 | 取り込む間隔 |
|---|---|---|
| Bluesky To EmDash | ハンドル（`name.bsky.social` など） | 5 分ごと |
| RSS Feed To EmDash | フィードの URL（1 行に 1 つ） | 30 分ごと |

RSS で読めるのは、YouTube、note、Zenn、はてなブログだけです。取り込んだ内容がトップページに出るまで、最長で 20 分ほどかかります。

## 表示を速くする

訪問者が少ないサイトでは、キャッシュのないページを表示する機会が増えます。データベースと Worker の場所が離れていると、遅くなります。

Cloudflare のダッシュボードで D1 データベースのリージョンを確かめ、日本の近く（アジア太平洋）なら、`wrangler.jsonc` の次の行のコメントを外してデプロイします。

```jsonc
"placement": { "mode": "targeted", "region": "aws:ap-northeast-1" },
```

作者のサイトでは、キャッシュなしのトップページでサーバー内の処理が 0.9 秒以上から 0.35 秒以下に縮みました。ほかのリージョンの場合は、近い場所の[クラウドのリージョンのコード](https://developers.cloudflare.com/workers/configuration/placement/)を指定します。D1 の読み取りレプリケーションとは併用しないでください。

## デザインを変える

`src/styles/theme.css` の色の値を変えます。`light-dark(ライト, ダーク)` の形で両方のモードを指定できます。文字と背景のコントラスト比は 4.5 以上に保ってください。

フォントは `astro.config.mjs` の `fonts` で変えられます。

## 知っておいてほしいこと

- **更新：** テーマのファイルは、作った時点であなたのものになります。このリポジトリの更新は自動では届きません。
- **画像の縮小の上限：** Cloudflare Images の無料枠は、月に 5,000 種類の変換までです（作者が確認した時点）。超えると、新しいサイズの画像を作れなくなります。
- **検索：** 日本語の検索は、公開中の記事と作ったものをすべて読み込んで探します。数百件までを想定しています。
- **コメント：** コメント機能はありません。
- **サムネイルの自動作成：** Obsidian の [Post To EmDash](https://github.com/RieTamura/Post-To-EmDash) を使っている人は、[Auto Thumbnail Design](https://github.com/RieTamura/Auto-Thumbnail) を足せます。

## ライセンス

[MIT](LICENSE)
