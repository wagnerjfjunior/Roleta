# RLT-OPS-02 — OCR.space Shadow Reconciler (experimental)

## Security status

This is an **offline, read-only diagnostic**. Not linked to Make, Vercel production, webhook response, A4 print pipeline or statistical ingestion. No new endpoints, secrets, credentials, third-party dependencies or network requests.

## Inputs

- OCR.space successful `ParsedResults[0].ParsedText` (or full OCR payload using `fromOcrSpaceResponse`);
- Trusted `data/print-brokers.json` generated from official CSV (do not accept roster from OCR user input).

## Deterministic guarantees

- OCR original names and physical positions preserved.
- Unique exact match: official metadata attached; not a human approval.
- Similarity candidate: **suggestion only**, never automatic substitution or printing.
- Ambiguous official duplicates: blocked.
- Blank or absent names: blocked.
- Source text input limit, roster item limit, physical positions and order validation.
- No inferred or synthesized draw numbers; no reference to ground truth PDF in algorithm.
- No claims that official roster manager was *visually read* from the image.
- Every output has `autorizado_impressao=false` and `autorizado_base_estatistica=false`.

## Known limitations / next hardening gates

1. OCR.space emits independent text blocks. Name ↔ manager and number mappings **are not yet verified**. Do not use these fields to confirm identity without proof of original physical alignment.
2. Fuzzy matching needs controlled precision/recall benchmark; 0.55 is only a **candidate retrieval** threshold, not an auto-correction confidence.
3. Need test fixtures with original images, human validated outputs, source hashes, timestamps, and immutable audit IDs (no actual photo secrets in git).
4. Need additional data consistency tests for unusual layout, OCR column interleaving, 0/1/2/3 HELBOR configurations, duplicate names and historical roster changes.
5. Do not connect to production Make Router until shadow failure isolation, timeout, concurrency and storage policies have been designed, reviewed and tested.
6. Run `node --test scripts/ocrspace-shadow-reconciler.test.cjs` in local checkout. No release/merge before test evidence and review.

## Sample

The 06/10/2026 morning image OCR returns 15 exact salon names + Ashley exact; 6 approximate salon names retained for human confirmation, and blank rows blocked. PDF human validation is a reference **only for tests/evaluation**, never input to the reconciler.


## Vercel internal endpoint (branch only, NOT deployed)

`POST /api/ocr-reconcile` with server-side environment variable `ROLETA_OCR_SHADOW_TOKEN` (random, at least 32 characters). Authenticate from Make with `Authorization: Bearer <secret>`; use HTTPS and application/json. Do not commit the secret; do not send it to ChatGPT. The endpoint rejects missing or invalid auth, unexpected methods/content type and payloads above size constraints. The Make HTTP 26 `data.ParsedResults[1].ParsedText` is the value to map into `parsedText`, not the full HTTP module object.

Sample diagnostic request (illustrative; secret omitted):

```json
{"event_id":"20261006-M-001","parsedText":"***Corretor***\n1 Gloszy\n2 Prina\nDATA - 06/10/2026"}
```

**No persistence exists in this endpoint.** To measure accuracy reliably, version the official human-approved source and persist original Gemini, original OCR.space, corrected OCR, and human truth using a single event ID, unique run ID and atomic idempotency controls. Store independently from statistical draw records but linked by event ID. Reprints do not produce new events or evaluations; human revisions create versioned truth, not a rewrite of prior snapshots. Define access control, PII retention and audit policy before creating writable endpoints.

**Fallback is NOT active.** A real fallback needs:
1. A failover selector in the official Make/Vercel pipeline with one authoritative Webhook Response.
2. Sufficiently validated physical-position-to-number parsing: the current parser only handles names and cannot generate safe RLT-PRINT-V2 diagnostic JSON.
3. Strict timeouts/error handlers with independent OCR.space failure and no retries that double-store events.
4. Separate feature flag, dark launches and human review; never auto-save official statistics based on machine output.

**Hardening gate:** run all Node tests, perform adversarial auth/body/schema testing, review Vercel branch deployment policies and operational rollback, then obtain explicit approval before merging or wiring Make.


## Proveniência de DIRETOR/GERENTE — 09/10/2026

Uma fotografia integral pode apresentar o diretor **Renan repetido em todas as linhas**, porque DIRETOR é uma coluna por participante. Fotografias cortadas podem omitir essa coluna. **Não tratar repetições legítimas como spam e não exigir que a coluna esteja visível**.

- `diretor_oficial` e `gerente_oficial`: dados obtidos **somente após match exato e único** com o cadastro oficial.
- `diretor_ocr` e `gerente_ocr`: `null` quando não há associação visual confiável à posição física.
- `evidencia_diretor.diretor_ocr_nao_vinculado`: texto que apareceu no bloco de diretor sem coordenadas alinhadas, apenas evidência geral.
- `evidencia_diretor.diretor_ocorrencias`: quantidade de tokens textuais plausíveis no bloco, **não é contagem de corretores nem prova de correspondência individual**.
- `evidencia_diretor.alinhamento_por_linha=false`: impede atribuir um texto OCR solto a uma posição específica.
- As correções fuzzy mantêm `confirmado=null` e exigem revisão humana.
- Cabeçalho DATA/PERÍODO pode vir antes dos nomes; não interromper o bloco apenas por isso.
- Quando OCR mistura colunas ou reinicia índices, sinalizar `OCR_COLUMN_ALIGNMENT_UNVERIFIED`. Não completar números ou gerentes por ordem suposta.
- As posições após a última linha sorteada podem incluir Stand-by, Online ou linhas vazias; o parser **não determina a classe operacional** automaticamente.

A segunda amostra contém coluna DIRETOR repetida e cabeçalho fora da ordem textual esperada. O teste de regressão usa padrão reduzido representativo, não todo o texto OCR original. Antes de produção, anexar como fixture auditável com hash/proveniência e executar validação com a amostra integral.

## Gate estrutural independente — 09/10/2026

`scripts/ocrspace-shadow-structural-gate.cjs` inspeciona a saída original do Gemini sem modificar nenhum campo. Separa números válidos, números inválidos, duplicidades, lacunas, nomes sem sorteio e posições vazias; contesta `quantidade_corretores` quando difere de linhas numeradas. Em modo SHADOW, nenhuma condição libera impressão ou gravação.

**Não deduzir STAND BY ou ON-LINE apenas de nome sem número**. A classe exige revisão humana e evidência da folha. Para a amostra 06/10 TARDE, os nomes das posições 29 e 30 são STAND BY exclusivamente porque foram confirmados pelo usuário, em referência parcial separada.

O gate não valida a leitura visual da fotografia: uma permutação numericamente válida pode conter transcrição errada. Não reescrever `quantidade_corretores` nem completar a sequência por heurística.
