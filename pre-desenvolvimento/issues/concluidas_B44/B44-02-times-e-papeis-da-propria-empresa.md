# B44-02: Times e papéis só da própria empresa, com Admin e dono protegido

**Tipo:** Implementação
**Página:** Configurações → Usuários
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-seguranca-rodada-4.md`

## Descrição

O Admin só coloca em times gente e times da própria empresa, pode dar o papel Admin ao editar e ao cadastrar, rebaixa ou desativa outro Admin, e ninguém mexe no dono da empresa pela tela.

## Pronto quando

Em Configurações → Usuários o papel Admin aparece na edição e no cadastro, o dono da empresa não pode ser rebaixado nem desativado (aviso "O dono da empresa não pode ser alterado"), e pedir para pôr alguém de outra empresa num time é recusado.

## Critérios de aceite

- **CA-B44-05** (automática) — Admin não coloca usuário de outra empresa em time. Dado as empresas A e B, cada uma com um usuário e um time, quando o Admin de A pede para pôr o usuário de B num time (de A ou de B), então o pedido é recusado e os times de B ficam iguais
- **CA-B44-06** (automática) — Admin não põe usuário seu em time de outra empresa. Dado as empresas A e B, quando o Admin de A pede para pôr um usuário de A num time de B, então o pedido é recusado e nenhum vínculo novo aparece
- **CA-B44-07** (automática) — Admin ajusta os times de alguém da própria empresa. Dado um usuário de A num time de A, quando o Admin de A marca outro time de A e desmarca o primeiro, então o usuário passa a estar só no time novo
- **CA-B44-08** (automática) — Admin promove outra pessoa a Admin. Dado um Gerente da empresa A, quando o Admin de A muda o papel dele para Admin, então a lista de usuários mostra a pessoa como Admin, e ela passa a ver as configurações que só o Admin vê
- **CA-B44-09** (automática) — Admin cadastra uma pessoa já como Admin. Dado o Admin de A na tela de cadastro de usuário, quando ele cadastra alguém com o papel Admin, então a pessoa aparece na lista como Admin da empresa A
- **CA-B44-10** (automática) — Papel que não existe é recusado. Dado o Admin de A, quando a edição de papel ou o cadastro recebe um papel que não é Admin, Gerente nem Atendente, então o pedido é recusado com aviso e nada muda
- **CA-B44-43** (automática) — Ninguém rebaixa nem desativa o dono da empresa. Dado a empresa A, com o dono (quem a cadastrou) e um segundo Admin promovido depois, quando o segundo Admin tenta mudar o papel do dono para Gerente ou Atendente, ou desativá-lo, então a tela avisa "O dono da empresa não pode ser alterado", e o dono continua Admin e ativo
- **CA-B44-44** (automática) — Admin rebaixa e desativa outro Admin que não é o dono. Dado a empresa A, com o dono e um segundo Admin, quando o dono muda o papel do segundo Admin para Gerente e depois o desativa, então a lista mostra a pessoa como Gerente e depois como desativada

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B44-09 | O "dono da empresa" é o Admin criado junto com a empresa na tela `/cadastro`. Hoje o banco não guarda isso, então a série passa a guardar, e nas empresas que já existem o dono é o Admin mais antigo | confirmada | Marcelle, 27/10/2026 |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| PER-B44-01 | Agora que Admin pode promover outra pessoa a Admin: um Admin pode rebaixar ou desativar outro Admin, inclusive o admin principal (atacadoexponencial@gmail.com)? Hoje pode, só não consegue mexer em si mesmo | respondida | Marcelle, 27/10/2026: **só o dono é protegido.** Admin rebaixa ou desativa outro Admin, menos o dono da empresa (quem fez o cadastro da empresa). O dono só muda pelo suporte (CA-B44-43, CA-B44-44) |

## Cenários

### Happy Path
1. O Admin abre Configurações → Usuários. Em "Editar papel" e em "Adicionar usuário", o campo Papel oferece Admin, Gerente e Atendente.
2. Ao salvar, o servidor confere o papel (um dos três), que a pessoa é da empresa do Admin e que não é o dono, e grava.
3. Em "Gerenciar times", o servidor confere que o usuário e cada time marcado são da empresa do Admin e só então troca os vínculos.

### Edge Cases
- O dono da empresa é o Admin que criou a empresa no `/cadastro` (`workspaces.dono_id`). Nas empresas que já existem, é o Admin mais antigo (SUP-B44-09).
- O próprio dono continua sem poder mudar o próprio papel nem se desativar (regra de hoje, "Você não pode alterar o próprio papel").
- Lista de times vazia em "Gerenciar times" tira o usuário de todos os times da empresa, como hoje.
- Cadastrar usuário com time de outra empresa é recusado antes de criar o login.

### Cenário de Erro
- Papel fora dos três: "Papel inválido".
- Usuário ou time de outra empresa em "Gerenciar times": "Usuário ou time não encontrado nesta empresa." e nada muda.
- Rebaixar ou desativar o dono: "O dono da empresa não pode ser alterado".

## Prova

| Critério | Prova | Onde | O que confere |
|---|---|---|---|
| CA-B44-05 | automática | `src/test/equipe-da-propria-empresa.integration.test.ts` | Admin de A pedindo para pôr o usuário de B num time de A ou de B recebe recusa, e os vínculos de B ficam iguais |
| CA-B44-06 | automática | `src/test/equipe-da-propria-empresa.integration.test.ts` | Admin de A pedindo para pôr usuário de A num time de B recebe recusa, e nenhum vínculo novo aparece |
| CA-B44-07 | automática | `src/test/equipe-da-propria-empresa.integration.test.ts` | depois de marcar o time novo e desmarcar o antigo, o usuário está só no time novo |
| CA-B44-08 | automática | `src/test/equipe-da-propria-empresa.integration.test.ts` | o Gerente promovido aparece como Admin na lista e consegue usar uma ação só de Admin (gerenciar times) |
| CA-B44-09 | automática | `src/test/equipe-da-propria-empresa.integration.test.ts` | usuário cadastrado com papel Admin aparece na lista como Admin da empresa A |
| CA-B44-10 | automática | `src/test/equipe-da-propria-empresa.integration.test.ts` | papel "dono" na edição e no cadastro é recusado com aviso e nada muda |
| CA-B44-43 | automática | `src/test/equipe-da-propria-empresa.integration.test.ts` | segundo Admin tentando rebaixar ou desativar o dono recebe "O dono da empresa não pode ser alterado" e o dono continua Admin e ativo |
| CA-B44-44 | automática | `src/test/equipe-da-propria-empresa.integration.test.ts` | o dono rebaixa o segundo Admin para Gerente e depois o desativa; a lista mostra Gerente e depois inativo |

## Banco de Dados

- Tabela: `workspaces`
  - `dono_id` (uuid, referência a `profiles.id`, nulo se o perfil sumir) — o Admin que criou a empresa. Preenchido para as empresas que já existem com o Admin mais antigo. A tabela só tem política de leitura, então nenhum Admin troca o dono pelo navegador.
- Função `cadastrar_empresa`: passa a gravar `dono_id` com o Admin criado.

## Arquivos

- **Criar:** `supabase/migrations/20261027000002_dono_da_empresa.sql` — coluna `dono_id`, preenchimento das empresas que já existem e `cadastrar_empresa` gravando o dono
- **Criar:** `src/test/equipe-da-propria-empresa.integration.test.ts` — CA-B44-05 a 10, 43 e 44 no Supabase real
- **Modificar:** `src/app/(auth)/configuracoes/usuarios/actions.ts` — papel Admin aceito e conferido em tempo de execução em `editarPapel` e `adicionarUsuario`; dono protegido em `editarPapel` e `desativarUsuario`; `gerenciarTimes` e `adicionarUsuario` conferem usuário e times da empresa
- **Modificar:** `src/app/(auth)/configuracoes/usuarios/acoes-usuario.tsx` — opção Admin em "Editar papel"
- **Modificar:** `src/app/(auth)/configuracoes/usuarios/adicionar-usuario-dialog.tsx` — opção Admin no cadastro

Reaproveita o padrão de `src/test/usuarios.integration.test.ts` (cliente SSR trocado pelo navegador logado).

## Checklist

- [x] Migration do dono da empresa
- [x] `editarPapel`: aceita admin, gerente e atendente conferidos no servidor; recusa o dono
- [x] `desativarUsuario`: recusa o dono
- [x] `adicionarUsuario`: aceita admin; recusa time de outra empresa
- [x] `gerenciarTimes`: confere usuário e times da empresa antes de gravar
- [x] Opção Admin na edição de papel e no cadastro
- [x] Testes do CA-B44-05 a 10, 43 e 44
- [x] `db push` (só a migration desta issue) e testes de integração rodando
