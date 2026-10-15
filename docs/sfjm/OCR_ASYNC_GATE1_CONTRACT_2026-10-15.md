# SFJM — Gate 1: recuperação durável do OCR (proposta isolada)

Data: 2026-10-15
Estado: CONTRATO PROPOSTO; sem implementação em produção; sem migração aplicada.
Branch: sfjm/ocr-async-intake-gate1-20261015

## Evidências verificadas
- Make 6549955 ativo e imediato: webhook 1 → HTTP 23 → upload Gemini 21 → Gemini 19 → Webhook Response 13; fallback 27/29. Router OCR.space ausente.
- Teste 15/10 18h36 BRT: execução f559112a951a4dd28a349e231baaeabb, 46.305 ms, success, HTTP 200 no módulo 13.
- Teste 15/10 09h14 BRT: execução 7bfdb2f7f3e7441a8a157121e8f4a5b5, 194.139 ms, success, posterior ao timeout do relay de 175.000 ms.
- /api/roleta-ocr.js usa chamada síncrona e não guarda o resultado tardio.
- Supabase compartilhado uobxxgzshrmbtjfdolxd já contém roleta_ocr.learning_jobs, readings, name_evidence, dictionary, dictionary_revisions, e roleta_audit.final_roulette_versions.
- O endpoint /api/ocr-shadow-submit.js enfileira aprendizagem somente depois da folha final validada; NÃO é fila de entrada OCR. Não reutilizar essa tabela/endpoint para a fotografia inicial.

## Escopo Gate 1
Persistir de forma durável a solicitação original, o resultado bruto estruturado do Gemini e o estado da tentativa, para permitir recuperação autenticada pelo mesmo operador após timeout, recarga ou fechamento do app. A saída é SEMPRE rascunho pendente de conferência humana, nunca roleta final.

## Contrato de estados proposto
QUEUED → PROCESSING → READY_FOR_REVIEW | FAILED
- Estado terminal READY_FOR_REVIEW somente depois de validar formato e persistir o JSON integral.
- FAILED deve guardar código de erro seguro e possibilidade de nova tentativa explicitamente solicitada, não retry automático silencioso.
- A falta de heartbeat não é prova de PROCESSING; exibir “Aguardando resultado” até confirmação do worker.
- Expiração, limpeza e retenção das fotografias e resultados precisam de decisão explícita antes da migração.

## Identidade, deduplicação e autorização
- O servidor autentica sessão Google e CSRF, valida a imagem e gera UUID aleatório da solicitação (job_id) e SHA-256 dos bytes.
- Um registro de solicitação contém job_id, operator_sub, image_sha256, estado, timestamps e referência privada da imagem. O retorno do Gemini fica vinculado ao job_id.
- Idempotência por operador + hash da fotografia + janela/estado definidos, não por nome/data OCR (que podem estar errados). Solicitações anteriores não são sobrescritas.
- GET de status/resultado exige mesma sessão autorizada; nenhum job_id confere acesso sozinho.
- Make não recebe chave service_role, credencial PostgreSQL ou acesso direto irrestrito. A entrega do resultado usa endpoint server-to-server autenticado com segredo rotacionável, associação obrigatória ao job_id, limite de payload, proteção contra replay e gravação idempotente.
- Preferir funções SQL de privilégio mínimo e RLS/REVOKE para tabelas dedicadas; credenciais somente no servidor. Auditar quem criou, concluiu e consultou.
- Falha da escrita do resultado NÃO pode ser relatada como sucesso; resposta HTTP ao Make deve refletir persistência efetiva.

## Integração progressiva
1. Implementar schema separado de roleta_ocr.learning_jobs e funções restritas, em migração versionada e testada isoladamente.
2. Implementar API autenticada: criar/consultar job, gravar resultado por callback autenticado e recuperar JSON. Testar isolamento entre operadores, replay, duplicidade e timeout.
3. Integrar Make com correlação job_id e callback de conclusão. Preservar Gemini, prompt, fallback e conferência; NÃO alterar o cenário ativo até aprovação explícita e plano de rollback.
4. Somente depois, app recebe 202 + job_id, consulta estado, recupera JSON e bloqueia reenvio acidental. Validar no celular >180s e reabertura.
5. Gate 2: reintroduzir OCR.space como sombra independente, após a confiabilidade do caminho principal. Reaproveitar roleta_ocr.* existente; associar variantes exclusivamente à versão final conferida. Nunca autoaprovar nome por semelhança.

## Critérios de aceite antes de merge
- Testes: foto válida, rejeição de origem/sessão/CSRF, isolamento entre usuários, replay de callback, duplicidade de foto, falha do banco, resposta >180s, recuperação após reabrir, correção manual preservada.
- Evidência de resposta persistida, consulta autenticada e renderização real no telefone.
- Plano de rollback do app/Make e migração aditiva reversível documentados.
- Sem deploy preview (projeto local-first/live sync); nenhum merge/deploy por consequência da criação desta proposta.

## Fora do escopo
Alterar Gemini 3.8/3.6, prompt, OCR.space, cadastro oficial, algoritmo da roleta, publicação de folha final, PDF e dashboard.
