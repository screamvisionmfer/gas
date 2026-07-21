import { createReadStream } from "node:fs";
import { access } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { materialsCatalog } from "@/lib/materials-catalog";
import { verifyMaterialsAccessToken } from "@/lib/materials-access";

export const runtime = "nodejs";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const material = materialsCatalog.find((item) => item.id === id);
  if (!material) return new Response("Not found", { status: 404 });

  const url = new URL(request.url);
  const token = url.searchParams.get("token") ?? "";
  if (!verifyMaterialsAccessToken(token, id)) {
    return new Response("Clearance required", {
      status: 403,
      headers: { "Cache-Control": "no-store" },
    });
  }

  try {
    const filePath = path.join(process.cwd(), "private", "banners", material.fileName);
    await access(filePath);
    const stream = Readable.toWeb(createReadStream(filePath)) as ReadableStream;
    const disposition = url.searchParams.get("download") === "1" ? "attachment" : "inline";
    return new Response(stream, {
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": `${disposition}; filename="${material.downloadName}"`,
        "Cache-Control": "private, max-age=300",
        "X-Robots-Tag": "noindex, nofollow",
      },
    });
  } catch {
    return new Response("Material unavailable", { status: 404 });
  }
}
