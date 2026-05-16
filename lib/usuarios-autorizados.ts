import { prisma } from "@/lib/prisma";

export const DEFAULT_ADMIN_EMAIL = "cwgb.adv@gmail.com";

export async function ensureDefaultAdmin() {
  await prisma.usuarioAutorizado.upsert({
    where: { email: DEFAULT_ADMIN_EMAIL },
    update: {
      nome: "Christian Wendel Gonçalves Bentes",
      role: "admin",
      ativo: true
    },
    create: {
      email: DEFAULT_ADMIN_EMAIL,
      nome: "Christian Wendel Gonçalves Bentes",
      role: "admin",
      ativo: true
    }
  });
}

export function normalizeEmail(email?: string | null) {
  return (email || "").trim().toLowerCase();
}
