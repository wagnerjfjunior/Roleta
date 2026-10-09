# Roleta — Project Status

## Estado vigente deste workstream — 2026-10-09

RLT-ARCH-01 está ativo na branch experimental `feat/ocrspace-shadow-reconciler-20261009`, PR #41, sem merge. Main verificada: `2ca0165992c97a7e5db601863236788fe1f18729`.

Arquitetura e inventário somente leitura estão documentados. A especificação de base comum e controle V1/V2 permanece pendente; nenhuma implementação, migração ou homologação operacional foi concluída nesta sessão.

Fonte de continuidade: [RLT_ARCH_01_CONTINUITY](sfjm/RLT_ARCH_01_CONTINUITY.md). Próxima ação: [RLT-ARCH-01](NEXT_SAFE_ACTION.md#rlt-arch-01). Contagens atuais: `data/manifest.json` e `docs/sfjm/CURRENT_DATA_STATE.json`; números históricos abaixo mantêm seu corte temporal. Outros workstreams não foram revalidados integralmente.

## Snapshot histórico — não usar como estado corrente de RLT-ARCH-01

## State — 2026-10-07

- canonical repository: `wagnerjfjunior/Roleta`.
- canonical production branch: `main`.
- resolved main HEAD for this work: `bbc1be468e1f1a742a8bf81dd1b527af3d9a365e`.
- active development branch: `data/prospective-adjudicate-2026-10-05`.
- branch was created from and remains based on current main; no remote preview is used.
- 85 logical canonical events.
- 84 validated complete permutations.
- 81 quality A / 4 quality B.
- 1 partial event outside complete-permutation tests.
- Workspace V3 is production-delivered on main.
- current viability state: EVIDÊNCIA INSUFICIENTE.
- no model has demonstrated robust real predictive edge.


## Identity reconciliation gate — canonical before broker statistics
- canonical registry: `data/brokers-official.csv`;
- implementation: `reconciliation/identity.js`;
- audit queue: `data/identity-reconciliation.jsonl`;
- exact official-name matches may resolve directly; explicit aliases may resolve directly;
- fuzzy matching only creates candidates;
- manager/team may only break ties among already-plausible candidates and never creates an identity candidate;
- fuzzy/ambiguous identities require explicit human confirmation before `CANONICAL_CONFIRMED`;
- unresolved identities are excluded from broker-level statistics;
- 03/10 remains `PENDING_HUMAN_IDENTITY` until Sabrina's physical row is human-confirmed;
- nominal reprocessing of 06/10 is blocked until this gate is applied.

## RLT-M4 Simulation Lab
- Monte Carlo laboratory remains isolated from canonical real data.
- RLT-M4-06 Adaptive Meta is implemented on the active branch.
- simulations validate methodology/robustness only and are not real predictive evidence.

## RLT-M5-01 Prospective Recommendation Ledger
- statistical gate: PASS_WITH_RESIDUAL_RISK.
- architecture gate: PASS_WITH_RESIDUAL_RISK.
- protocol canonicalized in `docs/PROSPECTIVE_LEDGER.md`.
- first UI/data-contract prototype implemented on the active branch.
- prototype uses `data/prospective/prototype-week.json`.
- prototype deliberately contains no invented recommendation numbers.
- Overview prototype replaces the redundant family summary card; the dedicated Family page remains unchanged.
- planned tracks: WEEKLY_FROZEN, CURRENT, EXECUTED_CHOICE, RANDOM_SHADOW, plus theoretical chance.
- primary confirmatory endpoint: 2X = Nº1 OR Último.
- 3X/4X are exploratory in V1.
- recommendation history is append-only; result never rewrites a frozen prediction.
- each new canonical roulette may recalculate all future unresolved events, including weekend.
- material model/policy changes require a new version/epoch.

## Real-event calendar
- weekdays: morning + afternoon.
- normal weekends: one integral event per day.
- 04/10/2026 election Sunday: morning + afternoon, not integral.
- 25/10/2026 uses the same exception only if there is a second round.

## Presence
Sabrina/Brenda and Laura counts for 28/09–02/10 remain contested. Original sheets/sources are authoritative; old overrides are not.

## Delivery / SFJM
- `.sfjm/project.json`: preferred port 8082, route `/`.
- policy: LOCAL-FIRST / LVR.
- `remoteIterationAllowed=false`.
- NO PREVIEW / NO REMOTE ITERATION.
- corrections remain on the active branch.
- merge requires explicit user approval.
- production requires explicit user approval.


## Nominal ledger consolidation
- `data/full_draws_reconstructed.csv` is now the GitHub-hosted consolidated nominal ledger available to this project.
- current imported nominal coverage: 51 events / 1093 participant rows, including 03/10, 04/10 morning+afternoon, and 05/10 morning+afternoon.
- this nominal ledger is auxiliary and does NOT replace the 85-event canonical result ledger in `data/manifest.json`.
- 02/10 still lacks full nominal transcription in the imported legacy source. 03/10 is fully transcribed positionally, but nominal identity remains quarantined because Sabrina's confirmed participation has no safely resolved physical row. Canonical event results remain authoritative.
- no global model/statistical aggregate may be recomputed from the 51-event nominal subset as though it were complete; `PENDING_HUMAN_IDENTITY` rows are excluded from broker-level statistics.
- 04/10 afternoon correction: positions 12 and 13 excluded; Sabrina p11 → nº12 → Último; Wagner p14 → nº9.


## Prospective week 05–11/10 frozen
- freeze timestamp: `2026-10-04T20:04:19-03:00`;
- data cutoff: `04-10-T`;
- canonical source universe: 83 events;
- 48 WEEKLY_FROZEN recommendations written;
- 48 initial CURRENT recommendations written as DRAFT/revisable;
- 48 deterministic RANDOM_SHADOW chains written and frozen;
- period allocations, family order Wagner / Laura / Brenda / Helena:
  - morning: 14 / 3 / 5 / 4;
  - afternoon: 22 / 18 / 16 / 20;
  - integral: 21 / 4 / 8 / 12;
- scorecard remains AMOSTRA_INICIAL until real target events are adjudicated.


## RLT-M4-07
Weekly Frozen vs Current paired-week laboratory is implemented on the active branch.
It compares fixed weekly predictions, continuously recalculated Current suggestions and a random control on the same synthetic weeks.
This is simulation-only and cannot mutate the frozen real prospective week.


## RLT-M4-07-v2 decision
Monte Carlo paired-valid policy duel completed at 50,000 weeks per canonical scenario.

Operational conclusion:
- WEEKLY_FROZEN becomes the official V1 recommendation surface.
- CURRENT remains a secondary diagnostic/experimental track.
- no automatic operational replacement occurs when CURRENT diverges from WEEKLY_FROZEN.
- this does not establish real predictive edge; the next evidence phase is prospective real-event validation against theoretical chance.

Key paired-valid findings:
- NULL: no artificial Current advantage.
- Stable period 3%: essentially neutral, slight Weekly advantage.
- Regime shift 3%: Weekly remained ahead.
- Weak signal + noise 1%: Weekly remained ahead.


## Daily operational roulette / print protocol

This section is canonical and anti-regression.

### Authority hierarchy
1. **G&G** = master broker registry for official broker name, CRECI, manager and director.
2. **BASE DIA** = pre-draw sheet where brokers choose/write their physical positions.
3. **Draw** = permutation 1..N that maps physical position to drawn number / final operational order.
4. **Final printed sheet** = highest authority for that period when available; it is the version delivered to reception.

Never use an uncertain handwritten/OCR spelling as the final broker identity when G&G can resolve it. Example already confirmed: `Fuzmalina` must resolve to **Turmalina**.

### Daily workflow
For every roulette:
1. receive the manual sheet photo;
2. transcribe every valid line, not only special outcomes;
3. preserve blank, crossed-out and excluded positions;
4. determine N from valid participants only;
5. validate every broker name against G&G;
6. if a name is ambiguous, stop and ask the user with a short list of likely G&G matches;
7. if none matches, require the user to provide the correct name;
8. only after all names are resolved, transpose by drawn number;
9. validate Nº1, Nº2, Cortesia and Último;
10. fill canonical name, CRECI, manager and director;
11. generate the approved A4 print sheet;
12. when the official final sheet photo is later supplied, compare line by line and canonize the event.

No final PDF may be produced with unresolved broker-name ambiguity.

### Approved print template
Header must contain:
- empreendimento;
- data;
- Tegra/day of week;
- período;
- Helbor broker quantity when supplied;
- company draw, e.g. `TG 1-2 / HB 3`.

Table columns:
1. Nº
2. CORRETOR (A)
3. CRECI
4. GERENTE
5. DIRETOR
6. STATUS CRECI

**Do not include the column `VALIDADE CRECI`.**

Visual:
- A4;
- zebra rows;
- first broker row white;
- next broker row light gray;
- alternate white/light gray through the table;
- light header background is acceptable;
- must remain legible on ordinary printing.

The first column is the **final post-draw order**, not the original physical position.

### Confirmed example — 04/10/2026 afternoon
Metadata:
- Caminhos da Lapa;
- 04/10/2026;
- Domingo;
- Tarde;
- HB 10;
- company draw TG 1-2 / HB 3.

Final official order:
1. Turmalina
2. Globz
3. Paola
4. Veri
5. Valeria
6. Katio
7. Lotus
8. Aline
9. Wagner
10. Nina
11. Sanches
12. Sabrina

### Special-result semantics
For an event with N valid participants:
- Nº1 = drawn number 1;
- Nº2 = drawn number 2;
- Cortesia = drawn number N-1;
- Último = drawn number N.

Special outcomes never replace the complete line-by-line event transcription.

### Ranking recency card
The existing TOP 5 must remain unchanged.
The separate lower Ranking card shows the two latest nominal roulettes with:
- Nº1;
- Nº2;
- Cortesia;
- Último de vez;
- canonical broker name;
- physical position when available.

This card is recency-only and must not change historical ranking or model scoring.

### Reception is a separate operational layer
The Tegra roulette final order is not the same object as the consolidated reception queue.
Reception may interleave brokers from different companies/teams and cross out consumed attendances.
Therefore `Último da roleta` is not equivalent to `próximo corretor a atender agora`.
Do not mix reception-queue state into Ranking statistics.

### Priority workflow when the responsible broker draws Nº1
When the responsible broker must carry the printed roulette to reception:
1. receive manual photo;
2. full transcription;
3. G&G validation;
4. resolve every ambiguity;
5. transpose;
6. fill CRECI/manager/director;
7. generate the approved A4 PDF immediately.

Goal: avoid requiring the user to open the operational spreadsheet and repeat the transposition manually.

### Anti-regression checklist
Before delivering a print PDF confirm:
- correct date, period and empreendimento;
- correct company draw and HB quantity when provided;
- correct N;
- complete valid-line transcription;
- every broker name validated;
- no unresolved ambiguity;
- final order matches the draw;
- Nº1, Nº2, Cortesia and Último are correct;
- CRECI, manager and director are not invented;
- no Validade CRECI column;
- white/light-gray zebra rows;
- printable A4 legibility;
- final official sheet, when available, supersedes preliminary transcription.

**Operational principle:** validate first, transpose second, print third.


### Participation classes: SALÃO, STAND-BY and ON-LINE

The final event sheet may contain up to three distinct participation blocks. They must never be merged for draw mechanics or statistical N.

#### SALÃO
- Brokers above the closing bar and admitted before the draw cutoff.
- Participate in the roulette draw.
- Count toward the event `N`.
- Receive spontaneous walk-in clients according to the final roulette order.
- Feed the canonical permutation and all Nº1/Nº2/Cortesia/Último statistics.

#### STAND-BY
- Brokers arriving after the cutoff bar, e.g. after 08:46 or 13:46.
- Their names are written **below the bar**.
- They do **not** participate in the roulette draw.
- They do **not** count toward the event `N`.
- They do **not** receive spontaneous walk-in clients through the salão rotation.
- Their presence **does count for weekend qualification/presence rules**.
- They may serve indication/own-client appointments: when the client arrives and names that broker, reception may call the broker because the broker is listed as present.
- They must be stored as a distinct class, e.g. `participation_class=standby`, never as a normal draw participant.

#### ON-LINE
- Primarily online brokers who, especially on weekends, may be physically working at the plantão.
- They do **not** enter the salão roulette unless explicitly admitted as a salão participant before cutoff.
- Their presence on the final sheet informs reception that the broker is physically available, especially for scheduled/own clients.
- They do **not** count toward the salão event `N` merely because they appear in the ON-LINE block.
- They must be stored as a distinct class, e.g. `participation_class=online`.

#### Printed layout for these classes
The print/PDF model must preserve visual separation:
1. main SALÃO table first;
2. a full-width separator/header row **STAND-BY** if standby brokers exist;
3. standby rows in their own block;
4. a full-width separator/header row **ON-LINE** if online brokers exist;
5. online rows in their own block.

If both STAND-BY and ON-LINE exist on the same day, both blocks remain on the **same page when space allows**, each clearly separated like an independent subtable.

The same approved columns may be reused in these lower blocks when data exist:
- Nº within that block;
- CORRETOR (A);
- CRECI;
- GERENTE;
- DIRETOR;
- STATUS CRECI.

Do not include `VALIDADE CRECI` in these blocks either.

The zebra-row rule applies inside each block and may restart at white after each section header.

### Closing-bar semantics
The physical line drawn on the manual sheet at the cutoff is a business-rule boundary:
- above bar = eligible SALÃO candidates;
- below bar = late arrival / STAND-BY unless explicitly identified otherwise;
- entries below the bar must never be silently promoted into the roulette permutation;
- the bar position must be captured during transcription when visible.

This distinction is mandatory because a STAND-BY broker can count as **present** for weekend qualification while remaining **ineligible for the current roulette draw**.

### Examples supplied as visual references
- 17/09/2026 final sheet shows a distinct **STAND-BY** block below the salão table.
- 26/09/2026 final sheet shows a distinct **ON-LINE** block below the salão table.

These examples define the expected visual hierarchy but do not override the event-specific contents of future sheets.


### Team fallback routing / último de equipe

The **GERENTE** field is operational, not merely informational. It identifies the broker's team for reception fallback routing.

When a client arrives asking for a specific broker:
1. reception first attempts to locate the requested broker;
2. if that broker is not available, the client must be routed to the **último de equipe**;
3. `último de equipe` means the last currently eligible/available broker in the roulette order who belongs to the **same gerente/team** as the requested broker;
4. if no broker from that same team is available, route the client to the **último de vez** according to the applicable reception/roulette flow.

Therefore:
- manager/team identity must be validated correctly before final print;
- a wrong manager can cause an operational routing error even if broker name and CRECI are correct;
- never invent or infer a manager when the master registry does not support it;
- future reception tooling should be able to derive team fallback from the canonical manager field and current availability state.

### Print-section conditionality
The final print layout is conditional:
- always render the main SALÃO table;
- render **STAND-BY** only when at least one validated standby broker exists;
- render **ON-LINE** only when at least one validated online broker exists;
- if neither exists, render neither lower block;
- if only one exists, render only that block;
- if both exist, render both, clearly separated and preferably on the same page when space allows.

The preview/validation step must explicitly show the detected counts before print, for example:
`SALÃO 18 · STAND-BY 3 · ON-LINE 0`.

Printing is forbidden while:
- any name is unresolved;
- a broker class is uncertain;
- the cutoff bar is unclear and affects class assignment;
- N is not reconciled;
- metadata needed for the final sheet is unresolved.


## Canonical print template — RLT-PRINT-V1
Canonical specification: `docs/PRINT_TEMPLATE_V1.md`.

Mandatory layout invariants:
- A4 portrait;
- one shared six-column grid for top company-draw header, metadata, SALÃO, STAND-BY and ON-LINE;
- all vertical boundaries must align;
- `SORTEIO EMPRESA` in the upper-right grid area with `TG X - X` and `HB X` directly underneath;
- do not show Tegra broker quantity in the header; derive SALÃO count from the validated broker list;
- empreendimento is event-specific and must be validated;
- STAND-BY and ON-LINE render only when populated;
- no `VALIDADE CRECI` column;
- white/light-gray zebra rows;
- printing remains gated by validation.

Accepted visual reference: `roleta_teste_09-08-2025_manha_v3_alinhada.pdf`.
Layout correctness is part of operational correctness; a misaligned PDF is rejected even if the data values are correct.


## RLT-PRINT-V2 deterministic handoff
Canonical spec: `docs/PRINT_TEMPLATE_V2.md`.

The Notion Skill is now data-only. It must return validated structured JSON and must not generate or design the PDF.

The app's Nova Roleta page now accepts the Skill JSON and applies a deterministic template with:
- exactly 6 body columns: Nº / NOME / CRECI / GERENTE / DIRETOR / STATUS CRECI;
- exactly 2 header rows;
- EMPREENDIMENTO merged over Nº+NOME;
- CAMINHOS DA LAPA as enterprise value;
- DATA;
- HELBOR quantity with weekday beneath;
- PERÍODO;
- SORTEIO DE EMPRESA with mandatory visual split TG X-Y | HB Z;
- conditional STAND-BY and ON-LINE blocks;
- no drawn-number column;
- no editorial title, validation prose, hash, evidence page or technical footer.

Printing is blocked unless payload.status=VALIDADO and the JSON passes all structural checks.


---

## RLT-PRINT-V2 — final operational workflow, 07/10/2026

The Nova Roleta print flow was materially revised after a real 07/10/2026 operational test exposed that a structurally valid Skill JSON could still contain nominal or block omissions.

Canonical rule is now:
**transcription is not authorization**.

Current architecture:
- Skill supplies structured transcription;
- app normalizes current flat schema and legacy schema;
- structural gate runs first;
- mandatory human-review layer runs second;
- official broker metadata is refreshed from `data/print-brokers.json`, derived from `data/brokers-official.csv`;
- human review covers HELBOR quantity, company draw/share, SALÃO, STAND BY and ON-LINE;
- final preview is generated only from the reviewed payload;
- Print and Save as PDF are locked until explicit final confirmation.

Company-share semantics:
- Share Tegra: Helbor gets one selected position, Tegra gets the other two;
- Share Helbor: Tegra gets one selected position, Helbor gets the other two;
- No share: each company gets one distinct position.

Current print contract:
- A4 portrait;
- one page under normal period volume;
- zebra white/light gray;
- approximately 13pt broker-row typography;
- grid proportions 7/21/17/19/12/24;
- no drawn-number column;
- no VALIDADE CRECI;
- SORTEIO DE EMPRESA receives the wide final column;
- PDF and print use the same browser-print renderer.

Canonical detail:
`docs/PRINT_TEMPLATE_V2.md`

Implementation chronology:
`docs/RLT_PRINT_V2_CHANGELOG_2026-10-07.md`

PR #19 remains the promotion vehicle for the final header/share/print refinements until explicitly approved.
