# Roleta

Repositório canônico do projeto **Roleta**.

Objetivo: preservar regras operacionais, metodologia estatística, base auditada, evidências, decisões e continuidade SFJM fora de qualquer conversa específica.

## Fonte de verdade

Para estado atual do projeto, a prioridade é:

1. live `main` deste repositório;
2. `handoffs/CURRENT.md`;
3. `docs/PROJECT_STATUS.md`;
4. `docs/NEXT_SAFE_ACTION.md`;
5. demais documentos versionados aplicáveis.

Conversas, memória, screenshots e análises avulsas são evidência auxiliar e não substituem o estado versionado.

## Bootstrap

Comece sempre por:

`bootstrap/BOOTSTRAP_CANONICO.md`

## Estado inicial consolidado

- base utilizável: **75 roletas**;
- qualidade A: **71**;
- qualidade B: **4**;
- registros-fonte em quarentena/indisponíveis: **10**;
- duplicatas removidas: **3**;
- modelo correto: **posição física escolhida != ordem efetiva do sorteio != número sorteado**;
- posição física 9 lidera historicamente Nº 1 na base atual, mas sem significância global robusta;
- ordem efetiva 9 lidera Nº 1; ordem 12 segue próxima; nenhuma comprova vantagem preditiva após correções e backtest.

## Estrutura

- `bootstrap/` — ponto de entrada canônico;
- `handoffs/` — continuidade volátil;
- `docs/` — regras, metodologia, status e governança;
- `docs/sfjm/` — read models e artefatos SFJM;
- `data/` — base auditada e documentação de dados;
- `evidence/` — índice de evidências e proveniência.

## Regra estatística

Padrões históricos podem ser acompanhados, mas não devem ser apresentados como aumento comprovado da probabilidade futura sem validação prospectiva adequada.


## Fluxo canônico de Nova Roleta / impressão

Para qualquer alteração no fluxo operacional de validação e impressão, ler obrigatoriamente:

- `docs/PRINT_TEMPLATE_V2.md` — contrato e invariantes canônicos do RLT-PRINT-V2;
- `docs/RLT_PRINT_V2_CHANGELOG_2026-10-07.md` — histórico de implementação, falhas reais, decisões e testes;
- `handoffs/CURRENT.md` — estado corrente e gate de promoção.

Regra central: **JSON importado é transcrição inicial; impressão/PDF exige conferência humana e payload revisado.**
