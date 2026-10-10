# F2-11 — Exercício transacional do protótipo (CI descartável)

O script `tests/postgres/transactional-prototype.sql` testa a função **review-only** dentro do banco efêmero `roleta_ci`: primeiro append, replay idempotente, conflito de chave, duplicidade de política, rejeição de outcome sem previsão, fechamento do evento e ausência de linhas após operações rejeitadas. Também verifica a referência ao hash predecessor.

**Não é homologação de produção.** O protótipo ainda não verifica o digest da requisição nem a canonicalização de JSONB, usa digest provisório, roda com privilégios de proprietário no CI e não comprova autenticação, função SECURITY DEFINER com menor privilégio, isolamento de runtime ou concorrência entre sessões PostgreSQL. A prova de concorrência real e os testes de permissões positivas/negativas do papel definitivo são gates posteriores.

Nenhum acesso ao banco compartilhado Discador-MesaCliente.
