# SFJM — Roleta Simples, Sorteador e Sorteador Seguro (13/10/2026)

> **Status canônico deste recorte:** factual até a consulta de GitHub/Vercel em 13/10/2026. Este documento complementa, não substitui, os protocolos estatísticos, de folha final/Supabase e de OCR. **Nenhuma migração ou ativação do Sorteador Seguro foi homologada.**

## 1. Fontes e autoridade
- Repositório: `wagnerjfjunior/Roleta`; produção: branch `main`.
- Ordem SFJM: `bootstrap/BOOTSTRAP_CANONICO.md` → `handoffs/CURRENT.md` → `docs/PROJECT_STATUS.md` → `docs/NEXT_SAFE_ACTION.md` → documento específico.
- Desenvolvimento: **LOCAL-FIRST**, **SFJM/LVR Live Sync** em `http://localhost:8082`, **NO PREVIEW / NO REMOTE ITERATION**. Não presumir que Vercel Preview seja ambiente de testes. Merge e publicação só com aprovação expressa.
- A documentação histórica contém estados anteriores; não interpretá-los como estado ativo sem verificar `main`.

## 2. Entregas em produção e evidência
| PR | Escopo | Estado em 13/10 |
|---|---|---|
| [#103](https://github.com/wagnerjfjunior/Roleta/pull/103) | Roleta Simples `/simples/`: fluxo de captura/OCR, conferência e JPEG | Merged, na `main` |
| [#104](https://github.com/wagnerjfjunior/Roleta/pull/104) | Sorteador local `/sorteador/`: modo contagem ou intervalo inclusivo, sorteio sem repetição, aleatoriedade criptográfica do navegador, histórico local, animação | Merged, na `main` |
| [#105](https://github.com/wagnerjfjunior/Roleta/pull/105) | Acessos no menu do Intelligence V3 a Simples e Sorteador | Merged, na `main` |
| [#106](https://github.com/wagnerjfjunior/Roleta/pull/106) | Finalização visual e sonora e navegação de volta ao menu | Merged, na `main` |
| [#107](https://github.com/wagnerjfjunior/Roleta/pull/107) | **Candidato** Sorteador Seguro V1 com Vercel Function, PostgreSQL/Neon, recibos Ed25519 | **Draft, não merged, não publicado** |

- Último deployment de produção **READY** verificado para o sorteador local: commit `470993d1bd29d44b7a6b25db7c1398b799179c13` (PR #106).
- No sorteador local, finalização apresenta `SORTEIO FINALIZADO!`, sequência completa e botão de retorno; áudio depende de som habilitado e teste no dispositivo. **READY não substitui validação humana no dispositivo.**
- **Distinção essencial:** sorteador local em produção não equivale a sorteador oficial imutável/auditável. `crypto.getRandomValues` permite sorteio sem viés algorítmico esperado, mas o cliente/localStorage não são prova independente contra manipulação.
- A **Roleta Simples** e o **Sorteador** são aplicações publicadas; não reconstruir nem confundir com a PR #107.
- O fluxo **folha final conferida → Supabase** existente permanece em domínio separado e conserva as decisões de `docs/sfjm/OPERATOR_VALIDATED_OCR_SUPABASE_FLOW_2026-10-12.md`. Não migrar esse fluxo para o Neon.

## 3. Login Google já existente — reutilização obrigatória
- Implementação de produção: `auth/google.js`; endpoint `api/auth/session.js`; aplicação de autorização existente: `api/final-roulette.js`.
- Sessão assinada, cookie `rlt_session` com `HttpOnly; Secure; SameSite=Lax`; proteção CSRF e origem no backend; lista de e-mails autorizados e sujeito estável `sub`.
- **Decisão operacional:** não criar segundo login, senha, token manual ou novo OAuth para Sorteador Seguro. Primeira tela deve utilizar/consultar sessão Google existente. A API deve validar a sessão e autorização específica de operação. Identidade vinda do servidor, não do JSON do navegador.
- As contas aptas ao Sorteador Seguro e seu escopo precisam ser explicitamente confirmados; não inferir que toda pessoa logada está autorizada a sortear.

## 4. Neon/Vercel — infraestrutura conectada, banco NÃO homologado
- Neon Marketplace conectado ao projeto Vercel `roleta`, plano **Free**, integração `neon` disponível, variáveis **Sensitive** no target **Production**.
- Os nomes de variáveis criadas contêm prefixo `SORTEADOR_DATABASE_`; conexão gerada: `SORTEADOR_DATABASE_DATABASE_URL`. O código da PR #107 foi alinhado a esse nome apenas na branch da PR; isso **não habilita API**.
- A presença de env no target Production não implica merge de código, aplicação de SQL, validação de segurança ou endpoint ativo.
- **NÃO** usar Supabase para o novo Sorteador Seguro; **NÃO** alterar as integrações Supabase preexistentes.
- Nenhuma execução da migração `db/secure-draw-neon.sql` no banco real foi confirmada; não declarar tabelas criadas.
- Credenciais não devem ser copiadas para chat, repositório ou navegador. Configuração local requer mecanismo seguro e explicitamente validado.

## 5. Bloqueios de segurança — PR #107 NÃO PODE SER MERGEADA
O código de candidato `api/secure-draw.js` ainda exige Bearer/manual operator key. **Substituir**, não simplesmente acrescentar botão Google. O SQL atual cria tabelas, mas deixa RLS/roles/grants como orientação não aplicada. CI aprovada não é auditoria de segurança.

**Gates obrigatórios antes de novo pedido de merge:**
1. Contrato de segurança e modelo de ameaças explícitos: operadores, escopo, replay, abuso, manipulação, rollback, recuperação, prova de origem, acesso indevido.
2. Reutilização do Google SSO existente: sessão verificada no servidor, allowlist/ACL específica, `sub` validado, CSRF e origem em ações de escrita, política de sessão e erros fechados; remover UI/chave manual.
3. Neon: roles separadas para migração e runtime; mínimos GRANTs e revogações; RLS `ENABLE/FORCE`, policies verificadas para sessões/eventos; transações com identidade por requisição segura (`SET LOCAL` ou mecanismo equivalente testado), evitar vazamento entre conexões do pool; impedir `UPDATE`/`DELETE` pela role runtime.
4. TLS com validação de certificado, gestão/rotação de segredos e controle de acesso; jamais expor connection string e signing key ao cliente.
5. Rate limiting, limites de entrada, tratamento de CSRF/CORS, erros genéricos e logs seguros.
6. Testes negativos e E2E com Neon: usuário A ≠ B; anônimo, cookie adulterado/expirado, CSRF inválido, role runtime sem DDL/UPDATE/DELETE/bypass, concorrência, idempotência, falha de rede, cadeia/hash/assinatura, rollback e reconexão. Verificação independente do recibo desejável.
7. Homologação funcional e UX pelo operador no Live Sync; aprovação explícita para migração e **outra** para ativação/merge/produção.

**Limites honestos:** assinaturas e cadeia detectam adulteração de registros existentes, mas não garantem sozinhas que administrador com controle do banco não apague evidências; ancoragem externa/estratégia de retenção são requisitos adicionais se for exigida prova forte contra exclusão. Backups avançados e SLA foram adiados, portanto não reivindicar alta disponibilidade contratual.

## 6. Decisão de escopo e próxima ação segura
- Em 13/10 o responsável preferiu **não prosseguir com implementação extensa**. Respeitar essa pausa. Não executar banco, segredos ou endpoint sem novo pedido e gates.
- O trabalho documental desta revisão pode seguir isolado, sem mudanças executáveis, pela branch de documentação e PR Draft.
- Próxima ação para novo desenvolvimento, **somente quando solicitado**: auditar o contrato de autenticação/ACL Google existente e modelar RLS e segurança da conexão de forma revisável; testar localmente; parar para autorização antes de DDL real.
- Próxima ação operacional para o Sorteador já em produção: usuário pode validar no próprio dispositivo a animação, resultado final e som; não reinterpretar isso como homologação criptográfica do Sorteador Seguro.

## 7. Não regressão / isolamento
- Não alterar `main`, Supabase, OCR/Make, app Intelligence V3, ledger estatístico, WEEKLY_FROZEN ou modelos por causa do novo Neon.
- **Sorteador local** permanece na `main`; **Sorteador Seguro V1** permanece PR #107 Draft.
- Não confundir presença de Google Login já implementado com autorização para todos os corretores; não copiar a autenticação como sistema separado.
- Não declarar implantação, RLS ativo, role restrita ou testes Neon aprovados até evidência direta.

## Referências
- [PR #103](https://github.com/wagnerjfjunior/Roleta/pull/103), [#104](https://github.com/wagnerjfjunior/Roleta/pull/104), [#105](https://github.com/wagnerjfjunior/Roleta/pull/105), [#106](https://github.com/wagnerjfjunior/Roleta/pull/106), [#107](https://github.com/wagnerjfjunior/Roleta/pull/107).
- `docs/secure-draw-v1.md` **somente na branch da PR #107**: documentação técnica candidata, não autoridade de deploy.
- `docs/sfjm/FINAL_ROULETTE_PRODUCTION_RELEASE_2026-10-12.md`: produção de folha final Supabase, sistema distinto.
