# RLT-PRINT-V2 — Gerador determinístico da roleta

Status: CANÔNICO
Version: RLT-PRINT-V2

## Arquitetura
A Skill da Roleta NÃO gera PDF. Ela devolve JSON validado.
O APP recebe esse JSON e aplica este template fixo.

Fluxo:
SKILL -> JSON VALIDADO -> RLT-PRINT-V2 -> PRÉVIA -> CONFIRMAÇÃO -> IMPRESSÃO

## Entrada
O payload precisa ter status VALIDADO e conter:
- evento.empreendimento = CAMINHOS DA LAPA
- evento.data
- evento.dia_semana
- evento.periodo
- evento.tegra_qtd
- evento.helbor_qtd
- evento.sorteio_empresa.tg
- evento.sorteio_empresa.hb
- salao[]
- standby[]
- online[]
- pendencias[]

Cada corretor deve conter:
- nome
- creci
- gerente
- diretor
- status_creci

SALÃO também contém ordem_final.

## Gate
Impressão é bloqueada se:
- status != VALIDADO;
- empreendimento != CAMINHOS DA LAPA;
- data/período/dia ausentes;
- helbor_qtd ausente;
- TG ou HB ausente;
- tegra_qtd divergir de salao.length;
- ordem_final não formar 1..N;
- qualquer campo cadastral obrigatório estiver vazio;
- houver pendências.

## Layout
A4 portrait.

Corpo: exatamente 6 colunas:
1. Nº
2. NOME
3. CRECI
4. GERENTE
5. DIRETOR
6. STATUS CRECI

Não existe coluna de número sorteado.

Cabeçalho: exatamente 2 linhas e 5 campos lógicos.

Linha 1:
- EMPREENDIMENTO (merge físico das colunas Nº + NOME)
- DATA
- HELBOR {quantidade}
- PERÍODO
- SORTEIO DE EMPRESA

Linha 2:
- CAMINHOS DA LAPA
- DD/MM/AAAA
- DIA DA SEMANA
- MANHÃ/TARDE/INTEGRAL
- split interno: TG X-Y | HB Z

O split TG/HB é visual e obrigatório.

## Blocos condicionais
SALÃO sempre aparece.
STAND-BY somente se standby.length > 0.
ON-LINE somente se online.length > 0.

## Visual
- uma única grade compartilhada;
- alinhamento vertical fixo;
- zebra branco/cinza claro;
- TG amarelo claro;
- HB azul claro;
- sem título editorial;
- sem subtítulo;
- sem status VALIDADA;
- sem hash;
- sem evidência;
- sem rodapé técnico.

## Regra antirregressão
O renderer não pode interpretar ou redesenhar o layout.
Ele apenas preenche este template com o JSON validado.


## RLT-RECONCILIATION-V2
A leitura manuscrita não é verdade canônica por si só. Antes da impressão e antes de alimentar estatística, cada corretor deve passar por reconciliação contra data/brokers-official.csv.

Estados:
- EXACT_MATCH: leitura e cadastro oficial convergem sem ambiguidade.
- PROBABLE_MATCH: melhor candidato, ainda exige confirmação humana.
- AMBIGUOUS: dois ou mais candidatos plausíveis.
- USER_CONFIRMED: usuário resolveu explicitamente a identidade.

Critérios de reconciliação, em ordem:
1. similaridade do nome manuscrito com Nome Comercial;
2. gerente/equipe como evidência de desempate quando disponível;
3. confirmação humana quando a evidência não for suficiente.

CRECI, diretor, equipe e status devem vir do cadastro oficial após a identidade ser resolvida; não devem ser inferidos da caligrafia.

Gate canônico:
- somente EXACT_MATCH e USER_CONFIRMED podem ser liberados para impressão e ingestão estatística;
- PROBABLE_MATCH e AMBIGUOUS bloqueiam;
- payload legado sem estado de reconciliação pode ser visualizado, mas não recebe confirmação canônica V2;
- o checkbox final confirma nomes, gerente/equipe e ordem final e autoriza aquela versão como fonte para estatística.

A confirmação visual deve ocorrer antes de qualquer atualização de ranking, HIT/MISS, presença ou modelo.


## Confirmação individual obrigatória

A partir de RLT-RECONCILIATION-V2:
- a aplicação recarrega `data/brokers-official.csv` e reconcilia cada linha novamente;
- `EXACT_MATCH` só ocorre por igualdade normalizada inequívoca com o cadastro oficial;
- similaridade reduz a lista para no máximo três candidatos;
- GERENTE/EQUIPE pode desempatar, mas não cria identidade por si só;
- `PROBABLE_MATCH` e `AMBIGUOUS` nunca são promovidos em lote;
- cada linha pendente exige seleção explícita de um candidato oficial e passa a `USER_CONFIRMED`;
- a escolha humana não pode alterar posição física, número sorteado ou ordem final;
- antes do gate final a interface mostra posição física → nome reconciliado → gerente → número sorteado → ordem final;
- `VALIDADO_PARA_IMPRESSAO` e `CANONICO_PARA_ESTATISTICA` são estados diferentes;
- a ingestão estatística é bloqueada até `CANONICO_PARA_ESTATISTICA`.
