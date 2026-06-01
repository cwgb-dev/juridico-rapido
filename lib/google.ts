import { google } from "googleapis";
import { createLocalClientFolder, createLocalDocInFolder } from "@/lib/local-drive";
import type { TableBlock } from "@/lib/dados-gerais";
import { folderCpfLabel } from "@/lib/utils";
import path from "node:path";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

type FolderResult = {
  pasta_drive_id: string;
  pasta_drive_url: string;
  documentos_folder_id: string;
  minutas_folder_id: string;
};

const driveFolderMimeType = "application/vnd.google-apps.folder";
const googleDocMimeType = "application/vnd.google-apps.document";
const googleScopes = [
  "https://www.googleapis.com/auth/drive",
  "https://www.googleapis.com/auth/documents"
];

function getOAuthConfig() {
  const envClientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const envClientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  if (envClientId && envClientSecret) {
    return {
      clientId: envClientId,
      clientSecret: envClientSecret,
      redirectUri: process.env.GOOGLE_OAUTH_REDIRECT_URI || "http://localhost:3000/api/google/callback",
      tokenPath: process.env.GOOGLE_OAUTH_TOKEN_PATH || path.join(process.cwd(), ".google-oauth-token.json")
    };
  }

  const credentialsPath = process.env.GOOGLE_OAUTH_CLIENT_JSON_PATH;
  if (!credentialsPath) return null;

  const raw = JSON.parse(readFileSync(credentialsPath, "utf8")) as {
    installed?: {
      client_id: string;
      client_secret: string;
      redirect_uris?: string[];
    };
    web?: {
      client_id: string;
      client_secret: string;
      redirect_uris?: string[];
    };
  };

  const client = raw.installed || raw.web;
  if (!client) throw new Error("JSON OAuth inválido.");

  return {
    clientId: client.client_id,
    clientSecret: client.client_secret,
    redirectUri: process.env.GOOGLE_OAUTH_REDIRECT_URI || "http://localhost:3000/api/google/callback",
    tokenPath: process.env.GOOGLE_OAUTH_TOKEN_PATH || path.join(process.cwd(), ".google-oauth-token.json")
  };
}

function getOAuthClient() {
  const config = getOAuthConfig();
  if (!config) return null;

  const client = new google.auth.OAuth2(config.clientId, config.clientSecret, config.redirectUri);
  if (process.env.GOOGLE_OAUTH_TOKEN_JSON) {
    client.setCredentials(JSON.parse(process.env.GOOGLE_OAUTH_TOKEN_JSON));
  } else if (existsSync(config.tokenPath)) {
    client.setCredentials(JSON.parse(readFileSync(config.tokenPath, "utf8")));
  }
  return client;
}

export function getGoogleAuthorizationUrl() {
  const client = getOAuthClient();
  if (!client) {
    throw new Error("Credencial OAuth não configurada. Defina GOOGLE_OAUTH_CLIENT_JSON_PATH.");
  }

  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: googleScopes
  });
}

export async function saveGoogleOAuthCode(code: string) {
  const config = getOAuthConfig();
  const client = getOAuthClient();
  if (!config || !client) {
    throw new Error("Credencial OAuth não configurada.");
  }

  const { tokens } = await client.getToken(code);
  writeFileSync(config.tokenPath, JSON.stringify(tokens, null, 2), "utf8");
  client.setCredentials(tokens);
}

function getGoogleAuth() {
  const oauthClient = getOAuthClient();
  const oauthConfig = getOAuthConfig();
  if (oauthClient && oauthConfig && (process.env.GOOGLE_OAUTH_TOKEN_JSON || existsSync(oauthConfig.tokenPath))) {
    return oauthClient;
  }

  const credentialsPath = process.env.GOOGLE_SERVICE_ACCOUNT_JSON_PATH;
  if (credentialsPath) {
    const credentials = JSON.parse(readFileSync(credentialsPath, "utf8")) as {
      client_email: string;
      private_key: string;
    };

    return new google.auth.JWT({
      email: credentials.client_email,
      key: credentials.private_key,
      scopes: googleScopes
    });
  }

  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!clientEmail || !privateKey) {
    throw new Error("Credenciais do Google não configuradas. Defina GOOGLE_CLIENT_EMAIL e GOOGLE_PRIVATE_KEY.");
  }

  return new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: googleScopes
  });
}

function hasGoogleCredentials() {
  const oauthConfig = getOAuthConfig();
  return Boolean(
    ((oauthConfig && (process.env.GOOGLE_OAUTH_TOKEN_JSON || existsSync(oauthConfig.tokenPath))) ||
      process.env.GOOGLE_SERVICE_ACCOUNT_JSON_PATH ||
      (process.env.GOOGLE_CLIENT_EMAIL && process.env.GOOGLE_PRIVATE_KEY)) &&
      process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID
  );
}

function driveUrl(folderId: string) {
  return `https://drive.google.com/drive/folders/${folderId}`;
}

export function docsUrl(documentId: string) {
  return `https://docs.google.com/document/d/${documentId}/edit`;
}

async function createFolder(name: string, parentId?: string) {
  const auth = getGoogleAuth();
  const drive = google.drive({ version: "v3", auth });

  const response = await drive.files.create({
    requestBody: {
      name,
      mimeType: driveFolderMimeType,
      parents: parentId ? [parentId] : undefined
    },
    fields: "id, webViewLink",
    supportsAllDrives: true
  });

  if (!response.data.id) {
    throw new Error(`Não foi possível criar a pasta ${name}.`);
  }

  return response.data.id;
}

async function getOrCreateFolder(name: string, parentId: string) {
  if (!hasGoogleCredentials()) {
    return path.join(parentId, name);
  }

  const auth = getGoogleAuth();
  const drive = google.drive({ version: "v3", auth });
  const escapedName = name.replace(/'/g, "\\'");
  const response = await drive.files.list({
    q: [
      `'${parentId}' in parents`,
      `name = '${escapedName}'`,
      `mimeType = '${driveFolderMimeType}'`,
      "trashed = false"
    ].join(" and "),
    fields: "files(id, name)",
    includeItemsFromAllDrives: true,
    supportsAllDrives: true,
    pageSize: 1
  });

  const existing = response.data.files?.[0]?.id;
  if (existing) return existing;
  return createFolder(name, parentId);
}

export async function getDocumentosFolderId(clientFolderId: string) {
  return getOrCreateFolder("01 - Documentos", clientFolderId);
}

export async function getAtendimentosFolderId(clientFolderId: string) {
  return getOrCreateFolder("02 - Atendimentos", clientFolderId);
}

export async function getMinutasFolderId(clientFolderId: string) {
  return getOrCreateFolder("03 - Minutas", clientFolderId);
}

export async function deleteDriveFolder(folderId?: string | null) {
  if (!folderId || !hasGoogleCredentials()) return false;
  if (folderId.includes(":") || folderId.includes("\\") || folderId.includes("/")) return false;

  const auth = getGoogleAuth();
  const drive = google.drive({ version: "v3", auth });

  try {
    await drive.files.delete({ fileId: folderId, supportsAllDrives: true });
    return true;
  } catch (error: any) {
    if (error?.code === 404) return false;
    throw error;
  }
}

export async function shareJuridicoFolderWithEmail(email?: string | null) {
  const folderId = process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID;
  const normalizedEmail = email?.trim().toLowerCase();
  if (!folderId || !normalizedEmail || !hasGoogleCredentials()) return null;

  const auth = getGoogleAuth();
  const drive = google.drive({ version: "v3", auth });
  const existingPermissionId = await findPermissionIdByEmail(drive, folderId, normalizedEmail);
  if (existingPermissionId) return existingPermissionId;

  try {
    const permission = await drive.permissions.create({
      fileId: folderId,
      sendNotificationEmail: false,
      supportsAllDrives: true,
      requestBody: {
        type: "user",
        role: "writer",
        emailAddress: normalizedEmail
      },
      fields: "id"
    });

    return permission.data.id || null;
  } catch (error: any) {
    if (error?.code === 400 || error?.code === 403) return null;
    throw error;
  }
}

export async function removeJuridicoFolderAccess(email?: string | null, permissionId?: string | null) {
  const folderId = process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID;
  const normalizedEmail = email?.trim().toLowerCase();
  if (!folderId || !hasGoogleCredentials()) return false;

  const auth = getGoogleAuth();
  const drive = google.drive({ version: "v3", auth });
  const id = permissionId || (normalizedEmail ? await findPermissionIdByEmail(drive, folderId, normalizedEmail) : null);
  if (!id) return false;

  try {
    await drive.permissions.delete({ fileId: folderId, permissionId: id, supportsAllDrives: true });
    return true;
  } catch (error: any) {
    if (error?.code === 404 || error?.code === 400 || error?.code === 403) return false;
    throw error;
  }
}

async function findPermissionIdByEmail(drive: any, folderId: string, email: string) {
  const response = await drive.permissions.list({
    fileId: folderId,
    fields: "permissions(id,emailAddress,type,role)",
    supportsAllDrives: true
  });

  const permission = response.data.permissions?.find((item: any) =>
    item.type === "user" && item.emailAddress?.toLowerCase() === email
  );

  return permission?.id || null;
}

export async function createClientFolder(nome: string, cpf: string): Promise<FolderResult> {
  if (!hasGoogleCredentials()) {
    return createLocalClientFolder(nome, cpf);
  }

  const rootName = `${nome.toUpperCase()} - ${folderCpfLabel(cpf)}`;
  const juridicoRootId = process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID;
  if (!juridicoRootId) throw new Error("Pasta raiz do Google Drive nÃ£o configurada.");
  const assistidosRootId = await getOrCreateFolder("Assistidos", juridicoRootId);

  const rootId = await createFolder(rootName, assistidosRootId);
  const documentosFolderId = await createFolder("01 - Documentos", rootId);
  await createFolder("Manifestações", documentosFolderId);
  await createFolder("Provas", documentosFolderId);
  await createFolder("02 - Atendimentos", rootId);
  const minutasFolderId = await createFolder("03 - Minutas", rootId);

  return {
    pasta_drive_id: rootId,
    pasta_drive_url: driveUrl(rootId),
    documentos_folder_id: documentosFolderId,
    minutas_folder_id: minutasFolderId
  };
}

export async function syncDadosGeraisDoc(params: {
  title: string;
  folderId: string;
  documentId?: string | null;
  tables: TableBlock[];
}) {
  if (!hasGoogleCredentials()) {
    const content = tableBlocksToText(params.title, params.tables);
    return createLocalDocInFolder({ title: params.title, content, folderId: params.folderId });
  }

  const auth = getGoogleAuth();
  const drive = google.drive({ version: "v3", auth });
  const docs = google.docs({ version: "v1", auth });

  let documentId = params.documentId || "";
  let documentUrl = documentId ? docsUrl(documentId) : "";

  if (!documentId) {
    const created = await drive.files.create({
      requestBody: {
        name: params.title,
        mimeType: googleDocMimeType,
        parents: [params.folderId]
      },
      fields: "id, webViewLink",
      supportsAllDrives: true
    });

    documentId = created.data.id || "";
    documentUrl = created.data.webViewLink || (documentId ? docsUrl(documentId) : "");
  }

  if (!documentId) {
    throw new Error("NÃ£o foi possÃ­vel criar o documento Dados Gerais.");
  }

  await clearDocument(docs, documentId);
  await docs.documents.batchUpdate({
    documentId,
    requestBody: {
      requests: [
        {
          insertText: {
            location: { index: 1 },
            text: `${params.title.toUpperCase()}\n\n`
          }
        }
      ]
    }
  });

  for (const table of params.tables) {
    await appendTableBlock(docs, documentId, table);
  }

  await formatTableDocument(docs, documentId, params.title.toUpperCase());

  return {
    documentId,
    documentUrl: documentUrl || docsUrl(documentId)
  };
}

export async function createGoogleDocInFolder(params: {
  title: string;
  content: string;
  folderId: string;
}) {
  if (!hasGoogleCredentials()) {
    return createLocalDocInFolder(params);
  }

  const auth = getGoogleAuth();
  const drive = google.drive({ version: "v3", auth });
  const docs = google.docs({ version: "v1", auth });

  const created = await drive.files.create({
    requestBody: {
      name: params.title,
      mimeType: googleDocMimeType,
      parents: [params.folderId]
    },
    fields: "id, webViewLink",
    supportsAllDrives: true
  });

  const documentId = created.data.id;
  if (!documentId) {
    throw new Error("Não foi possível criar o documento no Google Docs.");
  }

  const text = `${params.content.trim()}\n`;
  await docs.documents.batchUpdate({
    documentId,
    requestBody: {
      requests: [
        {
          insertText: {
            location: { index: 1 },
            text
          }
        },
        ...legalDocumentFormattingRequests(text)
      ]
    }
  });

  return {
    documentId,
    documentUrl: created.data.webViewLink || docsUrl(documentId)
  };
}

async function clearDocument(docs: any, documentId: string) {
  const endIndex = await getBodyEndIndex(docs, documentId);
  if (endIndex <= 1) return;

  await docs.documents.batchUpdate({
    documentId,
    requestBody: {
      requests: [
        {
          deleteContentRange: {
            range: { startIndex: 1, endIndex }
          }
        }
      ]
    }
  });
}

async function appendTableBlock(docs: any, documentId: string, table: TableBlock) {
  const headingIndex = await getBodyEndIndex(docs, documentId);
  await docs.documents.batchUpdate({
    documentId,
    requestBody: {
      requests: [
        {
          insertText: {
            location: { index: headingIndex },
            text: `${table.heading}\n`
          }
        }
      ]
    }
  });

  const tableIndex = await getBodyEndIndex(docs, documentId);
  await docs.documents.batchUpdate({
    documentId,
    requestBody: {
      requests: [
        {
          insertTable: {
            rows: table.rows.length,
            columns: table.rows[0]?.length || 1,
            location: { index: tableIndex }
          }
        }
      ]
    }
  });

  const doc = await docs.documents.get({ documentId });
  const insertedTable = findLastTable(doc.data);
  if (!insertedTable) return;

  const fillRequests = table.rows
    .flatMap((row, rowIndex) =>
      row.map((value, columnIndex) => {
        const cell = insertedTable.tableRows?.[rowIndex]?.tableCells?.[columnIndex];
        return cell?.startIndex
          ? {
              insertText: {
                location: { index: cell.startIndex + 1 },
                text: value || " "
              }
            }
          : null;
      })
    )
    .filter(Boolean)
    .sort((a: any, b: any) => b.insertText.location.index - a.insertText.location.index);

  if (fillRequests.length) {
    await docs.documents.batchUpdate({
      documentId,
      requestBody: { requests: fillRequests }
    });
  }

  const afterTableIndex = await getBodyEndIndex(docs, documentId);
  await docs.documents.batchUpdate({
    documentId,
    requestBody: {
      requests: [
        {
          insertText: {
            location: { index: afterTableIndex },
            text: "\n"
          }
        }
      ]
    }
  });
}

async function formatTableDocument(docs: any, documentId: string, title: string) {
  const endIndex = await getBodyEndIndex(docs, documentId);
  const requests: any[] = [
    {
      updateTextStyle: {
        range: { startIndex: 1, endIndex },
        textStyle: {
          weightedFontFamily: { fontFamily: "Arial" },
          fontSize: { magnitude: 10, unit: "PT" },
          bold: false
        },
        fields: "weightedFontFamily,fontSize,bold"
      }
    },
    {
      updateParagraphStyle: {
        range: { startIndex: 1, endIndex },
        paragraphStyle: {
          alignment: "START",
          lineSpacing: 100,
          spaceAbove: { magnitude: 0, unit: "PT" },
          spaceBelow: { magnitude: 2, unit: "PT" }
        },
        fields: "alignment,lineSpacing,spaceAbove,spaceBelow"
      }
    },
    {
      updateTextStyle: {
        range: { startIndex: 1, endIndex: title.length + 1 },
        textStyle: {
          fontSize: { magnitude: 14, unit: "PT" },
          bold: true
        },
        fields: "fontSize,bold"
      }
    },
    {
      updateParagraphStyle: {
        range: { startIndex: 1, endIndex: title.length + 1 },
        paragraphStyle: { alignment: "CENTER" },
        fields: "alignment"
      }
    }
  ];

  await docs.documents.batchUpdate({
    documentId,
    requestBody: { requests }
  });
}

async function getBodyEndIndex(docs: any, documentId: string) {
  const document = await docs.documents.get({ documentId });
  const content = document.data.body?.content || [];
  const last = content[content.length - 1];
  return Math.max(1, (last?.endIndex || 2) - 1);
}

function findLastTable(document: any) {
  const content = document.body?.content || [];
  for (let index = content.length - 1; index >= 0; index -= 1) {
    if (content[index].table) return content[index].table;
  }
  return null;
}

function tableBlocksToText(title: string, tables: TableBlock[]) {
  return [
    title.toUpperCase(),
    ...tables.flatMap((table) => [
      "",
      table.heading,
      ...table.rows.map((row) => row.join(" | "))
    ])
  ].join("\n");
}

function legalDocumentFormattingRequests(text: string) {
  const endIndex = text.length + 1;
  const requests: any[] = [
    {
      updateTextStyle: {
        range: { startIndex: 1, endIndex },
        textStyle: {
          weightedFontFamily: { fontFamily: "Cambria" },
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
  if (title) {
    requests.push(
      {
        updateTextStyle: {
          range: { startIndex: title.start, endIndex: title.end },
          textStyle: {
            weightedFontFamily: { fontFamily: "Cambria" },
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
  }

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
      const underlineIndex = paragraphs.indexOf(paragraph);
      for (const next of [
        paragraphs[underlineIndex + 1],
        paragraphs[underlineIndex + 2],
        paragraphs[underlineIndex + 3]
      ]) {
        if (next) {
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
      const signatureName = paragraphs[underlineIndex + 1];
      if (signatureName) {
        requests.push({
          updateTextStyle: {
            range: { startIndex: signatureName.start, endIndex: signatureName.end },
            textStyle: { bold: true },
            fields: "bold"
          }
        });
      }
    }
  }

  for (const term of ["OUTORGANTE(S):", "OUTORGADO(S):", "PODERES:"]) {
    pushBoldOccurrence(requests, text, term);
  }
  pushBoldOccurrence(requests, text, "OUTORGADO(S): CHRISTIAN WENDEL GONÇALVES BENTES");

  pushAssistidoNameBold(requests, paragraphs);
  pushRepresentedMinorNameBold(requests, paragraphs);
  pushLegalRepresentativeNameBold(requests, paragraphs);
  pushOutorgadoLawyerNamesBold(requests, paragraphs);

  return requests;

  const outorganteLine: any = undefined;
  if (outorganteLine) {
    const afterTerm = outorganteLine.text.replace("OUTORGANTE(S):", "").trimStart();
    const firstName = afterTerm.split(",")[0]?.trim();
    if (firstName) pushBoldOccurrence(requests, text, firstName);

    const representativeMatch = outorganteLine.text.match(/(?:genitor\(a\)\/responsável legal|genitora|genitor|responsável legal)\s+([^,]+)/i);
    const representativeName = representativeMatch?.[1]?.trim();
    if (representativeName) pushBoldOccurrence(requests, text, representativeName);
  }

  return requests;
}

function pushAssistidoNameBold(
  requests: any[],
  paragraphs: Array<{ text: string; start: number; end: number }>
) {
  const qualificationLine = paragraphs.find((paragraph) =>
    paragraph.text.startsWith("OUTORGANTE(S):") || paragraph.text.startsWith("Eu, ")
  );
  if (!qualificationLine) return;

  const afterIntro = qualificationLine.text.startsWith("OUTORGANTE(S):")
    ? qualificationLine.text.replace("OUTORGANTE(S):", "").trimStart()
    : qualificationLine.text.replace("Eu,", "").trimStart();
  const assistidoName = afterIntro.split(",")[0]?.trim();
  if (!assistidoName) return;

  const nameIndex = qualificationLine.text.indexOf(assistidoName);
  if (nameIndex < 0) return;

  requests.push({
    updateTextStyle: {
      range: {
        startIndex: qualificationLine.start + nameIndex,
        endIndex: qualificationLine.start + nameIndex + assistidoName.length
      },
      textStyle: { bold: true },
      fields: "bold"
    }
  });
}

function pushOutorgadoLawyerNamesBold(
  requests: any[],
  paragraphs: Array<{ text: string; start: number; end: number }>
) {
  const outorgadoLine = paragraphs.find((paragraph) => paragraph.text.startsWith("OUTORGADO(S):"));
  if (!outorgadoLine) return;

  const outorgadosText = outorgadoLine.text.replace("OUTORGADO(S):", "").trim();
  const lawyerNames = outorgadosText
    .split(", advogado")
    .slice(0, -1)
    .map((part) => part.split(", e ").pop()?.trim())
    .filter((name): name is string => Boolean(name));

  for (const name of lawyerNames) {
    const nameIndex = outorgadoLine.text.indexOf(name);
    if (nameIndex < 0) continue;
    const start = outorgadoLine.start + nameIndex;
    const end = start + name.length;
    requests.push({
      updateTextStyle: {
        range: { startIndex: start, endIndex: end },
        textStyle: { bold: true },
        fields: "bold"
      }
    });
  }

  return;
}

function pushLegalRepresentativeNameBold(
  requests: any[],
  paragraphs: Array<{ text: string; start: number; end: number }>
) {
  const outorganteLine = paragraphs.find((paragraph) => paragraph.text.startsWith("OUTORGANTE(S):"));
  if (!outorganteLine) return;

  const representativeMatch = outorganteLine.text.match(
    /(?:genitor\(a\)\/respons[aá]vel legal|genitor\(a\)|genitora|genitor|respons[aá]vel legal)\s+([^,]+)/i
  );
  const representativeName = representativeMatch?.[1]?.trim();
  if (!representativeName) return;

  const nameIndex = outorganteLine.text.indexOf(representativeName);
  if (nameIndex < 0) return;

  requests.push({
    updateTextStyle: {
      range: {
        startIndex: outorganteLine.start + nameIndex,
        endIndex: outorganteLine.start + nameIndex + representativeName.length
      },
      textStyle: { bold: true },
      fields: "bold"
    }
  });
}

function pushRepresentedMinorNameBold(
  requests: any[],
  paragraphs: Array<{ text: string; start: number; end: number }>
) {
  const declarationLine = paragraphs.find((paragraph) => paragraph.text.startsWith("Eu, "));
  if (!declarationLine) return;

  const minorMatch = declarationLine.text.match(/na qualidade de .+?\sde\s([^,]+),\s+menor/i);
  const minorName = minorMatch?.[1]?.trim();
  if (!minorName) return;

  const nameIndex = declarationLine.text.indexOf(minorName);
  if (nameIndex < 0) return;

  requests.push({
    updateTextStyle: {
      range: {
        startIndex: declarationLine.start + nameIndex,
        endIndex: declarationLine.start + nameIndex + minorName.length
      },
      textStyle: { bold: true },
      fields: "bold"
    }
  });
}

function pushBoldOccurrence(requests: any[], text: string, term: string) {
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

function paragraphRanges(text: string) {
  const lines = text.split("\n");
  let cursor = 1;
  return lines.map((line) => {
    const start = cursor;
    const end = cursor + Math.max(line.length, 1);
    cursor += line.length + 1;
    return { text: line, start, end };
  });
}
