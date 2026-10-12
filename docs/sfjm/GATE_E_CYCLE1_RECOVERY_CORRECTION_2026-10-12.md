# Gate E — Ciclo 1, recuperação e retificação (contratos locais)

* `recovery-plan.cjs`: um plano somente leitura, sem chamadas GitHub ou mutação. Reconhece branch com PR aberta e branch órfã, confere parent SHA/commit e prova estrutural. **Não recria PR automaticamente.** Um operador ainda deve validar os bytes da prova/manifesto com `validate-intake-pr.cjs`, conferir PRs fechadas e autorizar recuperação manual.
* `correction-contract.cjs`: preflight de proposta versionada, hash de prova predecessora, nova versão, justificativa, fonte, revisor independente e hash que vincula aprovação à proposta. **Não grava retificações** e sempre retorna `writesPermitted:false`; o repositório ainda não possui ledger/endpoint/CI de correção versionada.
* Testes locais simulados: `gate-e-recovery-correction.test.cjs`. O resultado é cobertura de contrato, **não homologação GitHub real**.
* Nenhuma alteração em `data/`, nos 86 eventos oficiais, Supabase, GitHub remoto, `main` ou feature flags.
* Bloqueadores à produção: consertar fluxo real CI contra checkout não confiável, política de merge atualizada, recuperação operacional com auditoria e retificação versionada persistida, homologação em repo descartável, autorização explícita.
