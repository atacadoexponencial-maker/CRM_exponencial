# B11 — Registro de decisões: automações em fluxo de blocos

**Data desta sessão:** 30/09/2026
**Quem:** Luan
**Spec:** `pre-desenvolvimento/spec-automacoes-v2.md`
**Branch:** `b11-automacoes-v2`

> Este documento registra o **caminho**, não só o resultado: o que foi decidido, o
> que foi descartado e por quê.

---

## 1. Formato da regra: fluxo de blocos, e não formulário em lista

**Decidido:** a regra é um fluxo de blocos ligados, no estilo do N8N. Um bloco de
gatilho abre o fluxo, blocos de condição têm saídas **sim** e **não**, e blocos de
ação fazem uma coisa cada.

**Descartado:** a primeira versão da spec (29/09) tinha um formulário com três blocos
fixos empilhados (Quando, Se, Então): uma lista de condições com E e uma lista de
ações em ordem, com botões para mover para cima e para baixo.

**Por quê:** o Luan pediu um fluxo "bem livre", que permita uma variedade grande de
automações. O formulário em lista não consegue ter caminhos diferentes conforme o
caso: por exemplo, se o cliente tem a tag VIP manda a mensagem A, se não tem manda a
B. Com a lista, isso exigiria duas regras separadas que precisam ser mantidas iguais.

**Consequência para o banco (B11-02):** a regra é guardada como blocos + ligações.
Guardar como lista e mudar para blocos depois obrigaria uma segunda migração de
todas as regras. Guardando como blocos desde o início, as extensões da fase 2
(caminhos em paralelo, bloco "esperar") não mudam o formato.

## 2. Limites do fluxo na fase 1

| Regra | Por quê |
|---|---|
| Cada saída leva a **um** bloco só | Com duas setas saindo da mesma saída, a ordem de execução entre os dois caminhos fica ambígua. Caminhos em paralelo ficaram para a fase 2. |
| Uma entrada pode receber **várias** ligações | Caminhos que se juntam ("em qualquer caso, depois aplique a etiqueta X") não têm ambiguidade e evitam repetir blocos. |
| **Sem laços** | Sem o bloco "esperar", um laço roda para sempre na mesma execução. O editor recusa a ligação na hora de conectar. |
| **OU** se faz encadeando condições pelo "não" | Um bloco de condição só tem E. Isso mantém o bloco simples e cobre o OU sem um construtor de grupos. |
| Ligar uma saída ocupada **troca** a ligação | É o que a pessoa quer quando arrasta de novo de uma saída que já tem seta, e dispensa uma mensagem de erro. |

## 3. Biblioteca do canvas: React Flow (`@xyflow/react`)

**Decidido:** o canvas do editor usa o React Flow (`@xyflow/react`, v12, licença MIT).

**Por quê:** é a biblioteca de referência para editores de nós em React. O próprio
N8N usa o Vue Flow, que é o equivalente dela em Vue. Arrastar, aproximar, ligar
blocos por alças de saída e entrada, e recusar uma ligação (`isValidConnection`)
já vêm prontos. Escrever isso à mão seria a maior parte do trabalho da B11-01 e
da B11-05.

**Descartado:** montar o canvas à mão com SVG e eventos de ponteiro. Dá para fazer,
mas não compensa.

**Como integrar (da documentação oficial):** o CSS da biblioteca é importado no CSS
global, **depois** do Tailwind (orientação específica para Tailwind 4); o componente
precisa de um contêiner pai com altura definida; os tipos de bloco (`nodeTypes`) são
declarados fora do componente, para não recriar os blocos a cada renderização.

## 4. Branch, merge e banco

**Decidido:** a série inteira é feita no branch `b11-automacoes-v2` e entra no
`master` **uma vez só**, depois que o Luan testar o motor e o editor novos no preview
da Vercel e aprovar.

**Descartado:** merge por etapas (B11-01+02, depois 03+04, depois o resto). O Luan
quer ver a troca do motor e o editor funcionando antes de qualquer coisa ir para
produção.

**Restrição que isso impõe:** o Supabase é um só, e ele é ao mesmo tempo produção e
desenvolvimento. O preview grava no banco real. Por isso:

- As migrations da B11 **só acrescentam** (tabelas e colunas novas). Nada é apagado
  nem alterado, e o CRM publicado continua lendo a estrutura antiga sem perceber.
- A limpeza da estrutura antiga (`acao_tipo`, `acao_config` etc.) é uma etapa
  separada, **depois do merge**, quando der para confirmar que nada mais usa aquilo.
- Os testes no preview disparam ações de verdade. Por isso devem ser feitos com um
  contato de teste.
- As mensagens do WhatsApp chegam só no CRM publicado. Gatilhos de mensagem
  (B11-04 em diante) precisam ser testados simulando o evento ou apontando o gateway
  para o preview por um tempo.
- O branch vai viver bastante tempo, então o `master` deve ser trazido para dentro
  dele de tempos em tempos.
