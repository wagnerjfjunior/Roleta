# F2-12 — Diagnóstico seguro de conexão PostgreSQL

Data: 2026-10-11; PR #80. Sem regressão à Roleta Simples, seu JPG/WhatsApp, impressão ou histórico.

## Estado da implantação
- A variável `ROLETA_V2_DATABASE_URL` consta no Vercel como **Sensitive / Production**; valor não foi descriptografado ou mostrado.
- `ROLETA_V2_WRITES_ENABLED=false` consta em **Production**; gravação prospectiva permanece desativada.
- O serviço privado `roleta_audit`, função V2 e a conta `roleta_v2_writer` estão instalados no Supabase compartilhado, com permissões restritas.
- Conexão real Vercel→Supabase ainda não foi observada. Não confundir presença de variável com êxito de autenticação.
- Senha anteriormente apareceu em captura de tela. Prosseguir ao teste real somente com confirmação de rotação e URL atualizada.

## Novo endpoint
`POST /api/prospective-v2-health` executa apenas consultas read-only para verificar `current_user`, EXECUTE na função V2 e falta de SELECT/INSERT direto na tabela. Ele exige cookie de sessão Google válido, origem permitida e CSRF `x-roleta-csrf`; não retorna DSN, credenciais, SQL ou informações da sessão.

Retornos:
- 200 `CONNECTED_RESTRICTED`: ligação funcionando com a conta correta e privilégios mínimos.
- 401 `LOGIN_REQUIRED`.
- 403 `ORIGIN_REJECTED` ou `CSRF_REJECTED`.
- 503 `DATABASE_CONNECTION_UNAVAILABLE` ou `DATABASE_PERMISSIONS_REJECTED`.

Este endpoint só ficará disponível após promoção autorizada da PR para a aplicação; o projeto usa `main` para produção e previews de branch estão desabilitados. **Nunca habilitar `ROLETA_V2_WRITES_ENABLED` para usar o diagnóstico.**

## Teste humano pós-deploy
1. Entrar com Google na Roleta e obter CSRF pelo endpoint de sessão existente (sem copiar o token em chats/logs).
2. Efetuar `POST` same-origin a `/api/prospective-v2-health` com header privado `x-roleta-csrf`; confirmar resposta 200 e status `CONNECTED_RESTRICTED`.
3. Confirmar `ROLETA_V2_WRITES_ENABLED=false` e contagem imutável da tabela prospectiva.
4. Só depois, configurar ACL por Google sub oficial → canonical person id; registrar canary prospectivo com evento verdadeiramente futuro, dentro do cutoff, sem alterar dados históricos.

## Gatilho de rollback
Qualquer resposta 503, identidade incorreta, privilégio direto de tabela, problema de TLS ou senha exposta: não ativar Gate B. Rollback da PR/deployment é independente dos backups já homologados.
