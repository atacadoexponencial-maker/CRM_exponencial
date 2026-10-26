# B38-03: Campos personalizados no filtro de Contatos e no público das Campanhas

**Tipo:** Implementação
**Página:** Contatos → filtro avançado; Campanhas → público
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-campos-personalizados.md`

## Descrição

O filtro avançado ganha o assunto "Campos personalizados", com as comparações de cada tipo; como a campanha usa o mesmo filtro, o público dela também passa a filtrar pelos campos.

## Pronto quando

Em Contatos, "Porte é qualquer um de Grande" traz os contatos certos, combina com outros campos em grupos E/OU e pode ser salvo; a mesma condição escolhe o público de uma campanha.

## Critérios de aceite

- **CA-B38-31** (automática) — Filtrar por campo de lista. Dado 5 contatos com "Porte" igual a "Grande", 3 com "Pequeno" e 4 sem valor, quando o Admin filtra Contatos por "Porte é qualquer um de Grande", então aparecem os 5 contatos e a contagem mostra 5; com "Porte está vazio", aparecem os 4
- **CA-B38-32** (automática) — Cada tipo filtra com as suas comparações. Dado contatos com valores em campos de cada tipo, quando o filtro usa cada comparação da tabela acima, então cada uma traz exatamente os contatos esperados, e "não é", "não contém" e "não tem nenhum de" não trazem quem está com o campo vazio
- **CA-B38-33** (automática) — Campo personalizado combina com os outros. Dado contatos com Porte "Grande" em SP e em MG, quando o filtro é "Porte é qualquer um de Grande" E "UF é qualquer um de SP", então aparecem só os de SP com Porte Grande
- **CA-B38-34** (automática) — Filtro salvo com campo personalizado. Dado o Gerente salva o filtro "Lojas grandes" com "Porte é qualquer um de Grande", quando qualquer pessoa da empresa abre esse filtro salvo, então ele traz os mesmos contatos, e renomear o campo ou a opção não muda o resultado
- **CA-B38-35** (automática) — Público de campanha por campo personalizado. Dado uma campanha nova, quando o Admin escolhe o público "Porte é qualquer um de Grande", então a contagem do público e a lista de quem recebe trazem os mesmos contatos que o filtro de Contatos traz
- **CA-B38-36** (automática) — Filtro do atendente continua só na carteira dele. Dado um Atendente que só vê os contatos que atende, quando ele filtra por um campo personalizado, então o resultado traz só contatos que ele já podia ver
- **CA-B38-44** (automática) — Uma empresa não vê os campos da outra. Dado a empresa A com o campo "CNPJ" e a empresa B sem campos, quando um usuário da empresa B abre a tela de campos, um perfil de contato e o filtro, ou faz um pedido ao servidor com o campo da empresa A, então ele não vê o campo nem os valores da empresa A, e o pedido é recusado

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B38-05 | Sim/não tem três estados: sim, não e vazio (nunca preenchido). No filtro, "é não" não traz o vazio. | confirmada | Marcelle, 26/10/2026. |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| PER-B38-03 | Além do perfil e do filtro, onde os campos aparecem? | respondida | Painel do contato no Chat, cadastro de novo contato, automações e variáveis na mensagem. Marcelle, 26/10/2026. |

## Cenários

### Happy Path
1. No painel "Filtrar contatos", a escolha de campo ganha o grupo "Campos personalizados", com os campos da empresa na ordem dela.
2. Escolhido o campo, as comparações são as do tipo (tabela da spec) e o valor usa o controle certo: texto, número, data, ou caixas com as opções da lista.
3. "Aplicar" filtra no banco, sobre a base inteira, combinando com os outros campos em grupos E/OU; a contagem mostra o total.
4. O filtro pode ser salvo; o salvo guarda os ids do campo e das opções, então renomear não muda o resultado.
5. Na campanha, o público usa o mesmo painel e a mesma função do banco: a contagem e a lista de quem recebe batem com Contatos.

### Edge Cases
- "não é", "não contém" e "não tem nenhum de" não trazem quem está com o campo vazio.
- Sim/não: "é Não" não traz quem nunca preencheu; "está vazio" traz.
- Telefone: comparado só pelos dígitos, como o telefone do contato.
- O Atendente só alcança os contatos que já vê (a função do banco é security invoker, com o RLS de `contato_campos`).

### Cenário de Erro
- Campo de outra empresa (ou que não existe) no filtro: o banco recusa ("Campo de filtro desconhecido") e a tela mostra "Não foi possível aplicar o filtro."
- Opção que não é do campo, num filtro salvo: a condição vira "nunca vale" e aparece "Valor não existe mais", como nas etiquetas (B37-03).

## Prova

| Critério | Prova | Onde | O que confere |
|---|---|---|---|
| CA-B38-31 | automática | `src/test/campos-personalizados.integration.test.ts` | "Porte é qualquer um de Grande" traz os 5 e conta 5; "Porte está vazio" traz os 4; na tela, o painel oferece o campo em "Campos personalizados" com as opções |
| CA-B38-32 | automática | `src/test/campos-personalizados.integration.test.ts` | Cada tipo oferece as comparações da tabela, e cada comparação traz exatamente os contatos esperados; as negativas não trazem o vazio |
| CA-B38-33 | automática | `src/test/campos-personalizados.integration.test.ts` | "Porte é qualquer um de Grande" E "UF é qualquer um de SP" traz só os de SP com Porte Grande |
| CA-B38-34 | automática | `src/test/campos-personalizados.integration.test.ts` | O filtro salvo pelo Gerente traz os mesmos contatos para o Admin e o Atendente, também depois de renomear o campo e a opção |
| CA-B38-35 | automática | `src/test/campos-personalizados.integration.test.ts` | `contarDestinatarios` com o mesmo filtro traz os mesmos contatos que `filtrarContatos` |
| CA-B38-36 | automática | `src/test/campos-personalizados.integration.test.ts` | O Atendente filtrando por um campo personalizado recebe só contatos que ele já via |
| CA-B38-44 | automática | `src/test/campos-personalizados.integration.test.ts` | O Admin da empresa B não vê os campos da A na tela de campos, no perfil nem nas opções do filtro; filtrar ou gravar com o campo da A é recusado |

## Banco de Dados

Migration `supabase/migrations/20261026000003_filtro_campos_personalizados.sql`: `condicao_de_contato_sql` ganha o campo `campo:<tipo>:<uuid>`. O tipo verdadeiro vem de `campos_personalizados` (lido com o RLS de quem filtra: campo de outra empresa não é achado e o filtro é recusado); o valor vem de `contato_campos`. Comparações novas: "não é" em texto, "está vazio" em número, "não é nenhum de" em lista e múltipla escolha, e sim/não.

## Arquivos

- **Criar:** `supabase/migrations/20261026000003_filtro_campos_personalizados.sql` — o caso dos campos personalizados no filtro do banco
- **Modificar:** `src/lib/filtro-contatos.ts` — assunto "Campos personalizados", campos e comparações por tipo, validação e resumo
- **Modificar:** `src/app/(auth)/contatos/actions.ts` — `valoresDoFiltro` traz os campos; `filtrarContatos` confere opções que sumiram
- **Modificar:** `src/app/(auth)/contatos/components/painel-filtro.tsx` — grupo "Campos personalizados" e o valor de número com centavos
- **Modificar:** `src/app/(auth)/contatos/components/lista-contatos.tsx` — passa os campos ao painel do filtro
- **Modificar:** `src/app/(auth)/campanhas/[id]/editor-campanha-client.tsx` — passa os campos ao painel e ao resumo do público
- **Modificar:** `src/test/campos-personalizados.integration.test.ts` — critérios do servidor desta issue
- **Modificar:** `src/test/campos-personalizados-chat-cadastro-lista.test.tsx` — teste de tela do painel do filtro com os campos

## Checklist

- [x] Migration do filtro, db push e tipos
- [x] Catálogo do filtro com os campos personalizados
- [x] `valoresDoFiltro` e `filtrarContatos`
- [x] Painel do filtro, lista de Contatos e editor de campanha
- [x] Testes da tabela Prova e os do filtro que já existem
- [x] `npx tsc --noEmit`
