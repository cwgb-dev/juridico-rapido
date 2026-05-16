import { NextResponse } from "next/server";
import { saveGoogleOAuthCode } from "@/lib/google";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.json({ error: "Código OAuth não recebido." }, { status: 400 });
  }

  await saveGoogleOAuthCode(code);

  return new NextResponse(
    `<html><body style="font-family: Arial, sans-serif; padding: 32px"><h1>Google autorizado</h1><p>Você já pode voltar ao sistema e gerar documentos.</p><p><a href="/">Voltar ao sistema</a></p></body></html>`,
    { headers: { "Content-Type": "text/html; charset=utf-8" } }
  );
}
