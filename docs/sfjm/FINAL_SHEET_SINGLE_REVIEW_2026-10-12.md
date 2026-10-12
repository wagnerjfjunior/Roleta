# Folha final: conferência única e gravação no passo 3

## Decisão do responsável

Após corrigir e validar SALÃO, STAND BY, ON-LINE, Helbor, data, período e share no passo 2, o operador usa a prévia do passo 3 para imprimir, salvar PDF, compartilhar ou salvar no Supabase. O passo 5, a segunda tabela e confirmação, o nome de arquivo e o preenchimento manual do motivo de atualização foram retirados. As ações de impressão e gravação permanecem independentes; imprimir não grava.

O botão de envio usa o mesmo objeto validado da prévia. Alterações no passo 2 invalidam a prévia e impedem impressão/envio até aplicar as correções. A confirmação já existente da folha final serve a todas as ações do passo 3. Login Google, CSRF, identificação por data/período, replay sem duplicação e versão anterior nas correções permanecem obrigatórios internamente. O motivo técnico da atualização é registrado automaticamente; o payload anterior e o novo permanecem auditáveis.

## Dados originais e limite estatístico

O bridge OCR passava a posição física por validação e a descartava ao montar a folha final. Agora preserva `physical_position` internamente, inclusive durante a revisão canônica. A impressão não mostra esse metadado. O operador não precisa preenchê-lo novamente.

Uma folha final importada por JSON pode conter somente a ordem final. A gravação aceita esse caso sem supor que ordem final seja posição física original. O ledger guarda posições desconhecidas como JSON null, com `physical_mapping_complete=false`, preservando posições parciais conhecidas. Essas folhas contam para estatísticas dos corretores por bolinha/ordem final; somente folhas com mapeamento físico completo entram nos modelos de posição física. O painel informa a quantidade de folhas finais excluídas apenas desse modelo.

Eventos antigos com mapeamento completo permanecem compatíveis e mantêm seus digests. A identificação interna da origem tem valor automático para novas folhas; ao carregar uma versão salva sua origem é preservada. O mecanismo estatístico legado continua exigindo mapeamento completo. Não alterar os 86 eventos históricos nem WEEKLY_FROZEN.

## Banco consultado e alteração preparada

Antes da implementação foi consultada a função ativa `roleta_audit.guard_final_roulette_v1()` no projeto `uobxxgzshrmbtjfdolxd` e confirmado zero registros em `final_roulette_versions`. A função ativa recusava qualquer posição desconhecida. A alteração adicional `database/production-review/final_roulette_optional_physical_v1.sql` substitui somente essa função privada, preservando assinatura, SECURITY INVOKER, search_path, revogações e ledger append-only. Não modifica dados, tabelas ou permissões do Discador.

Além de permitir null explícito, a função confere unicidade dos números sorteados, validade e unicidade das posições conhecidas, a marcação de incompletude e a correspondência dos índices físicos/occupied ao mapeamento. O fixture `tests/postgres/final-roulette-optional-physical.sql` usa somente PostgreSQL descartável e rollback; nunca executar esse fixture em produção.

Validação local: 227 testes Node aprovados. O workflow PostgreSQL 17 ensaia a alteração, gravação final sem posições, replay, índices falsos e preservação das correções concorrentes. Aplicar a alteração em produção somente após esse ensaio passar. A primeira gravação de uma folha real ainda deve ser observada; os screenshots fornecidos comprovam a duplicação da interface anterior, não uma gravação no banco.
