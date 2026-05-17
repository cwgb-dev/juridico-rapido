import { buildOutorgadosText } from "@/lib/lawyers";
import { displayCpf, isGeneratedNoCpf } from "@/lib/utils";

export type AssistidoDocumentoData = {
  nome_completo: string;
  nacionalidade?: string | null;
  estado_civil?: string | null;
  profissao?: string | null;
  rg?: string | null;
  cpf: string;
  data_nascimento?: Date | string | null;
  endereco_completo?: string | null;
  email?: string | null;
  telefone_whatsapp?: string | null;
  cep?: string | null;
  logradouro?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  municipio?: string | null;
  estado?: string | null;
  menor?: boolean | null;
  representante_legal_nome?: string | null;
  representante_legal_parentesco?: string | null;
  representante_legal_nacionalidade?: string | null;
  representante_legal_estado_civil?: string | null;
  representante_legal_profissao?: string | null;
  representante_legal_rg?: string | null;
  representante_legal_cpf?: string | null;
  representante_legal_email?: string | null;
  representante_legal_telefone?: string | null;
  advogado_adicional_nome?: string | null;
  advogado_adicional_oab?: string | null;
  advogado_adicional_uf?: string | null;
};

export type TipoDocumento = "procuracao" | "hipossuficiencia";

function texto(value?: string | null) {
  return value?.trim() || "";
}

function joinPartes(...values: Array<string | null | undefined>) {
  return values.map((value) => value?.trim()).filter(Boolean).join(", ");
}

function hasCpf(value?: string | null) {
  return Boolean(value?.trim()) && !isGeneratedNoCpf(value);
}

function cpfQualificacao(value?: string | null) {
  return hasCpf(value) ? `inscrito(a) no CPF sob o n° ${displayCpf(value)}` : "";
}

function cpfAssinatura(value?: string | null) {
  return hasCpf(value) ? `CPF n° ${displayCpf(value)}` : "";
}

function formatDate(value?: Date | string | null) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(date);
}

function formatDateLong(date = new Date()) {
  const parts = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "America/Boa_Vista"
  }).formatToParts(date);
  const day = parts.find((part) => part.type === "day")?.value || "";
  const month = parts.find((part) => part.type === "month")?.value || "";
  const year = parts.find((part) => part.type === "year")?.value || "";
  return `${day} de ${month} de ${year}`;
}

function localData() {
  return `Boa Vista/RR, ${formatDateLong()}`;
}

function enderecoSemCep(a: AssistidoDocumentoData) {
  const linhaEndereco = [a.logradouro, a.numero, a.complemento]
    .map((value) => value?.trim())
    .filter(Boolean)
    .join(", ");
  const cidadeUf = a.municipio && a.estado ? `${a.municipio} - ${a.estado}` : a.municipio || a.estado;
  return [linhaEndereco, a.bairro, cidadeUf].map((value) => value?.trim()).filter(Boolean).join(", ") || texto(a.endereco_completo);
}

export function qualificacaoCompleta(a: AssistidoDocumentoData) {
  const nascimento = formatDate(a.data_nascimento);
  const endereco = enderecoSemCep(a);
  const email = texto(a.email);
  const telefone = texto(a.telefone_whatsapp);

  if (a.menor && a.representante_legal_nome) {
    const representanteEmail = texto(a.representante_legal_email || a.email);
    const representanteTelefone = texto(a.representante_legal_telefone || a.telefone_whatsapp);
    return [
      `${a.nome_completo.toUpperCase()}, menor impúbere`,
      nascimento ? `nascido(a) em ${nascimento}` : "",
      cpfQualificacao(a.cpf),
      `neste ato representado(a) por seu(sua) ${texto(a.representante_legal_parentesco) || "representante legal"} ${a.representante_legal_nome.toUpperCase()}`,
      texto(a.representante_legal_nacionalidade),
      texto(a.representante_legal_estado_civil),
      texto(a.representante_legal_profissao),
      texto(a.representante_legal_rg) ? `portador(a) do RG n° ${texto(a.representante_legal_rg)}` : "",
      cpfQualificacao(a.representante_legal_cpf),
      endereco ? `residente e domiciliado(a) à ${endereco}` : "",
      texto(a.cep) ? `CEP ${texto(a.cep)}` : "",
      representanteEmail ? `endereço eletrônico ${representanteEmail}` : "",
      representanteTelefone ? `telefone ${representanteTelefone}` : ""
    ]
      .filter(Boolean)
      .join(", ");
  }

  return [
    joinPartes(a.nome_completo.toUpperCase(), texto(a.nacionalidade), texto(a.estado_civil), texto(a.profissao)),
    texto(a.rg) ? `portador(a) do RG n° ${texto(a.rg)}` : "",
    cpfQualificacao(a.cpf),
    nascimento ? `nascido(a) em ${nascimento}` : "",
    endereco ? `residente e domiciliado(a) à ${endereco}` : "",
    email ? `endereço eletrônico ${email}` : "",
    telefone ? `telefone ${telefone}` : ""
  ]
    .filter(Boolean)
    .join(", ");
}

export function criarTextoProcuracao(a: AssistidoDocumentoData) {
  const outorgados = buildOutorgadosText({
    nome: a.advogado_adicional_nome,
    uf: a.advogado_adicional_uf,
    oab: a.advogado_adicional_oab
  });
  const assinatura = a.menor && a.representante_legal_nome
    ? [
        a.representante_legal_nome.toUpperCase(),
        cpfAssinatura(a.representante_legal_cpf),
        `Representante legal de ${a.nome_completo.toUpperCase()}`
      ].filter(Boolean).join("\n")
    : [
        a.nome_completo.toUpperCase(),
        cpfAssinatura(a.cpf)
      ].filter(Boolean).join("\n");

  return `PROCURAÇÃO

OUTORGANTE(S): ${qualificacaoCompleta(a)}.

OUTORGADO(S): ${outorgados}.

PODERES: Pelo presente instrumento particular, o(a) outorgante nomeia e constitui seu bastante procurador o outorgado acima qualificado, conferindo-lhe poderes para o foro em geral, com cláusula ad judicia et extra, para representá-lo(a) em qualquer juízo, instância ou tribunal, bem como perante quaisquer órgãos da Administração Pública direta e indireta, federal, estadual ou municipal, inclusive autoridades policiais e órgãos de trânsito, podendo propor ações e defendê-lo(a) nas contrárias, atuar em processos judiciais e administrativos de qualquer natureza, inclusive inquéritos policiais, termos circunstanciados e procedimentos investigatórios em geral, requerer habilitação, vista e carga de autos, físicos ou eletrônicos, firmar acordos, transigir, desistir, renunciar, reconhecer pedidos, receber e dar quitação, levantar valores, alvarás, requisições e depósitos judiciais ou administrativos, firmar compromissos, assinar termos, inclusive para fins de autocomposição, substabelecer com ou sem reserva de poderes, inclusive para fins específicos, bem como praticar todos os atos necessários ao fiel cumprimento deste mandato.

${localData()}.

________________________________________________________________________________
${assinatura}`;
}

export function criarTextoHipossuficiencia(a: AssistidoDocumentoData) {
  if (a.menor && a.representante_legal_nome) {
    const endereco = enderecoSemCep(a);
    const representanteEmail = texto(a.representante_legal_email || a.email);
    const representanteTelefone = texto(a.representante_legal_telefone || a.telefone_whatsapp);
    const representanteQualificacao = [
      joinPartes(
        a.representante_legal_nome.toUpperCase(),
        texto(a.representante_legal_nacionalidade),
        texto(a.representante_legal_estado_civil),
        texto(a.representante_legal_profissao)
      ),
      texto(a.representante_legal_rg) ? `portador(a) do RG n° ${texto(a.representante_legal_rg)}` : "",
      cpfQualificacao(a.representante_legal_cpf),
      endereco ? `residente e domiciliado(a) à ${endereco}` : "",
      texto(a.cep) ? `CEP ${texto(a.cep)}` : "",
      representanteEmail ? `endereço eletrônico ${representanteEmail}` : "",
      representanteTelefone ? `telefone ${representanteTelefone}` : ""
    ]
      .filter(Boolean)
      .join(", ");

    const menorQualificacao = [
      `${a.nome_completo.toUpperCase()}, menor impúbere`,
      formatDate(a.data_nascimento) ? `nascido(a) em ${formatDate(a.data_nascimento)}` : "",
      cpfQualificacao(a.cpf)
    ]
      .filter(Boolean)
      .join(", ");

    return `DECLARAÇÃO DE HIPOSSUFICIÊNCIA

Eu, ${representanteQualificacao}, na qualidade de ${texto(a.representante_legal_parentesco) || "representante legal"} de ${menorQualificacao}, DECLARO, para os devidos fins de direito, sob as penas da lei, que o(a) menor representado(a) não possui condições de arcar com as custas processuais, despesas e honorários advocatícios sem prejuízo de seu sustento e de sua família, razão pela qual faz jus aos benefícios da gratuidade da justiça, nos termos do art. 98 do Código de Processo Civil, sendo presumidamente verdadeira a presente declaração, conforme dispõe o art. 99, §3°, do mesmo diploma legal, bem como em conformidade com o art. 5°, inciso LXXIV, da Constituição Federal.

Declaro, ainda, que as informações acima prestadas são verdadeiras, estando ciente de que a falsidade da presente declaração poderá ensejar responsabilização civil, administrativa e penal, nos termos da legislação aplicável.

${localData()}.

________________________________________________________________________________
${[
  a.representante_legal_nome.toUpperCase(),
  cpfAssinatura(a.representante_legal_cpf),
  `Representante legal de ${a.nome_completo.toUpperCase()}`
].filter(Boolean).join("\n")}`;
  }

  return `DECLARAÇÃO DE HIPOSSUFICIÊNCIA

Eu, ${qualificacaoCompleta(a)}, DECLARO, para os devidos fins de direito, sob as penas da lei, que não possuo condições de arcar com as custas processuais, despesas e honorários advocatícios sem prejuízo do meu sustento próprio e de minha família, razão pela qual faço jus aos benefícios da gratuidade da justiça, nos termos do art. 98 do Código de Processo Civil, sendo presumidamente verdadeira a presente declaração, conforme dispõe o art. 99, §3°, do mesmo diploma legal, bem como em conformidade com o art. 5°, inciso LXXIV, da Constituição Federal.

Declaro, ainda, que as informações acima prestadas são verdadeiras, estando ciente de que a falsidade da presente declaração poderá ensejar responsabilização civil, administrativa e penal, nos termos da legislação aplicável.

${localData()}.

________________________________________________________________________________
${[
  a.nome_completo.toUpperCase(),
  cpfAssinatura(a.cpf)
].filter(Boolean).join("\n")}`;
}

export function criarTextoDocumento(tipo: TipoDocumento, assistido: AssistidoDocumentoData) {
  if (tipo === "hipossuficiencia") return criarTextoHipossuficiencia(assistido);
  return criarTextoProcuracao(assistido);
}

export function tituloDocumento(tipo: TipoDocumento, nome: string) {
  const prefix = tipo === "hipossuficiencia" ? "Declaração de Hipossuficiência" : "Procuração";
  return `${prefix} - ${nome}`;
}

export function criarTextoDadosGerais(a: AssistidoDocumentoData & {
  indicacao?: string | null;
  observacoes?: string | null;
}) {
  const nascimento = formatDate(a.data_nascimento);
  const identificacao = [
    joinPartes(a.nome_completo.toUpperCase(), texto(a.nacionalidade), texto(a.estado_civil), texto(a.profissao)),
    texto(a.rg) ? `portador(a) do RG n° ${texto(a.rg)}` : "",
    hasCpf(a.cpf) ? `inscrito(a) no CPF sob o n° ${displayCpf(a.cpf)}` : "",
    nascimento ? `nascido(a) em ${nascimento}` : "",
    texto(a.endereco_completo) ? `residente e domiciliado(a) à ${texto(a.endereco_completo)}` : "",
    texto(a.email) ? `endereço eletrônico ${texto(a.email)}` : "",
    texto(a.telefone_whatsapp) ? `telefone ${texto(a.telefone_whatsapp)}` : ""
  ].filter(Boolean).join(", ");
  const endereco = [
    texto(a.logradouro) ? `Rua ${texto(a.logradouro)}` : "",
    texto(a.numero) ? `n° ${texto(a.numero)}` : "",
    texto(a.complemento) ? `complemento ${texto(a.complemento)}` : "",
    texto(a.bairro) ? `bairro ${texto(a.bairro)}` : "",
    texto(a.municipio) ? `município ${texto(a.municipio)}` : "",
    texto(a.estado) ? `estado ${texto(a.estado)}` : "",
    texto(a.cep) ? `CEP ${texto(a.cep)}` : ""
  ].filter(Boolean).join(", ");
  return `DADOS GERAIS
IDENTIFICAÇÃO: ${identificacao}.
ENDEREÇO: ${endereco}.
ATENDIMENTO DO DIA: O presente relatório reúne os dados gerais coletados no cadastro inicial do assistido, para fins de organização interna do atendimento jurídico, triagem documental e posterior vinculação aos atendimentos realizados.
INDICAÇÃO: ${texto(a.indicacao)}.
OBSERVAÇÕES: ${texto(a.observacoes)}.
${localData()}.`;
}
