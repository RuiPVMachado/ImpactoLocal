# ImpactoLocal

Uma plataforma moderna para conectar voluntários com organizações e eventos de voluntariado em Portugal.

## Sobre o Projeto

ImpactoLocal é uma plataforma web que facilita a conexão entre pessoas que querem fazer voluntariado e organizações que precisam de voluntários. A plataforma permite:

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
git clone https://github.com/RuiPVMachado/ImpactoLocal.git

# Entre na pasta
cd ImpactoLocal

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

Feito com ❤️ para a comunidade de voluntariado em Portugal
