import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { onlyDigits } from "@/lib/utils";
import { syncDadosGeraisDoc } from "@/lib/google";
import { montarDadosGeraisTables } from "@/lib/dados-gerais";
import { readRequestBody } from "@/lib/request-body";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const cpf = onlyDigits(searchParams.get("cpf") || "");

  const atendimentos = await prisma.atendimento.findMany({
    where: cpf ? { cpf_assistido: cpf } : undefined,
    orderBy: { created_at: "desc" },
    include: { assistido: true }
  });

  return NextResponse.json(atendimentos);
}

export async function POST(request: Request) {
  try {
    const payload = await readRequestBody<{
      cpf_assistido?: string;
      data_atendimento?: string;
      numero_processo?: string;
      relato?: string;
      observacoes?: string;
    }>(request);
    const cpf = onlyDigits(payload.cpf_assistido || "");

    if (!cpf || !payload.relato?.trim()) {
      return NextResponse.json({ error: "CPF e relato são obrigatórios." }, { status: 400 });
    }

    const atendimento = await prisma.atendimento.create({
      data: {
        cpf_assistido: cpf,
        data_atendimento: payload.data_atendimento ? new Date(payload.data_atendimento) : new Date(),
        numero_processo: payload.numero_processo?.trim() || null,
        relato: payload.relato.trim(),
        observacoes: payload.observacoes?.trim() || null
      }
    });

    const assistido = await prisma.assistido.findUnique({
      where: { cpf },
      include: { atendimentos: { orderBy: { data_atendimento: "asc" } } }
    });

    if (!assistido) {
      return NextResponse.json({ error: "Assistido nÃ£o encontrado." }, { status: 404 });
    }

    let dadosGeraisUrl = assistido.dados_gerais_url;
    if (assistido.pasta_drive_id) {
      const dadosGerais = await syncDadosGeraisDoc({
        title: `Dados Gerais - ${assistido.nome_completo}`,
        folderId: assistido.pasta_drive_id,
        documentId: assistido.dados_gerais_id,
        tables: montarDadosGeraisTables(assistido, assistido.atendimentos)
      });

      dadosGeraisUrl = dadosGerais.documentUrl;
      if (!assistido.dados_gerais_id || assistido.dados_gerais_url !== dadosGerais.documentUrl) {
        await prisma.assistido.update({
          where: { cpf },
          data: {
            dados_gerais_id: dadosGerais.documentId,
            dados_gerais_url: dadosGerais.documentUrl
          }
        });
      }
    }

    return NextResponse.json({ atendimento, dados_gerais_url: dadosGeraisUrl }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao registrar atendimento.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
