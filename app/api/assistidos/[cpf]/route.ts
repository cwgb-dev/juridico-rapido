import { NextResponse } from "next/server";
import { rm } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import { onlyDigits } from "@/lib/utils";
import { normalizeAssistidoInput, type AssistidoInput } from "@/lib/validation";
import { deleteDriveFolder, syncDadosGeraisDoc } from "@/lib/google";
import { montarDadosGeraisTables } from "@/lib/dados-gerais";
import { readRequestBody } from "@/lib/request-body";

type Params = {
  params: Promise<{ cpf: string }>;
};

function getDeletePassword() {
  return process.env.DELETE_ASSISTIDO_PASSWORD || "";
}

async function deleteLocalArtifacts(folderPath?: string | null) {
  const root = process.env.LOCAL_DRIVE_ROOT;
  if (!root || !folderPath) return;

  const resolvedRoot = path.resolve(root);
  const resolvedFolder = path.resolve(folderPath);
  if (!resolvedFolder.startsWith(resolvedRoot)) return;

  await rm(resolvedFolder, { recursive: true, force: true });
}

export async function GET(_request: Request, { params }: Params) {
  const { cpf } = await params;
  const assistido = await prisma.assistido.findUnique({
    where: { cpf: onlyDigits(cpf) },
    include: { atendimentos: { orderBy: { created_at: "desc" } } }
  });

  if (!assistido) {
    return NextResponse.json({ error: "Assistido nao encontrado." }, { status: 404 });
  }

  return NextResponse.json(assistido);
}

export async function PUT(request: Request, { params }: Params) {
  try {
    const { cpf } = await params;
    const payload = await readRequestBody<AssistidoInput>(request);
    const data = normalizeAssistidoInput({ ...payload, cpf });

    const assistido = await prisma.assistido.update({
      where: { cpf: onlyDigits(cpf) },
      data,
      include: { atendimentos: { orderBy: { data_atendimento: "asc" } } }
    });

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
          where: { cpf: onlyDigits(cpf) },
          data: {
            dados_gerais_id: dadosGerais.documentId,
            dados_gerais_url: dadosGerais.documentUrl
          }
        });
      }
    }

    return NextResponse.json({ assistido, dados_gerais_url: dadosGeraisUrl });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao atualizar assistido.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: Request, { params }: Params) {
  const configuredPassword = getDeletePassword();
  if (!configuredPassword) {
    return NextResponse.json({ error: "Senha de exclusao nao configurada." }, { status: 400 });
  }

  const body = await readRequestBody<{ password?: string }>(request).catch(() => null);
  const providedPassword = String(body?.password || "");
  if (providedPassword !== configuredPassword) {
    return NextResponse.json({ error: "Senha incorreta." }, { status: 403 });
  }

  const { cpf } = await params;
  const normalizedCpf = onlyDigits(cpf);
  const assistido = await prisma.assistido.findUnique({ where: { cpf: normalizedCpf } });

  if (!assistido) {
    return NextResponse.json({ error: "Assistido nao encontrado." }, { status: 404 });
  }

  const deletedFromDrive = await deleteDriveFolder(assistido.pasta_drive_id);
  if (!deletedFromDrive) {
    await deleteLocalArtifacts(assistido.pasta_drive_id);
  }
  await prisma.assistido.delete({ where: { cpf: normalizedCpf } });

  return NextResponse.json({ ok: true, deletedFromDrive });
}
