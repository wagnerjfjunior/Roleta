# F2-11 — Concorrência PostgreSQL real (descartável)

O CI executa 16 processos `psql` independentes, em paralelo, tentando gravar a mesma previsão com a mesma chave de idempotência. O teste exige um único ID, uma gravação inicial e 15 replays, além de exatamente uma linha persistida. As conexões usam apenas o container efêmero `roleta_ci`.

**Limites:** esta prova é específica do protótipo SQL e do caso de replay idêntico. Não valida ainda concorrência entre resultados conflitantes, falhas de rede, cancelamentos, deadlocks, bloqueios de recursos, canonicalização confiável ou autorização do papel runtime. O protótipo não está liberado para produção.

Não modifica Discador-MesaCliente.
