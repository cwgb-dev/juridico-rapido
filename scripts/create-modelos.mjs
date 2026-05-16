import { existsSync, readFileSync } from "node:fs";
import { google } from "googleapis";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const driveFolderMimeType = "application/vnd.google-apps.folder";
const googleDocMimeType = "application/vnd.google-apps.document";

const scopes = [
  "https://www.googleapis.com/auth/drive",
  "https://www.googleapis.com/auth/documents"
];

function getAuth() {
  const oauthPath = process.env.GOOGLE_OAUTH_CLIENT_JSON_PATH;
  const tokenPath = process.env.GOOGLE_OAUTH_TOKEN_PATH;
  if (!oauthPath || !tokenPath || !existsSync(tokenPath)) {
    throw new Error("OAuth não configurado ou token não encontrado.");
  }

  const raw = JSON.parse(readFileSync(oauthPath, "utf8"));
  const client = raw.installed || raw.web;
  const auth = new google.auth.OAuth2(
    client.client_id,
    client.client_secret,
    process.env.GOOGLE_OAUTH_REDIRECT_URI || "http://localhost:3000/api/google/callback"
  );
  auth.setCredentials(JSON.parse(readFileSync(tokenPath, "utf8")));
  return auth;
}

async function getOrCreateFolder(drive, name, parentId) {
  const escapedName = name.replace(/'/g, "\\'");
  const response = await drive.files.list({
    q: [
      `'${parentId}' in parents`,
      `name = '${escapedName}'`,
      `mimeType = '${driveFolderMimeType}'`,
      "trashed = false"
    ].join(" and "),
    fields: "files(id, webViewLink)",
    pageSize: 1
  });
  const existing = response.data.files?.[0];
  if (existing?.id) return existing.id;

  const created = await drive.files.create({
    requestBody: {
      name,
      mimeType: driveFolderMimeType,
      parents: [parentId]
    },
    fields: "id"
  });
  return created.data.id;
}

async function createDoc(drive, docs, folderId, title, content) {
  const created = await drive.files.create({
    requestBody: {
      name: title,
      mimeType: googleDocMimeType,
      parents: [folderId]
    },
    fields: "id, webViewLink"
  });
  const documentId = created.data.id;
  const text = `${content.trim()}\n`;

  await docs.documents.batchUpdate({
    documentId,
    requestBody: {
      requests: [
        { insertText: { location: { index: 1 }, text } },
        ...formattingRequests(text)
      ]
    }
  });

  return created.data.webViewLink || `https://docs.google.com/document/d/${documentId}/edit`;
}

function formattingRequests(text) {
  const endIndex = text.length + 1;
  const requests = [
    {
      updateTextStyle: {
        range: { startIndex: 1, endIndex },
        textStyle: {
          weightedFontFamily: { fontFamily: "Courier New" },
          fontSize: { magnitude: 11, unit: "PT" },
          bold: false
        },
        fields: "weightedFontFamily,fontSize,bold"
      }
    },
    {
      updateParagraphStyle: {
        range: { startIndex: 1, endIndex },
        paragraphStyle: {
          alignment: "JUSTIFIED",
          lineSpacing: 115,
          spaceAbove: { magnitude: 0, unit: "PT" },
          spaceBelow: { magnitude: 4, unit: "PT" }
        },
        fields: "alignment,lineSpacing,spaceAbove,spaceBelow"
      }
    }
  ];

  const paragraphs = paragraphRanges(text);
  const title = paragraphs[0];
  requests.push(
    {
      updateTextStyle: {
        range: { startIndex: title.start, endIndex: title.end },
        textStyle: {
          weightedFontFamily: { fontFamily: "Courier New" },
          fontSize: { magnitude: 14, unit: "PT" },
          bold: true
        },
        fields: "weightedFontFamily,fontSize,bold"
      }
    },
    {
      updateParagraphStyle: {
        range: { startIndex: title.start, endIndex: title.end },
        paragraphStyle: { alignment: "CENTER" },
        fields: "alignment"
      }
    }
  );

  for (const paragraph of paragraphs) {
    if (/^Boa Vista\/RR,/.test(paragraph.text)) {
      requests.push({
        updateParagraphStyle: {
          range: { startIndex: paragraph.start, endIndex: paragraph.end },
          paragraphStyle: { alignment: "END" },
          fields: "alignment"
        }
      });
    }

    if (/^_{10,}$/.test(paragraph.text)) {
      requests.push({
        updateParagraphStyle: {
          range: { startIndex: paragraph.start, endIndex: paragraph.end },
          paragraphStyle: {
            alignment: "CENTER",
            spaceAbove: { magnitude: 28, unit: "PT" },
            spaceBelow: { magnitude: 0, unit: "PT" }
          },
          fields: "alignment,spaceAbove,spaceBelow"
        }
      });
      const index = paragraphs.indexOf(paragraph);
      for (const next of [paragraphs[index + 1], paragraphs[index + 2]]) {
        if (!next) continue;
        requests.push({
          updateParagraphStyle: {
            range: { startIndex: next.start, endIndex: next.end },
            paragraphStyle: {
              alignment: "CENTER",
              spaceAbove: { magnitude: 0, unit: "PT" },
              spaceBelow: { magnitude: 0, unit: "PT" }
            },
            fields: "alignment,spaceAbove,spaceBelow"
          }
        });
      }
    }
  }

  [
    "OUTORGANTE(S):",
    "OUTORGADO(S): CHRISTIAN WENDEL GONÇALVES BENTES",
    "PODERES:",
    "[NOME COMPLETO DO OUTORGANTE]",
    "[NOME DO MENOR]",
    "[NOME DO REPRESENTANTE]"
  ].forEach((term) => pushBoldOccurrence(requests, text, term));

  return requests;
}

function pushBoldOccurrence(requests, text, term) {
  const index = text.indexOf(term);
  if (index < 0) return;
  requests.push({
    updateTextStyle: {
      range: { startIndex: index + 1, endIndex: index + 1 + term.length },
      textStyle: { bold: true },
      fields: "bold"
    }
  });
}

function paragraphRanges(text) {
  const lines = text.split("\n");
  let cursor = 1;
  return lines.map((line) => {
    const start = cursor;
    const end = cursor + Math.max(line.length, 1);
    cursor += line.length + 1;
    return { text: line, start, end };
  });
}

const modelos = [
  {
    title: "MODELO - Procuração Comum",
    content: `PROCURAÇÃO

OUTORGANTE(S): [NOME COMPLETO DO OUTORGANTE], [nacionalidade], [estado civil], [profissão], portador(a) do RG nº [número], inscrito(a) no CPF sob o nº [número], nascido(a) em [data de nascimento], residente e domiciliado(a) à [endereço completo], CEP [número], endereço eletrônico [e-mail], telefone [número].

OUTORGADO(S): CHRISTIAN WENDEL GONÇALVES BENTES, brasileiro, advogado, inscrito na OAB/RR nº 3.003, e-mail: cwgb.adv@gmail.com, telefone: (95) 99155-1684, com escritório profissional na Rua Ajuricaba, nº 1633, bairro Centro, Boa Vista/RR, CEP 69301-070.

PODERES: Pelo presente instrumento particular, o(a) outorgante nomeia e constitui seu bastante procurador o outorgado acima qualificado, conferindo-lhe poderes para o foro em geral, com cláusula ad judicia et extra, para representá-lo(a) em qualquer juízo, instância ou tribunal, bem como perante quaisquer órgãos da Administração Pública direta e indireta, federal, estadual ou municipal, inclusive autoridades policiais e órgãos de trânsito, podendo propor ações e defendê-lo(a) nas contrárias, atuar em processos judiciais e administrativos de qualquer natureza, inclusive inquéritos policiais, termos circunstanciados e procedimentos investigatórios em geral, requerer habilitação, vista e carga de autos, físicos ou eletrônicos, firmar acordos, transigir, desistir, renunciar, reconhecer pedidos, receber e dar quitação, levantar valores, alvarás, requisições e depósitos judiciais ou administrativos, firmar compromissos, assinar termos, inclusive para fins de autocomposição, substabelecer com ou sem reserva de poderes, inclusive para fins específicos, bem como praticar todos os atos necessários ao fiel cumprimento deste mandato.

Boa Vista/RR, [data].

________________________________________
[NOME COMPLETO DO OUTORGANTE]
CPF nº [número]`
  },
  {
    title: "MODELO - Procuração Menor Representado",
    content: `PROCURAÇÃO

OUTORGANTE(S): [NOME DO MENOR], menor impúbere, nascido(a) em [data de nascimento], inscrito(a) no CPF sob o nº [número], neste ato representado(a) por seu(sua) genitor(a) [NOME DO REPRESENTANTE], [nacionalidade], [estado civil], [profissão], portador(a) do RG nº [número], inscrito(a) no CPF sob o nº [número], residente e domiciliado(a) à [endereço completo], CEP [número], endereço eletrônico [e-mail], telefone [número].

OUTORGADO(S): CHRISTIAN WENDEL GONÇALVES BENTES, brasileiro, advogado, inscrito na OAB/RR nº 3.003, e-mail: cwgb.adv@gmail.com, telefone: (95) 99155-1684, com escritório profissional na Rua Ajuricaba, nº 1633, bairro Centro, Boa Vista/RR, CEP 69301-070.

PODERES: Pelo presente instrumento particular, o(a) outorgante nomeia e constitui seu bastante procurador o outorgado acima qualificado, conferindo-lhe poderes para o foro em geral, com cláusula ad judicia et extra, para representá-lo(a) em qualquer juízo, instância ou tribunal, bem como perante quaisquer órgãos da Administração Pública direta e indireta, federal, estadual ou municipal, inclusive autoridades policiais e órgãos de trânsito, podendo propor ações e defendê-lo(a) nas contrárias, atuar em processos judiciais e administrativos de qualquer natureza, inclusive inquéritos policiais, termos circunstanciados e procedimentos investigatórios em geral, requerer habilitação, vista e carga de autos, físicos ou eletrônicos, firmar acordos, transigir, desistir, renunciar, reconhecer pedidos, receber e dar quitação, levantar valores, alvarás, requisições e depósitos judiciais ou administrativos, firmar compromissos, assinar termos, inclusive para fins de autocomposição, substabelecer com ou sem reserva de poderes, inclusive para fins específicos, bem como praticar todos os atos necessários ao fiel cumprimento deste mandato.

Boa Vista/RR, [data].

________________________________________
[NOME DO MENOR]
CPF nº [número]`
  },
  {
    title: "MODELO - Declaração de Hipossuficiência",
    content: `DECLARAÇÃO DE HIPOSSUFICIÊNCIA

Eu, [NOME COMPLETO DO OUTORGANTE], [nacionalidade], [estado civil], [profissão], portador(a) do RG nº [número], inscrito(a) no CPF sob o nº [número], residente e domiciliado(a) à [endereço completo], CEP [número], endereço eletrônico [e-mail], telefone [número], DECLARO, para os devidos fins de direito, sob as penas da lei, que não possuo condições de arcar com as custas processuais, despesas e honorários advocatícios sem prejuízo do meu sustento próprio e de minha família, razão pela qual faço jus aos benefícios da gratuidade da justiça, nos termos do art. 98 do Código de Processo Civil, sendo presumidamente verdadeira a presente declaração, conforme dispõe o art. 99, §3º, do mesmo diploma legal, bem como em conformidade com o art. 5º, inciso LXXIV, da Constituição Federal.

Declaro, ainda, que as informações acima prestadas são verdadeiras, estando ciente de que a falsidade da presente declaração poderá ensejar responsabilização civil, administrativa e penal, nos termos da legislação aplicável.

Boa Vista/RR, [data].

________________________________________
[NOME COMPLETO DO OUTORGANTE]
CPF nº [número]`
  }
];

const auth = getAuth();
const drive = google.drive({ version: "v3", auth });
const docs = google.docs({ version: "v1", auth });
const modelosFolderId = await getOrCreateFolder(drive, "MODELOS", process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID);

const links = [];
for (const modelo of modelos) {
  const link = await createDoc(drive, docs, modelosFolderId, modelo.title, modelo.content);
  links.push({ title: modelo.title, link });
}

console.log(JSON.stringify({ modelosFolderId, links }, null, 2));
