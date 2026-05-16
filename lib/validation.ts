import { buildEnderecoCompleto, generateNoCpfId, onlyDigits } from "@/lib/utils";

export type AssistidoInput = {
  cpf?: string;
  nome_completo: string;
  rg?: string;
  data_nascimento?: string;
  nacionalidade?: string;
  estado_civil?: string;
  profissao?: string;
  telefone_whatsapp?: string;
  email?: string;
  cep?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  municipio?: string;
  estado?: string;
  indicacao?: string;
  observacoes?: string;
  menor?: boolean;
  representante_legal_nome?: string;
  representante_legal_parentesco?: string;
  representante_legal_nacionalidade?: string;
  representante_legal_estado_civil?: string;
  representante_legal_profissao?: string;
  representante_legal_rg?: string;
  representante_legal_cpf?: string;
  representante_legal_email?: string;
  representante_legal_telefone?: string;
  advogado_adicional_nome?: string;
  advogado_adicional_oab?: string;
  advogado_adicional_uf?: string;
};

export function normalizeAssistidoInput(input: AssistidoInput) {
  const cpf = onlyDigits(input.cpf || "");
  if (cpf && cpf.length !== 11) {
    throw new Error("CPF deve conter 11 digitos.");
  }
  if (!cpf && !input.menor) {
    throw new Error("CPF e obrigatorio para assistido maior de idade.");
  }

  if (!input.nome_completo?.trim()) {
    throw new Error("Nome completo e obrigatorio.");
  }

  const normalized = {
    cpf: cpf || generateNoCpfId(),
    nome_completo: input.nome_completo.trim(),
    rg: input.rg?.trim() || null,
    data_nascimento: input.data_nascimento ? new Date(input.data_nascimento) : null,
    nacionalidade: input.nacionalidade?.trim() || null,
    estado_civil: input.estado_civil?.trim() || null,
    profissao: input.profissao?.trim() || null,
    telefone_whatsapp: input.telefone_whatsapp?.trim() || null,
    email: input.email?.trim() || null,
    cep: input.cep?.trim() || null,
    logradouro: input.logradouro?.trim() || null,
    numero: input.numero?.trim() || null,
    complemento: input.complemento?.trim() || null,
    bairro: input.bairro?.trim() || null,
    municipio: input.municipio?.trim() || null,
    estado: input.estado?.trim() || null,
    indicacao: input.indicacao?.trim() || null,
    observacoes: input.observacoes?.trim() || null,
    menor: Boolean(input.menor),
    representante_legal_nome: input.representante_legal_nome?.trim() || null,
    representante_legal_parentesco: input.representante_legal_parentesco?.trim() || null,
    representante_legal_nacionalidade: input.representante_legal_nacionalidade?.trim() || null,
    representante_legal_estado_civil: input.representante_legal_estado_civil?.trim() || null,
    representante_legal_profissao: input.representante_legal_profissao?.trim() || null,
    representante_legal_rg: input.representante_legal_rg?.trim() || null,
    representante_legal_cpf: input.representante_legal_cpf ? onlyDigits(input.representante_legal_cpf) : null,
    representante_legal_email: input.representante_legal_email?.trim() || null,
    representante_legal_telefone: input.representante_legal_telefone?.trim() || null,
    advogado_adicional_nome: input.advogado_adicional_nome?.trim() || null,
    advogado_adicional_oab: input.advogado_adicional_oab ? onlyDigits(input.advogado_adicional_oab) : null,
    advogado_adicional_uf: input.advogado_adicional_uf?.trim().toUpperCase() || null
  };

  return {
    ...normalized,
    endereco_completo: buildEnderecoCompleto(normalized)
  };
}
