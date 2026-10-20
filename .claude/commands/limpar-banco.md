Limpe os dados de teste do banco sem desconectar o número de WhatsApp.

**Argumentos:** $ARGUMENTS (vazio = empresa "Marcelle Midias"; ou o nome de outra empresa)

## O que fazer

1. Rode a simulação primeiro, na raiz do projeto:
   ```bash
   node e2e/preview/limpar-banco.cjs
   ```
   (com `--empresa "<nome>"` se a usuária passou outro nome)
2. Mostre à usuária, em uma linha por tabela, o que seria apagado e qual número conectado fica.
3. Rode de verdade, sem perguntar de novo (ela já pediu ao chamar o comando):
   ```bash
   node e2e/preview/limpar-banco.cjs --executar
   ```
4. Confira na saída que o número conectado continua `connected`. Se não houver número conectado na saída, avise: o script não mexe em `whatsapp_connections`, então a causa é outra.
5. Relate os totais apagados em uma linha curta.

## Regras

- O script só apaga dados (contatos, conversas, mensagens, cards, tags, lembretes, execuções, alertas, eventos). Empresa, logins, times, números, automações, sequências, etiquetas, mensagens rápidas e catálogo ficam. Não amplie esse escopo por conta própria.
- Nunca rode em empresa cujo nome você não viu na saída da simulação.
- A empresa "[TESTE] Automações B11" tem o próprio reset: `node e2e/preview/resetar-empresa-teste.cjs`. Não use este comando nela.
