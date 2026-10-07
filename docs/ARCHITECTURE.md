# Roleta — Arquitetura de Software

Status: PROPOSTA VALIDADA NA BRANCH  
Branch: `refactor/domain-core-prospective-state-20261007`

## 1. Princípio

A aplicação separa operação, dados canônicos, identidade, análise estatística, simulação e validação prospectiva. Nenhuma camada de UI é fonte de verdade.

```text
FONTES OPERACIONAIS
  -> intake / revisão humana
  -> evento canônico + impressão operacional

CANONICAL DATA
  -> dashboard histórico
  -> nominal ledger
  -> prospective ledger
  -> simulation lab

IDENTITY GATE
  -> exact/alias = canônico
  -> fuzzy/ambíguo = confirmação humana ou quarentena
```

## 2. Camadas

### Operação
- `roulette-intake.js`
- `docs/PRINT_TEMPLATE_V2.md`
- `data/print-brokers.json`

Responsabilidade: transcrição, revisão humana, classes SALÃO/STAND-BY/ON-LINE, preview e impressão/PDF.

### Domain Core
- `domain/core.js`

Responsabilidade: primitivas compartilhadas e determinísticas de domínio:
- chance 2X;
- elegibilidade por posição;
- hit 2X;
- score por posição;
- ranking;
- ranking por período com fallback global.

Regra: consumidores não devem reimplementar essas primitivas sem justificativa explícita.

### Canonical Event Data
- `data/manifest.json`
- `data/events.csv`
- `data/incoming/*.csv`

Responsabilidade: universo lógico dos eventos reais. O manifest é autoridade para contagens voláteis.

### Nominal / Identity
- `data/full_draws_reconstructed.csv`
- `data/brokers-official.csv`
- `reconciliation/identity.js`
- `data/identity-reconciliation.jsonl`

Responsabilidade: participação nominal auditável por corretor. Identidades pendentes não alimentam estatística por corretor.

### Prospectivo
- `prospective/ledger.js`
- `prospective/generator.js`
- `data/prospective/*.jsonl`

State machine:
- WEEKLY_FROZEN: `FROZEN`, imutável;
- CURRENT: `DRAFT`, revisável até freeze do evento;
- EXECUTED_CHOICE: execução observada separadamente;
- RANDOM_SHADOW: controle determinístico;
- adjudicação somente depois do evento real.

### Simulation Lab
- `simulation/*`

Responsabilidade: testar robustez/metodologia em dados sintéticos. Simulação não altera evidência real nem recomendações congeladas.

### UI / Dashboard
- `app.js`
- `prospective/ui.js`
- `simulation/ui.js`

Responsabilidade: leitura e apresentação. Não é autoridade de dados.

## 3. Estado derivado

Contagens voláteis não devem ser copiadas manualmente entre documentos.

Fonte derivada:
- `docs/sfjm/CURRENT_DATA_STATE.json`

Gerador:
- `scripts/build-current-data-state.js`

Autoridades de entrada:
- manifest;
- nominal ledger;
- prospective ledgers.

Documentos humanos podem descrever decisões e gates, mas valores de contagem devem apontar para o estado derivado.

## 4. Invariantes

1. UI != fonte de verdade.
2. Print payload != canonical event automaticamente.
3. Resultado estrutural != identidade nominal.
4. Fuzzy identity != estatística canônica.
5. Simulation != evidência real.
6. Recommendation != execution != outcome.
7. WEEKLY_FROZEN nunca é reescrito.
8. CURRENT inicia DRAFT e só congela por ação de freeze válida.
9. Resultado nunca cria ou melhora retrospectivamente uma recomendação.
10. Contagens canônicas vêm do manifest/ledgers, não de documentação manual.

## 5. Evolução

Não há justificativa atual para migração para framework SPA ou backend transacional.

Backend passa a ser indicado quando houver:
- concorrência multiusuário;
- autenticação/permissões;
- recepção em tempo real;
- estado operacional mutável compartilhado;
- push/WhatsApp;
- necessidade de transações.

Até esse ponto, GitHub + CSV/JSON/JSONL versionados preservam melhor auditabilidade, rollback e prova temporal.
