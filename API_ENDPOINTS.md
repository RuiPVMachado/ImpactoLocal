# API Endpoints - VolunteerHub

Este documento descreve os endpoints da API necessários para a plataforma VolunteerHub, usando Supabase Client e Edge Functions.

## Autenticação

### Supabase Auth Endpoints (usando @supabase/supabase-js)

#### 1. Registar utilizador
```typescript
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'password',
  options: {
    data: {
      name: 'Nome do Utilizador',
      type: 'volunteer' // ou 'organization'
    }
  }
});
```

#### 2. Login
```typescript
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password'
});
```

#### 3. Logout
```typescript
const { error } = await supabase.auth.signOut();
```

#### 4. Obter sessão atual
```typescript
const { data: { session } } = await supabase.auth.getSession();
```

#### 5. Atualizar utilizador
```typescript
const { data, error } = await supabase.auth.updateUser({
  data: { name: 'Novo Nome' }
});
```

#### 6. Reset password
```typescript
const { data, error } = await supabase.auth.resetPasswordForEmail(
  'user@example.com',
  { redirectTo: 'https://yourapp.com/reset-password' }
);
```

## Profiles (Perfis de Utilizador)

### 1. Obter perfil do utilizador
```typescript
const { data, error } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', userId)
  .single();
```

### 2. Atualizar perfil
```typescript
const { data, error } = await supabase
  .from('profiles')
  .update({
    name: 'Novo Nome',
    bio: 'Nova bio',
    phone: '+351 912 345 678',
    location: 'Lisboa, Portugal'
  })
  .eq('id', userId);
```

### 3. Listar organizações (para homepage)
```typescript
const { data, error } = await supabase
  .from('profiles')
  .select('id, name, bio, avatar_url')
  .eq('type', 'organization')
  .limit(10);
```

## Events (Eventos)

### 1. Listar todos os eventos (com filtros)
```typescript
let query = supabase
  .from('events')
  .select(`
    *,
    organization:profiles!organization_id(id, name, avatar_url)
  `)
  .eq('status', 'open')
  .order('date', { ascending: true });

// Filtrar por categoria
if (category !== 'all') {
  query = query.eq('category', category);
}

// Pesquisar por texto
if (searchTerm) {
  query = query.or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
}

const { data, error } = await query;
```

### 2. Obter detalhes de um evento
```typescript
const { data, error } = await supabase
  .from('events')
  .select(`
    *,
    organization:profiles!organization_id(id, name, avatar_url, bio, email)
  `)
  .eq('id', eventId)
  .single();
```

### 3. Criar evento (apenas organizações)
```typescript
const { data, error } = await supabase
  .from('events')
  .insert({
    organization_id: userId,
    title: 'Título do Evento',
    description: 'Descrição detalhada',
    category: 'Ambiente',
    address: 'Morada completa',
    lat: 38.7223,
    lng: -9.1393,
    date: '2025-12-01T10:00:00',
    duration: '3 horas',
    volunteers_needed: 20,
    image_url: 'https://...'
  })
  .select()
  .single();
```

### 4. Atualizar evento
```typescript
const { data, error } = await supabase
  .from('events')
  .update({
    title: 'Novo Título',
    description: 'Nova descrição',
    status: 'closed'
  })
  .eq('id', eventId)
  .eq('organization_id', userId); // Apenas a organização dona pode atualizar
```

### 5. Deletar evento
```typescript
const { error } = await supabase
  .from('events')
  .delete()
  .eq('id', eventId)
  .eq('organization_id', userId);
```

### 6. Listar eventos da organização
```typescript
const { data, error } = await supabase
  .from('events')
  .select('*')
  .eq('organization_id', userId)
  .order('date', { ascending: true });
```

### 7. Obter estatísticas do evento
```typescript
const { data, error } = await supabase
  .from('applications')
  .select('status')
  .eq('event_id', eventId);

// Processar localmente para contar por status
const stats = {
  pending: data.filter(a => a.status === 'pending').length,
  approved: data.filter(a => a.status === 'approved').length,
  rejected: data.filter(a => a.status === 'rejected').length
};
```

## Applications (Candidaturas)

### 1. Candidatar-se a um evento
```typescript
const { data, error } = await supabase
  .from('applications')
  .insert({
    event_id: eventId,
    volunteer_id: userId,
    message: 'Mensagem opcional do voluntário'
  })
  .select()
  .single();
```

### 2. Verificar se já se candidatou
```typescript
const { data, error } = await supabase
  .from('applications')
  .select('id, status')
  .eq('event_id', eventId)
  .eq('volunteer_id', userId)
  .maybeSingle();
```

### 3. Listar candidaturas do voluntário
```typescript
const { data, error } = await supabase
  .from('applications')
  .select(`
    *,
    event:events(
      *,
      organization:profiles!organization_id(name, avatar_url)
    )
  `)
  .eq('volunteer_id', userId)
  .order('applied_at', { ascending: false });
```

### 4. Listar candidaturas de um evento (para organização)
```typescript
const { data, error } = await supabase
  .from('applications')
  .select(`
    *,
    volunteer:profiles!volunteer_id(id, name, email, phone, avatar_url, bio)
  `)
  .eq('event_id', eventId)
  .order('applied_at', { ascending: false });
```

### 5. Aprovar/Rejeitar candidatura
```typescript
const { data, error } = await supabase
  .from('applications')
  .update({ status: 'approved' }) // ou 'rejected'
  .eq('id', applicationId);
```

### 6. Cancelar candidatura
```typescript
const { error } = await supabase
  .from('applications')
  .delete()
  .eq('id', applicationId)
  .eq('volunteer_id', userId);
```

## Admin (Painel Administrativo)

### 1. Listar todos os utilizadores
```typescript
const { data, error } = await supabase
  .from('profiles')
  .select('*')
  .order('created_at', { ascending: false });
```

### 2. Atualizar tipo de utilizador
```typescript
const { data, error } = await supabase
  .from('profiles')
  .update({ type: 'admin' })
  .eq('id', userId);
```

### 3. Obter estatísticas gerais
```typescript
// Total de utilizadores
const { count: totalUsers } = await supabase
  .from('profiles')
  .select('*', { count: 'exact', head: true });

// Total de eventos
const { count: totalEvents } = await supabase
  .from('events')
  .select('*', { count: 'exact', head: true });

// Total de candidaturas
const { count: totalApplications } = await supabase
  .from('applications')
  .select('*', { count: 'exact', head: true });
```

## Notifications (Opcional)

### 1. Listar notificações do utilizador
```typescript
const { data, error } = await supabase
  .from('notifications')
  .select('*')
  .eq('user_id', userId)
  .order('created_at', { ascending: false })
  .limit(50);
```

### 2. Marcar notificação como lida
```typescript
const { error } = await supabase
  .from('notifications')
  .update({ read: true })
  .eq('id', notificationId);
```

### 3. Marcar todas como lidas
```typescript
const { error } = await supabase
  .from('notifications')
  .update({ read: true })
  .eq('user_id', userId)
  .eq('read', false);
```

## Edge Functions (Operações complexas/backend)

### 1. Enviar email de notificação

**Edge Function: send-notification**

```typescript
// POST /functions/v1/send-notification
// Body:
{
  "type": "application_approved",
  "to": "user@example.com",
  "data": {
    "eventTitle": "Nome do Evento",
    "eventDate": "2025-12-01"
  }
}
```

### 2. Geocoding de moradas

**Edge Function: geocode-address**

```typescript
// POST /functions/v1/geocode-address
// Body:
{
  "address": "Praça do Comércio, Lisboa"
}

// Response:
{
  "lat": 38.7077,
  "lng": -9.1365,
  "formatted_address": "Praça do Comércio, 1100-148 Lisboa"
}
```

### 3. Webhook para eventos automáticos

**Edge Function: event-scheduler**

Cron job que:
- Envia lembretes de eventos 1 dia antes
- Marca eventos passados como 'completed'
- Envia notificações de novos eventos na área do voluntário

## Real-time Subscriptions (Opcional)

### 1. Subscrever a novos eventos
```typescript
const subscription = supabase
  .channel('events')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'events'
  }, (payload) => {
    console.log('Novo evento:', payload.new);
  })
  .subscribe();
```

### 2. Subscrever a mudanças em candidaturas
```typescript
const subscription = supabase
  .channel('applications')
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'applications',
    filter: `volunteer_id=eq.${userId}`
  }, (payload) => {
    console.log('Candidatura atualizada:', payload.new);
  })
  .subscribe();
```

## Error Handling

Todos os endpoints devem tratar erros de forma consistente:

```typescript
try {
  const { data, error } = await supabase...;

  if (error) {
    // Tratar erro do Supabase
    console.error('Supabase error:', error);
    throw new Error(error.message);
  }

  return data;
} catch (err) {
  // Tratar erro geral
  console.error('Error:', err);
  throw err;
}
```

## Rate Limiting

Supabase aplica rate limiting automaticamente:
- 100 requests/segundo para queries
- 50 requests/segundo para mutations

Para produção, considerar:
- Implementar caching no frontend
- Usar pagination para listas grandes
- Debounce em search inputs
