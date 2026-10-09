# Roleta — Blocked Actions

Bloqueios atuais:

1. **NO NAME INFERENCE** — não inventar nome quando a grafia não é legível.
2. **NO COMPLEMENT INFERENCE** — não preencher número ausente de uma permutação apenas pelo complemento matemático.
3. **NO POST-BARRA CONTAMINATION** — linhas pós-barra não entram na roleta sorteada.
4. **NO POSITION COLLAPSE** — posição física, ordem efetiva e número sorteado não podem ser tratados como a mesma variável.
5. **NO PREDICTIVE CLAIM** — frequência histórica não é apresentada como aumento comprovado da probabilidade futura.
6. **NO HINDSIGHT CREDIT** — challengers não recebem acerto retrospectivo por reordenação após conhecer o resultado.
7. **NO SILENT DEDUP** — duplicatas precisam ser registradas, não apenas apagadas.
8. **NO WEEKEND-ONLY PRIMARY SAMPLE** — o recorte de fim de semana não substitui a base canônica global como amostra principal.
9. **NO PREVIEW** — Preview Deployment não integra o fluxo autorizado da Roleta.
10. **NO REMOTE ITERATION** — desenvolvimento iterativo ocorre no clone local; commits remotos de feature não são ambiente de validação.
11. **NO IMPLICIT PUSH/DEPLOY** — push e deploy exigem intenção explícita da Product Authority.
12. **NO PROTOCOL REDEFINITION** — StopJuniorMode é a autoridade do protocolo SFJM.
13. **NO WORKSPACE AUTHORITY TRANSFER** — SFJM Workspace é derivado/visualização; este repositório continua autoridade do projeto Roleta.

## RLT-ARCH-01 — limites de 09/10/2026

- Sem merge/deploy do PR #41; sem mutação de cenário, segredos ou dados nesta etapa.
- Não tratar o snapshot de um deployment antigo como base comum atual; homologar leitura comum antes de promover rollback.
- Não exigir cenário/segredos separados contra a decisão de compartilhamento; manter controles DevSecOps e risco comum explícitos.
- Não inferir versão de registros antigos, habilitar fallback OCR.space, duplicar resposta webhook ou apagar dados ao alternar versão.
- Não declarar especificação, kill switch, backup restaurável ou ensaio operacional concluídos sem evidência.
- Repositório de protocolo e SFJM Workspace não são alvos de mutação nesta consolidação.

Decisões/condições de reabertura e autorização: `docs/sfjm/RLT_ARCH_01_CONTINUITY.md`. Próxima ação: `docs/NEXT_SAFE_ACTION.md#rlt-arch-01`.
