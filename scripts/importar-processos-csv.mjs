import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const args = new Map(
  process.argv.slice(2).map((arg) => {
    const [key, ...rest] = arg.replace(/^--/, "").split("=");
    return [key, rest.join("=") || "true"];
  })
);

const file = args.get("file");
const apply = args.get("apply") === "true";

if (!file) {
  console.error('Uso: node scripts/importar-processos-csv.mjs --file="C:\\caminho\\tabela.csv" [--apply]');
  process.exit(1);
}

const monthMap = {
  jan: 1,
  fev: 2,
  mar: 3,
  abr: 4,
  mai: 5,
  jun: 6,
  jul: 7,
  ago: 8,
  set: 9,
  out: 10,
  nov: 11,
  dez: 12
};

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"' && inQuotes && next === '"') {
      field += '"';
      i++;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      row.push(field);
      field = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") i++;
      row.push(field);
      if (row.some((item) => item.length > 0)) rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }

  row.push(field);
  if (row.some((item) => item.length > 0)) rows.push(row);
  return rows;
}

function clean(value) {
  const text = String(value || "").trim();
  return !text || text.toLowerCase() === "null" ? "" : text;
}

function normalizeName(value) {
  return clean(value)
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

function titleName(value) {
  return normalizeName(value)
    .toLowerCase()
    .replace(/(^|\s)(\S)/g, (_, space, letter) => `${space}${letter.toUpperCase()}`);
}

function toDate(year, month, day) {
  if (!year || !month || !day) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return date;
}

function normalizeYear(year) {
  const currentYear = new Date().getFullYear();
  if (year < 100) {
    const currentTwoDigits = currentYear % 100;
    return year <= currentTwoDigits ? 2000 + year : 1900 + year;
  }
  if (year > currentYear && year - 100 >= 1900) return year - 100;
  return year;
}

function parseBirthDate(value) {
  const text = clean(value).replace(/\s+/g, "");
  if (!text) return { date: null, warning: "" };

  const slash = text.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (slash) {
    const day = Number(slash[1]);
    const month = Number(slash[2]);
    const rawYear = Number(slash[3]);
    const year = normalizeYear(rawYear);
    const warning = rawYear >= 1000 && rawYear > new Date().getFullYear() ? `ano futuro ajustado: ${rawYear}->${year}` : "";
    return { date: toDate(year, month, day), warning };
  }

  const digits = text.match(/\d{6,8}/)?.[0] || "";
  if (digits.length === 8) {
    return {
      date: toDate(Number(digits.slice(4, 8)), Number(digits.slice(2, 4)), Number(digits.slice(0, 2))),
      warning: ""
    };
  }
  if (digits.length === 6) {
    return {
      date: toDate(normalizeYear(Number(digits.slice(4, 6))), Number(digits.slice(2, 4)), Number(digits.slice(0, 2))),
      warning: ""
    };
  }

  return { date: null, warning: `nascimento nao importado: ${value}` };
}

function parseAttendanceDate(value) {
  const text = clean(value).toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
  const match = text.match(/^(\d{1,2}) de ([a-z]{3})\.? de (\d{4})$/);
  if (!match) return null;
  return toDate(Number(match[3]), monthMap[match[2]], Number(match[1]));
}

function iso(date) {
  return date ? date.toISOString().slice(0, 10) : "";
}

function generatedCpf(index) {
  return `000000${String(index).padStart(5, "0")}`;
}

const csv = readFileSync(resolve(file), "utf8").replace(/^\uFEFF/, "");
const parsed = parseCsv(csv);
const headers = parsed.shift()?.map((item) => item.trim()) || [];
const rows = parsed.map((values) =>
  Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]))
);

const grouped = new Map();
const warnings = [];

for (const [index, row] of rows.entries()) {
  const nameKey = normalizeName(row.Nome);
  if (!nameKey) {
    warnings.push(`Linha ${index + 2}: sem nome, ignorada.`);
    continue;
  }

  const birth = parseBirthDate(row.Nascimento);
  const attendanceDate = parseAttendanceDate(row.Data);
  if (!attendanceDate) warnings.push(`Linha ${index + 2}: data de atendimento invalida: ${row.Data}`);
  if (birth.warning) warnings.push(`Linha ${index + 2}: ${nameKey}: ${birth.warning}`);

  const current =
    grouped.get(nameKey) ||
    {
      nome_completo: titleName(row.Nome),
      data_nascimento: null,
      email: "",
      indicacoes: new Set(),
      atendidosPor: new Set(),
      atendimentos: [],
      birthValues: new Set()
    };

  if (birth.date) {
    current.birthValues.add(iso(birth.date));
    if (!current.data_nascimento) current.data_nascimento = birth.date;
  }
  if (clean(row.Email)) current.email = clean(row.Email);
  if (clean(row.Origem)) current.indicacoes.add(clean(row.Origem));
  if (clean(row["Atendido por"])) current.atendidosPor.add(clean(row["Atendido por"]));

  current.atendimentos.push({
    data_atendimento: attendanceDate,
    relato: "Registro importado da tabela Juridico_Processos_Tabela.",
    observacoes: [
      clean(row.Origem) ? `Origem: ${clean(row.Origem)}` : "",
      clean(row["Atendido por"]) ? `Atendido por: ${clean(row["Atendido por"])}` : ""
    ]
      .filter(Boolean)
      .join("\n")
  });

  grouped.set(nameKey, current);
}

for (const [name, item] of grouped) {
  if (item.birthValues.size > 1) {
    warnings.push(`${name}: datas de nascimento conflitantes: ${[...item.birthValues].join(", ")}`);
  }
}

const assistidos = [...grouped.values()];
const atendimentos = assistidos.reduce((total, item) => total + item.atendimentos.length, 0);

console.log(`Arquivo: ${resolve(file)}`);
console.log(`Linhas CSV: ${rows.length}`);
console.log(`Assistidos unicos por nome: ${assistidos.length}`);
console.log(`Atendimentos a criar: ${atendimentos}`);
console.log(`Modo: ${apply ? "GRAVAR" : "SIMULACAO"}`);
console.log(`Avisos: ${warnings.length}`);
for (const warning of warnings.slice(0, 30)) console.log(`- ${warning}`);
if (warnings.length > 30) console.log(`- ... mais ${warnings.length - 30} aviso(s)`);

if (!apply) {
  await prisma.$disconnect();
  process.exit(0);
}

let created = 0;
let skipped = 0;
let atendimentoCount = 0;
let generatedIndex = Date.now() % 100000;

for (const item of assistidos) {
  const existing = await prisma.assistido.findFirst({
    where: {
      nome_completo: {
        equals: item.nome_completo,
        mode: "insensitive"
      }
    }
  });

  if (existing) {
    skipped++;
    continue;
  }

  let cpf = generatedCpf(generatedIndex++);
  while (await prisma.assistido.findUnique({ where: { cpf } })) cpf = generatedCpf(generatedIndex++);

  await prisma.assistido.create({
    data: {
      cpf,
      nome_completo: item.nome_completo,
      data_nascimento: item.data_nascimento,
      email: item.email || null,
      indicacao: [...item.indicacoes].join("; ") || null,
      observacoes: [...item.atendidosPor].map((name) => `Atendido por: ${name}`).join("\n") || null,
      atendimentos: {
        create: item.atendimentos
          .filter((attendance) => attendance.data_atendimento)
          .map((attendance) => ({
            data_atendimento: attendance.data_atendimento,
            relato: attendance.relato,
            observacoes: attendance.observacoes || null
          }))
      }
    }
  });

  created++;
  atendimentoCount += item.atendimentos.filter((attendance) => attendance.data_atendimento).length;
}

console.log(`Assistidos criados: ${created}`);
console.log(`Assistidos pulados por nome ja existente: ${skipped}`);
console.log(`Atendimentos criados: ${atendimentoCount}`);
await prisma.$disconnect();
