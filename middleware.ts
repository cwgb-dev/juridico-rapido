import { NextRequest, NextResponse } from "next/server";

function unauthorized() {
  return new NextResponse("Autenticacao obrigatoria.", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Juridico Rapido", charset="UTF-8"',
      "Cache-Control": "no-store"
    }
  });
}

function unavailable() {
  return new NextResponse("Autenticacao nao configurada.", {
    status: 503,
    headers: { "Cache-Control": "no-store" }
  });
}

function parseBasicAuth(header: string | null) {
  if (!header?.startsWith("Basic ")) return null;

  try {
    const decoded = atob(header.slice("Basic ".length));
    const separator = decoded.indexOf(":");
    if (separator < 0) return null;

    return {
      user: decoded.slice(0, separator),
      password: decoded.slice(separator + 1)
    };
  } catch {
    return null;
  }
}

export function middleware(request: NextRequest) {
  const expectedUser = process.env.BASIC_AUTH_USER;
  const expectedPassword = process.env.BASIC_AUTH_PASSWORD;

  if (!expectedUser || !expectedPassword) {
    return process.env.NODE_ENV === "production" ? unavailable() : NextResponse.next();
  }

  const credentials = parseBasicAuth(request.headers.get("authorization"));
  if (!credentials) return unauthorized();

  if (credentials.user !== expectedUser || credentials.password !== expectedPassword) {
    return unauthorized();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|ico|css|js|map|txt)$).*)"]
};
