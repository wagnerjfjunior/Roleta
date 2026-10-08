# PR #22 — Implantação controlada em produção e rollback

Data de preparação: 2026-10-08. **Nenhum deploy autorizado por este documento por si só.**

## Baseline verificado antes do merge

- Projeto Vercel: `roleta` (`prj_Fc4IcpnaqmYj3XSvhV8g0avwbv4o`).
- Deployment READY elegível para rollback: `dpl_HYanQzAEQHF7HHYN8VcMbBm3KTzw`.
- Commit GitHub desse deployment: `a04e2c55a4a325a50c9a0e90bc088d1496f70ed1`.
- Conferir novamente o deployment *ativo* imediatamente antes do merge: outro deploy pode ocorrer.
- Não alterar `data/events.csv`, ledger, histórico nem rotinas de gravação durante o teste OCR.

## Gate anterior ao merge

1. Executar e registrar GitHub Actions na ponta da PR.
2. Configurar no ambiente production da Vercel (sem publicar segredo):
   - `ROLETA_MAKE_WEBHOOK_URL`: webhook Make **rotacionado** de acordo com o cenário atual.
   - `ROLETA_UPLOAD_ACCESS_TOKEN`: credencial forte aleatória com no mínimo 24 caracteres.
3. Confirmar módulo Webhook Response Make retorna JSON com `linhas[]`, status 200.
4. Garantir acesso ao painel Vercel para executar rollback imediatamente.
5. Não usar dados reais de clientes; fotografia de roleta operacional somente com autorização.
6. Confirmar que o endpoint público está condicionado às credenciais e que quotas de Make/Gemini estão controladas. Avaliar limitação de taxa no hardening; antes disso, limitar o teste a operadores autorizados.

## Smoke test pós-merge (produção)

1. Abrir **Nova Roleta** e testar primeiro o fluxo **Colar JSON GPT** e **Carregar .json**; confirmar que entrada e revisão continuam disponíveis.
2. Selecionar foto (JPEG/PNG/WebP, até 4 MiB), confirmar pré-visualização, informar token de teste sem colar em chats/logs.
3. Enviar uma única imagem; validar chamada `POST /api/roleta-ocr` (status 200 e `status=PENDENTE_REVISAO`).
4. Confirmar execução Make, leitura Gemini e exibição de pendências no frontend.
5. Verificar que nenhuma imagem salva/CSV alterado/estatística incrementada/preview de impressão liberada automaticamente.
6. Registrar problemas sem copiar cabeçalhos de autenticação para logs/HAR.

## Critérios de rollback imediato

- Fluxo legado GPT quebra; tela Nova Roleta não carrega.
- Falha não controlada no envio; exposição de segredo; comportamentos inseguros.
- Alteração inesperada na impressão, base estatística ou outras funcionalidades.
- Requisições repetidas ou custos inesperados.

## Procedimento de rollback

1. Abrir Vercel > Projeto roleta > Deployments.
2. Selecionar deployment estável ID `dpl_HYanQzAEQHF7HHYN8VcMbBm3KTzw` (ou outro *baseline* READY revalidado previamente).
3. Solicitar **Rollback** e verificar qual deployment passou a atender o domínio público.
4. Desativar/rotacionar o token e o webhook se houve exposição ou abuso.
5. Se houve merge, preparar **revert** do commit de merge da PR #22 no GitHub para que um deploy posterior não reproponha o código defeituoso.
6. Revalidar o fluxo GPT, a navegação móvel e a roleta impressa.

Observação: rollback de deployment não restaura dados externos eventualmente gravados; o fluxo OCR foi projetado somente para rascunhos e não deve gravar na base.
