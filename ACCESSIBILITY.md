# Accessibility Toolkit

Esta plataforma inclui controlos básicos de acessibilidade focados em preferências visuais (cores, contrastes e tipografia) e em legendas/descrições multimédia.

## Centro de Acessibilidade

- Botão fixo "Acessibilidade" (canto inferior direito) abre o painel com todos os controlos.
- Preferências guardadas em `localStorage` e aplicadas ao `documentElement` via _data attributes_ (`data-color-mode`, `data-color-palette`, `data-font-style`).
- Alterações importantes são anunciadas no `aria-live` global (`accessibility-live-region`).

### Modos Visuais

| Controlo                         | Opções                                                                                                                  |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| **Modo de cor**                  | Automático (respeita OS), Claro, Escuro, Alto contraste                                                                 |
| **Paletas amigas do daltonismo** | Original, Protanopia (azul/laranja), Deuteranopia (violeta/dourado), Tritanopia (coral/verde), Mono (alta legibilidade) |
| **Tema tipográfico**             | Inter (default) ou Atkinson Hyperlegible                                                                                |
| **Tamanho do texto**             | 85% – 145%                                                                                                              |
| **Espaçamentos**                 | Linhas (1x-2x), Letras (0-0.25em), Parágrafos (0.5-2rem)                                                                |

### Multimédia

- **Descrições de áudio / legendas**: O painel disponibiliza dois _toggles_. Quando ativados, o componente `MediaDescription` exibe texto descritivo dos elementos visuais (e liga a locução via `speechSynthesis`) e as páginas preferem conteúdos legendados quando existirem.

## Estrutura e Navegação

- Nova _skip link_ `Saltar para o conteúdo principal`.
- `<main id="principal">` possui `role="main"` e `tabIndex=-1` para receber foco após a _skip link_.
- Live region global (`LiveAnnouncements`) anuncia cada alteração do painel.

## Form Assist Tools

- O formulário de login tem instruções adicionais, `aria-describedby` e sumário de erros com `role="alert"` para garantir feedback textual claro.
- O padrão pode ser replicado noutros formulários reutilizando o mesmo formato (`instructionsId` + `errorId`).

## Implementação Técnica

- Contexto `AccessibilityContext` guarda as preferências e aplica CSS custom properties.
- `tailwind.config.js` usa `withOpacityValue('--brand-*-rgb')`, permitindo alterar cores dinamicamente.
- `index.css` centraliza variáveis de cor/tipografia e personaliza _focus outlines_.
- Componentes atuais em `src/components/accessibility/`:
  - `AccessibilityPanel`
  - `LiveAnnouncements`
  - `MediaDescription`

Consulte este documento sempre que for necessário adicionar novos componentes sensíveis a preferências de acessibilidade.
