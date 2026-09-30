# Roleta — Metodologia Forense e Estatística

## Unidade de análise

Um evento é uma roleta fechada.

Campos centrais:
- posições físicas ocupadas;
- N participantes válidos;
- número sorteado atribuído a cada participante;
- posição física do Nº1, Nº2, Cortesia (N-1) e Último (N);
- ordem efetiva correspondente.

## Distinção fundamental

Se as posições físicas ocupadas forem `2, 7, 15, 21`, então:
- posição física 15 = terceira posição ocupada;
- ordem efetiva = 3;
- o sorteador contém apenas 1..4.

Logo, a análise deve manter separadas:
1. posição física;
2. ordem efetiva;
3. número sorteado.

## Validação estrutural

Uma folha entra como qualidade A quando:
- participantes válidos são identificáveis;
- linha de corte é identificável quando aplicável;
- números sorteados formam a permutação esperada 1..N;
- exceções são documentadas.

Qualidade B:
- base estruturada reconciliada matematicamente, sem evidência visual equivalente.

Quarentena:
- número ausente/ilegível;
- duplicidade incompatível;
- participante não identificável;
- contexto insuficiente.

## Chance esperada

Para um resultado específico (ex. Nº1), em uma roleta com N:
`P = 1/N`.

Para Premium = Nº1 + Cortesia + Último:
`P = 3/N`.

A expectativa de uma posição ao longo de várias roletas é a soma das probabilidades das roletas em que aquela posição era elegível.

## Testes

- Poisson-binomial para contagem de sucessos com N variável;
- razão observado/esperado;
- correção BH-FDR para múltiplas posições;
- Monte Carlo max-stat para teste global;
- backtest cronológico fora da amostra;
- validação prospectiva para hipóteses congeladas antes dos resultados.

## Interpretação

Um p-value individual baixo não é prova suficiente quando muitas posições foram pesquisadas. O teste global e o backtest têm precedência para alegação de vantagem preditiva.

## Regra de não causalidade

Mesmo um padrão estatístico histórico não implica mecanismo causal. Se o sorteador for justo, cada número futuro continua equiprovável dentro daquela roleta, salvo evidência independente de viés operacional ou algorítmico.
