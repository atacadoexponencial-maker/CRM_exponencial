# B40-02: Nicho sai de campanhas, automações e do banco

**Tipo:** Implementação
**Página:** Campanhas (segmentação), Automações (editor de fluxo) e cadastro no banco
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-remover-nicho.md`

## Descrição

Tirar o Nicho da segmentação de campanhas e do gatilho e da ação de dado do contato nas automações, fazer o servidor recusar automação que use nicho e, com nada mais lendo o campo, apagar a coluna `contacts.nicho`. Depende da B40-01.

## Pronto quando

Campanhas e automações não oferecem mais o Nicho, a coluna não existe mais no banco e todas as telas da série funcionam sem ela, aprovadas pela Marcelle no preview.

## Critérios de aceite

- **CA-B40-10** (automática) — A segmentação de campanha não tem Nicho. Dado o editor de campanha na etapa de segmentação, quando a pessoa olha as opções de público, então não há o grupo Nicho, e o público contado com os outros filtros é o mesmo de antes.
- **CA-B40-11** (automática) — O gatilho de dado alterado não oferece Nicho. Dado o editor de automação com o gatilho "dado do contato alterado", quando a pessoa escolhe o campo, então as opções são classificação, tipo e cidade, sem Nicho.
- **CA-B40-12** (automática) — A ação de alterar dado não oferece Nicho. Dado o editor de automação com a ação "alterar dado do contato", quando a pessoa escolhe o campo, então as opções são tipo, cidade e observações, sem Nicho.
- **CA-B40-13** (automática) — O servidor recusa automação que usa nicho. Dado uma automação com o gatilho ou a ação apontando para o campo nicho (montada fora da tela), quando alguém tenta salvá-la, então o servidor recusa, como faz com qualquer campo que não existe.
- **CA-B40-14** (automática) — O cadastro do contato não guarda mais nicho. Dado a mudança aplicada ao banco, quando se consulta o cadastro de contatos, então o campo nicho não existe (a coluna `contacts.nicho` foi apagada), e a lista, o perfil, o chat, o filtro e as campanhas continuam funcionando.
- **CA-B40-15** (manual) — As telas ficam sem buraco onde estava o nicho. Dado o preview publicado, quando a Marcelle passa por novo contato, perfil, ficha do chat, lista de contatos, filtro, campanha e automação, então nenhuma tela mostra nicho, e o layout fica bem arrumado sem ele (sem espaço vazio nem campo desalinhado).

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B40-01 | Nenhuma automação, campanha ou filtro salvo usa o nicho, então não é preciso limpar referências ao apagar | confirmada | Marcelle, 22/10/2026: "ninguém usa o app ainda" (conferido no banco no mesmo dia: zero contatos com nicho, zero referências) |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| PER-B40-02 | Só tirar das telas ou apagar do cadastro também? | respondida | Marcelle, 22/10/2026: apagar do cadastro |

## Cenários

### Happy Path
1. No editor de campanha (etapa Destinatários), a segmentação mostra Classificação, Tipo de contato, Tag e Atendente, sem o grupo Nicho. Escolher filtros recalcula o público com `contarDestinatarios`, que não lê nem filtra nicho.
2. No editor de automação, o gatilho "dado do contato alterado" oferece classificação, tipo e cidade; a ação "alterar dado do contato" oferece tipo, cidade e observações.
3. Ao salvar uma automação, `gatilhoDeDadoValido` e `dadoDoContatoValido` recusam o campo `nicho`; o motor (`acoes.ts`) também recusa, porque usa o mesmo `dadoDoContatoValido`.
4. Editar o contato deixa de considerar nicho no gatilho (`CAMPOS_EDITAVEIS` = tipo e cidade).
5. A migration troca `condicao_de_contato_sql` (sem o caso `nicho`, que passa a cair em "Campo de filtro desconhecido") e `filtrar_contatos` (sem a coluna nicho no retorno) e apaga `contacts.nicho`. Os tipos do Supabase são gerados de novo e o `nicho` sai de `COLUNAS_FORA_DO_FILTRO`.

### Edge Cases
- Campanha antiga com `segmento.nichos` salvo: o campo passa a ser ignorado (não existe nenhuma hoje, SUP-B40-01).
- Ordem da publicação: o código de produção de hoje ainda lê `contacts.nicho`. A migration que apaga a coluna **só pode ser aplicada depois** de o código da B40-01 e da B40-02 estar no ar; antes disso, a lista de contatos, o perfil e o chat da produção quebrariam.
- O script `e2e/preview/resetar-empresa-teste.cjs` limpa `nicho` da empresa de teste; sem ajuste, ele quebraria depois da migration.

### Cenário de Erro
- Automação com gatilho ou ação em `nicho` montada fora da tela: o salvar devolve o erro que já existe para campo inválido.
- Busca no banco com condição `nicho` (chamada direta à função): o banco recusa com "Campo de filtro desconhecido: nicho".

## Prova

| Critério | Prova | Onde | O que confere |
|---|---|---|---|
| CA-B40-10 | automática | `src/test/remover-nicho-campanhas-automacoes.test.tsx` | O editor de campanha não tem o grupo Nicho e, ao escolher Lojista, pede a contagem com o segmento só de tipo; o servidor conta o público por tipo sem ler nicho |
| CA-B40-11 | automática | `src/test/remover-nicho-campanhas-automacoes.test.tsx` | As opções de campo do gatilho "dado do contato alterado" são Classificação, Tipo e Cidade |
| CA-B40-12 | automática | `src/test/remover-nicho-campanhas-automacoes.test.tsx` | As opções de campo da ação "alterar dado do contato" são Tipo, Cidade e Observações |
| CA-B40-13 | automática | `src/test/remover-nicho-campanhas-automacoes.test.tsx` | As validações do salvar recusam gatilho e ação com campo nicho e aceitam cidade |
| CA-B40-14 | automática | `src/test/remover-nicho-banco.integration.test.ts` | No banco de verdade, ler `contacts.nicho` dá "coluna não existe", `filtrar_contatos` devolve os contatos sem nicho e recusa condição de nicho, e os tipos gerados do banco não têm nicho |
| CA-B40-15 | manual | roteiro abaixo | Nenhuma tela mostra nicho e o layout fica arrumado sem ele |

### Roteiro manual — CA-B40-15
1. No preview, entre com o login da empresa [TESTE] Automações B11.
2. Contatos → "Novo contato": o formulário vai de Telefone para Tipo, Cidade e UF, sem espaço vazio.
3. Abra um contato: os dados não têm Nicho; clique em Editar e confira o formulário.
4. Lista de contatos: a tabela não tem coluna Nicho e os botões rápidos não têm "Todos nichos"; abra Filtrar e veja que Nicho não está entre os campos.
5. Chat → abra uma conversa → ficha do contato: sem Nicho.
6. Campanhas → Nova campanha: a segmentação não tem Nicho.
7. Configurações → Automações → nova automação: no gatilho "dado do contato alterado" e na ação "alterar dado do contato", Nicho não aparece.
8. Em todas: nada desalinhado ou com buraco no lugar.

## Banco de Dados

- Migration nova `supabase/migrations/20261022000005_remover_nicho.sql`:
  - `condicao_de_contato_sql(jsonb)`: a mesma da B37-03, sem o caso `nicho`.
  - `filtrar_contatos(jsonb, jsonb, text, text, int, int)`: apagada e criada de novo sem a coluna `nicho` no retorno (mudar o retorno exige `drop function`), com o mesmo `grant`.
  - `contacts`: `drop column nicho`.
- Aplicar com `npx supabase db push --linked` **só depois** do código no ar, e gerar de novo `src/integrations/supabase/types.ts`.

## Arquivos

- **Modificar:** `src/app/(auth)/campanhas/actions.ts` — tirar `nichos` do `Segmento`, do filtro de destinatários e de `opcoesSegmentacao`.
- **Modificar:** `src/app/(auth)/campanhas/[id]/editor-campanha-client.tsx` — tirar o grupo Nicho e `nichos` das opções.
- **Modificar:** `src/app/(auth)/configuracoes/automacoes/components/catalogo.ts` — tirar Nicho dos campos do gatilho e da ação.
- **Modificar:** `src/lib/automacoes/referencias.ts` — tirar `nicho` de `LIMITE_POR_CAMPO` e de `gatilhoDeDadoValido`.
- **Modificar:** `src/lib/automacoes/gatilhos-do-crm.ts` — `CAMPOS_EDITAVEIS` sem nicho.
- **Modificar:** `src/lib/automacoes/acoes.ts` — comentário de `alterarDadoDoContato` sem nicho.
- **Modificar:** `src/lib/automacoes/contexto.ts` — comentário do campo sem nicho.
- **Modificar:** `src/lib/filtro-contatos.ts` — tirar `nicho` de `COLUNAS_FORA_DO_FILTRO`.
- **Criar:** `supabase/migrations/20261022000005_remover_nicho.sql` — funções sem nicho e coluna apagada.
- **Modificar:** `src/integrations/supabase/types.ts` — gerado de novo depois da migration.
- **Modificar:** `e2e/preview/resetar-empresa-teste.cjs` — não limpar mais o nicho.
- **Modificar:** `src/test/automacoes-fluxo-recebido.test.ts` — nicho passa de aceito para recusado em `dadoDoContatoValido`.
- **Modificar:** `src/test/automacoes-gatilhos-do-crm.test.ts` — exemplos de `camposQueMudaram` e `dispararDadosAlterados` sem nicho.
- **Criar:** `src/test/remover-nicho-campanhas-automacoes.test.tsx` — testes CA-B40-10 a 13.
- **Criar:** `src/test/remover-nicho-banco.integration.test.ts` — teste CA-B40-14.

## Checklist

- [x] Tirar nicho da segmentação de campanhas (actions e editor)
- [x] Tirar nicho do catálogo, das validações e do gatilho das automações
- [x] Ajustar os testes antigos de automações
- [x] Escrever a migration (funções e coluna)
- [x] Ajustar `resetar-empresa-teste.cjs`
- [x] Escrever `src/test/remover-nicho-campanhas-automacoes.test.tsx` e `src/test/remover-nicho-banco.integration.test.ts`
- [x] Publicar o código (B40-01 e B40-02) antes da migration
- [x] Aplicar a migration, gerar os tipos e tirar `nicho` de `COLUNAS_FORA_DO_FILTRO`
- [x] `npx tsc --noEmit`, lint e testes passando
