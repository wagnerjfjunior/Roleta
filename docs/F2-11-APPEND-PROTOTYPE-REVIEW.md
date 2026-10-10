# F2-11 — Revisão de concorrência do append SQL (somente protótipo)

O arquivo `database/review-only/20261010_append_prospective_evidence_prototype.sql` é **protótipo, não migração aprovada**.

## Implementado no protótipo
- Lock transacional por cadeia via `pg_advisory_xact_lock`.
- Reenvio da mesma chave idempotente retorna o registro anterior; conteúdo divergente rejeitado.
- Predição após outcome e outcome sem predição rejeitados.
- Constraints adicionais da tabela candidata tratam duplicidade de previsão e resultado.
- Horário do banco e hash encadeado com o registro anterior.

## Bloqueios de segurança ainda abertos
1. **Autorização:** a função é `SECURITY INVOKER`, sem `GRANT` de EXECUTE. Ainda não há papel de execução dedicado nem mecanismo comprovado para garantir identidade do ator. Não ativar.
2. **Hash:** `payload::text` e `v_ts::text` não implementam o contrato canônico JS de forma comprovada. Precisa de especificação única de bytes, vetores de teste e validação cruzada.
3. **Integridade temporal:** o banco não sabe sozinho se o sorteio real ocorreu antes da predição. Exige fechamento por fonte verificável e processo operacional.
4. **Validação:** falta garantir igualdade de `request_sha256` com os campos recebidos, limites de payload, identificadores e schema JSON. A função pode ser enganada se usada como está.
5. **Extensão:** dependência de `extensions.digest` exige verificação de instalação e privilégios; não alterar extensões do Discador sem aprovação.
6. **Idempotência:** reenvio idêntico após outcome precisa de política formal e testes de segurança.
7. **Carga:** não executar testes concorrentes no Discador; homologar em Postgres isolado.
8. **Rollback:** nenhuma exclusão automática; manter evidências e desligar somente a entrada da Roleta.

## Critério de promoção
Antes de qualquer migração: resolver bloqueios, testes concorrentes e adversariais em Postgres descartável, revisão de DBA e aprovação explícita. O código em review-only não deve ser usado como endpoint de produção.
