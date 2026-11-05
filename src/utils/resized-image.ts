import { getImage } from "astro:assets";

/**
 * 小さく表示する画像（ロゴなど）を、表示の大きさに合わせて縮小した URL にする。
 * 高解像度の画面でもぼけないよう、表示の 2 倍の大きさで作る。
 * 縮小できないときは元の URL をそのまま返すので、画像は表示され続ける。
 */
export async function resizedImageSrc(src: string, size: number, origin: string): Promise<string> {
	try {
		const image = await getImage({
			src: new URL(src, origin).href,
			width: size * 2,
			height: size * 2,
			fit: "cover",
		});
		return image.src;
	} catch {
		return src;
	}
}
