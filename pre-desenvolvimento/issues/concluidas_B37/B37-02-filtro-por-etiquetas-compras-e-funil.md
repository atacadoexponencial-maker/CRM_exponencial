# B37-02: Filtrar contatos por etiquetas, compras e etapa do funil

**Tipo:** Implementação
**Página:** Contatos (`/contatos`)
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-filtro-de-contatos.md`

## Descrição

Acrescentar ao filtro avançado os campos de Etiquetas, Compras (total já comprado, quantidade, data da última compra) e Funil (etapa em Entrada e em Recompra), com as comparações de cada tipo.

## Pronto quando

No painel do filtro aparecem os quatro assuntos (Cadastro, Etiquetas, Compras, Funil) com todos os campos da spec, e dá para achar, por exemplo, quem tem a etiqueta VIP, quem comprou mais de R$ 5.000 ou quem está na etapa Negociação.

## Critérios de aceite

- **CA-B37-02** (automática) — Cada campo mostra só as comparações do seu tipo. Dado o painel aberto, quando a pessoa escolhe um campo de cada tipo (texto, lista, número, data, etiqueta, funil), então a lista de comparações mostra exatamente as da tabela "Comparações por tipo de campo".
- **CA-B37-03** (automática) — Todos os campos da tabela aparecem para escolher. Dado o painel aberto, quando a pessoa abre a lista de campos, então aparecem todos os campos da tabela "Campos disponíveis", agrupados por assunto.
- **CA-B37-18** (automática) — Filtrar por etiqueta. Dado contatos com a etiqueta "VIP", com "VIP" e "Atacado", e sem etiqueta, quando o filtro é "Etiqueta tem VIP", depois "não tem VIP", depois "tem todas de VIP, Atacado", então o resultado é, nessa ordem: os dois primeiros; só o sem etiqueta; só o segundo.
- **CA-B37-19** (automática) — Filtrar por compras. Dado um contato que comprou R$ 6.000 em 3 compras, a última há 70 dias, e outro que nunca comprou, quando o filtro é "Total já comprado maior que 5.000", depois "Quantidade de compras igual a 3", depois "Data da última compra há mais de 60 dias", depois "Data da última compra está vazia", então os três primeiros acham só o primeiro contato e o último acha só o que nunca comprou.
- **CA-B37-20** (automática) — Filtrar por etapa do funil. Dado um contato na etapa "Negociação" do funil de Entrada e outro sem card em funil nenhum, quando o filtro é "Etapa no funil de Entrada está na etapa Negociação", depois "não está no funil", então o primeiro acha só o contato em Negociação e o segundo acha só o que não tem card.

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B37-04 | "Total já comprado", "Quantidade de compras" e "Data da última compra" usam as mesmas compras que o card do funil e os Relatórios já contam (compras registradas e pedidos do catálogo fechados). | confirmada | Marcelle, 22/10/2026. |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| PER-B37-02 | Além do cadastro, o filtro usa etiquetas, compras e etapa do funil? | respondida | Sim, os três. Marcelle, 22/10/2026. |
| PER-B37-09 | "Etiqueta não tem VIP" traz o contato sem nenhuma etiqueta? | respondida | Traz: a etiqueta marca quem tem, então "não tem VIP" é todo mundo sem a VIP, inclusive quem não tem etiqueta. Exceção à regra do campo vazio (SUP-B37-01). Marcelle, 22/10/2026. |
| PER-B37-10 | "Não está na etapa X" traz o contato que não tem card naquele funil? | respondida | Não traz: só quem está no funil, em outra etapa; para quem não tem card existe "não está no funil". Marcelle, 22/10/2026. |

## Cenários

### Happy Path
1. No painel "Filtrar", a lista de campos mostra quatro assuntos: Cadastro (os 11 da B37-01), Etiquetas (Etiqueta), Compras (Total já comprado, Quantidade de compras, Data da última compra) e Funil (Etapa no funil de Entrada, Etapa no funil de Recompra).
2. Cada campo oferece as comparações do seu tipo (tabela da spec): número, etiqueta, funil e data (a da última compra tem "está vazia" e "não está vazia", porque quem nunca comprou não tem data).
3. Etiquetas vêm do servidor (todas as da empresa); etapas vêm das listas fixas dos funis (`ETAPAS_ENTRADA`, `ETAPAS_RECOMPRA`).
4. "Aplicar" manda o filtro ao servidor, que responde como na B37-01 (base inteira, total, página).

### Edge Cases
- "Etiqueta não tem VIP" traz quem não tem etiqueta nenhuma (PER-B37-09); "sem etiqueta" traz só quem não tem nenhuma.
- "Tem todas de VIP, Atacado" exige as duas; repetir a mesma etiqueta não muda nada.
- "Não está na etapa Negociação" só traz quem tem card naquele funil, em outra etapa (PER-B37-10); "não está no funil" traz quem não tem card nele.
- Contato que nunca comprou: total 0, quantidade 0, data da última compra vazia. "Total menor que 100" traz quem nunca comprou.
- Valor em reais com centavos: "5000.50" (o campo numérico do navegador usa ponto); vírgula é recusada pela validação e a condição fica incompleta.
- "Entre" em número inclui as duas pontas.
- Datas da última compra comparadas como dia (a compra guarda o dia, não a hora), com "hoje" no fuso de Brasília.
- Atendente: as compras, etiquetas e cards que entram na conta são os que ele enxerga (a função roda com a permissão de quem chama, como a lista).

### Cenário de Erro
- Número inválido, etiqueta vazia ou etapa fora da lista: a condição fica incompleta no painel e o servidor a descarta.
- Campo ou comparação fora do catálogo: o servidor recusa o filtro ("Não foi possível aplicar o filtro."), como na B37-01.

## Prova

| Critério | Prova | Onde | O que confere |
|---|---|---|---|
| CA-B37-02 | automática | `src/test/filtro-contatos-tela.test.tsx` | Ao escolher um campo de cada tipo (texto, lista, número, data, etiqueta, funil), a lista de comparações é exatamente a da tabela da spec |
| CA-B37-03 | automática | `src/test/filtro-contatos-tela.test.tsx` | A lista de campos tem os 17 campos da spec, nos grupos Cadastro, Etiquetas, Compras e Funil |
| CA-B37-18 | automática | `src/test/filtro-contatos.integration.test.ts` | "tem VIP" traz os dois com VIP; "não tem VIP" traz só o sem etiqueta; "tem todas de VIP, Atacado" traz só o que tem as duas |
| CA-B37-19 | automática | `src/test/filtro-contatos.integration.test.ts` | Total > 5000, quantidade = 3 e última compra há mais de 60 dias acham só quem comprou R$ 6.000 em 3 compras (a última há 70 dias); "última compra está vazia" acha só quem nunca comprou |
| CA-B37-20 | automática | `src/test/filtro-contatos.integration.test.ts` | "está na etapa Negociação" (Entrada) acha só o contato em Negociação; "não está no funil" acha só o que não tem card |

## Banco de Dados

- Migration nova `supabase/migrations/20261022000002_filtro_contatos_etiquetas_compras_funil.sql`: recria `public.condicao_de_contato_sql` com os campos novos, sem mudar a assinatura (a `filtrar_contatos` continua igual e o tipo gerado não muda):
  - `etiqueta` — `contact_tags.tag` por `exists`: `tem`, `nao_tem`, `tem_qualquer`, `tem_todas`, `sem_etiqueta`, `com_etiqueta`.
  - `total_comprado` — `coalesce(sum(contact_purchases.valor), 0)`; `qtd_compras` — `count(*)`: `maior`, `menor`, `entre`, `igual`.
  - `ultima_compra` — `max(contact_purchases.data)` (dia): as comparações de data, com "hoje" no fuso de Brasília.
  - `etapa_entrada` / `etapa_recompra` — `pipeline_cards` do funil: `na_etapa`, `fora_da_etapa`, `no_funil`, `fora_do_funil`.
- Total, quantidade e última compra vêm de `contact_purchases`, a mesma fonte do card do funil e dos Relatórios (B30: pedido do catálogo fechado já vira compra) — SUP-B37-04.
- Aplicar com `npx supabase db push --linked`. Nenhuma tabela nem coluna nova.

## Arquivos

- **Criar:** `supabase/migrations/20261022000002_filtro_contatos_etiquetas_compras_funil.sql` — a função de condição com os campos novos.
- **Modificar:** `src/lib/filtro-contatos.ts` — tipos `numero`, `etiqueta` e `funil`; assuntos Etiquetas, Compras e Funil; `CAMPOS_LIGADOS` (os 6 campos novos, sem coluna em `contacts`) e `TODOS_OS_CAMPOS` para a tela; comparações e rótulos novos; validação de número, etiqueta e etapa. `CAMPOS_DO_FILTRO` continua só com o cadastro (o teste do CA-B37-04 não muda). Reusa `ETAPAS_ENTRADA`/`ETAPAS_RECOMPRA` de `src/app/(auth)/pipeline/mock-pipeline.ts`.
- **Modificar:** `src/app/(auth)/contatos/actions.ts` — `valoresDoFiltro` devolve também as etiquetas da empresa.
- **Modificar:** `src/app/(auth)/contatos/page.tsx` — passa as etiquetas para a lista.
- **Modificar:** `src/app/(auth)/contatos/components/lista-contatos.tsx` — recebe as etiquetas e as passa ao painel.
- **Modificar:** `src/app/(auth)/contatos/components/painel-filtro.tsx` — lista de campos com os quatro assuntos; valor numérico (R$ e quantidade); escolha de etiquetas (uma ou várias); escolha de etapa.
- **Modificar:** `src/test/filtro-contatos-tela.test.tsx` — CA-B37-02 e CA-B37-03.
- **Modificar:** `src/test/filtro-contatos.integration.test.ts` — CA-B37-18, 19 e 20.

## Checklist

- [x] Migration com etiquetas, compras e funil, aplicada com `npx supabase db push --linked`
- [x] `src/lib/filtro-contatos.ts` com os tipos, campos, comparações e validação novos
- [x] `valoresDoFiltro` com as etiquetas, passadas por `page.tsx` e `lista-contatos.tsx`
- [x] `painel-filtro.tsx` com os quatro assuntos e os valores de número, etiqueta e etapa
- [x] Testes da tabela Prova escritos e passando
- [x] `tsc --noEmit`, lint e testes da B37-01 passando
