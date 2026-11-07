# Cadência

Agende vídeos (Reels) para suas páginas, aplique a sua marca com modelos de edição e
deixe o servidor publicar no horário certo.

## O que já funciona (MVP)

- **Conta e login** com e-mail e senha.
- **Páginas e contas**: cada página é uma marca (nome, @, avatar) com as contas das redes.
  - **Instagram** pela API oficial (login do Instagram).
  - **YouTube** pela API oficial (login do Google).
  - **Conta de teste (simulada)**: aceita todos os formatos e percorre o fluxo sem publicar.
- **Meus arquivos**: biblioteca de vídeos (MP4/MOV, até 300 MB) e imagens (JPG/PNG/WEBP, até 30 MB).
- **Agendar publicações** (`/agendar`), escolhendo o formato:
  - **Posts**: cada imagem vira um post no feed, distribuído em dias e horários fixos.
  - **Carrosséis**: de 2 a 10 imagens e vídeos em uma publicação, com ordem das páginas.
  - **Reels**: lote de vídeos com modelo de edição, em dias e horários fixos.
  - **Stories**: lote de imagens ou vídeos distribuído entre contas, dias e horários.
  - **YouTube**: vídeo ou Short com título, descrição e privacidade.
  Nos lotes, cada arquivo ocupa o próximo horário livre de cada conta.
- **Nova postagem**: um Reel rápido, com prévia ao vivo do modelo.
- **Modelos de edição** (renderizados com FFmpeg): vídeo como está, post claro, post escuro,
  manchete e marca d'água.
- **Reescrever com IA**: reescreve a legenda usando a API do Claude.
- **Publicações**: fila com status, etapas de cada envio, excluir e tentar de novo.
- **Calendário** do mês, com filtro por conta.
- **Painel** com contadores, últimos 7 dias, próximas publicações e falhas.

## Rodar no seu computador

Requisitos: Node.js 22.12+ (testado com 26.7).

```bash
npm install
```

Se o npm avisar sobre scripts de instalação bloqueados, aprove os pacotes que já estão
listados em `allowScripts` no `package.json` (Prisma, FFmpeg e esbuild) e rode `npm rebuild`.

```bash
cp .env.example .env      # depois preencha SESSION_SECRET com 64 caracteres aleatórios
npm run db:push           # cria o banco SQLite em prisma/dev.db
npm run dev               # sobe o site (http://localhost:3000) e o worker juntos
```

O `npm run dev` roda dois processos:

- **site**: o Next.js;
- **worker**: verifica a fila a cada 15 s, aplica o modelo de edição e publica.

O banco começa vazio: abra o site e crie sua conta em **Criar conta**.

## Conectar o Instagram de verdade

O Cadência usa a **API do Instagram com login unificado** (Facebook Login for Business),
que é o que a Meta libera para apps novos. Na tela da Meta o cliente clica em
**"Continuar com o Instagram"** e conecta a conta dele direto.

1. Crie um app do tipo **Empresa** em [developers.facebook.com](https://developers.facebook.com)
   e adicione o produto **Login do Facebook para Empresas**.
2. Crie uma **configuração** com token de usuário do sistema que não expira e as permissões
   `instagram_basic`, `instagram_content_publish` e `instagram_manage_messages`.
   O ID dessa configuração vai em `META_CONFIG_ID`.
3. Cadastre a URL de retorno: `https://SEU-DOMINIO/api/instagram/callback`.
   A Meta exige HTTPS. Para testar no seu PC, use um túnel (Cloudflare Tunnel, ngrok)
   e coloque o endereço dele em `APP_URL`.
4. Preencha no `.env`: `META_APP_ID`, `META_APP_SECRET`, `META_CONFIG_ID` e `APP_URL`.
5. A conta do Instagram precisa ser **profissional** (Comercial ou Criador de conteúdo).
6. Enquanto o app estiver em desenvolvimento, só contas adicionadas como **testadoras**
   conseguem conectar. Para abrir para qualquer cliente: verificação da empresa,
   acesso de Provedor de Tecnologia, análise do app (App Review) e modo **Ao vivo**.

Reels são enviados direto do servidor. Já **Posts, Carrosséis e Stories** são baixados pelo
Instagram a partir de um link temporário e assinado (`/api/publico/...`), então o `APP_URL`
precisa ser um endereço público com HTTPS. Imagens PNG/WEBP são convertidas para JPEG
automaticamente (o Instagram só aceita JPEG).

**Stories com link** (figurinha de link clicável) não estão disponíveis: a API oficial do
Instagram não permite adicionar links em Stories, e fazer isso automatizando o site do
Instagram vai contra os termos de uso e arrisca a conta.

## Conectar o YouTube

1. No [Google Cloud Console](https://console.cloud.google.com), crie um projeto e ative a
   **YouTube Data API v3**.
2. Configure a tela de consentimento OAuth e crie um **ID do cliente OAuth** do tipo
   "Aplicativo da Web".
3. Cadastre a URL de retorno: `https://SEU-DOMINIO/api/youtube/callback`.
4. Preencha no `.env`: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` e `APP_URL`.
5. Enquanto o app não passar pela verificação do Google, vídeos enviados pela API por
   projetos não verificados podem ficar como privados, e só usuários de teste conseguem conectar.

## IA para legendas

Coloque sua chave em `ANTHROPIC_API_KEY` no `.env`. O botão "Reescrever com IA" usa o
modelo `claude-opus-5-5`, com esforço baixo e fallback automático em caso de recusa.

## Colocar no ar (para publicar com o PC desligado)

O site e o worker precisam ficar ligados em um servidor (VPS, Railway, Render, Fly.io…):

```bash
npm run build
npm start                  # site + worker
```

Para produção, recomendado:

- trocar o SQLite por **Postgres** (`provider = "postgresql"` em `prisma/schema.prisma`);
- guardar os vídeos em **armazenamento de objetos** (Cloudflare R2 ou S3) em vez da pasta `storage/`;
- usar HTTPS e um `SESSION_SECRET` forte.

## Próximos passos

- TikTok (Content Posting API) e Facebook (Pages API).
- Planos, limites e pagamento via Pix.
- Editor de modelos próprio.

## Uso responsável

Publique apenas conteúdo seu ou que você tem direito de usar. O Cadência não baixa
nem republica vídeos de perfis de terceiros.
