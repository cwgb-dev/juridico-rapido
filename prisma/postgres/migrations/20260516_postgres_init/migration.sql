CREATE TABLE "assistidos" (
  "cpf" TEXT NOT NULL,
  "nome_completo" TEXT NOT NULL,
  "rg" TEXT,
  "data_nascimento" TIMESTAMP(3),
  "nacionalidade" TEXT,
  "estado_civil" TEXT,
  "profissao" TEXT,
  "telefone_whatsapp" TEXT,
  "email" TEXT,
  "cep" TEXT,
  "logradouro" TEXT,
  "numero" TEXT,
  "complemento" TEXT,
  "bairro" TEXT,
  "municipio" TEXT,
  "estado" TEXT,
  "endereco_completo" TEXT,
  "indicacao" TEXT,
  "observacoes" TEXT,
  "menor" BOOLEAN NOT NULL DEFAULT false,
  "representante_legal_nome" TEXT,
  "representante_legal_parentesco" TEXT,
  "representante_legal_nacionalidade" TEXT,
  "representante_legal_estado_civil" TEXT,
  "representante_legal_profissao" TEXT,
  "representante_legal_rg" TEXT,
  "representante_legal_cpf" TEXT,
  "representante_legal_email" TEXT,
  "representante_legal_telefone" TEXT,
  "advogado_adicional_nome" TEXT,
  "advogado_adicional_oab" TEXT,
  "advogado_adicional_uf" TEXT,
  "data_cadastro" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "pasta_drive_id" TEXT,
  "pasta_drive_url" TEXT,
  "dados_gerais_id" TEXT,
  "dados_gerais_url" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "assistidos_pkey" PRIMARY KEY ("cpf")
);

CREATE TABLE "atendimentos" (
  "id" SERIAL NOT NULL,
  "cpf_assistido" TEXT NOT NULL,
  "data_atendimento" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "numero_processo" TEXT,
  "relato" TEXT NOT NULL,
  "observacoes" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "atendimentos_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "usuarios_autorizados" (
  "id" SERIAL NOT NULL,
  "email" TEXT NOT NULL,
  "nome" TEXT,
  "role" TEXT NOT NULL DEFAULT 'user',
  "ativo" BOOLEAN NOT NULL DEFAULT true,
  "drive_permission_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "usuarios_autorizados_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "usuarios_autorizados_email_key" ON "usuarios_autorizados"("email");
CREATE INDEX "atendimentos_cpf_assistido_idx" ON "atendimentos"("cpf_assistido");

ALTER TABLE "atendimentos"
  ADD CONSTRAINT "atendimentos_cpf_assistido_fkey"
  FOREIGN KEY ("cpf_assistido") REFERENCES "assistidos"("cpf")
  ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "usuarios_autorizados" ("email", "nome", "role", "ativo")
VALUES ('cwgb.adv@gmail.com', 'Christian Wendel Gonçalves Bentes', 'admin', true)
ON CONFLICT ("email") DO NOTHING;
