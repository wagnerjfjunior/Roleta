# F2-11 — Persistência prospectiva: plano de implementação e gates

## Inventário verificado em 2026-10-10
- O repositório possui autenticação Google em `auth/google`, sessão em `api/auth/session.js` e padrão de origem/CSRF em `api/roleta-ocr.js`.
- `simulation/prospective-ledger.cjs` implementa hash encadeado e separação previsão/resultado; não é persistência confiável nem relógio de servidor.
- `simulation/prospective-metrics.cjs` agrega resultados; não substitui pré-registro estatístico.
- A conta Supabase conectada expõe somente o projeto **Discador-MesaCliente**. Não presumir autorização para misturar dados da Roleta com dados comerciais do Discador.
- Vercel está configurada para deploy da `main`; não adicionar endpoints ativos antes da definição de armazenamento e segredo.

## Execução contínua autorizada (sem afetar a roleta oficial)
1. Criar contrato de API para previsão e resultado: POST separado, sessão Google autorizada, same-origin, CSRF, limites de corpo, idempotência por `event_id + policy`, horário do servidor, hash da entrada, versão do algoritmo, `N`, snapshot elegível e escolha pré-comprometida.
2. Criar adaptador de armazenamento transacional, preferencialmente PostgreSQL privado com restrições de unicidade, RLS/revogação de escrita direta e trilha append-only. O servidor deve rejeitar alterações e impor precedência temporal. A assinatura ou hash do servidor não prova por si só que o sorteio não era conhecido: processo de coleta pré-evento precisa ser homologado.
3. Implementar fluxo `outcome` apenas após revisão humana; preservar previsão, registrar correção por novo evento de retificação, nunca sobrescrever.
4. Construir interface de modo sombra e estado de evidência sem tocar no caminho atual de JSON, conferência, impressão/PDF ou salvamento canônico.
5. Testar concorrência, repetição, falha de rede, indisponibilidade, autorização, CSRF, ordem temporal, timezone, falsificação de horário, replay e recuperação.
6. Executar em PR com CI obrigatório; promover apenas após teste manual em ambiente de homologação.

## Gate arquitetural: decisão humana necessária
Há somente um Supabase conectado, **Discador-MesaCliente**. Não aplicar migração nele nem usar suas credenciais sem decisão explícita. Alternativas:
- **A (recomendada):** Supabase exclusivo para Roleta, com separação física/lógica e credenciais próprias; confirmar organização, eventual custo e autorização de criação.
- **B:** usar Discador-MesaCliente com schema isolado, RLS e segregação de acesso; requer aceitação explícita de mistura de aplicações.
- **C:** banco PostgreSQL existente da Roleta, se comprovado.

Até decidir, somente código de domínio, testes, especificação e PR de pesquisa. Não gerar logs prospectivos públicos, não armazenar dados pessoais em repositório e não afirmar que a captura real está ativa.

## Critérios de aceite
- Registros imutáveis e verificáveis, com `received_at` atribuído pelo banco/servidor.
- Somente usuários autenticados autorizados criam previsões/resultados.
- Resultado não pode ser associado a previsão posterior.
- Idempotência e exclusão de duplicidade concorrente.
- Hash do encadeamento verificável e rastreabilidade de retificações.
- Modo sombra isolado de WEEKLY_FROZEN, impressão, base canônica e week frozen.
- Testes automatizados verdes + homologação manual.
