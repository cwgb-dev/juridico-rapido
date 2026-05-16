export async function readRequestBody<T>(request: Request) {
  const body = (await request.text()).replace(/^\uFEFF/, "").trim();
  if (!body) throw new Error("Corpo da requisicao vazio.");

  try {
    return JSON.parse(body) as T;
  } catch (error) {
    const looseBody = parseLooseObjectBody(body);
    if (looseBody) return looseBody as T;

    const message = error instanceof Error ? error.message : "JSON invalido.";
    throw new Error(`Corpo da requisicao invalido. ${message}`);
  }
}

function parseLooseObjectBody(body: string) {
  if (!body.startsWith("{") || !body.endsWith("}")) return null;

  try {
    let normalized = body
      .replace(/([{,])\s*([A-Za-z_][A-Za-z0-9_]*)\s*:/g, '$1"$2":')
      .replace(/:\s*undefined\s*([,}])/g, ":null$1")
      .replace(/:\s*'([^']*)'/g, (_, value) => `:${JSON.stringify(value)}`);

    normalized = normalized.replace(
      /:\s*([^"{\[\]\d\-,}\s][^,}]*)\s*([,}])/g,
      (_, value, end) => `:${JSON.stringify(String(value).trim())}${end}`
    );

    return JSON.parse(normalized);
  } catch {
    return null;
  }
}
