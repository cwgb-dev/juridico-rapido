# Jurídico Rápido

Sistema web simples para cadastro rápido de assistidos, registro de demanda, busca automática de CEP e geração de documentos jurídicos.

## Rodar localmente

```bash
npm install
npm run db:init
npm run dev
```

Abra `http://127.0.0.1:3000`.

## Como consultar depois

O aplicativo roda como sistema web local em `http://127.0.0.1:3000`. Os dados ficam no SQLite em `prisma/dev.db`.

Sem credenciais Google, os arquivos são criados em:

```text
G:\Meu Drive\01 - JURIDICO
```

Como essa pasta está dentro do Google Drive para desktop, o próprio Drive sincroniza depois.

## Google Drive e Docs API

Quando as credenciais forem preenchidas, o sistema troca automaticamente para criação direta pela API do Google Drive e Google Docs.

### Caminho para criar as credenciais

1. Acesse `https://console.cloud.google.com`.
2. Crie ou selecione um projeto.
3. Entre em `APIs e serviços` > `Biblioteca`.
4. Ative `Google Drive API`.
5. Ative `Google Docs API`.
6. Entre em `APIs e serviços` > `Credenciais`.
7. Clique em `Criar credenciais` > `Conta de serviço`.
8. Crie a conta de serviço.
9. Abra a conta criada, vá em `Chaves`.
10. Clique em `Adicionar chave` > `Criar nova chave` > `JSON`.
11. Baixe o arquivo JSON.
12. No Google Drive, compartilhe a pasta raiz com o e-mail da conta de serviço como editor.

Depois preencha:

```env
GOOGLE_CLIENT_EMAIL="service-account@project.iam.gserviceaccount.com"
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_DRIVE_PARENT_FOLDER_ID="id_da_pasta_raiz_opcional"
```

Compartilhe a pasta raiz do Drive com o e-mail da service account como editor. Se `GOOGLE_DRIVE_PARENT_FOLDER_ID` ficar vazio, a pasta será criada no Drive acessível pela service account.

## Fluxo

Ao salvar um assistido, a API:

1. Bloqueia CPF duplicado.
2. Cria a pasta `NOME_CLIENTE - CPF`.
3. Cria `01 - Documentos`, `02 - Demandas` e `03 - Minutas`.
4. Salva a pasta no banco.

Na aba Demanda, ao marcar os documentos e clicar em `Gerar documentos`, a API:

1. Registra a demanda em `atendimentos`.
2. Gera `Procuração`.
3. Gera `Declaração de Hipossuficiência`.
4. Salva os documentos em `01 - Documentos`.
5. Abre o primeiro documento gerado.

## Rotas

- `GET /api/cep?cep=00000000`
- `GET /api/assistidos`
- `POST /api/assistidos`
- `GET /api/assistidos/[cpf]`
- `PUT /api/assistidos/[cpf]`
- `DELETE /api/assistidos/[cpf]`
- `GET /api/atendimentos?cpf=00000000000`
- `POST /api/atendimentos`
- `POST /api/documentos/gerar`

## Cadastro local de advogados

A busca de advogado usa a base local em `data/advogados.json`. O CNA oficial fica em `https://cna.oab.org.br/`; ele pode ser conferido manualmente, mas nao ha uma API publica estavel no projeto para consulta automatica direta.

Para adicionar um advogado:

```bash
npm run advogado:add -- --nome="Nome Completo" --uf=RR --oab=1234
```

Tambem e possivel informar e-mail e telefone:

```bash
npm run advogado:add -- --nome="Nome Completo" --uf=RR --oab=1234 --email=nome@email.com --telefone="(95) 99999-9999"
```
