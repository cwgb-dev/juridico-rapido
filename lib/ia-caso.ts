import { displayCpf } from "@/lib/utils";

type Atendimento = {
  data_atendimento?: Date | string | null;
  numero_processo?: string | null;
  relato?: string | null;
  observacoes?: string | null;
};

type Assistido = {
  nome_completo: string;
  cpf: string;
  rg?: string | null;
  data_nascimento?: Date | string | null;
  nacionalidade?: string | null;
  estado_civil?: string | null;
  profissao?: string | null;
  telefone_whatsapp?: string | null;
  email?: string | null;
  endereco_completo?: string | null;
  indicacao?: string | null;
  observacoes?: string | null;
  menor?: boolean | null;
  representante_legal_nome?: string | null;
  representante_legal_parentesco?: string | null;
  representante_legal_cpf?: string | null;
  representante_legal_rg?: string | null;
  representante_legal_telefone?: string | null;
  representante_legal_email?: string | null;
  advogado_adicional_nome?: string | null;
  advogado_adicional_oab?: string | null;
  advogado_adicional_uf?: string | null;
  atendimentos?: Atendimento[];
};

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
  error?: {
    message?: string;
  };
};

export type AnaliseIaResultado = {
  materia: string;
  medida_sugerida: string;
  resumo_fatos: string;
  pontos_atencao: string[];
  provas_disponiveis: string[];
  provas_faltantes: string[];
  pedidos_provaveis: string[];
  relatorio: string;
  prompt_jusia: string;
};

function text(value?: string | null) {
  return value?.trim() || "Nao informado";
}

function dateText(value?: Date | string | null) {
  if (!value) return "Nao informado";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "Nao informado";
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Boa_Vista" }).format(date);
}

function bullet(values: string[]) {
  return values.length ? values.map((value) => `- ${value}`).join("\n") : "- Nao identificado";
}

function casoTexto(assistido: Assistido) {
  const atendimentos = assistido.atendimentos || [];
  return [
    "DADOS DO ASSISTIDO",
    `Nome: ${assistido.nome_completo}`,
    `CPF: ${displayCpf(assistido.cpf)}`,
    `RG: ${text(assistido.rg)}`,
    `Nascimento: ${dateText(assistido.data_nascimento)}`,
    `Nacionalidade: ${text(assistido.nacionalidade)}`,
    `Estado civil: ${text(assistido.estado_civil)}`,
    `Profissao: ${text(assistido.profissao)}`,
    `Telefone: ${text(assistido.telefone_whatsapp)}`,
    `Email: ${text(assistido.email)}`,
    `Endereco: ${text(assistido.endereco_completo)}`,
    `Indicacao: ${text(assistido.indicacao)}`,
    `Observacoes do cadastro: ${text(assistido.observacoes)}`,
    "",
    "REPRESENTANTE LEGAL",
    `Menor/incapaz: ${assistido.menor ? "Sim" : "Nao"}`,
    `Nome: ${text(assistido.representante_legal_nome)}`,
    `Parentesco: ${text(assistido.representante_legal_parentesco)}`,
    `CPF: ${text(assistido.representante_legal_cpf)}`,
    `RG: ${text(assistido.representante_legal_rg)}`,
    `Telefone: ${text(assistido.representante_legal_telefone)}`,
    `Email: ${text(assistido.representante_legal_email)}`,
    "",
    "ADVOGADO ADICIONAL",
    `Nome: ${text(assistido.advogado_adicional_nome)}`,
    `OAB: ${text(assistido.advogado_adicional_oab)}/${text(assistido.advogado_adicional_uf)}`,
    "",
    "ATENDIMENTOS REGISTRADOS",
    ...(atendimentos.length
      ? atendimentos.map((atendimento, index) =>
          [
            `Atendimento ${index + 1}`,
            `Data: ${dateText(atendimento.data_atendimento)}`,
            `Processo: ${text(atendimento.numero_processo)}`,
            `Relato: ${text(atendimento.relato)}`,
            `Observacoes: ${text(atendimento.observacoes)}`
          ].join("\n")
        )
      : ["Sem atendimentos registrados."])
  ].join("\n");
}

function buildPrompt(assistido: Assistido) {
  return `Voce e um assistente juridico brasileiro para triagem pos-atendimento. Analise o caso abaixo e produza uma saida util para revisao de advogado.

Regras:
- Nao invente fatos, documentos, datas, valores ou fundamentos especificos nao informados.
- Se a materia ou medida nao estiver clara, diga que ha insuficiencia de dados.
- Seja pratico e organizado.
- A resposta nao substitui revisao profissional do advogado.
- Escreva em portugues do Brasil.
- Retorne somente JSON valido, sem markdown.

Formato JSON obrigatorio:
{
  "materia": "area juridica provavel",
  "medida_sugerida": "medida ou acao provavel, com ressalvas se necessario",
  "resumo_fatos": "resumo objetivo dos fatos relevantes",
  "pontos_atencao": ["ponto 1", "ponto 2"],
  "provas_disponiveis": ["prova/documento identificado"],
  "provas_faltantes": ["prova/documento a solicitar"],
  "pedidos_provaveis": ["pedido provavel"],
  "relatorio": "relatorio tecnico em texto corrido, com justificativa da sugestao e riscos",
  "prompt_jusia": "prompt completo para colar em outra IA juridica, pedindo analise da medida adequada e pre-minuta"
}

Caso:
${casoTexto(assistido)}`;
}

function normalizeResult(value: Partial<AnaliseIaResultado>): AnaliseIaResultado {
  return {
    materia: value.materia || "Nao identificado",
    medida_sugerida: value.medida_sugerida || "Nao identificada",
    resumo_fatos: value.resumo_fatos || "Nao foi possivel resumir com seguranca.",
    pontos_atencao: Array.isArray(value.pontos_atencao) ? value.pontos_atencao : [],
    provas_disponiveis: Array.isArray(value.provas_disponiveis) ? value.provas_disponiveis : [],
    provas_faltantes: Array.isArray(value.provas_faltantes) ? value.provas_faltantes : [],
    pedidos_provaveis: Array.isArray(value.pedidos_provaveis) ? value.pedidos_provaveis : [],
    relatorio: value.relatorio || "Relatorio nao gerado.",
    prompt_jusia: value.prompt_jusia || "Prompt nao gerado."
  };
}

function parseJson(text: string) {
  const trimmed = text.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();
  return JSON.parse(trimmed);
}

export function formatRelatorioIa(assistido: Assistido, result: AnaliseIaResultado) {
  return [
    `RELATORIO IA DO CASO - ${assistido.nome_completo.toUpperCase()}`,
    "",
    "Aviso: analise gerada por IA para triagem e revisao do advogado. Nao usar sem conferencia profissional.",
    "",
    `Materia provavel: ${result.materia}`,
    `Medida sugerida: ${result.medida_sugerida}`,
    "",
    "Resumo dos fatos",
    result.resumo_fatos,
    "",
    "Pontos de atencao",
    bullet(result.pontos_atencao),
    "",
    "Provas/documentos disponiveis identificados",
    bullet(result.provas_disponiveis),
    "",
    "Provas/documentos faltantes a solicitar",
    bullet(result.provas_faltantes),
    "",
    "Pedidos provaveis",
    bullet(result.pedidos_provaveis),
    "",
    "Justificativa e log da sugestao",
    result.relatorio
  ].join("\n");
}

export function formatPromptJusia(assistido: Assistido, result: AnaliseIaResultado) {
  return [
    `PROMPT PARA JUSIA - ${assistido.nome_completo.toUpperCase()}`,
    "",
    "Copie o texto abaixo e cole na JUSIA ou em outra IA juridica:",
    "",
    result.prompt_jusia
  ].join("\n");
}

export async function analisarCasoComGemini(assistido: Assistido): Promise<AnaliseIaResultado> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY nao configurada.");
  }
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash-lite";

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: buildPrompt(assistido) }]
          }
        ],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: "application/json"
        }
      })
    }
  );

  const data = (await response.json()) as GeminiResponse;
  if (!response.ok) {
    throw new Error(data.error?.message || "Falha ao consultar Gemini.");
  }

  const text = data.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("\n").trim();
  if (!text) {
    throw new Error("Gemini nao retornou texto.");
  }

  return normalizeResult(parseJson(text));
}
