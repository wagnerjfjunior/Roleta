# Roleta — Next Safe Action

## Autoridade atual

A próxima ação segura é dupla, sem dependência de conversa:

1. **validar a V1 do dashboard em produção e corrigir apenas defeitos de apresentação/cálculo identificados na aceitação;**
2. **continuar RLT-M2, normalizando a camada nominal dos corretores e publicando ranking auditável de Nº1, Nº2, Nº3, Cortesia e Último.**

### Critérios de aceite do dashboard

- carrega `data/events.csv` em produção;
- exibe 75 eventos, 71 A e 4 B;
- última roleta corresponde ao evento canônico mais recente;
- recomendações deixam claro que são históricas, não preditivas;
- posição física não é confundida com ordem efetiva;
- filtros por período/N não usam eventos inexistentes;
- “nunca apareceu” exige exposição real.

### Critérios de aceite da camada nominal

1. cada ocorrência nominal aponta para evento/data/período;
2. nomes ilegíveis não são inferidos;
3. aliases só são unificados quando há evidência suficiente;
4. linhas abaixo da barra permanecem excluídas;
5. resultado nominal não altera a base numérica auditada;
6. ranking apresenta contagem absoluta e exposição quando possível;
7. incertezas são explicitadas.

### Não autorizado por sequência

- declarar causalidade ou vantagem futura;
- alterar regras históricas para fazer a hipótese caber nos dados;
- incorporar linha pós-barra como participante;
- reclassificar quarentena sem nova evidência;
- redefinir SFJM neste repositório.
