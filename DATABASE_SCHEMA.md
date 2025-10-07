# Database Schema - VolunteerHub

Este documento descreve o schema completo da base de dados para a plataforma VolunteerHub usando Supabase/PostgreSQL.

## Tabelas

### 1. users (estende auth.users do Supabase)

Perfil público dos utilizadores.

```sql
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('volunteer', 'organization', 'admin')),
  avatar_url TEXT,
  phone TEXT,
  bio TEXT,
  location TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**RLS Policies:**

- Users podem ler qualquer perfil
- Users podem atualizar apenas o próprio perfil
- Admins podem atualizar qualquer perfil

### 2. events

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
  lat DECIMAL(10, 8),
  lng DECIMAL(11, 8),
  date TIMESTAMPTZ NOT NULL,
  duration TEXT NOT NULL,
  volunteers_needed INTEGER NOT NULL CHECK (volunteers_needed > 0),
  volunteers_registered INTEGER DEFAULT 0 CHECK (volunteers_registered >= 0),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'completed')),
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
- Apenas organizações podem criar eventos
- Apenas a organização dona pode atualizar/deletar o evento
- Admins podem atualizar/deletar qualquer evento

### 3. applications

Candidaturas de voluntários a eventos.

```sql
CREATE TABLE public.applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  volunteer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  message TEXT,
  applied_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, volunteer_id)
);

CREATE INDEX idx_applications_event ON applications(event_id);
CREATE INDEX idx_applications_volunteer ON applications(volunteer_id);
CREATE INDEX idx_applications_status ON applications(status);
```

**RLS Policies:**

- Voluntários podem criar candidaturas
- Voluntários podem ver as próprias candidaturas
- Organizações podem ver candidaturas dos seus eventos
- Organizações podem atualizar status das candidaturas dos seus eventos
- Admins podem ver e atualizar todas as candidaturas

### 4. notifications (Opcional)

Sistema de notificações in-app.

```sql
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('application_approved', 'application_rejected', 'new_event', 'event_reminder', 'event_cancelled')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
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

### 5. reviews (Futura implementação)

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
```

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
  v.location AS event_location,
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
4. **Cascade Deletes**: Usar ON DELETE CASCADE onde apropriado
5. **Auth**: Usar Supabase Auth para gestão de utilizadores
6. **API Keys**: Nunca expor service role key no frontend

## Migrations

Todas as alterações ao schema devem ser feitas através de migrations usando:

- `supabase migration new <migration_name>`
- Aplicar com `supabase db push`

## Backup e Recovery

- Supabase faz backups automáticos diários
- Para backups manuais: usar `supabase db dump`
- Restaurar: usar `supabase db restore`
