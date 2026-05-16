import { NextResponse } from "next/server";
import { onlyDigits } from "@/lib/utils";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const cep = onlyDigits(searchParams.get("cep") || "");

  if (cep.length !== 8) {
    return NextResponse.json({ error: "CEP inválido." }, { status: 400 });
  }

  const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`, {
    next: { revalidate: 60 * 60 * 24 }
  });

  if (!response.ok) {
    return NextResponse.json({ error: "Falha ao consultar ViaCEP." }, { status: 502 });
  }

  const data = await response.json();
  if (data.erro) {
    return NextResponse.json({ error: "CEP não encontrado." }, { status: 404 });
  }

  return NextResponse.json({
    cep: data.cep,
    logradouro: data.logradouro,
    bairro: data.bairro,
    municipio: data.localidade,
    estado: data.uf
  });
}
