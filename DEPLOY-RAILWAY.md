# Deploy do Juridico Rapido no Railway

Este projeto fica com dois modos:

- Local: SQLite em `prisma/schema.prisma`, usando `npm run dev`.
- Producao: Postgres em `prisma/postgres/schema.prisma`, usando `railway.json`.

## 1. Subir o codigo para um repositorio privado

Use um repositorio privado no GitHub. Nao envie arquivos de segredo:

- `.env`
- `.env.local`
- `.google-oauth-token.json`
- `google-oauth-client.json`
- `backups/`
- `prisma/dev.db`

O `.gitignore` ja foi ajustado para isso.

## 2. Criar o projeto no Railway

1. Crie um novo projeto no Railway.
2. Escolha deploy por GitHub repo.
3. Selecione o repositorio privado do Juridico Rapido.
4. Adicione um banco PostgreSQL no mesmo projeto.
5. No servico do app, crie a variavel `DATABASE_URL` referenciando o Postgres.

O arquivo `railway.json` ja define:

- Build: `npm run build:prod`
- Pre-deploy: `npm run db:deploy`
- Start: `npm run start:prod`

## 3. Variaveis de ambiente do app

Configure no servico do app:

```env
DATABASE_URL="referencia do Railway para o Postgres"
GOOGLE_OAUTH_CLIENT_ID=""
GOOGLE_OAUTH_CLIENT_SECRET=""
GOOGLE_OAUTH_REDIRECT_URI="https://SEU-DOMINIO.up.railway.app/api/google/callback"
GOOGLE_OAUTH_TOKEN_JSON='conteudo completo do arquivo .google-oauth-token.json em uma linha'
GOOGLE_DRIVE_PARENT_FOLDER_ID=""
DELETE_ASSISTIDO_PASSWORD=""
```

Use `.env.production.example` como modelo.

## 4. Google Cloud

No Google Cloud Console, no OAuth Client usado pelo sistema, adicione em Authorized redirect URIs:

```text
https://SEU-DOMINIO.up.railway.app/api/google/callback
```

O valor precisa ser exatamente igual ao `GOOGLE_OAUTH_REDIRECT_URI`.

## 5. Validacao depois do deploy

Depois que o Railway publicar:

1. Abra a URL publica.
2. Confira se a tela carrega.
3. Cadastre um assistido de teste menor.
4. Gere Dados Gerais, Procuracao e Declaracao de Hipossuficiencia.
5. Confira se a pasta e os documentos aparecem no Google Drive.
6. Confira CPF formatado, assinatura, data e negritos.

## 6. Comandos uteis

Build de producao local, usando Postgres:

```bash
npm run build:prod
```

Aplicar migrations no Postgres:

```bash
npm run db:deploy
```

Iniciar build standalone:

```bash
npm run start:prod
```
