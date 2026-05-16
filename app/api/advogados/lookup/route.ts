import { NextResponse } from "next/server";
import { findLawyerByOab } from "@/lib/lawyers";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const uf = searchParams.get("uf") || "RR";
  const oab = searchParams.get("oab") || "";

  if (!oab.trim()) {
    return NextResponse.json({ error: "Informe a OAB para buscar o advogado." }, { status: 400 });
  }

  const lawyer = findLawyerByOab({ uf, oab });
  if (!lawyer) {
    return NextResponse.json(
      {
        error: "Advogado nao encontrado na base local. A consulta automatica ao CNA oficial exige validacao por reCAPTCHA.",
        cna_url: "https://cna.oab.org.br/"
      },
      { status: 404 }
    );
  }

  return NextResponse.json({ lawyer, source: "local" });
}
