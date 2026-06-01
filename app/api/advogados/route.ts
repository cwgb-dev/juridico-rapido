import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { onlyDigits } from "@/lib/utils";

export const runtime = "nodejs";

function normalizeUf(value: unknown) {
  return String(value || "").trim().toUpperCase();
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const nomeExibicao = String(body.nome || "").trim();
    const uf = normalizeUf(body.uf);
    const oab = onlyDigits(String(body.oab || ""));
    const email = String(body.email || "").trim() || null;
    const telefone = String(body.telefone || "").trim() || null;

    if (!nomeExibicao || !uf || !oab) {
      return NextResponse.json(
        { error: "Informe nome, UF e OAB para cadastrar o advogado." },
        { status: 400 }
      );
    }

    if (uf.length !== 2) {
      return NextResponse.json({ error: "Informe a UF com 2 letras." }, { status: 400 });
    }

    const lawyer = await prisma.advogado.create({
      data: {
        nome: nomeExibicao.toUpperCase(),
        nome_exibicao: nomeExibicao,
        uf,
        oab,
        email,
        telefone
      }
    });

    return NextResponse.json({ lawyer, source: "database" }, { status: 201 });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json(
        { error: "Ja existe advogado cadastrado para esta UF/OAB." },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: "Nao foi possivel cadastrar o advogado na base local." },
      { status: 500 }
    );
  }
}
