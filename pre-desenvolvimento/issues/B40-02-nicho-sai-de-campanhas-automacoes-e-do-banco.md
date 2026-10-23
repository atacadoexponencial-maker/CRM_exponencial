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
