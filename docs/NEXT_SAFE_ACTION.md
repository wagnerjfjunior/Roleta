# Roleta — Next Safe Action

## Autoridade atual

A próxima ação segura é:

**RLT-M3-02 — continuar a validação prospectiva Champion vs Challengers sem recalibrar resultados já congelados.**

### Sequência imediata

1. receber o resultado observado da roleta de 01/10/2026 manhã;
2. anexar o resultado ao registro prospectivo já congelado da posição física 14;
3. classificar HIT/MISS sem reordenar retrospectivamente candidatos;
4. gerar as previsões paralelas do champion e dos challengers antes de cada nova roleta;
5. atualizar o ranking dos modelos somente depois do resultado real;
6. manter o benchmark do acaso ajustado por N;
7. não promover challenger enquanto os gates de promoção não forem cumpridos.

### Gate de promoção de modelo

Um challenger só pode substituir o champion quando, cumulativamente:

- índice relativo >100% no backtest cronológico comparável;
- vantagem também presente em previsões prospectivas congeladas;
- amostra prospectiva suficiente;
- resultado não depender de janela curta ou ajuste retrospectivo;
- desempenho continuar superior ao baseline aleatório ajustado por N.

### Weekend cycle

- usar todas as 77 roletas como base principal;
- sexta-feira após a última roleta: fechar os números de sábado;
- sábado após foto/resultado: recalcular uma única vez e fechar domingo;
- não usar apenas as 14 roletas de fim de semana como amostra principal.

### RLT-M2 em paralelo

A normalização nominal dos corretores permanece ACTIVE, porém não substitui o gate atual de validação prospectiva.

### Não autorizado por sequência

- declarar causalidade ou vantagem futura;
- atribuir retrospectivamente acertos a challengers;
- alterar regra de scoring depois de ver o resultado;
- incorporar linha pós-barra como participante;
- reclassificar quarentena sem nova evidência;
- usar Preview;
- iterar remotamente por commits de desenvolvimento;
- fazer push/deploy sem intenção explícita;
- redefinir SFJM neste repositório.
