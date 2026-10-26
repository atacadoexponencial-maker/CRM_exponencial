# B38-02: Campos personalizados no Chat, no cadastro de novo contato e na lista de Contatos

**Tipo:** Implementação
**Página:** Chat → painel do contato; Contatos → Novo contato e lista
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-campos-personalizados.md`

## Descrição

Os campos aparecem e são editados no painel do contato do Chat, entram no formulário de Novo contato e, quando marcados com "Mostrar na lista de Contatos", viram colunas da lista, sempre na ordem da empresa.

## Pronto quando

O atendente preenche o Porte sem sair da conversa, o Admin cadastra um contato já com CNPJ e Porte, e a lista de Contatos mostra a coluna dos campos marcados.

## Critérios de aceite

- **CA-B38-11** (automática) — Mudar a ordem dos campos. Dado os campos "CNPJ", "Porte" e "Instagram da loja", nessa ordem, quando o Admin sobe "Instagram da loja" duas vezes, então a ordem passa a ser "Instagram da loja", "CNPJ", "Porte" na tela de campos, no perfil do contato, no painel do Chat e no cadastro de novo contato
- **CA-B38-26** (automática) — Painel do Chat mostra e edita os campos. Dado uma conversa aberta com um contato que tem "CNPJ" preenchido, quando o Atendente da conversa abre o painel do contato, edita "Porte" para "Pequeno" e salva, então o painel mostra o CNPJ e o Porte "Pequeno", e o perfil do contato mostra o mesmo Porte
- **CA-B38-27** (manual) — Aprovação visual do painel do Chat. Dado uma conversa com um contato que tem campos de vários tipos, quando a Marcelle abre o painel do contato no computador e no celular, nos temas claro e escuro, então ela aprova a seção, sem nada desalinhado, cortado ou ilegível
- **CA-B38-28** (automática) — Cadastro com campos personalizados. Dado o Admin no formulário de Novo contato, numa empresa com os campos "CNPJ" e "Porte", quando ele preenche nome, telefone, CNPJ e Porte e salva, então o contato é criado e o perfil dele mostra o CNPJ e o Porte
- **CA-B38-29** (automática) — Campos personalizados não são obrigatórios. Dado o mesmo formulário, quando o Admin preenche só nome e telefone e salva, então o contato é criado, com os campos personalizados vazios
- **CA-B38-30** (automática) — Valor fora do formato no cadastro. Dado o formulário de Novo contato com o campo "E-mail do financeiro", quando o Admin digita "fulano@" e tenta salvar, então a tela aponta o campo e o contato não é criado
- **CA-B38-47** (automática) — Marcar o campo para aparecer na lista. Dado os campos "CNPJ" e "Porte", só o "Porte" com "Mostrar na lista de Contatos" marcado, quando qualquer pessoa da empresa abre Contatos, então a lista tem a coluna "Porte" e não tem a coluna "CNPJ"; ao marcar também o CNPJ, a coluna "CNPJ" aparece para todos
- **CA-B38-58** (automática) — Coluna mostra o valor no formato do tipo. Dado o campo "Limite de crédito" (Dinheiro) marcado para a lista, e um contato com 1500, quando alguém abre Contatos, então a coluna "Limite de crédito" mostra "R$ 1.500,00" nesse contato e "—" em quem não tem valor
- **CA-B38-59** (manual) — Aprovação visual das colunas. Dado a lista de Contatos com três campos marcados, quando a Marcelle a abre no computador e no celular, nos temas claro e escuro, então ela aprova as colunas novas, sem nada desalinhado, cortado ou ilegível

## Suposições

Nenhuma.

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| PER-B38-03 | Além do perfil e do filtro, onde os campos aparecem? | respondida | Painel do contato no Chat, cadastro de novo contato, automações e variáveis na mensagem. Marcelle, 26/10/2026. |
| PER-B38-07 | Em que ordem os campos aparecem? | respondida | Na ordem que a empresa escolhe em Configurações. Marcelle, 26/10/2026. |
| PER-B38-09 | Os campos viram colunas da lista de Contatos? Quem escolhe quais? | respondida | Sim; a empresa marca "Mostrar na lista de Contatos" no campo, e todos veem as mesmas colunas. Marcelle, 26/10/2026. |

## Cenários

### Happy Path
1. Em Configurações → Campos personalizados, o Admin sobe e desce os campos com as setas da lista e marca "Mostrar na lista de Contatos" no editor do campo. A lista de campos mostra o selo "na lista" nos marcados.
2. Em Contatos, a tabela ganha uma coluna por campo marcado, depois de "Cidade", na ordem da empresa, com o valor no formato do tipo e "—" no vazio.
3. Em "Novo contato", os campos aparecem depois dos dados fixos, todos opcionais, na ordem da empresa. O Admin preenche CNPJ e Porte e salva: o contato nasce com os dois valores.
4. No Chat, o painel do contato ganha a seção "Campos personalizados" abaixo do cadastro. O lápis abre o controle do tipo; ✓ salva, × cancela. O Atendente da conversa edita os campos ali.

### Edge Cases
- Número que estava na lixeira: o contato antigo volta (como hoje), e os campos digitados não valem — o aviso já diz que os dados antigos voltaram.
- Empresa sem campos: o formulário, a tabela e o painel ficam como hoje.
- Atendente que não vê o contato da conversa: a seção não aparece.
- Campo marcado depois: a coluna aparece no próximo carregamento da lista, para todos.

### Cenário de Erro
- Valor fora do formato no cadastro: a tela aponta o campo e não chama o servidor; o servidor também recusa e não cria o contato.
- Falha ao salvar no Chat: o campo continua aberto com "Não foi possível salvar".

## Prova

| Critério | Prova | Onde | O que confere |
|---|---|---|---|
| CA-B38-11 | automática | `src/test/campos-personalizados.integration.test.ts` | Depois de subir "Instagram da loja" duas vezes, a tela de campos, o perfil (e o Chat, que usa a mesma leitura) e o cadastro trazem Instagram da loja, CNPJ, Porte |
| CA-B38-26 | automática | `src/test/campos-personalizados-chat-cadastro-lista.test.tsx` | O painel do Chat mostra o CNPJ, edita o Porte para "Pequeno" e mostra "Pequeno"; no teste de integração, o Atendente da conversa grava e o perfil lê "Pequeno" |
| CA-B38-27 | manual | roteiro abaixo | Seção do Chat aprovada no computador e no celular, claro e escuro |
| CA-B38-28 | automática | `src/test/campos-personalizados.integration.test.ts` | `criarContato` com CNPJ e Porte cria o contato, e `camposDoContato` traz os dois; na tela, o formulário manda os campos preenchidos |
| CA-B38-29 | automática | `src/test/campos-personalizados.integration.test.ts` | `criarContato` só com nome e telefone cria o contato com os campos vazios |
| CA-B38-30 | automática | `src/test/campos-personalizados-chat-cadastro-lista.test.tsx` | A tela aponta o e-mail e não chama `criarContato`; no teste de integração, o servidor devolve o erro e nenhum contato é criado |
| CA-B38-47 | automática | `src/test/campos-personalizados.integration.test.ts` | Só o Porte marcado volta com valor na lista do servidor; marcado o CNPJ, ele também volta, para o Atendente; na tela, a tabela tem a coluna Porte e não a CNPJ |
| CA-B38-58 | automática | `src/test/campos-personalizados-chat-cadastro-lista.test.tsx` | A coluna "Limite de crédito" mostra "R$ 1.500,00" num contato e "—" no outro |
| CA-B38-59 | manual | roteiro abaixo | Colunas aprovadas no computador e no celular, claro e escuro |

### Roteiro manual — CA-B38-27
1. Na empresa de teste, com campos de vários tipos, abra uma conversa no Chat e o painel do contato.
2. Confira a seção "Campos personalizados" abaixo do cadastro; edite um campo de cada tipo pelo lápis.
3. Repita no celular e no tema escuro. Aprove se nada ficar desalinhado, cortado ou ilegível.

### Roteiro manual — CA-B38-59
1. Marque três campos com "Mostrar na lista de Contatos" e abra Contatos.
2. Confira as três colunas depois de "Cidade", com os valores formatados e "—" no vazio.
3. Repita no celular (a tabela rola de lado) e no tema escuro. Aprove se nada ficar desalinhado, cortado ou ilegível.

## Banco de Dados

Migration `supabase/migrations/20261026000002_campos_na_lista.sql`:
- Tabela `campos_personalizados`: nova coluna `mostrar_na_lista` (boolean, padrão falso) — o campo vira coluna da lista de Contatos.

## Arquivos

- **Criar:** `supabase/migrations/20261026000002_campos_na_lista.sql` — coluna `mostrar_na_lista`
- **Modificar:** `src/integrations/supabase/types.ts` — gerado de novo
- **Criar:** `src/lib/campos-personalizados-servidor.ts` — leitura dos campos da empresa, conferência de várias entradas e gravação dos valores, usadas pelas actions do contato e pelo cadastro
- **Modificar:** `src/lib/campos-personalizados.ts` — tipo `CampoDaEmpresa` (campo com `mostrarNaLista`)
- **Modificar:** `src/app/(auth)/contatos/campos-personalizados.ts` — passa a usar o módulo do servidor; nova action `listarCamposDaEmpresa`
- **Modificar:** `src/app/(auth)/configuracoes/campos/actions.ts` — `moverCampo`, `marcarNaLista` e `mostrarNaLista` na listagem
- **Modificar:** `src/app/(auth)/configuracoes/campos/campos-client.tsx` — setas de ordem na lista, selo "na lista" e a marca no editor
- **Modificar:** `src/app/(auth)/contatos/actions.ts` — `criarContato` recebe e grava os campos; `filtrarContatos` traz os valores dos campos marcados
- **Modificar:** `src/app/(auth)/contatos/mock-contatos.ts` — `Contato.campos` (valores dos campos da lista)
- **Modificar:** `src/app/(auth)/contatos/page.tsx` — busca os campos da empresa
- **Modificar:** `src/app/(auth)/contatos/components/lista-contatos.tsx` — colunas dos campos marcados; passa os campos ao Novo contato
- **Modificar:** `src/app/(auth)/contatos/components/novo-contato-dialog.tsx` — campos personalizados no formulário
- **Criar:** `src/app/(auth)/chat/components/campos-personalizados-chat.tsx` — seção do painel com edição pelo lápis
- **Modificar:** `src/app/(auth)/chat/components/painel-contato.tsx` — mostra a seção abaixo do cadastro
- **Modificar:** `src/test/campos-personalizados.integration.test.ts` — critérios do servidor desta issue
- **Criar:** `src/test/campos-personalizados-chat-cadastro-lista.test.tsx` — critérios de tela desta issue
- **Modificar:** `src/test/campos-personalizados-tela.test.tsx` — o campo do teste da B38-01 ganha `mostrarNaLista`

## Checklist

- [x] Migration `mostrar_na_lista`, db push e tipos
- [x] Módulo do servidor dos campos e refatoração das actions do contato
- [x] Ordem dos campos e "Mostrar na lista" em Configurações
- [x] Campos no Novo contato (tela e `criarContato`)
- [x] Colunas na lista de Contatos (`filtrarContatos` e tabela)
- [x] Seção no painel do Chat
- [x] Testes da tabela Prova e os que renderizam as telas mexidas
- [x] `npx tsc --noEmit`

## Testes manuais

| Critério | Conferido por | Dia |
|---|---|---|
| CA-B38-27 | Marcelle | 26/10/2026 |
