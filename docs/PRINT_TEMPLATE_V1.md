# PRINT TEMPLATE V1 — Roleta Tegra

Status: CANÔNICO / ANTIRREGRESSÃO
Version: RLT-PRINT-V1
Reference render: `roleta_teste_09-08-2025_manha_v3_alinhada.pdf`

## Purpose
Canonical print specification for the final roulette sheet generated after manual-sheet validation and draw transposition.

## Page
- A4
- Portrait orientation
- Single-page preferred when content fits
- Ordinary office-printer legibility is mandatory

## Grid invariant
The entire document MUST use one shared six-column grid.

The vertical column boundaries used by:
- top company-draw area;
- metadata header;
- metadata values;
- main SALÃO table;
- STAND-BY block;
- ON-LINE block;

must derive from the SAME six-column coordinate system.

Independent header widths are forbidden because they create visual misalignment.

Canonical columns:
1. Nº
2. CORRETOR (A)
3. CRECI
4. GERENTE
5. DIRETOR
6. STATUS CRECI

The column `VALIDADE CRECI` is explicitly excluded.

## Top header
The company draw sits in the upper-right portion of the shared grid.

First row:
- merged label: `SORTEIO EMPRESA`

Second row:
- `TG X - X`
- `HB X`

The two result cells must align to the underlying shared grid and may not float independently.

Do NOT place the quantity of Tegra brokers in this header.
The number of SALÃO brokers is derived from the validated main list.

## Event metadata
Must show:
- EMPREENDIMENTO
- DATA
- TEGRA (day of week)
- PERÍODO

The enterprise name must use the event's validated value.

## SALÃO
Always render the main SALÃO table.

Only valid pre-bar participants:
- participate in the draw;
- count in N;
- receive spontaneous plantão flow;
- feed Nº1/Nº2/Cortesia/Último statistics.

First column is FINAL POST-DRAW ORDER, not the original physical position.

## STAND-BY
Render this block only when at least one validated STAND-BY broker exists.

STAND-BY means:
- broker entered after the cutoff bar;
- does not participate in the draw;
- does not count in N;
- does not receive spontaneous salão rotation;
- presence counts for weekend qualification;
- can serve indication / own-client arrivals.

Use a full-width `STAND-BY` separator row aligned to the same shared grid.
Restart zebra rows at white.

## ON-LINE
Render this block only when at least one validated ON-LINE broker exists.

ON-LINE means:
- online broker physically present at the plantão;
- listed so reception knows the broker is onsite;
- does not enter SALÃO N merely for appearing in this block.

Use a full-width `ON-LINE` separator row aligned to the same shared grid.
Restart zebra rows at white.

## Conditional blocks
- SALÃO only -> render only SALÃO.
- SALÃO + STAND-BY -> render those two blocks.
- SALÃO + ON-LINE -> render those two blocks.
- SALÃO + STAND-BY + ON-LINE -> render all three.
- Never render an empty STAND-BY or ON-LINE table.

## Visual style
- broker rows alternate white / light gray;
- first broker row is white;
- next row is light gray;
- repeat throughout each block;
- header cells may use light gray;
- TG company-draw result may use light yellow;
- HB company-draw result may use light blue;
- no dark fills that reduce print legibility;
- no decorative elements that compromise alignment.

## Validation gate before print
Printing is BLOCKED while any of these remain unresolved:
- ambiguous broker name;
- uncertain SALÃO/STAND-BY/ON-LINE classification;
- unclear cutoff bar affecting class assignment;
- unreconciled N;
- incorrect or unknown event metadata;
- unvalidated manager when required for reception routing;
- draw transposition inconsistency.

Flow:
UPLOAD -> PREVIEW -> VALIDATION -> PRINT

No direct UPLOAD -> PRINT shortcut.

## Name validation
G&G is the master registry for current broker identity:
- official commercial name;
- CRECI;
- manager;
- director.

If handwriting is ambiguous:
1. offer a short list of plausible G&G matches;
2. require user confirmation;
3. if none matches, require the correct name.

Historical brokers absent from the current G&G may be preserved for historical tests, but missing registry fields must remain unknown; never invent them.

## Manager/team operational meaning
GERENTE is operationally significant.

If a client arrives asking for a specific broker and that broker is unavailable:
1. route to the `último de equipe`;
2. `último de equipe` = last available broker in the roulette order with the same manager/team;
3. if no same-team broker is available, route to `último de vez`.

Therefore a wrong manager assignment is a material operational error.

## Reference accepted test
Accepted aligned PDF layout:
`roleta_teste_09-08-2025_manha_v3_alinhada.pdf`

Reference classification:
- SALÃO: 16
- STAND-BY: 1 (David)
- ON-LINE: 0
- company draw: TG 2 - 3 / HB 01
- empreendimento: CAMINHOS DA LAPA
- orientation: portrait

This reference establishes the structural layout only. Future event content must come from that event's validated data.

## Acceptance checklist
- [ ] A4 portrait
- [ ] one shared six-column grid
- [ ] all vertical boundaries aligned
- [ ] company draw on upper-right grid area
- [ ] company-draw result directly below its label
- [ ] no Tegra broker-count cell in header
- [ ] correct empreendimento
- [ ] correct date
- [ ] correct day of week
- [ ] correct period
- [ ] correct TG/HB draw
- [ ] SALÃO present
- [ ] STAND-BY shown only if populated
- [ ] ON-LINE shown only if populated
- [ ] no VALIDADE CRECI column
- [ ] white/light-gray zebra
- [ ] all names validated or explicitly historical
- [ ] manager validated where available
- [ ] no unresolved ambiguity
- [ ] no clipping, overlap, or header/table misalignment

## Anti-regression principle
Layout correctness is part of operational correctness.

A PDF that contains correct names but misaligned columns is NOT acceptable for production use.
