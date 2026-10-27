# B38-09: Todo campo vira coluna, cada usuário escolhe as colunas, e o editor do campo ganha Salvar

**Tipo:** Implementação
**Página:** Contatos (lista); Configurações → Campos personalizados (editor)
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-campos-personalizados.md` (revisão de 26/10/2026)

## Descrição

Nos testes manuais de 26/10/2026, a Marcelle reprovou o CA-B38-59 ("seria melhor deixar todos automáticos porém com a possibilidade de personalização das colunas") e, no CA-B38-16, pediu um botão Salvar visível no editor do campo. Agora todo campo vira coluna da lista de Contatos. Acima da lista, o botão **Colunas** liga e desliga qualquer coluna, menos o Nome. A escolha é de cada usuário e fica guardada no perfil dele. A marca "Mostrar na lista de Contatos" sai do editor e do banco. O editor do campo ganha no rodapé os botões Cancelar e Salvar, sempre visíveis.

## Pronto quando

Na empresa de teste, todos os campos aparecem como coluna para todos. O Admin esconde o CNPJ e a Cidade, recarrega a página e continua sem elas, enquanto o Atendente ainda vê as duas. Um campo criado depois aparece para os dois. No editor do campo, Salvar grava o nome e as opções e fecha.

## Critérios de aceite

- **CA-B38-47** (automática) — Todo campo vira coluna. Dado os campos "CNPJ" e "Porte", nessa ordem, quando qualquer pessoa da empresa abre Contatos, então a lista tem as colunas "CNPJ" e "Porte", depois de "Cidade", nessa ordem, sem ninguém ter marcado nada
- **CA-B38-65** (automática) — Cada usuário esconde as próprias colunas. Dado o Admin e o Atendente da mesma empresa, com os campos "CNPJ" e "Porte", quando o Admin desliga "CNPJ" e "Cidade" no botão Colunas e abre Contatos de novo, então a lista do Admin não tem as colunas "CNPJ" e "Cidade", e a do Atendente tem; quando o Admin liga "CNPJ" de novo, a coluna volta para ele
- **CA-B38-66** (automática) — Nome fica sempre e campo novo aparece ligado. Dado o Admin com a coluna "CNPJ" desligada, quando ele abre o botão Colunas, e depois cria o campo "Instagram da loja", então o Nome não está entre as colunas que dá para desligar, e a coluna "Instagram da loja" aparece na lista dele sem ele mexer no botão Colunas, com o "CNPJ" ainda escondido
- **CA-B38-67** (automática) — Editor salva pelo botão Salvar. Dado o editor do campo "Porte" aberto, com a opção "Pequeno", quando o Admin muda o nome para "Porte da loja" e a opção para "Pequena" e clica Salvar, então os dois nomes são gravados e o editor fecha; se ele tivesse clicado Cancelar, o editor fecharia e nada seria gravado
- **CA-B38-59** (manual) — Aprovação visual das colunas. Dado a lista de Contatos com três campos, quando a Marcelle a abre no computador e no celular, nos temas claro e escuro, e liga e desliga colunas pelo botão Colunas, então ela aprova as colunas e o botão Colunas, sem nada desalinhado, cortado ou ilegível

## Suposições

Nenhuma.

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| PER-B38-09 | Os campos viram colunas da lista de Contatos? Quem escolhe quais? | respondida | Sim, todos, por padrão. Cada usuário escolhe quais colunas vê, pelo botão Colunas, e pode esconder qualquer uma menos o Nome (CA-B38-47, CA-B38-65, CA-B38-66). Marcelle, 26/10/2026, depois do teste CA-B38-59. |

## Cenários

### Happy Path
1. A tela de Contatos lê, do perfil de quem está logado, as colunas escondidas (`profiles.colunas_ocultas_contatos`). A tabela mostra Nome, as fixas (WhatsApp, Classificação, Perfil RFV, Tipo, Cidade), todos os campos na ordem da empresa e, para Admin e Gerente, Atendente. Ficam de fora as colunas escondidas.
2. O botão **Colunas**, na barra de ferramentas ao lado de "Filtrar", abre uma lista com uma marca por coluna, menos o Nome. Desligar ou ligar uma coluna muda a tabela na hora e grava a escolha no servidor (`salvarColunasOcultas`).
3. A escolha guarda as colunas escondidas, e não as visíveis. Por isso, campo criado depois aparece ligado para todo mundo.
4. `filtrarContatos` traz os valores de todos os campos da empresa (não só dos marcados).
5. No editor do campo, o rodapé tem Cancelar e Salvar. Salvar grava o nome do campo, se mudou, e cada opção renomeada, nessa ordem, e fecha. Cancelar fecha sem gravar. Acrescentar, subir, descer e tirar opção seguem gravando na hora.

### Edge Cases
- Coluna escondida de um campo que depois foi apagado: o id fica guardado e não aparece em lugar nenhum.
- Atendente: o botão Colunas não oferece a coluna Atendente, que ele não tem.
- Todas as colunas escondidas: a tabela fica só com o Nome.
- Salvar sem mudar nada: só fecha.
- Nome de opção apagado (vazio) no rascunho: o servidor recusa como hoje, a mensagem aparece e o editor fica aberto.

### Cenário de Erro
- Falha ao gravar a escolha de colunas: a tabela volta ao que estava e aparece "Não foi possível guardar as colunas."
- `salvarColunasOcultas` com lista que não é de textos, com mais de 80 itens ou com coluna que não existe (nem fixa, nem id de campo no formato uuid): recusa sem gravar.
- Falha no Salvar do editor: a mensagem aparece, o editor fica aberto, e o que já foi gravado antes do erro fica gravado.

## Prova

| Critério | Prova | Onde | O que confere |
|---|---|---|---|
| CA-B38-47 | automática | `src/test/campos-personalizados.integration.test.ts` | Com CNPJ e Porte criados e nada marcado, `filtrarContatos` traz o valor dos dois para o Atendente; na tela (`campos-personalizados-chat-cadastro-lista.test.tsx`), a tabela tem CNPJ e Porte depois de Cidade, nessa ordem |
| CA-B38-65 | automática | `src/test/campos-personalizados.integration.test.ts` | O Admin grava `["cidade", <id do CNPJ>]` por `salvarColunasOcultas`; `colunasOcultasDoUsuario` devolve isso para ele e `[]` para o Atendente; ao gravar só `["cidade"]`, o CNPJ volta; na tela, desligar CNPJ e Cidade some com as duas colunas e chama `salvarColunasOcultas` com as duas, e ligar o CNPJ de novo devolve a coluna |
| CA-B38-66 | automática | `src/test/campos-personalizados-chat-cadastro-lista.test.tsx` | No botão Colunas não há marca para Nome; com o CNPJ escondido e o campo Instagram da loja novo nos campos, a tabela tem Instagram da loja e não tem CNPJ |
| CA-B38-67 | automática | `src/test/campos-personalizados-tela.test.tsx` | Salvar chama `renomearCampo` com "Porte da loja" e `renomearOpcao` com "Pequena" e fecha o editor; Cancelar fecha sem chamar nenhuma das duas |
| CA-B38-59 | manual | roteiro abaixo | Colunas e botão Colunas aprovados no computador e no celular, claro e escuro |

### Roteiro manual — CA-B38-59
1. Na empresa de teste, com três campos de tipos diferentes, abra Contatos: os três aparecem como colunas depois de "Cidade".
2. Abra o botão Colunas, desligue um campo e a Cidade, e recarregue a página: as duas continuam escondidas. Ligue de novo.
3. Repita no celular (a tabela rola de lado) e no tema escuro. Aprove se nada ficar desalinhado, cortado ou ilegível.

## Banco de Dados

Migration `supabase/migrations/20261026000004_colunas_de_cada_usuario.sql`:
- Tabela `profiles`: nova coluna `colunas_ocultas_contatos` (text[], padrão vazio). Guarda as colunas da lista de Contatos que o usuário escondeu: chaves das fixas (`whatsapp`, `classificacao`, `perfil_rfv`, `tipo`, `cidade`, `atendente`) e ids de campos. `grant update (colunas_ocultas_contatos)` para `authenticated`, como o `tema` (B36-01): o próprio usuário troca.
- Tabela `campos_personalizados`: sai a coluna `mostrar_na_lista`.

## Arquivos

- **Criar:** `supabase/migrations/20261026000004_colunas_de_cada_usuario.sql` — coluna do perfil e remoção de `mostrar_na_lista`
- **Modificar:** `src/integrations/supabase/types.ts` — gerado de novo
- **Modificar:** `src/lib/campos-personalizados.ts` — `CampoDaEmpresa` sem `mostrarNaLista`
- **Modificar:** `src/lib/campos-personalizados-servidor.ts` — leitura sem `mostrar_na_lista`
- **Modificar:** `src/app/(auth)/configuracoes/campos/actions.ts` — sai `marcarNaLista` e o `mostrarNaLista` da listagem
- **Modificar:** `src/app/(auth)/configuracoes/campos/campos-client.tsx` — sai a marca e o selo "na lista"; rodapé Cancelar e Salvar no editor, com os nomes das opções no rascunho do editor
- **Modificar:** `src/app/(auth)/contatos/actions.ts` — `filtrarContatos` com todos os campos; `colunasOcultasDoUsuario` e `salvarColunasOcultas`
- **Criar:** `src/app/(auth)/contatos/colunas.ts` — chaves e nomes das colunas fixas que dá para esconder e a conferência da lista recebida
- **Modificar:** `src/app/(auth)/contatos/page.tsx` — busca as colunas escondidas
- **Criar:** `src/app/(auth)/contatos/components/menu-colunas.tsx` — botão Colunas com as marcas
- **Modificar:** `src/app/(auth)/contatos/components/lista-contatos.tsx` — todas as colunas dos campos, menos as escondidas, e o botão Colunas
- **Modificar:** `src/test/campos-personalizados.integration.test.ts` — CA-B38-47 reescrito e CA-B38-65
- **Modificar:** `src/test/campos-personalizados-chat-cadastro-lista.test.tsx` — CA-B38-47 na tela, CA-B38-65 na tela e CA-B38-66
- **Modificar:** `src/test/campos-personalizados-tela.test.tsx` — CA-B38-67 e campo sem `mostrarNaLista`
- **Modificar:** `src/test/campos-personalizados-apagar-tela.test.tsx` — campos sem `mostrarNaLista` e mock sem `marcarNaLista`
- **Modificar:** `src/test/campos-personalizados-variaveis-tela.test.tsx` — campo sem `mostrarNaLista`

## Checklist

- [x] Migration, db push e tipos
- [x] Sai o `mostrarNaLista` (lib, servidor, actions e tela de campos)
- [x] Rodapé Cancelar e Salvar no editor do campo
- [x] `colunas.ts`, `colunasOcultasDoUsuario` e `salvarColunasOcultas`
- [x] `filtrarContatos` com todos os campos
- [x] Botão Colunas e tabela sem as escondidas
- [x] Testes da tabela Prova e os que renderizam as telas mexidas (L-05)
- [x] `npx tsc --noEmit` no projeto inteiro (L-07)

## Testes manuais

| Critério | Conferido por | Dia |
|---|---|---|
| CA-B38-59 | Marcelle | 27/10/2026 |
