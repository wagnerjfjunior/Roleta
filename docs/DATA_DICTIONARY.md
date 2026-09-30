# Roleta — Data Dictionary

## Evento

| Campo | Tipo | Definição |
|---|---|---|
| source_file | texto | evidência de origem |
| event_id | texto | identificador único |
| date | data/texto | data normalizada quando confirmada |
| period | enum | manha, tarde, integral, desconhecido |
| N | inteiro | participantes válidos |
| occupied_physical_positions | lista<int> | posições físicas acima da linha |
| first_physical | inteiro | posição física que recebeu Nº1 |
| first_effective | inteiro | ordem efetiva dessa posição |
| second_physical | inteiro | posição física que recebeu Nº2 |
| second_effective | inteiro | ordem efetiva |
| courtesy_physical | inteiro | posição física que recebeu N-1 |
| courtesy_effective | inteiro | ordem efetiva |
| last_physical | inteiro | posição física que recebeu N |
| last_effective | inteiro | ordem efetiva |
| quality | enum | A, B, QUARANTINE |
| notes | texto | exceções/proveniência |

## Camada nominal futura

| Campo | Definição |
|---|---|
| broker_raw | grafia exata na folha |
| broker_canonical | identidade normalizada quando confirmada |
| alias_status | confirmed / unresolved |
| physical_position | posição física ocupada |
| effective_order | ranking entre posições ocupadas |
| drawn_number | número sorteado |
| outcome | Nº1, Nº2, Nº3, Cortesia, Último ou regular |
