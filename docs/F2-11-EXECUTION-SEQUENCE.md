# F2-11 — Pacote sequencial e gates

1. Alinhar o contrato de integridade entre a aplicação e o banco, mantendo separados o ledger histórico e a evidência prospectiva.
2. Garantir imutabilidade por política de privilégio e mecanismo de banco testado em PostgreSQL descartável.
3. Homologar idempotência, replay, transações concorrentes, falhas e recuperação em PostgreSQL descartável.
4. Confirmar isolamento de papéis, RLS, limites de recursos e ausência de acessos às tabelas do Discador.
5. Consolidar relatório, SQL final, impacto e rollback para autorização explícita de migração.

Bloqueios conhecidos: o protótipo usa serialização JSONB não equivalente ao canonical JavaScript; o request SHA não é recalculado no banco; não há credencial runtime nem função final com privilégios mínimos. Nenhum arquivo em review-only é autorizável para produção enquanto estes itens permanecerem abertos.

Não modificar a política WEEKLY_FROZEN, histórico canônico ou banco Supabase compartilhado. A ativação de captura operacional exige segunda autorização.
