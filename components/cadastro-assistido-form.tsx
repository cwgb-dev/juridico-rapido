"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { BarChart3, Download, ExternalLink, FileText, FolderOpen, Loader2, MessageCircle, Pencil, Plus, Save, Search, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCep, formatCpf, isGeneratedNoCpf, onlyDigits } from "@/lib/utils";

type Assistido = {
  cpf: string;
  nome_completo: string;
  indicacao?: string | null;
  observacoes?: string | null;
  telefone_whatsapp?: string | null;
  pasta_drive_url?: string | null;
  dados_gerais_url?: string | null;
  advogado_adicional_nome?: string | null;
  created_at: string;
  [key: string]: unknown;
};

type FormState = {
  nome_completo: string;
  nacionalidade: string;
  estado_civil: string;
  profissao: string;
  rg: string;
  cpf: string;
  data_nascimento: string;
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  municipio: string;
  estado: string;
  email: string;
  telefone_whatsapp: string;
  indicacao: string;
  observacoes: string;
  menor: boolean;
  representante_legal_nome: string;
  representante_legal_parentesco: string;
  representante_legal_nacionalidade: string;
  representante_legal_estado_civil: string;
  representante_legal_profissao: string;
  representante_legal_rg: string;
  representante_legal_cpf: string;
  representante_legal_email: string;
  representante_legal_telefone: string;
  adicionar_advogado: boolean;
  advogado_adicional_oab: string;
  advogado_adicional_uf: string;
  advogado_adicional_nome: string;
};

type DemandState = {
  data_atendimento: string;
  numero_processo: string;
  relato: string;
  observacoes: string;
};

type UsuarioAutorizado = {
  id: number;
  email: string;
  nome?: string | null;
  role: string;
  ativo: boolean;
  drive_permission_id?: string | null;
};

type RelatorioData = {
  resumo: {
    assistidos: number;
    atendimentos: number;
    menores: number;
    comCpf: number;
    semCpf: number;
    cadastrosNoMes: number;
    atendimentosNoMes: number;
  };
  indicacoes: Array<{ label: string; total: number }>;
  cadastrosPorMes: Array<{ label: string; total: number }>;
  atendimentosPorMes: Array<{ label: string; total: number }>;
  ultimosAtendimentos: Array<{ id: number; data: string; assistido: string; numero_processo: string; relato: string }>;
  assistidosRecentes: Array<{ cpf: string; nome: string; data: string; menor: boolean; indicacao: string; atendimentos: number }>;
};

const initialForm: FormState = {
  nome_completo: "",
  nacionalidade: "brasileiro(a)",
  estado_civil: "",
  profissao: "",
  rg: "",
  cpf: "",
  data_nascimento: "",
  cep: "",
  logradouro: "",
  numero: "",
  complemento: "",
  bairro: "",
  municipio: "",
  estado: "",
  email: "",
  telefone_whatsapp: "",
  indicacao: "",
  observacoes: "",
  menor: false,
  representante_legal_nome: "",
  representante_legal_parentesco: "genitor(a)",
  representante_legal_nacionalidade: "brasileiro(a)",
  representante_legal_estado_civil: "",
  representante_legal_profissao: "",
  representante_legal_rg: "",
  representante_legal_cpf: "",
  representante_legal_email: "",
  representante_legal_telefone: "",
  adicionar_advogado: false,
  advogado_adicional_oab: "",
  advogado_adicional_uf: "RR",
  advogado_adicional_nome: ""
};

const initialDemand: DemandState = {
  data_atendimento: new Date().toISOString().slice(0, 10),
  numero_processo: "",
  relato: "",
  observacoes: ""
};

async function readJsonResponse(response: Response) {
  const text = await response.text();
  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch {
    return {
      error: response.ok
        ? "A resposta do servidor veio em formato inesperado."
        : `Erro do servidor (${response.status}). Confira as variaveis de ambiente e os logs do deploy.`
    };
  }
}

export function CadastroAssistidoForm() {
  const [tab, setTab] = useState<"assistidos" | "cliente" | "cadastro" | "demanda" | "acessos" | "relatorios">("assistidos");
  const [assistidos, setAssistidos] = useState<Assistido[]>([]);
  const [usuarios, setUsuarios] = useState<UsuarioAutorizado[]>([]);
  const [selected, setSelected] = useState<Assistido | null>(null);
  const [form, setForm] = useState<FormState>(initialForm);
  const [editingCpf, setEditingCpf] = useState<string | null>(null);
  const [demand, setDemand] = useState<DemandState>(initialDemand);
  const [loadingList, setLoadingList] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [quickGenerating, setQuickGenerating] = useState<string | null>(null);
  const [aiGeneratingCpf, setAiGeneratingCpf] = useState<string | null>(null);
  const [deletingCpf, setDeletingCpf] = useState<string | null>(null);
  const [cepLoading, setCepLoading] = useState(false);
  const [lawyerLookupLoading, setLawyerLookupLoading] = useState(false);
  const [lawyerSaveLoading, setLawyerSaveLoading] = useState(false);
  const [lawyerLookupStatus, setLawyerLookupStatus] = useState("");
  const [cnaLookupUrl, setCnaLookupUrl] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [dadosGeraisUrl, setDadosGeraisUrl] = useState("");
  const [accessEmail, setAccessEmail] = useState("");
  const [accessNome, setAccessNome] = useState("");
  const [accessRole, setAccessRole] = useState("user");
  const [accessLoading, setAccessLoading] = useState(false);
  const [relatorio, setRelatorio] = useState<RelatorioData | null>(null);
  const [relatorioLoading, setRelatorioLoading] = useState(false);
  const [relatorioFrom, setRelatorioFrom] = useState("");
  const [relatorioTo, setRelatorioTo] = useState("");

  useEffect(() => {
    loadAssistidos();
    loadUsuarios();
  }, []);

  async function loadAssistidos() {
    setLoadingList(true);
    try {
      const response = await fetch("/api/assistidos");
      const data = await readJsonResponse(response);
      if (!response.ok) throw new Error(data.error || "Nao foi possivel carregar os assistidos.");
      setAssistidos(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar assistidos.");
    } finally {
      setLoadingList(false);
    }
  }

  async function loadUsuarios() {
    try {
      const response = await fetch("/api/usuarios-autorizados");
      const data = await readJsonResponse(response);
      if (!response.ok) throw new Error(data.error || "Nao foi possivel carregar os acessos.");
      setUsuarios(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar acessos.");
    }
  }

  async function loadRelatorio() {
    setRelatorioLoading(true);
    resetFeedback();

    try {
      const params = new URLSearchParams();
      if (relatorioFrom) params.set("from", relatorioFrom);
      if (relatorioTo) params.set("to", relatorioTo);
      const response = await fetch(`/api/relatorios${params.toString() ? `?${params}` : ""}`);
      const data = await readJsonResponse(response);
      if (!response.ok) throw new Error(data.error || "Nao foi possivel carregar os relatorios.");
      setRelatorio(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar relatorios.");
    } finally {
      setRelatorioLoading(false);
    }
  }

  function exportRelatorio(type: "assistidos" | "atendimentos") {
    const params = new URLSearchParams({ export: type });
    if (relatorioFrom) params.set("from", relatorioFrom);
    if (relatorioTo) params.set("to", relatorioTo);
    window.open(`/api/relatorios?${params}`, "_blank");
  }

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function updateDemand<K extends keyof DemandState>(key: K, value: DemandState[K]) {
    setDemand((current) => ({ ...current, [key]: value }));
  }

  function resetFeedback() {
    setError("");
    setMessage("");
  }

  function openDemand(assistido: Assistido) {
    setSelected(assistido);
    setDemand({ ...initialDemand, data_atendimento: new Date().toISOString().slice(0, 10) });
    resetFeedback();
    setTab("demanda");
  }

  function openCliente(assistido: Assistido) {
    setSelected(assistido);
    resetFeedback();
    setDadosGeraisUrl("");
    setTab("cliente");
  }

  function openNewCadastro() {
    setEditingCpf(null);
    setForm(initialForm);
    setLawyerLookupStatus("");
    setCnaLookupUrl("");
    resetFeedback();
    setTab("cadastro");
  }

  function openEditCadastro(assistido: Assistido) {
    setEditingCpf(assistido.cpf);
    setForm(formFromAssistido(assistido));
    setLawyerLookupStatus("");
    setCnaLookupUrl("");
    resetFeedback();
    setTab("cadastro");
  }

  function closeCadastro() {
    setEditingCpf(null);
    setForm(initialForm);
    setLawyerLookupStatus("");
    setCnaLookupUrl("");
    resetFeedback();
    setTab("assistidos");
  }

  async function handleCep(value: string) {
    const formatted = formatCep(value);
    update("cep", formatted);
    const cep = onlyDigits(formatted);
    if (cep.length !== 8) return;

    setCepLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/cep?cep=${cep}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "CEP nao encontrado.");

      setForm((current) => ({
        ...current,
        cep: data.cep,
        logradouro: data.logradouro || current.logradouro,
        bairro: data.bairro || current.bairro,
        municipio: data.municipio || current.municipio,
        estado: data.estado || current.estado
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao buscar CEP.");
    } finally {
      setCepLoading(false);
    }
  }

  async function handleLawyerLookup() {
    const oab = onlyDigits(form.advogado_adicional_oab);
    if (!oab) {
      setLawyerLookupStatus("Informe a OAB para buscar o advogado.");
      return;
    }

    setLawyerLookupLoading(true);
    setLawyerLookupStatus("");
    setCnaLookupUrl("");
    setError("");

    try {
      const response = await fetch(`/api/advogados/lookup?uf=${form.advogado_adicional_uf}&oab=${oab}`);
      const data = await response.json();
      if (!response.ok) {
        if (data.cna_url) setCnaLookupUrl(data.cna_url);
        throw new Error(data.error || "Nao foi possivel localizar o advogado.");
      }

      setForm((current) => ({
        ...current,
        advogado_adicional_oab: oab,
        advogado_adicional_nome: data.lawyer.nome_exibicao || data.lawyer.nome
      }));
      setLawyerLookupStatus(`Advogado encontrado: ${data.lawyer.nome_exibicao || data.lawyer.nome}.`);
      setCnaLookupUrl("");
    } catch (err) {
      setForm((current) => ({ ...current, advogado_adicional_nome: "" }));
      setLawyerLookupStatus(err instanceof Error ? err.message : "Erro ao buscar advogado.");
    } finally {
      setLawyerLookupLoading(false);
    }
  }

  function handleOpenCnaLookup() {
    const uf = form.advogado_adicional_uf.trim().toUpperCase();
    const oab = onlyDigits(form.advogado_adicional_oab);
    const lookupText = [uf, oab].filter(Boolean).join(" ");

    if (lookupText && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(lookupText).catch(() => undefined);
    }

    setLawyerLookupStatus(
      lookupText
        ? `CNA aberto. Consulta copiada: ${lookupText}.`
        : "CNA aberto para conferencia manual."
    );
    window.open("https://cna.oab.org.br/", "_blank", "noopener,noreferrer");
  }

  async function handleSaveLawyer() {
    const nome = form.advogado_adicional_nome.trim();
    const uf = form.advogado_adicional_uf.trim().toUpperCase();
    const oab = onlyDigits(form.advogado_adicional_oab);

    if (!nome || !uf || !oab) {
      setLawyerLookupStatus("Informe nome, UF e OAB para salvar o advogado na base.");
      return;
    }

    setLawyerSaveLoading(true);
    setLawyerLookupStatus("");
    setError("");

    try {
      const response = await fetch("/api/advogados", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome, uf, oab })
      });
      const data = await readJsonResponse(response);
      if (!response.ok) throw new Error(data.error || "Nao foi possivel salvar o advogado.");

      setForm((current) => ({
        ...current,
        advogado_adicional_nome: data.lawyer.nome_exibicao || nome,
        advogado_adicional_uf: data.lawyer.uf || uf,
        advogado_adicional_oab: data.lawyer.oab || oab
      }));
      setCnaLookupUrl("");
      setLawyerLookupStatus(`Advogado salvo na base local: ${data.lawyer.nome_exibicao || nome}.`);
    } catch (err) {
      setLawyerLookupStatus(err instanceof Error ? err.message : "Erro ao salvar advogado.");
    } finally {
      setLawyerSaveLoading(false);
    }
  }

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    resetFeedback();
    setDadosGeraisUrl("");
    setLawyerLookupStatus("");
    setCnaLookupUrl("");

    const reportWindow = editingCpf ? null : window.open("", "_blank");

    try {
      const payload = {
        ...form,
        cpf: onlyDigits(form.cpf),
        representante_legal_cpf: onlyDigits(form.representante_legal_cpf),
        advogado_adicional_nome: form.adicionar_advogado ? form.advogado_adicional_nome : "",
        advogado_adicional_oab: form.adicionar_advogado ? onlyDigits(form.advogado_adicional_oab) : "",
        advogado_adicional_uf: form.adicionar_advogado ? form.advogado_adicional_uf : ""
      };

      const response = await fetch(editingCpf ? `/api/assistidos/${editingCpf}` : "/api/assistidos", {
        method: editingCpf ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (!response.ok) {
        reportWindow?.close();
        throw new Error(formatApiError(data.error, "Nao foi possivel salvar."));
      }

      setForm(initialForm);
      setEditingCpf(null);
      setDadosGeraisUrl(data.dados_gerais_url || "");
      setMessage(editingCpf ? "Cadastro atualizado com sucesso." : "Assistido salvo, pasta criada e relatorio de dados gerais gerado.");
      if (data.dados_gerais_url && reportWindow) reportWindow.location.href = data.dados_gerais_url;
      await loadAssistidos();
      setTab("assistidos");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar assistido.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveDemand(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;

    setGenerating(true);
    resetFeedback();
    try {
      const response = await fetch("/api/atendimentos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cpf_assistido: selected.cpf,
          data_atendimento: demand.data_atendimento,
          numero_processo: demand.numero_processo,
          relato: demand.relato,
          observacoes: demand.observacoes
        })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Nao foi possivel salvar o atendimento.");
      }

      setDemand({ ...initialDemand, data_atendimento: new Date().toISOString().slice(0, 10) });
      setDadosGeraisUrl(data.dados_gerais_url || "");
      setMessage("Atendimento salvo e Dados Gerais atualizado.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar atendimento.");
    } finally {
      setGenerating(false);
    }
  }

  async function quickGenerate(assistido: Assistido, documentos: ("procuracao" | "hipossuficiencia")[]) {
    const key = `${assistido.cpf}:${documentos.join(",")}`;
    setQuickGenerating(key);
    resetFeedback();
    const firstWindow = window.open("", "_blank");

    try {
      const response = await fetch("/api/documentos/gerar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cpf: assistido.cpf,
          documentos,
          registrar_atendimento: false
        })
      });
      const data = await response.json();
      if (!response.ok) {
        firstWindow?.close();
        throw new Error(data.error || "Nao foi possivel gerar o documento.");
      }

      const firstDoc = data.documentos?.[0]?.documentUrl;
      if (firstDoc && firstWindow) firstWindow.location.href = firstDoc;
      setMessage("Documento gerado na pasta de minutas do assistido.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao gerar documento.");
    } finally {
      setQuickGenerating(null);
    }
  }

  async function generateCaseAnalysis(assistido: Assistido) {
    setAiGeneratingCpf(assistido.cpf);
    resetFeedback();
    const reportWindow = window.open("", "_blank");

    try {
      const response = await fetch("/api/ia/analisar-caso", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cpf: assistido.cpf })
      });
      const data = await readJsonResponse(response);
      if (!response.ok) {
        reportWindow?.close();
        throw new Error(data.error || "Nao foi possivel gerar a analise IA.");
      }

      const reportUrl = data.relatorio?.documentUrl;
      if (reportUrl && reportWindow) reportWindow.location.href = reportUrl;
      setMessage(`Analise IA gerada. Materia: ${data.materia || "nao identificada"}. Medida sugerida: ${data.medida_sugerida || "nao identificada"}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao gerar analise IA.");
    } finally {
      setAiGeneratingCpf(null);
    }
  }

  async function handleDeleteAssistido(assistido: Assistido) {
    const confirmed = window.confirm(`Excluir definitivamente ${assistido.nome_completo} e todos os arquivos dele?`);
    if (!confirmed) return;

    const password = window.prompt("Digite a senha para excluir este assistido:");
    if (!password) return;

    setDeletingCpf(assistido.cpf);
    resetFeedback();

    try {
      const response = await fetch(`/api/assistidos/${assistido.cpf}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Nao foi possivel excluir o assistido.");

      setMessage("Assistido excluido com sucesso, junto com os arquivos locais.");
      await loadAssistidos();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao excluir assistido.");
    } finally {
      setDeletingCpf(null);
    }
  }

  async function handleSaveAccess(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAccessLoading(true);
    resetFeedback();

    try {
      const response = await fetch("/api/usuarios-autorizados", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: accessEmail, nome: accessNome, role: accessRole })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Nao foi possivel salvar o acesso.");

      setAccessEmail("");
      setAccessNome("");
      setAccessRole("user");
      setMessage("Acesso salvo com sucesso.");
      await loadUsuarios();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar acesso.");
    } finally {
      setAccessLoading(false);
    }
  }

  async function toggleAccess(usuario: UsuarioAutorizado) {
    setAccessLoading(true);
    resetFeedback();

    try {
      const response = await fetch(`/api/usuarios-autorizados/${usuario.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ativo: !usuario.ativo })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Nao foi possivel alterar o acesso.");
      await loadUsuarios();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao alterar acesso.");
    } finally {
      setAccessLoading(false);
    }
  }

  async function deleteAccess(usuario: UsuarioAutorizado) {
    const confirmed = window.confirm(`Remover o acesso de ${usuario.email}?`);
    if (!confirmed) return;

    setAccessLoading(true);
    resetFeedback();

    try {
      const response = await fetch(`/api/usuarios-autorizados/${usuario.id}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Nao foi possivel remover o acesso.");
      await loadUsuarios();
      setMessage("Acesso removido.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao remover acesso.");
    } finally {
      setAccessLoading(false);
    }
  }

  return (
    <section className="grid gap-5">
      {tab === "assistidos" ? (
        <div className="grid gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-semibold">Assistidos</h2>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button type="button" variant="outline" onClick={() => {
                setTab("relatorios");
                void loadRelatorio();
              }} className="w-full sm:w-fit">
                <BarChart3 className="h-4 w-4" />
                Relatorios
              </Button>
              <Button type="button" variant="outline" onClick={() => setTab("acessos")} className="w-full sm:w-fit">
                Acessos
              </Button>
              <Button type="button" onClick={openNewCadastro} className="w-full sm:w-fit">
                <Plus className="h-4 w-4" />
                Novo cadastro
              </Button>
            </div>
          </div>

          <Status error={error} message={message} />

          {loadingList ? (
            <p className="text-sm text-muted-foreground">Carregando assistidos...</p>
          ) : assistidos.length ? (
            <div className="grid gap-2">
              {assistidos.map((assistido) => (
                <div key={assistido.cpf} className="grid gap-3 rounded-md border border-border bg-white p-3 sm:grid-cols-[1fr_auto] sm:items-center">
                  <button type="button" onClick={() => openCliente(assistido)} className="grid gap-1 text-left">
                    <p className="font-semibold">{assistido.nome_completo}</p>
                    <p className="text-sm text-muted-foreground">
                      {assistido.indicacao ? `Indicacao: ${assistido.indicacao}` : "Indicacao nao informada"}
                    </p>
                    <p className="text-sm text-muted-foreground">{assistido.telefone_whatsapp || "Telefone nao informado"}</p>
                    {assistido.observacoes ? (
                      <p className="text-sm text-muted-foreground">Observacao: {assistido.observacoes}</p>
                    ) : null}
                  </button>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => openCliente(assistido)}>
                      <FileText className="h-4 w-4" />
                      Abrir
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-md border border-border bg-white p-4 text-sm text-muted-foreground">Nenhum assistido cadastrado.</p>
          )}
        </div>
      ) : null}

      {tab === "relatorios" ? (
        <div className="grid gap-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-semibold">Relatorios</h2>
            <Button type="button" variant="outline" onClick={() => setTab("assistidos")} className="w-full sm:w-fit">
              Voltar
            </Button>
          </div>

          <Status error={error} message={message} />

          <div className="grid gap-3 rounded-md border border-border bg-white p-3 sm:grid-cols-[1fr_1fr_auto_auto_auto] sm:items-end">
            <Field label="Inicio" htmlFor="relatorio_from">
              <Input id="relatorio_from" type="date" value={relatorioFrom} onChange={(event) => setRelatorioFrom(event.target.value)} />
            </Field>
            <Field label="Fim" htmlFor="relatorio_to">
              <Input id="relatorio_to" type="date" value={relatorioTo} onChange={(event) => setRelatorioTo(event.target.value)} />
            </Field>
            <Button type="button" onClick={loadRelatorio} disabled={relatorioLoading}>
              {relatorioLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <BarChart3 className="h-4 w-4" />}
              Atualizar
            </Button>
            <Button type="button" variant="outline" onClick={() => exportRelatorio("assistidos")}>
              <Download className="h-4 w-4" />
              Assistidos CSV
            </Button>
            <Button type="button" variant="outline" onClick={() => exportRelatorio("atendimentos")}>
              <Download className="h-4 w-4" />
              Atendimentos CSV
            </Button>
          </div>

          {relatorioLoading ? (
            <p className="text-sm text-muted-foreground">Carregando relatorios...</p>
          ) : relatorio ? (
            <div className="grid gap-5">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Metric label="Assistidos" value={relatorio.resumo.assistidos} />
                <Metric label="Atendimentos" value={relatorio.resumo.atendimentos} />
                <Metric label="Menores" value={relatorio.resumo.menores} />
                <Metric label="Sem CPF" value={relatorio.resumo.semCpf} />
                <Metric label="Com CPF" value={relatorio.resumo.comCpf} />
                <Metric label="Cadastros no mes" value={relatorio.resumo.cadastrosNoMes} />
                <Metric label="Atendimentos no mes" value={relatorio.resumo.atendimentosNoMes} />
              </div>

              <div className="grid gap-4 lg:grid-cols-3">
                <ReportList title="Indicacoes" items={relatorio.indicacoes.slice(0, 8)} />
                <ReportList title="Cadastros por mes" items={relatorio.cadastrosPorMes.slice(0, 8)} />
                <ReportList title="Atendimentos por mes" items={relatorio.atendimentosPorMes.slice(0, 8)} />
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <div className="grid gap-2">
                  <h3 className="text-base font-semibold">Ultimos atendimentos</h3>
                  {relatorio.ultimosAtendimentos.length ? relatorio.ultimosAtendimentos.map((atendimento) => (
                    <div key={atendimento.id} className="grid gap-1 rounded-md border border-border bg-white p-3">
                      <p className="font-medium">{atendimento.assistido}</p>
                      <p className="text-sm text-muted-foreground">{[atendimento.data, atendimento.numero_processo].filter(Boolean).join(" · ")}</p>
                      <p className="text-sm text-muted-foreground">{atendimento.relato}</p>
                    </div>
                  )) : <p className="rounded-md border border-border bg-white p-3 text-sm text-muted-foreground">Nenhum atendimento no periodo.</p>}
                </div>

                <div className="grid gap-2">
                  <h3 className="text-base font-semibold">Cadastros recentes</h3>
                  {relatorio.assistidosRecentes.length ? relatorio.assistidosRecentes.map((assistido) => (
                    <div key={assistido.cpf} className="grid gap-1 rounded-md border border-border bg-white p-3">
                      <p className="font-medium">{assistido.nome}</p>
                      <p className="text-sm text-muted-foreground">
                        {[assistido.data, assistido.menor ? "Menor" : "Maior", assistido.indicacao, `${assistido.atendimentos} atendimento(s)`].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                  )) : <p className="rounded-md border border-border bg-white p-3 text-sm text-muted-foreground">Nenhum cadastro no periodo.</p>}
                </div>
              </div>
            </div>
          ) : (
            <p className="rounded-md border border-border bg-white p-4 text-sm text-muted-foreground">Atualize para carregar os indicadores.</p>
          )}
        </div>
      ) : null}

      {tab === "acessos" ? (
        <div className="grid gap-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-semibold">Acessos</h2>
            <Button type="button" variant="outline" onClick={() => setTab("assistidos")} className="w-full sm:w-fit">
              Voltar
            </Button>
          </div>

          <Status error={error} message={message} />

          <form onSubmit={handleSaveAccess} className="grid gap-4 rounded-md border border-border bg-white p-3 sm:grid-cols-[1fr_1fr_140px_auto] sm:items-end">
            <Field label="E-mail" htmlFor="access_email">
              <Input id="access_email" type="email" value={accessEmail} onChange={(event) => setAccessEmail(event.target.value)} required />
            </Field>
            <Field label="Nome" htmlFor="access_nome">
              <Input id="access_nome" value={accessNome} onChange={(event) => setAccessNome(event.target.value)} />
            </Field>
            <Field label="Perfil" htmlFor="access_role">
              <Select value={accessRole} onValueChange={setAccessRole}>
                <SelectTrigger id="access_role"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">Usuário</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Button type="submit" disabled={accessLoading}>
              {accessLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Adicionar
            </Button>
          </form>

          <div className="grid gap-2">
            {usuarios.map((usuario) => (
              <div key={usuario.id} className="grid gap-3 rounded-md border border-border bg-white p-3 sm:grid-cols-[1fr_auto] sm:items-center">
                <div>
                  <p className="font-semibold">{usuario.email}</p>
                  <p className="text-sm text-muted-foreground">
                    {[
                      usuario.nome,
                      usuario.role === "admin" ? "Admin" : "Usuário",
                      usuario.ativo ? "Ativo" : "Inativo",
                      usuario.drive_permission_id ? "Drive liberado" : "Drive pendente"
                    ].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => toggleAccess(usuario)} disabled={accessLoading}>
                    {usuario.ativo ? "Desativar" : "Ativar"}
                  </Button>
                  <Button type="button" variant="destructive" size="sm" onClick={() => deleteAccess(usuario)} disabled={accessLoading}>
                    Remover
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {tab === "cliente" ? (
        selected ? (
          <div className="grid gap-5">
            <div className="grid gap-3 rounded-md border border-border bg-white p-3 sm:grid-cols-[1fr_auto] sm:items-center">
              <div>
                <p className="text-sm text-muted-foreground">Cliente</p>
                <p className="font-semibold">{selected.nome_completo}</p>
                <p className="text-sm text-muted-foreground">
                  {selected.indicacao ? `Indicacao: ${selected.indicacao}` : "Indicacao nao informada"}
                </p>
                <p className="text-sm text-muted-foreground">{selected.telefone_whatsapp || "Telefone nao informado"}</p>
                {selected.observacoes ? <p className="text-sm text-muted-foreground">Observacao: {selected.observacoes}</p> : null}
              </div>
              <Button type="button" variant="outline" onClick={() => setTab("assistidos")} className="w-full sm:w-fit">
                Voltar
              </Button>
            </div>

            <Status error={error} message={message} />
            {dadosGeraisUrl ? <DocLink href={dadosGeraisUrl}>Abrir Dados Gerais atualizado</DocLink> : null}

            <div className="flex flex-wrap gap-2">
              {selected.dados_gerais_url ? <DocLink href={selected.dados_gerais_url}>Dados Gerais</DocLink> : null}
              {selected.pasta_drive_url ? (
                <Button asChild variant="outline" size="sm">
                  <a href={selected.pasta_drive_url} target="_blank" rel="noreferrer">
                    <FolderOpen className="h-4 w-4" />
                    Pasta
                  </a>
                </Button>
              ) : null}
              {selected.telefone_whatsapp ? (
                <Button asChild variant="outline" size="sm">
                  <a href={whatsappUrl(selected)} target="_blank" rel="noreferrer">
                    <MessageCircle className="h-4 w-4" />
                    WhatsApp
                  </a>
                </Button>
              ) : null}
              <Button type="button" variant="outline" size="sm" onClick={() => openEditCadastro(selected)}>
                <Pencil className="h-4 w-4" />
                Editar
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={quickGenerating === `${selected.cpf}:procuracao`}
                onClick={() => quickGenerate(selected, ["procuracao"])}
              >
                {quickGenerating === `${selected.cpf}:procuracao` ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                Procuracao
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={quickGenerating === `${selected.cpf}:hipossuficiencia`}
                onClick={() => quickGenerate(selected, ["hipossuficiencia"])}
              >
                {quickGenerating === `${selected.cpf}:hipossuficiencia` ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                Hipossuficiencia
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => openDemand(selected)}>
                <FileText className="h-4 w-4" />
                Atendimentos
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={aiGeneratingCpf === selected.cpf}
                onClick={() => generateCaseAnalysis(selected)}
              >
                {aiGeneratingCpf === selected.cpf ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Analise IA
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                disabled={deletingCpf === selected.cpf}
                onClick={() => handleDeleteAssistido(selected)}
              >
                {deletingCpf === selected.cpf ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                Excluir
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid gap-3 rounded-md border border-border bg-white p-4">
            <p className="text-sm text-muted-foreground">Selecione um assistido para abrir os dados do cliente.</p>
            <Button type="button" variant="outline" onClick={() => setTab("assistidos")} className="w-fit">Ir para assistidos</Button>
          </div>
        )
      ) : null}

      {tab === "cadastro" ? (
        <form onSubmit={handleSave} className="grid gap-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-semibold">{editingCpf ? "Editar cadastro" : "Novo cadastro"}</h2>
            <Button type="button" variant="outline" onClick={closeCadastro} className="w-full sm:w-fit">
              Voltar
            </Button>
          </div>
          <CadastroFields
            form={form}
            update={update}
            handleCep={handleCep}
            cepLoading={cepLoading}
            lawyerLookupLoading={lawyerLookupLoading}
            lawyerSaveLoading={lawyerSaveLoading}
            lawyerLookupStatus={lawyerLookupStatus}
            cnaLookupUrl={cnaLookupUrl}
            onLawyerLookup={handleLawyerLookup}
            onOpenCnaLookup={handleOpenCnaLookup}
            onSaveLawyer={handleSaveLawyer}
            isEditing={Boolean(editingCpf)}
          />
          <Status error={error} message={message} />
          <Button type="submit" size="lg" disabled={saving} className="w-full sm:w-fit">
            {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
            {editingCpf ? "Salvar alteracoes" : "Salvar cadastro"}
          </Button>
        </form>
      ) : null}

      {tab === "demanda" ? (
        selected ? (
          <form onSubmit={handleSaveDemand} className="grid gap-5">
            <div className="grid gap-3 rounded-md border border-border bg-white p-3 sm:grid-cols-[1fr_auto] sm:items-center">
              <div>
                <p className="text-sm text-muted-foreground">Atendimentos de</p>
                <p className="font-semibold">{selected.nome_completo}</p>
                <p className="text-sm text-muted-foreground">{selected.telefone_whatsapp || "Telefone nao informado"}</p>
              </div>
              <Button type="button" variant="outline" onClick={() => setTab("assistidos")} className="w-full sm:w-fit">
                Voltar
              </Button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Data do atendimento" htmlFor="data_atendimento">
                <Input id="data_atendimento" type="date" value={demand.data_atendimento} onChange={(event) => updateDemand("data_atendimento", event.target.value)} required />
              </Field>

              <Field label="Numero do processo" htmlFor="numero_processo">
                <Input id="numero_processo" value={demand.numero_processo} onChange={(event) => updateDemand("numero_processo", event.target.value)} />
              </Field>

              <Field label="Relato do atendimento" htmlFor="relato" wide>
                <Textarea id="relato" value={demand.relato} onChange={(event) => updateDemand("relato", event.target.value)} required />
              </Field>

              <Field label="Observacoes" htmlFor="demanda_observacoes" wide>
                <Textarea id="demanda_observacoes" value={demand.observacoes} onChange={(event) => updateDemand("observacoes", event.target.value)} />
              </Field>
            </div>

            <Status error={error} message={message} />

            {dadosGeraisUrl ? <DocLink href={dadosGeraisUrl}>Abrir Dados Gerais</DocLink> : null}

            <Button type="submit" size="lg" disabled={generating} className="w-full sm:w-fit">
              {generating ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
              Salvar atendimento
            </Button>
          </form>
        ) : (
          <div className="grid gap-3 rounded-md border border-border bg-white p-4">
            <p className="text-sm text-muted-foreground">Selecione um assistido na aba Assistidos para registrar um atendimento.</p>
            <Button type="button" variant="outline" onClick={() => setTab("assistidos")} className="w-fit">Ir para assistidos</Button>
          </div>
        )
      ) : null}
    </section>
  );
}

function CadastroFields({
  form,
  update,
  handleCep,
  cepLoading,
  lawyerLookupLoading,
  lawyerSaveLoading,
  lawyerLookupStatus,
  cnaLookupUrl,
  onLawyerLookup,
  onOpenCnaLookup,
  onSaveLawyer,
  isEditing
}: {
  form: FormState;
  update: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
  handleCep: (value: string) => void;
  cepLoading: boolean;
  lawyerLookupLoading: boolean;
  lawyerSaveLoading: boolean;
  lawyerLookupStatus: string;
  cnaLookupUrl: string;
  onLawyerLookup: () => void;
  onOpenCnaLookup: () => void;
  onSaveLawyer: () => void;
  isEditing: boolean;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Nome completo" htmlFor="nome_completo" wide>
        <Input id="nome_completo" value={form.nome_completo} onChange={(event) => update("nome_completo", event.target.value)} autoFocus required />
      </Field>
      <Field label="Nacionalidade" htmlFor="nacionalidade">
        <Input id="nacionalidade" value={form.nacionalidade} onChange={(event) => update("nacionalidade", event.target.value)} />
      </Field>
      <Field label="Estado civil" htmlFor="estado_civil">
        <Select value={form.estado_civil} onValueChange={(value) => update("estado_civil", value)}>
          <SelectTrigger id="estado_civil"><SelectValue placeholder="Selecionar" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="solteiro(a)">Solteiro(a)</SelectItem>
            <SelectItem value="casado(a)">Casado(a)</SelectItem>
            <SelectItem value="divorciado(a)">Divorciado(a)</SelectItem>
            <SelectItem value="viuvo(a)">Viuvo(a)</SelectItem>
            <SelectItem value="uniao estavel">Uniao estavel</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      <Field label="Profissao" htmlFor="profissao">
        <Input id="profissao" value={form.profissao} onChange={(event) => update("profissao", event.target.value)} />
      </Field>
      <Field label="Documento de identidade (RG)" htmlFor="rg">
        <Input id="rg" value={form.rg} onChange={(event) => update("rg", event.target.value)} />
      </Field>
      <Field label="CPF" htmlFor="cpf">
        <Input id="cpf" inputMode="numeric" value={formatCpf(form.cpf)} onChange={(event) => update("cpf", formatCpf(event.target.value))} disabled={isEditing} />
      </Field>
      <Field label="Data de nascimento" htmlFor="data_nascimento">
        <Input id="data_nascimento" type="date" value={form.data_nascimento} onChange={(event) => update("data_nascimento", event.target.value)} />
      </Field>
      <Field label="CEP" htmlFor="cep">
        <div className="relative">
          <Input id="cep" inputMode="numeric" value={form.cep} onChange={(event) => handleCep(event.target.value)} />
          {cepLoading ? <Loader2 className="absolute right-3 top-3 h-5 w-5 animate-spin text-muted-foreground" /> : null}
        </div>
      </Field>
      <Field label="Rua" htmlFor="logradouro" wide>
        <Input id="logradouro" value={form.logradouro} onChange={(event) => update("logradouro", event.target.value)} />
      </Field>
      <Field label="Numero" htmlFor="numero">
        <Input id="numero" value={form.numero} onChange={(event) => update("numero", event.target.value)} />
      </Field>
      <Field label="Bairro" htmlFor="bairro">
        <Input id="bairro" value={form.bairro} onChange={(event) => update("bairro", event.target.value)} />
      </Field>
      <Field label="Cidade" htmlFor="municipio">
        <Input id="municipio" value={form.municipio} onChange={(event) => update("municipio", event.target.value)} />
      </Field>
      <Field label="Estado" htmlFor="estado">
        <Input id="estado" maxLength={2} value={form.estado} onChange={(event) => update("estado", event.target.value.toUpperCase())} />
      </Field>
      <Field label="Complemento" htmlFor="complemento">
        <Input id="complemento" value={form.complemento} onChange={(event) => update("complemento", event.target.value)} />
      </Field>
      <Field label="Endereco eletronico (e-mail)" htmlFor="email">
        <Input id="email" type="email" value={form.email} onChange={(event) => update("email", event.target.value)} />
      </Field>
      <Field label="Telefone" htmlFor="telefone_whatsapp">
        <Input id="telefone_whatsapp" inputMode="tel" value={form.telefone_whatsapp} onChange={(event) => update("telefone_whatsapp", event.target.value)} />
      </Field>
      <Field label="Indicacao" htmlFor="indicacao">
        <Input id="indicacao" value={form.indicacao} onChange={(event) => update("indicacao", event.target.value)} />
      </Field>

      <div className="grid gap-3 rounded-md border border-border bg-white p-3 sm:col-span-2">
        <label className="flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" checked={form.adicionar_advogado} onChange={(event) => {
            const checked = event.target.checked;
            update("adicionar_advogado", checked);
            if (!checked) {
              update("advogado_adicional_oab", "");
              update("advogado_adicional_nome", "");
              update("advogado_adicional_uf", "RR");
            }
          }} className="h-5 w-5" />
          Adicionar advogado na procuracao
        </label>
        {form.adicionar_advogado ? (
          <div className="grid gap-4 sm:grid-cols-[120px_1fr_auto] sm:items-end">
            <Field label="UF" htmlFor="advogado_adicional_uf">
              <Input id="advogado_adicional_uf" maxLength={2} value={form.advogado_adicional_uf} onChange={(event) => update("advogado_adicional_uf", event.target.value.toUpperCase())} />
            </Field>
            <Field label="OAB do advogado" htmlFor="advogado_adicional_oab">
              <Input id="advogado_adicional_oab" inputMode="numeric" value={form.advogado_adicional_oab} onChange={(event) => update("advogado_adicional_oab", onlyDigits(event.target.value))} />
            </Field>
            <Button type="button" variant="outline" onClick={onLawyerLookup} disabled={lawyerLookupLoading}>
              {lawyerLookupLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Buscar OAB
            </Button>
            <Field label="Advogado encontrado" htmlFor="advogado_adicional_nome" wide>
              <Input id="advogado_adicional_nome" value={form.advogado_adicional_nome} onChange={(event) => update("advogado_adicional_nome", event.target.value)} placeholder="Nome do advogado adicional" />
            </Field>
            {lawyerLookupStatus ? <p className="text-sm text-muted-foreground sm:col-span-3">{lawyerLookupStatus}</p> : null}
            <div className="flex flex-col gap-2 sm:col-span-3 sm:flex-row">
              {cnaLookupUrl || form.advogado_adicional_oab ? (
                <Button type="button" variant="outline" onClick={onOpenCnaLookup} className="w-full sm:w-fit">
                  <ExternalLink className="h-4 w-4" />
                  Conferir no CNA
                </Button>
              ) : null}
              {form.advogado_adicional_oab && form.advogado_adicional_nome ? (
                <Button type="button" variant="outline" onClick={onSaveLawyer} disabled={lawyerSaveLoading} className="w-full sm:w-fit">
                  {lawyerSaveLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Salvar advogado na base
                </Button>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>

      <div className="grid gap-3 rounded-md border border-border bg-white p-3 sm:col-span-2">
        <label className="flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" checked={form.menor} onChange={(event) => update("menor", event.target.checked)} className="h-5 w-5" />
          Assistido menor com representante legal
        </label>
        {form.menor ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Representante legal" htmlFor="representante_legal_nome" wide>
              <Input id="representante_legal_nome" value={form.representante_legal_nome} onChange={(event) => update("representante_legal_nome", event.target.value)} />
            </Field>
            <Field label="Parentesco/qualidade" htmlFor="representante_legal_parentesco">
              <Input id="representante_legal_parentesco" value={form.representante_legal_parentesco} onChange={(event) => update("representante_legal_parentesco", event.target.value)} />
            </Field>
            <Field label="Nacionalidade do representante" htmlFor="representante_legal_nacionalidade">
              <Input id="representante_legal_nacionalidade" value={form.representante_legal_nacionalidade} onChange={(event) => update("representante_legal_nacionalidade", event.target.value)} />
            </Field>
            <Field label="Estado civil do representante" htmlFor="representante_legal_estado_civil">
              <Input id="representante_legal_estado_civil" value={form.representante_legal_estado_civil} onChange={(event) => update("representante_legal_estado_civil", event.target.value)} />
            </Field>
            <Field label="Profissao do representante" htmlFor="representante_legal_profissao">
              <Input id="representante_legal_profissao" value={form.representante_legal_profissao} onChange={(event) => update("representante_legal_profissao", event.target.value)} />
            </Field>
            <Field label="RG do representante" htmlFor="representante_legal_rg">
              <Input id="representante_legal_rg" value={form.representante_legal_rg} onChange={(event) => update("representante_legal_rg", event.target.value)} />
            </Field>
            <Field label="CPF do representante" htmlFor="representante_legal_cpf">
              <Input id="representante_legal_cpf" inputMode="numeric" value={formatCpf(form.representante_legal_cpf)} onChange={(event) => update("representante_legal_cpf", formatCpf(event.target.value))} />
            </Field>
            <Field label="E-mail do representante" htmlFor="representante_legal_email">
              <Input id="representante_legal_email" type="email" value={form.representante_legal_email} onChange={(event) => update("representante_legal_email", event.target.value)} />
            </Field>
            <Field label="Telefone do representante" htmlFor="representante_legal_telefone">
              <Input id="representante_legal_telefone" inputMode="tel" value={form.representante_legal_telefone} onChange={(event) => update("representante_legal_telefone", event.target.value)} />
            </Field>
          </div>
        ) : null}
      </div>

      <Field label="Observacoes" htmlFor="observacoes" wide>
        <Textarea id="observacoes" value={form.observacoes} onChange={(event) => update("observacoes", event.target.value)} />
      </Field>
    </div>
  );
}

function DocLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Button asChild variant="outline" size="sm" className="justify-start">
      <a href={href} target="_blank" rel="noreferrer">
        <ExternalLink className="h-4 w-4" />
        {children}
      </a>
    </Button>
  );
}

function whatsappUrl(assistido: Assistido) {
  const phone = onlyDigits(assistido.telefone_whatsapp || "");
  const fullName = assistido.nome_completo.trim().split(/\s+/);
  const displayName = [fullName[0], fullName.length > 1 ? fullName[fullName.length - 1] : ""].filter(Boolean).join(" ");
  const message = encodeURIComponent(`Ola, ${displayName}. Tudo bem? Aqui e do escritorio juridico Christian Bentes.`);
  return `https://wa.me/55${phone}?text=${message}`;
}

function formFromAssistido(assistido: Assistido): FormState {
  const value = (key: string) => String(assistido[key] || "");
  const dateValue = assistido.data_nascimento ? new Date(String(assistido.data_nascimento)) : null;
  const dataNascimento = dateValue && !Number.isNaN(dateValue.getTime()) ? dateValue.toISOString().slice(0, 10) : "";
  const advogadoNome = value("advogado_adicional_nome");

  return {
    nome_completo: value("nome_completo"),
    nacionalidade: value("nacionalidade") || "brasileiro(a)",
    estado_civil: value("estado_civil"),
    profissao: value("profissao"),
    rg: value("rg"),
    cpf: isGeneratedNoCpf(value("cpf")) ? "" : value("cpf"),
    data_nascimento: dataNascimento,
    cep: value("cep"),
    logradouro: value("logradouro"),
    numero: value("numero"),
    complemento: value("complemento"),
    bairro: value("bairro"),
    municipio: value("municipio"),
    estado: value("estado"),
    email: value("email"),
    telefone_whatsapp: value("telefone_whatsapp"),
    indicacao: value("indicacao"),
    observacoes: value("observacoes"),
    menor: Boolean(assistido.menor),
    representante_legal_nome: value("representante_legal_nome"),
    representante_legal_parentesco: value("representante_legal_parentesco") || "genitor(a)",
    representante_legal_nacionalidade: value("representante_legal_nacionalidade") || "brasileiro(a)",
    representante_legal_estado_civil: value("representante_legal_estado_civil"),
    representante_legal_profissao: value("representante_legal_profissao"),
    representante_legal_rg: value("representante_legal_rg"),
    representante_legal_cpf: value("representante_legal_cpf"),
    representante_legal_email: value("representante_legal_email"),
    representante_legal_telefone: value("representante_legal_telefone"),
    adicionar_advogado: Boolean(advogadoNome),
    advogado_adicional_oab: value("advogado_adicional_oab"),
    advogado_adicional_uf: value("advogado_adicional_uf") || "RR",
    advogado_adicional_nome: advogadoNome
  };
}

function Status({ error, message }: { error: string; message: string }) {
  if (error) return <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>;
  if (message) return <p className="rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-sm text-primary">{message}</p>;
  return null;
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="grid gap-1 rounded-md border border-border bg-white p-3">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-2xl font-semibold">{value}</p>
    </div>
  );
}

function ReportList({ title, items }: { title: string; items: Array<{ label: string; total: number }> }) {
  return (
    <div className="grid gap-2">
      <h3 className="text-base font-semibold">{title}</h3>
      <div className="grid gap-2">
        {items.length ? items.map((item) => (
          <div key={item.label} className="flex items-center justify-between gap-3 rounded-md border border-border bg-white p-3">
            <span className="min-w-0 truncate text-sm">{item.label}</span>
            <span className="text-sm font-semibold">{item.total}</span>
          </div>
        )) : (
          <p className="rounded-md border border-border bg-white p-3 text-sm text-muted-foreground">Sem dados.</p>
        )}
      </div>
    </div>
  );
}

function formatApiError(error: unknown, fallback: string) {
  const message = String(error || fallback);
  if (/Expected property name|JSON at position|Corpo da requisicao invalido/i.test(message)) {
    return "Nao foi possivel ler os dados enviados. Atualize a pagina com Ctrl+F5 e tente salvar novamente.";
  }
  return message;
}

function Field({ label, htmlFor, wide, children }: { label: string; htmlFor: string; wide?: boolean; children: ReactNode }) {
  return (
    <div className={wide ? "grid gap-2 sm:col-span-2" : "grid gap-2"}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}
