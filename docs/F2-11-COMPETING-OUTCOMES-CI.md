# F2-11 — Corrida de resultados incompatíveis

O teste descartável cria uma previsão e inicia 12 conexões independentes tentando registrar outcomes com chaves e payloads diferentes para o mesmo evento. Exige um único sucesso, 11 rejeições e exatamente um outcome persistido.

Não equivale a um teste de credenciais runtime, nem certifica a integridade do hash provisório do protótipo. A função definitiva ainda precisa ser desenhada, revisada e testada com os mesmos cenários e com limites de tempo/conexões adequados ao Discador compartilhado.

Nenhuma alteração de produção.
