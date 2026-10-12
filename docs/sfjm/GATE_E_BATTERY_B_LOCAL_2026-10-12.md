# Gate E — Bateria B local (12/10/2026)

- Ambiente: LOCAL-FIRST / NO PREVIEW, feature flags de escrita desligadas.
- Escopo implementado: validação fail-closed de PR de inclusão de **um único evento** contra snapshot da main: parentagem linear, arquivos autorizados, manifesto completo, fonte CSV, hash/prova com todos os mapeamentos, data/período original, contagens e colisão de evento.
- Executor único: `bash scripts/gate-e/run-battery-b.sh`.
- Não implementado por este pacote: fluxo de correção pós-publicação, recuperação de branches órfãs e integração GitHub real em repositório isolado. Essas operações seguem bloqueadas, não simuladas como prontas.
- Proteção CI e branch protection ainda requerem revisão separada. A comparação local usa a referência fornecida; checks desatualizados não constituem garantia de merge.
- Provas físicas: o digest abrange JSON de todas as associações, **não** os bytes originais da fotografia.
- Zero mutações em Supabase/Discador, `main`, Roleta Simples ou histórico do sorteio. Sem push e sem deploy.
