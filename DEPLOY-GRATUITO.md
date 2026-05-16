# Deploy gratuito: Vercel + Supabase

Este e o caminho recomendado se voce nao tem dominio e quer gastar R$ 0 no inicio.

## Arquitetura

- App Next.js: Vercel Hobby, gratuito.
- Dominio: URL gratis da Vercel, como `https://juridico-rapido.vercel.app`.
- Banco: Supabase Free, Postgres gratuito.
- Google Drive/Docs: mesma integracao OAuth que ja funciona localmente.

## Limites importantes

- Vercel Hobby e gratuito para projetos pessoais.
- Supabase Free inclui Postgres, mas o projeto pode pausar depois de 1 semana sem uso.
- Nao suba segredos para o GitHub.

## 1. Criar GitHub privado

1. Crie conta em https://github.com.
2. Crie um repositorio privado chamado `juridico-rapido`.
3. Suba o projeto para esse repositorio.

Arquivos que NAO devem ir para o GitHub:

- `.env`
- `.env.local`
- `.google-oauth-token.json`
- `google-oauth-client.json`
- `backups/`
- `prisma/dev.db`

O `.gitignore` ja esta configurado para isso.

## 2. Criar banco no Supabase

1. Crie conta em https://supabase.com.
2. Crie um novo projeto.
3. Copie a connection string Postgres.
4. Use essa string como `DATABASE_URL`.

Depois, aplique as tabelas:

```bash
set DATABASE_URL=SUA_URL_DO_SUPABASE
npm run db:deploy
```

No PowerShell:

```powershell
$env:DATABASE_URL="SUA_URL_DO_SUPABASE"
npm run db:deploy
```

## 3. Criar projeto na Vercel

1. Crie conta em https://vercel.com.
2. Clique em Add New Project.
3. Importe o repositorio `juridico-rapido` do GitHub.
4. Em Environment Variables, configure:

```env
DATABASE_URL="connection string do Supabase"
GOOGLE_OAUTH_CLIENT_ID=""
GOOGLE_OAUTH_CLIENT_SECRET=""
GOOGLE_OAUTH_REDIRECT_URI="https://SEU-PROJETO.vercel.app/api/google/callback"
GOOGLE_OAUTH_TOKEN_JSON='conteudo completo do arquivo .google-oauth-token.json em uma linha'
GOOGLE_DRIVE_PARENT_FOLDER_ID=""
DELETE_ASSISTIDO_PASSWORD=""
```

O arquivo `vercel.json` ja manda a Vercel usar:

```bash
npm run vercel-build
```

## 4. Ajustar Google Cloud

No Google Cloud Console, abra o OAuth Client do sistema e adicione em Authorized redirect URIs:

```text
https://SEU-PROJETO.vercel.app/api/google/callback
```

Esse valor precisa ser igual ao `GOOGLE_OAUTH_REDIRECT_URI`.

## 5. Validar online

Depois do deploy:

1. Abra a URL `https://SEU-PROJETO.vercel.app`.
2. Cadastre um menor de teste.
3. Gere Dados Gerais.
4. Gere Procuracao.
5. Gere Declaracao de Hipossuficiencia.
6. Confira no Google Drive se a pasta e os documentos foram criados.
7. Confira CPF, assinatura, data e negritos.

## Observacao importante

Sem dominio proprio, use normalmente o dominio gratuito da Vercel.
Exemplo:

```text
https://juridico-rapido.vercel.app
```

Voce so precisa comprar dominio depois, se quiser um endereco profissional proprio.
