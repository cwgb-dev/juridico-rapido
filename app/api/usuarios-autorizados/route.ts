import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureDefaultAdmin, normalizeEmail } from "@/lib/usuarios-autorizados";
import { shareJuridicoFolderWithEmail } from "@/lib/google";

export const runtime = "nodejs";

export async function GET() {
  await ensureDefaultAdmin();

  const usuarios = await prisma.usuarioAutorizado.findMany({
    orderBy: [{ role: "asc" }, { email: "asc" }]
  });

  return NextResponse.json(usuarios);
}

export async function POST(request: Request) {
  await ensureDefaultAdmin();

  try {
    const payload = await request.json();
    const email = normalizeEmail(payload.email);
    const nome = payload.nome?.trim() || null;
    const role = payload.role === "admin" ? "admin" : "user";

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Informe um e-mail válido." }, { status: 400 });
    }

    const drivePermissionId = await shareJuridicoFolderWithEmail(email);
    const usuario = await prisma.usuarioAutorizado.upsert({
      where: { email },
      update: { nome, role, ativo: true, drive_permission_id: drivePermissionId || undefined },
      create: { email, nome, role, ativo: true, drive_permission_id: drivePermissionId }
    });

    return NextResponse.json(usuario, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao salvar usuário autorizado.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
