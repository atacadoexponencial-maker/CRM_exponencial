# B38-07: Filtro por campo personalizado nos Relatórios e no Dashboard

**Tipo:** Implementação
**Página:** Relatórios (todas as abas); Dashboard
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-campos-personalizados.md`

## Descrição

Ao lado do filtro de atendente, os Relatórios e o Dashboard ganham o filtro por um campo personalizado, que deixa nos números só os clientes com os valores escolhidos; no RFV o perfil continua calculado com a empresa toda.

## Pronto quando

Com "Porte: Grande", a Visão Geral, o RFV, a Recompra por coorte, o Funil de clientes, as Carteiras e o Dashboard contam só os clientes de Porte Grande, inclusive junto com o filtro de atendente.

## Critérios de aceite

- **CA-B38-50** (automática) — Filtro por campo nos Relatórios. Dado clientes com Porte "Grande" e "Pequeno", com compras no mês, quando o Admin abre a Visão Geral e filtra "Porte: Grande", então os cartões, os gráficos e a lista de vendas contam só as compras dos clientes com Porte Grande; o mesmo filtro vale nas abas RFV, Recompra por coorte, Funil de clientes e Carteiras
- **CA-B38-51** (automática) — Filtro por campo no RFV não muda o perfil. Dado um cliente com Porte "Grande" e o perfil "Campeões" na aba RFV sem filtro, quando o Admin filtra o RFV por "Porte: Grande", então o cliente aparece com o mesmo perfil e as mesmas notas R, F e V, e a matriz conta só os clientes com Porte Grande
- **CA-B38-52** (automática) — Filtro por campo no Dashboard. Dado o Dashboard com clientes de Porte "Grande" e "Pequeno", quando o Admin filtra "Porte: Grande", então os números do Dashboard contam só os contatos com Porte Grande
- **CA-B38-53** (automática) — Filtro por campo junto com o de atendente. Dado o Atendente Teste com clientes de Porte "Grande" e "Pequeno", quando o Admin filtra pelo Atendente Teste e por "Porte: Grande", ou o próprio atendente filtra por "Porte: Grande", então a tela conta só os clientes da carteira dele com Porte Grande

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B38-13 | O filtro por campo nos Relatórios e no Dashboard escolhe um campo por vez. Campos de texto, número e data filtram com uma comparação simples (é, entre); Lista, Múltipla escolha e Sim/não escolhem os valores. | confirmada | Marcelle, 26/10/2026. |
| SUP-B38-15 | O filtro por campo no RFV segue a regra da B33-04: o perfil é sempre calculado com a empresa toda e o filtro só escolhe quem aparece (CA-B38-51). | confirmada | Marcelle, 26/10/2026. |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| PER-B38-11 | O que os campos fazem nos Relatórios e no Dashboard? | respondida | Filtro por campo, tabela de vendas por valor do campo e colunas nos Excel que listam clientes ou vendas. Marcelle, 26/10/2026. |

## Cenários

### Happy Path
1. Ao lado do filtro de atendente, nas abas dos Relatórios e no Dashboard, aparece "Campo personalizado": escolhido o campo, o valor usa o controle do tipo (SUP-B38-13): lista e múltipla escolha marcam opções; sim/não escolhe um; texto compara igual; número, dinheiro e data pedem "entre".
2. O servidor transforma o filtro no conjunto dos contatos que atendem (a mesma comparação da condição das automações) e restringe a ele: as compras da Visão Geral, da coorte e do funil; os clientes que aparecem no RFV; os contatos das carteiras; os cards e as compras do Dashboard.
3. No RFV, o perfil e as notas continuam calculados com a empresa toda; o filtro só escolhe quem aparece (SUP-B38-15).
4. Com o filtro de atendente junto, vale a interseção.

### Edge Cases
- Campo de outra empresa ou apagado: nenhum contato atende, e a tela fica vazia, sem erro.
- Filtro incompleto (campo sem valor) não filtra.
- O Atendente só alcança os contatos dele, como hoje; o filtro por campo restringe dentro disso.

### Cenário de Erro
- Falha ao ler os valores: a tela mostra o erro de carregar, como hoje.

## Prova

| Critério | Prova | Onde | O que confere |
|---|---|---|---|
| CA-B38-50 | automática | `src/test/campos-personalizados-relatorios.integration.test.ts` | Com "Porte: Grande", a Visão Geral, a coorte, o funil de clientes e as carteiras contam só os clientes de Porte Grande; na tela, o filtro aparece ao lado do de atendente |
| CA-B38-51 | automática | `src/test/campos-personalizados-relatorios.integration.test.ts` | O cliente de Porte Grande tem o mesmo perfil e as mesmas notas com e sem o filtro, e a matriz conta só os de Porte Grande |
| CA-B38-52 | automática | `src/test/campos-personalizados-relatorios.integration.test.ts` | O Dashboard com "Porte: Grande" conta só os cards e as compras dos contatos de Porte Grande |
| CA-B38-53 | automática | `src/test/campos-personalizados-relatorios.integration.test.ts` | Atendente Teste + "Porte: Grande" (pelo Admin e pelo próprio atendente) contam só os clientes da carteira dele com Porte Grande |

## Arquivos

- **Criar:** `src/lib/filtro-por-campo.ts` — o filtro por um campo (campo e valores) e a comparação de cada tipo
- **Modificar:** `src/lib/campos-personalizados-servidor.ts` — `contatosDoFiltroPorCampo`, o conjunto dos contatos que atendem
- **Modificar:** `src/lib/relatorios/visao-geral.ts` — `FiltroRelatorio` com o campo
- **Modificar:** `src/lib/metricas-dashboard.ts` — `FiltroDashboard` com o campo
- **Modificar:** `src/app/(auth)/relatorios/actions.ts` — as abas restringem ao conjunto do campo
- **Modificar:** `src/app/(auth)/dashboard/actions.ts` — cards e compras restritos ao conjunto do campo
- **Criar:** `src/components/shared/filtro-por-campo.tsx` — o controle do filtro (campo e valor do tipo)
- **Modificar:** `src/app/(auth)/relatorios/page.tsx` — busca os campos da empresa
- **Modificar:** `src/app/(auth)/relatorios/components/relatorios-client.tsx` — o filtro na Visão Geral e nas outras abas
- **Modificar:** `src/app/(auth)/relatorios/components/rfv-client.tsx` — recebe e manda o filtro
- **Modificar:** `src/app/(auth)/relatorios/components/coorte-client.tsx` — recebe e manda o filtro
- **Modificar:** `src/app/(auth)/relatorios/components/funil-clientes-client.tsx` — recebe e manda o filtro
- **Modificar:** `src/app/(auth)/relatorios/components/carteiras-client.tsx` — recebe e manda o filtro
- **Modificar:** `src/app/(auth)/dashboard/page.tsx` — busca os campos da empresa
- **Modificar:** `src/app/(auth)/dashboard/components/dashboard-client.tsx` — o filtro no Dashboard
- **Criar:** `src/test/campos-personalizados-relatorios.integration.test.ts` — critérios no Supabase real
- **Criar:** `src/test/campos-personalizados-relatorios-tela.test.tsx` — o filtro ao lado do de atendente, na tela

## Checklist

- [x] Filtro por campo na lib e o conjunto dos contatos no servidor
- [x] Relatórios: Visão Geral, RFV, coorte, funil e carteiras
- [x] Dashboard
- [x] Controle do filtro nas telas
- [x] Testes da tabela Prova e os dos relatórios e do Dashboard que já existem
- [x] `npx tsc --noEmit`
