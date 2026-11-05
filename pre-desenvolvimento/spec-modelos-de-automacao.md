# Spec: Bloco de anotação e modelos de automação

> série: B59
> estado: aprovada em 05/11/2026

## Visão Geral

Quem monta uma automação hoje parte de um gatilho vazio e não tem onde explicar o que
fez. Esta mudança traz duas coisas para o Admin:

1. **Bloco de anotação:** um texto livre, solto em qualquer lugar do desenho, para
   explicar uma parte da automação ou como alterá-la. Não faz parte do caminho e não
   muda o que a automação executa.
2. **Modelos de automação:** uma galeria com cinco automações prontas para os usos do
   CRM, cada uma explicada por anotações: como funciona, o que cada parte faz e o que
   mudar para adaptar. O modelo abre como automação nova e desligada.

A tela se chama "Modelos" porque "Templates" já é o nome dos templates da Meta, em
Configurações.

**Agendar envio em massa:** a automação não tem gatilho por data e hora, roda um contato
por vez e não envia template da Meta. Quem agenda é a tela de Campanhas. Por isso o
modelo prepara o público com uma tag, e as anotações ensinam a agendar a campanha
filtrando por ela (decisão do Luan, 05/11/2026).

## Páginas / Módulos

### Editor de automações: bloco de anotação

**Descrição:** o editor ganha um tipo de bloco que só guarda texto.

**Componentes:**
- Bloco de anotação: cartão com visual próprio, diferente dos blocos que executam, com o
  texto digitado.
- Item "Anotação" em "Adicionar bloco".

**Comportamentos:**
- Adicionar uma anotação pelo botão "Adicionar bloco".
- Digitar e editar o texto direto no bloco, com quebra de linha.
- Arrastar a anotação para qualquer lugar do desenho.
- Duplicar e apagar a anotação, como os outros blocos.
- Salvar a automação com anotações e reabri-la.
- Duplicar uma automação que tem anotações.

**Critérios de aceite:**

#### CA-B59-01 — Adicionar uma anotação · prova: automática

- **Dado** o editor de uma automação
- **Quando** o Admin abre "Adicionar bloco" e escolhe "Anotação"
- **Então** um bloco de anotação aparece no desenho, selecionado, sem alças de ligação e sem o botão "+"; e o menu aberto pelo "+" de uma saída não oferece "Anotação"

#### CA-B59-02 — Escrever e reabrir · prova: automática

- **Dado** uma anotação no desenho
- **Quando** o Admin digita um texto de várias linhas no bloco, arrasta a anotação, salva e reabre a automação
- **Então** o texto aparece igual, com as quebras de linha, na posição em que foi deixado

#### CA-B59-03 — Tamanho do texto · prova: automática

- **Dado** uma anotação
- **Quando** o Admin chega a 2.000 caracteres
- **Então** o bloco não aceita mais texto, e o servidor recusa uma anotação maior que isso gravada por fora do editor

#### CA-B59-04 — Duplicar e apagar · prova: automática

- **Dado** uma anotação selecionada
- **Quando** o Admin usa "Duplicar" e depois apaga a cópia
- **Então** a cópia nasce com o mesmo texto e sai do desenho ao ser apagada; e apertar Delete ou Backspace enquanto digita só altera o texto, sem apagar o bloco

#### CA-B59-05 — Anotação não trava o salvar · prova: automática

- **Dado** uma automação completa, com uma anotação escrita e outra vazia
- **Quando** o Admin salva
- **Então** a automação é salva, e nenhuma anotação recebe o aviso "Bloco solto" nem conta como ação no caminho

#### CA-B59-06 — Só anotação não basta · prova: automática

- **Dado** uma automação com gatilho e anotações, sem nenhuma ação
- **Quando** o Admin salva
- **Então** a tela avisa "Ligue pelo menos uma ação ao caminho", como em uma automação sem anotações

#### CA-B59-07 — Anotação não muda a execução · prova: automática

- **Dado** a mesma automação, com e sem anotações
- **Quando** o gatilho dispara para um contato
- **Então** as duas fazem as mesmas ações, na mesma ordem, e o histórico não mostra anotação no caminho

#### CA-B59-08 — Anotação fica fora do teste · prova: automática

- **Dado** o resultado de "Testar com um contato" na tela
- **Quando** o Admin edita ou arrasta uma anotação
- **Então** o resultado continua valendo, sem o aviso de que o fluxo mudou, e a anotação não aparece apagada nem destacada como parte do caminho

#### CA-B59-09 — Anotação não se liga a nada · prova: automática

- **Dado** um fluxo gravado por fora do editor, com uma ligação que sai de uma anotação ou chega nela
- **Quando** o servidor confere o fluxo
- **Então** o fluxo é recusado com "O fluxo tem ligações inválidas"

#### CA-B59-10 — Limites · prova: automática

- **Dado** uma automação com 100 blocos que executam e algumas anotações
- **Quando** o Admin salva
- **Então** a automação é salva, porque as anotações não contam nos 100 blocos; e, com mais de 30 anotações, a tela avisa "Uma automação pode ter até 30 anotações" e não salva

#### CA-B59-11 — Alteração não salva e rascunho · prova: automática

- **Dado** uma automação salva
- **Quando** o Admin altera o texto de uma anotação
- **Então** a tela mostra "Alterações não salvas", e o rascunho recuperado traz o texto digitado

#### CA-B59-12 — Salvar anotação não mexe em quem espera · prova: automática

- **Dado** uma automação ativa com um contato em um bloco "esperar"
- **Quando** o Admin adiciona, edita ou apaga uma anotação e salva
- **Então** a tela não pede para cancelar esperas, e o contato continua esperando

#### CA-B59-13 — Duplicar a automação leva as anotações · prova: automática

- **Dado** uma automação com anotações
- **Quando** o Admin usa "Duplicar" na lista
- **Então** a cópia traz as mesmas anotações, nas mesmas posições

### Automações: galeria de modelos

**Descrição:** a lista de automações ganha o acesso aos cinco modelos. Os modelos são os
mesmos para todas as empresas.

**Componentes:**
- Botão "Modelos" no topo da lista e no estado vazio dela.
- Galeria com título, descrição curta e o botão "Usar modelo" de cada um.

**Comportamentos:**
- Abrir a galeria.
- Escolher um modelo e abri-lo no editor.
- Adaptar, testar, salvar e ativar a automação criada a partir do modelo.
- Usar o mesmo modelo mais de uma vez.
- Sair do editor sem salvar.

**Critérios de aceite:**

#### CA-B59-14 — Abrir a galeria · prova: automática

- **Dado** a lista de automações, vazia ou não
- **Quando** o Admin clica em "Modelos"
- **Então** aparecem os cinco modelos, cada um com título, descrição e "Usar modelo"

#### CA-B59-15 — Usar um modelo · prova: automática

- **Dado** a galeria aberta
- **Quando** o Admin clica em "Usar modelo"
- **Então** o editor abre com o nome, os blocos, as ligações, as anotações e a repetição do modelo, com a opção "Salvar e ativar"; e nenhuma automação nova existe até ele salvar

#### CA-B59-16 — O modelo vira automação comum · prova: automática

- **Dado** um modelo aberto no editor e adaptado
- **Quando** o Admin salva e, depois, usa o mesmo modelo de novo
- **Então** a primeira fica na lista como automação desligada, com as alterações dele; e o modelo abre outra vez como veio, sem as alterações

#### CA-B59-17 — Modelo e automação nova não dividem rascunho · prova: automática

- **Dado** um rascunho não salvo de "Nova automação"
- **Quando** o Admin usa um modelo, altera algo, sai sem salvar e abre "Nova automação"
- **Então** o modelo abre sem o aviso do rascunho da automação nova, e o rascunho de cada um continua separado

#### CA-B59-18 — Só o Admin · prova: automática

- **Dado** um Gerente ou Atendente
- **Quando** ele abre o endereço de um modelo
- **Então** é levado para fora do editor, como acontece em "Nova automação"

#### CA-B59-19 — Modelo inexistente · prova: automática

- **Dado** um endereço com um modelo que não existe
- **Quando** o Admin o abre
- **Então** volta para a lista de automações

#### CA-B59-28 — Modelos à vista na lista vazia · prova: automática

- **Dado** uma empresa sem nenhuma automação
- **Quando** o Admin abre Automações
- **Então** a tela diz "Você não tem nenhuma automação ainda", mostra o botão "Criar a primeira automação" e, embaixo dele, os cinco modelos em cartões, cada um com título, descrição, a prévia dos passos (ex.: "Mensagem recebida do cliente → Condição → Mover card para etapa") e "Usar modelo", que abre o modelo no editor; com automações na lista, os cartões não aparecem e os modelos ficam no botão "Modelos" (pedido do Luan, 05/11/2026, ao ver o preview)

### Os cinco modelos

**Descrição:** o conteúdo de cada modelo. Em todos há uma anotação geral, com o que o
modelo faz e o que adaptar, e uma anotação perto de cada bloco, com o que ele faz e o que
mudar. Etapas, perfis e tags são sugestões que a pessoa pode trocar.

**Critérios de aceite:**

#### CA-B59-20 — Preparar público para campanha · prova: automática

- **Dado** o modelo "Preparar público para campanha"
- **Quando** ele abre
- **Então** o desenho é: gatilho "Entrou no perfil RFV" (Em Risco, às 9h) → "Adicionar tag" `campanha-reativacao`; e as anotações explicam que quem já estava no perfil antes não entra sozinho, e como agendar pela tela de Campanhas filtrando por essa tag, escolhendo data e hora

#### CA-B59-21 — Mover lead que pediu preço · prova: automática

- **Dado** o modelo "Mover lead que pediu preço"
- **Quando** ele abre
- **Então** o desenho é: gatilho "Mensagem recebida" → condição "texto contém alguma das palavras" (preço, valor, tabela, comprar, pedido) e "card está em Entrada: Lead" → no "sim", "Mover card" para Entrada: Negociação; e as anotações explicam como trocar palavras e etapas, e por que a condição da etapa evita tirar um cliente de uma etapa mais à frente

#### CA-B59-22 — Tag automática por interesse · prova: automática

- **Dado** o modelo "Tag automática por interesse"
- **Quando** ele abre
- **Então** o desenho é: gatilho "Mensagem recebida" → condição "texto contém alguma das palavras" (revenda, atacado, lojista) → no "sim", "Adicionar tag" `interesse-atacado`; e as anotações explicam como trocar as palavras e a tag, e como usar a tag em filtros e campanhas

#### CA-B59-23 — Follow-up sem resposta · prova: automática

- **Dado** o modelo "Follow-up sem resposta"
- **Quando** ele abre
- **Então** o desenho é: gatilho "Card movido" para Entrada: Catálogo Enviado → "Enviar mensagem" → "Esperar" 2 dias ou até receber mensagem → se receber, "Adicionar tag" `respondeu-follow-up`; se o tempo acabar, "Criar lembrete" na Agenda para o responsável pela conversa; e as anotações explicam cada saída, como mudar o prazo e o texto

#### CA-B59-24 — Boas-vindas por horário · prova: automática

- **Dado** o modelo "Boas-vindas por horário"
- **Quando** ele abre
- **Então** o desenho é: gatilho "Conversa criada" → condição "dentro do horário comercial" → no "sim" e no "não", um "Enviar mensagem" cada; e as anotações explicam onde ajustar o horário comercial e como mudar os textos

#### CA-B59-25 — Modelos coerentes com o CRM · prova: automática

- **Dado** cada um dos cinco modelos
- **Quando** o fluxo é conferido pelas mesmas regras do Salvar
- **Então** não há problema de estrutura nem bloco solto; toda anotação tem texto; e todo bloco que executa tem uma anotação perto dele, sem cobrir nenhum bloco

#### CA-B59-26 — Aprovação visual · prova: manual

- **Dado** os cinco modelos abertos no preview, nos temas claro e escuro e em uma tela de celular
- **Quando** o Luan lê cada anotação
- **Então** o texto está claro para quem nunca montou uma automação, nada se sobrepõe, e a anotação se distingue dos blocos que executam

#### CA-B59-27 — Modelo rodando de verdade · prova: manual

- **Dado** a empresa de teste com um número conectado
- **Quando** o Luan usa o modelo "Follow-up sem resposta", ativa e move um card para Catálogo Enviado, respondendo em um teste e não respondendo em outro
- **Então** a mensagem chega no celular; quem respondeu recebe a tag; e, para quem não respondeu, o lembrete aparece na Agenda depois do prazo (um prazo curto vale para o teste)

## Fora de escopo

- Gatilho por data e hora, ou envio para uma lista, nas automações.
- Criar uma campanha a partir do modelo: as anotações só ensinam o caminho.
- Envio de template da Meta por automação.
- Formatação no texto da anotação (negrito, listas, cores) e anotação ligada a um bloco.
- Modelos criados ou editados pelas empresas, e pedir valores em um assistente antes de abrir o modelo.
- Mudanças em Campanhas.

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B59-01 | A anotação tem largura fixa e cresce com o texto; não dá para redimensionar. | confirmada | Luan, 05/11/2026 |
| SUP-B59-02 | As anotações não contam nos 100 blocos e vão até 30 por automação, com 2.000 caracteres cada. | confirmada | Luan, 05/11/2026 |
| SUP-B59-03 | Os modelos são os do texto acima (etapas, perfil, palavras e tags sugeridos por mim). O perfil Em Risco e a etapa Negociação são pontos de partida. | confirmada | Luan, 05/11/2026 |
| SUP-B59-04 | No modelo "Boas-vindas por horário", a mensagem sai só na conversa nova, uma vez por contato. | confirmada | Luan, 05/11/2026 |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| PER-B59-01 | As mensagens dos modelos (Follow-up e Boas-vindas) vêm com um texto genérico pronto, que pode sair ao ativar sem editar, ou em branco, obrigando a pessoa a escrever antes de salvar? | respondida | Texto genérico pronto, a recomendação apresentada, que o Luan aceitou ao dizer "pode seguir", 05/11/2026 |
| PER-B59-02 | Como fica o modelo de envio em massa? Decidido: preparar público por tag, com as anotações ensinando Campanhas. | respondida | Luan, 05/11/2026 |
| PER-B59-03 | Quais são os outros dois modelos? Decidido: "Follow-up sem resposta" e "Boas-vindas por horário". | respondida | Luan, 05/11/2026 |
| PER-B59-04 | Onde ficam os modelos? Decidido: galeria na tela de Automações, para todas as empresas. | respondida | Luan, 05/11/2026 |
