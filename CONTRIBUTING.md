# Contributing Guide - VolunteerHub

Obrigado por considerares contribuir para o VolunteerHub! Este documento fornece guidelines para contribuir para o projeto.

## Código de Conduta

Este projeto segue um código de conduta simples:
- Ser respeitoso e inclusivo
- Aceitar críticas construtivas
- Focar no que é melhor para a comunidade
- Mostrar empatia com outros membros da comunidade

## Como Contribuir

### Reportar Bugs

Antes de criar um issue:
1. Verificar se o bug já foi reportado
2. Incluir informações detalhadas:
   - Descrição clara do problema
   - Passos para reproduzir
   - Comportamento esperado vs atual
   - Screenshots (se aplicável)
   - Ambiente (browser, OS, versão)

Template:

```markdown
**Descrição do Bug**
Descrição clara e concisa do bug.

**Passos para Reproduzir**
1. Ir para '...'
2. Clicar em '...'
3. Scroll down para '...'
4. Ver erro

**Comportamento Esperado**
O que deveria acontecer.

**Screenshots**
Se aplicável, adicionar screenshots.

**Ambiente**
- Browser: [e.g., Chrome 120]
- OS: [e.g., Windows 11]
- Versão: [e.g., 1.0.0]
```

### Sugerir Features

Template:

```markdown
**Descrição da Feature**
Descrição clara da feature sugerida.

**Problema que Resolve**
Que problema esta feature resolve?

**Solução Proposta**
Como imaginas que esta feature funcionaria?

**Alternativas Consideradas**
Outras soluções que consideraste?

**Contexto Adicional**
Screenshots, mockups, exemplos, etc.
```

### Pull Requests

#### Setup Local

```bash
# Fork o repositório
git clone https://github.com/your-username/volunteerhub.git
cd volunteerhub

# Instalar dependências
npm install

# Criar branch
git checkout -b feature/nome-da-feature

# Configurar .env
cp .env.example .env
# Preencher com tuas credenciais Supabase
```

#### Workflow

1. **Criar Issue** (opcional mas recomendado)
   - Descrever o que vais fazer
   - Esperar feedback antes de começar

2. **Criar Branch**
   ```bash
   git checkout -b type/description
   ```

   Tipos:
   - `feature/` - nova funcionalidade
   - `fix/` - correção de bug
   - `docs/` - documentação
   - `refactor/` - refactoring
   - `test/` - testes
   - `chore/` - manutenção

3. **Fazer Alterações**
   - Seguir style guide
   - Escrever código limpo e documentado
   - Adicionar testes se aplicável

4. **Commit**
   ```bash
   git add .
   git commit -m "type: description"
   ```

   Formato de commit:
   ```
   type: short description

   Longer description if needed

   Fixes #123
   ```

   Tipos:
   - `feat:` - nova feature
   - `fix:` - bug fix
   - `docs:` - documentação
   - `style:` - formatação
   - `refactor:` - refactoring
   - `test:` - testes
   - `chore:` - manutenção

5. **Push**
   ```bash
   git push origin feature/nome-da-feature
   ```

6. **Criar Pull Request**
   - Título claro e descritivo
   - Descrição detalhada das alterações
   - Referenciar issues relacionados
   - Adicionar screenshots/videos se aplicável

#### PR Template

```markdown
## Descrição
Descrição clara das alterações.

## Tipo de Alteração
- [ ] Bug fix
- [ ] Nova feature
- [ ] Breaking change
- [ ] Documentação

## Como Testar
1. Passo 1
2. Passo 2
3. Verificar que...

## Checklist
- [ ] Código segue o style guide
- [ ] Comentários foram adicionados onde necessário
- [ ] Documentação foi atualizada
- [ ] Testes passam localmente
- [ ] Build passa sem erros
- [ ] Sem warnings de lint

## Screenshots
Se aplicável.

## Issues Relacionados
Fixes #123
```

## Style Guide

### TypeScript/React

#### Naming Conventions

```typescript
// Componentes: PascalCase
export default function EventCard() {}

// Funções: camelCase
const handleSubmit = () => {}

// Constantes: UPPER_SNAKE_CASE
const MAX_VOLUNTEERS = 100;

// Types/Interfaces: PascalCase
interface Event {}
type UserType = 'volunteer' | 'organization';

// Ficheiros:
// - Componentes: PascalCase (EventCard.tsx)
// - Utils: camelCase (formatDate.ts)
// - Types: camelCase (index.ts)
```

#### Code Organization

```typescript
// 1. Imports
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

// 2. Types/Interfaces
interface Props {
  title: string;
}

// 3. Component
export default function Component({ title }: Props) {
  // 3.1 Hooks
  const navigate = useNavigate();
  const [state, setState] = useState('');

  // 3.2 Handlers
  const handleClick = () => {};

  // 3.3 Effects
  useEffect(() => {}, []);

  // 3.4 Render
  return <div>{title}</div>;
}
```

#### Comments

```typescript
// Usar comentários apenas quando necessário
// Código deve ser self-documenting

// ✅ BOM
const isVolunteer = user.type === 'volunteer';

// ❌ MAU
// Check if user is volunteer
const check = user.type === 'volunteer';

// Comentários úteis:
// TODO: implementar validação
// FIXME: bug quando X acontece
// NOTE: este código é temporário
```

### CSS/Tailwind

```tsx
// ✅ BOM - usar Tailwind classes
<div className="flex items-center justify-between p-4 bg-white rounded-lg shadow-md">

// ❌ MAU - inline styles
<div style={{ display: 'flex', padding: '16px' }}>

// Classes longas: quebrar em múltiplas linhas
<div
  className="
    flex items-center justify-between
    p-4 bg-white rounded-lg shadow-md
    hover:shadow-xl transition-shadow
  "
>
```

### File Structure

```
src/
├── components/       # Componentes reutilizáveis
│   ├── EventCard.tsx
│   └── Navbar.tsx
├── pages/           # Páginas/rotas
│   ├── Home.tsx
│   └── Events.tsx
├── context/         # React Context
│   └── AuthContext.tsx
├── lib/             # Utilities, helpers
│   ├── supabase.ts
│   └── utils.ts
├── types/           # TypeScript types
│   └── index.ts
├── hooks/           # Custom hooks
│   └── useAuth.ts
└── constants/       # Constantes
    └── index.ts
```

## Testing

### Testes Unitários (Futuro)

```typescript
import { render, screen } from '@testing-library/react';
import EventCard from './EventCard';

describe('EventCard', () => {
  it('renders event title', () => {
    const event = { title: 'Test Event', ... };
    render(<EventCard event={event} />);
    expect(screen.getByText('Test Event')).toBeInTheDocument();
  });
});
```

### Testes E2E (Futuro)

```typescript
// Usando Playwright
test('user can apply to event', async ({ page }) => {
  await page.goto('/events');
  await page.click('text=Ver Detalhes');
  await page.click('text=Candidatar');
  await expect(page.locator('text=Candidatura enviada')).toBeVisible();
});
```

## Database Migrations

### Criar Migration

```bash
# Criar nova migration
supabase migration new nome_da_migration
```

### Format

```sql
/*
  # Migration Title

  1. Changes
    - Descrição das alterações

  2. Security
    - RLS policies
*/

-- SQL code here
```

### Regras

1. **NUNCA** fazer DROP sem backup
2. **SEMPRE** usar IF EXISTS/IF NOT EXISTS
3. **SEMPRE** adicionar RLS policies
4. **TESTAR** em ambiente de desenvolvimento primeiro
5. **DOCUMENTAR** no comentário inicial

## Code Review

### Como Revisor

- Ser construtivo e respeitoso
- Testar as alterações localmente
- Verificar:
  - [ ] Código segue style guide
  - [ ] Sem bugs óbvios
  - [ ] Performance aceitável
  - [ ] Security best practices
  - [ ] Documentação adequada

### Como Autor

- Responder a todos os comentários
- Não levar críticas pessoalmente
- Fazer alterações solicitadas
- Agradecer feedback

## Recursos

### Documentação

- [React](https://react.dev)
- [TypeScript](https://www.typescriptlang.org/docs)
- [Supabase](https://supabase.com/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [React Router](https://reactrouter.com)

### Tools

- [VS Code](https://code.visualstudio.com) - Editor recomendado
- [ESLint](https://eslint.org) - Linting
- [Prettier](https://prettier.io) - Formatação
- [GitHub Desktop](https://desktop.github.com) - Git GUI

### Extensions VS Code

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "dsznajder.es7-react-js-snippets"
  ]
}
```

## Perguntas?

- Criar issue com label `question`
- Contactar via email: support@volunteerhub.pt
- Ou Discord: [link]

## Licença

Ao contribuir, concordas que as tuas contribuições serão licenciadas sob a mesma licença do projeto.
