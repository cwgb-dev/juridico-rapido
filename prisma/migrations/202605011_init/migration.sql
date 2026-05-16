CREATE TABLE IF NOT EXISTS "assistidos" (
  "cpf" TEXT NOT NULL PRIMARY KEY,
  "nome_completo" TEXT NOT NULL,
  "rg" TEXT,
  "data_nascimento" DATETIME,
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
  "data_cadastro" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "pasta_drive_id" TEXT,
  "pasta_drive_url" TEXT,
  "dados_gerais_id" TEXT,
  "dados_gerais_url" TEXT,
  "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "atendimentos" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "cpf_assistido" TEXT NOT NULL,
  "data_atendimento" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "numero_processo" TEXT,
  "relato" TEXT NOT NULL,
  "observacoes" TEXT,
  "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "atendimentos_cpf_assistido_fkey"
    FOREIGN KEY ("cpf_assistido") REFERENCES "assistidos" ("cpf")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "atendimentos_cpf_assistido_idx" ON "atendimentos"("cpf_assistido");

CREATE TABLE IF NOT EXISTS "usuarios_autorizados" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "email" TEXT NOT NULL UNIQUE,
  "nome" TEXT,
  "role" TEXT NOT NULL DEFAULT 'user',
  "ativo" BOOLEAN NOT NULL DEFAULT true,
  "drive_permission_id" TEXT,
  "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO "usuarios_autorizados" ("email", "nome", "role", "ativo")
VALUES ('cwgb.adv@gmail.com', 'Christian Wendel Gonçalves Bentes', 'admin', true);
