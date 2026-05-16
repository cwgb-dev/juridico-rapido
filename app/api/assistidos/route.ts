import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClientFolder, syncDadosGeraisDoc } from "@/lib/google";
import { montarDadosGeraisTables } from "@/lib/dados-gerais";
import { normalizeAssistidoInput, type AssistidoInput } from "@/lib/validation";
import { generateNoCpfId, isGeneratedNoCpf } from "@/lib/utils";

export const runtime = "nodejs";

async function readJsonBody<T>(request: Request) {
  const body = (await request.text()).replace(/^\uFEFF/, "").trim();
  if (!body) throw new Error("Corpo da requisicao vazio.");
  try {
    return JSON.parse(body) as T;
  } catch {
    const prefixCodes = Array.from(body.slice(0, 8)).map((char) => char.charCodeAt(0)).join(",");
    throw new Error(`JSON invalido no corpo da requisicao. Prefixo recebido: ${prefixCodes}`);
  }
}

export async function GET() {
  try {
    const assistidos = await prisma.assistido.findMany({
      orderBy: { created_at: "desc" },
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
    const payload = await readJsonBody<AssistidoInput>(request);
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
      folderId: folder.documentos_folder_id,
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
