import { google } from "googleapis";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

function loadEnvFile(fileName) {
  const filePath = path.join(process.cwd(), fileName);
  if (!existsSync(filePath)) return;
  for (const line of readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index < 0) continue;
    const key = trimmed.slice(0, index).trim();
    let value = trimmed.slice(index + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[key] ||= value;
  }
}

loadEnvFile(".env");
loadEnvFile(".env.local");

const credentials = JSON.parse(readFileSync(process.env.GOOGLE_OAUTH_CLIENT_JSON_PATH, "utf8"));
const clientData = credentials.installed || credentials.web;
const auth = new google.auth.OAuth2(
  clientData.client_id,
  clientData.client_secret,
  process.env.GOOGLE_OAUTH_REDIRECT_URI || "http://localhost:3000/api/google/callback"
);
auth.setCredentials(JSON.parse(readFileSync(process.env.GOOGLE_OAUTH_TOKEN_PATH, "utf8")));

const drive = google.drive({ version: "v3", auth });
const response = await drive.files.list({
  q: [
    `'${process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID}' in parents`,
    "mimeType = 'application/vnd.google-apps.folder'",
    "trashed = false"
  ].join(" and "),
  fields: "files(id, name)",
  pageSize: 100
});

const deleted = [];
for (const folder of response.data.files || []) {
  if (folder.name === "Assistidos") continue;
  await drive.files.delete({ fileId: folder.id });
  deleted.push(folder);
}

console.log(JSON.stringify({ deleted }, null, 2));
