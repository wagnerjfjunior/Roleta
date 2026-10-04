# Roleta — Current Handoff

## CURRENT STATE — 2026-10-04

canonical repo: wagnerjfjunior/Roleta
canonical ref: main / resolve live
last resolved head: dabe609ea295b2f537084d7389f71adee422f320

Dataset:
- 81 eventos lógicos;
- 80 permutações completas validadas;
- 77 qualidade A;
- 4 qualidade B;
- 1 evento parcial fora dos testes de permutação.

Dashboard:
- Workspace V3 em produção;
- páginas: Visão geral, Minha família, Ranking, Fim de semana, Modelos & estatística;
- pendência conhecida: responsividade mobile inadequada.

Mecânica:
- posição física != ordem efetiva != número sorteado;
- sorteio sem reposição, bolas 1..N.

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
- 03/10 sábado: N=29; Nº1 p23; Nº2 p9; Cortesia p16; Último p4; Wagner p9 -> nº2 = HIT 4X, MISS 2X/3X; Brenda/Sabrina p28 -> nº11; Laura p25 -> nº20.

Domingo congelado após sábado:
- Wagner: 9 (2X), reserva 22;
- Brenda: 5 (3X), reserva 4;
- Laura: 25 (4X), reserva 22;
- Helena: 23 (4X contexto weekend), reserva 14.

Presença semanal:
- contagens atuais de Sabrina/Brenda e Laura estão CONTESTADAS pelo usuário;
- não usar overrides antigos como autoridade;
- reconciliar 28/09 a 02/10 diretamente das folhas/fontes originais;
- participação no sábado não prova, sozinha, elegibilidade 5/10.

Delivery:
- LOCAL-FIRST;
- NO PREVIEW;
- NO REMOTE ITERATION;
- push/deploy somente com intenção explícita.

NEXT SAFE ACTION:
RLT-M3-04 — reconciliar presença semanal, corrigir responsividade mobile localmente e preservar os números de domingo congelados até o resultado.
