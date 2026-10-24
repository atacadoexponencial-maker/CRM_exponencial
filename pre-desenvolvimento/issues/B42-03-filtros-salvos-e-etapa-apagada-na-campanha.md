# B42-03: Filtros salvos na campanha e aviso de funil ou etapa apagada

**Tipo:** Implementação
**Página:** Campanhas → editor, etapa Destinatários
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-segmentacao-de-campanhas.md`

**Depende de:** B42-02 (filtro na campanha)

## Descrição

Na etapa Destinatários a pessoa parte de um filtro salvo da empresa ou salva o filtro montado como filtro novo (a campanha guarda uma cópia), e uma campanha com condição de funil ou etapa apagada avisa e não confirma. Fecha a série com a aprovação visual dela.

## Pronto quando

Dá para escolher "Lojistas de Fortaleza" na campanha, ajustar, salvar "Proposta da feira" e vê-lo na lista de Contatos; um rascunho com etapa apagada mostra o aviso e trava a confirmação; a Marcelle aprova a tela no preview.

## Critérios de aceite

- **CA-B42-12** (automática) — Filtro com funil ou etapa apagada avisa e não confirma. Dado um rascunho ou uma campanha agendada ainda não enviada cujo filtro usa uma etapa, ou um funil, que depois foi apagado, quando a pessoa abre a campanha, então a etapa Destinatários avisa qual condição usa funil ou etapa que não existe mais, e a campanha não pode ser confirmada até a pessoa trocar ou remover essa condição
- **CA-B42-16** (automática) — Escolher um filtro salvo monta o filtro da campanha. Dado o filtro salvo "Lojistas de Fortaleza", quando a pessoa o escolhe na etapa Destinatários, então o painel mostra as condições dele, e a contagem é igual ao número de contatos que ele traz na lista de Contatos (menos os telefones inválidos)
- **CA-B42-17** (automática) — Ajustar na campanha não muda o filtro salvo. Dado a campanha montada a partir de "Lojistas de Fortaleza", quando a pessoa acrescenta uma condição na campanha, então o filtro salvo "Lojistas de Fortaleza" continua com as condições de antes, na campanha e na lista de Contatos
- **CA-B42-18** (automática) — Mudar o filtro salvo depois não muda a campanha. Dado um rascunho montado a partir de "Lojistas de Fortaleza", quando alguém atualiza ou apaga esse filtro salvo na lista de Contatos, então o rascunho continua com as condições que tinha
- **CA-B42-19** (automática) — Salvar o filtro da campanha como filtro salvo. Dado um Admin ou Gerente com um filtro montado na campanha, quando escolhe "Salvar como filtro" e dá o nome "Proposta da feira", então "Proposta da feira" aparece nos filtros salvos da campanha e da lista de Contatos, para a empresa toda, com as mesmas condições
- **CA-B42-20** (automática) — Nome repetido não salva. Dado o filtro salvo "Lojistas de Fortaleza", quando alguém tenta salvar pela campanha outro com o nome "lojistas de fortaleza", então a tela avisa que já existe um filtro com esse nome e não salva, como na lista de Contatos
- **CA-B42-31** (manual) — A etapa Destinatários fica bem arrumada. Dado o preview publicado, quando a Marcelle monta uma campanha com filtro de dois grupos, usa um filtro salvo e salva um filtro novo, no computador e no celular, nos temas claro e escuro, então ela aprova o painel, o resumo do filtro, a lista de filtros salvos e a contagem, e confere que o campo Perfil RFV e o Atendente (carteira) aparecem também na lista de Contatos

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B42-01 | A campanha guarda uma cópia das condições do filtro salvo usado, não um vínculo: mudar ou apagar o filtro salvo depois não muda campanha já montada. | confirmada | Marcelle, 23/10/2026 |
| SUP-B42-04 | Filtro com funil ou etapa apagada impede a confirmação até a pessoa ajustar, em vez de só ignorar a condição. | confirmada | Marcelle, 23/10/2026 |
| SUP-B42-07 | O aviso de funil ou etapa apagada diz "Este filtro usa funil ou etapa que não existe mais: [condição]. Troque ou remova essa condição para confirmar.", e a etapa sumida aparece no resumo como "(etapa apagada)". | confirmada | Marcelle, 24/10/2026 |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| PER-B42-02 | A campanha usa os filtros salvos da lista de Contatos? | respondida | Sim, carrega e salva (Marcelle, 23/10/2026) |

## Cenários

### Happy Path
1. Na etapa Destinatários, abaixo do botão "Filtrar", aparece a faixa "Salvos" com os filtros salvos da empresa, na mesma ordem da lista de Contatos (`listarFiltrosSalvos`, carregada pela página do editor). É a mesma `FaixaFiltrosSalvos` da lista, sem o menu de renomear, mover e apagar, que continua só na lista de Contatos.
2. Clicar em "Lojistas de Fortaleza" copia as condições dele para o filtro da campanha (`segmento.filtro`). A contagem é refeita, e o botão do filtro salvo fica marcado enquanto o filtro da campanha for igual ao dele (mesma comparação da lista de Contatos). Clicar de novo limpa o filtro.
3. Mexer nas condições pelo painel muda só a campanha. O filtro salvo deixa de aparecer marcado, e nada é gravado em `filtros_salvos`. O painel da campanha não oferece "Atualizar filtro salvo".
4. "Salvar filtro", no painel, chama o mesmo `salvarFiltro` da lista de Contatos. O servidor confere o papel, o nome e o filtro. O filtro novo entra na faixa da campanha e na da lista de Contatos, para a empresa toda.
5. Filtro com funil apagado ou etapa que não é mais do funil: a etapa Destinatários mostra um aviso que nomeia cada condição quebrada (ex.: "Etapa no funil Feira de Março está na etapa (etapa apagada)"). "Próximo" é barrado com o mesmo aviso, e o servidor recusa `confirmarCampanha` com esse filtro, mesmo chamado direto.

### Edge Cases
- Filtro salvo apagado ou atualizado na lista de Contatos depois de usado: a campanha já tem a cópia e não muda. Ao reabrir, a faixa vem com a lista nova, e o botão só aparece marcado se as condições ainda forem iguais.
- Empresa sem filtros salvos: a faixa não aparece (comportamento da `FaixaFiltrosSalvos`).
- Funil inteiro apagado: a condição aparece como "Etapa num funil apagado", o rótulo que o filtro já usa.
- Rascunho com etapa apagada ainda pode ser salvo como rascunho; só a confirmação é barrada.

### Cenário de Erro
- Nome repetido (sem diferença de maiúscula e acento): o painel mostra "Já existe um filtro com esse nome." e nada é salvo, como na lista de Contatos.
- Sem permissão (chamada direta de Atendente): "Só Admin e Gerente mudam os filtros salvos.", a mensagem que já existe.
- Confirmar com funil ou etapa apagada: "O filtro usa funil ou etapa que não existe mais. Troque ou remova essa condição para confirmar." Nada muda nos destinatários.

## Prova

| Critério | Prova | Onde | O que confere |
|---|---|---|---|
| CA-B42-12 | automática | `src/test/campanhas-segmentacao-tela.test.tsx` | Rascunho com etapa e com funil apagados mostra o aviso nomeando cada condição e "Próximo" não avança; no banco (`src/test/campanhas-segmentacao.integration.test.ts`), `confirmarCampanha` com esse filtro é recusada e não grava destinatários |
| CA-B42-16 | automática | `src/test/campanhas-segmentacao.integration.test.ts` | O filtro salvo "Lojistas de Fortaleza", escolhido na campanha, dá a contagem igual aos contatos que ele traz na lista de Contatos, menos o telefone inválido; na tela (`campanhas-segmentacao-tela.test.tsx`), clicar nele põe as condições no painel e marca o botão |
| CA-B42-17 | automática | `src/test/campanhas-segmentacao.integration.test.ts` | Depois de salvar o rascunho com uma condição a mais, o filtro salvo continua com as condições de antes |
| CA-B42-18 | automática | `src/test/campanhas-segmentacao.integration.test.ts` | Atualizar e depois apagar o filtro salvo não muda as condições do rascunho ao reabrir |
| CA-B42-19 | automática | `src/test/campanhas-segmentacao.integration.test.ts` | Um Gerente salva "Proposta da feira" com o filtro da campanha, e ele aparece em `listarFiltrosSalvos` para o Admin, com as mesmas condições; na tela, "Salvar como filtro" chama o servidor com o nome e o filtro e o mostra na faixa |
| CA-B42-20 | automática | `src/test/campanhas-segmentacao.integration.test.ts` | Salvar "lojistas de fortaleza" com "Lojistas de Fortaleza" existente devolve "Já existe um filtro com esse nome." e não cria outro |
| CA-B42-31 | manual | roteiro abaixo | A Marcelle aprova a etapa Destinatários no computador e no celular, nos dois temas |

### Roteiro manual — CA-B42-31
1. No preview, entre na empresa [TESTE] Automações B11 e vá em Campanhas → Nova campanha.
2. Clique em "Filtrar" e monte dois grupos: (Cidade é igual a Fortaleza OU Cidade é igual a Recife) E Tipo é Lojista. Aplique e confira o resumo embaixo do botão e a contagem.
3. Na faixa "Salvos", clique num filtro salvo e veja as condições irem para o painel. Depois, no painel, use "Salvar filtro" com um nome novo e veja o botão novo na faixa.
4. Abra a lista de Contatos e confira que o filtro novo também está lá, que o campo "Perfil RFV" aparece em Compras e que o campo se chama "Atendente (carteira)".
5. Repita os passos 1 a 3 no celular, e alterne entre o tema claro e o escuro no seu perfil.
6. Aprove se nada ficar desalinhado, cortado ou ilegível.

## Arquivos

- **Modificar:** `src/lib/filtro-contatos.ts` — `condicoesComFunilApagado` (as condições de funil cujo funil ou etapa não existe mais) e o resumo mostrando "(etapa apagada)"
- **Modificar:** `src/app/(auth)/campanhas/actions.ts` — `confirmarCampanha` recusa filtro com funil ou etapa apagada
- **Modificar:** `src/app/(auth)/campanhas/[id]/page.tsx` — carrega os filtros salvos da empresa
- **Modificar:** `src/app/(auth)/campanhas/[id]/editor-campanha-client.tsx` — faixa de filtros salvos, "Salvar como filtro" no painel, aviso e trava do "Próximo"
- **Modificar:** `src/test/campanhas-segmentacao-tela.test.tsx` — CA-B42-12 e CA-B42-16 na tela, e a tela do CA-B42-19
- **Modificar:** `src/test/campanhas-segmentacao.integration.test.ts` — CA-B42-12 no servidor, CA-B42-16 a 20 no banco

> Reuso: `FaixaFiltrosSalvos` (`src/app/(auth)/contatos/components/faixa-filtros-salvos.tsx`), `listarFiltrosSalvos` e `salvarFiltro` (`src/app/(auth)/contatos/filtros-salvos.ts`), `limparFiltro` para saber qual salvo está marcado (a comparação da lista de Contatos), `valorSumiu` e `ehCampoDeFunil` (`src/lib/filtro-contatos.ts`), `valoresDoFiltro` para os funis no servidor.

## Checklist

- [x] `condicoesComFunilApagado` e "(etapa apagada)" no resumo
- [x] `confirmarCampanha` recusando funil ou etapa apagada
- [x] Página do editor com `listarFiltrosSalvos`
- [x] Editor: faixa dos salvos (cópia, marcado, clicar de novo limpa), "Salvar como filtro", aviso e trava do "Próximo"
- [x] Testes de tela e de integração
- [x] Rodar todos os testes que renderizam o editor de campanha, o painel ou a faixa (L-05) e o `tsc` (L-07)
