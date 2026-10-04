# Roleta — Regras Operacionais do Domínio

## Caminhos da Lapa — regra observada

### Inscrição
- primeira coluna = posições físicas disponíveis;
- corretor pode escolher qualquer posição física vaga;
- em outros plantões esta regra pode ser sequencial e deve ser configurável;
- fechamento padrão observado: 08:45 manhã / 13:45 tarde; sorteio após fechamento.

### Sorteio
1. fechar lista;
2. contar N participantes válidos;
3. configurar sorteador com 1..N;
4. percorrer participantes pela ordem das posições físicas ocupadas;
5. atribuir sequencialmente um número sorteado a cada participante;
6. ordenar pelo número sorteado para obter fila final de atendimento.

### Funções da fila
- Nº1 = primeiro atendimento regular;
- Nº2/Nº3 = sequência regular;
- Cortesia = penúltimo número sorteado;
- Último de vez = último número sorteado;
- telefone/online pode operar em ordem reversa conforme regra local.

### Pós-barra
Participantes abaixo da linha não participam da roleta regular. Podem contar presença conforme regra local e atender indicações próprias, mas não contaminam N nem a permutação do sorteio.

### Multiempresa / recepção
Cada empresa pode produzir sua lista interna; a recepção consolida uma fila canônica intercalada conforme a ordem sorteada das empresas. A plataforma futura deve aceitar entradas digitais, planilha, API, foto/PDF ou lista manual sem exigir adoção digital uniforme.


## Qualificação para fim de semana

- existem 10 períodos úteis por semana: segunda a sexta, manhã e tarde;
- o corretor precisa cumprir pelo menos 5 períodos para participar das roletas de sábado/domingo;
- a contagem do painel usa somente presença confirmada;
- ausência não é inferida quando a folha/evidência do período não está disponível.

## Fechamento das escolhas de fim de semana

### Sábado
Os números permanecem como **prévia** durante a semana.

Fechamento:
após a última roleta de sexta-feira, incorporar a evidência nova, executar a análise final e congelar os números de sábado.

### Domingo
Os números permanecem como **previsão provisória**.

Fechamento:
após receber a foto/resultado da roleta de sábado, incorporar o evento, recalcular uma única vez e congelar os números de domingo.

A base principal é sempre o dataset canônico global; fim de semana é contexto secundário.


## Exceções eleitorais de 2026

Regra geral de fim de semana:
- sábado e domingo operam como uma única roleta integral por dia.

Exceções:
- 04/10/2026 — 1º turno das Eleições Gerais: duas roletas, manhã e tarde;
- 25/10/2026 — eventual 2º turno das Eleições Gerais: duas roletas, manhã e tarde.

Estas exceções são datadas e não alteram a regra geral dos demais fins de semana.
