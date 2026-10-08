Gemini draft converter (isolated)

Run node tests/gemini-intake-converter.test.cjs.
Import gemini-intake-converter.js as CommonJS or browser global RoletaGeminiConverter. Call convertGeminiDraft(geminiJSON, printBrokersDTO).
No automatic import, print, saving, deployment, or statistical persistence. Output stays PENDENTE_REVISAO; helbor, share and class allocation remain human review items. Consult docs/PRINT_TEMPLATE_V2.md before wiring to UI.

UI integration: gemini-draft-ui.js renders a separate read-only preliminary review above the canonical importer. The panel accepts Gemini JSON or a .json file, reconciles against /data/print-brokers.json and shows every pending issue; **no transition to the canonical importer is enabled yet**. The existing RLT-PRINT-V2 gates remain untouched. Next stage requires explicit human correction/classification and documented structural gate before enabling a transfer.

Camera/gallery phase (08/10/2026): New preliminary UI buttons Tirar foto and Escolher da galeria use separate mobile file pickers. Camera uses capture=environment; gallery does not enforce capture. Accept JPEG/PNG/WebP up to 12 MB. A local object-URL preview and a legibility/orientation confirmation precede any future upload. No credentials or Make webhook URLs in browser source; Send stays disabled until a server-side relay with authorization, rate limiting and controlled upload is built and tested. Existing GPT copy/paste, file JSON import, validation and print logic unchanged. Some browsers may present a chooser rather than launching a camera directly. No image was transmitted by this UI yet.
