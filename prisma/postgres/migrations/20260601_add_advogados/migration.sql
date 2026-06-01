CREATE TABLE "advogados" (
  "id" SERIAL NOT NULL,
  "nome" TEXT NOT NULL,
  "nome_exibicao" TEXT NOT NULL,
  "uf" TEXT NOT NULL,
  "oab" TEXT NOT NULL,
  "email" TEXT,
  "telefone" TEXT,
  "principal" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "advogados_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "advogados_uf_oab_key" ON "advogados"("uf", "oab");
