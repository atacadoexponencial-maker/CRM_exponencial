# B40-01: Nicho sai das telas do contato

**Tipo:** Implementação
**Página:** Contatos (novo contato, perfil, lista e filtro) e ficha do contato no chat
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-remover-nicho.md`

## Descrição

Tirar o campo Nicho do cadastro, do perfil, da ficha do chat, da tabela de contatos, dos botões rápidos e do filtro avançado, e fazer o servidor parar de ler, gravar e filtrar pelo nicho. A coluna no banco fica para a B40-02.

## Pronto quando

Dá para cadastrar, ver, editar e filtrar contatos (pela lista e pelo chat) sem o Nicho aparecer em lugar nenhum, e uma busca com condição de nicho é recusada pelo servidor.

## Critérios de aceite

- **CA-B40-01** (automática) — O cadastro de contato não pede nicho. Dado uma pessoa na lista de contatos, quando ela abre "Novo contato", então o formulário não mostra o campo Nicho, e ao salvar o contato é criado normalmente com os outros campos.
- **CA-B40-02** (automática) — O perfil do contato não mostra nicho. Dado um contato cadastrado, quando a pessoa abre o perfil dele, então os dados não têm a linha Nicho.
- **CA-B40-03** (automática) — Editar o contato funciona sem nicho. Dado o perfil de um contato aberto em modo de edição, quando a pessoa muda nome, tipo, cidade ou UF e salva, então o formulário não tem o campo Nicho e os dados novos ficam gravados.
- **CA-B40-04** (automática) — As opções do ICP continuam as mesmas. Dado o perfil de um contato em modo de edição, quando a pessoa abre o campo ICP, então as opções "Já revende este nicho" e "Primeira vez no nicho" continuam lá, com o mesmo texto.
- **CA-B40-05** (automática) — A ficha do contato no chat não mostra nicho. Dado uma conversa aberta no chat, quando a pessoa olha a ficha do contato, então a ficha não tem o dado Nicho, e os outros dados continuam editáveis.
- **CA-B40-06** (automática) — A tabela de contatos não tem coluna Nicho. Dado uma empresa com contatos, quando a pessoa abre a lista de contatos, então a tabela não tem a coluna Nicho.
- **CA-B40-07** (automática) — A lista não tem botões de nicho. Dado a lista de contatos aberta, quando a pessoa olha os botões de filtro rápido, então não há "Todos nichos" nem botão de nicho, e os botões de classificação, tipo e atendente continuam lá.
- **CA-B40-08** (automática) — O filtro avançado não oferece Nicho. Dado o filtro avançado de contatos aberto, quando a pessoa escolhe o campo de uma condição, então Nicho não está entre os campos, e os demais campos filtram como antes.
- **CA-B40-09** (automática) — O servidor recusa filtro por nicho. Dado um pedido de busca de contatos que chega com uma condição de nicho (montada fora da tela), quando o servidor recebe o pedido, então a busca é recusada como campo desconhecido, igual a qualquer outro campo que não existe.

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B40-01 | Nenhuma automação, campanha ou filtro salvo usa o nicho, então não é preciso limpar referências ao apagar | confirmada | Marcelle, 22/10/2026: "ninguém usa o app ainda" (conferido no banco no mesmo dia: zero contatos com nicho, zero referências) |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| PER-B40-01 | As opções que falam em nicho mudam de texto? (são do campo ICP; a pergunta saiu escrita como "Tipo" por engano, corrigido no /plan da B40-01) | respondida | Marcelle, 22/10/2026: manter como está |

## Cenários

### Happy Path
1. A pessoa abre "Novo contato": o formulário tem nome, telefone, tipo, cidade e UF, sem Nicho. Ela salva e o contato é criado (a action `criarContato` não recebe nem grava nicho).
2. No perfil do contato, a leitura mostra tipo, cidade, UF e ICP, sem a linha Nicho. Na edição, o formulário não tem Nicho; salvar chama `atualizarDadosContato` sem nicho, e o ICP continua com "Já revende este nicho" e "Primeira vez no nicho".
3. No chat, a ficha mostra classificação, tipo, cidade, UF, ICP e atendente; editar tipo, cidade, UF ou ICP salva sem nicho.
4. A lista de contatos não tem a coluna Nicho nem a fileira "Todos nichos"; o filtro avançado lista os campos do Cadastro sem Nicho.

### Edge Cases
- A coluna `contacts.nicho` ainda existe nesta issue (ela sai na B40-02): o servidor só deixa de lê-la e gravá-la. A função `filtrar_contatos` do banco continua devolvendo a coluna nicho e aceitando o campo; o código simplesmente ignora o que vem e nunca manda o campo.
- Editar o contato deixa de mandar nicho para o gatilho "dado do contato alterado": `camposQueMudaram` só olha os campos que vieram em `depois`, então nada muda no gatilho sem tocar em `gatilhos-do-crm.ts` (ele sai na B40-02).
- Os dois filtros salvos de hoje não citam nicho (conferido no banco em 22/10/2026).

### Cenário de Erro
- Filtro com condição de campo `nicho` (no filtro avançado ou nos botões rápidos) chega ao servidor: `esquemaFiltro` / `esquemaRapidos` recusam, e `filtrarContatos` devolve "Filtro inválido.", como para qualquer campo desconhecido.

## Prova

| Critério | Prova | Onde | O que confere |
|---|---|---|---|
| CA-B40-01 | automática | `src/test/remover-nicho-contato.test.tsx` | O formulário de novo contato não tem campo Nicho e, ao salvar, `criarContato` é chamado com nome, telefone, tipo, cidade e UF, sem nicho |
| CA-B40-02 | automática | `src/test/remover-nicho-contato.test.tsx` | O perfil em modo de leitura não tem a linha Nicho e mostra os outros dados |
| CA-B40-03 | automática | `src/test/remover-nicho-contato.test.tsx` | Em edição o perfil não tem campo Nicho e salvar chama `atualizarDadosContato` com os dados novos, sem nicho |
| CA-B40-04 | automática | `src/test/remover-nicho-contato.test.tsx` | O campo ICP em edição ainda tem as opções "Já revende este nicho" e "Primeira vez no nicho" |
| CA-B40-05 | automática | `src/test/remover-nicho-contato.test.tsx` | A ficha do chat não mostra Nicho nem "Editar nicho", e editar a cidade salva sem nicho |
| CA-B40-06 | automática | `src/test/remover-nicho-contato.test.tsx` | O cabeçalho da tabela de contatos não tem "Nicho" e tem as demais colunas |
| CA-B40-07 | automática | `src/test/remover-nicho-contato.test.tsx` | Não há botão "Todos nichos"; os botões de classificação e tipo continuam |
| CA-B40-08 | automática | `src/test/remover-nicho-contato.test.tsx` | A lista de campos do filtro avançado no Cadastro não tem Nicho e filtrar por Cidade continua pedindo ao servidor |
| CA-B40-09 | automática | `src/test/remover-nicho-contato.test.tsx` | Filtro e botão rápido com campo nicho são recusados pelo esquema do servidor ("Campo desconhecido") |

## Banco de Dados

Nada nesta issue. A coluna `contacts.nicho` e a função `filtrar_contatos` mudam na B40-02.

## Arquivos

- **Modificar:** `src/app/(auth)/contatos/mock-contatos.ts` — tirar `nicho` dos tipos `Contato` e `ContatoPerfil` e dos dados de exemplo.
- **Modificar:** `src/app/(auth)/contatos/actions.ts` — tirar nicho de `CONTACT_SELECT`, `mapContato`, `criarContato`, `PERFIL_SELECT`, `buscarDadosContato`, `atualizarDadosContato` (select do antes e `depois`), `filtrarContatos` (`citaValorDaEmpresa`) e `valoresDoFiltro` (sem a consulta de nichos).
- **Modificar:** `src/app/(auth)/contatos/page.tsx` — não passar `nichos` para a lista.
- **Modificar:** `src/app/(auth)/contatos/components/novo-contato-dialog.tsx` — tirar o campo Nicho do formulário e do envio.
- **Modificar:** `src/app/(auth)/contatos/[id]/components/perfil-contato.tsx` — tirar Nicho da leitura, do formulário de edição e do envio.
- **Modificar:** `src/app/(auth)/contatos/components/lista-contatos.tsx` — tirar a prop `nichos`, o estado e os botões de nicho e a coluna Nicho.
- **Modificar:** `src/app/(auth)/contatos/components/painel-filtro.tsx` — tirar a prop `nichos` e as opções de nicho.
- **Modificar:** `src/lib/filtro-contatos.ts` — tirar o campo `nicho` de `CAMPOS_DO_FILTRO`, de `ValoresDaEmpresa`/`valorSumiu` e de `esquemaRapidos`; pôr `nicho` em `COLUNAS_FORA_DO_FILTRO` até a B40-02 apagar a coluna (o teste do CA-B37-04 exige que toda coluna esteja no filtro ou nessa lista).
- **Modificar:** `src/app/(auth)/chat/actions.ts` — tirar nicho de `CadastroDoContato` e de `buscarInfoContato`.
- **Modificar:** `src/app/(auth)/chat/components/painel-contato.tsx` — tirar o dado Nicho da ficha e de `salvarCampo`.
- **Criar:** `src/test/remover-nicho-contato.test.tsx` — testes CA-B40-01 a 09.
- **Modificar:** `src/test/filtro-contatos-tela.test.tsx` — tirar `nicho`/`nichos` dos dados e "Nicho" da lista esperada de campos (CA-B37-03).
- **Modificar:** `src/test/filtros-salvos-tela.test.tsx` — tirar `nicho`/`nichos` dos dados.
- **Modificar:** `src/test/foto-nas-telas.test.tsx` — tirar `nicho` dos dados.
- **Modificar:** `src/test/listas-atualizam-apos-salvar.test.tsx` — tirar `nicho` dos dados.
- **Modificar:** `src/test/chat-caderno.test.tsx` — tirar `nicho` dos dados.
- **Modificar:** `src/test/chat-ficha-do-contato.test.tsx` — a edição no lugar passa a usar a cidade em vez do nicho; tirar `nicho` dos dados.

## Checklist

- [x] Tirar `nicho` dos tipos e dos dados em `mock-contatos.ts`
- [x] Tirar nicho das actions de contatos (listar, filtrar, criar, perfil, editar, valores do filtro) e da página
- [x] Tirar o campo Nicho do novo contato e do perfil (leitura e edição)
- [x] Tirar coluna, botões e prop `nichos` da lista e do painel de filtro
- [x] Tirar o campo nicho do catálogo de filtros e do esquema dos botões rápidos
- [x] Tirar nicho da ficha do chat e da action `buscarInfoContato`
- [x] Ajustar os testes antigos que montam contato com nicho
- [x] Escrever `src/test/remover-nicho-contato.test.tsx`
- [x] `npx tsc --noEmit`, `npm run lint` e testes passando
