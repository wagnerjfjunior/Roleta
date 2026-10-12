# Gate E Bateria C — Pré-homologação offline

Executado em Git descartável LOCAL, não em GitHub. Exercita mudanças reais de branch, commits, manifesto, CSV, prova e base concorrente, usando os validadores atuais sem mocks de Git.

**Não equivale à homologação GitHub real**. Regras de proteção e checagens requeridas devem ser validadas no próprio GitHub. Correções pós-publicação e recuperação operacional de branches permanecem desabilitadas. Nenhuma ativação das flags estatísticas está autorizada.

Revisão real das regras do GitHub em 12/10/2026: ruleset `Roleta - Proteção MAIN` ativo, com `strict_required_status_checks_policy=true`, mas checks exigidos somente `audit-regression` e `canonical ledger and simulation invariants`; Gate E intake não constava da lista. Revisores mínimos estavam em 0. GitHub branch protection endpoint respondeu 403 para a integração; ruleset foi verificado por leitura.

Ação necessária antes de go-live: fazer o check Gate E aparecer e ser requerido em PRs reais, exigir revisão independente, testar PRs concorrentes, estado órfão, idempotência, fluxos e autorização explícita. Não habilitar merge queue: workflow atual falha fechado para `merge_group`.
