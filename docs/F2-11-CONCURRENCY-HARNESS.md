# F2-11 — Ensaio concorrente isolado

`simulation/prospective-inmemory-store.cjs` é **simulador de teste em memória**, sem persistência e sem conexão ao Supabase. Serializa promessas de gravação para testar regras de replay, unicidade de policy, fechamento por outcome e encadeamento de hashes.

`tests/regression/prospective-concurrency.test.cjs` verifica 32 chamadas simultâneas com a mesma chave, duas políticas concorrentes, duas tentativas de outcome e recuperação após falha. Esses testes **não demonstram atomicidade real no PostgreSQL**: ainda faltam testes com transações SQL reais, locks, RLS, privilégios, crash recovery e limites de conexões em Postgres descartável.

## Gate de implantação
Não executar migrações no Discador-MesaCliente. O protótipo SQL permanece em `database/review-only`, não é production-ready. Testes em memória não substituem homologação em banco descartável e autorização específica para mudança no banco compartilhado.
