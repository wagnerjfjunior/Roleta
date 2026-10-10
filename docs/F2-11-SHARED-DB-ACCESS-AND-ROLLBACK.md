# F2-11 — Matriz de acesso e rollback (proposta; não executado)

## Premissa de isolamento
Supabase compartilhado: `Discador-MesaCliente`. Não reutilizar credenciais do Discador nem confiar em isolamento físico inexistente. O schema `roleta_audit` deve permanecer **fora da lista de schemas expostos pelo PostgREST**. O SQL em `database/review-only/` é um **rascunho não executável operacionalmente**: ainda não possui função transacional de append, serialização, relógio confiável para hashing nem autorização de migração.

## Matriz de permissões-alvo
| Principal | USAGE schema | SELECT | INSERT | UPDATE/DELETE | EXECUTE append |
|---|---|---|---|---|---|
| anon | Não | Não | Não | Não | Não |
| authenticated | Não | Não | Não | Não | Não |
| Discador app role | Não | Não | Não | Não | Não |
| Roleta runtime role dedicada | Sim, somente via função revisada | Por função de consulta controlada | Não diretamente | Não | Sim |
| DBA/migration owner | Sim | Sim | Somente manutenção controlada | Excepcional, auditado | Sim |
| service_role Supabase | Superprivilegios possíveis | Não considerar isolado | Não considerar isolado | Não considerar isolado | Não considerar isolado |

**Atenção:** credenciais `postgres` / service_role do projeto compartilhado podem transpor isolamento lógico. Necessário verificar capacidade de provisionar papel dedicado e acesso privado seguro a partir de Vercel.

## Invariantes de implementação antes de qualquer migração
1. A função de append recebe intenção tipada e sessão validada pela API Google da Roleta; rejeita ator vazio e origem/CSRF incorretos.
2. O banco define `received_at` e hash da evidência; `captured_at` não vem do cliente.
3. Um lock por cadeia global ou particionada, dentro da transação, garante ordem e unicidade de `prev_hash` sem corrida.
4. Predição só antes do evento, e resultado só depois de previsão registrada; fechamento irrevogável de evento.
5. Retificações como novo evento de correção, com vínculo verificável e motivo; nunca sobrescrever.
6. Política de backup/PITR e retenção definida; ensaiar restauração antes de ativar coleta.
7. Validação explícita de limites de payload, tipos, hash canônico e erros de idempotência.
8. Nunca confundir hash de registro com prova temporal externa; registrar fonte independente do resultado e janela de fechamento.

## Procedimento de rollback (pré-implantação)
- **Antes do deploy:** nenhuma mudança necessária; apagar branch/PR apenas se decidido.
- **Após eventual migração:** desabilitar endpoints e revogar EXECUTE do papel runtime; manter evidências imutáveis para auditoria.
- **Não usar DROP SCHEMA CASCADE como rollback automático.** Qualquer remoção de schema requer backup, confirmação de inexistência de registros e autorização expressa.
- Se houver dados já capturados, preferir desativação reversível, preservação e exportação verificável; nunca descartar provas silenciosamente.
- Rollback da interface Vercel deve ser independente da reversão de schema.

## Critérios para pedir autorização de migração
- Revisão das permissões reais e schemas expostos, da política de segredos e do papel runtime dedicado.
- DDL final + funções de append atômico e consultas com testes negativos.
- Plano de backup/restauração e janela de implantação.
- Homologação em ambiente não produtivo.
- Confirmação específica do usuário para tocar o Supabase compartilhado.
