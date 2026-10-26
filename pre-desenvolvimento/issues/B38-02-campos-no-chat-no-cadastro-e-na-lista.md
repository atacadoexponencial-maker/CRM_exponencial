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
