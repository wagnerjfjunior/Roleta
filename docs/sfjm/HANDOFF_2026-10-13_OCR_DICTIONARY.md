# SFJM — fechamento de sessão: OCR, conferência e dicionário

Atualizado em 13/10/2026, America/Sao_Paulo. Autoridade: repositório
`wagnerjfjunior/Roleta`. Pedido atual: documentar todo o trabalho e atualizar SFJM.
Este documento prevalece sobre os estados de candidato e as próximas ações
históricas dos documentos referenciados. Não constitui implantação de nova lógica.

## Estado verificado ao fechar a sessão

- Main resolvida ao vivo: `96fde2927667ddc7a94744b53e603e56bca3bc96`, merge da PR #116.
- Código funcional do aprendizado: PR #115, merge
  `b2885001679a44f0251d7d8949245c626f19b5ec`.
- Produção observada nesta atualização: projeto Vercel `roleta`, deployment
  `dpl_EwyjVC7m6u1f7zrz6r8zmPGUPQbr`, READY, commit funcional acima, domínio
  `https://roleta-tgv.vercel.app`. Main inclui documentação posterior; deployment
  funcional e HEAD documental são referências distintas.
- Frontend pós-publicação: sete arquivos HTTP 200 e idênticos à árvore aprovada.
- Testes locais da entrega: 260 aprovados; sete testes da camada/DOM repetidos
  após reforço contra posições originais duplicadas, todos aprovados.
- PR #115: cinco workflows aprovados no SHA final `d12d8521`.
  PR #116: quatro workflows aprovados; atualização documental mergeada.
- Base versionada em `data/manifest.json`: 86 eventos, 82 A / 4 B. Não é contagem
  nova do Supabase; não houve consulta/gravação estatística nesta sessão.

## Trabalho anterior integrado e preservado

| Entrega | Evidência / referência | Situação |
| --- | --- | --- |
| Roleta Simples e Sorteador existentes | Main baseline `470993d`; PRs #103–#106 | Já existiam; não reconstruir |
| UX, entrada Google e fundo imobiliário | PR #109, commit `34cde4e`; 239 testes no registro da publicação | Publicado antes desta camada |
| Terceira opção OCR.space | PR #110, commit `83004c8`; laboratório isolado e 247 testes registrados | Publicado; conferência humana obrigatória |
| Correções de geometria, colunas e recuperação de nomes | `OCR_SPACE_THIRD_OPTION_2026-10-13.md` | Integradas; precisão manuscrita não garantida |
| Aguardar montagem da revisão antes de anunciar sucesso | PR #114, main anterior `ade03b4` | Publicado; teste DOM com cadastro lento/indisponível |
| Aprendizado local e bolinhas ambíguas | PR #115 | Publicado nesta sessão |
| Registro de publicação no SFJM | PR #116, main `96fde292` | Mergeado |

Referências: `UX_ENTRY_REVIEW_LOCAL_TRIAL_2026-10-13.md`,
`OCR_SPACE_THIRD_OPTION_2026-10-13.md`, `OCR_LEARNING_LOCAL_2026-10-13.md`,
`FINAL_SHEET_SINGLE_REVIEW_2026-10-12.md`,
`OPERATOR_VALIDATED_OCR_SUPABASE_FLOW_2026-10-12.md`.
Os testes de cada entrega não substituem uma auditoria integral de segurança ou
a observação operacional de login, OCR, salvamento e impressão no dispositivo.

## Fluxo Make e responsabilidade do aplicativo

Fluxo registrado do cenário 6549955:

1. Gemini 19 (3.8) → Webhook Response 13, se houver sucesso.
2. Falha de 19 → Gemini 27 (3.6) → Resume 29 → resposta 13.
3. Falha de 19 e 27 → OCR.space 30 → JSON 31 → Resume 32 → Resume 29 → 13.

O módulo 13 devolve a resposta ao backend do aplicativo. 31 serializa o envelope;
32 e 29 retomam o fluxo, não respondem diretamente ao telefone. `output: null`
no export de Resume não comprova perda do retorno. A rota shadow 26 é histórica
e foi preservada; não a declarar como base de aprendizado operacional.
Esta atualização não modifica ou reinspeciona a configuração live do Make.

O backend converte o texto/coordenadas em rascunho. A revisão OCR.space mantém
a ordem física para comparar com a fotografia. A ponte humana ordena o SALÃO
pelas bolinhas confirmadas, preservando internamente `physical_position`.
Imprimir, PDF e compartilhar não equivalem a salvar no Supabase.

## Implementação exata da camada publicada

- Novo módulo `ocr-learning.js`, carregado em Intelligence e `/simples/`.
- Captura após o evento `roleta-final-confirmed`, disparado pela confirmação
  da folha final. Apenas marcar linhas ou transferir OCR não registra exemplos.
- Pareamento pela posição física original da mesma leitura; posições ausentes,
  duplicadas ou alteradas não treinam. Só SALÃO conserva posição física na folha
  final nesta versão; STAND-BY/ON-LINE não produzem exemplos automaticamente.
- Registro local por e-mail da sessão Google, até 200 folhas/100 pares por folha.
  Sem fotografia, credenciais, token ou CRECI no histórico de aprendizado.
- Sugestão exige a mesma grafia → mesmo nome em duas folhas distintas por
  empreendimento/data/período, sem conflitos. Esse suporte não é probabilidade
  de acerto nem benchmark de fotografias independentes.
- O nome exato do cadastro prevalece; alvo inexistente/ambíguo não produz regra.
  A sugestão preserva `nome_lido`, aparece como OCR → nome oficial e nunca marca
  a linha, libera impressão ou grava registros automaticamente.
- Não aprende bolinhas. `numero_lido_original` preserva tokens; `010` deixa a
  bolinha vazia e mostra a dúvida, sem decidir 01 ou 10. Duplicações 01/1 são
  comparadas numericamente. Campos incertos exigem conferência.
- Armazenamento indisponível não bloqueia a folha final. Botão para limpar o
  histórico local. Nenhuma sincronização entre contas/dispositivos foi entregue.
- Nenhuma mudança de Make, schema Supabase, ACL ou WEEKLY_FROZEN nesta camada.

## Evidência real e referência humana definitiva

Fontes fornecidas pelo operador nesta conversa, sem copiar os arquivos pessoais
para o repositório: `Foto_Roleta.jpeg`, `module-32-execution (1).json`,
`Roleta-06-10-2026-tarde.jpg` e `Roleta-06-10-2026-tarde (1).pdf`.

Evento: Caminhos da Lapa, 06/10/2026, TARDE; Helbor 17; TG 1–2 / HB 3.
PDF final declarado corrigido pelo operador: 27 SALÃO + Globz/Madri STAND-BY.
Exemplos verificados de linha física → bolinha → posição final:
Paola 16 → 01 → 1; Arnon 1 → 04 → 4; Wagner 14 → 12 → 12;
Sabrina 8 → 26 → 26.

O PDF posterior corrige o segundo colocado da imagem anterior: **Monara,
CRECI 192.223-F, gerente Cazarim**. A imagem anterior indicava Maranata.
A referência humana final desta sessão é o PDF posterior. Não manter a primeira
identidade como exemplo verdadeiro da mesma leitura/linha após a correção.

Pares candidatos identificados ao comparar a leitura original e o PDF:

| Grafia OCR | Nome confirmado | Linha física original |
| --- | --- | --- |
| PAQLA | Paola | 16 |
| Monata | Monara | 18 |
| VALEMA | Valeria | 3 |
| BEMENT O | Benedito | 4 |
| Sobrina | Sabrina | 8 |

Esses pares foram analisados nesta conversa; **não foram importados no navegador
nem registrados no banco pelo assistente**. Upload de PDF no chat não escreve
no localStorage. Uma reconfirmação no aplicativo atual pode registrar os pares
se o rascunho original e o mapeamento físico ainda estiverem disponíveis.
Não afirmar que o usuário já possui esses exemplos no seu histórico local.
Reenvios da mesma folha não viram uma segunda folha para o limiar de suporte.

## Decisão canônica: agregação de grafias confirmadas

Esclarecimento explícito do responsável às 17h06–17h08:

- Paola pode agregar PAQLA, PATLA e outras grafias confirmadas.
- Valeria pode agregar VALEMA, VALERA e outras grafias confirmadas.
- Uma nova grafia válida não substitui/apaga uma grafia anterior válida.
- Valerio não pode ser automaticamente absorvido por Valeria. Se for nome exato
  válido, prevalece; se não existir, ausência no cadastro não prova identidade.
- Corrigir associação comprovadamente errada é diferente de adicionar uma grafia.
- Pares incertos e conflitos ficam para o operador. Números não pertencem ao
  dicionário de nomes. Conferência humana continua obrigatória.

PAQLA/VALEMA etc. acima foram observados. PATLA/VALERA são exemplos propostos
pelo responsável; não são novas ocorrências observadas neste OCR nem regras
automaticamente ativadas nesta atualização documental.

## Divergência conhecida entre requisito e código

O código agrega aliases diferentes entre folhas. Porém `record()` identifica a
folha por empreendimento/data/período e **substitui o conjunto de pares da mesma
folha** na reconfirmação. Isso evita contar replay como nova evidência e corrige
associações erradas, mas pode apagar uma grafia válida reconhecida em outra
leitura dessa mesma folha.

O assistente usou a palavra “substituir” sem distinguir esses casos e depois
reconheceu a imprecisão. Não considerar resolvida no código a agregação entre
leituras distintas da mesma folha. **Esse refinamento está pendente.**

## Próxima ação segura e critérios de aceite

Preparar localmente o refinamento da agregação com evidência por leitura:

1. Separar identidade da folha de identidade da leitura original; planejar ID/hash
   estável, sem confiar somente no nome corrigido ou na ordem final.
2. Preservar variantes válidas de leituras diferentes da mesma folha. A mesma
   leitura reenviada não cria outro exemplo. Suporte para sugestão continua
   contando folhas distintas, não número de tentativas.
3. Quando uma associação for corrigida, retirar/revogar a evidência incorreta
   daquela leitura/linha. Não apagar variantes válidas de outras leituras nem
   preservar pares sabidamente incorretos como aprendizado.
4. Testar agregação PAQLA/PATLA, VALEMA/VALERA, replay, conflito, correção, posição
   física alterada e proteção de Valerio. Preservar texto bruto e bloqueios humanos.
5. Atualizar documentação e apresentar o resultado antes da promoção conforme
   autorização vigente. O pedido atual é documentação; nenhum refinamento de
   código, migração ou novo rollout foi executado por esta atualização.

Armazenamento compartilhado Supabase foi recomendado, mas **não implementado**
e não integra este pedido documental. Se houver implementação posterior, usar
acesso privado e autorização no servidor, autoria/versionamento, revogação de
exemplos incorretos e isolamento do ledger final/prospectivo. Não ampliar acesso
nem reabrir gates de segurança já encerrados sem evidência nova.

## Retomada

Resolver main ao vivo, ler `handoffs/CURRENT.md`, este handoff e
`docs/NEXT_SAFE_ACTION.md`. Não reconstruir UX, login, sorteador ou fallback;
não induzir falhas nos Gemini de produção; não inserir roletas fictícias na base;
não recalcular recomendações congeladas; manter LOCAL-FIRST / NO PREVIEW.
Os antigos estados de 04/10 dos read models são snapshots, não o gate atual.
