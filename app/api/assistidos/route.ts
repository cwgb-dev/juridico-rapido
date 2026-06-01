import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClientFolder, syncDadosGeraisDoc } from "@/lib/google";
import { montarDadosGeraisTables } from "@/lib/dados-gerais";
import { normalizeAssistidoInput, type AssistidoInput } from "@/lib/validation";
import { generateNoCpfId, isGeneratedNoCpf } from "@/lib/utils";
import { readRequestBody } from "@/lib/request-body";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = (searchParams.get("q") || "").trim();
    const limitParam = Number(searchParams.get("limit") || "80");
    const take = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 200) : 80;
    const isPostgres = (process.env.DATABASE_URL || "").startsWith("postgres");

    const textFilter = (field: string, value: string) =>
      isPostgres
        ? ({ [field]: { contains: value, mode: "insensitive" } } as any)
        : ({ [field]: { contains: value } } as any);

    const digits = q.replace(/\D/g, "");
    const where = q
      ? ({
          OR: [
            textFilter("nome_completo", q),
            textFilter("indicacao", q),
            textFilter("telefone_whatsapp", q),
            textFilter("email", q),
            textFilter("advogado_adicional_nome", q),
            textFilter("observacoes", q),
            ...(digits
              ? [
                  { cpf: { contains: digits } },
                  { telefone_whatsapp: { contains: digits } },
                  { advogado_adicional_oab: { contains: digits } }
                ]
              : [])
          ]
        } as any)
      : undefined;

    const assistidos = await prisma.assistido.findMany({
      where,
      orderBy: { created_at: "desc" },
      take,
      include: { atendimentos: { orderBy: { created_at: "desc" } } }
    });

    return NextResponse.json(assistidos);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao carregar assistidos.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const payload = await readRequestBody<AssistidoInput>(request);
    const data = normalizeAssistidoInput(payload);
    while (isGeneratedNoCpf(data.cpf) && await prisma.assistido.findUnique({ where: { cpf: data.cpf } })) {
      data.cpf = generateNoCpfId();
    }

    const exists = await prisma.assistido.findUnique({ where: { cpf: data.cpf } });
    if (exists) {
      return NextResponse.json({ error: "CPF já cadastrado." }, { status: 409 });
    }

    const folder = await createClientFolder(data.nome_completo, data.cpf);
    const assistido = await prisma.assistido.create({
      data: {
        ...data,
        pasta_drive_id: folder.pasta_drive_id,
        pasta_drive_url: folder.pasta_drive_url
      }
    });

    const dadosGerais = await syncDadosGeraisDoc({
      title: `Dados Gerais - ${assistido.nome_completo}`,
      folderId: folder.pasta_drive_id,
      tables: montarDadosGeraisTables(assistido, [])
    });

    const assistidoAtualizado = await prisma.assistido.update({
      where: { cpf: assistido.cpf },
      data: {
        dados_gerais_id: dadosGerais.documentId,
        dados_gerais_url: dadosGerais.documentUrl
      }
    });

    return NextResponse.json(
      {
        assistido: assistidoAtualizado,
        pasta_drive_url: folder.pasta_drive_url,
        dados_gerais_url: dadosGerais.documentUrl
      },
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao cadastrar assistido.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
