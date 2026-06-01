import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const registryPath = resolve(process.cwd(), "data", "advogados.json");

function onlyDigits(value) {
  return String(value || "").replace(/\D/g, "");
}

function readArg(name) {
  const prefix = `--${name}=`;
  const arg = process.argv.find((item) => item.startsWith(prefix));
  return arg ? arg.slice(prefix.length).trim() : "";
}

const nomeExibicao = readArg("nome");
const uf = readArg("uf").toUpperCase();
const oab = onlyDigits(readArg("oab"));
const email = readArg("email");
const telefone = readArg("telefone");

if (!nomeExibicao || !uf || !oab) {
  console.error("Uso: node scripts/adicionar-advogado.mjs --nome=\"Nome Completo\" --uf=RR --oab=1234 [--email=email] [--telefone=telefone]");
  process.exit(1);
}

const raw = await readFile(registryPath, "utf8");
const lawyers = JSON.parse(raw);
const exists = lawyers.some((lawyer) => onlyDigits(lawyer.oab) === oab && String(lawyer.uf || "").toUpperCase() === uf);

if (exists) {
  console.error(`Ja existe advogado cadastrado para OAB/${uf} ${oab}.`);
  process.exit(1);
}

const nextLawyer = {
  nome: nomeExibicao.toUpperCase(),
  nome_exibicao: nomeExibicao,
  uf,
  oab
};

if (email) nextLawyer.email = email;
if (telefone) nextLawyer.telefone = telefone;

lawyers.push(nextLawyer);
await writeFile(registryPath, `${JSON.stringify(lawyers, null, 2)}\n`, "utf8");

console.log(`Advogado adicionado: ${nomeExibicao} - OAB/${uf} ${oab}`);
