# Preparação das fotografias para OCR — 12/10/2026

## Problema e implementação

O app enviava o arquivo original e aceitava até 4 MiB. O OCR.space gratuito documenta limite de 1 MB por arquivo: https://ocr.space/ocrapi. O upload ao Gemini funcionou nas execuções inspecionadas; o erro 503 no módulo de geração era de alta demanda, separado do erro de tamanho no OCR.space.

`photo-prepare.js` prepara câmera e galeria no navegador antes de qualquer upload. Aceita JPEG/PNG/WebP de até 25 MiB, gera uma cópia JPEG de no máximo **900.000 bytes**, preserva proporção e não amplia imagens pequenas. Começa com lado maior de até 3000 px, testa qualidade 0,90 / 0,84 / 0,78 e só então reduz dimensões em passos de 15%, até 1800 px para fontes maiores. Imagens originalmente menores mantêm suas dimensões. JPEG pequeno dentro do orçamento e das dimensões segue sem recodificação. Transparência é composta sobre branco; a orientação é a apresentada pelo decodificador de imagens do navegador.

Se o limite não puder ser atingido com esses parâmetros, bloqueia o envio e orienta nova fotografia mais próxima da folha. Não há garantia automática de legibilidade: o operador deve conferir nomes, números e orientação na prévia. A prévia e o upload usam exatamente o mesmo arquivo preparado. A foto original não é sobrescrita.

A interface mostra bytes antes/depois e dimensões, exige nova confirmação a cada seleção e ignora o resultado de preparações antigas quando outra foto é selecionada ou removida. A troca da fotografia é bloqueada enquanto seu upload está em andamento. URLs temporárias e canvas são liberados.

`api/roleta-ocr.js` impõe os mesmos 900.000 bytes por Content-Length, body Buffer e contagem real do stream. O arquivo excedente não chega ao Make. Auth Google, CSRF, assinatura dos formatos e conferência humana continuam aplicados. JSON manual, impressão/PDF, ledger Supabase, histórico e WEEKLY_FROZEN não são modificados.

## Evidências e próxima ação

Validação local: `node --test tests/regression/*.test.cjs tests/*.test.cjs` aprovou 223 testes, sem falhas; sintaxe JavaScript e `git diff --check` aprovados.

Testes de preparação cobrem orçamento, JPEG, proporção, ausência de ampliação, redução gradual, piso de resolução/qualidade, erro de decodificação e liberação de recursos. O relay cobre rejeição de excesso mesmo com Content-Length ausente/forjado e body já materializado. A suíte de preparação é incluída no workflow Gemini Intake.

Os testes de codificação usam um encoder simulado, portanto não comprovam a aparência no iPhone nem a precisão do OCR em manuscritos. Próxima validação operacional: escolher a mesma foto real que falhou, conferir a cópia de até 900 KB, enviar, examinar a execução Make e conferir a tabela retornada. Não declarar o OCR ou primeiro salvamento real Supabase homologados antes dessa evidência.

O cenário Make mantém os dois ramos existentes; OCR.space não foi convertido em fallback nesta alteração. A troca anterior para Gemini 3.8 Flash é uma correção separada. Nenhuma mudança de banco ou migration é necessária para preparar fotografias.
