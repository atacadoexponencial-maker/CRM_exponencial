# B44-11: Funções do banco fechadas ao público e cadastro público desligado

**Tipo:** Implementação
**Página:** Banco de dados; painel do Supabase
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-seguranca-rodada-4.md`

## Descrição

As funções de recalcular classificação e de conferir lixeira deixam de responder a quem chama de fora do CRM, e o cadastro público do Supabase Auth é conferido como desligado no painel.

## Pronto quando

Um visitante sem login ou um usuário de outra empresa não consegue usar essas funções nem descobrir se um contato de outra empresa está na lixeira; a lixeira e a classificação continuam funcionando nas telas; o painel mostra o cadastro público desligado e `/cadastro` continua criando empresas.

## Critérios de aceite

- **CA-B44-39** (automática) — Visitante sem login não chama as funções. Dado um visitante com a chave pública e sem login, quando ele chama a função de recalcular classificação ou as de conferir lixeira, então o banco recusa
- **CA-B44-40** (automática) — Usuário de outra empresa não descobre se um contato está na lixeira. Dado um contato da empresa B na lixeira e um usuário logado da empresa A que sabe o código desse contato, quando ele chama direto a função que confere lixeira, ou a de recalcular a classificação, com esse código, então o banco recusa ou não responde nada sobre o contato de B, e a classificação dele fica igual
- **CA-B44-41** (automática) — Lixeira e classificação continuam funcionando nas telas. Dado a empresa A com um contato na lixeira e um card que muda a classificação de outro contato, quando o Gerente abre a lixeira, restaura o contato e move o card, então a lixeira mostra e restaura o contato, e a classificação muda, como hoje
- **CA-B44-42** (manual) — Cadastro público desligado no Supabase Auth. Dado o painel do Supabase do projeto, quando a Marcelle (ou o Luan) abre as configurações de Auth, então "Allow new users to sign up" está desligado, e uma empresa nova ainda consegue se cadastrar pela tela `/cadastro` do CRM

## Suposições

Nenhuma.

## Perguntas em aberto

Nenhuma.

## Cenários

### Happy Path
1. O chat, a lixeira e a classificação do contato continuam funcionando como hoje: as políticas que usam as funções da lixeira rodam para o usuário logado, e a classificação é recalculada pelo gatilho do banco.
2. Quem chama as funções de fora deixa de conseguir: o visitante sem login não chama nenhuma das três; o usuário logado não chama mais a de recalcular classificação, e as da lixeira só respondem sobre contatos e conversas da empresa dele.

### Edge Cases
- As automações chamam `contato_na_lixeira` com a chave de serviço: continuam recebendo a resposta de verdade.
- Usuário logado perguntando por contato de outra empresa: a resposta é "não está na lixeira", sem dizer se o contato existe.
- Usuário desativado: `get_auth_user_workspace_id()` já devolve nulo, e as funções respondem "não".

### Cenário de Erro
- Visitante sem login chamando qualquer das três, ou usuário logado chamando a de recalcular: o banco recusa por falta de permissão.

## Prova

| Critério | Prova | Onde | O que confere |
|---|---|---|---|
| CA-B44-39 | automática | `src/test/funcoes-do-banco-fechadas.integration.test.ts` | visitante com a chave pública e sem login recebe recusa ao chamar as três funções |
| CA-B44-40 | automática | `src/test/funcoes-do-banco-fechadas.integration.test.ts` | usuário logado de A não descobre que o contato de B está na lixeira (resposta "não") e não consegue recalcular a classificação dele, que fica igual |
| CA-B44-41 | automática | `src/test/funcoes-do-banco-fechadas.integration.test.ts` | o Gerente de A vê o contato na lixeira, restaura, volta a ver a conversa dele, e mover o card muda a classificação |
| CA-B44-42 | manual | roteiro abaixo | cadastro público desligado no painel do Supabase Auth e `/cadastro` ainda criando empresa |

### Roteiro manual — CA-B44-42
1. No painel do Supabase do projeto, abra **Authentication → Sign In / Providers** (ou **Settings**, conforme a versão do painel).
2. Confira que **Allow new users to sign up** está **desligado**. Se estiver ligado, desligue e salve.
3. Abra `https://crm-exponencial.vercel.app/cadastro` numa janela anônima e cadastre uma empresa de teste com nome começando por `[TESTE]` e um e-mail seu.
4. Deve entrar no CRM normalmente: o cadastro do CRM cria o usuário pela chave de serviço, que não depende dessa opção.
5. Depois, apague essa empresa de teste (ou peça para eu apagar).

## Banco de Dados

- `recalcular_classificacao_do_contato(uuid)`: revoke de `anon` e `authenticated` (fica para o gatilho e a chave de serviço).
- `contato_na_lixeira(uuid)` e `conversa_na_lixeira(uuid)`: revoke de `public` e `anon`; o corpo passa a exigir que o contato (ou a conversa) seja da empresa de quem chama, salvo a chave de serviço.

## Arquivos

- **Criar:** `supabase/migrations/20261027000006_funcoes_do_banco_fechadas.sql` — revokes e as duas funções da lixeira presas à empresa
- **Criar:** `src/test/funcoes-do-banco-fechadas.integration.test.ts` — CA-B44-39 a 41 no Supabase real

## Checklist

- [x] Migration das três funções
- [x] Testes do CA-B44-39 a 41
