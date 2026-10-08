Gemini draft converter (isolated)

Run node tests/gemini-intake-converter.test.cjs.
Import gemini-intake-converter.js as CommonJS or browser global RoletaGeminiConverter. Call convertGeminiDraft(geminiJSON, printBrokersDTO).
No automatic import, print, saving, deployment, or statistical persistence. Output stays PENDENTE_REVISAO; helbor, share and class allocation remain human review items. Consult docs/PRINT_TEMPLATE_V2.md before wiring to UI.

UI integration: gemini-draft-ui.js renders a separate read-only preliminary review above the canonical importer. The panel accepts Gemini JSON or a .json file, reconciles against /data/print-brokers.json and shows every pending issue; **no transition to the canonical importer is enabled yet**. The existing RLT-PRINT-V2 gates remain untouched. Next stage requires explicit human correction/classification and documented structural gate before enabling a transfer.

Camera/gallery phase (08/10/2026): New preliminary UI buttons Tirar foto and Escolher da galeria use separate mobile file pickers. Camera uses capture=environment; gallery does not enforce capture. Accept JPEG/PNG/WebP up to 12 MB. A local object-URL preview and a legibility/orientation confirmation precede any future upload. No credentials or Make webhook URLs in browser source; Send stays disabled until a server-side relay with authorization, rate limiting and controlled upload is built and tested. Existing GPT copy/paste, file JSON import, validation and print logic unchanged. Some browsers may present a chooser rather than launching a camera directly. No image was transmitted by this UI yet.

## Secure Make relay (PR #22; not deployed)

Vercel serverless route: `POST /api/roleta-ocr`, content type `image/jpeg`, `image/png` or `image/webp`. Browser sends the selected image as a binary request with `X-Roleta-Filename` and `X-Roleta-Access-Token`. Server creates multipart `file` for the existing Make webhook; parses and returns `{status:"PENDENTE_REVISAO",source:"make-gemini",result:{linhas:[...]}}`. It never calls the canonical PDF/save workflow.

Vercel project **roleta**, environment variables (server-side only, never NEXT_PUBLIC_*):
- `ROLETA_MAKE_WEBHOOK_URL`: Make custom webhook URL (HTTPS, hook.*.make.com). Rotate any previously disclosed webhook before production.
- `ROLETA_UPLOAD_ACCESS_TOKEN`: independently generated random secret at least 24 characters; tell operators out of band. Users type this code in the photo panel; it is not persisted in browser storage.
- Configure the variables for the target deployment environment, then redeploy. In development on localhost, a serverless backend must be running; a static file server cannot serve /api.

Vercel has a request body limit on serverless functions: this implementation restricts uploads to **4 MiB**. Do not send more than this size. The API checks original MIME, image signature, same-origin request, token, Make HTTP status, and JSON shape. Do not mistake a successful response for human approval.

**Production security gate:** deploy behind Vercel firewall rate limiting / bot protection (or an external durable rate limiter). Origin + operator access token alone is NOT sufficient to guarantee anti-brute-force protection. Configure cost/quota safeguards for Make and Gemini. Do not expose the Make webhook publicly in frontend code or commit it to Git. Review provider data-processing/privacy terms before production. Do not merge before CI and mobile end-to-end tests.
