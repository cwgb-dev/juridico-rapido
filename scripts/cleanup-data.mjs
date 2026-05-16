import { PrismaClient } from "@prisma/client";
import { google } from "googleapis";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const prisma = new PrismaClient();
const driveFolderMimeType = "application/vnd.google-apps.folder";

function loadEnvFile(fileName) {
  const filePath = path.join(process.cwd(), fileName);
  if (!existsSync(filePath)) return;

  const lines = readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const equalIndex = trimmed.indexOf("=");
    if (equalIndex < 0) continue;

    const key = trimmed.slice(0, equalIndex).trim();
    let value = trimmed.slice(equalIndex + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[key] ||= value;
  }
}

loadEnvFile(".env");
loadEnvFile(".env.local");

function getOAuthClient() {
  const credentialsPath = process.env.GOOGLE_OAUTH_CLIENT_JSON_PATH;
  if (!credentialsPath) return null;

  const raw = JSON.parse(readFileSync(credentialsPath, "utf8"));
  const clientData = raw.installed || raw.web;
  if (!clientData) throw new Error("JSON OAuth invalido.");

  const tokenPath = process.env.GOOGLE_OAUTH_TOKEN_PATH || path.join(process.cwd(), ".google-oauth-token.json");
  if (!existsSync(tokenPath)) return null;

  const client = new google.auth.OAuth2(
    clientData.client_id,
    clientData.client_secret,
    process.env.GOOGLE_OAUTH_REDIRECT_URI || "http://localhost:3000/api/google/callback"
  );
  client.setCredentials(JSON.parse(readFileSync(tokenPath, "utf8")));
  return client;
}

async function getAssistidosFolderId(drive, juridicoRootId) {
  const response = await drive.files.list({
    q: [
      `'${juridicoRootId}' in parents`,
      "name = 'Assistidos'",
      `mimeType = '${driveFolderMimeType}'`,
      "trashed = false"
    ].join(" and "),
    fields: "files(id, name)",
    pageSize: 1
  });

  return response.data.files?.[0]?.id || null;
}

async function listChildFolders(drive, parentId) {
  const folders = [];
  let pageToken;

  do {
    const response = await drive.files.list({
      q: [
        `'${parentId}' in parents`,
        `mimeType = '${driveFolderMimeType}'`,
        "trashed = false"
      ].join(" and "),
      fields: "nextPageToken, files(id, name, webViewLink)",
      pageSize: 100,
      pageToken
    });

    folders.push(...(response.data.files || []));
    pageToken = response.data.nextPageToken;
  } while (pageToken);

  return folders;
}

async function main() {
  const assistidos = await prisma.assistido.findMany({
    select: { cpf: true, nome_completo: true, pasta_drive_id: true, pasta_drive_url: true }
  });

  const auth = getOAuthClient();
  const deletedDriveFolders = [];

  if (auth && process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID) {
    const drive = google.drive({ version: "v3", auth });
    const assistidosFolderId = await getAssistidosFolderId(drive, process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID);

    if (assistidosFolderId) {
      const childFolders = await listChildFolders(drive, assistidosFolderId);
      for (const folder of childFolders) {
        await drive.files.delete({ fileId: folder.id });
        deletedDriveFolders.push({ id: folder.id, name: folder.name });
      }
    }

    for (const assistido of assistidos) {
      if (!assistido.pasta_drive_id || deletedDriveFolders.some((folder) => folder.id === assistido.pasta_drive_id)) {
        continue;
      }

      try {
        await drive.files.delete({ fileId: assistido.pasta_drive_id });
        deletedDriveFolders.push({ id: assistido.pasta_drive_id, name: assistido.nome_completo });
      } catch (error) {
        if (error?.code !== 404) throw error;
      }
    }
  }

  const atendimentos = await prisma.atendimento.deleteMany();
  const deletedAssistidos = await prisma.assistido.deleteMany();

  console.log(JSON.stringify({
    deletedAssistidos: deletedAssistidos.count,
    deletedAtendimentos: atendimentos.count,
    deletedDriveFolders
  }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
