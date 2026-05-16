import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { displayCpf, isGeneratedNoCpf } from "@/lib/utils";

export const runtime = "nodejs";

function parseDate(value: string | null, endOfDay = false) {
  if (!value) return null;
  const date = new Date(`${value}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function monthKey(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat("pt-BR", {
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC"
  }).format(date);
}

function dateText(value?: Date | string | null) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(date);
}

function csvEscape(value: unknown) {
  const text = String(value ?? "");
  if (/[;"\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function toCsv(rows: Array<Record<string, unknown>>) {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  return [
    headers.join(";"),
    ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(";"))
  ].join("\r\n");
}

function countBy<T>(items: T[], getKey: (item: T) => string) {
  const counts = new Map<string, number>();
  for (const item of items) {
    const key = getKey(item).trim() || "Sem informacao";
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return [...counts.entries()]
    .map(([label, total]) => ({ label, total }))
    .sort((a, b) => b.total - a.total || a.label.localeCompare(b.label));
}

function csvResponse(filename: string, rows: Array<Record<string, unknown>>) {
  return new NextResponse(`\uFEFF${toCsv(rows)}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`
    }
  });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const from = parseDate(searchParams.get("from"));
  const to = parseDate(searchParams.get("to"), true);
  const exportType = searchParams.get("export");

  const createdAtFilter = {
    ...(from ? { gte: from } : {}),
    ...(to ? { lte: to } : {})
  };
  const hasCreatedAtFilter = Boolean(from || to);

  const assistidos = await prisma.assistido.findMany({
    where: hasCreatedAtFilter ? { created_at: createdAtFilter } : undefined,
    orderBy: { created_at: "desc" },
    include: { atendimentos: { orderBy: { data_atendimento: "desc" } } }
  });

  const atendimentos = await prisma.atendimento.findMany({
    where: hasCreatedAtFilter ? { data_atendimento: createdAtFilter } : undefined,
    orderBy: { data_atendimento: "desc" },
    include: { assistido: true }
  });

  if (exportType === "assistidos") {
    return csvResponse(
      "assistidos-juridico-rapido.csv",
      assistidos.map((assistido) => ({
        nome: assistido.nome_completo,
        cpf: displayCpf(assistido.cpf),
        menor: assistido.menor ? "Sim" : "Nao",
        telefone: assistido.telefone_whatsapp || "",
        email: assistido.email || "",
        indicacao: assistido.indicacao || "",
        cidade: assistido.municipio || "",
        estado: assistido.estado || "",
        data_cadastro: dateText(assistido.created_at),
        total_atendimentos: assistido.atendimentos.length,
        pasta_drive: assistido.pasta_drive_url || "",
        dados_gerais: assistido.dados_gerais_url || ""
      }))
    );
  }

  if (exportType === "atendimentos") {
    return csvResponse(
      "atendimentos-juridico-rapido.csv",
      atendimentos.map((atendimento) => ({
        data_atendimento: dateText(atendimento.data_atendimento),
        assistido: atendimento.assistido.nome_completo,
        cpf: displayCpf(atendimento.cpf_assistido),
        numero_processo: atendimento.numero_processo || "",
        relato: atendimento.relato,
        observacoes: atendimento.observacoes || "",
        data_registro: dateText(atendimento.created_at)
      }))
    );
  }

  const now = new Date();
  const currentMonth = monthKey(now);
  const assistidosComCpf = assistidos.filter((assistido) => !isGeneratedNoCpf(assistido.cpf));
  const assistidosSemCpf = assistidos.length - assistidosComCpf.length;

  return NextResponse.json({
    periodo: {
      from: from ? dateText(from) : null,
      to: to ? dateText(to) : null
    },
    resumo: {
      assistidos: assistidos.length,
      atendimentos: atendimentos.length,
      menores: assistidos.filter((assistido) => assistido.menor).length,
      comCpf: assistidosComCpf.length,
      semCpf: assistidosSemCpf,
      cadastrosNoMes: assistidos.filter((assistido) => monthKey(assistido.created_at) === currentMonth).length,
      atendimentosNoMes: atendimentos.filter((atendimento) => monthKey(atendimento.data_atendimento) === currentMonth).length
    },
    indicacoes: countBy(assistidos, (assistido) => assistido.indicacao || ""),
    cadastrosPorMes: countBy(assistidos, (assistido) => monthKey(assistido.created_at)),
    atendimentosPorMes: countBy(atendimentos, (atendimento) => monthKey(atendimento.data_atendimento)),
    ultimosAtendimentos: atendimentos.slice(0, 8).map((atendimento) => ({
      id: atendimento.id,
      data: dateText(atendimento.data_atendimento),
      assistido: atendimento.assistido.nome_completo,
      numero_processo: atendimento.numero_processo || "",
      relato: atendimento.relato
    })),
    assistidosRecentes: assistidos.slice(0, 8).map((assistido) => ({
      cpf: assistido.cpf,
      nome: assistido.nome_completo,
      data: dateText(assistido.created_at),
      menor: assistido.menor,
      indicacao: assistido.indicacao || "",
      atendimentos: assistido.atendimentos.length
    }))
  });
}
