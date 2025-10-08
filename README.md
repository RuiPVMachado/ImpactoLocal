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
- ✅ Email notifications (envio automático ao aprovar voluntários)
- 🚧 Sistema de reviews
- 🚧 Gamification
- 🚧 Mobile app
- 🚧 Multi-language

## Notificações por Email com Resend

Quando uma organização aprova a candidatura de um voluntário, um email automático é enviado através de uma Edge Function do Supabase que integra com a API do Resend.

### Configuração

1. **Definir variáveis de ambiente no Supabase**

   Configure as variáveis no projeto Supabase (Dashboard › Project Settings › Functions › Environment variables):

   | Nome                            | Descrição                                              |
   | ------------------------------- | ------------------------------------------------------ |
   | `RESEND_API_KEY`                | API key do Resend com permissões de envio              |
   | `RESEND_FROM_EMAIL`             | Endereço "From" verificado no Resend                   |
   | `RESEND_FROM_NAME` _(opcional)_ | Nome exibido no remetente (por defeito: Impacto Local) |

2. **Deploy da Edge Function**

   Com o [Supabase CLI](https://supabase.com/docs/guides/cli) configurado e autenticado:

   ```bash
   supabase functions deploy notify-volunteer
   supabase functions secrets set RESEND_API_KEY="<a sua chave>"
   supabase functions secrets set RESEND_FROM_EMAIL="no-reply@impactolocal.pt"
   supabase functions secrets set RESEND_FROM_NAME="Impacto Local"
   ```

   > Se preferir, as variáveis podem ser geridas diretamente no dashboard web na secção **Edge Functions › Secrets**.

3. **Permitir invocação pela aplicação**

   A função assume que o cliente está autenticado como organização para aprovar candidaturas; a invocação é feita via Supabase Functions no frontend (`notify-volunteer`). Certifique-se de que as políticas RLS para candidaturas continuam a proteger atualizações por utilizadores não autorizados.

4. **Verificar remetente no Resend**

   Confirme que o domínio ou endereço configurado em `RESEND_FROM_EMAIL` está verificado no Resend (Single Sender ou Domain Authentication). Sem essa verificação, os envios serão rejeitados.

Feito com ❤️ para a comunidade de voluntariado em Portugal
