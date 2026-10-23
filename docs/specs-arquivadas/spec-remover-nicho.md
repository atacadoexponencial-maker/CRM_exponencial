# Spec: Remover o campo nicho do contato

> série: B40
> estado: concluída em 23/10/2026 (aprovada em 22/10/2026)

## Visão Geral

O contato tem um campo **Nicho** (texto livre: "Moda", "Alimentação"...). Para o
atacadista ele não faz sentido: a empresa vende para um nicho só, então todo
contato teria o mesmo valor. A mudança apaga o campo de vez: some de todas as
telas, de todos os lugares onde dá para usar o nicho (filtro de contatos,
segmentação de campanhas, gatilho e ação das automações) e do cadastro guardado
no banco.

Em 22/10/2026 o banco de produção tinha **zero** contatos com nicho preenchido e
nenhuma automação, campanha ou filtro salvo usando o nicho. Ou seja, nenhum dado
se perde e nada do que está salvo deixa de funcionar.

## Páginas / Módulos

### Novo contato (Contatos → Novo contato)

**Descrição:** formulário de cadastro manual de um contato.

**Componentes:**
- Formulário: nome, telefone, tipo, cidade e UF. O campo Nicho sai.

**Comportamentos:**
- Cadastrar contato: a pessoa preenche o formulário sem nenhum campo de nicho e o contato é criado.

**Critérios de aceite:**

#### CA-B40-01 — O cadastro de contato não pede nicho · prova: automática

- **Dado** uma pessoa na lista de contatos
- **Quando** ela abre "Novo contato"
- **Então** o formulário não mostra o campo Nicho, e ao salvar o contato é criado normalmente com os outros campos

### Perfil do contato (Contatos → contato)

**Descrição:** página com os dados do contato, em modo de leitura e de edição.

**Componentes:**
- Dados do cadastro: sem a linha Nicho.
- Formulário de edição: sem o campo Nicho.
- Campo ICP (perfil de cliente): continua com as opções que já tem, "Já revende este nicho" e "Primeira vez no nicho".

**Comportamentos:**
- Ver os dados do contato: a linha Nicho não aparece.
- Editar os dados do contato: o formulário não tem Nicho, e salvar funciona.
- Escolher o ICP do contato: as opções continuam as mesmas.

**Critérios de aceite:**

#### CA-B40-02 — O perfil do contato não mostra nicho · prova: automática

- **Dado** um contato cadastrado
- **Quando** a pessoa abre o perfil dele
- **Então** os dados não têm a linha Nicho

#### CA-B40-03 — Editar o contato funciona sem nicho · prova: automática

- **Dado** o perfil de um contato aberto em modo de edição
- **Quando** a pessoa muda nome, tipo, cidade ou UF e salva
- **Então** o formulário não tem o campo Nicho e os dados novos ficam gravados

#### CA-B40-04 — As opções do ICP continuam as mesmas · prova: automática

- **Dado** o perfil de um contato em modo de edição
- **Quando** a pessoa abre o campo ICP
- **Então** as opções "Já revende este nicho" e "Primeira vez no nicho" continuam lá, com o mesmo texto

### Ficha do contato no chat

**Descrição:** painel lateral da conversa com os dados do contato, editáveis ali mesmo.

**Componentes:**
- Dados do cadastro: tipo, cidade, UF e ICP. O Nicho sai.

**Comportamentos:**
- Ver e editar os dados do contato pelo chat: o Nicho não aparece.

**Critérios de aceite:**

#### CA-B40-05 — A ficha do contato no chat não mostra nicho · prova: automática

- **Dado** uma conversa aberta no chat
- **Quando** a pessoa olha a ficha do contato
- **Então** a ficha não tem o dado Nicho, e os outros dados continuam editáveis

### Lista de contatos

**Descrição:** tabela de contatos com botões de filtro rápido e o filtro avançado (B37).

**Componentes:**
- Tabela: a coluna Nicho sai.
- Botões rápidos: a fileira "Todos nichos" e os botões de cada nicho saem.
- Filtro avançado: o campo Nicho sai da lista de campos.

**Comportamentos:**
- Ver a lista de contatos: não há coluna Nicho.
- Filtrar pelos botões rápidos: não há botões de nicho.
- Montar um filtro avançado: Nicho não está entre os campos.
- Usar um filtro salvo: os filtros salvos continuam funcionando.

**Critérios de aceite:**

#### CA-B40-06 — A tabela de contatos não tem coluna Nicho · prova: automática

- **Dado** uma empresa com contatos
- **Quando** a pessoa abre a lista de contatos
- **Então** a tabela não tem a coluna Nicho

#### CA-B40-07 — A lista não tem botões de nicho · prova: automática

- **Dado** a lista de contatos aberta
- **Quando** a pessoa olha os botões de filtro rápido
- **Então** não há "Todos nichos" nem botão de nicho, e os botões de classificação, tipo e atendente continuam lá

#### CA-B40-08 — O filtro avançado não oferece Nicho · prova: automática

- **Dado** o filtro avançado de contatos aberto
- **Quando** a pessoa escolhe o campo de uma condição
- **Então** Nicho não está entre os campos, e os demais campos filtram como antes

#### CA-B40-09 — O servidor recusa filtro por nicho · prova: automática

- **Dado** um pedido de busca de contatos que chega com uma condição de nicho (montada fora da tela)
- **Quando** o servidor recebe o pedido
- **Então** a busca é recusada como campo desconhecido, igual a qualquer outro campo que não existe

### Campanhas (editor, etapa de segmentação)

**Descrição:** escolha do público da campanha por classificação, tipo, etiqueta e atendente.

**Componentes:**
- Segmentação: o grupo de botões Nicho sai.

**Comportamentos:**
- Segmentar o público da campanha: Nicho não está entre as opções, e contar e enviar o público funciona com os outros filtros.

**Critérios de aceite:**

#### CA-B40-10 — A segmentação de campanha não tem Nicho · prova: automática

- **Dado** o editor de campanha na etapa de segmentação
- **Quando** a pessoa olha as opções de público
- **Então** não há o grupo Nicho, e o público contado com os outros filtros é o mesmo de antes

### Automações (editor de fluxo)

**Descrição:** o gatilho "dado do contato alterado" e a ação "alterar dado do contato" deixam de oferecer o nicho.

**Componentes:**
- Gatilho "dado do contato alterado": campos classificação, tipo e cidade.
- Ação "alterar dado do contato": campos tipo, cidade e observações.

**Comportamentos:**
- Escolher o campo do gatilho: Nicho não aparece.
- Escolher o campo da ação: Nicho não aparece.
- Salvar uma automação com gatilho ou ação sobre o nicho (montada fora da tela): o servidor recusa.

**Critérios de aceite:**

#### CA-B40-11 — O gatilho de dado alterado não oferece Nicho · prova: automática

- **Dado** o editor de automação com o gatilho "dado do contato alterado"
- **Quando** a pessoa escolhe o campo
- **Então** as opções são classificação, tipo e cidade, sem Nicho

#### CA-B40-12 — A ação de alterar dado não oferece Nicho · prova: automática

- **Dado** o editor de automação com a ação "alterar dado do contato"
- **Quando** a pessoa escolhe o campo
- **Então** as opções são tipo, cidade e observações, sem Nicho

#### CA-B40-13 — O servidor recusa automação que usa nicho · prova: automática

- **Dado** uma automação com o gatilho ou a ação apontando para o campo nicho (montada fora da tela)
- **Quando** alguém tenta salvá-la
- **Então** o servidor recusa, como faz com qualquer campo que não existe

### Cadastro guardado no banco

**Descrição:** o nicho deixa de ser guardado.

**Comportamentos:**
- O dado nicho não existe mais no cadastro do contato, e nada no sistema tenta lê-lo ou gravá-lo.

**Critérios de aceite:**

#### CA-B40-14 — O cadastro do contato não guarda mais nicho · prova: automática

- **Dado** a mudança aplicada ao banco
- **Quando** se consulta o cadastro de contatos
- **Então** o campo nicho não existe (a coluna `contacts.nicho` foi apagada), e a lista, o perfil, o chat, o filtro e as campanhas continuam funcionando

#### CA-B40-15 — As telas ficam sem buraco onde estava o nicho · prova: manual

- **Dado** o preview publicado
- **Quando** a Marcelle passa por novo contato, perfil, ficha do chat, lista de contatos, filtro, campanha e automação
- **Então** nenhuma tela mostra nicho, e o layout fica bem arrumado sem ele (sem espaço vazio nem campo desalinhado)

## Fora de escopo

- Mudar o campo ICP ou o texto das opções dele ("Já revende este nicho" e "Primeira vez no nicho" ficam).
- Tratar automação, campanha ou filtro salvo que use o nicho: não existe nenhum, e o app ainda não tem clientes usando.
- Reescrever o histórico do contato: registros antigos que citem nicho, se houver, ficam como estão.
- Campos personalizados do contato (série B38, separada).

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B40-01 | Nenhuma automação, campanha ou filtro salvo usa o nicho, então não é preciso limpar referências ao apagar | confirmada | Marcelle, 22/10/2026: "ninguém usa o app ainda" (conferido no banco no mesmo dia: zero contatos com nicho, zero referências) |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| PER-B40-01 | As opções que falam em nicho mudam de texto? (são do campo ICP; a pergunta saiu escrita como "Tipo" por engano, corrigido no /plan da B40-01) | respondida | Marcelle, 22/10/2026: manter como está |
| PER-B40-02 | Só tirar das telas ou apagar do cadastro também? | respondida | Marcelle, 22/10/2026: apagar do cadastro |
