> **Publicação posterior — 13/10/2026:** UX mergeada na PR #109, commit funcional `34cde4e`, Vercel READY e 239 testes registrados na publicação. Estados locais/sem produção abaixo são históricos. Consolidação em [HANDOFF_2026-10-13_OCR_DICTIONARY.md](HANDOFF_2026-10-13_OCR_DICTIONARY.md). Não reconstruir as interfaces existentes.

# Roleta — UX local trial — 13/10/2026

Status: test branch published with operator authorization. No main merge or deployment. Visual acceptance pending in the operator's Live Sync.

## Baseline and scope

Main resolved live: `470993d1bd29d44b7a6b25db7c1398b799179c13`.
Both `/simples/` and `/sorteador/` were already in main and production; eight production assets matched main byte-for-byte. This is an improvement to those existing interfaces, not a new application or Sites migration.
Local branch: `feature/ux-entry-review-20261013`.
The operator approved testing the proposed restrained real-estate visual direction. Existing authorized accounts remain unchanged; broader access is not authorized.

## Implementation

- `/simples/` opens with a Google sign-in introduction, then a two-activity menu.
- Signed OAuth flow retains only the exact approved `/simples/` return destination. Other values fall back to the existing Intelligence route. PKCE, state, signed cookies, account allowlist and backend authorization remain in force.
- Digitalization has four stages: photo, line review, final-sheet review, ready.
- Photo wording is simplified; technical file measurements stay out of the main flow.
- Rotation updates the actual upload image, recompresses through the existing preparation service and resets photograph confirmation.
- Line review gets a photo reference, zoom, hide/show controls and next-pending-line action. Desktop uses columns; mobile uses a bounded sticky reference.
- Manual JSON remains in the existing Intelligence interface; no JSON action is exposed in the simplified broker flow.
- Save-to-history controls are restored; document output actions remain separate from persistence.
- Sorteador's main-menu link returns to `/simples/`. Its random selection, history, completion and sound mechanisms are not rebuilt.

## Local-only mode

Existing Live Sync is static and does not execute `/api/auth/session` or Google OAuth. An explicitly labeled interface-test button appears only on localhost/loopback hostnames. It does not create a session, authorize OCR, change the backend allowlist, or authorize persistence. Backend APIs retain their existing checks. No such test action is exposed on production hostnames.

## Verification

36 Node tests passed across Google signed-session and safe return routing, photo preparation, human line checks, review bridge, mobile-review structure, OCR relay authorization, final-roulette authorization/contracts and cryptographic draw behavior. Syntax and diff-whitespace checks passed.

Not verified in this iteration: rendered desktop/mobile layout, camera/rotation interaction on iPhone, real OAuth roundtrip, real OCR/persistence or print/share after the visual changes. No visual acceptance or comprehensive security certification is claimed. The development runtime has no exposed local browser forwarding/control-browser capability, and cannot access the operator's localhost.

## Next safe action

1. Make this branch available to the operator's existing Live Sync only after explicit push authorization, as required by `.sfjm/project.json`.
2. Validate entry/menu, four steps, photo reference/zoom, manual JSON, rotation upload orientation and final output controls at desktop and mobile widths.
3. Fix observed issues locally. Preserve existing human-review and storage invariants.
4. Main merge and production promotion require explicit operator intent. No Preview deployment.

## Operator feedback — 13/10/2026

Removed duplicate Google login in digitalization. The entry owns authentication; session expiration sends the operator back there. Local test mode remains clearly identified and cannot authorize backend operations. Replaced four button-shaped step labels with a non-interactive native progress indicator and the current step text. Removed the JSON shortcut from the simplified flow; retained existing technical/manual paths in Intelligence.

## Architectural background and Sorteador UX — 13/10/2026

The operator reported that the background image was missing and Sorteador retained its previous visual treatment. Added `assets/real-estate-background.webp` (1672 × 940, approximately 247 KiB), generated using the built-in image tool and optimized for the application. Prompt: a photorealistic generic contemporary residential architectural scene in São Paulo, pale stone/glass balconies, gardens, morning sunlight, navy and restrained green tones, wide composition with calm left-side space; no text, logos, currency, people or depiction of a named development. This is fictional architectural atmosphere, not a factual image of Caminhos da Lapa.

Both interfaces now share the image, navy/green palette and readable surfaces. Sorteador has a prominent setup introduction and form; desktop draws and results appear in adjacent columns, with the result sequence in a bounded panel. Mobile stacks those sections, uses large controls and a sticky action within the draw card. Completed draws offer an action to digitalize the sheet. Added session-state labels and focus on the primary draw action. Cryptographic engine and local-history contracts remain unchanged.

12 focused tests passed (draw engine, safe OAuth return, signed sessions and protected OCR relay); HTML tags balanced and IDs unique in both pages. Rendered desktop/mobile, iPhone capture and real operational acceptance still need validation in Live Sync. No production deployment.

## Familiar Google sign-in card — 13/10/2026

Operator supplied a screenshot of a centered white Smartsheet sign-in card. Simplified entry to a centered white card over the existing architectural background: Roleta identity, welcome heading, short description and one functional “Continuar com Google” button with a locally stored official Google G logo from `https://www.gstatic.com/images/branding/product/1x/googleg_48dp.png`. No email, Microsoft, Apple or local-account buttons are presented because those paths are not implemented. The same existing Google OAuth endpoint and safe `/simples/` return remain in use. Local-test and session-recovery behavior are preserved. Authentication/backend permissions unchanged; rendered acceptance still pending in Live Sync.
