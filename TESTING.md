# Testes Automatizados

Este documento resume os testes implementados no projeto e o que cada suíte valida. Todos os testes correm com [Vitest](https://vitest.dev/) e utilizam o ambiente JSDOM.

## Como executar

```bash
npm run test
```

- Usa o runner `vitest` com relatórios em linha.
- Recomendado executar `npm run lint` e `npm run typecheck` antes de abrir PRs para garantir consistência.

## Suítes existentes

| Ficheiro                                        | Escopo                      | Cenários principais                                                                                                                                                                                                                                |
| ----------------------------------------------- | --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/test/app.smoke.test.tsx`                   | Fluxo público               | Rendering do `App`, carregamento do Navbar, abertura do menu móvel e navegação até à FAQ usando React Router. Garante que o carregamento inicial e `fetchEvents` acontecem sem regressões.                                                         |
| `src/test/protected-route.test.tsx`             | Regras de routing protegido | Redireccionamentos para `/login`, `/reset-password` e `/` conforme autenticação, estado de reset de password e _roles_ permitidas. Confirma que conteúdo protegido só é exibido a utilizadores autorizados.                                        |
| `src/test/fetch-events-fallback.test.ts`        | API de eventos              | Simula erros RLS no `select` com _join_ e verifica _fallback_ sem junção, mantendo paginação estimada e valores coerentes.                                                                                                                         |
| `src/test/update-profile-normalization.test.ts` | Gestão de perfis            | Normalização de `updateProfile`: _trimming_, lower-case de emails, saneamento de galerias, métricas arredondadas e sincronização de metadados no Auth.                                                                                             |
| `src/test/submit-contact-message.test.ts`       | Formulário de contacto      | Validações de nome/email/mensagem, normalização de payload enviado à função `send-contact-message` e tratamento de respostas de erro tanto do invoke como da função.                                                                               |
| `src/test/fetch-volunteer-statistics.test.ts`   | Estatísticas de voluntário  | Calcula horas, participação e conclusão de eventos a partir de candidaturas mockadas e garante que `processExpiredEvents` é chamado antes das queries. Inclui um _stress test_ com 500 candidaturas aprovadas para validar agregação e desempenho. |

## Stress tests

- **`fetch-volunteer-statistics`**: gera 500 candidaturas aprovadas misturando estados de eventos para assegurar que o cálculo de horas e participação continua determinístico e performante mesmo sob cargas maiores.

## Próximos passos sugeridos

- Adicionar testes de integração para o fluxo completo de candidatura (`applyToEvent` + notificações em `notifyApplicationSubmitted`).
- Cobrir a Edge Function `manage-application` através de testes end-to-end ou _contract tests_ em separado.
- Introduzir `vitest --coverage` no CI para garantir visibilidade contínua sobre áreas críticas do domínio.
