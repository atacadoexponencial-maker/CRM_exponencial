# B38-04: Campos personalizados nas automações

**Tipo:** Implementação
**Página:** Configurações → Automações → editor
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-campos-personalizados.md`

## Descrição

O gatilho "Dado do contato alterado" e a ação "Alterar dado do contato" passam a oferecer os campos personalizados, e nasce a condição "Campo personalizado", com saídas sim e não.

## Pronto quando

Uma automação dispara quando o Porte muda para Grande, segue pela saída sim ou não conforme o Porte e marca "Cliente VIP: Sim" no contato.

## Critérios de aceite

- **CA-B38-37** (automática) — Gatilho dispara quando o campo muda. Dado a automação ligada com o gatilho "Dado do contato alterado", campo "Porte", valor novo "Grande", quando alguém muda o Porte de um contato para "Grande", pelo perfil, pelo Chat ou por outra automação, então a automação roda para esse contato; mudar para "Pequeno" ou salvar o mesmo valor de antes não a faz rodar
- **CA-B38-38** (automática) — Condição pelo campo personalizado. Dado a automação com a condição "Porte é qualquer um de Grande", quando ela roda para um contato com Porte "Grande" e para outro sem Porte, então o primeiro segue pela saída sim e o segundo pela saída não, e o histórico mostra a condição e o caminho de cada um
- **CA-B38-39** (automática) — Ação preenche o campo personalizado. Dado a automação com a ação "Alterar dado do contato", campo "Cliente VIP" (Sim/não), valor sim, quando ela roda para um contato, então o perfil do contato mostra "Cliente VIP: Sim"
- **CA-B38-40** (automática) — Valor da ação conferido pelo tipo. Dado o editor de automação com a ação "Alterar dado do contato" no campo "Limite de crédito" (Dinheiro), quando o Admin digita "muito" no valor e tenta salvar a automação, então o editor aponta o valor e não salva
- **CA-B38-62** (automática) — Cada automação roda uma vez por sequência. Dado a automação A ("quando Porte mudar para Grande, mudar Porte para Pequeno") e a automação B ("quando Porte mudar para Pequeno, mudar Porte para Grande"), as duas ligadas, quando alguém muda o Porte de um contato para Grande, então A roda, B roda e A não roda de novo: a sequência termina, o histórico mostra a segunda vez de A como "Não rodou: já rodou nesta sequência de mudanças", e o contato fica com Porte Grande

## Suposições

Nenhuma.

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| PER-B38-03 | Além do perfil e do filtro, onde os campos aparecem? | respondida | Painel do contato no Chat, cadastro de novo contato, automações e variáveis na mensagem. Marcelle, 26/10/2026. |
| PER-B38-13 | Mudança de campo personalizado feita por automação dispara outras automações? (Desde a B11, automação não dispara automação.) | respondida | Sim, só para campos personalizados; é uma exceção à regra da B11 (CA-B38-37). Marcelle, 26/10/2026. |
| PER-B38-14 | Como evitar laço infinito entre automações que mudam campos personalizados? | respondida | Numa mesma sequência de mudanças, cada automação roda no máximo uma vez; não há limite de quantas automações em cadeia (CA-B38-62). Marcelle, 26/10/2026. |

## Cenários

### Happy Path
1. No editor, o gatilho "Dado do contato alterado" lista os campos personalizados depois dos fixos. O "valor novo (opcional)" usa o controle do tipo: lista de opções, caixas da múltipla escolha, sim/não, número, data ou texto.
2. A condição ganha o atributo "Campo personalizado": escolhe o campo, a comparação (as mesmas do filtro de Contatos) e o valor.
3. A ação "Alterar dado do contato" lista os campos personalizados; o valor usa o controle do tipo, e o editor aponta na hora o valor fora do formato.
4. Quando o valor de um campo muda pelo perfil, pelo Chat, pelo cadastro ou por uma automação, o evento "dado do contato alterado" vai para a fila com o campo (`campo:<tipo>:<uuid>`) e o valor novo num formato único (número com ponto, data `aaaa-mm-dd`, ids das opções, `sim`/`nao`).
5. O histórico mostra o evento ("Porte mudou para \"Grande\""), a condição ("Porte é qualquer um de Grande") e o caminho.

### Edge Cases
- Salvar o mesmo valor de antes não dispara; trocar só maiúscula ou acento em texto também não (como os dados fixos, B22-05).
- Valor apagado dispara com valor vazio, e só a automação sem "valor novo" roda.
- Múltipla escolha: o "valor novo" casa quando o conjunto de opções é o mesmo, em qualquer ordem.
- Sequência de automações: o evento disparado por uma automação leva os ids das regras que já rodaram nessa sequência; regra que já está nela não roda de novo (PER-B38-14).
- Campo de outra empresa, opção que não é do campo ou comparação que não é do tipo: o servidor não salva a automação.

### Cenário de Erro
- Valor da ação fora do formato: o painel mostra a mensagem do tipo embaixo do valor, e o servidor recusa salvar ("O dado do contato escolhido não pode receber esse valor").
- Falha ao gravar o campo na execução: o passo falha no histórico, como as outras ações.

## Prova

| Critério | Prova | Onde | O que confere |
|---|---|---|---|
| CA-B38-37 | automática | `src/test/campos-personalizados-automacoes.integration.test.ts` | A regra roda quando o Porte muda para Grande pelo perfil (action), pela automação e pelo cadastro; não roda com Pequeno nem com o mesmo valor |
| CA-B38-38 | automática | `src/test/campos-personalizados-automacoes.integration.test.ts` | O contato com Porte Grande sai pelo "sim" e o sem Porte pelo "não"; o histórico traz o caminho e a frase da condição |
| CA-B38-39 | automática | `src/test/campos-personalizados-automacoes.integration.test.ts` | Depois da ação, o perfil do contato lê "Cliente VIP: Sim" |
| CA-B38-40 | automática | `src/test/campos-personalizados-automacoes.integration.test.ts` | O servidor recusa salvar a regra com "muito" no Limite; na tela, o painel aponta o valor (teste de tela) |
| CA-B38-62 | automática | `src/test/campos-personalizados-automacoes.integration.test.ts` | A roda, B roda, A fica "Não rodou: já rodou nesta sequência de mudanças" e o Porte termina Grande |

## Arquivos

- **Modificar:** `src/lib/campos-personalizados.ts` — valor no formato único (`canonicoDoValor`, `valorDoCanonico`) e a comparação da condição (`campoAtende`)
- **Modificar:** `src/lib/fluxo-automacao.ts` — verificação "campo_personalizado" com o campo escolhido, e quando ela está completa
- **Modificar:** `src/lib/automacoes/fluxo-recebido.ts` — aceita o campo da verificação
- **Modificar:** `src/lib/automacoes/contexto.ts` — o evento de dado alterado leva a sequência de regras
- **Modificar:** `src/lib/automacoes/index.ts` — casamento do gatilho com campo personalizado e o freio da sequência
- **Modificar:** `src/lib/automacoes/verificacoes.ts` — avalia a condição "campo personalizado"
- **Modificar:** `src/lib/automacoes/acoes.ts` — a ação grava o campo personalizado e dispara o gatilho com a sequência
- **Modificar:** `src/lib/automacoes/gatilhos-do-crm.ts` — `dispararCamposAlterados`
- **Modificar:** `src/lib/automacoes/referencias.ts` — junta campos personalizados citados no gatilho, na condição e na ação
- **Modificar:** `src/app/(auth)/configuracoes/automacoes/actions.ts` — confere, ao salvar, campo, opção, comparação e valor
- **Modificar:** `src/app/(auth)/configuracoes/automacoes/opcoes-editor.ts` — opções do editor com os campos da empresa
- **Modificar:** `src/app/(auth)/configuracoes/automacoes/components/catalogo.ts` — campos personalizados nas fontes do gatilho e da ação, e o atributo da condição
- **Modificar:** `src/app/(auth)/configuracoes/automacoes/components/painel-bloco.tsx` — controle do valor por tipo e a condição de campo personalizado
- **Modificar:** `src/app/(auth)/configuracoes/automacoes/components/frases-fluxo.ts` — frases do gatilho, da ação, da condição e do evento
- **Modificar:** `src/app/(auth)/contatos/campos-personalizados.ts` — grava e dispara o gatilho dos campos que mudaram
- **Modificar:** `src/app/(auth)/contatos/actions.ts` — o cadastro dispara o gatilho dos campos preenchidos
- **Criar:** `src/test/campos-personalizados-automacoes.integration.test.ts` — critérios no Supabase real
- **Criar:** `src/test/campos-personalizados-automacoes-tela.test.tsx` — painel do editor (valor apontado, condição)

## Checklist

- [x] Formato único do valor e comparação da condição na lib
- [x] Verificação "campo_personalizado" no fluxo e na leitura
- [x] Evento com sequência; casamento do gatilho; freio da sequência no motor
- [x] Condição avaliada no motor
- [x] Ação grava o campo e dispara com a sequência
- [x] Perfil, Chat e cadastro disparam o gatilho
- [x] Conferência ao salvar
- [x] Editor: opções, catálogo, painel e frases
- [x] Testes da tabela Prova e os das automações que já existem
- [x] `npx tsc --noEmit`
