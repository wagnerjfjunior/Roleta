> **RELEASE ATIVO — FOLHA FINAL SUPABASE — 12/10/2026:** PR #95 mergeada, main funcional `54031ad`, migration `20261012200806` aplicada, deployment `dpl_5MPQWnouiJwqH7WKVPqvVbTZmmp5` READY e flags finais ativas. Vínculo automático do sub real na primeira sessão Google de uma das duas contas autorizadas, sem cópia manual de IDs. Próxima ação: observar primeiro envio real conferido e painel, sem criar roleta fictícia. Detalhes e limites de evidência em `FINAL_ROULETTE_PRODUCTION_RELEASE_2026-10-12.md`. Os estados anteriores abaixo são históricos.

# Roleta — fluxo operacional corrigido pelo responsável — 12/10/2026

## Autoridade e correção de escopo

Este documento prevalece sobre o dossiê Gate E e os checkpoints anteriores quanto ao fluxo operacional, destino de persistência e aprovação humana. A exigência de segunda pessoa, revisão independente ou conta GitHub adicional foi introduzida indevidamente pelo assistente. Está revogada. Não é requisito do usuário.

Contas Google indicadas pelo responsável:
- wagnerjfjunior@gmail.com (correção do endereço anteriormente informado);
- brendatatianelima@gmail.com.

Identidade autenticada e permissão de persistir são controles de acesso, não uma segunda aprovação. Registrar os e-mails no documento não equivale a provisionar runtime, recuperar Google subjects ou liberar escrita.

## Fluxo único de conferência operacional

1. O corretor fotografa a folha original e envia a imagem ao OCR.
2. A aplicação usa o cadastro canônico de corretores versionado no GitHub para recompor nomes e metadados.
3. Exemplo aprovado: OCR lê Wag, cadastro contém um único Wagner; o nome é recomposto para Wagner. WIS é recomposto para Wislane conforme o cadastro desse corretor. CRECI, gerente, diretor e status vêm juntos do mesmo registro oficial.
4. A aplicação entrega os nomes completos na ordem das bolinhas sorteadas, preservando a posição física original separadamente.
5. O próprio corretor compara o resultado com a folha original, corrige o necessário e confirma.
6. A confirmação libera impressão/PDF. O operador pode fotografar/compartilhar a folha final.
7. Se tiver permissão, o operador executa uma ação separada de envio ao Supabase. Não precisa da aprovação de outra pessoa nem de abrir/aprovar PR GitHub.

Impressão, PDF e compartilhamento não gravam automaticamente. O fluxo manual de JSON do GPT continua aceito. SALÃO, STAND BY e ON-LINE permanecem distintos; apenas SALÃO integra N/permutação.

## Recomposição automática e limites

- Correspondência exata única usa o registro oficial.
- Prefixo de nome com pelo menos três caracteres pode recompor quando há um único candidato.
- Em múltiplos candidatos por prefixo, um prefixo de gerente com pelo menos três caracteres pode desempatar entre eles. Gerente sozinho nunca identifica um corretor.
- Se continuar ambíguo ou não houver candidato, a linha fica pendente para o próprio operador resolver.
- A escolha automática é rascunho; nunca libera impressão ou gravação sem a conferência do operador.
- O rascunho preserva o texto OCR, a forma de resolução e o gerente lido. Duplicações são verificadas pelo nome canônico, inclusive Wag e Wagner na mesma folha.

## O que já existe e o que não existe

- OCR/Make, cadastro print-brokers.json derivado de brokers-official.csv, ordem por sorteio, conferência e impressão: já implementados.
- Recomposição por prefixo único e desempate por gerente: implementada neste ajuste, com testes negativos de ambiguidade.
- Regra de segundo revisor no contrato local de correção: removida; o próprio autor pode confirmar sua correção mantendo digest, motivo e versão. O contrato continua sem capacidade de gravação, pois não existe endpoint de correção operacional.
- O backend statistical-submit anterior é de staging GitHub. É legado técnico, não o destino operacional aprovado. Não migrar dados nem ativar esse caminho por consequência da autorização para Supabase.
- A API agora só permite o staging antigo se o runtime selecionar explicitamente ROLETA_STAT_STORAGE_BACKEND=github_legacy. Uma flag de escrita isolada não pode enviar silenciosamente a roleta a uma PR. O fluxo normal permanece indisponível até implementar a integração Supabase correta.
- Consulta de metadados ao projeto compartilhado uobxxgzshrmbtjfdolxd encontrou roleta_audit.prospective_evidence. Essa tabela é de previsões anteriores ao sorteio, não foi criada para a folha final pós-sorteio. Não usá-la para registrar o resultado OCR validado.
- Nenhuma tabela, permissão, dado Supabase, flag ou histórico foi alterado por este ajuste.

## Próxima ação segura

Implementar a persistência da roleta final validada no Supabase, em estrutura isolada do Discador e da evidência prospectiva. Usar sessão Google verificada, permissão de envio, data/período original, identidade estável do evento, idempotência, associações físicas/bolinhas completas e versões auditáveis para correções. Conferência pelo próprio operador, sem segundo revisor. Dashboard deve consumir o destino definido, preservando baseline e fonte de cada evento e sem contar uma roleta duas vezes.

Não reabrir a decisão de revisor GitHub: ela foi expressamente rejeitada. Não substituir esse pedido por gravação prospectiva F2-12. Não declarar integração Supabase ativa até implementar, testar e verificar a persistência real.
