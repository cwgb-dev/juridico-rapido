import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const filePath = searchParams.get("path");
  const root = process.env.LOCAL_DRIVE_ROOT;

  if (!filePath || !root) {
    return NextResponse.json({ error: "Documento não informado." }, { status: 400 });
  }

  const resolvedRoot = path.resolve(root);
  const resolvedFile = path.resolve(filePath);

  if (!resolvedFile.startsWith(resolvedRoot)) {
    return NextResponse.json({ error: "Caminho inválido." }, { status: 403 });
  }

  const content = await readFile(resolvedFile, "utf8");
  return new NextResponse(content, {
    headers: {
      "Content-Type": "text/html; charset=utf-8"
    }
  });
}
