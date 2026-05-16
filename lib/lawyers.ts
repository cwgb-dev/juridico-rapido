import { onlyDigits } from "@/lib/utils";

export type LawyerRecord = {
  nome: string;
  nome_exibicao: string;
  uf: string;
  oab: string;
  email?: string;
  telefone?: string;
};

const OFFICE_ADDRESS = "Rua Ajuricaba, nº 1633, bairro Centro, Boa Vista/RR, CEP 69301-070";

const PRIMARY_LAWYER: LawyerRecord = {
  nome: "CHRISTIAN WENDEL GONÇALVES BENTES",
  nome_exibicao: "Christian Wendel Gonçalves Bentes",
  uf: "RR",
  oab: "3.003",
  email: "cwgb.adv@gmail.com",
  telefone: "(95) 99155-1684"
};

const LAWYER_REGISTRY: LawyerRecord[] = [
  PRIMARY_LAWYER,
  {
    nome: "GABRIEL GILEME DA SILVA SANTOS",
    nome_exibicao: "Gabriel Gileme da Silva Santos",
    uf: "RR",
    oab: "2340"
  }
];

function normalizeUf(value?: string | null) {
  return (value || "").trim().toUpperCase();
}

function normalizeOab(value?: string | null) {
  return onlyDigits(value || "");
}

export function getPrimaryLawyer() {
  return PRIMARY_LAWYER;
}

export function findLawyerByOab(params: { uf?: string | null; oab?: string | null }) {
  const uf = normalizeUf(params.uf);
  const oab = normalizeOab(params.oab);

  if (!uf || !oab) return null;

  return (
    LAWYER_REGISTRY.find((lawyer) => normalizeUf(lawyer.uf) === uf && normalizeOab(lawyer.oab) === oab) ||
    null
  );
}

function buildLawyerCore(lawyer: LawyerRecord) {
  const parts = [
    `${lawyer.nome}, advogado, inscrito na OAB/${lawyer.uf} nº ${lawyer.oab}`,
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
  const lawyers = [buildLawyerCore(PRIMARY_LAWYER)];

  if (additionalLawyer?.nome?.trim() && normalizeOab(additionalLawyer.oab) !== normalizeOab(PRIMARY_LAWYER.oab)) {
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
    return `${lawyers.join(", e ")}, ambos com escritório profissional na ${OFFICE_ADDRESS}`;
  }

  return `${lawyers[0]}, com escritório profissional na ${OFFICE_ADDRESS}`;
}
