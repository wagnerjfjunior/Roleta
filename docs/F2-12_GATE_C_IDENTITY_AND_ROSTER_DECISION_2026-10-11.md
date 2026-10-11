# F2-12 — Gate C: decisão de identidade, elegibilidade e fluxo de autorização
Data: 2026-10-11. Estado: **DECISÃO ARQUITETURAL / EXECUÇÃO BLOQUEADA ATÉ PROVAS CANÔNICAS**.

> **RETIFICAÇÃO OPERACIONAL (11/10/2026):** a hipótese deste documento de que existiria um snapshot de presença/posição física homologado **antes** do sorteio foi revogada após esclarecimento do processo real. A folha permanece aberta até 08:45:59 / 13:45:59, depois fica com quem sorteia e poderá ser fotografada apenas à noite ou em outro dia. Posição física 1 ≠ bolinha sorteada 1; ver `docs/ROLETA_PHYSICAL_LINE_DRAWN_BALL_FINAL_ORDER_CANONICAL.md`. Os itens abaixo descrevem o *gate de segurança implementado*, **não** um fluxo operacional exigível. O gate de F2-12 permanece bloqueante enquanto for redesenhado; Roleta Simples e ingestão histórica não dependem dele.


## Decisões

1. **Operador:** identificar exclusivamente pelo `sub` da sessão Google assinada e verificada no servidor. E-mail é dado de exibição, **não** chave de autorização. Nenhum navegador define `actor_subject` livremente.
2. **Pessoa/corretor:** resolver `person_id` contra o cadastro oficial versionado `data/brokers-official.csv`. Nome comercial não é chave estável; CRECI também requer normalização/controle de ausências e duplicatas. Definir ID estável e matriz oficial antes de cadastrar a primeira ACL. Não inferir vínculo do Google com corretor a partir de e-mail, nome ou CRECI.
3. **Delegação:** uma sessão Google só pode gravar para o conjunto explícito de `person_id` autorizados em ACL **server-only**. Uma conta operacional não recebe acesso global implícito. Cada concessão e revogação deve ser aprovada e auditada.
4. **Elegibilidade de um evento:** exigir snapshot de roleta específico, independente do request, associado a `event_id`, período, participantes homologados, identificação da pessoa e linha física efetiva. A posição física informada pelo cliente deve coincidir exatamente com esse snapshot. O cadastro geral de corretores **não** comprova presença nem posição em evento.
5. **Estado e versões:** cada snapshot de elegibilidade deve ter `snapshot_id`, origem/proveniência, data da homologação, revisor responsável, versão, digest SHA-256 e estado aprovado/frozen. Uma correção requer nova versão, preservando o original e encadeamento de justificativas; não alterar a origem in-place.
6. **Cutoff:** o servidor aplica a janela do sorteio. Sábado, domingo e `integral` permanecem desabilitados até horário homologado explicitamente; nenhuma hora pode ser inferida do cliente.
7. **Imutabilidade:** manter `roleta_audit.prospective_evidence` append-only e usar a função dedicada no PostgreSQL; não usar INSERT direto, service_role ou credencial administrativa na Vercel.
8. **Ativação:** `ROLETA_V2_WRITES_ENABLED=false` até comprovação da cadeia acima, concorrência, idempotência, revisão e rollback em PostgreSQL descartável e autorização separada do canário.

## Decisão de controle adicional implementada

`api/prospective-v2-append.js` passou a exigir verificação independente de elegibilidade **após** autenticação/ACL/cutoff e **antes** da execução de SQL. O adapter padrão falha fechado: `trusted event roster proof unavailable`. Não foi criada uma falsa fonte de presença com base no CSV nem aceita uma posição de linha apenas por aparecer no payload.

Uma futura implementação `authorizeRoster(command)` deve consultar **exclusivamente estado server-side aprovado**, conferir (`event_id`, `person_id`, `physical_position`, `snapshot_id`, cutoff e versão) e rejeitar qualquer ausência, ambiguidade ou alteração posterior ao snapshot. O design não autoriza injetar uma autorização através da requisição HTTP.

## Evidências e lacunas

- Confirmada existência do `data/brokers-official.csv`, com nome, equipe, diretor, empresa, CRECI e cargo; há linhas com CRECI vazio. **Isso não é tabela de presença/evento.**
- Na inspeção do esquema compartilhado Supabase, não foi identificada uma tabela de escala/roster de eventos Roleta em `public` ou `roleta_audit` pelo filtro de nomes empregado; isso **não prova inexistência de outras fontes** no GitHub.
- `ROLETA_V2_PERSON_ACL_JSON` não estava configurada na Vercel na inspeção anterior. O provisionamento exige o verdadeiro Google `sub` e ID estável de corretor, com autorização explícita.
- O teste `200 CONNECTED_RESTRICTED` comprova a ligação TLS e a matriz restrita consultada, **não** prova integridade do roster.
- Testes Gate C verificam fail-closed sem snapshot, rejeição e ordem dos controles. Eles usam mocks; ainda **não** representam homologação de um adapter real de roleta.

## Próximo ponto de atenção

**Escolher e homologar a fonte autoritativa da lista física por evento**, incluindo como ocorre a validação humana e seu congelamento, para que o adapter do backend possa consultá-la sem depender de payload controlado pelo navegador. Separadamente, cadastrar e aprovar uma matriz `Google sub → pessoa(s)` com IDs estáveis do cadastro oficial. Essas duas decisões precedem qualquer habilitação de gravação, inclusive canário.
