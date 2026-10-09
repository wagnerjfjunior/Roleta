# SFJM Live Sync — Teste local do PDF (PR #38)

Este roteiro **não depende do login Google, de foto ou do Make**, e não modifica a autenticação da Vercel.

1. No SFJM, selecione a branch `feat/roleta-pdf-share-ios-20261009` e atualize o código local.
2. Abra `INICIAR-PDF-LOCAL.bat` na raiz do repositório. Deixe a janela aberta. O script exige Node.js no PATH e instala `pdf-lib` se não estiver instalado.
3. Abra o Live Sync no endereço **http://localhost:8082**.
4. Na importação manual, cole o JSON de homologação. Execute todas as etapas de conferência e marque a confirmação final.
5. Aguarde `PDF pronto para salvar ou compartilhar no WhatsApp`.
6. Teste **Abrir PDF para imprimir**, **Salvar PDF** e **Compartilhar**. Compare o mesmo documento em todas as ações.

## Diagnóstico

- A API `/api/auth/session` na porta 8082 responde 404 por desenho: o Live Sync é um servidor **estático**.
- Somente no navegador aberto como `localhost:8082` ou `127.0.0.1:8082`, o app chama o serviço local `127.0.0.1:8083/pdf`; nenhum token Google é necessário ali.
- O serviço local escuta exclusivamente em **127.0.0.1**, aceita apenas os Origins SFJM conhecidos, não altera dados e não é utilizado na Vercel.
- Se houver erro de conexão, confirme que a janela BAT permanece aberta, que a porta 8083 não está ocupada e que o Node foi encontrado.
- Na Vercel, o endpoint `/api/roleta-pdf` continua exigindo Google SSO, origem válida e CSRF.
- O teste em desktop valida o PDF; o menu Compartilhar com WhatsApp precisa ser homologado no iPhone.
- Não publique a roleta fictícia em grupo nem a insira na base estatística.

## Importante

Não fazer merge até que o Codex e o teste visual aprovem a apresentação do novo PDF em comparação ao RLT-PRINT-V2.
