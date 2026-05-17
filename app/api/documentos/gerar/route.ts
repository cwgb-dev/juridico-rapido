import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClientFolder, createGoogleDocInFolder, getDocumentosFolderId } from "@/lib/google";
import { criarTextoDocumento, tituloDocumento, type TipoDocumento } from "@/lib/documentos";
import { onlyDigits } from "@/lib/utils";
import { readRequestBody } from "@/lib/request-body";

export const runtime = "nodejs";

type Payload = {
  cpf: string;
  numero_processo?: string;
  relato?: string;
  observacoes?: string;
  documentos?: TipoDocumento[];
  registrar_atendimento?: boolean;
};

function isTipoDocumento(value: string): value is TipoDocumento {
  return value === "procuracao" || value === "hipossuficiencia";
}

export async function POST(request: Request) {
  try {
    const payload = await readRequestBody<Payload>(request);
    const cpf = onlyDigits(payload.cpf || "");
    const tipos = (payload.documentos || []).filter(isTipoDocumento);

    if (!cpf) {
      return NextResponse.json({ error: "CPF é obrigatório." }, { status: 400 });
    }
    if (payload.registrar_atendimento !== false && !payload.relato?.trim()) {
      return NextResponse.json({ error: "Relato do atendimento é obrigatório." }, { status: 400 });
    }
    if (!tipos.length) {
      return NextResponse.json({ error: "Selecione ao menos um documento." }, { status: 400 });
    }

    let assistido = await prisma.assistido.findUnique({ where: { cpf } });
    if (!assistido) {
      return NextResponse.json({ error: "Assistido não encontrado." }, { status: 404 });
    }

    let folder = assistido.pasta_drive_id && assistido.pasta_drive_url
      ? {
          pasta_drive_id: assistido.pasta_drive_id,
          pasta_drive_url: assistido.pasta_drive_url,
          documentos_folder_id: await getDocumentosFolderId(assistido.pasta_drive_id)
        }
      : await createClientFolder(assistido.nome_completo, assistido.cpf);
    if (!assistido.pasta_drive_id || !assistido.pasta_drive_url) {
      assistido = await prisma.assistido.update({
        where: { cpf },
        data: {
          pasta_drive_id: folder.pasta_drive_id,
          pasta_drive_url: folder.pasta_drive_url
        }
      });
    }

    const atendimento = payload.registrar_atendimento === false
      ? null
      : await prisma.atendimento.create({
          data: {
            cpf_assistido: cpf,
            numero_processo: payload.numero_processo?.trim() || null,
            relato: payload.relato?.trim() || "Geração avulsa de documentos.",
            observacoes: payload.observacoes?.trim() || null
          }
        });

    const documentos = [];
    for (const tipo of tipos) {
      const doc = await createGoogleDocInFolder({
        title: tituloDocumento(tipo, assistido.nome_completo),
        content: criarTextoDocumento(tipo, assistido),
        folderId: folder.documentos_folder_id
      });
      documentos.push({ tipo, ...doc });
    }

    return NextResponse.json({ atendimento, documentos });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao gerar documentos.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
