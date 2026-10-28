# B48-13: Acabamentos das telas

**Tipo:** Correção
**Página:** Funis, Etiquetas, WhatsApp, Chat, Catálogo, Dashboard, Relatórios, Agenda, Automações
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-correcoes-qa-ux.md`
**Origem:** `pre-desenvolvimento/analise-qa/qa-ux-2026-10-27.md`, achados **B-01** a **B-04**, **B-08**, **B-09**, **B-12**, **B-13**, **B-15**, **B-17**, **B-18**, **B-20**, **B-21** e **B-23**
**Gravidade:** Baixo

## Descrição

Erro de funil vazio vindo só do servidor, nova etiqueta sem cor marcada, "workspace" no texto, e os ajustes visuais listados no CA-B48-34.

## Pronto quando

Os três acabamentos com teste passam, e o Luan aprova os visuais no preview.

## Critérios de aceite

- **CA-B48-31** (automática) — Funil sem nome barrado no formulário. Dado o formulário "Novo funil" com o nome vazio, quando se clica em Criar, então "Informe o nome do funil." aparece na hora, junto do campo, sem ir ao servidor
- **CA-B48-32** (automática) — Nova etiqueta com cor marcada. Dado o formulário "Nova etiqueta", quando ele abre, então a primeira cor já vem marcada, e Salvar sem nome diz "Dê um nome à etiqueta"
- **CA-B48-33** (automática) — Sem "workspace" no texto. Dado os textos das telas, quando se procura "workspace" em texto visível, então não há nenhum; aparece "empresa"
- **CA-B48-34** (manual) — Acabamentos visuais aprovados. Dado a empresa de teste no preview, quando o Luan confere: "Editar funil" sem quebra e aberto perto do botão; mensagens rápidas com o nome inteiro; campos do produto no mesmo fundo; a barra de Aparência sem cobrir texto; Dashboard sem barras zeradas; Carteiras em tabela; lista de contatos do follow-up recolhida; editor de automação novo com a dica do "+"; seção "Agenda" visível no seletor; cartões de etapa sem "0 cards" quebrado, então ele aprova cada um, ou o que não aprovar volta para a issue

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B48-05 | Dashboard com o funil todo zerado mostra "Nenhum card neste funil ainda" e o link do Pipeline, em vez das barras vazias; com algum card, as barras continuam | confirmada | Luan, 28/10/2026 |
| SUP-B48-06 | A "Visão geral" das Carteiras vira tabela: Total, Com carteira e Sem carteira nas linhas; Sem compra, Base, Ativos e Inativos nas colunas | confirmada | Luan, 28/10/2026 |
| SUP-B48-07 | O Novo follow-up abre só com a busca; a lista de contatos aparece quando se digita | confirmada | Luan, 28/10/2026 |
| SUP-B48-08 | O "Editar funil" abre logo abaixo do funil clicado, na própria lista | confirmada | Luan, 28/10/2026 |
| SUP-B48-09 | O seletor de blocos fica mais largo, com os grupos em duas colunas, para "Agenda" aparecer sem rolar | confirmada | Luan, 28/10/2026 |
| SUP-B48-10 | Automação nova: enquanto só existe o gatilho, aparece "Clique no + embaixo do gatilho para escolher o próximo bloco" | confirmada | Luan, 28/10/2026 |
| SUP-B48-11 | Mensagens rápidas no Chat: nome inteiro em cima, texto embaixo cortado em uma linha | confirmada | Luan, 28/10/2026 |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| PER-B48-03 | O termo do canal direto (versionado: mudar o texto pede novo aceite), a Política de Privacidade e os Termos de Serviço também trocam "workspace" por "empresa"? | respondida | Não, os três ficam como estão; o teste do CA-B48-33 os ignora, com o motivo escrito. Luan, 28/10/2026 |

## Cenários

### Happy Path
1. **Funis.** "Novo funil" com o nome vazio: ao clicar em Criar funil, "Informe o nome do funil." aparece embaixo do campo, sem chamar o servidor. "Editar" abre o painel logo abaixo do funil, dentro da lista. Em cada etapa, "Avisar parado depois de — dias" e "0 cards" ficam numa linha só.
2. **Etiquetas.** "Nova etiqueta" abre com a primeira cor marcada. Salvar fica ativo; sem nome, diz "Dê um nome à etiqueta" e não chama o servidor.
3. **Textos.** Toda mensagem que dizia "workspace" diz "empresa" ("Número já cadastrado nesta empresa", "1 número nesta empresa"…).
4. **Chat.** O seletor de mensagens rápidas mostra o nome inteiro em cima e o texto, em uma linha, embaixo.
5. **Catálogo.** No produto, Descrição e Categoria têm o mesmo fundo dos outros campos. Em Aparência, a barra Descartar/Salvar é opaca e não deixa texto aparecendo por baixo.
6. **Dashboard.** Funil todo zerado: "Nenhum card neste funil ainda" com "Abrir pipeline". Com algum card, as barras de sempre.
7. **Carteiras.** "Visão geral da empresa" numa tabela só, com os quatro nomes uma vez, no cabeçalho.
8. **Agenda.** "Novo follow-up" abre só com a busca; os contatos aparecem ao digitar.
9. **Automações.** Na automação nova, só com o gatilho, a dica do "+" aparece no rodapé do desenho e some quando o segundo bloco entra. O seletor de blocos mostra os grupos em duas colunas, com "Agenda" visível sem rolar no desktop.

### Edge Cases
- Nome do funil só com espaços conta como vazio, como no servidor (`trim`). O servidor continua validando.
- Etiqueta: o Editar continua igual, já abre com a cor da etiqueta.
- Dashboard: funil próprio escolhido no seletor e zerado também mostra a frase, com o link para ele.
- Follow-up: ao apagar o texto da busca, a lista recolhe de novo. No Editar, o contato já vem escolhido, como antes.
- Seletor de blocos no celular: uma coluna, como antes, e a janela rola.
- Textos do termo do canal direto, da Política de Privacidade e dos Termos de Serviço ficam como estão (PER-B48-03).

### Cenário de Erro
- Funil: erro do servidor (nome repetido, falha) continua aparecendo no mesmo lugar de antes.
- Etiqueta: erro do servidor continua embaixo das cores.

## Prova

| Critério | Prova | Onde | O que confere |
|---|---|---|---|
| CA-B48-31 | automática | `src/test/acabamentos-das-telas.test.tsx` | Criar funil com o nome vazio mostra "Informe o nome do funil." e `criarFunil` não é chamado |
| CA-B48-32 | automática | `src/test/acabamentos-das-telas.test.tsx` | Ao abrir "Nova etiqueta", a primeira cor está marcada (`aria-pressed`); Salvar sem nome diz "Dê um nome à etiqueta" e `criarEtiqueta` não é chamado |
| CA-B48-33 | automática | `src/test/acabamentos-das-telas.test.tsx` | Nenhum texto entre aspas ou de JSX em `src/` (fora testes, tipos gerados e os três textos legais) contém "workspace" |
| CA-B48-34 | manual | roteiro abaixo | Os dez acabamentos aprovados pelo Luan |

### Roteiro manual — CA-B48-34
No preview do branch, logado na "[TESTE] Automações B11", desktop a 1440 px:
1. Configurações → Funis: crie um funil de teste e clique em Editar. O painel abre logo abaixo dele; "Avisar parado depois de — dias" e "0 cards" ficam numa linha só, cada etapa sem quebra.
2. Chat: abra uma conversa e o seletor de mensagens rápidas. O nome de cada uma aparece inteiro.
3. Catálogo → um produto: todos os campos com o mesmo fundo. Catálogo → Aparência: mude algo e role; a barra Descartar/Salvar não deixa texto aparecendo por baixo.
4. Dashboard: com o funil sem cards, aparece a frase no lugar das barras vazias.
5. Relatórios → Carteiras: a visão geral é uma tabela, com os quatro nomes só no cabeçalho.
6. Agenda → Novo follow-up: abre só com a busca; os contatos aparecem ao digitar.
7. Automações → Nova automação: a dica do "+" aparece. Clique em "Adicionar bloco": "Agenda" aparece sem rolar.
8. Aprove cada item ou diga qual volta para a issue.

## Arquivos

- **Modificar:** `src/app/(auth)/configuracoes/funis/funis-client.tsx` — nome vazio barrado no formulário; Editar abre abaixo do funil; etapa sem quebra.
- **Modificar:** `src/app/(auth)/configuracoes/etiquetas/etiquetas-client.tsx` — primeira cor marcada ao abrir; "Dê um nome à etiqueta".
- **Modificar:** `src/app/(auth)/chat/components/painel-conversa.tsx` — nome inteiro das mensagens rápidas.
- **Modificar:** `src/app/(auth)/catalogo/components/editor-produto.tsx` — Descrição e Categoria com o fundo dos outros campos.
- **Modificar:** `src/app/(auth)/catalogo/components/editor-aparencia.tsx` — barra Descartar/Salvar opaca.
- **Modificar:** `src/app/(auth)/dashboard/components/blocos-do-dia.tsx` — frase no lugar das barras quando o funil está zerado.
- **Modificar:** `src/app/(auth)/relatorios/components/carteiras-client.tsx` — visão geral em tabela.
- **Modificar:** `src/app/(auth)/agenda/agenda-client.tsx` — lista de contatos só ao digitar.
- **Modificar:** `src/app/(auth)/configuracoes/automacoes/components/editor-fluxo.tsx` — dica do "+" na automação só com o gatilho.
- **Modificar:** `src/app/(auth)/configuracoes/automacoes/components/menu-novo-bloco.tsx` — grupos em duas colunas.
- **Modificar:** `src/app/(auth)/campanhas/[id]/editor-campanha-client.tsx` — "empresa" no lugar de "workspace".
- **Modificar:** `src/app/(auth)/configuracoes/whatsapp/actions.ts` — "empresa" no lugar de "workspace".
- **Modificar:** `src/app/(auth)/configuracoes/whatsapp/canal-direto/lista-numeros.tsx` — "empresa" no lugar de "workspace".
- **Modificar:** `src/app/(auth)/configuracoes/whatsapp/[id]/ritmo/actions.ts` — "empresa" no lugar de "workspace".
- **Modificar:** `src/app/(auth)/configuracoes/whatsapp/[id]/saude/actions.ts` — "empresa" no lugar de "workspace".
- **Modificar:** `src/app/(auth)/configuracoes/templates/page.tsx` — "empresa" no lugar de "workspace".
- **Modificar:** `src/app/(auth)/configuracoes/whatsapp/canal-direto/escolha-canal.tsx` — "empresa" no lugar de "workspace".
- **Modificar:** `src/app/(auth)/contatos/actions.ts` — "empresa" no lugar de "workspace".
- **Modificar:** `src/app/(auth)/contatos/components/novo-contato-dialog.tsx` — "empresa" no lugar de "workspace".
- **Modificar:** `src/lib/whatsapp/gateway/ciclo-de-vida.ts` — "empresa" no lugar de "workspace".
- **Modificar:** `src/lib/whatsapp/gateway/estado.ts` — "empresa" no lugar de "workspace".
- **Modificar:** `src/lib/whatsapp/gateway/instancias.ts` — "empresa" no lugar de "workspace".
- **Modificar:** `src/lib/whatsapp/gateway/pareamento.ts` — "empresa" no lugar de "workspace".
- **Modificar:** `src/test/relatorios-carteiras.test.tsx` — lê os números da tabela nova (CA-B35-02).
- **Modificar:** `src/test/gateway-instancias.test.ts` — mensagem do limite com "empresa".
- **Modificar:** `src/test/relatorios-ajustes-pos-teste.test.tsx` — conta só as linhas da tabela do histórico, agora que a visão geral também é tabela.
- **Modificar:** `src/test/esc-fecha-e-salvar-confirma.test.tsx` — dá nome ao funil antes de criar (CA-B48-09), agora que o nome vazio é barrado.
- **Criar:** `src/test/acabamentos-das-telas.test.tsx` — testes do CA-B48-31, do CA-B48-32 e do CA-B48-33.

## Checklist

- [x] Funis: nome vazio barrado no formulário, Editar abaixo do funil, etapa sem quebra
- [x] Etiquetas: primeira cor marcada e "Dê um nome à etiqueta"
- [x] "empresa" no lugar de "workspace" nos textos visíveis
- [x] Chat, produto, Aparência, Dashboard, Carteiras, follow-up, editor e seletor de blocos
- [x] Testes do CA-B48-31, 32 e 33 e os das telas tocadas passando, tsc e lint
