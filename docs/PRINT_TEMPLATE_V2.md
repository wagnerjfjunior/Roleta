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
