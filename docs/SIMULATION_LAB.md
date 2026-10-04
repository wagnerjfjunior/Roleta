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
