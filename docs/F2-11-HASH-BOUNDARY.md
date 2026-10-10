# F2-11 — Hash de requisição versus hash da evidência

O ledger prospectivo canônico `simulation/prospective-ledger.cjs` já define `record_sha256` sobre registros `rlt-prospective-v1`. O novo fluxo de armazenamento exige **dois conceitos separados**:

1. `request_sha256`: SHA-256 do corpo canônico da intenção validada, calculado por `prepareEvidenceIntent`. Serve à idempotência e à detecção de payload adulterado.
2. Hash de envelope da evidência: SHA-256 dos campos `version`, `previous_hash`, `request_sha256`, `received_at` e `actor_subject`. A identidade e o timestamp devem ser atribuídos pelo servidor/banco.

A função `computeChainedEnvelopeHash` é **especificação JavaScript offline**, não implementação SQL pronta. Não substituir `record_sha256` do ledger histórico pelo hash do envelope.

## Bloqueio crítico
O protótipo SQL em `database/review-only/20261010_append_prospective_evidence_prototype.sql` usa `payload::text` e não prova equivalência byte a byte com o formato canônico JS. O protótipo também não verifica `request_sha256` recebido. **Não executar.**

## Aceite necessário
- Escolher um único local confiável de canonicalização; testar vetores Unicode, números, campos opcionais e ordem de chaves.
- Proibir `undefined`, `NaN`, `Infinity`, objetos com protótipo inesperado e valores acima do limite.
- Recalcular o hash no limite confiável; comparar em tempo constante e vincular `actor_subject` à sessão.
- Definir claramente se o banco armazena um envelope assinado pelo servidor ou um digest computado pelo próprio Postgres. A função SQL deve verificar, não apenas persistir, o hash.
- Testar transações concorrentes e recuperação após falha em banco descartável.

Nenhuma migração ou mudança no Discador-MesaCliente está autorizada por este documento.
