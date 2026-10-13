> **Regra canônica esclarecida em 13/10/2026:** agregar variantes confirmadas por nome oficial; uma nova grafia não apaga outra válida. O código publicado ainda substitui o conjunto da mesma folha na reconfirmação; preservar leituras distintas da mesma folha é refinamento pendente. Ler [HANDOFF_2026-10-13_OCR_DICTIONARY.md](HANDOFF_2026-10-13_OCR_DICTIONARY.md) para evidência, decisões, limites e próxima ação.

## Publicação confirmada — 13/10/2026

PR #115 mergeada após os cinco workflows do GitHub concluírem com sucesso.
Commit funcional: `b2885001679a44f0251d7d8949245c626f19b5ec`.
Deployment de produção: `dpl_EwyjVC7m6u1f7zrz6r8zmPGUPQbr`, READY,
projeto `roleta` (`prj_Fc4IcpnaqmYj3XSvhV8g0avwbv4o`), alias
`https://roleta-tgv.vercel.app` atribuído à main.
Verificação HTTP pós-publicação: os sete arquivos de frontend alterados
responderam 200 e coincidem byte a byte com a árvore aprovada.
Não foi feita gravação de roleta fictícia nem login operacional do usuário.
Próxima ação: observar uma confirmação real e as sugestões em folhas distintas
no mesmo navegador/conta. Aprendizado local não é sincronizado no Supabase.
Os registros de candidato e autorização abaixo são históricos.

# Aprendizado assistido do pós-OCR — candidato local

Autorização: em 13/10/2026 o responsável pediu implementar a camada de melhorias,
mantendo dúvidas para conferência manual. Branch `feature/ocr-learning-20261013`.
Em 13/10/2026 o responsável autorizou enviar a branch ao GitHub para teste Live Sync.
Às 16h41 o responsável autorizou o merge para main. PR #115 aberta;
publicação pendente de checks/merge/verificação. Não altera o Make ou o banco.

## Comportamento

- `ocr-learning.js` registra pares nome bruto → nome oficial somente depois da
  confirmação da folha final. Transferir a leitura ou marcar linhas não treina.
- A associação usa a posição física original da mesma leitura, nunca a ordem
  final. Posição alterada, ausente, duplicada ou participante excluído não treina.
- Nesta versão somente SALÃO possui posição física na folha final e produz pares.
  STAND-BY/ON-LINE continuam sujeitos à conferência, sem aprendizado automático.
- São necessárias duas folhas distintas (empreendimento/data/período) com o mesmo
  par e sem conflito para sugerir um nome. Isso é suporte operacional, não uma
  probabilidade de acerto nem validação em fotos independentes.
- Reenvios/reimpressões/reconfirmações não acumulam suporte. Uma nova confirmação
  da mesma folha substitui seus pares anteriores. Uma correção ainda pendente não
  substitui o exemplo anterior até a nova confirmação; pode-se limpar o histórico.
- Nome exato válido do cadastro sempre prevalece. Alvo ausente/ambíguo e pares
  conflitantes não produzem sugestão aprendida. Aliases existentes continuam.
- O texto lido é preservado. Sugestões aparecem como `OCR: bruto → oficial · conferir`.
  Nenhuma linha é marcada, impressa, salva ou aprovada pelo aprendizado.

## Números e dúvida

O dicionário aprende apenas nomes. O parser preserva `numero_lido_original`.
Tokens como `010` não são convertidos silenciosamente em uma bolinha 10 ou 1:
o rascunho apresenta campo vazio e o token original para preenchimento pela foto.
Duplicidades como `01` e `1` são comparadas numericamente na revisão.
Ausências e conflitos continuam bloqueando a transferência.

## Armazenamento e limites

Histórico em localStorage, separado pelo e-mail da sessão Google. Até 200 folhas,
100 pares por folha, sem fotografia, chave de API, cookie, token ou CRECI.
Não é sincronizado entre dispositivos/contas; limpar dados do navegador apaga os
exemplos. Há botão para limpar o aprendizado. Não é uma fonte confiável de
autorização: adulteração local pode afetar sugestões, nunca os controles de
conferência, o cadastro canônico ou a autorização do backend.
Falha de armazenamento não bloqueia a folha final.

O desenho compartilhado com evidência de foto/autoria/versionamento no Supabase,
comparação Gemini × OCR e benchmark independente permanece futuro. Esta versão
não implementa esse desenho nem declara que o OCR.space remoto aprende.

## Verificação e promoção

Bateria local completa: 260 testes passaram. Após o reforço contra posições
originais duplicadas, os 7 testes da camada/integração foram repetidos e passaram.

Testes unitários: duas folhas, replay, conflito, correção, cadastro exato/ambíguo,
mapeamento físico, isolamento por conta, armazenamento indisponível e token 010.
Teste DOM integrado: revisar → transferir sem aprender → confirmar folha final →
registrar → repetir sem duplicar → alterar posição sem treinar → sugestão pendente
na próxima leitura → limpar histórico. Regressões de OCR e conferência executadas.

Próximo passo: testar a branch no Live Sync conforme autorização de envio registrada,
com merge autorizado na PR #115. Conferir checks, merge e deployment de produção.
Não usar o histórico de produção como massa de teste nem reabrir WEEKLY_FROZEN.
