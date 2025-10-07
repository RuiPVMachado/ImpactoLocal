# Deployment Guide - VolunteerHub

Este guia descreve como fazer deploy da aplicação VolunteerHub em produção.

## Pré-requisitos

- Conta Supabase (https://supabase.com)
- Conta Vercel/Netlify/Cloudflare Pages (escolher uma)
- Node.js 18+ instalado localmente
- Git configurado

## 1. Setup Supabase (Backend)

### 1.1 Criar Projeto

1. Ir a https://supabase.com/dashboard
2. Clicar em "New Project"
3. Escolher:
   - Nome do projeto: `volunteerhub`
   - Database Password: gerar password forte
   - Region: escolher mais próxima (e.g., `eu-west-1` para Europa)

### 1.2 Aplicar Schema

1. Ir a SQL Editor no dashboard
2. Copiar conteúdo de `DATABASE_SCHEMA.md`
3. Executar todas as queries de criação de tabelas
4. Executar triggers e functions

### 1.3 Configurar RLS (Row Level Security)

```sql
-- Ativar RLS em todas as tabelas
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Anyone can view profiles"
  ON profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Events policies
CREATE POLICY "Anyone can view open events"
  ON events FOR SELECT
  USING (status = 'open' OR auth.uid() IS NOT NULL);

CREATE POLICY "Organizations can create events"
  ON events FOR INSERT
  WITH CHECK (
    auth.uid() = organization_id AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND type = 'organization'
    )
  );

CREATE POLICY "Organizations can update own events"
  ON events FOR UPDATE
  USING (auth.uid() = organization_id);

CREATE POLICY "Organizations can delete own events"
  ON events FOR DELETE
  USING (auth.uid() = organization_id);

-- Applications policies
CREATE POLICY "Volunteers can view own applications"
  ON applications FOR SELECT
  USING (auth.uid() = volunteer_id);

CREATE POLICY "Organizations can view applications for their events"
  ON applications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = applications.event_id
      AND events.organization_id = auth.uid()
    )
  );

CREATE POLICY "Volunteers can create applications"
  ON applications FOR INSERT
  WITH CHECK (auth.uid() = volunteer_id);

CREATE POLICY "Organizations can update applications for their events"
  ON applications FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = applications.event_id
      AND events.organization_id = auth.uid()
    )
  );
```

### 1.4 Configurar Email Templates

1. Ir a Authentication > Email Templates
2. Personalizar templates para:
   - Confirmação de email
   - Reset password
   - Magic link (se usar)

### 1.5 Configurar Auth Settings

1. Ir a Authentication > Settings
2. Configurar:
   - Site URL: `https://seu-dominio.com`
   - Redirect URLs: adicionar `https://seu-dominio.com/**`
   - Email confirmation: opcional (pode desativar para facilitar)

### 1.6 Obter Credenciais

1. Ir a Settings > API
2. Copiar:
   - Project URL
   - anon/public key

## 2. Preparar Frontend para Deploy

### 2.1 Criar ficheiro .env.production

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-anon-key
```

### 2.2 Atualizar package.json

Verificar scripts:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "lint": "eslint .",
    "typecheck": "tsc --noEmit"
  }
}
```

### 2.3 Testar Build Localmente

```bash
npm run build
npm run preview
```

Verificar que não há erros e a aplicação funciona em `http://localhost:4173`

## 3. Deploy no Vercel (Recomendado)

### 3.1 Install Vercel CLI

```bash
npm i -g vercel
```

### 3.2 Login

```bash
vercel login
```

### 3.3 Deploy

```bash
vercel
```

Seguir prompts:
- Setup and deploy? Yes
- Scope: selecionar conta
- Link to existing project? No
- Project name: volunteerhub
- Directory: `./` (root)
- Build command: `npm run build`
- Output directory: `dist`

### 3.4 Configurar Environment Variables

```bash
vercel env add VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_ANON_KEY
```

Ou via Dashboard:
1. Ir a https://vercel.com/dashboard
2. Selecionar projeto
3. Settings > Environment Variables
4. Adicionar variáveis

### 3.5 Deploy Produção

```bash
vercel --prod
```

## 4. Deploy no Netlify (Alternativa)

### 4.1 Criar netlify.toml

```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[build.environment]
  NODE_VERSION = "18"
```

### 4.2 Deploy via CLI

```bash
npm install -g netlify-cli
netlify login
netlify init
netlify deploy --prod
```

### 4.3 Configurar Environment Variables

Via Dashboard:
1. Site settings > Build & deploy > Environment
2. Adicionar:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

## 5. Deploy no Cloudflare Pages (Alternativa)

### 5.1 Connect Git Repository

1. Ir a https://pages.cloudflare.com
2. Create a project > Connect to Git
3. Selecionar repositório

### 5.2 Configure Build

- Build command: `npm run build`
- Build output directory: `dist`
- Root directory: `/`

### 5.3 Environment Variables

Adicionar na configuração:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

### 5.4 Deploy

Push para branch `main` automaticamente faz deploy

## 6. Configurar Domínio Personalizado

### Vercel

1. Settings > Domains
2. Add domain
3. Configurar DNS:
   - Tipo A: apontar para IP do Vercel
   - Ou CNAME: `cname.vercel-dns.com`

### Netlify

1. Domain settings > Add custom domain
2. Configurar DNS:
   - Netlify DNS (recomendado)
   - Ou CNAME externo

### Cloudflare

1. Custom domains > Set up a custom domain
2. DNS já gerido por Cloudflare automaticamente

## 7. Post-Deployment

### 7.1 Atualizar URLs no Supabase

1. Ir a Authentication > URL Configuration
2. Atualizar:
   - Site URL: `https://seu-dominio.com`
   - Redirect URLs: `https://seu-dominio.com/**`

### 7.2 Testar Funcionalidades

- [ ] Registo de utilizador
- [ ] Login/Logout
- [ ] Criar evento (como organização)
- [ ] Candidatar-se a evento
- [ ] Ver candidaturas
- [ ] Aprovar/rejeitar candidaturas
- [ ] Reset password

### 7.3 Configurar SSL

Todos os providers (Vercel, Netlify, Cloudflare) fornecem SSL automaticamente via Let's Encrypt.

### 7.4 Setup Monitoring

#### Vercel Analytics

```bash
npm install @vercel/analytics
```

```typescript
// src/main.tsx
import { Analytics } from '@vercel/analytics/react';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
    <Analytics />
  </React.StrictMode>,
);
```

#### Sentry (Error Tracking)

```bash
npm install @sentry/react
```

```typescript
// src/main.tsx
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: "your-sentry-dsn",
  environment: import.meta.env.MODE,
});
```

## 8. CI/CD com GitHub Actions

Criar `.github/workflows/deploy.yml`:

```yaml
name: Deploy

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Type check
        run: npm run typecheck

      - name: Lint
        run: npm run lint

      - name: Build
        run: npm run build
        env:
          VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}

      - name: Deploy to Vercel
        if: github.ref == 'refs/heads/main'
        run: vercel --prod --token=${{ secrets.VERCEL_TOKEN }}
```

## 9. Backup e Disaster Recovery

### 9.1 Backup Supabase

```bash
# Instalar Supabase CLI
npm install -g supabase

# Login
supabase login

# Link projeto
supabase link --project-ref seu-project-ref

# Backup
supabase db dump -f backup.sql
```

### 9.2 Scheduled Backups

Configurar no Supabase Dashboard:
- Settings > Database > Backups
- Ativar daily backups

## 10. Performance Optimization

### 10.1 Enable Compression

Vercel/Netlify/Cloudflare fazem automaticamente.

### 10.2 Image Optimization

Usar serviço CDN para imagens:
- Cloudinary
- ImageKit
- Supabase Storage

### 10.3 Caching

```typescript
// src/lib/supabase.ts
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  global: {
    headers: {
      'cache-control': 'max-age=3600', // 1 hora
    },
  },
});
```

## 11. Security Checklist

- [ ] RLS ativado em todas as tabelas
- [ ] Policies corretas implementadas
- [ ] Service role key NUNCA exposta no frontend
- [ ] HTTPS ativo
- [ ] CORS configurado corretamente
- [ ] Rate limiting ativo
- [ ] Environment variables seguras
- [ ] Auth tokens com expiração
- [ ] Validação de inputs
- [ ] XSS protection
- [ ] CSRF protection

## 12. Monitoring e Logs

### Supabase Logs

1. Ir a Database > Logs
2. Monitorar queries lentas
3. Configurar alertas

### Vercel Logs

```bash
vercel logs
vercel logs --follow
```

## 13. Troubleshooting

### Build Fails

- Verificar `node_modules` atualizado
- Verificar environment variables
- Correr `npm run typecheck` localmente

### 404 em rotas

Verificar configuração de redirects (SPA):
- Vercel: `vercel.json`
- Netlify: `netlify.toml`
- Cloudflare: automatic

### CORS errors

- Verificar URL configurado no Supabase
- Verificar allowed origins
- Verificar headers

### Auth não funciona

- Verificar Site URL e Redirect URLs no Supabase
- Verificar que credenciais estão corretas
- Verificar RLS policies

## 14. Maintenance

### Atualizar dependências

```bash
npm outdated
npm update
```

### Atualizar Supabase

Supabase atualiza automaticamente, mas verificar:
- Breaking changes no changelog
- Testar em staging primeiro

### Monitorar performance

- Google Lighthouse
- WebPageTest
- Vercel Analytics
