# Google SSO para envio de fotografias — implantação controlada

## Escopo
OAuth 2.0 Google com PKCE S256 + state aleatório assinado, troca de código no backend e consulta HTTPS ao endpoint OIDC UserInfo do Google. Exige email_verified e allowlist de e-mails no servidor. Cria sessão HMAC (8h) em cookie HttpOnly, Secure, SameSite=Lax. Revalida allowlist a cada requisição. Não altera a importação GPT nem o processo canônico de impressão.

A migração é aditiva: /api/roleta-ocr aceita uma sessão Google válida e um cabeçalho X-Roleta-CSRF derivado da sessão, ou, temporariamente, o código antigo X-Roleta-Access-Token. Não remova a contingência antes de concluir o smoke test. Não use segredo no browser.

## Configuração obrigatória na Vercel (somente Production, campos secretos)
- ROLETA_GOOGLE_CLIENT_ID = OAuth Client ID do Google Cloud, aplicativo **Web application**.
- ROLETA_GOOGLE_CLIENT_SECRET = OAuth Client Secret.
- ROLETA_SESSION_SECRET = texto criptograficamente aleatório de no mínimo 32 caracteres (recomendável 48+ bytes).
- ROLETA_GOOGLE_ALLOWED_EMAILS = lista privada dos dois emails autorizados, separados por vírgula; não persistir no código.
- ROLETA_SITE_ORIGIN = https://roleta-tgv.vercel.app (sem barra final).

Google Cloud Console → Google Auth Platform → Branding: configurar consentimento e domínio autorizado; Audience: configurar usuários de teste enquanto em modo Testing, ou publicar conforme política do projeto. Data Access scopes: openid, email. Clients → Create OAuth Client → Web application:
- Authorized JavaScript origin: https://roleta-tgv.vercel.app
- Authorized redirect URI: https://roleta-tgv.vercel.app/api/auth/google/callback

No servidor: GET /api/auth/google/start → Google login → GET /api/auth/google/callback → cookie rlt_session → GET /api/auth/session → POST /api/roleta-ocr; POST /api/auth/logout limpa o cookie.

## Teste em produção antes de substituir código antigo
1. Confirmar CI e registrar deployment READY anterior para rollback.
2. Configurar credenciais e redirect URI com valor exato; conferir consent screen.
3. Autorizar login da primeira conta e da segunda; verificar ambos os e-mails individualmente e fluxo de sessão sem código.
4. Testar e-mail de terceiro e afirmar 403; testar POST sem CSRF e sem código e afirmar 401.
5. Testar logout, expiração e retorno ao login; testar upload 200 e leitura Gemini.
6. Confirmar importação GPT, correção humana e impressão inalteradas.
7. Revisar logs sem tokens/cookies, aplicar rate limiting e fechar contingência somente após aceite.

## Limitação e próximos controles
Sessões são stateless até 8h; logout remove cookie no navegador, mas não revoga cópia interceptada antes de expirar. Rotacionar ROLETA_SESSION_SECRET invalida todas as sessões. Antes de escalar a outros operadores, implementar revogação centralizada, rate limits persistentes, logs de auditoria, CSP, controle de custos, checagem de conteúdo e avaliação de privacidade de dados externos.

Rollback: Vercel rollback ao READY anterior + revert do merge GitHub. Preserve a configuração antiga ROLETA_UPLOAD_ACCESS_TOKEN até concluir migração. A PR não deve ser mergeada sem credenciais e testes do Google em condições controladas.
