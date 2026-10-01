# Roleta — Current Handoff

## CURRENT STATE — 2026-10-01

```text
canonical repo = wagnerjfjunior/Roleta
canonical ref = main / RESOLVE LIVE
dataset usable = 77
quality A = 73
quality B = 4
quarantine/unavailable source records = 10
duplicates removed = 3
partial report excluded from inference = 1

dashboard V2 = RELEASED / PRODUCTION
model lab = ACTIVE
champion = context_raw / index 100
prospective challenger competition = STARTS_WITH_V2
viability state = EVIDÊNCIA INSUFICIENTE

delivery policy = LOCAL_FIRST / NO PREVIEW / NO REMOTE ITERATION
push = EXPLICIT_INTENT_ONLY
deploy = EXPLICIT_INTENT_ONLY
```

## Modelo operacional confirmado

```text
posição física escolhida
!= ordem efetiva entre posições ocupadas
!= número sorteado / ordem final de atendimento
```

No Caminhos da Lapa a primeira coluna é livre: o corretor pode escolher qualquer posição física vaga. No fechamento, conta-se N participantes; o sorteador contém 1..N; os resultados são atribuídos sequencialmente aos participantes conforme a ordem das posições físicas ocupadas.

## Estado estatístico

- objetivo operacional atual do painel: Nº1 ou Último;
- toda a base lógica de 77 eventos alimenta a análise principal;
- `context_raw` é o champion atual para benchmark Top-2 cronológico;
- champion OOS: 13/48 acertos; esperado 9.4348; p=0.13018;
- Global raw: 9/49;
- EB + kernel N: 8/48;
- EB + N + recência: 7/48;
- Bayes hierárquico e logístico hierárquico permanecem em laboratório;
- nenhum modelo demonstrou vantagem preditiva estatisticamente convincente;
- challengers não recebem crédito retrospectivo: a competição prospectiva inicia na V2.

## Dashboard V2

Entregue em produção com:
- objetivo fixo Nº1 ou Último;
- ranking histórico e perseguidores;
- momentum;
- zerados com exposição real;
- manhã/tarde e recência;
- qualificação automática 5/10;
- quadro de sábado e previsão de domingo;
- laboratório Champion vs Challengers;
- ranking OOS dos modelos;
- bloco de viabilidade do projeto versus acaso.

## Fim de semana

Regra operacional:
- 10 períodos úteis possíveis por semana;
- mínimo de 5 períodos confirmados para aptidão no fim de semana;
- sábado permanece como prévia até a última roleta de sexta-feira;
- domingo permanece como previsão até a foto/resultado de sábado;
- toda a base de 77 eventos é a amostra principal;
- o recorte de fim de semana é contexto secundário, não dataset isolado.

Prévia atual de sábado:
- Wagner: 9;
- Sabrina: 3;
- Laura: 22, fallback 13;
- Helena (Lívia): 14.

Contagem semanal confirmada no ledger atual:
- Wagner: 6/5 — APTO;
- Sabrina: 4/5 — ainda não apta;
- Laura: 1/5 confirmado;
- Helena: 0/5 confirmado no ledger atual, sem inferir ausência além da evidência.

## Current work

RLT-M2 — Broker Identity Layer:
ACTIVE / PARALLEL.

RLT-M3 — Prospective Statistical Monitoring:
ACTIVE.

RLT-M3-01 — Dashboard V2 + Model Lab:
COMPLETE / RELEASED / PRODUCTION.

RLT-M3-02 — Prospective Champion-vs-Challengers Validation:
NEXT_SAFE_ACTION.

RLT-M3-03 — Weekend Forecast Cycle:
ACTIVE / WAITING_FOR_FRIDAY_AND_SATURDAY_EVIDENCE.

A escolha prospectiva de 01/10/2026 manhã permanece congelada em posição física 14 até que o resultado observado seja anexado e adjudicado.
