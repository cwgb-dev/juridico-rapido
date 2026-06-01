import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  analisarCasoComGemini,
  formatPromptJusia,
  formatRelatorioIa
} from "@/lib/ia-caso";
import {
  createClientFolder,
  createGoogleDocInFolder,
  getAtendimentosFolderId,
  getMinutasFolderId
} from "@/lib/google";
import { onlyDigits } from "@/lib/utils";
import { readRequestBody } from "@/lib/request-body";

export const runtime = "nodejs";

type Payload = {
  cpf: string;
};

export async function POST(request: Request) {
  try {
    const payload = await readRequestBody<Payload>(request);
    const cpf = onlyDigits(payload.cpf || "");
    if (!cpf) {
      return NextResponse.json({ error: "CPF e obrigatorio." }, { status: 400 });
    }

    let assistido = await prisma.assistido.findUnique({
      where: { cpf },
      include: { atendimentos: { orderBy: { data_atendimento: "asc" } } }
    });
    if (!assistido) {
      return NextResponse.json({ error: "Assistido nao encontrado." }, { status: 404 });
    }

    const baseFolder = assistido.pasta_drive_id && assistido.pasta_drive_url
      ? {
          pasta_drive_id: assistido.pasta_drive_id,
          pasta_drive_url: assistido.pasta_drive_url,
          minutas_folder_id: await getMinutasFolderId(assistido.pasta_drive_id)
        }
      : await createClientFolder(assistido.nome_completo, assistido.cpf);
    const folder = {
      ...baseFolder,
      atendimentos_folder_id: await getAtendimentosFolderId(baseFolder.pasta_drive_id)
    };

    if (!assistido.pasta_drive_id || !assistido.pasta_drive_url) {
      assistido = await prisma.assistido.update({
        where: { cpf },
        data: {
          pasta_drive_id: folder.pasta_drive_id,
          pasta_drive_url: folder.pasta_drive_url
        },
        include: { atendimentos: { orderBy: { data_atendimento: "asc" } } }
      });
    }

    const result = await analisarCasoComGemini(assistido);
    const relatorio = await createGoogleDocInFolder({
      title: `Relatorio IA - ${assistido.nome_completo}`,
      content: formatRelatorioIa(assistido, result),
      folderId: folder.atendimentos_folder_id
    });
    const promptJusia = await createGoogleDocInFolder({
      title: `Prompt para JUSIA - ${assistido.nome_completo}`,
      content: formatPromptJusia(assistido, result),
      folderId: folder.minutas_folder_id
    });

    return NextResponse.json({
      materia: result.materia,
      medida_sugerida: result.medida_sugerida,
      relatorio,
      prompt_jusia: promptJusia
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao analisar caso com IA.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
