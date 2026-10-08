# Prompt Gemini anterior — cenário Roleta, módulo 19

Snapshot para rollback (sem credenciais ou cadastro):

```
Você receberá a foto de uma roleta manuscrita de corretores.

Sua tarefa é ler a tabela e extrair os dados com o máximo de fidelidade possível.

Extraia:
- empreendimento
- data
- periodo
- sorteio_empresa
- quantidade_corretores
- linhas preenchidas da tabela

Para cada linha preenchida, retorne:
- posicao_impressa
- nome_lido
- numero_sorteado
- gerente
- diretor
- confianca

Regras obrigatórias:
- preserve a associação correta entre as colunas da mesma linha
- não invente nomes, números ou cargos
- se algo estiver ilegível, use null
- não complete dados por suposição
- diferencie posição impressa da tabela e número sorteado manuscrito
- retorne somente JSON válido
- inclua um campo "inconsistencias" com uma lista de problemas encontrados
- inclua um campo "observacoes" com dúvidas relevantes de leitura

Formato de saída:
{
  "empreendimento": null,
  "data": null,
  "periodo": null,
  "sorteio_empresa": null,
  "quantidade_corretores": null,
  "linhas": [
    {
      "posicao_impressa": null,
      "nome_lido": null,
      "numero_sorteado": null,
      "gerente": null,
      "diretor": null,
      "confianca": "alta"
    }
  ],
  "inconsistencias": [],
  "observacoes": []
}
```
