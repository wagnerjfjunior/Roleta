# Roleta — Gate de liberação assíncrona (23/10/2026)

Status: **NO-GO PARA ATIVAÇÃO**. Autorização de intenção de liberação concedida; publicação condicionada aos critérios abaixo. Sem bypass dos gates.

## Evidência direta (23/10)
- PR #126 Draft; HEAD auditado `0482e17600f3b250a90182de0eac2e5e8ea4668d`; **7 workflows SUCCESS** no HEAD.
- Banco Supabase `uobxxgzshrmbtjfdolxd`: **schema `roleta_intake` inexistente**, verificado em `information_schema.schemata` (somente leitura).
- Vercel `roleta`: nenhuma variável `ROLETA_INTAKE_*` (metadados, sem descriptografia).
- Make ativo 6549955: módulos 1→23→21→19, fallback 27/29, WebhookRespond 13. **Não há callback para Vercel**.
- Três execuções de 23/10 (13h49–13h53 BRT) falharam nos módulos Gemini 19 **e** 27 por HTTP 503. Sem leitura recuperável nessas tentativas.

## Contrato de liberação — todos obrigatórios
1. **Falhas transitórias:** tratar ambos 503 com retry limitado e backoff; após exaustão, persistir FAILED com error_code rastreável. Não confundir ACK do Make com resultado salvo. Recuperação idempotente; OCR.space opcional somente com caminho validado e conferência humana.
2. **Make shadow:** cenário de homologação isolado com fila/retorno antecipado, disparo por `job_id`, Gemini principal/fallback e chamada HTTP autenticada de callback, sem modificar 6549955 antes da prova.
3. **Credenciais:** API Key de pelo menos 32 bytes no keychain da conexão HTTP v4 do Make, guardada fora do blueprint e logs; Vercel com segredos próprios de callback e role Postgres dedicada. Revisar permissão, rotação e revogação.
4. **Persistência:** aplicar somente migrations F1→F4 no `roleta_intake` do banco existente, sob autorização de mudança e após backup verificável. Sem tocar schemas `roleta_ocr`/`roleta_audit`.
5. **E2E real:** POST imagem autenticado; resposta 202 rápida; callback aceito; nonce repetido rejeitado; JSON salvo; polling/reload Google mesmo usuário; negação de acesso entre operadores; saída pela conferência humana; falha e recuperação após 503; mobile.
6. **Rollback:** feature flag `ROLETA_INTAKE_ENABLED=false` restaura OCR síncrono sem destruir jobs nem migrar dados de volta; preservar importação de JSON e exportação atuais. Manter Make 6549955 até aceite.
7. **Liberação:** teste de número/limite de funções Vercel; AppSec sobre SHA final; QA; READY/merge apenas com provas. Depois configurar novas envs e ativar gradualmente, observando logs e um job real.

## Declarações proibidas até provas
- CI aprovado **não equivale** a E2E aprovado.
- `reconciliation_required` no status **não é** um worker de reconciliação/retry.
- Não registrar callback Make como instalado se o módulo não existir.
- Não declarar que OCR.space já é fallback produtivo deste cenário quando não existir ligação comprovada.
- Não ligar a feature flag só para verificar se funciona.

## Próxima ação segura
Homologar conexão HTTP v4 de credencial protegida, callback e retry em cenário shadow; persistência real exige migrations após backup. Reavaliar gates e só depois ativar produção.
