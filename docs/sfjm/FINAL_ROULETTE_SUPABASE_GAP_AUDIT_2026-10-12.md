# Roleta final → Supabase: infraestrutura existente e lacunas

Data: 12/10/2026. Escopo: diagnóstico antes de implementar. Código local: `a5d3d0d`, árvore inicialmente limpa. Documento operacional também consultado na main via GitHub; novo SHA completo remoto não foi resolvido nesta etapa. Banco `uobxxgzshrmbtjfdolxd` consultado ao vivo somente por leitura. Nenhuma migration, grant, flag ou dado alterado.

## Precedência documental

Prevalece `OPERATOR_VALIDATED_OCR_SUPABASE_FLOW_2026-10-12.md`: conferência pelo próprio operador; envio explícito ao Supabase separado da impressão; sem segunda pessoa ou PR GitHub. Foto pode chegar em D+1. Posição física ≠ bolinha ≠ ordem final.

Foram lidos os checkpoints F2-12 Gate A, A.2, B.0, conectividade, homologação de segurança Gate B, decisão Gate C, backend Gate B, CURRENT e NEXT_SAFE_ACTION. Os textos antigos são fotografias históricas: não representam automaticamente o estado atual.

## Banco confirmado agora

| Componente | Evidência |
|---|---|
| Migration Gate A | 20261011101823 / roleta_f2_12_private_storage_gate_a_20261011 |
| Migration Gate A.2 | 20261011120749 / roleta_f2_12_gate_a2_private_append_v2_20261011 |
| Migration Gate B.0 | 20261011141228 / roleta_f2_12_gate_b0_credentialless_function_writer_20261011 |
| Schema | roleta_audit existente |
| Tabela ordinária nos schemas contendo roleta | prospective_evidence: 19 colunas, 14 constraints, zero linhas |
| RLS | Habilitada e forçada; policies SELECT/INSERT para roleta_append_owner |
| Trigger | prospective_append_only_guard habilitado, BEFORE INSERT/UPDATE/DELETE |
| Função | append_authenticated_person_evidence_v2, owner roleta_append_owner, SECURITY DEFINER, search_path pg_catalog, row_security on |
| Writer | roleta_v2_writer LOGIN; senha configurada (somente booleano consultado); limite 3 conexões; sem superuser, BYPASSRLS, CREATEDB, CREATEROLE |
| Writer na evidência | USAGE do schema e EXECUTE da função; sem SELECT/INSERT/UPDATE/DELETE direto |
| anon/authenticated/service_role | Sem USAGE de roleta_audit, DML da evidência ou EXECUTE da função V2 |
| roleta_runtime | NOLOGIN, sem os acessos acima |
| Writer no Discador | Zero tabelas/views public acessíveis por SELECT/INSERT/UPDATE/DELETE; zero funções public executáveis |
| Writer nos schemas | public USAGE=true, CREATE=false; auth/forensic_evidence USAGE=false; roleta_audit USAGE=true, CREATE=false |

Não afirmar ausência de USAGE em public: a barreira efetiva observada é ausência de acesso aos seus objetos. Não é auditoria integral de todos os schemas, PostgREST ou identidades administrativas.

Advisor de segurança consultado: os avisos retornados nomeiam outros objetos em public/forensic_evidence e Supabase Auth; nenhum nomeia roleta_audit. Isso não comprova segurança completa nem autoriza alterar o Discador. Referência: https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable

## Conexão já realizada

`F2-12_GATE_B_SECURITY_HOMOLOGATION_2026-10-11.md` registra teste autenticado informado pelo operador: `200 CONNECTED_RESTRICTED`, após CA e redeploy. O preflight registra DSN Sensitive/Production. Essas evidências posteriores superam o checkpoint B.0 que dizia senha e DSN ausentes.

Nesta etapa confirmamos senha configurada no banco sem ler seu valor. Não reinspecionamos env Vercel, não repetimos health autenticado nem comprovamos rotação. Writes=false é a última observação documental, não leitura runtime atual.

## Reaproveitamento e lacunas

| Área | Reaproveitar | Falta concreta |
|---|---|---|
| Autenticação | auth/google, sessão assinada, origem e CSRF | Verificar sujeitos atuais dos operadores e ACL para envio da folha coletiva; não inferir sub por e-mail |
| Conexão | DSN/CA existentes; pool limitado, TLS verificado, timeout e erros sanitizados | Adapter SQL específico da folha final; appendV2 atual aceita somente função prospectiva e 9 parâmetros |
| Banco | Schema privado e padrão de grants mínimos | Ledger adicional da folha final e versões; decidir grants/papel explicitamente sem ampliar writer por consequência |
| Dados | statistical/submission.js valida data/período, permutação e vínculo físico/bolinha | Validação server-side do cadastro e payload completo: empresa, SALÃO, STAND BY, ON-LINE, fonte e autoria |
| Botão | Conferência e envio separado em roulette-intake.js | Hoje espera pending_review/URL de PR; reconhecer saved/replayed/conflict, ID e versão Supabase |
| Endpoint | api/statistical-submit.js já verifica sessão/origem/CSRF no caminho legado | Hoje normal=503; implementar caminho Supabase parametrizado e autorizado |
| Idempotência | Conceitos e ensaios existentes para previsão/Git legado | Unicidade por evento operacional; replay igual não duplica; divergência requer correção explícita |
| Correção | correction-contract.cjs verifica proposta, digest e confirmação do operador | Hoje writesPermitted=false; endpoint/transação append-only, motivo, predecessor e versão esperada |
| Dashboard | app.js e domain/canonical-dataset.js validam manifesto/CSV | Leitura backend do ledger vigente e união por identidade/origem; atualizar estatísticas nominais também |
| Histórico | Manifesto local: 86 eventos, 82 A / 4 B | Preservar baseline e WEEKLY_FROZEN; não sobrescrever divergência silenciosamente |

OCR, cadastro, impressão RLT-PRINT-V2 e fallback JSON já existem. Não reabrir suas homologações como se nada tivesse sido feito. A validação de cadastro hoje embutida em statistical-github-stage.cjs pode ser extraída e reutilizada sem staging GitHub.

## Distinção sobre prospective_evidence

Sua constraint admite kind=prediction e kind=outcome; logo o DDL não é exclusivamente prediction. Entretanto, a função V2 instalada constrói prediction com WEEKLY_FROZEN/CURRENT_SHADOW, não grava folha final nem oferece correção operacional. O documento canônico proíbe usar essa tabela para o resultado OCR conferido. Não enfraquecer guards prospectivos para adaptar a folha final.

## Próxima implementação concreta

1. Contrato do evento final: identidade estável, data/período original, empreendimento, versão, autor server-side, fonte, digest, cadastro usado e folha inteira conferida. Não impor janela pré-sorteio a resultado entregue em D+1.
2. Migração adicional isolada para evento/versões append-only e operações mínimas de salvar/corrigir/ler; unicidade, idempotência e versão esperada. Não repetir Gate A/A.2/B.0.
3. Backend com sessão Google, CSRF, ACL de operadores e transporte TLS reutilizados; gate de escrita final separado do prospectivo. Não usar postgres/service_role no runtime.
4. UI de envio/correção pelo próprio operador. Impressão, PDF e reimpressão permanecem sem efeitos de gravação; editar invalida a conferência.
5. Dashboard une baseline e versões vigentes por evento; conflito histórico exige procedimento explícito, sem precedência silenciosa. Atualizar também consumidores nominais, preservar recomendações congeladas.
6. Laboratório PostgreSQL isolado: autorização negativa, cadastro adulterado, replay, colisão, concorrência de gravação/correção, retry após timeout, rollback transacional, impressão sem escrita e dashboard sem duplicação. Depois verificar configuração e persistência reais.

Próxima ação segura: implementar localmente contrato e migração adicional candidata com ensaio isolado. Esta auditoria não implementou nem ativou integração operacional.
