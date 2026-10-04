# Roleta — Current Handoff

## CURRENT STATE — 2026-10-04

canonical repo: wagnerjfjunior/Roleta
canonical ref: main / resolve live
last resolved head: 4b4f3b5a1d752b6f78f59d45f09820c13759d20d

Dataset:
- 81 eventos lógicos;
- 80 permutações completas validadas;
- 77 qualidade A;
- 4 qualidade B;
- 1 evento parcial fora dos testes de permutação.

Dashboard:
- Workspace V3 em produção;
- páginas: Visão geral, Minha família, Ranking, Fim de semana, Modelos & estatística;
- responsividade mobile RLT-M3-04 corrigida e validada localmente;
- produção atualizada pelo deploy Git->Vercel do main;
- deployment verificado READY, sem erros de runtime detectados na janela pós-deploy.

Mecânica:
- posição física != ordem efetiva != número sorteado;
- sorteio sem reposição, bolas 1..N;
- segunda a sexta: duas roletas, manhã e tarde;
- fim de semana: regra geral de uma roleta integral por dia;
- exceções eleitorais 2026: 04/10/2026 e eventual 25/10/2026 operam com duas roletas, manhã e tarde.

RED TEAM V3:
- 2X = Nº1 ou Último;
- 3X = Nº1 + Cortesia + Último;
- 4X = Nº1 + Nº2 + Cortesia + Último;
- Sequential Draw Audit separado;
- nenhum modelo demonstrou edge robusto;
- não converter líder histórico em promessa preditiva.

Eventos recentes:
- 01/10 manhã: Wagner p14 -> nº7; frozen 2X = MISS.
- 02/10 manhã: Wagner p14 -> nº8; frozen 2X = MISS.
- 02/10 tarde: modelo p9 -> MISS; Wagner p14 -> nº13 = HIT Último.
- 03/10 sábado: evento único integral, N=29; Nº1 p23; Nº2 p9; Cortesia p16; Último p4; Wagner p9 -> nº2 = HIT 4X, MISS 2X/3X; Brenda/Sabrina p28 -> nº11; Laura p25 -> nº20.

04/10/2026 — domingo eleitoral:
- exceção operacional confirmada: duas roletas no mesmo domingo, manhã e tarde;
- não tratar 04/10 como evento integral único;
- não adjudicar nem recalcular resultados sem as folhas/resultados observados;
- 25/10/2026 deve seguir a mesma exceção somente se houver 2º turno.

Presença semanal:
- contagens atuais de Sabrina/Brenda e Laura continuam CONTESTADAS;
- não usar overrides antigos como autoridade;
- reconciliar 28/09 a 02/10 diretamente das folhas/fontes originais.

Delivery:
- LOCAL-FIRST;
- LVR habilitado em .sfjm/project.json;
- porta preferida 8082, rota /;
- NO PREVIEW;
- NO REMOTE ITERATION;
- push/deploy somente com intenção explícita;
- fluxo operacional acordado: branch dedicada -> alteração -> validação local via LVR -> correções na mesma branch -> aprovação explícita -> merge -> produção;
- não usar patch manual como mecanismo padrão de execução local.

Última entrega:
- branch: fix/rlt-m3-04-mobile-workspace-v3-20261004;
- PR #2 mergeado;
- main: 4b4f3b5a1d752b6f78f59d45f09820c13759d20d;
- produção: READY.

NEXT SAFE ACTION:
RLT-M3-05 — receber e incorporar separadamente as duas roletas de 04/10/2026 (manhã e tarde), adjudicar os números prospectivos sem hindsight, reconciliar presença pendente e continuar Champion vs Challengers.

## Bootstrap para nova conversa
Use: `Ative o SFJM do projeto Roleta, resolva main ao vivo em wagnerjfjunior/Roleta, leia .sfjm/project.json, handoffs/CURRENT.md e docs/NEXT_SAFE_ACTION.md e continue somente pela próxima ação segura canônica.`
