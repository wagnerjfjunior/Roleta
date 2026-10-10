# Roleta — Bootstrap Canônico

## 1. Identidade

PROJECT_ID: `roleta`
PROJECT_NAME: `Roleta`
CANONICAL_SOURCE: `wagnerjfjunior/Roleta`
DEFAULT_REF_OR_RESOLUTION_RULE: resolver live `main` antes de trabalho material
BOOTSTRAP_ENTRYPOINT: `bootstrap/BOOTSTRAP_CANONICO.md`
CONTINUITY_ENTRYPOINT: `handoffs/CURRENT.md`
PROTOCOL_AUTHORITY: `wagnerjfjunior/StopJuniorMode`
WORKSPACE_PRODUCT: `wagnerjfjunior/sfjm-workspace`

Este repositório aplica SFJM, mas não redefine o protocolo.

## 2. Ordem mínima de leitura

1. resolver live `main`;
2. ler este bootstrap;
3. ler `docs/SFJM_BOUNDARY.md`;
4. ler `handoffs/CURRENT.md`;
5. ler `docs/PROJECT_STATUS.md`;
6. ler `docs/sfjm/CURRENT_DATA_STATE.json` para contagens voláteis derivadas;
7. ler `docs/NEXT_SAFE_ACTION.md`;
8. ler `docs/BLOCKED_ACTIONS.md`;
9. ler `docs/METHODOLOGY.md` quando a tarefa envolver estatística/dados;
10. ler `docs/OPERATING_RULES.md` quando a tarefa envolver regras de plantão;
11. resolver evidência exata necessária antes de concluir ou mutar.
12. ler `docs/PRINT_TEMPLATE_V2.md` sempre que a tarefa envolver Nova Roleta, validação, prévia, impressão ou PDF;
13. ler `docs/RLT_PRINT_V2_CHANGELOG_2026-10-07.md` quando houver regressão ou dúvida sobre decisões de implementação do fluxo de impressão.
14. ler `docs/ARCHITECTURE.md` quando a tarefa alterar fronteiras de domínio, dados, simulação, prospectivo ou infraestrutura.
15. ler `docs/F2-11_SHARED_SUPABASE_READINESS_20261010.md` antes de qualquer trabalho envolvendo Supabase, papéis, permissões ou evidências prospectivas; respeitar os gates A e B.

## 3. Regra de autoridade

GitHub/versionado controla o estado atual.

Para contagens voláteis de dataset/ledgers, `data/manifest.json` e `docs/sfjm/CURRENT_DATA_STATE.json` prevalecem sobre números copiados em documentação narrativa.

```text
CONVERSATION != CANONICAL_STATE
MEMORY != CANONICAL_STATE
AUDIT_PASS != AUTHORIZATION
READY != MERGE_AUTHORITY
TOOL_CAPABILITY != MUTATION_AUTHORITY
```

## 4. Estado atual resumido — 01/10/2026

- dataset lógico canônico: 77 roletas utilizáveis;
- 73 qualidade A;
- 4 qualidade B;
- 10 registros-fonte em quarentena/indisponíveis;
- 3 duplicatas removidas;
- 1 relato parcial fora da inferência;
- posição física, ordem efetiva e número sorteado são variáveis distintas;
- Dashboard V2 está em produção;
- RLT-M3 Prospective Statistical Monitoring está ACTIVE;
- Model Lab opera em regime Champion vs Challengers;
- champion atual: `context_raw`, indexado em 100%;
- nenhum modelo atual prova vantagem preditiva global a 5%;
- fim de semana usa toda a base canônica como amostra principal; sábado/domingo são contexto secundário;
- desenvolvimento é LOCAL-FIRST: sem Preview e sem iteração remota; push/deploy exigem intenção explícita.

## 5. Falha fechada

Se houver conflito entre fontes, identificação nominal incerta, data/período ambíguo, linha pós-barra ou permutação incompleta: não inferir. Registrar lacuna/quarentena e interromper a conclusão específica.
