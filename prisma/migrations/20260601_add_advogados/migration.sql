CREATE TABLE "advogados" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "nome" TEXT NOT NULL,
  "nome_exibicao" TEXT NOT NULL,
  "uf" TEXT NOT NULL,
  "oab" TEXT NOT NULL,
  "email" TEXT,
  "telefone" TEXT,
  "principal" BOOLEAN NOT NULL DEFAULT false,
  "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "advogados_uf_oab_key" ON "advogados"("uf", "oab");
