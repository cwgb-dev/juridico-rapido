import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { folderCpfLabel } from "@/lib/utils";

export type LocalFolderResult = {
  pasta_drive_id: string;
  pasta_drive_url: string;
  documentos_folder_id: string;
  minutas_folder_id: string;
};

function sanitizePathPart(value: string) {
  return value
    .replace(/[<>:"/\\|?*]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getLocalRoot() {
  const root = process.env.LOCAL_DRIVE_ROOT;
  if (!root) {
    throw new Error("Defina LOCAL_DRIVE_ROOT ou configure as credenciais do Google.");
  }
  return root;
}

export async function createLocalClientFolder(nome: string, cpf: string): Promise<LocalFolderResult> {
  const root = path.join(getLocalRoot(), "Assistidos");
  const folderName = `${sanitizePathPart(nome).toUpperCase()} - ${sanitizePathPart(folderCpfLabel(cpf))}`;
  const clientFolder = path.join(root, folderName);
  const documentosFolder = path.join(clientFolder, "01 - Documentos");
  const manifestacoesFolder = path.join(documentosFolder, "Manifestações");
  const provasFolder = path.join(documentosFolder, "Provas");
  const demandasFolder = path.join(clientFolder, "02 - Atendimentos");
  const minutasFolder = path.join(clientFolder, "03 - Minutas");

  await mkdir(documentosFolder, { recursive: true });
  await mkdir(manifestacoesFolder, { recursive: true });
  await mkdir(provasFolder, { recursive: true });
  await mkdir(demandasFolder, { recursive: true });
  await mkdir(minutasFolder, { recursive: true });

  return {
    pasta_drive_id: clientFolder,
    pasta_drive_url: clientFolder,
    documentos_folder_id: documentosFolder,
    minutas_folder_id: minutasFolder
  };
}

function toHtmlDocument(title: string, content: string) {
  const escaped = content
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.5; max-width: 820px; margin: 40px auto; color: #111; }
    pre { white-space: pre-wrap; font-family: inherit; font-size: 12pt; }
  </style>
</head>
<body>
  <pre>${escaped}</pre>
</body>
</html>`;
}

export async function createLocalDocInFolder(params: {
  title: string;
  content: string;
  folderId: string;
}) {
  const fileName = `${sanitizePathPart(params.title)}.html`;
  const filePath = path.join(params.folderId, fileName);

  await mkdir(params.folderId, { recursive: true });
  await writeFile(filePath, toHtmlDocument(params.title, params.content), "utf8");

  return {
    documentId: filePath,
    documentUrl: `/api/documentos?path=${encodeURIComponent(filePath)}`
  };
}
