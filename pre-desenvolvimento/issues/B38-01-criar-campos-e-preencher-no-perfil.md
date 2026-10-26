# B38-01: Criar campos personalizados e preenchê-los no perfil do contato

**Tipo:** Implementação
**Página:** Configurações → Campos personalizados; Contatos → perfil do contato
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-campos-personalizados.md`

## Descrição

Admin e Gerente criam, renomeiam e ordenam os campos da empresa nos onze tipos, com as opções das listas, e o perfil do contato ganha o bloco "Campos personalizados", onde Admin, Gerente e o atendente do contato preenchem os valores, conferidos pelo tipo.

## Pronto quando

Em Configurações → Campos personalizados dá para criar o campo "Porte" (Lista de opções) e o "CNPJ" (Texto), e no perfil de um contato dá para preencher os dois e ver os valores no formato de cada tipo. O atendente preenche só os contatos que atende; outra empresa não vê nada.

## Critérios de aceite

- **CA-B38-01** (automática) — Admin cria um campo de texto. Dado um Admin em Configurações → Campos personalizados, sem nenhum campo criado, quando ele cria o campo "CNPJ" do tipo Texto, então o campo aparece na lista com o tipo "Texto" e "0 contatos preenchidos"
- **CA-B38-02** (automática) — Gerente também cria e edita campos. Dado um Gerente na mesma tela, quando ele cria o campo "Instagram" do tipo Link e depois o renomeia para "Instagram da loja", então o campo aparece na lista com o nome novo
- **CA-B38-03** (automática) — Atendente não gerencia campos. Dado um Atendente, quando ele abre o menu de Configurações ou entra direto no endereço da tela de campos, então a opção "Campos personalizados" não aparece no menu, o endereço o leva de volta, e o servidor recusa criar, editar, ordenar ou apagar campo pedido em nome dele
- **CA-B38-04** (automática) — Os onze tipos podem ser criados. Dado um Admin na tela de campos, quando ele abre a escolha de tipo, então aparecem Texto, Texto longo, Número, Dinheiro, Data, Lista de opções, Múltipla escolha, Sim/não, Link, E-mail e Telefone, e um campo de cada tipo pode ser criado
- **CA-B38-05** (automática) — Lista de opções exige ao menos uma opção. Dado um Admin criando um campo do tipo Lista de opções ou Múltipla escolha, quando ele tenta salvar sem nenhuma opção, ou com duas opções de mesmo nome, então a tela avisa o problema e o campo não é criado
- **CA-B38-06** (automática) — Nome de campo não se repete. Dado a empresa já tem o campo "CNPJ", quando alguém tenta criar ou renomear outro campo para "cnpj" ou "CNPJ " (mesmo nome, com outra caixa ou espaço), então a tela avisa que já existe um campo com esse nome e nada é salvo
- **CA-B38-07** (automática) — Nome de campo não pode ser o de um dado fixo. Dado um Admin criando um campo, quando ele dá ao campo o nome de um dado fixo do contato, como "Cidade" ou "Telefone", então a tela avisa que esse nome já é de um dado do sistema e o campo não é criado
- **CA-B38-08** (automática) — Tipo não muda depois de criado. Dado o campo "Quantidade de lojas", do tipo Número, quando o Admin abre o editor do campo, então o tipo aparece só para leitura, e um pedido ao servidor para mudar o tipo é recusado
- **CA-B38-09** (automática) — Editar as opções da lista. Dado o campo "Porte", Lista de opções com "Pequeno", "Médio" e "Grande", quando o Gerente acrescenta "Rede", renomeia "Médio" para "Médio porte" e põe "Grande" em primeiro, então o campo passa a oferecer "Grande", "Pequeno", "Médio porte" e "Rede", nessa ordem, e o contato que tinha "Médio" passa a mostrar "Médio porte"
- **CA-B38-15** (automática) — Tela de campos sem nenhum campo. Dado uma empresa sem campos personalizados, quando o Admin abre a tela, então a tela explica para que servem os campos e mostra o botão "Criar campo"
- **CA-B38-16** (manual) — Aprovação visual da tela de campos. Dado a tela de campos com campos de vários tipos, quando a Marcelle a abre no computador e no celular, nos temas claro e escuro, então ela aprova a lista, o editor, as opções e os avisos no estilo Caderno, sem nada desalinhado, cortado ou ilegível
- **CA-B38-17** (automática) — Perfil mostra os campos na ordem da empresa. Dado a empresa com os campos "CNPJ", "Porte" e "Instagram da loja", e um contato com CNPJ e Porte preenchidos, quando alguém abre o perfil do contato, então o bloco "Campos personalizados" mostra os três, nessa ordem, com os dois valores e "—" no Instagram
- **CA-B38-18** (automática) — Admin e Gerente preenchem qualquer contato. Dado um Gerente no perfil de um contato que não é da carteira dele, quando ele preenche "Porte" com "Grande" e salva, então o perfil mostra "Grande", e o valor está lá ao recarregar a página
- **CA-B38-19** (automática) — Atendente preenche os campos dos contatos que atende. Dado um Atendente no perfil de um contato que ele atende, quando ele preenche "CNPJ" e salva, então o valor fica salvo, e os dados fixos (tipo, cidade, UF e os demais) continuam sem botão de editar para ele
- **CA-B38-20** (automática) — Atendente não preenche contato de outro. Dado um contato que o Atendente não atende, quando chega ao servidor um pedido de alteração de campo personalizado em nome desse Atendente, então o servidor recusa e o valor não muda
- **CA-B38-21** (automática) — Cada tipo confere o formato. Dado um Admin editando os campos de um contato, quando ele digita "abc" em Número, "12,345" em Dinheiro, "fulano@" em E-mail, "não é link" em Link ou "123" em Telefone, então a tela aponta o campo com o problema e não salva; o servidor também recusa esses valores se chegarem sem passar pela tela
- **CA-B38-22** (automática) — Valores aparecem no formato de cada tipo. Dado um contato com Dinheiro 1500,5, Data 03/04/2026, Sim/não marcado como sim, Múltipla escolha com "Jeans" e "Malha", e um Link, quando alguém abre o perfil, então aparece "R$ 1.500,50", "03/04/2026", "Sim", "Jeans, Malha" e o link clicável, que abre em outra aba
- **CA-B38-23** (automática) — Apagar o valor de um campo. Dado um contato com "Porte" igual a "Grande", quando o Admin apaga o valor e salva, então o perfil mostra "—" no Porte
- **CA-B38-24** (automática) — Empresa sem campos não mostra o bloco. Dado uma empresa sem campos personalizados, quando alguém abre o perfil de um contato, então o bloco "Campos personalizados" não aparece
- **CA-B38-25** (manual) — Aprovação visual do bloco no perfil. Dado um contato com campos de todos os tipos, alguns vazios, quando a Marcelle abre o perfil no computador e no celular, nos temas claro e escuro, e edita os campos, então ela aprova o bloco e a edição, sem nada desalinhado, cortado ou ilegível

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B38-01 | "Contato que o atendente atende" é o contato que o atendente já consegue ver hoje (carteira dele ou conversa atribuída a ele). A regra de quem ele vê não muda. | confirmada | Marcelle, 26/10/2026. |
| SUP-B38-05 | Sim/não tem três estados: sim, não e vazio (nunca preenchido). No filtro, "é não" não traz o vazio. | confirmada | Marcelle, 26/10/2026. |
| SUP-B38-06 | Limite de 50 campos por empresa e de 50 opções por lista; o nome do campo e da opção tem até 40 letras. | confirmada | Marcelle, 26/10/2026. |
| SUP-B38-07 | Telefone extra aceita número brasileiro com DDD (10 ou 11 dígitos) ou internacional começando com "+"; é guardado só com os dígitos e mostrado formatado. | confirmada | Marcelle, 26/10/2026. |
| SUP-B38-08 | Link aceita endereço com ou sem "https://"; sem, o sistema completa com "https://". | confirmada | Marcelle, 26/10/2026. |
| SUP-B38-09 | Contato que vai para a lixeira guarda os valores e os recupera ao ser restaurado. | confirmada | Marcelle, 26/10/2026. |
| SUP-B38-11 | Mudança em campo personalizado feita pelo atendente não aparece em nenhum histórico além do histórico de automações (quando dispara uma); não há registro de "quem mudou o quê" nesta série. | confirmada | Marcelle, 26/10/2026. |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| PER-B38-01 | Que tipos de campo a empresa pode criar? | respondida | Texto, Texto longo, Número, Dinheiro, Data, Lista de opções, Múltipla escolha, Sim/não, Link, E-mail e Telefone (os quatro primeiros pedidos mais os comuns em HubSpot, Pipedrive e Kommo). Marcelle, 26/10/2026. |
| PER-B38-02 | Quem cria, edita e apaga os campos? | respondida | Admin e Gerente. Marcelle, 26/10/2026. |
| PER-B38-04 | Campo pode ser obrigatório? | respondida | Não, todos são opcionais. Marcelle, 26/10/2026. |
| PER-B38-06 | O tipo pode mudar depois de criado? | respondida | Não. Marcelle, 26/10/2026. |
| PER-B38-08 | O atendente pode preencher os campos? | respondida | Sim, nos contatos que ele atende; os dados fixos continuam só com Admin e Gerente. Marcelle, 26/10/2026. |

## Cenários

### Happy Path
1. O Admin abre Configurações → Campos personalizados (`/configuracoes/campos`). Sem campos, a tela explica para que servem e mostra "Criar campo".
2. Ele cria "Porte" (Lista de opções: Pequeno, Médio, Grande) e "CNPJ" (Texto). A lista mostra nome, tipo e "0 contatos preenchidos", na ordem de criação.
3. No perfil de um contato, o bloco "Campos personalizados" aparece abaixo de "Dados do contato", com "—" nos dois campos.
4. Ele clica em "Editar" no bloco, escolhe "Grande" e digita o CNPJ; salva. O bloco mostra os valores, e a lista de campos passa a dizer "1 contato preenchido".
5. O Atendente abre o perfil de um contato que atende e preenche o CNPJ do mesmo jeito; o bloco "Dados do contato" continua sem "Editar" para ele.

### Edge Cases
- Nome repetido com outra caixa ou espaço ("cnpj", "CNPJ "): recusado.
- Nome de dado fixo ("Cidade", "telefone", "Classificacao" sem acento): recusado.
- Lista sem opção ou com opção repetida: recusada; limite de 50 campos e 50 opções; nome até 40 letras.
- Renomear opção: quem já tinha a opção passa a ver o nome novo (o valor guarda o id da opção).
- Mudar a ordem das opções: a lista de escolha e o "Jeans, Malha" da Múltipla escolha seguem a ordem nova.
- Valor vazio: apagar o valor tira a linha do contato, e o bloco mostra "—".
- Link sem "https://" ganha o prefixo; telefone guardado só com dígitos (internacional com "+").
- Contato na lixeira guarda os valores; restaurado, eles voltam (nada a fazer: a linha não é apagada).

### Cenário de Erro
- Valor fora do formato: o campo fica marcado com a mensagem ("Digite um número", "E-mail inválido"...) e nada é salvo; o servidor devolve os mesmos erros se o pedido chegar sem passar pela tela.
- Atendente pedindo para gravar em contato que não atende: o servidor responde "Contato não encontrado" e o banco recusa (RLS).
- Atendente chamando as ações de gerenciar campos: "Sem permissão"; entrando no endereço da tela: volta para `/perfil?motivo=sem-permissao`.
- Mudar o tipo direto no banco: o gatilho recusa ("O tipo do campo não muda").
- Falha ao salvar: a mensagem "Não foi possível salvar" aparece e a edição continua aberta.

## Prova

| Critério | Prova | Onde | O que confere |
|---|---|---|---|
| CA-B38-01 | automática | `src/test/campos-personalizados.integration.test.ts` | O campo "CNPJ" (Texto) criado pelo Admin volta na lista com tipo Texto e 0 preenchidos |
| CA-B38-02 | automática | `src/test/campos-personalizados.integration.test.ts` | O Gerente cria "Instagram" (Link) e o renomeia; a lista traz "Instagram da loja" |
| CA-B38-03 | automática | `src/test/campos-personalizados-tela.test.tsx` | O menu do Atendente não tem "Campos personalizados", a página o redireciona e as ações de gerenciar devolvem "Sem permissão" |
| CA-B38-04 | automática | `src/test/campos-personalizados.integration.test.ts` | A escolha de tipo oferece os onze tipos, na ordem da spec, e um campo de cada tipo é criado |
| CA-B38-05 | automática | `src/test/campos-personalizados.integration.test.ts` | Lista e Múltipla escolha sem opção ou com opção repetida são recusadas com aviso e nada é criado |
| CA-B38-06 | automática | `src/test/campos-personalizados.integration.test.ts` | Criar ou renomear para "cnpj" ou "CNPJ " é recusado com "Já existe um campo com esse nome" |
| CA-B38-07 | automática | `src/test/campos-personalizados.integration.test.ts` | "Cidade" e "Telefone" são recusados com o aviso de nome de dado do sistema |
| CA-B38-08 | automática | `src/test/campos-personalizados.integration.test.ts` | O editor de tela mostra o tipo só para leitura (teste de tela) e o update direto do tipo no banco é recusado |
| CA-B38-09 | automática | `src/test/campos-personalizados.integration.test.ts` | Depois de acrescentar, renomear e mover, o campo oferece Grande, Pequeno, Médio porte, Rede, e o contato com "Médio" mostra "Médio porte" |
| CA-B38-15 | automática | `src/test/campos-personalizados-tela.test.tsx` | Sem campos, a tela mostra o texto explicativo e o botão "Criar campo" |
| CA-B38-16 | manual | roteiro abaixo | Tela de campos aprovada no computador e no celular, claro e escuro |
| CA-B38-17 | automática | `src/test/campos-personalizados-tela.test.tsx` | O bloco mostra CNPJ, Porte e Instagram da loja nessa ordem, com os valores e "—" no vazio |
| CA-B38-18 | automática | `src/test/campos-personalizados.integration.test.ts` | O Gerente grava Porte "Grande" num contato fora da carteira dele, e a leitura seguinte traz "Grande" |
| CA-B38-19 | automática | `src/test/campos-personalizados.integration.test.ts` | O Atendente grava o CNPJ de um contato que atende; na tela, o perfil não oferece editar os dados fixos a ele |
| CA-B38-20 | automática | `src/test/campos-personalizados.integration.test.ts` | O pedido do Atendente para contato que ele não atende é recusado e o valor continua o mesmo |
| CA-B38-21 | automática | `src/test/campos-personalizados-tela.test.tsx` | A tela aponta cada valor fora do formato e não chama o servidor; o servidor recusa os mesmos valores (teste de integração) |
| CA-B38-22 | automática | `src/test/campos-personalizados-tela.test.tsx` | O bloco mostra "R$ 1.500,50", "03/04/2026", "Sim", "Jeans, Malha" e o link com `target="_blank"` |
| CA-B38-23 | automática | `src/test/campos-personalizados.integration.test.ts` | Gravar o Porte vazio apaga o valor, e a leitura seguinte traz o campo sem valor |
| CA-B38-24 | automática | `src/test/campos-personalizados-tela.test.tsx` | Sem campos na empresa, o perfil não mostra o bloco "Campos personalizados" |
| CA-B38-25 | manual | roteiro abaixo | Bloco do perfil aprovado no computador e no celular, claro e escuro |

### Roteiro manual — CA-B38-16
1. Entre como Admin na "[TESTE] Automações B11" e abra Configurações → Campos personalizados.
2. Sem campos, confira o texto explicativo e o botão "Criar campo".
3. Crie "CNPJ" (Texto), "Porte" (Lista de opções: Pequeno, Médio, Grande), "Linhas" (Múltipla escolha: Jeans, Malha) e "Limite de crédito" (Dinheiro). Edite o Porte: acrescente "Rede", renomeie "Médio" e suba "Grande".
4. Tente criar "cnpj" e "Cidade": os avisos aparecem.
5. Repita no celular e troque para o tema escuro. Aprove se nada ficar desalinhado, cortado ou ilegível.

### Roteiro manual — CA-B38-25
1. Com os campos do roteiro anterior, abra o perfil de um contato da empresa de teste.
2. Clique em "Editar" no bloco "Campos personalizados", preencha todos e salve; depois apague um valor.
3. Tente salvar "abc" no Limite de crédito: a mensagem aparece no campo.
4. Repita no celular e no tema escuro. Aprove se nada ficar desalinhado, cortado ou ilegível.

## Banco de Dados

Migration `supabase/migrations/20261026000001_campos_personalizados.sql`:

- Tabela `campos_personalizados` — os campos da empresa
  - `id` (uuid), `workspace_id` (uuid), `nome` (text, 1 a 40, único por empresa sem caixa nem espaço), `tipo` (text: texto, texto_longo, numero, dinheiro, data, lista, multipla, sim_nao, link, email, telefone), `ordem` (int), `created_at`
  - Gatilhos: limite de 50 por empresa; o tipo não muda depois de criado
- Tabela `campo_opcoes` — opções de Lista e Múltipla escolha
  - `id` (uuid), `campo_id` (uuid), `workspace_id` (uuid), `nome` (text, 1 a 40, único no campo), `ordem` (int), `created_at`
  - Gatilhos: só em campo de lista ou múltipla, da mesma empresa; limite de 50 por campo
- Tabela `contato_campos` — o valor de cada campo em cada contato (só existe linha com valor)
  - `contact_id`, `campo_id`, `workspace_id` (uuid), `valor_texto` (text: texto, texto longo, link, e-mail, telefone), `valor_numero` (numeric: número, dinheiro), `valor_data` (date), `valor_booleano` (boolean), `valor_opcoes` (uuid[]: lista e múltipla), `atualizado_em`; chave (`contact_id`, `campo_id`)
  - Gatilho: contato, campo e linha da mesma empresa
- RLS: campos e opções — membros da empresa leem, Admin e Gerente gravam. Valores — leem e gravam os membros da empresa que veem o contato (`pode_ver_contato`, a regra do atendente de hoje).
- Depois da migration: `npx supabase db push --linked` e gerar os tipos de novo.

## Arquivos

- **Criar:** `supabase/migrations/20261026000001_campos_personalizados.sql` — tabelas, gatilhos e RLS
- **Modificar:** `src/integrations/supabase/types.ts` — gerado de novo depois do db push
- **Criar:** `src/lib/campos-personalizados.ts` — tipos de campo, limites, nomes de dado do sistema, conferir e formatar valor por tipo (reusa `chaveDoNome` e `NOME_MAXIMO` de `src/lib/funis.ts`, rótulos de `src/lib/filtro-contatos.ts`)
- **Criar:** `src/app/(auth)/configuracoes/campos/actions.ts` — listar, criar e renomear campo; acrescentar, renomear e mover opção (padrão de `configuracoes/funis/actions.ts`)
- **Criar:** `src/app/(auth)/configuracoes/campos/page.tsx` — página só de Admin e Gerente
- **Criar:** `src/app/(auth)/configuracoes/campos/campos-client.tsx` — lista, criar e editar campo (estilo de `funis-client.tsx`)
- **Modificar:** `src/components/shared/sidebar-nav.tsx` — item "Campos personalizados", para Admin e Gerente
- **Criar:** `src/app/(auth)/contatos/campos-personalizados.ts` — actions `camposDoContato` e `salvarCamposDoContato`, com a sessão (RLS)
- **Criar:** `src/components/shared/entrada-campo-personalizado.tsx` — o controle de entrada de cada tipo
- **Criar:** `src/app/(auth)/contatos/[id]/components/campos-personalizados-contato.tsx` — bloco do perfil: ver, editar, salvar, link, e-mail e copiar telefone
- **Modificar:** `src/app/(auth)/contatos/[id]/page.tsx` — busca os campos do contato junto com os dados
- **Modificar:** `src/app/(auth)/contatos/[id]/components/perfil-contato.tsx` — mostra o bloco abaixo de "Dados do contato"
- **Criar:** `src/test/campos-personalizados.integration.test.ts` — critérios contra o Supabase real
- **Criar:** `src/test/campos-personalizados-tela.test.tsx` — critérios de tela, com as actions mockadas
- **Modificar:** `src/test/menu-lateral.test.tsx` — a lista esperada do menu ganha "Campos personalizados" para Admin e Gerente

## Checklist

- [x] Migration com as três tabelas, gatilhos e RLS
- [x] `npx supabase db push --linked` e tipos gerados de novo
- [x] `src/lib/campos-personalizados.ts`
- [x] Actions de gerenciar campos e opções
- [x] Página e tela de campos: vazio, criar, renomear, opções, tipo só para leitura
- [x] Item no menu lateral
- [x] Actions de ler e gravar os valores do contato
- [x] Controle de entrada por tipo
- [x] Bloco no perfil do contato
- [x] Testes da tabela Prova
- [x] `npx tsc --noEmit` no projeto inteiro
