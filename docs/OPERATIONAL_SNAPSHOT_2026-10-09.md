# Roleta Intelligence V3 — Snapshot operacional homologado (09/10/2026)

> **Marco documental** do estado efetivamente publicado e homologado pelo operador em 09/10/2026. Não é um novo deployment, não modifica dados, modelos ou comportamento. Em divergência futura, resolver o `main` live, commit e deployment; não presumir que esta fotografia continua sendo HEAD.

## 1. Identificadores imutáveis

| Item | Valor |
|---|---|
| Repositório | `wagnerjfjunior/Roleta` |
| Branch de produção fotografada | `main` |
| Commit publicado/homologado | `2ca0165992c97a7e5db601863236788fe1f18729` |
| PR de compartilhamento JPG | [#39](https://github.com/wagnerjfjunior/Roleta/pull/39) |
| PR-base do PDF e impressão | [#38](https://github.com/wagnerjfjunior/Roleta/pull/38) |
| Deployment Vercel ativo na fotografia | `dpl_BYrkeBBcqJtHEA2ockrFh93z3NPf` |
| URL oficial | https://roleta-tgv.vercel.app |
| Estado Vercel verificado | `READY`, alias `roleta-tgv.vercel.app` associado |
| Deployment de rollback imediato | `dpl_HQFiFsh4h3oUU9PAuKgPsJvXD2DX` (PR #38, `73c5401f9c87c2e6c04f1e315bebc5f02f9fdad5`) |
| Escopo | Fluxo Nova Roleta → revisão humana → folha final → PDF impressão/download → JPG compartilhamento |

**Homologação declarada pelo operador:** impressão em iPhone com ambas as margens, botões PDF funcionais e compartilhamento da foto via WhatsApp funcionando; correção do nome/extensão JPG confirmada inicialmente no desktop. Isso é aceite operacional relatado, não ensaio automatizado de hardware/impressora ou garantia universal em todos os aparelhos.

## 2. Fluxo operacional canônico

```text
FOTO/PAPEL DA ROLETA
    ↓
OCR / transcrição inicial (atualmente Google → Make/Gemini quando configurado; JSON manual compatível)
    ↓
JSON importado — NÃO é autorização de impressão
    ↓
Normalização estrutural e conferência de cadastro
    ↓
TELA DE REVISÃO HUMANA
  cabeçalho: data, período, empreendimento, quantidade TG/HB, share/sorteio de empresa
  SALÃO: posições e identidade de cada corretor
  STAND BY e ON-LINE: inclusão/correção
    ↓
Confirmação de revisão — gera payload canônico revisado
    ↓
Prévia final + confirmação humana explícita
    ↓
Geração do PDF A4 validado no servidor
    ├── Abrir PDF para imprimir → visualizador nativo/impressão
    ├── Salvar PDF → arquivo .pdf oficial
    └── Pré-renderização de JPG a partir DESSE PDF
         └── Compartilhar foto → menu nativo do dispositivo → escolha manual do WhatsApp/grupo
```

**Invariantes:**
1. OCR, Gemini, Skill e JSON são auxiliares; **revisão e aprovação humanas são obrigatórias**.
2. Cadastro oficial: `data/brokers-official.csv`; DTO empregado pela UI e validador de PDF: `data/print-brokers.json`. Não corrigir nome sem atualizar CRECI, gerente, diretor e status.
3. Documento aprovado é representado por um payload revisado; qualquer mudança invalida confirmação e artefatos preparados.
4. `resultado.numero_exposto=false` deve permanecer protegido; compartilhamento não revela número sorteado oculto.
5. Identidade, posições, dia/data, quantidade, company draw e pendências são validados; falha de validação **bloqueia exportação**.
6. PDF/JPG/print **não gravam automaticamente evento na base estatística**. Não presumir ingestão/backfill por compartilhamento.
7. Compartilhar oferece a folha ao menu nativo; **não envia automaticamente** mensagem ou imagem ao grupo.
8. O JPG é derivado da página final do PDF, não de um renderer visual alternativo.
9. Se JPG falhar, PDF para impressão e download pode continuar disponível; não substituir silenciosamente por PDF no botão Foto.
10. Reimprimir, salvar novamente e compartilhar novamente não são operações de ingestão; evitar efeitos colaterais/deduplicação implícita.

## 3. Os três botões — contrato de UX

| Botão | Arquivo produzido/usado | Comportamento |
|---|---|---|
| `Abrir PDF para imprimir` | `Roleta-DD-MM-YYYY-periodo.pdf` | `window.open(blob:)`; impressão pelo visualizador do PDF; no iPhone usa ação Imprimir do viewer |
| `Salvar PDF` | `Roleta-DD-MM-YYYY-periodo.pdf` | download do PDF já gerado, sem nova impressão/alteração |
| `Compartilhar foto` | `Roleta-DD-MM-YYYY-periodo.jpg` | `navigator.share({files:[File(image/jpeg)]})` no clique, WhatsApp escolhido pelo usuário |

**Não adicionar botão concorrente `Compartilhar PDF`** sem nova decisão: foi rejeitado operacionalmente para reduzir erro de uso. O PDF já pode ser salvo.

O botão Foto inicia **desabilitado**; após a confirmação, o PDF é gerado; o cliente carrega PDF.js 3.11.174 via CDN, converte a página única A4 com `scale: 2.5` e `canvas.toBlob('image/jpeg',0.94)`; só então libera a ação. O Web Share API exige gesto explícito do usuário no iPhone. Uma falha em CDN, PDF.js, canvas, render ou `navigator.canShare` deve ser visível e não deve enganar o operador com arquivo PDF rotulado como foto.

**Regressão real corrigida na PR #39:** o padrão de substituição do nome JPG inicialmente buscava uma barra invertida literal antes de `.pdf`, deixando o nome terminado em `.pdf`. A correção aprovada usa `pdfFilename().replace(/\.pdf$/i,'.jpg')`, e existe teste de regressão para o sufixo. Não confundir **tipo MIME** (`image/jpeg`) com **nome do arquivo** (`.jpg`): ambos importam na folha de compartilhamento do Windows/WhatsApp.

## 4. Componentes e fronteiras

- `roulette-intake.js`: normalização, conferência/edição humana, prévia, estado do aceite final e ações de PDF/JPG/Web Share.
- `lib/roleta-pdf.js`: validador do payload final e gerador PDF A4 (pdf-lib, `PageSizes.A4`), cruzando corretores do DTO oficial.
- `api/roleta-pdf.js`: POST do PDF em produção, exigindo sessão Google, token CSRF, mesma origem e limite de tamanho; `Cache-Control: no-store`.
- `auth/google.js`: verificação de sessão e CSRF reutilizada pela API, **não contornar**.
- `data/brokers-official.csv` → `data/print-brokers.json`: origem oficial e projeção de impressão; manter reconciliação auditável.
- `scripts/local-pdf-server.cjs`: gerador de PDF exclusivo para SFJM Live Sync, loopback `127.0.0.1:8083`; aceita apenas origem `localhost:8082` ou `127.0.0.1:8082` e conexões locais. **Não publicar este servidor diretamente na rede.**
- `INICIAR-PDF-LOCAL.bat`: launcher auxiliar Windows do PDF local, separado do SFJM Live Sync.
- PDF.js `3.11.174` carrega dinamicamente de `cdnjs.cloudflare.com`; dependência operacional externa do botão Foto; os demais botões dependem apenas do PDF preparado.

**Limitação preservada:** Live Sync em `localhost:8082` com serviço local de PDF em `127.0.0.1:8083` é um ambiente de desktop. Navegador em outro dispositivo não resolve `127.0.0.1` para o desktop. O teste no iPhone foi realizado no domínio HTTPS de produção.

## 5. Reproduzir localmente no Windows (SFJM)

1. Executar `C:\Users\Usuário\Desktop\SFJM-LIVE.bat` e usar o menu SFJM para Roleta. `localhost:8082` hospeda a UI.
2. Para gerador PDF local, executar `INICIAR-PDF-LOCAL.bat` com Node e `pdf-lib` disponíveis, mantendo porta `8083` aberta no loopback.
3. Selecionar uma branch explícita e atualizar somente com árvore Git limpa; `git status --short` antes de iniciar. Pastas `node_modules/` e BATs duplicados **não rastreados** podem bloquear `sfjm-refresh-sync.ps1` com `Worktree is DIRTY`. Preservar arquivos em backup externo ao repositório; nunca usar `git clean -fdx` indiscriminadamente.
4. `git fetch origin <branch>` consulta/baixa a branch; `git switch --track origin/<branch>` a seleciona, desde que a árvore de trabalho permita. SFJM mantém controles de autorização de refresh e merge.
5. Se Browser apresentar arquivo antigo, confirmar branch, `git branch --show-current`, reiniciar Live Sync e usar reload forçado.

**Teste local de botão JPG não garante seleção final no iOS:** a homologação completa do compartilhamento e da impressão é feita no Safari/WhatsApp do iPhone no domínio oficial ou em ambiente de teste HTTPS configurado.

## 6. Matriz de homologação do marco

| Caso | Evidência/estado da fotografia |
|---|---|
| PDF válido A4 de 1 página | Teste `tests/roleta-pdf-share.test.cjs` com payload canônico e PDF-lib |
| Validação de data/dia, quantidades e oficialidade | Testes de entradas inválidas no mesmo teste |
| Compatibilidade de share legado e composição TG/HB | Testes automatizados |
| iOS impressão com as duas margens | Relato explícito de homologação no dispositivo (PR #38) |
| Salvar PDF | Relato explícito de homologação no dispositivo (PR #38) |
| JPG criado a partir do PDF final | Código e teste de integração estrutural na PR #39 |
| Extensão correta `.jpg` | Regressão demonstrada e corrigida; teste local do usuário |
| JPG entregue como foto no WhatsApp iPhone | Homologação explícita do operador após produção PR #39 |
| CI do último commit da PR #39 | GitHub Actions `success` em `52c14264f2fc079812d340216659d7c1bcaf2695` |
| Escrita na base estatística | **Não implementada neste fluxo**; operação separada e governada |
| Teste universal de impressoras e navegadores | **Não alegado** |

Não utilizar artefatos de teste com datas fictícias para alimentar base histórica ou compartilhar em grupo operacional.

## 7. Rollback e recuperação

**Deploy atual da fotografia:** `dpl_BYrkeBBcqJtHEA2ockrFh93z3NPf` → `2ca0165992c97a7e5db601863236788fe1f18729` (PR #39).

**Rollback imediato de aplicação:** na Vercel, restaurar o deployment anterior `dpl_HQFiFsh4h3oUU9PAuKgPsJvXD2DX` (`73c5401f9c87c2e6c04f1e315bebc5f02f9fdad5`, PR #38). Isso volta ao **compartilhamento PDF**, preservando a impressão validada. Confirmar aliases do domínio e health da versão restaurada. Reversão de deployment **não reverte o commit GitHub**; após rollback, planejar correção ou revert versionado para evitar novo deploy regressivo.

**Quando fazer rollback:** quebra no login/API de PDF, bloqueio de impressão/salvamento, vazamento de número oculto ou comportamento que produza folha incorreta. Erros exclusivos do JPG podem ser isolados pelo gate do próprio botão, mas devem ser tratados antes de retomar operação plena.

Não efetuar rollback, merge, ingestão ou alteração de regra estatística sem autorização explícita.

## 8. Risco residual e próximos gates

1. CDN PDF.js: dependência online da foto; avaliar vendorização local e política de integridade/CSP numa futura PR isolada.
2. JPG com muitas linhas: a impressão A4 foi testada com amostra típica; verificar visualmente nitidez, uma página e tamanho de compartilhamento para casos extremos.
3. Cadastro oficial e OCR: manter reconciliação humana, correções nominais auditáveis, proteção de IDs e divergências; não confiar apenas em IA.
4. Estatística: ingestão de evento real, reimpressão sem duplicatas, correção posterior e semana `WEEKLY_FROZEN` são **governança separada**, sem pressupor que foram resolvidas por esta PR.
5. Atualizar métricas/dataset apenas pelas fontes canônicas atuais: `data/manifest.json`, `docs/sfjm/CURRENT_DATA_STATE.json`. Números narrativos antigos nos handoffs não são fotografia numérica deste marco.
6. Toda alteração futura nos três botões requer regressão automatizada e teste real de Safari/WhatsApp; não fazer alteração incidental em PDF ao mexer no JPG.

## 9. Referências e rastreabilidade

- Contrato canônico: `docs/PRINT_TEMPLATE_V2.md`.
- Histórico inicial: `docs/RLT_PRINT_V2_CHANGELOG_2026-10-07.md`.
- PR #38: PDF A4, APIs, impressão e download; homologação iPhone.
- PR #39: foto JPG, conversão prévia, Web Share; correção da extensão.
- Testes: `tests/roleta-pdf-share.test.cjs`, `tests/ios-print-gesture.test.cjs`, `tests/print-layout-blank-pages.test.cjs`.
- Estado histórico geral: `handoffs/CURRENT.md`, `docs/PROJECT_STATUS.md`, `docs/NEXT_SAFE_ACTION.md`.
- Foto de estado **não implica congelamento do código**, tag Git ou backup independente: a âncora é o SHA de commit e o ID do deployment, ambos identificados acima.
