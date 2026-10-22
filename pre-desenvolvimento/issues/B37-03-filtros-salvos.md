# B37-03: Filtros salvos da empresa na lista de contatos

**Tipo:** Implementação
**Página:** Contatos (`/contatos`)
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-filtro-de-contatos.md`

## Descrição

Admin e Gerente salvam o filtro montado com um nome; os filtros salvos ficam para a empresa toda, aparecem como botões ao lado dos botões fixos de hoje e podem ser aplicados, ajustados, renomeados, reordenados e apagados.

## Pronto quando

No topo da lista de contatos aparece a faixa de filtros salvos da empresa ao lado dos botões fixos; um clique liga ou desliga o filtro; Admin e Gerente salvam, atualizam, renomeiam, reordenam e apagam; o Atendente só usa.

## Critérios de aceite

- **CA-B37-23** (automática) — Admin ou Gerente salva o filtro com nome. Dado um Admin ou Gerente com um filtro montado, quando clica em "Salvar filtro" e dá o nome "Lojistas de Fortaleza", então aparece um botão "Lojistas de Fortaleza" na faixa do topo da lista.
- **CA-B37-24** (automática) — Nome repetido é recusado. Dado um filtro salvo "Lojistas de Fortaleza", quando alguém tenta salvar outro com o mesmo nome (sem diferença de maiúscula ou acento), então a tela avisa que já existe um filtro com esse nome e não salva.
- **CA-B37-25** (automática) — Clicar no filtro salvo aplica o filtro. Dado o filtro salvo "Lojistas de Fortaleza", quando a pessoa clica no botão dele, então a lista mostra o resultado daquele filtro, o botão fica marcado como ligado e a contagem aparece.
- **CA-B37-26** (automática) — Clicar de novo desliga o filtro salvo. Dado um filtro salvo ligado, quando a pessoa clica no botão dele de novo, então o filtro sai e a lista volta à completa.
- **CA-B37-27** (automática) — Ajustar e atualizar um filtro salvo. Dado um filtro salvo ligado, quando um Admin ou Gerente abre o painel, acrescenta uma condição e escolhe "Atualizar filtro salvo", então o filtro salvo passa a ter a condição nova para todos da empresa.
- **CA-B37-28** (automática) — Renomear um filtro salvo. Dado um filtro salvo, quando um Admin ou Gerente o renomeia para "Lojistas CE", então o botão passa a se chamar "Lojistas CE", com as mesmas condições.
- **CA-B37-29** (automática) — Apagar um filtro salvo pede confirmação. Dado um filtro salvo, quando um Admin ou Gerente escolhe apagar e confirma, então o botão some da faixa para todos da empresa; sem confirmar, nada muda.
- **CA-B37-30** (automática) — Filtro salvo aparece para a empresa toda. Dado um filtro salvo por um Gerente, quando um Admin e um Atendente da mesma empresa abrem Contatos, então os dois veem o botão do filtro salvo.
- **CA-B37-31** (automática) — Atendente usa, mas não salva, renomeia nem apaga. Dado um Atendente, quando ele abre Contatos, então ele aplica os filtros salvos, mas não vê "Salvar filtro", renomear, atualizar nem apagar; e o servidor recusa essas ações se vierem dele.
- **CA-B37-32** (automática) — Filtro salvo de outra empresa nunca aparece. Dado um filtro salvo na empresa A, quando uma pessoa da empresa B abre Contatos ou pede esse filtro diretamente, então ela não o vê nem consegue usar, renomear ou apagar.
- **CA-B37-33** (automática) — Filtro salvo com valor que deixou de existir. Dado um filtro salvo "Etiqueta tem VIP", e a etiqueta "VIP" foi apagada, quando a pessoa aplica o filtro, então a condição aparece marcada como "valor não existe mais" e o resultado não traz contato por causa dela.
- **CA-B37-34** (automática) — Botões fixos e filtros salvos convivem. Dado a empresa com um filtro salvo "Lojistas de Fortaleza" e contatos de Fortaleza lojistas, com classificação Ativo e Inativo, quando a pessoa liga o filtro salvo e clica no botão fixo "Ativo", então os botões fixos de classificação, tipo, nicho e atendente continuam na tela, e o resultado traz só os lojistas de Fortaleza com classificação Ativo; sem filtro salvo na empresa, a faixa dos salvos não aparece.
- **CA-B37-38** (automática) — Admin ou Gerente escolhe a ordem dos filtros salvos. Dado os filtros salvos "A", "B" e "C", nessa ordem, quando um Admin ou Gerente põe "C" na frente, então a faixa mostra "C", "A", "B" para todos da empresa; filtro salvo novo entra no fim da faixa; o Atendente não consegue mudar a ordem.
- **CA-B37-35** (manual) — Aprovação visual dos filtros salvos. Dado a empresa de teste com três filtros salvos, quando a Marcelle abre Contatos no computador e no celular, então ela aprova a faixa de filtros salvos e o painel no estilo Caderno.

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B37-02 | A resposta "quero opção da pessoa salvar os filtros, aparecem no local destes rápidos" quer dizer: os botões fixos de hoje saem e, no lugar, ficam os filtros salvos da empresa. | invalidada | Os dois juntos: os botões fixos continuam e os filtros salvos aparecem ao lado (CA-B37-34). Marcelle, 22/10/2026. |
| SUP-B37-05 | Condição de filtro salvo cujo valor deixou de existir (etiqueta apagada, atendente removido, etapa renomeada) não traz contato por causa dela, em vez de ser ignorada, para o filtro nunca mostrar mais contatos do que deveria. | confirmada | Marcelle, 22/10/2026. |
| SUP-B37-06 | Os filtros salvos aparecem na faixa em ordem alfabética. | invalidada | Admin e Gerente escolhem a ordem, que vale para a empresa toda; filtro novo entra no fim (CA-B37-38). Marcelle, 22/10/2026. |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| PER-B37-04 | Dá para salvar filtros, e quem vê? | respondida | Sim, filtros salvos com nome, visíveis para a empresa toda. Marcelle, 22/10/2026. |
| PER-B37-06 | Quem salva, renomeia e apaga filtro salvo? | respondida | Admin e Gerente; o atendente só usa. Marcelle, 22/10/2026. |
