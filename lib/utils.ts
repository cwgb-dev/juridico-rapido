import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

const noCpfPrefix = "000000";

export function isGeneratedNoCpf(value?: string | null) {
  return Boolean(value && /^000000\d{5}$/.test(value));
}

export function generateNoCpfId() {
  return `${noCpfPrefix}${Math.floor(Math.random() * 100000).toString().padStart(5, "0")}`;
}

export function displayCpf(value?: string | null) {
  if (!value || isGeneratedNoCpf(value)) return "não informado";
  const digits = onlyDigits(value);
  if (digits.length !== 11) return value;
  return formatCpf(digits);
}

export function folderCpfLabel(value?: string | null) {
  if (!value || isGeneratedNoCpf(value)) return `SEM CPF ${value?.slice(-5) || ""}`.trim();
  return value;
}

export function formatCpf(value: string) {
  const digits = onlyDigits(value).slice(0, 11);
  return digits
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

export function formatCep(value: string) {
  const digits = onlyDigits(value).slice(0, 8);
  return digits.replace(/(\d{5})(\d)/, "$1-$2");
}

export function buildEnderecoCompleto(data: {
  logradouro?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  municipio?: string | null;
  estado?: string | null;
  cep?: string | null;
}) {
  const line1 = [data.logradouro, data.numero].filter(Boolean).join(", ");
  const line2 = [data.complemento, data.bairro].filter(Boolean).join(", ");
  const line3 = [data.municipio, data.estado].filter(Boolean).join(" - ");
  return [line1, line2, line3, data.cep ? `CEP ${data.cep}` : ""].filter(Boolean).join(", ");
}
