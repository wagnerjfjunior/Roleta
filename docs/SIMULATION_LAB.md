# RLT-M4-01 — Simulation Lab V1

## Objetivo

Criar um laboratório separado da base canônica real para testar métodos da Roleta em milhares de eventos sintéticos sem hindsight.

## Separação de dados

- dados reais continuam exclusivamente nas fontes de `data/manifest.json`;
- simulação não adiciona eventos ao manifest;
- resultados sintéticos existem apenas em memória no navegador na V1;
- nenhuma simulação altera presença, weekend-policy, model-lab ou histórico real.

## Mecânica simulada

Para cada evento sintético:

1. sortear, com reposição, uma roleta histórica completa como molde estrutural;
2. preservar `N`, período e posições físicas ocupadas;
3. ordenar as posições físicas ocupadas para obter a ordem efetiva;
4. gerar uma permutação uniforme de `1..N` por Fisher-Yates;
5. atribuir cada número sorteado à posição física correspondente à ordem efetiva;
6. derivar:
   - Nº1 = posição que recebeu 1;
   - Nº2 = posição que recebeu 2;
   - Cortesia = posição que recebeu N-1;
   - Último = posição que recebeu N.

Gaps físicos são preservados. Portanto posição física e ordem efetiva permanecem variáveis distintas.

## Regime walk-forward

Antes de cada sorteio sintético:

1. cada modelo vê apenas o histórico disponível até aquele instante;
2. escolhe duas posições elegíveis na estrutura corrente;
3. a escolha é congelada;
4. a permutação é gerada;
5. HIT/MISS é contabilizado;
6. somente então o evento entra no estado estatístico do universo.

## Modelos V1

- Contextual Raw Lab V1: ranking por excesso observado sobre esperado no mesmo contexto período + faixa de N;
- Global Raw Lab V1: ranking por excesso observado sobre esperado em todos os contextos;
- Random Baseline: duas posições elegíveis sorteadas uniformemente;
- Fixed Baseline: duas posições fixas definidas pelos líderes globais da base real inicial; quando indisponíveis, usa fallback elegível determinístico.

Bayes hierárquico, logístico hierárquico e kernels avançados permanecem fora da V1 até o motor-base ser validado.

## Targets

Para cada escolha Top-2:
- 2X: Nº1 ou Último;
- 3X: Nº1, Cortesia ou Último;
- 4X: Nº1, Nº2, Cortesia ou Último.

A expectativa aleatória de duas posições distintas em um evento com N e k resultados-alvo é:

`1 - C(N-k,2) / C(N,2)`.

## Reprodutibilidade

- PRNG determinístico com seed informada no painel;
- mesma seed + mesma base + mesmos parâmetros = mesmo resultado.

## Escala inicial

- 624 eventos equivalem aproximadamente a 1 ano operacional;
- 6.240 eventos equivalem aproximadamente a 10 anos;
- o painel permite múltiplos universos independentes.

## Critério de aceitação V1

1. preservar gaps e ordem efetiva;
2. permutação sempre completa e sem reposição;
3. seed reproduzível;
4. nenhum acesso ao resultado antes da escolha;
5. dados simulados não entram no dataset real;
6. painel exibe claramente REAL DATA vs SIMULATION DATA;
7. comparação inclui pelo menos Contextual, Global, Random e Fixed.


## RLT-M4-02 — Worker, auditoria e Signal Injection

### Execução pesada
- o Monte Carlo passa a executar em `simulation/worker.js`;
- a UI permanece responsiva;
- o worker publica progresso por universo;
- o usuário pode cancelar a execução;
- cargas de milhões de roletas deixam de bloquear a thread principal.

### Persistência auditável V1
- ao concluir, o resumo do run é gravado em `localStorage`;
- são preservados os 25 runs mais recentes;
- cada run guarda timestamp, versão do motor, seed, cenário, escala e métricas agregadas;
- o usuário pode exportar o run atual em JSON;
- nenhum resultado sintético entra em `data/manifest.json`.

Observação: o navegador não grava diretamente no GitHub. Persistência central exigirá backend autenticado separado.

### Signal Injection V1

Cenários suportados:
- `null`: acaso puro;
- `fixed_2x`: uma posição física elegível recebe oportunidade adicional controlada de ser Nº1/Último;
- `morning_2x`: o mesmo sinal, porém somente em eventos de manhã;
- `high_n_2x`: o mesmo sinal somente quando N >= 25.

Parâmetros:
- posição-alvo configurável;
- intensidade configurável;
- seed reproduzível.

A injeção ocorre somente na geração do resultado, depois que os modelos congelam suas escolhas. Isso preserva a disciplina walk-forward.

### Interpretação
- NULL LAB: os modelos devem convergir para O/E próximo de 1;
- SIGNAL LAB: modelos sensíveis ao contexto devem detectar sinais contextualizados melhor que baselines incompatíveis;
- Random Baseline permanece como controle negativo;
- um O/E alto isolado não promove um modelo; é necessário comparar distribuição entre universos e falso positivo no NULL.


## JSON auditável — contrato de exportação

Cada arquivo exportado deve ser autossuficiente e conter dois blocos principais:

### `test`
Define o experimento executado:
- ID e nome do teste;
- objetivo;
- hipótese esperada antes da execução;
- cenário e target;
- posição do sinal e intensidade;
- quantidade de universos;
- anos por universo;
- eventos planejados;
- seed;
- fonte estrutural;
- mecânica do motor;
- métrica primária;
- métricas secundárias;
- baselines de controle;
- regra anti-hindsight.

### `result`
Registra o que efetivamente aconteceu:
- versão do motor;
- modo;
- sinal aplicado;
- seed;
- universos processados;
- horizonte;
- total de eventos sintéticos;
- quantidade de moldes estruturais;
- métricas por modelo.

Regra: o JSON deve permitir reconstruir a pergunta experimental e interpretar o resultado sem depender do dashboard ou da conversa que originou o run.


## RLT-M4-03 — Context-Aware Evaluation

Objetivo: avaliar corretamente modelos contextuais quando o sinal sintético existe apenas em parte dos eventos.

Cada modelo passa a registrar quatro cortes simultâneos:
- `all`: todos os eventos;
- `morning`: somente período da manhã;
- `afternoon`: somente período da tarde;
- `signal_eligible`: somente eventos em que o cenário configurado permitia a aplicação do sinal.

Cada corte mantém:
- eventos;
- hit rate 2X, 3X e 4X;
- esperado 2X, 3X e 4X;
- O/E 2X, 3X e 4X;
- P05 e P95 do O/E 2X entre universos;
- losing streak p95.

O placar geral continua existindo por compatibilidade, mas a comparação entre Contextual Raw e Global Raw em cenários contextuais deve usar prioritariamente `signal_eligible` e o corte específico correspondente.

Exemplo:
- em `morning_2x`, comparar especialmente `morning` e `signal_eligible`;
- `afternoon` funciona como controle interno sem sinal;
- Random Baseline deve permanecer aproximadamente em O/E 1 nos cortes relevantes.

O JSON auditável passa a identificar o teste como `RLT-M4-03` e inclui os novos cortes dentro de cada modelo.


## RLT-M4-04 — Context Decomposition

Objetivo: decompor o contexto para verificar se adicionar a faixa de N melhora a detecção ou fragmenta excessivamente a amostra.

Modelos comparados:
- `Global Raw`: histórico global;
- `Period Raw`: histórico separado somente por período (manhã/tarde);
- `Contextual Raw · Period+N`: histórico separado por período + faixa de N;
- `Random Baseline`;
- `Fixed Baseline`.

O `Period Raw` usa exatamente o mesmo ranking por excesso observado sobre esperado dos demais modelos Raw, mas sua chave contextual contém apenas o período.

### Comparação pareada por universo

Além das métricas agregadas, o resultado passa a registrar, no corte `signal_eligible`:
- O/E 2X de cada modelo para cada universo;
- quantidade de universos em que A vence B;
- quantidade de universos em que B vence A;
- empates;
- taxa de vitória de A;
- delta médio de O/E;
- P05, P50 e P95 do delta.

Comparações canônicas:
- Period Raw vs Global Raw;
- Period Raw vs Contextual Raw · Period+N;
- Contextual Raw · Period+N vs Global Raw.

Critério interpretativo:
- se Period Raw superar consistentemente Period+N em sinais puramente por período, a faixa de N está provavelmente fragmentando a amostra;
- se Period+N superar Period Raw em sinais dependentes de N, a granularidade adicional está agregando informação útil;
- decisão de champion não deve ser tomada por uma única média agregada; usar taxa de vitória pareada, deltas e controles NULL.


## RLT-M4-05 — N Decomposition

Objetivo: isolar o efeito de N sem misturá-lo com período, após o cenário `high_n_2x` mostrar que o Global Raw superou o Contextual Period+N.

### Novo modelo

- `N Raw · Faixa de N`: usa somente a faixa de N como contexto;
- a faixa é a mesma discretização já usada pelo Contextual Raw: N arredondado para o múltiplo de 5 mais próximo;
- não segmenta por manhã/tarde;
- usa o mesmo score Raw por excesso observado sobre esperado.

O conjunto passa a ser:
- Global Raw;
- Period Raw;
- N Raw;
- Contextual Raw · Period+N;
- Random Baseline;
- Fixed Baseline.

### N mínimo configurável

No cenário `Bias 2X · N alto`, o front exibe `N mínimo do sinal`.
Valor padrão: 25.

Exemplo:
- minN 25 => sinal elegível somente quando N >= 25;
- minN 30 => sinal elegível somente quando N >= 30.

O valor configurado entra no JSON auditável em `test.scenario.minN` e `result.signal.minN`.

### Comparações pareadas adicionais

No corte `signal_eligible`:
- N Raw vs Global Raw;
- N Raw vs Period Raw;
- N Raw vs Contextual Raw · Period+N.

As comparações anteriores permanecem para continuidade histórica.

Hipótese do cenário `high_n_2x`:
- N Raw deve explorar melhor um sinal definido apenas por N do que modelos que ignoram N ou fragmentam o histórico também por período.

A versão do motor e o ID do teste passam a ser `RLT-M4-05`.


## RLT-M4-06 — Adaptive Meta-Model

Objetivo: testar se um seletor adaptativo consegue escolher entre as arquiteturas Raw já validadas sem usar hindsight.

### Candidatos

- Global Raw;
- Period Raw;
- N Raw;
- Contextual Raw · Period+N.

Random e Fixed permanecem controles, não candidatos do meta-modelo.

### Regra walk-forward

Antes de cada sorteio sintético:
1. os quatro candidatos geram seus Top-2 usando somente o histórico disponível;
2. o meta-modelo consulta apenas o desempenho 2X acumulado dos candidatos em eventos anteriores;
3. calcula para cada candidato o excesso padronizado `z = (hits - esperado) / sqrt(variância)`;
4. exige no mínimo 100 eventos anteriores;
5. somente troca o fallback Global Raw quando o melhor candidato tem `z > 1,5`;
6. congela as posições do candidato escolhido;
7. o sorteio é gerado;
8. somente depois da adjudicação são atualizadas as evidências de todos os candidatos.

O limiar é um mecanismo operacional conservador, não um teste formal de significância.

### Auditoria

O resultado registra:
- política do meta-modelo;
- candidatos;
- mínimo de eventos;
- limiar z;
- fallback;
- quantidade e proporção de eventos em que cada arquitetura foi selecionada;
- comparações pareadas Adaptive Meta vs Global, Period, N e Period+N.

### Critério

No NULL, Adaptive Meta deve permanecer próximo de O/E 1 e não apresentar vantagem artificial persistente.
Nos cenários com sinal, deve aproximar-se do melhor especialista sem conhecer previamente qual arquitetura contém a estrutura correta.

A versão do motor e o ID do teste passam a ser `RLT-M4-06`.


## RLT-M4-07 — Weekly Frozen vs Current

Purpose: evaluate the operational value of intra-week recalculation after the real V1 policy has been locked.

This phase does **not** select a new model. It holds `PROSPECTIVE-V1.0.0 / RLT-M5-WEEKLY-V1` fixed and compares three strategies on exactly the same synthetic weeks:

1. `WEEKLY_FROZEN` — positions are calculated at the start of the week and remain unchanged;
2. `CURRENT` — starts from the same policy but recalculates future recommendations after every revealed roulette;
3. `RANDOM` — paired random control.

Each synthetic week contains:
- Monday–Friday: morning + afternoon;
- Saturday: integral;
- Sunday: integral;
- 12 roulettes/week;
- 4 family opportunities per roulette.

### Paired chronology

For every synthetic week:

1. seed model state only with canonical real events available before the synthetic week;
2. calculate the complete Weekly Frozen plan;
3. calculate the initial Current plan;
4. draw the next structural template for the required period;
5. freeze the Weekly/Current choices for that event;
6. reveal the new permutation;
7. adjudicate both strategies and random on the same outcome;
8. append the revealed event to model state;
9. recalculate Current only;
10. continue through Sunday.

Weekly Frozen is never revised.

### Eligibility/fallback

Each person has:
- primary position;
- fallback 1;
- fallback 2.

For each event the first physically eligible value in that frozen chain is used. If none is physically present, that person/event is counted as invalid rather than silently inventing another position.

### Scenarios

- `NULL`: pure chance. Current must not manufacture persistent gain from continual updating.
- `stable_period`: a persistent period-specific signal favors the Weekly V1 leader for that period.
- `regime_shift`: the favored period position switches halfway through the week, testing whether Current can adapt.
- `weak_noise`: weak event-to-event moving signal, testing whether Current chases noise.

### Primary diagnostics

- 2X hits;
- event-specific theoretical expected hits;
- O/E;
- Weekly vs Current paired win rate by week;
- mean `hits(Current) - hits(Weekly)`;
- P05/P50/P95 of weekly hit delta;
- recommendation churn;
- changes that helped;
- changes that hurt;
- neutral changes;
- Random baseline.

### Interpretation

This laboratory can justify or reject the *updating mechanism*. It cannot prove that the real roulette contains predictive signal.

The live week 05–11/10/2026 remains frozen and is not changed by RLT-M4-07 results.

Engine: `simulation/weekly-duel.js`.
Worker: `simulation/weekly-duel-worker.js`.
UI: `simulation/weekly-duel-ui.js`.
Protocol version: `RLT-M4-07-v2`.

### Paired-valid correction

The first 10,000-week NULL run exposed an interpretation confound: Weekly Frozen and Current can have different counts of valid operational recommendations because each may resolve different primary/fallback chains against the same occupied-position set.

Observed first NULL run (v1):
- Weekly O/E: 0.993;
- Current O/E: 0.996;
- Random O/E: 1.004;
- conclusion: NULL behavior passed, but raw hit delta was not a fair quality comparison because valid-opportunity counts differed.

RLT-M4-07-v2 therefore separates:

1. **Operational metrics**
   - valid opportunities by strategy;
   - invalid opportunities;
   - delta valid opportunities;
   - raw hit and O/E differences.

2. **Paired-valid metrics**
   - include only person/event opportunities where both Weekly and Current resolve to a valid physical position;
   - theoretical expected probability is identical for both strategies on every paired opportunity;
   - compare hits, O/E, excess over theoretical chance, weekly win rate, and P05/P50/P95 deltas.

Primary mechanism verdicts must use paired-valid metrics. Operational metrics remain secondary and measure deployability/coverage.

Required NULL re-run:
- 10,000 weeks;
- seed `weekly-duel-2026`;
- signal strength 0;
- paired-valid `Δ O/E ≈ 0`;
- paired-valid `Δ excess ≈ 0`;
- no persistent Current advantage.

