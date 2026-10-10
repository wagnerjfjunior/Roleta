# F2-10 a F2-14 — pacote de execução controlada

Status: plano e componentes de pesquisa, sem promoção automática da política. Não alterar `WEEKLY_FROZEN`, roleta oficial, CSVs canônicos ou regras de semana congelada.

## F2-10 — Regressão contínua
Workflow `.github/workflows/audit-regression.yml`: PR e push na main; Node 22, 30 testes e leitura histórica sem escrita. **Proteção de branch exigindo `audit-regression` é uma configuração administrativa separada e precisa ser verificada.** Não afirmar bloqueio efetivo até ser confirmada.

## F2-11 — Evidência prospectiva
Contrato de registro append-only com `prediction` (antes do sorteio) e `outcome` (depois). Cada registro tem hash SHA-256 sobre payload canônico e encadeamento `prev_hash`. Sem resultados oficiais na fase de previsão; sem alterar previsão depois. Relógio UTC, ID de evento, política, algoritmo, hash de entrada, snapshot de posições elegíveis e recomendação. Um registro `outcome` somente após verificação humana do resultado. Nunca armazenar evidência de produção no repositório público sem avaliação de privacidade, autenticação e persistência.

## F2-12 — Métricas pré-registradas
Análise de oportunidades pareadas (mesmo evento com previsão válida para ambas políticas), acertos, esperado `2/N`, cobertura e incerteza. Resultados separados por política e período; nenhum p-valor ou CI retrospectivamente selecionado é autorização de promoção. Critério decisório prospectivo deve ser aprovado antes da coleta. Meta inicial sugerida: pelo menos 200 oportunidades pareadas, revisão em blocos de 50 sem alterar regra de decisão; tamanho final depende de cálculo de poder para efeito mínimo relevante.

## F2-13 — Pesquisa
Avaliar parâmetros apenas em dados de treinamento; reservar holdout cronológico e manter conjunto prospectivo intocado. Registrar seed, dataset hash, hipótese, versões e múltiplas comparações. Não alterar parâmetros da política oficial por desempenho de treino.

## F2-14 — Gate de promoção
Exige: evidência prospectiva suficiente, protocolo estatístico pré-registrado, ausência de vazamento, teste de rollback, revisão humana e autorização explícita para mudança da política. Em caso de dúvida, manter WEEKLY_FROZEN. Modo sombra não afeta impressão, sorteio ou base canônica.

## Gates manuais que não devem ser ultrapassados automaticamente
1. Credenciais, permissões e proteção de branch no GitHub.
2. Escolha do armazenamento persistente e controle de acesso do log prospectivo.
3. Validação de captura real antes/depois do sorteio.
4. Aprovação dos critérios estatísticos e da promoção operacional.

Não existe execução autônoma contínua garantida por esta documentação: workflow executa nos gatilhos GitHub configurados. Sem gatilho de evento real e armazenamento persistente, F2-11/12 não são coleta real.
