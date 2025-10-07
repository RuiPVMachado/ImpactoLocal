# Backend Integration Guide

Este documento descreve como integrar o backend com o Copilot para a plataforma VolunteerHub.

## Estrutura Atual (Frontend Wireframe)

A aplicação está totalmente funcional como wireframe/protótipo visual, mas **todas as operações de dados são mock/simuladas**.

## Onde Adicionar o Backend

### 1. Autenticação (`src/context/AuthContext.tsx`)

Atualmente usa dados mock. Integre com Supabase Auth:

```typescript
// TODO: Implementar com Supabase
const login = async (email: string, password: string) => {
  // const { data, error } = await supabase.auth.signInWithPassword({
  //   email,
  //   password,
  // });
};

const register = async (email: string, password: string, name: string, type: string) => {
  // const { data, error } = await supabase.auth.signUp({
  //   email,
  //   password,
  //   options: {
  //     data: { name, type }
  //   }
  // });
};
```

### 2. Eventos (`src/pages/Events.tsx`)

Mock data em `mockEvents`. Substitua por:

```typescript
// TODO: Buscar eventos do Supabase
// const { data: events } = await supabase
//   .from('events')
//   .select('*')
//   .eq('status', 'open');
```

### 3. Candidaturas

#### Criar candidatura (`src/pages/Events.tsx`, `EventDetails.tsx`)
```typescript
const handleApply = async (eventId: string) => {
  // TODO: Criar candidatura no Supabase
  // await supabase.from('applications').insert({
  //   event_id: eventId,
  //   volunteer_id: user.id,
  //   status: 'pending'
  // });
};
```

#### Ver candidaturas (`src/pages/MyApplications.tsx`)
```typescript
// TODO: Buscar candidaturas do utilizador
// const { data } = await supabase
//   .from('applications')
//   .select('*, events(*)')
//   .eq('volunteer_id', user.id);
```

### 4. Organizações

#### Dashboard (`src/pages/OrganizationDashboard.tsx`)
```typescript
// TODO: Buscar estatísticas e candidaturas pendentes
```

#### Criar evento (`src/pages/CreateEvent.tsx`)
```typescript
const handleSubmit = async (formData) => {
  // TODO: Criar evento no Supabase
  // await supabase.from('events').insert({
  //   ...formData,
  //   organization_id: user.id
  // });
};
```

#### Gerir eventos (`src/pages/OrganizationEvents.tsx`)
```typescript
// TODO: CRUD de eventos da organização
```

### 5. Admin Panel (`src/pages/AdminPanel.tsx`)

```typescript
// TODO: Implementar gestão de utilizadores, organizações e eventos
// Apenas acessível por utilizadores com role 'admin'
```

### 6. Google Maps API

Já existe um placeholder em `src/components/MapPlaceholder.tsx`.

Para integrar:
1. Obter API key do Google Maps
2. Instalar: `npm install @react-google-maps/api`
3. Substituir o componente MapPlaceholder por um mapa real

### 7. Notificações Email (SendGrid)

Implementar notificações para:
- Confirmação de registo
- Aprovação/rejeição de candidaturas
- Lembretes de eventos
- Novos eventos na área do voluntário

## Schema Sugerido para Supabase

### Tabela: users
```sql
- id (uuid, PK)
- email (text, unique)
- name (text)
- type (enum: 'volunteer' | 'organization' | 'admin')
- phone (text)
- location (text)
- bio (text)
- created_at (timestamp)
```

### Tabela: events
```sql
- id (uuid, PK)
- organization_id (uuid, FK -> users.id)
- title (text)
- description (text)
- category (text)
- address (text)
- lat (decimal)
- lng (decimal)
- date (timestamp)
- duration (text)
- volunteers_needed (int)
- volunteers_registered (int)
- status (enum: 'open' | 'closed' | 'completed')
- created_at (timestamp)
```

### Tabela: applications
```sql
- id (uuid, PK)
- event_id (uuid, FK -> events.id)
- volunteer_id (uuid, FK -> users.id)
- status (enum: 'pending' | 'approved' | 'rejected')
- message (text)
- applied_at (timestamp)
```

## APIs Externas Necessárias

1. **Supabase** - Base de dados e autenticação
   - Criar projeto em https://supabase.com
   - Configurar `.env` com VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY

2. **Google Maps API**
   - Obter API key em https://console.cloud.google.com
   - Ativar: Maps JavaScript API, Geocoding API

3. **SendGrid API**
   - Criar conta em https://sendgrid.com
   - Obter API key para envio de emails

## Variáveis de Ambiente (.env)

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_key
VITE_SENDGRID_API_KEY=your_sendgrid_key
```

## Próximos Passos

1. Configurar Supabase e criar as tabelas
2. Implementar autenticação com Supabase Auth
3. Substituir mock data por queries reais
4. Integrar Google Maps API
5. Configurar SendGrid para notificações
6. Implementar RLS (Row Level Security) no Supabase
7. Adicionar testes
8. Deploy

## Recursos Úteis

- [Documentação Supabase](https://supabase.com/docs)
- [Documentação React Router](https://reactrouter.com/)
- [Google Maps API](https://developers.google.com/maps)
- [SendGrid API](https://docs.sendgrid.com/)
