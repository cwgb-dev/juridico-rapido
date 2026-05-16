import { displayCpf } from "@/lib/utils";

export type DadosGeraisAssistido = {
  nome_completo: string;
  cpf: string;
  rg?: string | null;
  data_nascimento?: Date | string | null;
  nacionalidade?: string | null;
  estado_civil?: string | null;
  profissao?: string | null;
  telefone_whatsapp?: string | null;
  email?: string | null;
  cep?: string | null;
  logradouro?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  municipio?: string | null;
  estado?: string | null;
  endereco_completo?: string | null;
  indicacao?: string | null;
  observacoes?: string | null;
  pasta_drive_url?: string | null;
};

export type DadosGeraisAtendimento = {
  data_atendimento?: Date | string | null;
  numero_processo?: string | null;
  relato?: string | null;
  observacoes?: string | null;
};

export type TableBlock = {
  heading: string;
  rows: string[][];
};

function text(value?: string | null) {
  return value?.trim() || "Não informado";
}

function formatDate(value?: Date | string | null) {
  if (!value) return "Não informado";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "Não informado";
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Boa_Vista" }).format(date);
}

function enderecoCompleto(a: DadosGeraisAssistido) {
  return (
    a.endereco_completo ||
    [
      [a.logradouro, a.numero, a.complemento].map((value) => value?.trim()).filter(Boolean).join(", "),
      a.bairro,
      [a.municipio, a.estado].map((value) => value?.trim()).filter(Boolean).join(" - "),
      a.cep ? `CEP ${a.cep}` : ""
    ]
      .map((value) => value?.trim())
      .filter(Boolean)
      .join(", ")
  );
}

export function montarDadosGeraisTables(
  assistido: DadosGeraisAssistido,
  atendimentos: DadosGeraisAtendimento[] = []
): TableBlock[] {
  return [
    {
      heading: "Dados cadastrais",
      rows: [
        ["Campo", "Informação"],
        ["Nome completo", assistido.nome_completo],
        ["CPF", displayCpf(assistido.cpf)],
        ["RG", text(assistido.rg)],
        ["Data de nascimento", formatDate(assistido.data_nascimento)],
        ["Nacionalidade", text(assistido.nacionalidade)],
        ["Estado civil", text(assistido.estado_civil)],
        ["Profissão", text(assistido.profissao)],
        ["Telefone", text(assistido.telefone_whatsapp)],
        ["E-mail", text(assistido.email)],
        ["Indicação", text(assistido.indicacao)],
        ["Endereço completo", text(enderecoCompleto(assistido))],
        ["Observações do cadastro", text(assistido.observacoes)],
        ["Pasta do Drive", text(assistido.pasta_drive_url)]
      ]
    },
    {
      heading: "Atendimentos",
      rows: [
        ["Data", "Processo", "Relato", "Observações"],
        ...(atendimentos.length
          ? atendimentos.map((atendimento) => [
              formatDate(atendimento.data_atendimento),
              text(atendimento.numero_processo),
              text(atendimento.relato),
              text(atendimento.observacoes)
            ])
          : [["Sem atendimento registrado", "", "", ""]])
      ]
    }
  ];
}
