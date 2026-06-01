import { readFileSync } from "node:fs";
import { join } from "node:path";
import { prisma } from "@/lib/prisma";
import { onlyDigits } from "@/lib/utils";

export type LawyerRecord = {
  nome: string;
  nome_exibicao: string;
  uf: string;
  oab: string;
  email?: string;
  telefone?: string;
  principal?: boolean;
};

const OFFICE_ADDRESS = "Rua Ajuricaba, n. 1633, bairro Centro, Boa Vista/RR, CEP 69301-070";
const LAWYERS_PATH = join(process.cwd(), "data", "advogados.json");

function normalizeUf(value?: string | null) {
  return (value || "").trim().toUpperCase();
}

function normalizeOab(value?: string | null) {
  return onlyDigits(value || "");
}

function loadLawyers() {
  const raw = readFileSync(LAWYERS_PATH, "utf8");
  const lawyersData = JSON.parse(raw) as LawyerRecord[];

  return lawyersData.map((lawyer) => ({
    ...lawyer,
    nome: lawyer.nome.trim().toUpperCase(),
    nome_exibicao: lawyer.nome_exibicao.trim(),
    uf: normalizeUf(lawyer.uf),
    oab: normalizeOab(lawyer.oab)
  }));
}

export function getPrimaryLawyer() {
  const registry = loadLawyers();
  return registry.find((lawyer) => lawyer.principal) || registry[0];
}

export function getLawyers() {
  return loadLawyers();
}

export async function findLawyerByOab(params: { uf?: string | null; oab?: string | null }) {
  const uf = normalizeUf(params.uf);
  const oab = normalizeOab(params.oab);

  if (!uf || !oab) return null;

  const savedLawyer = await prisma.advogado.findUnique({
    where: {
      uf_oab: { uf, oab }
    }
  });

  if (savedLawyer) {
    return {
      nome: savedLawyer.nome,
      nome_exibicao: savedLawyer.nome_exibicao,
      uf: savedLawyer.uf,
      oab: savedLawyer.oab,
      email: savedLawyer.email || undefined,
      telefone: savedLawyer.telefone || undefined,
      principal: savedLawyer.principal
    };
  }

  return (
    loadLawyers().find((lawyer) => normalizeUf(lawyer.uf) === uf && normalizeOab(lawyer.oab) === oab) ||
    null
  );
}

function buildLawyerCore(lawyer: LawyerRecord) {
  const parts = [
    `${lawyer.nome}, advogado, inscrito na OAB/${lawyer.uf} n. ${lawyer.oab}`,
    lawyer.email ? `e-mail: ${lawyer.email}` : "",
    lawyer.telefone ? `telefone: ${lawyer.telefone}` : ""
  ].filter(Boolean);

  return parts.join(", ");
}

export function buildOutorgadosText(additionalLawyer?: {
  nome?: string | null;
  uf?: string | null;
  oab?: string | null;
}) {
  const primaryLawyer = getPrimaryLawyer();
  const lawyers = [buildLawyerCore(primaryLawyer)];

  if (additionalLawyer?.nome?.trim() && normalizeOab(additionalLawyer.oab) !== normalizeOab(primaryLawyer.oab)) {
    lawyers.push(
      buildLawyerCore({
        nome: additionalLawyer.nome.trim().toUpperCase(),
        nome_exibicao: additionalLawyer.nome.trim(),
        uf: normalizeUf(additionalLawyer.uf) || "RR",
        oab: normalizeOab(additionalLawyer.oab) || (additionalLawyer.oab || "").trim()
      })
    );
  }

  if (lawyers.length > 1) {
    return `${lawyers.join(", e ")}, ambos com escritorio profissional na ${OFFICE_ADDRESS}`;
  }

  return `${lawyers[0]}, com escritorio profissional na ${OFFICE_ADDRESS}`;
}
