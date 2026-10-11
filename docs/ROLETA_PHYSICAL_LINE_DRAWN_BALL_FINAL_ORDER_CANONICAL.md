# RLT — Semântica canônica: linha física, bolinha sorteada e ordem de atendimento

**Status:** entendimento operacional confirmado pelo responsável do projeto em 11/10/2026.  
**Escopo:** Roleta Intelligence V3; transcrição, conferência humana, impressão, compartilhamento, ingestão histórica e análises estatísticas.  
**Natureza:** documentação de domínio; não altera algoritmos, contrato SQL, banco, execução do sorteio nem layout.

## 1. Três conceitos distintos

1. **Posição física pré-sorteio** (`posicao_fisica`): índice da linha **ocupada** pelo corretor na lista física pré-sorteio, numerada de 1 até N participantes elegíveis do SALÃO. Não é resultado nem ordem de atendimento. Linhas vazias/riscadas não recebem bolinha; a numeração das linhas ocupadas deve ser contínua, sem reutilizar índices originais de linhas vazias.
2. **Número da bolinha sorteada** (`numero_sorteado`): número atribuído ao corretor no sorteio; não se deduz da posição física. A bolinha 1 determina o primeiro atendimento, a bolinha 10 determina o décimo atendimento, e assim por diante, conforme as regras operacionais aplicáveis.
3. **Ordem final de atendimento** (`ordem_final`): posição ocupada pelo corretor na roleta final publicada após o sorteio. Neste fluxo do SALÃO, segue a ordem das bolinhas: a pessoa que recebe a bolinha 1 ocupa a primeira posição final, a pessoa que recebe a bolinha 10 ocupa a décima. Apesar de coincidirem numericamente quando o sorteio determina diretamente a sequência, número sorteado e posição física **nunca** são sinônimos.

**Não confundir a linha física 1 com a bolinha 1.** São dimensões independentes.

## 2. Exemplo aprovado

Evento fictício com N=10 corretores:

| Corretor | Posição física pré-sorteio | Bolinha sorteada | Ordem final de atendimento |
| --- | ---: | ---: | ---: |
| Wagner | 1 | 10 | 10 |
| Corretor X | 10 | 1 | 1 |

Assim:
- Wagner assina/consta na **primeira linha física**, mas recebe a **bolinha 10** e atende em **décimo**.
- O Corretor X consta na **décima linha física**, mas recebe a **bolinha 1** e atende em **primeiro**.
- **Quem tira a bolinha 1** — independentemente de qual linha física ocupe — é a pessoa responsável por passar a roleta a limpo, imprimir, levá-la à recepção, fotografar e publicar no grupo de WhatsApp, segundo a prática relatada. O aplicativo é o instrumento para executar esse trabalho quando a família do operador assume a responsabilidade.
- A expressão "tirou o número 1" deve ser interpretada, nesse contexto, como **recebeu a bolinha 1 no sorteio**. Para a primeira linha, escrever explicitamente "posição física 1".

## 3. Temporalidade real e dois fluxos autônomos

### 3.1 Operação do sorteio e publicação (Roleta Simples)

- A lista física de inscritos pode receber corretores até **08:45:59** (MANHÃ) e **13:45:59** (TARDE). Até esses instantes ela fica disponível para assinaturas; não existe snapshot homologado antecipadamente.
- Ao fechar a inscrição, a folha é usada por quem realiza o sorteio. A responsabilidade de passar a limpo decorre do **resultado sorteado**, não da posição física 1.
- Com o sorteio concluído, a pessoa responsável transcreve/confere a ordem final no aplicativo, imprime ou salva PDF, leva à recepção, fotografa e compartilha no WhatsApp.
- **Imprimir, reimprimir, gerar PDF, fotografar ou compartilhar não significa inserir automaticamente um novo evento na base estatística.**
- O fluxo operacional não deve depender da disponibilidade posterior da foto original nem da gravação prospectiva F2-12.

### 3.2 Ingestão da base estatística (assíncrona e independente)

- A folha original pode ser fotografada **no mesmo dia (ideal)**, **no dia seguinte** ou posteriormente, quando estiver disponível.
- Registrar separadamente: `data_evento` / período original, `capturado_em` quando conhecido, `importado_em` e `validado_em`. **Não tratar a data da importação como data do sorteio.**
- Transcrição automática/JSON são rascunhos sujeitos à conferência humana. Preservar posição física, bolinha sorteada (quando documentada), ordem final, identificação do corretor, classe de participação e fonte/proveniência.
- Idempotência e reconciliação por evento impedem que a mesma roleta seja duplicada quando enviada ou impressa novamente. Correções precisam ser rastreáveis, sem apagar evidências anteriores.
- Eventos importados tardiamente podem alimentar análises **históricas**, mas jamais ser apresentados como dados que estavam disponíveis antes do sorteio.

## 4. Invariantes de domínio para futuras implementações e testes

- Para N corretores do SALÃO que efetivamente participam da permutação, `posicao_fisica` deve identificar cada uma das N linhas ocupadas de modo único no evento; a sequência relevante é 1..N.
- Para um sorteio plenamente conhecido, a correspondência corretor → bolinha sorteada é uma permutação completa dos números 1..N: nenhum número duplicado ou ausente. A ordem final reflete o resultado, não a ordem de assinatura.
- **É inválido inferir** `numero_sorteado = posicao_fisica`. A coincidência pode ocorrer por acaso, nunca por regra.
- **É inválido inferir** que quem estava na posição física 1 deva limpar/imprimir/compartilhar. Essa responsabilidade pertence a quem recebeu a bolinha 1.
- Importação histórica posterior não autoriza recriar previsões pré-sorteio. Sempre distinguir evidência anterior ao resultado, apuração operacional e documentação posterior.
- SALÃO, STAND BY e ON-LINE permanecem classes distintas conforme o contrato `RLT-PRINT-V2`; não adicionar STAND BY/ON-LINE automaticamente à permutação 1..N do SALÃO.
- Campos ilustrativos deste documento são **conceituais**: sua existência como campos físicos no banco, JSON ou UI deve ser verificada antes de qualquer migração. Não renomear `ordem_final` ou criar `numero_sorteado` no produto sem mapear contratos reais e migrações.

## 5. Repercussão no Gate C / F2-12

O entendimento anterior de que a elegibilidade seria comprovada por uma **lista pré-sorteio congelada** não corresponde ao processo físico real. Não impor captura antecipada nem impedir a impressão e a importação histórica por essa razão.

A F2-12, porém, trata de **previsões prospectivas**, não da operação ou backfill. Uma previsão produzida antes do resultado pode ser registrada com ator, instante, política e eventual `posicao_fisica` **declarada como hipótese**, sem atestar presença definitiva do corretor. A confirmação de presença/linha de um evento só pode ocorrer depois da disponibilização e validação da folha, como evidência independente e posterior. Uma hipótese não pode ser reclassificada retroativamente como certeza pré-sorteio.

**Estado atual:** `api/prospective-v2-append.js` contém um gate de prova de roster que falha fechado; a flag `ROLETA_V2_WRITES_ENABLED` permanece desligada. A revisão desse gate para aceitar previsões **não verificadas quanto à presença** exige contrato explícito de incerteza, auditoria de segurança, testes e decisão própria antes de habilitar qualquer escrita. Não confundir a necessidade de redesenhar F2-12 com defeito no processo operacional.

## 6. Próximos critérios de aceite

1. Teste com Wagner: linha 1 → bolinha 10 → ordem final 10; outro corretor: linha 10 → bolinha 1 → ordem final 1 e responsabilidade de publicação.
2. Testes para posições vazias/riscadas, N variável, números repetidos/ausentes e separação SALÃO/STAND BY/ON-LINE.
3. Teste da mesma roleta importada em D+1 e novamente no mesmo dia: um único evento histórico e timestamp de importação preservado.
4. Teste de reimpressão e compartilhamento sem nova inclusão estatística.
5. Segregação entre registros de previsão pré-sorteio, dados operacionais após sorteio e base histórica validada.

**Referências internas:** `docs/PRINT_TEMPLATE_V2.md`, `docs/F2-12_GATE_C_IDENTITY_AND_ROSTER_DECISION_2026-10-11.md` (premissa pré-sorteio substituída por este registro de domínio).
