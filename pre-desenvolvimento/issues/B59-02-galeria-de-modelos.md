# B59-02: Galeria com os cinco modelos de automação

**Tipo:** Implementação
**Página:** Configurações > Automações
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-modelos-de-automacao.md`

## Descrição

A lista de automações ganha o botão "Modelos", com uma galeria igual para todas as empresas. "Usar modelo" abre o editor com a automação montada e explicada por anotações, nova e desligada.

## Pronto quando

O Admin abre a galeria, usa um dos cinco modelos, lê as anotações, adapta, salva e encontra a automação desligada na lista; o modelo continua como veio para o próximo uso. As anotações foram aprovadas pelo Luan, e o follow-up rodou com um número real na empresa de teste.

## Critérios de aceite

- **CA-B59-14** (automática) — Abrir a galeria. Dado a lista de automações, vazia ou não, quando o Admin clica em "Modelos", então aparecem os cinco modelos, cada um com título, descrição e "Usar modelo".
- **CA-B59-15** (automática) — Usar um modelo. Dado a galeria aberta, quando o Admin clica em "Usar modelo", então o editor abre com o nome, os blocos, as ligações, as anotações e a repetição do modelo, com a opção "Salvar e ativar"; e nenhuma automação nova existe até ele salvar.
- **CA-B59-16** (automática) — O modelo vira automação comum. Dado um modelo aberto no editor e adaptado, quando o Admin salva e, depois, usa o mesmo modelo de novo, então a primeira fica na lista como automação desligada, com as alterações dele; e o modelo abre outra vez como veio, sem as alterações.
- **CA-B59-17** (automática) — Modelo e automação nova não dividem rascunho. Dado um rascunho não salvo de "Nova automação", quando o Admin usa um modelo, altera algo, sai sem salvar e abre "Nova automação", então o modelo abre sem o aviso do rascunho da automação nova, e o rascunho de cada um continua separado.
- **CA-B59-18** (automática) — Só o Admin. Dado um Gerente ou Atendente, quando ele abre o endereço de um modelo, então é levado para fora do editor, como acontece em "Nova automação".
- **CA-B59-19** (automática) — Modelo inexistente. Dado um endereço com um modelo que não existe, quando o Admin o abre, então volta para a lista de automações.
- **CA-B59-28** (automática) — Modelos à vista na lista vazia. Dado uma empresa sem nenhuma automação, quando o Admin abre Automações, então a tela diz "Você não tem nenhuma automação ainda", mostra o botão "Criar a primeira automação" e, embaixo dele, "Comece por um modelo pronto" com um botão discreto (contorno, sem cor de destaque) "Conferir modelos", que abre a galeria dos cinco modelos; na galeria, cada cartão mostra título, descrição, a prévia dos passos (ex.: "Mensagem recebida do cliente → Condição → Mover card para etapa") e "Usar modelo", que abre o modelo no editor; com automações na lista, o convite não aparece e os modelos ficam no botão "Modelos".
- **CA-B59-20** (automática) — Preparar público para campanha. Dado o modelo "Preparar público para campanha", quando ele abre, então o desenho é: gatilho "Entrou no perfil RFV" (Em Risco, às 9h) → "Adicionar tag" `campanha-reativacao`; e as anotações explicam que quem já estava no perfil antes não entra sozinho, e como agendar pela tela de Campanhas filtrando por essa tag, escolhendo data e hora.
- **CA-B59-21** (automática) — Mover lead que pediu preço. Dado o modelo "Mover lead que pediu preço", quando ele abre, então o desenho é: gatilho "Mensagem recebida" → condição "texto contém alguma das palavras" (preço, valor, tabela, comprar, pedido) e "card está em Entrada: Lead" → no "sim", "Mover card" para Entrada: Negociação; e as anotações explicam como trocar palavras e etapas, e por que a condição da etapa evita tirar um cliente de uma etapa mais à frente.
- **CA-B59-22** (automática) — Tag automática por interesse. Dado o modelo "Tag automática por interesse", quando ele abre, então o desenho é: gatilho "Mensagem recebida" → condição "texto contém alguma das palavras" (revenda, atacado, lojista) → no "sim", "Adicionar tag" `interesse-atacado`; e as anotações explicam como trocar as palavras e a tag, e como usar a tag em filtros e campanhas.
- **CA-B59-23** (automática) — Follow-up sem resposta. Dado o modelo "Follow-up sem resposta", quando ele abre, então o desenho é: gatilho "Card movido" para Entrada: Catálogo Enviado → "Enviar mensagem" → "Esperar" 2 dias ou até receber mensagem → se receber, "Adicionar tag" `respondeu-follow-up`; se o tempo acabar, "Criar lembrete" na Agenda para o responsável pela conversa; e as anotações explicam cada saída, como mudar o prazo e o texto.
- **CA-B59-24** (automática) — Boas-vindas por horário. Dado o modelo "Boas-vindas por horário", quando ele abre, então o desenho é: gatilho "Conversa criada" → condição "dentro do horário comercial" → no "sim" e no "não", um "Enviar mensagem" cada; e as anotações explicam onde ajustar o horário comercial e como mudar os textos.
- **CA-B59-25** (automática) — Modelos coerentes com o CRM. Dado cada um dos cinco modelos, quando o fluxo é conferido pelas mesmas regras do Salvar, então não há problema de estrutura nem bloco solto; toda anotação tem texto; e todo bloco que executa tem uma anotação perto dele, sem cobrir nenhum bloco.
- **CA-B59-26** (manual) — Aprovação visual. Dado os cinco modelos abertos no preview, nos temas claro e escuro e em uma tela de celular, quando o Luan lê cada anotação, então o texto está claro para quem nunca montou uma automação, nada se sobrepõe, e a anotação se distingue dos blocos que executam.
- **CA-B59-27** (manual) — Modelo rodando de verdade. Dado a empresa de teste com um número conectado, quando o Luan usa o modelo "Follow-up sem resposta", ativa e move um card para Catálogo Enviado, respondendo em um teste e não respondendo em outro, então a mensagem chega no celular; quem respondeu recebe a tag; e, para quem não respondeu, o lembrete aparece na Agenda depois do prazo (um prazo curto vale para o teste).

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B59-03 | Os modelos são os do texto acima (etapas, perfil, palavras e tags sugeridos por mim). O perfil Em Risco e a etapa Negociação são pontos de partida. | confirmada | Luan, 05/11/2026 |
| SUP-B59-04 | No modelo "Boas-vindas por horário", a mensagem sai só na conversa nova, uma vez por contato. | confirmada | Luan, 05/11/2026 |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| PER-B59-01 | As mensagens dos modelos (Follow-up e Boas-vindas) vêm com um texto genérico pronto, que pode sair ao ativar sem editar, ou em branco, obrigando a pessoa a escrever antes de salvar? | respondida | Texto genérico pronto, a recomendação apresentada, que o Luan aceitou ao dizer "pode seguir", 05/11/2026 |

## Cenários

### Happy Path
1. Na lista de automações, o Admin clica em "Modelos" e vê os cinco na galeria.
2. "Usar modelo" abre `/configuracoes/automacoes/nova?modelo=<id>`. O editor monta a cópia do modelo, desligada e sem gravar nada.
3. O Admin lê as anotações, adapta e salva. A partir daí é uma automação comum: o endereço passa para o id dela, e ela fica desligada até "Salvar e ativar".

### Edge Cases
- Modelo aberto, alterado e abandonado: o rascunho fica separado por modelo e não se mistura com o de "Nova automação".
- O mesmo modelo usado duas vezes gera duas automações, e o modelo original não muda.
- As anotações do modelo seguem editáveis e podem ser apagadas, como as demais.

### Cenário de Erro
- Endereço com modelo que não existe: volta para a lista.
- Gerente ou Atendente: sai do editor pela mesma trava de "Nova automação".
- Na API Oficial, a Meta recusa texto fora da janela de 24 horas: a falha aparece no histórico como em qualquer automação, e a anotação do Follow-up avisa disso.

## Prova

| Critério | Prova | Onde | O que confere |
|---|---|---|---|
| CA-B59-14 | automática | `src/test/automacoes-modelos.test.tsx` | com a lista vazia e com regras, "Modelos" mostra os cinco, com título, descrição e "Usar modelo", e o clique avisa qual modelo foi escolhido |
| CA-B59-15 | automática | `src/test/automacoes-modelos.test.tsx` | a regra do modelo traz nome, blocos, ligações, anotações e repetição; o editor oferece "Salvar e ativar"; nenhuma gravação acontece ao abrir |
| CA-B59-16 | automática | `src/test/automacoes-modelos.test.tsx` | salvar a cópia alterada grava a regra desligada com a alteração; abrir o modelo de novo traz o original |
| CA-B59-17 | automática | `src/test/automacoes-modelos.test.tsx` | com rascunho de "Nova automação", o modelo abre sem aviso; os dois rascunhos ficam em chaves separadas e voltam cada um no seu editor |
| CA-B59-18 | automática | `src/test/automacoes-modelos.test.tsx` | Gerente e Atendente são redirecionados pela página, e a action também recusa |
| CA-B59-19 | automática | `src/test/automacoes-modelos.test.tsx` | modelo inexistente redireciona para a lista |
| CA-B59-28 | automática | `src/test/automacoes-modelos.test.tsx` | lista vazia: a frase, o botão principal e, depois dele, o convite com "Conferir modelos" em contorno, sem cartão na tela; o botão abre a galeria com os cinco cartões (título, descrição, prévia e "Usar modelo"), e "Usar modelo" abre o modelo no editor (a lista vai para o endereço do modelo, e a página do editor monta o modelo); com regras, sem o convite |
| CA-B59-20 | automática | `src/test/automacoes-modelos.test.tsx` | desenho exato do modelo e anotações que falam do perfil anterior e de Campanhas |
| CA-B59-21 | automática | `src/test/automacoes-modelos.test.tsx` | desenho exato do modelo e anotações que falam de palavras, etapas e da proteção da etapa |
| CA-B59-22 | automática | `src/test/automacoes-modelos.test.tsx` | desenho exato do modelo e anotações que falam de palavras, tag, filtros e campanhas |
| CA-B59-23 | automática | `src/test/automacoes-modelos.test.tsx` | desenho exato do modelo, saídas da espera nos blocos certos e anotações sobre saídas, prazo e texto |
| CA-B59-24 | automática | `src/test/automacoes-modelos.test.tsx` | desenho exato do modelo e anotações sobre horário comercial e textos |
| CA-B59-25 | automática | `src/test/automacoes-modelos.test.tsx` | cada modelo passa no formato e nas regras do Salvar, sem variável sem reserva; toda anotação tem texto; todo bloco tem anotação perto, e nenhuma cobre outro bloco ou anotação |
| CA-B59-26 | manual | roteiro abaixo | texto claro, nada sobreposto, anotação distinta dos blocos |
| CA-B59-27 | manual | roteiro abaixo | a mensagem chega, quem responde recebe a tag, e quem não responde gera lembrete |

### Roteiro manual — CA-B59-26
1. No preview, entre como Admin da empresa de teste e abra Configurações > Automações > Modelos.
2. Abra cada um dos cinco modelos e leia todas as anotações.
3. Repita no tema claro, no escuro e em uma tela de celular.
4. Confira que o texto é claro para quem nunca montou uma automação, que nada se sobrepõe e que a anotação não parece um passo do caminho.

### Roteiro manual — CA-B59-27
1. Na empresa de teste com um número conectado, use "Follow-up sem resposta", troque o prazo da espera para 2 minutos e clique em "Salvar e ativar".
2. Mova para Catálogo Enviado o card de um contato que fale com esse número e responda pelo celular: a mensagem chega, e a tag `respondeu-follow-up` aparece no contato.
3. Repita com outro contato, sem responder: depois de 2 minutos, o lembrete aparece na Agenda.

## Arquivos

- **Criar:** `src/lib/automacoes/modelos.ts` — os cinco modelos
- **Criar:** `src/app/(auth)/configuracoes/automacoes/components/galeria-modelos.tsx` — a galeria
- **Criar:** `src/test/automacoes-modelos.test.tsx` — testes dos critérios CA-B59-14 a 25
- **Modificar:** `src/app/(auth)/configuracoes/automacoes/components/lista-regras.tsx` — botão "Modelos" e, na lista vazia, o convite "Conferir modelos" no lugar dos exemplos só de texto
- **Modificar:** `src/app/(auth)/configuracoes/automacoes/lista-client.tsx` — abre o editor com o modelo
- **Modificar:** `src/app/(auth)/configuracoes/automacoes/actions.ts` — regra do editor a partir do modelo
- **Modificar:** `src/app/(auth)/configuracoes/automacoes/[id]/page.tsx` — lê `?modelo=`
- **Modificar:** `src/app/(auth)/configuracoes/automacoes/[id]/editor-client.tsx` — rascunho por modelo

## Checklist

- [x] os cinco modelos, com anotações
- [x] galeria e botão "Modelos"
- [x] editor abre o modelo sem gravar, com rascunho próprio
- [x] testes CA-B59-14 a 25 passando; tsc limpo; testes das telas do editor rodados
