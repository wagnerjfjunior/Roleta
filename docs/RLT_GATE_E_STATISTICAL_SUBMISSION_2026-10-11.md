# RLT Gate E — Inclusão estatística mediante revisão obrigatória

**Data:** 11/10/2026. **Status:** implementação preparada em branch, ativação de escrita GitHub condicionada à homologação. **Não confundir** com Gate C/F2-12 (previsões).

## Fluxo operacional real

- Após o sorteio, o usuário pode gerar, imprimir, salvar PDF, fotografar e compartilhar uma roleta sem precisar alimentá-la na estatística.
- Na etapa independente **Salvar na base estatística**, após conferência humana da folha, o app exige a **linha física original** de cada corretor do SALÃO e a fonte da imagem. O número de bolinha é o `ordem_final` já validado pelo operador, nunca inferido da linha física. O mesmo evento pode ser submetido em D+1 ou depois, mantendo sua data original.
- O botão executa `POST /api/statistical-submit` usando a sessão Google assinada, Origin e CSRF. A resposta `202 pending_review` significa **PR GitHub criada para auditoria**, nunca base atualizada. Só depois de revisão/merge/CI da PR a base `data/manifest.json` será publicada.
- Nenhuma fonte manual, bolinha ou linha física é preenchida automaticamente. Todas as posições físicas precisam ser informadas, válidas, distintas e associadas à ordem final.
- RLT-PRINT-V2 continua separado: imprimir e compartilhar não chamam esta API.

## Segurança / fail-closed

1. Variáveis de ambiente de servidor `ROLETA_STAT_WRITES_ENABLED` (literal `true`), `ROLETA_STAT_GITHUB_TOKEN` (credencial restrita ao repositório) e `ROLETA_STAT_ALLOWED_SUBS` (Google `sub` explicitamente autorizados). Ausência de qualquer uma bloqueia a submissão. **Não configurar na interface, não expor em JS, logs, URL ou CSV.**
2. O servidor reconstitui a associação bolinha → posição física usando `statistical/submission.js`, compara nomes/metadados com `data/print-brokers.json` e valida N, data, período, proveniência, estruturas e limites.
3. Antes de escrever, fixa o commit SHA da `main` e consulta o manifesto e todas as fontes desse mesmo SHA, impedindo mistura de versões de leitura. Colisão por ID, data/período ou evento de período desconhecido na mesma data bloqueia inclusão. Uma correção de evento existente exige processo versionado separado.
4. Constrói um único commit Git com o novo CSV em `data/incoming/YYYY-MM-DD-{M,T,I}.csv` e um manifesto atualizado, em branch `stat-intake/YYYY-MM-DD-{M,T,I}`; abre PR para revisão humana. O backend **não move main**, não faz auto-merge e não grava no Supabase.
5. Reenvio do mesmo evento **com PR aberta, hash de todo o payload e hash do operador idênticos** retorna a mesma PR (`replayed=true`) sem executar writes. Qualquer divergência ou branch órfã não verificável resulta em conflito bloqueado; nunca sobrescreve branch existente. A criação da branch seguida de falha na criação de PR requer reconciliação manual; o sistema não retenta cegamente.
6. O registro usa a data original do evento e um timestamp independente de submissão. Audit trail inclui hash resumido do Google subject, digest do payload e referência à fonte; nunca inclui token ou cookie.
7. F2-12 mantém `ROLETA_V2_WRITES_ENABLED=false` e não é chamada no Gate E.

## Homologação e ponto de atenção

- Aprovar e provisionar conta técnica/GitHub App de acesso **mínimo** ao repositório (Contents write + Pull requests write; sem permissões administrativas) e identidade Google `sub` do operador. Preferir GitHub App com expiração/rotação automatizada a PAT persistente; implementação atual aceita token pelo ambiente, com ciclo de vida sob responsabilidade operacional.
- Auditar os commits reais gerados em um repositório descartável antes de criar qualquer PR de dados na Roleta de produção. Verificar em especial concorrência entre PRs distintas, conflito de versão de manifesto e falha entre criação do branch e PR. Os testes mockados provam somente a lógica cliente, não a API GitHub real.
- **Evidência necessária para análise forense:** o CSV histórico contém apenas os números especiais; o arquivo JSON `data/intake-proofs/` preserva **todas** as associações linha física, bolinha e nome, além de autoria pseudonimizada, fonte declarada e horário de submissão. A referência à imagem é somente metadado: **não** significa que a imagem original foi carregada ou teve seus bytes preservados. Arquivar/validar a imagem requer mecanismo adicional, com autorização própria.
- Tratar o manifesto publicado pela PR como snapshot versionado. Quando outra PR entrar antes, exigir rebase/reconciliação humana e novos testes; não empurrar alterações na main automaticamente.
- Rodar testes CI (suites de regressão e GitHub PostgreSQL). Publicar UI somente com flag de escrita **ausente/desligada**; assim o botão informa indisponibilidade sem criar falsos registros.
- O fluxo de correção pós-publicação com nova revisão e auditoria de versões **não está implementado** neste Gate E; colisões são intencionalmente bloqueadas até essa fase.

**STOP:** Sem autorização e provisionamento das credenciais server-only, nenhuma PR de dados real será criada. Uma resposta `202` apenas coloca o evento em análise, sem atualizar imediatamente as amostragens.
