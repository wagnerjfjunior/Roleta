# RLT-ARCH-01 — Marco de separação V1/V2 e rollback controlado

Estado: **PROPOSTA DE ARQUITETURA — NÃO IMPLEMENTADA EM PRODUÇÃO**  
Branch de documentação: `feat/ocrspace-shadow-reconciler-20261009`  
Data: 2026-10-09

## 1. Decisão

- **V1**: sistema operacional atual, linha estável e candidata a recuperação; não incorporar a ela o novo pipeline como apêndice.
- **V2**: nova plataforma modular, com instâncias próprias de aplicação, Make e configurações. Pode reaproveitar bibliotecas puras versionadas, nunca acoplamento operacional que inviabilize V1.
- O nome de produto existente `Roleta Intelligence V3` não deve ser confundido com a nomenclatura de **marcos operacionais V1/V2**. A definição exata do identificador de release da V1 exige verificação do deployment atual.
- V1 deve permanecer implantável e operacional mesmo após a promoção de V2.

## 2. Evidências da situação atual e limites

- `vercel.json` permite deployment automático de `main` e desabilita demais branches por padrão; uma branch experimental **não é** um ambiente de homologação publicado.
- `api/roleta-ocr.js` contém a entrada atual autenticada por Google SSO + CSRF, valida MIME e encaminha para `ROLETA_MAKE_WEBHOOK_URL`. Isto pertence ao pipeline atual.
- O Make corrente contém o caminho Gemini e uma ramificação experimental OCR.space no mesmo cenário: **não constitui isolamento V1/V2**.
- A V2/PR #41 tem comparador e gates locais SHADOW, sem persistência e sem fallback operacional. Testes locais apresentados: 20/20 aprovados; evidências de duas fotografias e referência humana parcial na amostra de 06/10/2026 TARDE.
- Não há prova aqui de releases V1 imutáveis, cenários Make V2 segregados, roteamento atômico de versões, restore de dados ou testes de rollback completos. Não declarar esses itens implantados.

## 3. Topologia-alvo

### V1 — serviço de recuperação
- Artifact/deployment imutável identificado por Git SHA e ID Vercel.
- Configuração e secrets versionados por **identificador/referência**, jamais os valores em Git.
- Make V1 separado e congelado; webhook próprio.
- URL de verificação do serviço V1 que não dependa do alias de produção.
- Uma revisão pontual de segurança na V1 será uma release corretiva formal, não a inserção de funcionalidades V2.

### V2 — serviço evolutivo
- Projeto/ambiente Vercel isolado; pipeline de build/deploy e segredos independentes.
- Make V2 próprio, rotas Gemini e OCR.space com tempos limite, tratamento de erros e segregação de falhas.
- Módulos: intake/autenticação, motores OCR, normalização, reconciliação oficial, gate estrutural, revisão humana, impressão, auditoria, persistência estatística.
- Somente a validação humana autoriza publicação estatística; reimpressão nunca gera evento novo.
- A Rota B OCR.space continua SHADOW até haver leitura de nomes **e números** comprovadamente confiável e gate de aprovação específico.

### Entrada operacional
- Um domínio principal destinado à versão ativa; implementado por mecanismo de roteamento/domínio testado, com acesso administrativo protegido.
- Nenhum usuário escolhe a versão oficial por querystring ou localStorage.
- Alternância operacional exige procedimento autenticado, registro auditável, health checks e rollback verificável.
- Roteamento e propagação DNS/cache não têm latência zero garantida; definir objetivo de recuperação, medir tempo real e testar em homologação.

## 4. Dados e compatibilidade de retorno

- Dados oficiais independentes do lifecycle de deployment.
- Desenhar contratos de leitura e escrita explicitamente versionados, com migrações **expand/contract**, nunca destrutivas enquanto V1 for opção de retorno.
- Considerar V2 em modo leitura espelhada inicialmente, sem gravação na base oficial.
- Antes de escrita V2, escolher estratégia validada para compatibilidade: formato comum retrocompatível **ou** adaptador de compatibilidade/dual-write transacional com replay e reconciliação. Proibir dual-write ingênuo sem atomicidade.
- Identidade de evento, idempotency key, provenance e histórico de revisões são obrigatórios.
- Backup imutável e teste real de restore antes do cutover. Rollback de código **não é** rollback automático de dados. Nunca reverter banco cegamente apagando eventos novos.

## 5. Gates de DevSecOps

1. Threat model e revisão de fronteiras de confiança (imagem, Gemini, OCR.space, Make, Vercel, cadastro, dados estatísticos).
2. CI obrigatório: testes unitários/integração, SAST, secret scanning, auditoria de dependências, schema contract tests, políticas de branch e revisão por PR.
3. Secrets em gerenciadores apropriados, menor privilégio, credenciais por ambiente, rotação e revogação.
4. Observabilidade por `event_id`, `request_id`, `pipeline_version`, `model_version` sem logar fotos ou dados pessoais desnecessários.
5. Feature flag e kill switch **somente internos à V2**, não substituem independência de implantação.
6. Canary/dark launch sem escrita na base estatística; critérios de qualidade e erro definidos antes de ativação.
7. Aprovação explícita para promover ou reverter versões; trilha de quem, quando, build, motivo e pós-verificação.

## 6. Procedimentos (a implementar e testar, não instruções para executar agora)

### Freeze V1
- Identificar e confirmar a implantação exata atendendo produção e o SHA correspondente.
- Registrar IDs de deploy, bundle de configuração (sem valores secretos), dependências e estado do cenário Make.
- Salvar artefato e blueprint exportado com acesso restrito; preservar uma URL fixa do deployment.
- Testar acesso, autenticação Google, upload, geração de PDF e caminho de restauração V1.

### Promote V2
- Rodar CI + homologação de ponta a ponta com imagem de teste, login, Make V2 e revisão humana.
- Validar compatibilidade de dados, backups, idempotência e saúde da V1.
- Executar canary sem mutação e checklist de aprovação.
- Alterar destino do domínio/roteador seguindo runbook, registrando deployment ativo.
- Observar métricas e autorizar escrita somente se gates específicos forem aprovados.

### Rollback V2 → V1
- Bloquear primeiro novos writes V2 se necessário; preservar fila/estado para replay.
- Confirmar integridade de dados compatível com V1.
- Retornar o roteamento ao **deployment V1 previamente testado**, não recompilar uma branch arbitrária.
- Verificar login, foto, processamento Make V1 e impressão sem duplicações.
- Registrar operação, tempo de recuperação e ocorrências; não apagar registros V2 de auditoria.

### Roll-forward V1 → V2
- Validar build V2 ainda íntegro, reconciliar eventos gerados enquanto V1 estava ativa e verificar schema.
- Restaurar V2 por roteamento controlado, repetir smoke tests e monitoramento.

## 7. Critérios de aceite antes de qualquer merge/deploy

- Identidade do V1 congelada e reimplantável comprovada.
- Make V1/V2 realmente isolados e testados.
- Segregação Vercel/domínios/segredos auditada.
- Contratos de dados e recuperação aprovados.
- Testes completos V1 → V2 → V1 → V2 com evidências e RTO medido.
- Aprovação explícita do usuário.
- **Sem merge do PR #41, sem ajuste no Make ativo, sem mudança em produção nesta etapa.**

## 8. Próxima ação segura

Inventariar deployment V1 ativo: Git SHA, ID Vercel, variáveis por nomes, cenário Make e contratos de armazenamento, sem divulgar segredos. Elaborar runbook de congelamento e teste de restauração antes de implementar o roteador V2.
