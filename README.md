# VolunteerHub

Uma plataforma moderna para conectar voluntários com organizações e eventos de voluntariado em Portugal.

![VolunteerHub](https://via.placeholder.com/1200x400/10b981/ffffff?text=VolunteerHub)

## Sobre o Projeto

VolunteerHub é uma plataforma web que facilita a conexão entre pessoas que querem fazer voluntariado e organizações que precisam de voluntários. A plataforma permite:

- **Para Voluntários**: Descobrir eventos de voluntariado, candidatar-se e gerir as suas participações
- **Para Organizações**: Criar e gerir eventos, recrutar voluntários e coordenar atividades
- **Para Todos**: Promover o voluntariado e criar impacto social positivo

## Status Atual

**Frontend**: ✅ Completo (wireframe funcional)
**Backend**: 🚧 Por implementar (documentação completa disponível)

A aplicação atual funciona como um protótipo visual totalmente funcional com mock data. Toda a estrutura está preparada para integração com Supabase.

## Tecnologias

### Frontend

- **React 18** - Library UI
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **React Router** - Routing
- **Lucide React** - Icons

### Backend (Para Implementar)

- **Supabase** - Database & Auth
- **PostgreSQL** - Database
- **Row Level Security** - Segurança
- **Edge Functions** - Server-side logic

### Ferramentas

- **ESLint** - Linting
- **PostCSS** - CSS processing
- **TypeScript** - Type checking

## Getting Started

### Pré-requisitos

- Node.js 18+
- npm ou yarn

### Instalação

```bash
# Clone o repositório
git clone https://github.com/your-username/volunteerhub.git

# Entre na pasta
cd volunteerhub

# Instale as dependências
npm install

# Configure as variáveis de ambiente
cp .env.example .env
# Edite .env com suas credenciais Supabase (quando implementar backend)

# Execute em modo desenvolvimento
npm run dev
```

A aplicação estará disponível em `http://localhost:5173`

### Scripts Disponíveis

```bash
npm run dev        # Inicia servidor de desenvolvimento
npm run build      # Build para produção
npm run preview    # Preview do build
npm run lint       # Executa ESLint
npm run typecheck  # Verifica tipos TypeScript
```

## Estrutura do Projeto

```text
volunteerhub/
├── src/
│   ├── components/          # Componentes reutilizáveis
│   │   ├── EventCard.tsx
│   │   ├── Navbar.tsx
│   │   ├── Footer.tsx
│   │   └── MapPlaceholder.tsx
│   ├── pages/               # Páginas/Rotas
│   │   ├── Home.tsx
│   │   ├── Events.tsx
│   │   ├── EventDetails.tsx
│   │   ├── Login.tsx
│   │   ├── Register.tsx
│   │   ├── Profile.tsx
│   │   ├── MyApplications.tsx
│   │   ├── CreateEvent.tsx
│   │   ├── OrganizationDashboard.tsx
│   │   ├── OrganizationEvents.tsx
│   │   ├── AdminPanel.tsx
│   │   └── SobreNos.tsx
│   ├── context/             # React Context
│   │   └── AuthContext.tsx
│   ├── types/               # TypeScript types
│   │   └── index.ts
│   ├── App.tsx              # Main app component
│   ├── main.tsx             # Entry point
│   └── index.css            # Global styles
├── public/                  # Assets estáticos
├── docs/                    # Documentação
├── .env.example             # Exemplo de variáveis de ambiente
├── package.json
├── tsconfig.json
├── vite.config.ts
└── tailwind.config.js
```

## Documentação

Documentação completa disponível em:

- **[BACKEND_INTEGRATION.md](./BACKEND_INTEGRATION.md)** - Como integrar o backend
- **[DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md)** - Schema da base de dados
- **[API_ENDPOINTS.md](./API_ENDPOINTS.md)** - Endpoints da API
- **[AUTHENTICATION_GUIDE.md](./AUTHENTICATION_GUIDE.md)** - Guia de autenticação
- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Guia de deployment
- **[CONTRIBUTING.md](./CONTRIBUTING.md)** - Como contribuir
- **[FEATURES.md](./FEATURES.md)** - Features e roadmap

## Features Principais

### Para Voluntários

- ✅ Descobrir eventos de voluntariado
- ✅ Filtrar por categoria e localização
- ✅ Ver detalhes completos dos eventos
- ✅ Candidatar-se a eventos
- ✅ Gerir candidaturas
- ✅ Perfil personalizado

### Para Organizações

- ✅ Criar e publicar eventos
- ✅ Gerir eventos
- ✅ Receber candidaturas
- ✅ Aprovar/Rejeitar voluntários
- ✅ Dashboard com estatísticas
- ✅ Perfil da organização

### Para Admins

- ✅ Painel administrativo
- ✅ Gerir utilizadores
- ✅ Estatísticas gerais
- ✅ Moderação de conteúdo

### Features Futuras

- 🚧 Google Maps integration
- 🚧 Email notifications
- 🚧 Sistema de reviews
- 🚧 Gamification
- 🚧 Mobile app
- 🚧 Multi-language

Ver [FEATURES.md](./FEATURES.md) para roadmap completo.

## Integração Backend

### Quick Start

1. **Criar projeto Supabase**

   - Ir a [supabase.com](https://supabase.com)
   - Criar novo projeto
   - Copiar credenciais

2. **Configurar variáveis de ambiente**

   ```env
   # .env (carregado pelo Vite)
   VITE_SUPABASE_URL=https://example.supabase.co
   VITE_SUPABASE_ANON_KEY=your_public_anon_key

   # .env.local, secrets manager ou Supabase Edge Functions ONLY (não colocar no bundle do frontend)
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_secret
   SUPABASE_JWT_SECRET=your_legacy_jwt_secret
   SENDGRID_API_KEY=your_sendgrid_api_key
   SENDGRID_SENDER_EMAIL=your_verified_sender@example.com
   SENDGRID_TEMPLATE_EVENT_CONFIRMATION=your_sendgrid_template_id
   ```

   > ⚠️ O `SUPABASE_SERVICE_ROLE_KEY` e o `SUPABASE_JWT_SECRET` são sensíveis. Guarde-os apenas em runtimes seguros do lado do servidor (p.ex. funções edge, workers, actions) e nunca os exponha em ficheiros `VITE_` compilados para o browser.
   >
   > ⚠️ As credenciais SendGrid também são segredos; mantenha-as apenas no servidor/edge function que envia emails. No frontend, utilize apenas proxies ou chamadas autenticadas ao backend.

3. **Aplicar schema da base de dados**

   - Copiar SQL de `DATABASE_SCHEMA.md`
   - Executar no SQL Editor do Supabase

4. **Implementar integração**
   - Seguir guias em `BACKEND_INTEGRATION.md`
   - Implementar `AuthContext.tsx`
   - Substituir mock data por queries reais

Ver [BACKEND_INTEGRATION.md](./BACKEND_INTEGRATION.md) para detalhes completos.

## Deploy

### Vercel (resumo rápido)

1. Faça um `git push` para o GitHub/GitLab/Bitbucket.
2. No dashboard da Vercel, crie um novo projeto e ligue-o ao repositório.
3. Confirme as definições padrão:
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Framework Preset**: `Vite`
4. Em _Settings → Environment Variables_, adicione pelo menos:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_GOOGLE_MAPS_API_KEY` (opcional, apenas se usar mapas)
5. Clique em **Deploy** e aguarde a build concluir.
6. Após o deploy, teste a aplicação no domínio gerado e atualize as URLs no Supabase (Authentication → URL Configuration).

> 💡 Dica rápida: antes de dar deploy, execute `npm run build` localmente para garantir que não há erros de compilação.

### Opções de Deploy

1. **Vercel** (Recomendado)

   ```bash
   npm install -g vercel
   vercel
   ```

2. **Netlify**

   ```bash
   npm install -g netlify-cli
   netlify deploy --prod
   ```

3. **Cloudflare Pages**
   - Connect Git repository
   - Configure build settings

Ver [DEPLOYMENT.md](./DEPLOYMENT.md) para guia completo.

## Contribuir

Contribuições são bem-vindas! Por favor:

1. Fork o repositório
2. Crie uma branch (`git checkout -b feature/NovaFeature`)
3. Commit suas mudanças (`git commit -m 'feat: adiciona nova feature'`)
4. Push para a branch (`git push origin feature/NovaFeature`)
5. Abra um Pull Request

Ver [CONTRIBUTING.md](./CONTRIBUTING.md) para guidelines detalhadas.

## Licença

Este projeto está sob a licença MIT. Ver [LICENSE](./LICENSE) para mais informações.

## Contacto

- **Website**: <https://volunteerhub.pt>
- **Email**: <mailto:contact@volunteerhub.pt>
- **GitHub**: <https://github.com/volunteerhub>

## Agradecimentos

- Icones por [Lucide](https://lucide.dev)
- Imagens por [Pexels](https://pexels.com)
- Inspiração: plataformas de voluntariado existentes

---

Feito com ❤️ para a comunidade de voluntariado em Portugal
