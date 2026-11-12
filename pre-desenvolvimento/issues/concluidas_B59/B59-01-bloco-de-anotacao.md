# B59-01: Bloco de anotação no editor de automações

**Tipo:** Implementação
**Página:** Configurações > Automações > editor
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-modelos-de-automacao.md`

## Descrição

O editor ganha um bloco só de texto, solto em qualquer lugar do desenho, para explicar uma parte da automação ou como alterá-la. Ele é salvo com o fluxo, mas fica fora do caminho: não se liga a nada, não trava o salvar e não muda o que a automação executa.

## Pronto quando

O Admin adiciona, escreve, arrasta, duplica e apaga uma anotação, salva e reabre a automação com ela no lugar, e a automação continua rodando exatamente como rodava sem a anotação.

## Critérios de aceite

- **CA-B59-01** (automática) — Adicionar uma anotação. Dado o editor de uma automação, quando o Admin abre "Adicionar bloco" e escolhe "Anotação", então um bloco de anotação aparece no desenho, selecionado, sem alças de ligação e sem o botão "+"; e o menu aberto pelo "+" de uma saída não oferece "Anotação".
- **CA-B59-02** (automática) — Escrever e reabrir. Dado uma anotação no desenho, quando o Admin digita um texto de várias linhas no bloco, arrasta a anotação, salva e reabre a automação, então o texto aparece igual, com as quebras de linha, na posição em que foi deixado.
- **CA-B59-03** (automática) — Tamanho do texto. Dado uma anotação, quando o Admin chega a 2.000 caracteres, então o bloco não aceita mais texto, e o servidor recusa uma anotação maior que isso gravada por fora do editor.
- **CA-B59-04** (automática) — Duplicar e apagar. Dado uma anotação selecionada, quando o Admin usa "Duplicar" e depois apaga a cópia, então a cópia nasce com o mesmo texto e sai do desenho ao ser apagada; e apertar Delete ou Backspace enquanto digita só altera o texto, sem apagar o bloco.
- **CA-B59-05** (automática) — Anotação não trava o salvar. Dado uma automação completa, com uma anotação escrita e outra vazia, quando o Admin salva, então a automação é salva, e nenhuma anotação recebe o aviso "Bloco solto" nem conta como ação no caminho.
- **CA-B59-06** (automática) — Só anotação não basta. Dado uma automação com gatilho e anotações, sem nenhuma ação, quando o Admin salva, então a tela avisa "Ligue pelo menos uma ação ao caminho", como em uma automação sem anotações.
- **CA-B59-07** (automática) — Anotação não muda a execução. Dado a mesma automação, com e sem anotações, quando o gatilho dispara para um contato, então as duas fazem as mesmas ações, na mesma ordem, e o histórico não mostra anotação no caminho.
- **CA-B59-08** (automática) — Anotação fica fora do teste. Dado o resultado de "Testar com um contato" na tela, quando o Admin edita ou arrasta uma anotação, então o resultado continua valendo, sem o aviso de que o fluxo mudou, e a anotação não aparece apagada nem destacada como parte do caminho.
- **CA-B59-09** (automática) — Anotação não se liga a nada. Dado um fluxo gravado por fora do editor, com uma ligação que sai de uma anotação ou chega nela, quando o servidor confere o fluxo, então o fluxo é recusado com "O fluxo tem ligações inválidas".
- **CA-B59-10** (automática) — Limites. Dado uma automação com 100 blocos que executam e algumas anotações, quando o Admin salva, então a automação é salva, porque as anotações não contam nos 100 blocos; e, com mais de 30 anotações, a tela avisa "Uma automação pode ter até 30 anotações" e não salva.
- **CA-B59-11** (automática) — Alteração não salva e rascunho. Dado uma automação salva, quando o Admin altera o texto de uma anotação, então a tela mostra "Alterações não salvas", e o rascunho recuperado traz o texto digitado.
- **CA-B59-12** (automática) — Salvar anotação não mexe em quem espera. Dado uma automação ativa com um contato em um bloco "esperar", quando o Admin adiciona, edita ou apaga uma anotação e salva, então a tela não pede para cancelar esperas, e o contato continua esperando.
- **CA-B59-13** (automática) — Duplicar a automação leva as anotações. Dado uma automação com anotações, quando o Admin usa "Duplicar" na lista, então a cópia traz as mesmas anotações, nas mesmas posições.

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B59-01 | A anotação tem largura fixa e cresce com o texto; não dá para redimensionar. | confirmada | Luan, 05/11/2026 |
| SUP-B59-02 | As anotações não contam nos 100 blocos e vão até 30 por automação, com 2.000 caracteres cada. | confirmada | Luan, 05/11/2026 |

## Perguntas em aberto

Nenhuma.

## Cenários

### Happy Path
1. O Admin clica em "Adicionar bloco" e escolhe "Anotação". O bloco nasce solto e selecionado, sem alças e sem "+".
2. Digita direto no bloco. O campo cresce com o texto e aceita até 2.000 caracteres. O painel lateral não abre para a anotação: os botões Duplicar e Apagar ficam no próprio bloco quando ele está selecionado.
3. Arrasta a anotação pelo cabeçalho, salva e reabre. Texto e posição voltam iguais.
4. Motor, simulação e histórico não veem a anotação: nada se liga a ela, então o percurso nunca chega nela.

### Edge Cases
- Anotação vazia salva normalmente, sem pendência.
- Delete ou Backspace com o foco no texto só altera o texto (o atalho do editor já ignora campos de texto).
- Editar ou arrastar anotação não invalida o resultado de "Testar com um contato".
- Salvar com anotação não conta nos 100 blocos e não cancela esperas, porque o bloco em que o contato espera continua no fluxo.
- Automação só com gatilho e anotações continua sem poder ser salva: falta ação no caminho.

### Cenário de Erro
- Fluxo gravado por fora com anotação de mais de 2.000 caracteres: `lerFluxo` recusa, e o Salvar devolve o erro de formato que já existe.
- Fluxo com ligação que sai de uma anotação ou chega nela: "O fluxo tem ligações inválidas".
- Mais de 30 anotações: "Uma automação pode ter até 30 anotações", e o Salvar não grava.

## Prova

| Critério | Prova | Onde | O que confere |
|---|---|---|---|
| CA-B59-01 | automática | `src/test/automacoes-anotacao.test.tsx` | "Adicionar bloco" cria a anotação selecionada, sem alças e sem "+"; o menu aberto pelo "+" não oferece "Anotação" |
| CA-B59-02 | automática | `src/test/automacoes-anotacao.test.tsx` | o texto digitado com quebras de linha e a posição chegam ao Salvar, passam pelo formato do servidor e voltam ao reabrir o editor |
| CA-B59-03 | automática | `src/test/automacoes-anotacao.test.tsx` | o campo limita a 2.000 caracteres; o servidor aceita 2.000 e recusa 2.001 |
| CA-B59-04 | automática | `src/test/automacoes-anotacao.test.tsx` | Duplicar cria outra com o mesmo texto, Apagar a remove, e Delete ou Backspace no campo mantém o bloco |
| CA-B59-05 | automática | `src/test/automacoes-anotacao.test.tsx` | automação completa com anotação escrita e vazia salva, sem "Bloco solto" |
| CA-B59-06 | automática | `src/test/automacoes-anotacao.test.tsx` | gatilho e anotações, sem ação, mostram "Ligue pelo menos uma ação ao caminho" e não salvam |
| CA-B59-07 | automática | `src/test/automacoes-anotacao.test.tsx` | o percurso com e sem anotações executa as mesmas ações na mesma ordem, e os passos do histórico não têm anotação |
| CA-B59-08 | automática | `src/test/automacoes-anotacao.test.tsx` | depois de editar a anotação, o resultado do teste continua sem o aviso de fluxo mudado, e arrastá-la não muda a assinatura do caminho |
| CA-B59-09 | automática | `src/test/automacoes-anotacao.test.tsx` | ligação saindo de anotação e chegando nela dá "O fluxo tem ligações inválidas" |
| CA-B59-10 | automática | `src/test/automacoes-anotacao.test.tsx` | 100 blocos que executam com anotações salvam; 31 anotações dão o aviso e não salvam |
| CA-B59-11 | automática | `src/test/automacoes-anotacao.test.tsx` | alterar o texto mostra "Alterações não salvas", e o rascunho guardado traz o texto |
| CA-B59-12 | automática | `src/test/automacoes-anotacao.test.tsx` | com uma espera em andamento e anotações mudadas, nenhuma espera sai, então o aviso não abre e nada é cancelado |
| CA-B59-13 | automática | `src/test/automacoes-anotacao.test.tsx` | a cópia gravada por "Duplicar" traz as anotações com texto e posição |

## Arquivos

- **Criar:** `src/test/automacoes-anotacao.test.tsx` — testes dos critérios CA-B59-01 a 13
- **Modificar:** `src/lib/fluxo-automacao.ts` — tipo `BlocoAnotacao`, limites, estrutura, pendências, cópia e saídas
- **Modificar:** `src/lib/automacoes/fluxo-recebido.ts` — formato da anotação no servidor
- **Modificar:** `src/lib/automacoes/referencias.ts` — a anotação não escolhe nada da empresa
- **Modificar:** `src/app/(auth)/configuracoes/automacoes/components/catalogo.ts` — a anotação não escolhe nada da empresa
- **Modificar:** `src/app/(auth)/configuracoes/automacoes/components/frases-fluxo.ts` — frase da anotação
- **Modificar:** `src/app/(auth)/configuracoes/automacoes/components/blocos-fluxo.tsx` — o bloco de anotação no canvas
- **Modificar:** `src/app/(auth)/configuracoes/automacoes/components/menu-novo-bloco.tsx` — item "Anotação" só em "Adicionar bloco"
- **Modificar:** `src/app/(auth)/configuracoes/automacoes/components/editor-fluxo.tsx` — criar, editar e duplicar a anotação; sem painel lateral
- **Modificar:** `src/app/(auth)/configuracoes/automacoes/components/rascunho-editor.ts` — anotação fora da assinatura do caminho
- **Modificar:** `src/app/(auth)/configuracoes/automacoes/components/painel-bloco.tsx` — rótulo por tipo de bloco ganha a anotação, exigido pelo tipo novo
- **Modificar:** `src/app/(auth)/configuracoes/automacoes/historico/historico-client.tsx` — rótulo por tipo de bloco ganha a anotação, exigido pelo tipo novo

## Checklist

- [x] formato e regras do fluxo com a anotação
- [x] bloco no canvas, com texto, Duplicar e Apagar
- [x] item no menu "Adicionar bloco", fora do menu do "+"
- [x] anotação fora da simulação e do teste
- [x] testes CA-B59-01 a 13 passando; tsc limpo; testes das telas do editor rodados
