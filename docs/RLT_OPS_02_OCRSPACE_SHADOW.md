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
