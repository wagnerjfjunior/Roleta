# RLT — contrato operacional: linha física ≠ bolinha sorteada

Data: 2026-10-11. Regra confirmada pelo operador.

## Sequência do plantão

1. Antes do fechamento, cada corretor escolhe livremente uma **linha física numerada** na folha.
2. No fechamento, às 08h46 ou 13h46, as linhas físicas não ocupadas são **riscadas**, sem compactar/renumerar as linhas dos participantes.
3. Seja `N` o número de participantes elegíveis. O sorteador contém exatamente o conjunto de **bolinhas 1..N**, sem reposição. Somente as bolinhas acima de `N` são excluídas do sorteador; nunca se exclui uma bolinha porque a linha física de mesmo número foi riscada.
4. Cada linha ocupada recebe um único número sorteado (1..N), que define **a ordem real de atendimento**. Uma mesma linha física pode ser ocupada por corretores diferentes em eventos distintos.
5. Preservar no histórico independentemente: `physical_position` (linha), `occupied` (elegibilidade da linha), `drawn_number` (ordem de atendimento), `N` (quantidade de corretores). Não tratar linha física como número sorteado.

## Exemplo canônico de gaps

Última linha ocupada = 25. Linhas riscadas = [2,13].
Linhas físicas elegíveis = [1,3,4,5,6,7,8,9,10,11,12,14,15,16,17,18,19,20,21,22,23,24,25].
`N=23`; sorteador com bolinhas [1,2,...,23].
**Bolinhas 2 e 13 permanecem**, bolinhas 24 e 25 ficam fora do sorteador, linhas físicas 24 e 25 continuam elegíveis.

## Consequências estatísticas e de auditoria

- O Monte Carlo simula uma permutação uniforme de `1..N` aplicada às **linhas ocupadas**. Não distribui bolinhas sobre as linhas riscadas, não elimina as bolinhas 2 e 13 e não comprime as posições físicas.
- Métricas de "posição 1", "penúltimo", "último" referem-se ao número sorteado de **ordem de atendimento**, não à linha física 1/penúltima/última. Ao avaliar sucesso, sempre mapear primeiro `drawn_number → physical_position`.
- As estatísticas por linha física analisam exposições condicionais à ocupação dessa linha; não há garantia de vantagem preditiva sob sorteio justo.
- A auditoria de previsão antes do sorteio deve distinguir o alvo como **linha física elegível escolhida antes do fechamento** de um resultado **número sorteado**, conhecido somente depois; jamais gravar um número sorteado futuro como predição factual.
- Operador Google identifica quem gravou evidências; o **corretor** identifica a pessoa ou o conjunto analisado. Não gerar recomendações individuais para todo corretor por padrão sem definir modelo e evento de previsão.

## Proteção contra regressão

`tests/regression/simulation-guardrails.test.cjs` contém fixture de 25 linhas, riscadas 2/13, N=23; verifica a preservação dos gaps e o conjunto de bolinhas 1..23 no simulador, incluindo Monte Carlo e Weekly Duel. Dados reais de sorteios históricos não são modificados por essa especificação.

**Gate B:** persistência automática e autorização por corretor devem continuar desativadas até definir a semântica exata de `recommendation` e sua vinculação temporal ao evento real. Nenhuma migração de dados de sorteios históricos neste contrato.
