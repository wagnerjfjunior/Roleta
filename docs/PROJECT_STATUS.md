# Roleta — Project Status

## Estado canônico — 2026-10-04

- main atual: `4b4f3b5a1d752b6f78f59d45f09820c13759d20d`.
- 81 eventos lógicos.
- 80 permutações completas validadas.
- 77 qualidade A / 4 qualidade B.
- 1 evento parcial fora dos testes integrais.
- Workspace V3 em produção.
- Responsividade mobile RLT-M3-04: CORRIGIDA / VALIDADA LOCALMENTE / MERGEADA / PRODUÇÃO READY.
- RED TEAM V3: targets 2X, 3X, 4X e Sequential Draw Audit.
- Nenhum modelo demonstrou vantagem preditiva robusta.
- Estado de viabilidade: EVIDÊNCIA INSUFICIENTE.
- RLT-M2 Broker Identity Layer: ACTIVE_PARALLEL.
- RLT-M3 Prospective Statistical Monitoring: ACTIVE.
- RLT-M3-04: CLOSED_DELIVERED.
- RLT-M3-05: ACTIVE / ELECTION_SUNDAY_DUAL_DRAW.

### Sábado 03/10 observado
- evento único integral.
- N=29.
- Nº1 p23.
- Nº2 p9.
- Cortesia p16.
- Último p4.
- Wagner p9 -> nº2.

### Domingo 04/10 — exceção eleitoral
- não é roleta integral única;
- há duas roletas: manhã e tarde;
- registrar cada folha como evento separado;
- não usar hindsight para alterar escolhas depois do resultado;
- eventual 2º turno de 25/10/2026 segue a mesma estrutura de manhã + tarde.

### Presença semanal
As contagens atuais de Sabrina/Brenda e Laura estão contestadas e devem ser reconciliadas diretamente das folhas/fontes originais. Não usar overrides antigos como autoridade.

### Delivery
- LOCAL-FIRST / LVR.
- `.sfjm/project.json`: porta 8082, rota `/`, `remoteIterationAllowed=false`.
- NO PREVIEW / NO REMOTE ITERATION.
- push/deploy somente com intenção explícita.
- PR #2 mergeado em main.
- produção Vercel verificada READY para o commit `4b4f3b5a1d752b6f78f59d45f09820c13759d20d`.
