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
| PER-B37-11 | Como Admin e Gerente mudam a ordem dos filtros salvos? | respondida | Pelo menu de cada filtro (⋯): "Mover para a esquerda" e "Mover para a direita", junto de renomear, atualizar e apagar. Marcelle, 22/10/2026. |

## Cenários

### Happy Path
1. A página carrega os filtros salvos da empresa, na ordem escolhida. Com pelo menos um, aparece a faixa "Salvos" no topo dos filtros, ao lado dos botões fixos.
2. Um clique num filtro salvo aplica as condições dele (o botão fica marcado e a contagem aparece). Outro clique desliga.
3. Admin ou Gerente monta um filtro no painel e usa "Salvar filtro": dá o nome e confirma. O servidor confere o papel, valida o filtro e grava; o botão novo entra no fim da faixa e fica ligado.
4. Com um filtro salvo ligado, Admin ou Gerente ajusta no painel e usa "Atualizar filtro salvo": as condições novas valem para a empresa toda.
5. No menu (⋯) de cada filtro: Renomear (diálogo com o nome), Mover para a esquerda/direita, Apagar (diálogo de confirmação).
6. Os botões fixos (classificação, tipo, nicho, atendente) continuam e valem com E junto do filtro salvo ligado.

### Edge Cases
- Nome repetido na empresa, sem diferença de maiúscula, acento ou espaços: recusado com "Já existe um filtro com esse nome." (salvar e renomear).
- Nome vazio ou com mais de 60 letras: recusado.
- Filtro sem nenhuma condição completa não pode ser salvo ("Monte ao menos uma condição.").
- Condição de filtro salvo com valor que sumiu (etiqueta, nicho ou atendente que não existe mais, etapa fora da lista): aparece marcada "valor não existe mais" no painel e, no servidor, vira uma condição que nunca vale. Num grupo com E o grupo não traz ninguém; num grupo com OU as outras condições continuam valendo (SUP-B37-05).
- Filtro ligado e depois mudado pelo painel sem atualizar: o botão do salvo deixa de aparecer marcado (o que vale é o filtro aplicado).
- Apagar o filtro que está ligado: ele sai da faixa e o filtro aplicado volta a vazio.
- Mover o primeiro para a esquerda ou o último para a direita: a opção não aparece.
- Atendente: vê a faixa e aplica, mas não vê "Salvar filtro", "Atualizar filtro salvo" nem o menu (⋯). Mesmo que tente pela action ou direto no banco, é recusado.

### Cenário de Erro
- Falha ao salvar, renomear, atualizar, mover ou apagar: a mensagem do servidor aparece no próprio diálogo ou na faixa, e nada muda na tela.
- Sessão de outra empresa pedindo um filtro por id: o banco não devolve nada (RLS) e a action responde "Filtro não encontrado."

## Prova

| Critério | Prova | Onde | O que confere |
|---|---|---|---|
| CA-B37-23 | automática | `src/test/filtros-salvos.integration.test.ts` | Admin e Gerente salvam "Lojistas de Fortaleza" e o filtro passa a ser listado com as condições salvas |
| CA-B37-24 | automática | `src/test/filtros-salvos.integration.test.ts` | Salvar ou renomear para "lojistas de fortaléza" com um "Lojistas de Fortaleza" existente é recusado com o aviso de nome repetido |
| CA-B37-25 | automática | `src/test/filtros-salvos-tela.test.tsx` | Clicar no botão do salvo pede ao servidor o filtro dele, marca o botão como ligado e mostra a contagem |
| CA-B37-26 | automática | `src/test/filtros-salvos-tela.test.tsx` | Clicar de novo pede a lista sem filtro e o botão deixa de estar ligado |
| CA-B37-27 | automática | `src/test/filtros-salvos.integration.test.ts` | Gerente atualiza o salvo com uma condição a mais e o Admin passa a receber a versão nova |
| CA-B37-28 | automática | `src/test/filtros-salvos.integration.test.ts` | Renomear para "Lojistas CE" muda o nome e mantém as condições |
| CA-B37-29 | automática | `src/test/filtros-salvos-tela.test.tsx` | "Apagar" abre a confirmação; cancelar não chama o servidor; confirmar apaga e o botão some |
| CA-B37-30 | automática | `src/test/filtros-salvos.integration.test.ts` | Filtro salvo pelo Gerente aparece para o Admin e para o Atendente da mesma empresa |
| CA-B37-31 | automática | `src/test/filtros-salvos.integration.test.ts` e `src/test/filtros-salvos-tela.test.tsx` | O servidor (action e banco) recusa salvar, renomear, atualizar, mover e apagar vindo do Atendente; na tela do Atendente não há "Salvar filtro" nem menu, mas o clique no salvo aplica |
| CA-B37-32 | automática | `src/test/filtros-salvos.integration.test.ts` | Pessoa da empresa B não lista, não usa, não renomeia e não apaga o filtro da empresa A |
| CA-B37-33 | automática | `src/test/filtros-salvos.integration.test.ts` e `src/test/filtros-salvos-tela.test.tsx` | Com a etiqueta apagada, "Etiqueta tem VIP" não traz ninguém (e num OU as outras condições valem); no painel a condição aparece como "valor não existe mais" |
| CA-B37-34 | automática | `src/test/filtros-salvos-tela.test.tsx` | Com o salvo ligado e o botão fixo "Ativo" clicado, o pedido leva as condições do salvo e a classificação Ativo; os botões fixos continuam; sem salvos, a faixa não aparece |
| CA-B37-38 | automática | `src/test/filtros-salvos.integration.test.ts` | Gerente põe "C" na frente e todos recebem C, A, B; um filtro novo entra no fim; o Atendente não consegue mover |
| CA-B37-35 | manual | roteiro abaixo | Faixa e painel aprovados no estilo Caderno, no computador e no celular |

### Roteiro manual — CA-B37-35
1. No preview, entre com o login da empresa de teste (Admin) e abra Contatos.
2. Monte e salve três filtros: "Lojistas de Fortaleza" (Cidade é igual a Fortaleza E Tipo é Lojista), "Com etiqueta VIP" (Etiqueta tem vip) e "Nunca compraram" (Data da última compra está vazia).
3. Confira a faixa "Salvos" ao lado dos botões fixos; ligue e desligue cada um; abra o menu (⋯) e mova um deles.
4. Repita no celular (390 px): a faixa quebra linha sem rolar para o lado, e o menu e os diálogos cabem na tela.
5. Aprove o visual no estilo Caderno, no claro e no escuro.

## Banco de Dados

- Tabela nova `public.filtros_salvos`:
  - `id` (uuid, pk)
  - `workspace_id` (uuid, empresa; cascade)
  - `nome` (text, 1 a 60 letras) — como a pessoa escreveu
  - `nome_chave` (text) — nome sem maiúscula, acento e espaços repetidos; único por empresa (`unique (workspace_id, nome_chave)`)
  - `filtro` (jsonb) — o filtro no mesmo formato do painel (juncao, grupos, condições)
  - `posicao` (int) — ordem na faixa
  - `criado_por` (uuid, perfil; set null)
  - `created_at`, `updated_at` (timestamptz)
- RLS: todos da empresa leem; só Admin e Gerente da empresa gravam, mudam e apagam. Trigger `garantir_mesma_empresa` para `criado_por`.
- `condicao_de_contato_sql` ganha o campo interno `nunca` (sempre falso), que o servidor usa no lugar da condição cujo valor sumiu.
- Migration `supabase/migrations/20261022000003_filtros_salvos.sql`, aplicada com `npx supabase db push --linked`; tipos regenerados.

## Arquivos

- **Criar:** `supabase/migrations/20261022000003_filtros_salvos.sql` — tabela, RLS, trigger e o campo `nunca`.
- **Modificar:** `src/integrations/supabase/types.ts` — regenerado depois da migration.
- **Modificar:** `src/lib/filtro-contatos.ts` — `valorSumiu` (condição cujo valor não existe mais, com as opções fixas e as da empresa) e `limparFiltro` trocando essas condições por `nunca` no servidor; `chaveDoNome` (reusa `normalizarTexto` de `src/lib/catalogo/planilha.ts`).
- **Criar:** `src/app/(auth)/contatos/filtros-salvos.ts` — actions (`"use server"`): `listarFiltrosSalvos`, `salvarFiltro`, `atualizarFiltroSalvo`, `renomearFiltroSalvo`, `moverFiltroSalvo`, `apagarFiltroSalvo`; conferem papel (Admin/Gerente) e validam com `esquemaFiltro`.
- **Modificar:** `src/app/(auth)/contatos/actions.ts` — `filtrarContatos` troca as condições com valor que sumiu (etiqueta, nicho, atendente) por `nunca`, usando `valoresDoFiltro`.
- **Modificar:** `src/app/(auth)/contatos/page.tsx` — carrega os filtros salvos.
- **Criar:** `src/app/(auth)/contatos/components/faixa-filtros-salvos.tsx` — faixa "Salvos" com os botões, o menu (⋯) e os diálogos de renomear e apagar.
- **Modificar:** `src/app/(auth)/contatos/components/lista-contatos.tsx` — filtros salvos no estado, faixa ao lado dos botões fixos, ligar/desligar, papel decide o que aparece.
- **Modificar:** `src/app/(auth)/contatos/components/painel-filtro.tsx` — "Salvar filtro" (com nome) e "Atualizar filtro salvo" para Admin e Gerente; marca "valor não existe mais".
- **Criar:** `src/test/filtros-salvos.integration.test.ts` — CA-B37-23, 24, 27, 28, 30, 31, 32, 33 e 38.
- **Criar:** `src/test/filtros-salvos-tela.test.tsx` — CA-B37-25, 26, 29, 31, 33 e 34.

## Checklist

- [x] Migration com a tabela, RLS, trigger e o campo `nunca`, aplicada e com os tipos regenerados
- [x] `src/lib/filtro-contatos.ts` com `valorSumiu`, `nunca` e `chaveDoNome`
- [x] Actions dos filtros salvos, com papel conferido no servidor
- [x] `filtrarContatos` trocando valores que sumiram por `nunca`
- [x] Faixa de filtros salvos com menu, renomear, mover e apagar
- [x] Painel com "Salvar filtro", "Atualizar filtro salvo" e a marca de valor que sumiu
- [x] Testes da tabela Prova escritos e passando
- [x] `tsc --noEmit`, lint e testes da B37-01 e B37-02 passando

## Testes manuais

| Critério | Conferido por | Dia |
|---|---|---|
| CA-B37-35 | Marcelle | 22/10/2026 |
