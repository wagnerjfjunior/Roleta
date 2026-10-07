# Roleta — Current Handoff

## CURRENT STATE — 2026-10-07

canonical repo: `wagnerjfjunior/Roleta`
canonical production ref: `main`
last resolved main HEAD: `bbc1be468e1f1a742a8bf81dd1b527af3d9a365e`
active development branch: `data/prospective-adjudicate-2026-10-05`

## Canonical data
- 85 logical events;
- 84 complete validated permutations;
- 81 quality A / 4 quality B;
- one partial event excluded from complete-permutation tests.

## Nominal ledger
- GitHub consolidated nominal file: `data/full_draws_reconstructed.csv`.
- imported coverage: 51 events / 1093 participant rows.
- canonical result ledger contains 85 events and is authoritative for model generation.
- 02/10 nominal full-sheet backfill remains a data-quality follow-up. 03/10 is positionally transcribed, but nominal identity is quarantined pending human resolution of Sabrina's physical row.
- 04/10-T corrected: p12/p13 crossed out; Sabrina p11 drew 12 = Último; Wagner p14 drew 9.

## IDENTITY RECONCILIATION GATE
- registry: `data/brokers-official.csv`;
- code: `reconciliation/identity.js`;
- audit queue: `data/identity-reconciliation.jsonl`;
- team/manager is tie-break only, never primary identity evidence;
- fuzzy/ambiguous candidates require human confirmation;
- only exact/explicit-alias/human-confirmed identities can become canonical for broker statistics;
- 03/10 is `PENDING_HUMAN_IDENTITY`;
- nominal 06/10 reprocessing stays blocked until this gate is applied.

## Production
PR #3 is merged into main. RLT-M4/RLT-M5 simulation/prospective work is now canonical in repository main. No production deploy was performed as part of the merge.

## Active branch
The active branch contains:
- Simulation Lab through RLT-M4-06 Adaptive Meta;
- canonical Simulation Lab documentation;
- RLT-M5-01 prospective statistical/architecture protocol;
- first RLT-M5-01 weekly Overview prototype.

## RLT-M5-01 decision
Two review gates completed:
- Statistical Modeling / Experimentation: PASS_WITH_RESIDUAL_RISK.
- Software Systems Architecture: PASS_WITH_RESIDUAL_RISK.

Canonical protocol:
`docs/PROSPECTIVE_LEDGER.md`

Core contract:
- WEEKLY_FROZEN = pre-cravado before the week and official V1 operational recommendation;
- CURRENT = recommendation revised after newly completed real roulettes, retained as diagnostic/experimental only;
- EXECUTED_CHOICE = position actually used;
- RANDOM_SHADOW = frozen random operational control;
- theoretical chance = primary null benchmark;
- primary endpoint = 2X;
- all revisions append-only;
- each new real roulette can recalculate every still-unresolved future event;
- frozen/adjudicated records never change;
- no hindsight;
- model may ultimately be classified COMPATÍVEL COM ACASO.

## Prototype
Files:
- `data/prospective/prototype-week.json`
- `prospective/ui.js`
- `docs/PROSPECTIVE_LEDGER.md`
- supporting styles in `styles.css`
- script registration in `index.html`

Prototype behavior:
- replaces only the redundant Overview family-summary card;
- dedicated Family page remains intact;
- shows week 05–11/10/2026;
- weekdays expose morning/afternoon events;
- Saturday/Sunday expose integral events;
- Wagner, Laura, Brenda and Helena appear in every event;
- displays Pré / Atual / Histórico / Usado / result status;
- no predictive number is invented: placeholders remain `—` until real generation/freeze exists;
- prospective scorecard starts at zero and is explicitly non-conclusive;
- historical morning/afternoon ranking cards were removed from Overview and moved to Modelos & estatística with explicit NÃO PROSPECTIVO labeling.

## Election exception
04/10/2026 remains two separate events: morning and afternoon.
Do not create an integral event for 04/10.
25/10 follows the same dual-event rule only if a second round occurs.

## Presence
Sabrina/Brenda and Laura 28/09–02/10 remain contested. Reconcile from original sources only.

## SFJM
- LOCAL-FIRST / LVR;
- preferred port 8082;
- route `/`;
- NO PREVIEW;
- NO REMOTE ITERATION;
- same branch for corrections;
- merge only after explicit approval;
- production only after explicit approval.

## PROSPECTIVE WEEK 05–11/10 — FROZEN
Freeze timestamp: `2026-10-04T20:04:19-03:00`.
Cutoff: `04-10-T`.

Generated from 83 canonical events:
- 48 WEEKLY_FROZEN — immutable;
- 48 CURRENT initial — DRAFT/revisable;
- 48 RANDOM_SHADOW deterministic chains — frozen.

Initial allocations in order Wagner / Laura / Brenda / Helena:
- morning: 14 / 3 / 5 / 4;
- afternoon: 22 / 18 / 16 / 20;
- integral: 21 / 4 / 8 / 12.

Important correction:
CURRENT is not frozen for the entire week. It remains revisable and is frozen only before the operational choice for its own target event.

## NEXT SAFE ACTION
Complete review of PR #11 with the identity-reconciliation gate active. Keep 03/10 nominal identities quarantined until Sabrina's physical row is human-confirmed. Only after the PR is clean may nominal 06/10 be reprocessed; unresolved names must never enter broker-level statistics.

## Bootstrap
`Ative o SFJM do projeto Roleta, resolva main ao vivo em wagnerjfjunior/Roleta, leia .sfjm/project.json, handoffs/CURRENT.md, docs/NEXT_SAFE_ACTION.md e docs/PROSPECTIVE_LEDGER.md, recupere a branch ativa e continue somente pela próxima ação segura canônica.`


## RLT-M4-07 Weekly Frozen vs Current
Implemented on the active branch:
- `simulation/weekly-duel.js`;
- `simulation/weekly-duel-worker.js`;
- `simulation/weekly-duel-ui.js`.

Purpose:
test whether intra-week Current recalculation adds value over Weekly Frozen using paired complete synthetic weeks while keeping the real V1 policy fixed.

First required control: 10,000 weeks / NULL / seed `weekly-duel-2026`.
No simulation result may rewrite the live frozen week 05–11/10.


## RLT-M4-07-v2 paired-valid correction
The first 10,000-week NULL run returned Weekly O/E 0.993, Current O/E 0.996 and Random O/E 1.004, which is compatible with chance.

However, Weekly and Current had different valid-opportunity counts due to primary/fallback eligibility. Therefore raw hit delta is not a fair quality comparison.

New branch:
`feat/rlt-m4-07-paired-valid-metrics-20261004`

RLT-M4-07-v2 now reports:
- operational eligibility/coverage separately;
- paired-valid quality only where both strategies have valid positions for the same person/event;
- paired-valid Δ hits;
- paired-valid Δ O/E;
- paired-valid Δ excess over chance;
- paired-valid win rates and quantiles.

Next gate: rerun 10,000-week NULL with seed `weekly-duel-2026`. Do not proceed to signal scenarios until paired-valid NULL passes.


## RLT-M4-07-v2 final decision
The 50,000-week paired-valid scenario battery is complete.

Operational decision:
- WEEKLY_FROZEN = official recommendation.
- CURRENT = diagnostic/experimental track only.
- no automatic switching from Weekly to Current.
- UI updated to use "Oficial" and "Diagnóstico".
- row result marker now follows WEEKLY_FROZEN adjudication.
- frozen real week 05–11/10 remains unchanged.
- next evidence phase is prospective real-world performance vs theoretical chance.


## DAILY ROULETTE PRINT WORKFLOW

Canonical instructions are documented in `docs/PROJECT_STATUS.md` under **Daily operational roulette / print protocol**.

Mandatory invariants:
- G&G is the master broker registry for official name / CRECI / manager / director.
- BASE DIA is the pre-draw position sheet.
- final printed sheet is the highest-authority period record when supplied.
- handwritten/OCR names must be validated against G&G; ambiguous names require user confirmation before PDF generation.
- complete line-by-line transcription is required; never reduce an event to only special outcomes.
- approved print columns: Nº / CORRETOR(A) / CRECI / GERENTE / DIRETOR / STATUS CRECI.
- do not include VALIDADE CRECI.
- alternating broker rows: white / light gray.
- TOP 5 remains untouched; recent-specials card is independent.
- reception queue is a separate operational layer from the Tegra roulette.
- operational rule: validate first, transpose second, print third.

Confirmed print-reference event: 04/10/2026 afternoon, Caminhos da Lapa, final order Turmalina / Globz / Paola / Veri / Valeria / Katio / Lotus / Aline / Wagner / Nina / Sanches / Sabrina.


### Participation classes
Final-sheet participants must be separated into three classes:

- **SALÃO**: above cutoff bar, participates in draw, counts in event N, eligible for spontaneous walk-in rotation.
- **STAND-BY**: below cutoff bar / late arrival; does not participate in draw, does not count in N, does not receive spontaneous walk-in rotation, but **presence counts for weekend qualification** and broker may serve indication/own-client arrivals.
- **ON-LINE**: online broker physically present at plantão; listed so reception knows broker is onsite for appointments/own clients; does not count in salão N merely by appearing in ON-LINE block.

Print layout must keep the main SALÃO table first, then independent full-width **STAND-BY** and **ON-LINE** sections when present. If both exist, keep them on the same page when space allows, visibly separated. Do not include VALIDADE CRECI in any block.

The cutoff bar is a business boundary. Never ingest a below-bar STAND-BY broker into the salão permutation or N. Preserve the class separately because STAND-BY can be present for weekend qualification while ineligible for that period's draw.


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


## RLT-PRINT-V1
Canonical print layout is defined in `docs/PRINT_TEMPLATE_V1.md`.

Do not reconstruct the PDF layout from memory. Read the canonical spec before changing print generation.

Critical invariants:
- A4 portrait;
- one shared six-column coordinate grid across header and every table;
- aligned vertical boundaries;
- company draw at top-right, results underneath;
- no Tegra-count cell in header;
- conditional STAND-BY / ON-LINE blocks;
- no VALIDADE CRECI;
- zebra rows;
- validation gate before print.

Accepted visual reference: `roleta_teste_09-08-2025_manha_v3_alinhada.pdf`.


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

## RLT-PRINT-V2 — CURRENT OPERATIONAL STATE — 07/10/2026

Canonical implementation work is on:
`feature/rlt-print-company-draw-review-20261007`

PR:
`#19 feat: validar quantidade Helbor e sorteio de empresas`

Base main at branch creation:
`3336af73799140910eee2ed7bd86e3257020cfe9`

Canonical specification:
`docs/PRINT_TEMPLATE_V2.md`

Implementation audit/changelog:
`docs/RLT_PRINT_V2_CHANGELOG_2026-10-07.md`

### Final workflow

```
Skill/photo transcription
-> JSON import
-> structural gate
-> mandatory human review
   -> HELBOR quantity
   -> company share/mode/positions
   -> SALÃO
   -> STAND BY
   -> ON-LINE
-> reviewed payload
-> final preview
-> explicit human confirmation
-> Print OR Save as PDF
```

### Mandatory invariants

- imported JSON is transcription only, never direct print authority;
- human review is mandatory before final preview;
- broker changes resolve through the official registry DTO and replace CRECI/manager/director/status atomically;
- SALÃO, STAND BY and ON-LINE remain distinct;
- STAND BY/ON-LINE may be added or removed manually;
- every edit invalidates prior approval and disables output until revalidation;
- HELBOR participant quantity is independently editable;
- company draw supports Share Tegra / No Share / Share Helbor;
- Share Tegra complements the single Helbor position;
- Share Helbor complements the single Tegra position;
- no-share requires distinct single positions;
- hidden fields must remain truly hidden;
- numero_exposto=false must never leak the drawn number;
- Print and Save as PDF use one renderer;
- print target is A4 portrait, one page under normal event volume;
- zebra white/light-gray is mandatory;
- operational print typography target is ~13pt on broker rows;
- current six-column proportions: 7 / 21 / 17 / 19 / 12 / 24 percent.

### 07/10/2026 acceptance evidence

Human review corrected the initial transcription to the official sheet, including:
- p3 Nair;
- p5 Nina;
- p8 Turmalina.

The flow also demonstrated manual recovery of omitted STAND BY entries.

Company-draw rule tests passed:
- Share Tegra HB1 -> TG2-3;
- Share Tegra HB2 -> TG1-3;
- Share Tegra HB3 -> TG1-2;
- inverse Share Helbor mappings;
- no-share distinct positions;
- duplicate no-share position rejected.

### Promotion gate

Before merge of PR #19:
1. locally validate final header controls;
2. validate one-page print/PDF;
3. validate zebra survives print/PDF;
4. validate ~13pt readability;
5. validate SORTEIO DE EMPRESA fits without clipping;
6. validate Print and Save as PDF both derive from the same reviewed payload;
7. merge only after explicit user approval.

Do not reopen the old direct JSON -> print path.
