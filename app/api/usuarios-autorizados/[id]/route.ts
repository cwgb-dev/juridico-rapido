import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { DEFAULT_ADMIN_EMAIL, ensureDefaultAdmin } from "@/lib/usuarios-autorizados";
import { removeJuridicoFolderAccess, shareJuridicoFolderWithEmail } from "@/lib/google";

export const runtime = "nodejs";

type Params = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, { params }: Params) {
  await ensureDefaultAdmin();

  const { id } = await params;
  const payload = await request.json();
  const usuarioId = Number(id);

  if (!Number.isInteger(usuarioId)) {
    return NextResponse.json({ error: "Usuário inválido." }, { status: 400 });
  }

  const existing = await prisma.usuarioAutorizado.findUnique({ where: { id: usuarioId } });
  if (!existing) return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });

  if (existing.email === DEFAULT_ADMIN_EMAIL && payload.ativo === false) {
    return NextResponse.json({ error: "O administrador principal não pode ser desativado." }, { status: 400 });
  }

  let drivePermissionId: string | null | undefined = undefined;
  if (payload.ativo === true) {
    drivePermissionId = await shareJuridicoFolderWithEmail(existing.email);
  }
  if (payload.ativo === false) {
    await removeJuridicoFolderAccess(existing.email, existing.drive_permission_id);
    drivePermissionId = null;
  }

  const usuario = await prisma.usuarioAutorizado.update({
    where: { id: usuarioId },
    data: {
      nome: typeof payload.nome === "string" ? payload.nome.trim() || null : undefined,
      role: payload.role === "admin" || payload.role === "user" ? payload.role : undefined,
      ativo: typeof payload.ativo === "boolean" ? payload.ativo : undefined,
      drive_permission_id: drivePermissionId
    }
  });

  return NextResponse.json(usuario);
}

export async function DELETE(_request: Request, { params }: Params) {
  await ensureDefaultAdmin();

  const { id } = await params;
  const usuarioId = Number(id);

  if (!Number.isInteger(usuarioId)) {
    return NextResponse.json({ error: "Usuário inválido." }, { status: 400 });
  }

  const existing = await prisma.usuarioAutorizado.findUnique({ where: { id: usuarioId } });
  if (!existing) return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });

  if (existing.email === DEFAULT_ADMIN_EMAIL) {
    return NextResponse.json({ error: "O administrador principal não pode ser removido." }, { status: 400 });
  }

  await removeJuridicoFolderAccess(existing.email, existing.drive_permission_id);
  await prisma.usuarioAutorizado.delete({ where: { id: usuarioId } });
  return NextResponse.json({ ok: true });
}
