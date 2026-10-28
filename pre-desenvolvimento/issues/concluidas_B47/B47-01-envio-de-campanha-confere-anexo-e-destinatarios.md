# B47-01: Envio de campanha confere anexo e destinatários

**Tipo:** Implementação
**Página:** Envio de campanha
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-seguranca-rodada-5.md`

## Descrição

Na hora de mandar, o envio de campanha confere de novo o anexo e cada destinatário com as
regras da tela, para uma campanha gravada direto no banco não mandar o que a tela não
deixaria.

## Pronto quando

Uma campanha com anexo de fora é interrompida sem mandar nada, um destinatário que não é
contato da empresa não recebe, a mensagem vai para o telefone atual do contato e a
campanha feita pela tela sai como antes.

## Critérios de aceite

- **CA-B47-01** (automática) — anexo de fora gravado direto no banco não sai. Dado uma campanha confirmada cujo anexo foi trocado direto no banco por um endereço fora da pasta de campanhas da empresa, quando o envio roda, então nenhuma mensagem vai para o canal, e a campanha fica "Interrompida" com o motivo "O anexo da campanha não é um arquivo da empresa".
- **CA-B47-02** (automática) — destinatário que não é contato da empresa não recebe. Dado uma campanha com um destinatário gravado direto no banco que aponta para o contato de outra empresa, quando o envio roda, então nada é mandado para esse destinatário, ele fica "Excluído" com o motivo "Não é contato da empresa", e os outros destinatários recebem normalmente.
- **CA-B47-03** (automática) — a mensagem vai para o telefone atual do contato. Dado um destinatário cujo telefone guardado na campanha é diferente do telefone atual do contato, quando o envio roda, então a mensagem vai para o telefone atual do contato, e nunca para o guardado.
- **CA-B47-04** (automática) — a campanha feita pela tela continua saindo. Dado uma campanha montada pela tela, com anexo enviado por ela e destinatários da empresa, quando o envio roda, então todos recebem a mensagem com o anexo, como antes.

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B47-01 | Anexo de fora interrompe a campanha inteira (e não só pula o anexo), porque a campanha foi adulterada | confirmada | Marcelle, 28/10/2026 |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| PER-B47-01 | Telefone guardado diferente do atual: mandar para qual? | respondida | Para o telefone atual do contato (Marcelle, 28/10/2026) |

## Cenários

### Happy Path
1. A rotina das campanhas lê a fila das "enviando".
2. Antes de entregar uma campanha ao envio, confere o anexo com a mesma regra da tela (`anexoDaEmpresa`, que sai de `campanhas/actions.ts` para `src/lib/campanhas.ts` e passa a ser usada pelos dois lados).
3. No lote, os contatos dos destinatários são lidos **só da empresa da campanha**, com o telefone atual.
4. Cada destinatário recebe no telefone atual do contato. Se o guardado for diferente, o destinatário passa a guardar o atual, para o relatório mostrar para onde foi.

### Edge Cases
- **Anexo de fora:** a campanha vira "Interrompida" com "O anexo da campanha não é um arquivo da empresa", antes de qualquer envio, e sai da fila sem ocupar a vaga de outra.
- **Destinatário com contato de outra empresa** (ou que não existe mais com aquele id): "Excluído", com "Não é contato da empresa"; o lote segue.
- **Contato apagado de vez** (sem contato ligado) e **na lixeira:** continuam como na B44-05 e na B13-03.
- **Campanha sem anexo:** nada muda.

### Cenário de Erro
- Falha ao ler os contatos do lote: nenhum destinatário do lote é tratado como da empresa, e todos ficam "Excluído" em vez de receber sem conferência.

## Prova

| Critério | Prova | Onde | O que confere |
|---|---|---|---|
| CA-B47-01 | automática | `src/test/campanhas-envio-reconfere.test.ts` | com o anexo apontando para fora da pasta de campanhas da empresa, a rotina não chama o canal e a campanha fica "interrompida" com o motivo |
| CA-B47-02 | automática | `src/test/campanhas-envio-reconfere.test.ts` | o destinatário com contato de outra empresa fica "excluido" com o motivo, sem envio, e o destinatário da empresa recebe |
| CA-B47-03 | automática | `src/test/campanhas-envio-reconfere.test.ts` | com o telefone guardado diferente do atual, o canal recebe só o telefone atual |
| CA-B47-04 | automática | `src/test/campanhas-envio-reconfere.test.ts` | campanha com anexo da pasta da empresa e destinatários da empresa: todos recebem a mídia com o anexo |

## Banco de Dados

Nenhuma mudança.

## Arquivos

- **Criar:** `src/lib/anexo-da-campanha.ts` — `anexoDaEmpresa`, que sai de `campanhas/actions.ts` para a tela e o envio usarem a mesma regra (arquivo próprio: dez testes substituem `@/lib/campanhas` por uma versão falsa, lição L-05)
- **Modificar:** `src/lib/campanhas.ts` — confere o anexo antes de enviar, lê os contatos só da empresa e manda para o telefone atual
- **Modificar:** `src/app/(auth)/campanhas/actions.ts` — passa a importar `anexoDaEmpresa` de `src/lib/anexo-da-campanha.ts`
- **Modificar:** `src/test/campanhas-envio-uma-vez.test.ts` — os contatos falsos da B44-05 ganham empresa e telefone, que o envio agora confere
- **Criar:** `src/test/campanhas-envio-reconfere.test.ts` — testes desta issue (banco em memória, padrão da B20-03)

## Checklist

- [x] Levar `anexoDaEmpresa` para `src/lib/anexo-da-campanha.ts`
- [x] Interromper a campanha com anexo de fora antes do envio
- [x] Ler os contatos do lote só da empresa e mandar para o telefone atual
- [x] Rodar todos os testes de campanha (lição L-05)
- [x] Rodar o `tsc` no projeto inteiro
