# B42-01: Perfil RFV e Atendente (carteira) no filtro de Contatos

**Tipo:** Implementação
**Página:** Contatos → filtro avançado
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-segmentacao-de-campanhas.md`

## Descrição

O filtro avançado ganha o campo Perfil RFV (assunto Compras), com o perfil calculado sobre a empresa inteira como na aba RFV sem filtro de atendente, e o campo Atendente passa a se chamar Atendente (carteira).

## Pronto quando

Na lista de Contatos dá para filtrar "Perfil RFV é Campeão", "é qualquer um de", "está vazio" e "não está vazio", com os mesmos clientes da aba RFV, e o campo aparece como "Atendente (carteira)". Como a campanha vai usar este mesmo filtro, os dois campos chegam lá sozinhos na B42-02.

## Critérios de aceite

- **CA-B42-21** (automática) — O filtro por perfil RFV traz os mesmos clientes da aba RFV. Dado uma empresa com vendas que dão clientes em vários perfis, quando o filtro é "Perfil RFV é Campeão" e depois "Perfil RFV é qualquer um de Em Risco, Não Perder", então os contatos encontrados são exatamente os que a aba RFV dos Relatórios, sem filtro de atendente, lista nesses perfis hoje
- **CA-B42-22** (automática) — O perfil não muda com quem filtra. Dado um cliente que é Campeão na base da empresa inteira e que teria outro perfil se o cálculo usasse só os clientes do atendente dele, quando o Admin e o Atendente dono desse cliente filtram por "Perfil RFV é Campeão" na lista de Contatos, então o cliente aparece para os dois como Campeão
- **CA-B42-23** (automática) — Quem nunca comprou não tem perfil. Dado um contato sem nenhuma compra e um com compras, quando o filtro é "Perfil RFV está vazio" e depois "Perfil RFV não está vazio", então o primeiro filtro traz só o que nunca comprou; o segundo, só o que comprou
- **CA-B42-24** (automática) — "Não é" não traz quem não tem perfil. Dado um Campeão, um Perdido e um contato que nunca comprou, quando o filtro é "Perfil RFV não é Campeão", então aparece só o Perdido, como as outras comparações negativas do filtro
- **CA-B42-25** (automática) — O campo Atendente passa a se chamar Atendente (carteira). Dado o painel do filtro aberto na lista de Contatos e na campanha, quando a pessoa abre a lista de campos, então aparece "Atendente (carteira)" no lugar de "Atendente", e um filtro salvo que já usava Atendente continua trazendo os mesmos contatos
- **CA-B42-26** (automática) — Atendente segue vendo só os próprios contatos. Dado um Atendente logado na lista de Contatos, quando filtra por "Perfil RFV é Campeão", então aparecem só os Campeões que ele já enxerga hoje

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B42-03 | Em campanha, o filtro funciona com a visão do Admin e do Gerente (todos os contatos da empresa); não há caso de Atendente montando campanha. | confirmada | Lido no código em 23/10/2026: toda action de campanha passa por `perfilGestor` (só Admin e Gerente) |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| PER-B42-03 | Que campos novos entram no filtro além dos que ele já tem? | respondida | Perfil RFV e carteira (Marcelle, 23/10/2026) |
| PER-B42-04 | Carteira é diferente do atendente do contato? | respondida | Não: o campo Atendente passa a se chamar "Atendente (carteira)", nas duas telas (Marcelle, 23/10/2026) |
| PER-B42-05 | O perfil RFV do filtro é calculado sobre qual base? | respondida | Empresa inteira, o mesmo da aba RFV sem filtro de atendente (Marcelle, 23/10/2026) |

## Cenários

### Happy Path
1. Na lista de Contatos, a pessoa abre "Filtrar" e, no assunto Compras, escolhe "Perfil RFV".
2. As comparações são as de campo de lista: é, não é, é qualquer um de, está vazio, não está vazio. Os valores são os 11 perfis, na ordem da aba RFV.
3. O banco calcula o perfil de cada cliente da empresa inteira (mesma regra da aba RFV sem filtro de atendente: compras até hoje no fuso de São Paulo, F e V por quintil nos 12 meses, R por faixas fixas, matriz FV × R, contatos na lixeira fora da base) e devolve os contatos que batem.
4. No assunto Cadastro, o campo que era "Atendente" aparece como "Atendente (carteira)". O id do campo continua `atendente`, então os filtros salvos que já o usam continuam iguais.

### Edge Cases
- Contato que nunca comprou não tem perfil: entra em "está vazio" e não entra em "não é Campeão".
- Contato só com compra com data no futuro conta como sem compra até hoje (a aba RFV também ignora `data > hoje`).
- Empates de frequência ou valor recebem a mesma nota, a maior entre eles (`rank()` no banco é o mesmo índice do primeiro empatado em `notasPorQuintil`).
- Atendente: o perfil é calculado sobre a empresa inteira, mas a função só devolve perfil de contato que ele pode ver (`pode_ver_contato`). Ele não descobre nada sobre contatos de outras carteiras.
- Contato na lixeira não entra na base: não muda o quintil dos outros, como na aba RFV.

### Cenário de Erro
- Perfil que não existe na lista (valor forjado na chamada ao servidor) faz o `esquemaFiltro`/`condicaoCompleta` descartar a condição, como já acontece com qualquer opção fixa.
- Falha do banco: a lista mostra o "Não foi possível aplicar o filtro." que já existe.

## Prova

| Critério | Prova | Onde | O que confere |
|---|---|---|---|
| CA-B42-21 | automática | `src/test/filtro-contatos-rfv.integration.test.ts` | Com vendas reais no banco, "Perfil RFV é Campeão" e "é qualquer um de Em Risco, Não Perder" trazem exatamente os contatos que `calcularRfv` (aba RFV, sem filtro de atendente) põe nesses perfis |
| CA-B42-22 | automática | `src/test/filtro-contatos-rfv.integration.test.ts` | Um cliente Campeão na empresa, que seria Potencial Fiel só entre os clientes do atendente dele, aparece como Campeão para o Admin e para esse Atendente |
| CA-B42-23 | automática | `src/test/filtro-contatos-rfv.integration.test.ts` | "está vazio" traz só quem nunca comprou; "não está vazio", só quem comprou |
| CA-B42-24 | automática | `src/test/filtro-contatos-rfv.integration.test.ts` | "não é Campeão" traz o Perdido e não traz o Campeão nem quem nunca comprou |
| CA-B42-25 | automática | `src/test/filtro-contatos-tela.test.tsx` | A lista de campos mostra "Atendente (carteira)" e não "Atendente", e uma condição salva com o campo `atendente` abre no painel com o nome novo |
| CA-B42-26 | automática | `src/test/filtro-contatos-rfv.integration.test.ts` | O Atendente filtrando "Perfil RFV é Campeão" vê só os Campeões que são contatos dele, mesmo havendo Campeões de outra carteira |

## Banco de Dados

- Função nova `public.perfis_rfv_da_empresa()` (security definer, `search_path = public`): pega a empresa de quem chama (`profiles` com `auth.uid()` e `status = 'active'`), calcula o perfil RFV de cada contato com compra, fora da lixeira, com a mesma regra de `src/lib/relatorios/rfv.ts`, e devolve `(contact_id uuid, perfil text)` só dos contatos em que `pode_ver_contato(contact_id)` é verdadeiro. `revoke` de `public`/`anon`, `grant execute` para `authenticated`.
- `public.condicao_de_contato_sql`: recriada com o caso `perfil_rfv` (lista), com subconsulta sem correlação (`c.id in (select contact_id from public.perfis_rfv_da_empresa() where ...)`) para o cálculo rodar uma vez por consulta:
  - `e` → `perfil = v1`; `nao_e` → `perfil <> v1` (quem não tem perfil fica fora); `qualquer_de` → `perfil = any(...)`; `nao_vazio` → está na função; `vazio` → `c.id not in (...)`.
- Migration `supabase/migrations/20261024000001_filtro_perfil_rfv.sql`, aplicada com `npx supabase db push --linked`. Só acrescenta a função e o caso novo; a produção de hoje não muda.
- `src/integrations/supabase/types.ts` regenerado (`supabase gen types typescript --linked`).

## Arquivos

- **Criar:** `supabase/migrations/20261024000001_filtro_perfil_rfv.sql` — função `perfis_rfv_da_empresa` e `condicao_de_contato_sql` com o campo `perfil_rfv`
- **Criar:** `src/test/filtro-contatos-rfv.integration.test.ts` — CA-B42-21, 22, 23, 24 e 26 no banco de verdade
- **Modificar:** `src/lib/filtro-contatos.ts` — campo `perfil_rfv` em `CAMPOS_LIGADOS` (assunto Compras, tipo lista, não obrigatório, opções de `PERFIS` de `@/lib/relatorios/rfv`) e rótulo "Atendente (carteira)"
- **Modificar:** `src/test/filtro-contatos-tela.test.tsx` — CA-B42-25 e a lista de campos do CA-B37-03 com Perfil RFV e o rótulo novo
- **Modificar:** `src/integrations/supabase/types.ts` — tipo gerado com a função nova

> Reuso: `PERFIS` (`src/lib/relatorios/rfv.ts`) dá as opções; `calcularRfv` é a referência do teste do CA-B42-21; `pode_ver_contato` e o padrão de empresa por `auth.uid()` de `filtrar_pedidos` vêm do banco. O painel (`painel-filtro.tsx`) já mostra opções fixas de campo de lista e não muda.

## Checklist

- [x] Migration com `perfis_rfv_da_empresa()` espelhando `calcularClientesRfv` (12 meses, quintil com empate, faixas 30/60/90/180, FV arredondado para cima, matriz) e com o filtro de `pode_ver_contato`
- [x] `condicao_de_contato_sql` recriada a partir da versão da B41-06, com o caso `perfil_rfv`
- [x] `npx supabase db push --linked` e regenerar `types.ts`
- [x] Campo `perfil_rfv` em `CAMPOS_LIGADOS` e rótulo "Atendente (carteira)" em `CAMPOS_DO_FILTRO`
- [x] Testes de integração dos CA-B42-21, 22, 23, 24 e 26
- [x] Teste de tela do CA-B42-25 e atualizar a lista do CA-B37-03
- [x] Rodar todos os testes que renderizam o painel do filtro: `filtro-contatos-tela`, `filtros-salvos-tela`, `funis-dashboard-filtro-tela`, `remover-nicho-contato`, e os de integração do filtro
