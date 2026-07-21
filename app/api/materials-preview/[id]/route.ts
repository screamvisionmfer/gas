import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { materialsCatalog } from "@/lib/materials-catalog";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const material = materialsCatalog.find((item) => item.id === id);
  if (!material) return new Response("Not found", { status: 404 });

  try {
    const source = await readFile(path.join(process.cwd(), "private", "banners", material.fileName));
    const preview = await sharp(source)
      .resize({ width: 420, withoutEnlargement: true })
      .blur(16)
      .modulate({ brightness: 0.58, saturation: 0.28 })
      .png({ quality: 58, compressionLevel: 9 })
      .toBuffer();

    return new Response(new Uint8Array(preview), {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=86400, s-maxage=31536000, immutable",
        "X-Robots-Tag": "noindex, nofollow",
      },
    });
  } catch {
    return new Response("Preview unavailable", { status: 404 });
  }
}

