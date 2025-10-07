# Features Documentation - VolunteerHub

Este documento descreve todas as features da plataforma VolunteerHub, incluindo features implementadas e futuras.

## Features Implementadas (Frontend/Wireframe)

### 1. Autenticação

#### Registo de Utilizadores
- **Voluntários**: podem criar conta para se candidatar a eventos
- **Organizações**: podem criar conta para publicar eventos
- Formulário com validação de email e password
- Escolha de tipo de utilizador no registo

**Status**: Wireframe (mock data)
**Ficheiros**: `src/pages/Register.tsx`, `src/context/AuthContext.tsx`

#### Login
- Login com email e password
- Validação de credenciais
- Sessão persistente

**Status**: Wireframe (mock data)
**Ficheiros**: `src/pages/Login.tsx`

### 2. Eventos

#### Listagem de Eventos
- Grid de eventos disponíveis
- Informações visíveis:
  - Título e descrição
  - Organização responsável
  - Localização
  - Data e duração
  - Número de voluntários necessários/registados
  - Categoria
  - Status (aberto/fechado/concluído)

**Status**: Wireframe
**Ficheiros**: `src/pages/Events.tsx`, `src/components/EventCard.tsx`

#### Filtros e Pesquisa
- Pesquisa por texto (título/descrição)
- Filtro por categoria
- Botão para ver mapa (placeholder)

**Status**: Parcialmente implementado
**Ficheiros**: `src/pages/Events.tsx`

#### Detalhes do Evento
- Página dedicada com informações completas
- Mapa de localização (placeholder)
- Informações da organização
- Botão de candidatura
- Descrição detalhada

**Status**: Wireframe
**Ficheiros**: `src/pages/EventDetails.tsx`

#### Candidatura a Eventos
- Botão "Candidatar" apenas em detalhes
- "Ver Detalhes" na listagem de eventos
- Confirmação de candidatura

**Status**: Wireframe (mock data)
**Ficheiros**: `src/pages/EventDetails.tsx`

### 3. Voluntários

#### Perfil do Voluntário
- Informações pessoais
- Foto de perfil
- Bio
- Contacto
- Histórico de eventos

**Status**: Wireframe
**Ficheiros**: `src/pages/Profile.tsx`

#### Minhas Candidaturas
- Lista de eventos candidatados
- Status de cada candidatura (pendente/aprovado/rejeitado)
- Detalhes dos eventos
- Possibilidade de cancelar candidatura

**Status**: Wireframe
**Ficheiros**: `src/pages/MyApplications.tsx`

### 4. Organizações

#### Dashboard da Organização
- Estatísticas rápidas:
  - Total de eventos
  - Eventos ativos
  - Total de voluntários
  - Candidaturas pendentes
- Lista de candidaturas pendentes
- Ações rápidas

**Status**: Wireframe
**Ficheiros**: `src/pages/OrganizationDashboard.tsx`

#### Criar Evento
- Formulário completo:
  - Título e descrição
  - Categoria
  - Localização (com mapa placeholder)
  - Data e duração
  - Número de voluntários necessários
  - Upload de imagem
- Validação de campos

**Status**: Wireframe
**Ficheiros**: `src/pages/CreateEvent.tsx`

#### Gerir Eventos
- Lista de todos os eventos da organização
- Filtros por status
- Editar/Deletar eventos
- Ver candidaturas por evento
- Aprovar/Rejeitar voluntários

**Status**: Wireframe
**Ficheiros**: `src/pages/OrganizationEvents.tsx`

### 5. Admin Panel

#### Gestão de Utilizadores
- Lista de todos os utilizadores
- Filtros por tipo
- Ver detalhes
- Banir/Desbanir utilizadores
- Alterar roles

**Status**: Wireframe
**Ficheiros**: `src/pages/AdminPanel.tsx`

#### Estatísticas Gerais
- Total de utilizadores
- Total de eventos
- Total de candidaturas
- Métricas de crescimento

**Status**: Wireframe
**Ficheiros**: `src/pages/AdminPanel.tsx`

### 6. Interface Geral

#### Navbar
- Logo e navegação
- Links contextuais baseados em tipo de utilizador
- Botão de login/logout
- Menu mobile responsivo

**Status**: Implementado
**Ficheiros**: `src/components/Navbar.tsx`

#### Footer
- Links úteis
- Redes sociais
- Informações de contacto

**Status**: Implementado
**Ficheiros**: `src/components/Footer.tsx`

#### Homepage
- Hero section
- Features destacadas
- Eventos em destaque
- Call-to-actions
- Testemunhos

**Status**: Implementado
**Ficheiros**: `src/pages/Home.tsx`

#### Sobre Nós
- Informações sobre o projeto
- Missão e visão
- Equipa

**Status**: Implementado
**Ficheiros**: `src/pages/SobreNos.tsx`

## Features por Implementar (Backend)

### 1. Autenticação Real

#### Supabase Auth Integration
- [ ] Implementar signUp real
- [ ] Implementar signIn real
- [ ] Implementar signOut real
- [ ] Session management
- [ ] Protected routes funcionais
- [ ] Email verification (opcional)

**Prioridade**: Alta
**Complexidade**: Média
**Ficheiros**: `src/context/AuthContext.tsx`, `src/lib/supabase.ts`

#### Password Reset
- [ ] Formulário de reset
- [ ] Email de reset
- [ ] Página de nova password

**Prioridade**: Média
**Complexidade**: Baixa

### 2. CRUD de Eventos

#### Listar Eventos
- [ ] Query Supabase para eventos
- [ ] Filtros funcionais
- [ ] Pesquisa funcional
- [ ] Pagination
- [ ] Ordenação

**Prioridade**: Alta
**Complexidade**: Média

#### Criar Evento
- [ ] Insert no Supabase
- [ ] Upload de imagens
- [ ] Geocoding de moradas
- [ ] Validação backend

**Prioridade**: Alta
**Complexidade**: Média

#### Editar/Deletar Evento
- [ ] Update no Supabase
- [ ] Delete com confirmação
- [ ] Validação de permissões

**Prioridade**: Média
**Complexidade**: Baixa

### 3. Sistema de Candidaturas

#### Candidatar-se
- [ ] Insert application
- [ ] Verificar duplicados
- [ ] Notificar organização

**Prioridade**: Alta
**Complexidade**: Baixa

#### Gerir Candidaturas
- [ ] Aprovar/Rejeitar
- [ ] Atualizar contador de voluntários
- [ ] Notificar voluntário
- [ ] Fechar evento quando cheio

**Prioridade**: Alta
**Complexidade**: Média

### 4. Sistema de Notificações

#### Email Notifications
- [ ] Welcome email
- [ ] Application received
- [ ] Application approved/rejected
- [ ] Event reminder
- [ ] New events in area

**Prioridade**: Média
**Complexidade**: Média

#### In-App Notifications
- [ ] Notificações em tempo real
- [ ] Badge de não lidas
- [ ] Marcar como lida
- [ ] Centro de notificações

**Prioridade**: Baixa
**Complexidade**: Alta

### 5. Google Maps Integration

#### Mapa de Eventos
- [ ] Mostrar eventos no mapa
- [ ] Filtrar por área
- [ ] Clusters de eventos próximos
- [ ] Detalhes ao clicar

**Prioridade**: Alta
**Complexidade**: Alta

#### Geocoding
- [ ] Converter moradas em coordenadas
- [ ] Validar moradas
- [ ] Autocomplete de moradas

**Prioridade**: Alta
**Complexidade**: Média

#### Localização do Utilizador
- [ ] Pedir permissão de localização
- [ ] Mostrar eventos próximos
- [ ] Filtrar por distância

**Prioridade**: Média
**Complexidade**: Média

## Features Futuras (Enhancement)

### 1. Sistema de Reviews

#### Reviews de Eventos
- [ ] Voluntários podem avaliar eventos
- [ ] Rating de 1-5 estrelas
- [ ] Comentários opcionais
- [ ] Apenas após evento concluído

**Prioridade**: Baixa
**Complexidade**: Média

#### Reviews de Voluntários
- [ ] Organizações podem avaliar voluntários
- [ ] Sistema de badges/conquistas
- [ ] Perfil público de voluntário

**Prioridade**: Baixa
**Complexidade**: Alta

### 2. Gamification

#### Sistema de Pontos
- [ ] Pontos por evento completo
- [ ] Níveis de voluntário
- [ ] Leaderboard
- [ ] Badges especiais

**Prioridade**: Baixa
**Complexidade**: Alta

#### Conquistas
- [ ] Primeira candidatura
- [ ] 10 eventos completados
- [ ] 100 horas de voluntariado
- [ ] Eventos especiais

**Prioridade**: Baixa
**Complexidade**: Média

### 3. Social Features

#### Seguir Organizações
- [ ] Seguir organizações favoritas
- [ ] Notificações de novos eventos
- [ ] Feed personalizado

**Prioridade**: Baixa
**Complexidade**: Média

#### Partilhar Eventos
- [ ] Partilhar no Facebook/Twitter/WhatsApp
- [ ] Convite por email
- [ ] Link de referral

**Prioridade**: Baixa
**Complexidade**: Baixa

#### Criar Equipas
- [ ] Voluntários criam equipas
- [ ] Candidatura em grupo
- [ ] Chat de equipa

**Prioridade**: Baixa
**Complexidade**: Alta

### 4. Calendário

#### Calendário Pessoal
- [ ] Vista de calendário
- [ ] Eventos candidatados
- [ ] Sincronização com Google Calendar
- [ ] Lembretes

**Prioridade**: Média
**Complexidade**: Alta

### 5. Analytics

#### Dashboard de Estatísticas
- [ ] Horas de voluntariado
- [ ] Impacto por categoria
- [ ] Gráficos e charts
- [ ] Exportar relatórios

**Prioridade**: Baixa
**Complexidade**: Alta

#### Certificados
- [ ] Certificado de participação
- [ ] PDF downloadable
- [ ] Validação por QR code

**Prioridade**: Média
**Complexidade**: Média

### 6. Mobile App

#### React Native App
- [ ] Port do código existente
- [ ] Push notifications
- [ ] Offline mode
- [ ] Localização em tempo real

**Prioridade**: Baixa
**Complexidade**: Muito Alta

### 7. Multi-language

#### Internacionalização
- [ ] Português (PT)
- [ ] Inglês (EN)
- [ ] Espanhol (ES)
- [ ] Sistema de tradução

**Prioridade**: Baixa
**Complexidade**: Média

## Roadmap

### Phase 1: MVP (Current)
- ✅ Frontend wireframe
- ✅ Design system
- ✅ Todas as páginas principais

### Phase 2: Backend Integration
- [ ] Supabase setup
- [ ] Autenticação real
- [ ] CRUD eventos
- [ ] Sistema de candidaturas

**ETA**: 2-3 semanas

### Phase 3: Core Features
- [ ] Google Maps
- [ ] Email notifications
- [ ] Upload de imagens
- [ ] Perfis completos

**ETA**: 2-3 semanas

### Phase 4: Polish
- [ ] Testes
- [ ] Performance optimization
- [ ] SEO
- [ ] Deploy

**ETA**: 1-2 semanas

### Phase 5: Enhancement
- [ ] Reviews
- [ ] Gamification
- [ ] Social features
- [ ] Analytics

**ETA**: 4-6 semanas

## Métricas de Sucesso

### KPIs
- Número de utilizadores registados
- Número de eventos criados
- Taxa de candidaturas por evento
- Taxa de aprovação de candidaturas
- Tempo médio até primeira candidatura
- Retenção de utilizadores
- NPS (Net Promoter Score)

### Goals (Primeiro Ano)
- 1000+ voluntários registados
- 100+ organizações ativas
- 500+ eventos realizados
- 5000+ horas de voluntariado
