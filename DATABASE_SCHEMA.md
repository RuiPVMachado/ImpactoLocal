# Database Schema - ImpactoLocal

Este documento descreve o schema completo da base de dados para a plataforma ImpactoLocal usando Supabase/PostgreSQL.

## Tabelas

### 1. profiles (estende auth.users do Supabase)

Perfil público dos utilizadores.

```sql
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('volunteer', 'organization', 'admin')),
  avatar_url TEXT,
  phone TEXT,
  city TEXT,
  bio TEXT,
  location TEXT,
  mission TEXT,
  vision TEXT,
  history TEXT,
  gallery_urls TEXT[] DEFAULT ARRAY[]::TEXT[],
  stats_events_held INTEGER,
  stats_volunteers_impacted INTEGER,
  stats_hours_contributed INTEGER,
  stats_beneficiaries_served INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**RLS Policies:**

- Users podem ler qualquer perfil
- Users podem atualizar apenas o próprio perfil
- Admins podem atualizar qualquer perfil

### 2. categories

Categorias disponíveis para eventos.

```sql
CREATE TABLE public.categories (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);
```

**RLS Policies:**

- Qualquer pessoa pode ler categorias
- Apenas admins podem criar/atualizar/deletar categorias

### 3. events

Eventos de voluntariado criados por organizações.

```sql
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  image_url TEXT,
  address TEXT NOT NULL,
  lat NUMERIC,
  lng NUMERIC,
  date TIMESTAMPTZ NOT NULL,
  duration TEXT NOT NULL,
  volunteers_needed INTEGER NOT NULL CHECK (volunteers_needed > 0),
  volunteers_registered INTEGER DEFAULT 0 CHECK (volunteers_registered >= 0),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'completed')),
  post_event_summary TEXT,
  post_event_gallery_urls TEXT[] DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_events_organization ON events(organization_id);
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_events_date ON events(date);
CREATE INDEX idx_events_category ON events(category);
```

**RLS Policies:**

- Qualquer pessoa autenticada pode ler eventos
- Qualquer pessoa (incluindo anónimos) pode ler eventos com `status = 'open'`
- Apenas organizações podem criar eventos
- Apenas a organização dona pode atualizar/deletar o evento
- Admins podem atualizar/deletar qualquer evento

```sql
-- Permitir que visitantes não autenticados vejam eventos abertos na página pública
CREATE POLICY "Public read open events"
ON public.events FOR SELECT
USING (status = 'open');
```

### 4. applications

Candidaturas de voluntários a eventos.

```sql
CREATE TABLE public.applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  volunteer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  message TEXT,
  attachment_path TEXT,
  attachment_name TEXT,
  attachment_mime_type TEXT,
  attachment_size_bytes INTEGER,
  applied_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, volunteer_id)
);

CREATE INDEX idx_applications_event ON applications(event_id);
CREATE INDEX idx_applications_volunteer ON applications(volunteer_id);
CREATE INDEX idx_applications_status ON applications(status);
```

Os ficheiros enviados com a candidatura são guardados num bucket de storage dedicado (`application-attachments`). O registo guarda o caminho interno, o nome original, o MIME type e o tamanho em bytes do ficheiro para facilitar a gestão (colunas `attachment_*`).

**RLS Policies:**

- Voluntários podem criar candidaturas
- Voluntários podem ver as próprias candidaturas
- Organizações podem ver candidaturas dos seus eventos
- Organizações podem atualizar status das candidaturas dos seus eventos
- Admins podem ver e atualizar todas as candidaturas

### 5. notifications

Sistema de notificações in-app.

```sql
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('application_approved', 'application_rejected', 'application_updated', 'new_event', 'event_reminder', 'event_cancelled')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  link TEXT,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(read);
```

**RLS Policies:**

- Users podem ler apenas as próprias notificações
- Users podem atualizar apenas as próprias notificações (marcar como lida)

### 6. reviews

Avaliações de voluntários sobre eventos.

```sql
CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  volunteer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, volunteer_id)
);

CREATE INDEX idx_reviews_event ON reviews(event_id);
CREATE INDEX idx_reviews_volunteer ON reviews(volunteer_id);
```

**RLS Policies:**

- Voluntários podem criar reviews apenas para eventos em que participaram
- Qualquer pessoa autenticada pode ler reviews
- Voluntários podem atualizar/deletar apenas as próprias reviews
- Admins podem deletar qualquer review

## Triggers e Functions

### Auto-atualizar updated_at

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_events_updated_at
  BEFORE UPDATE ON events
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_applications_updated_at
  BEFORE UPDATE ON applications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

### Auto-incrementar volunteers_registered

```sql
CREATE OR REPLACE FUNCTION increment_volunteers_registered()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    UPDATE events
    SET volunteers_registered = volunteers_registered + 1
    WHERE id = NEW.event_id;
  ELSIF OLD.status = 'approved' AND NEW.status != 'approved' THEN
    UPDATE events
    SET volunteers_registered = volunteers_registered - 1
    WHERE id = NEW.event_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER applications_status_change
  AFTER UPDATE ON applications
  FOR EACH ROW
  EXECUTE FUNCTION increment_volunteers_registered();
```

### Auto-fechar eventos quando atingem capacidade máxima

```sql
CREATE OR REPLACE FUNCTION check_event_capacity()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.volunteers_registered >= NEW.volunteers_needed THEN
    NEW.status = 'closed';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER event_capacity_check
  BEFORE UPDATE ON events
  FOR EACH ROW
  EXECUTE FUNCTION check_event_capacity();
```

## Views Úteis

### events_with_organization

```sql
CREATE VIEW events_with_organization AS
SELECT
  e.*,
  p.name AS organization_name,
  p.avatar_url AS organization_avatar
FROM events e
JOIN profiles p ON e.organization_id = p.id;
```

### applications_with_details

```sql
CREATE VIEW applications_with_details AS
SELECT
  a.*,
  e.title AS event_title,
  e.date AS event_date,
  e.address AS event_location,
  v.name AS volunteer_name,
  v.email AS volunteer_email,
  v.phone AS volunteer_phone
FROM applications a
JOIN events e ON a.event_id = e.id
JOIN profiles v ON a.volunteer_id = v.id;
```

## Seed Data (Desenvolvimento)

```sql
-- Inserir categorias comuns
INSERT INTO categories (name) VALUES
  ('Ambiente'),
  ('Social'),
  ('Educação'),
  ('Saúde'),
  ('Animais'),
  ('Cultura'),
  ('Desporto'),
  ('Tecnologia');
```

## Considerações de Segurança

1. **Row Level Security (RLS)**: Ativar em todas as tabelas
2. **Validação**: Usar CHECK constraints para validar dados
3. **Indexes**: Criar indexes para queries frequentes
4. **Cascade Deletes**: Usar ON DELETE CASCADE onde apropriado para manter integridade referencial
5. **Auth**: Usar Supabase Auth para gestão de utilizadores
6. **API Keys**: Nunca expor service role key no frontend
7. **Storage**: Configurar políticas de acesso apropriadas no bucket `application-attachments`

## Storage Buckets

### 1. avatars (Public)

Bucket público para armazenar fotos de perfil dos utilizadores.

**Políticas de Acesso:**

- `public_read_avatars` (SELECT, public): Qualquer pessoa pode ler avatars
- `users_manage_avatars` (INSERT/UPDATE/DELETE, authenticated): Utilizadores autenticados podem gerir os próprios avatars

### 2. event-images (Public)

Bucket público para armazenar imagens de eventos.

**Políticas de Acesso:**

- `public_read_event-images` (SELECT, public): Qualquer pessoa pode ler imagens de eventos
- `users_manage_event-images` (INSERT/UPDATE/DELETE, authenticated): Organizações podem gerir imagens dos seus eventos

### 3. application-attachments (Private)

Bucket privado para guardar ficheiros anexados às candidaturas (CVs, cartas de motivação, etc.).

**Políticas de Acesso:**

- `organization_read_event_application_attachment` (SELECT, authenticated): Organizações podem ler attachments das candidaturas dos seus eventos
- `volunteer_delete_application_attachment` (DELETE, authenticated): Voluntários podem apagar os próprios attachments
- `volunteer_insert_application_attachment` (INSERT, authenticated): Voluntários podem fazer upload de attachments ao candidatar-se
- `volunteer_read_application_attachment` (SELECT, authenticated): Voluntários podem ler os próprios attachments

**Estrutura de Paths:**

- `{volunteer_id}/{event_id}/{filename}` - Organização por voluntário e evento

## Migrations

Todas as alterações ao schema devem ser feitas através de migrations usando:

- `supabase migration new <migration_name>`
- Aplicar com `supabase db push`

## Backup e Recovery

- Supabase faz backups automáticos diários
- Para backups manuais: usar `supabase db dump`
- Restaurar: usar `supabase db restore`

## Notas Adicionais

- **UNIQUE Constraints**: As tabelas `applications` e `reviews` têm constraints únicos para prevenir duplicações (um voluntário não pode candidatar-se duas vezes ao mesmo evento nem avaliar o mesmo evento mais de uma vez)
- **Numeric vs Decimal**: Os campos `lat` e `lng` usam tipo `NUMERIC` sem precisão especificada para máxima flexibilidade em coordenadas geográficas
- **Array Types**: `gallery_urls` usa array nativo do PostgreSQL para armazenar múltiplos URLs de imagens
