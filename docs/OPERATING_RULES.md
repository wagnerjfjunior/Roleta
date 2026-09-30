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
