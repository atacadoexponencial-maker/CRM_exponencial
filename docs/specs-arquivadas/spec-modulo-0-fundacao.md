# Spec: Módulo 0 — Fundação

## Visão Geral

A Fundação é a camada base do CRM Exponencial. Ela define a estrutura multi-tenant onde cada empresa opera em um workspace isolado, com seus próprios usuários, papéis, times e números de WhatsApp conectados. Nenhum outro módulo funciona sem ela. O público são donos de marcas atacado e seus times comerciais.

**Fora do escopo desta versão:** recuperação de senha, convite por e-mail, upload de logo/foto, times customizados, múltiplos números de WhatsApp.

---

## Páginas / Módulos

---

### Cadastro de Empresa

**Descrição:** Página pública onde uma nova empresa se cadastra no sistema e cria seu workspace.

**Componentes:**
- Formulário de cadastro: nome da empresa, nome do responsável, e-mail, senha, confirmação de senha
- Botão de envio
- Link para login (caso já tenha conta)

**Comportamentos:**
- Usuário preenche nome da empresa
- Usuário preenche nome do responsável
- Usuário preenche e-mail
- Usuário preenche senha
- Usuário preenche confirmação de senha
- Usuário submete o formulário
- Sistema valida se o e-mail já está em uso e exibe erro caso esteja
- Sistema valida se as senhas coincidem e exibe erro caso não coincidam
- Sistema cria o workspace da empresa isolado
- Sistema cria o primeiro usuário com papel Admin automaticamente
- Sistema cria os times padrão Expansão e Retenção automaticamente
- Sistema redireciona o Admin para a tela de configuração inicial após cadastro

---

### Login

**Descrição:** Página de acesso ao sistema para usuários de qualquer empresa.

**Componentes:**
- Formulário de login: e-mail e senha
- Botão de entrar
- Link para cadastro de nova empresa

**Comportamentos:**
- Usuário preenche e-mail
- Usuário preenche senha
- Usuário submete o formulário
- Sistema valida as credenciais e exibe erro genérico em caso de falha (sem indicar qual campo está errado)
- Sistema redireciona para a caixa de entrada após login bem-sucedido

---

### Gestão de Usuários

**Descrição:** Área onde o Admin gerencia todos os usuários do workspace: cria, edita papéis, times e desativa.

**Componentes:**
- Lista de usuários: nome, e-mail, papel, times, status (ativo/inativo)
- Botão de adicionar novo usuário
- Menu de ações por usuário: editar papel, editar times, desativar, reativar

**Comportamentos:**
- Admin visualiza a lista de todos os usuários da empresa
- Admin clica em adicionar novo usuário
- Admin preenche nome, e-mail e senha temporária do novo usuário
- Admin seleciona o papel do novo usuário (Gerente ou Atendente)
- Admin seleciona os times do novo usuário
- Admin confirma a criação do usuário
- Sistema cria o usuário e exibe na lista
- Admin edita o papel de um usuário existente
- Admin adiciona um usuário a um time
- Admin remove um usuário de um time
- Admin desativa um usuário (usuário perde acesso mas dados são preservados)
- Admin reativa um usuário desativado
- Admin não consegue desativar a si mesmo
- Admin não consegue alterar o próprio papel

---

### Gestão de Times

**Descrição:** Área onde o Admin gerencia os times da empresa. Os times Expansão e Retenção são padrão e não podem ser excluídos ou renomeados.

**Componentes:**
- Lista de times: nome, quantidade de membros, tipo (padrão ou personalizado)
- Botão de criar novo time
- Menu de ações por time: editar nome, excluir (apenas times personalizados)
- Lista de membros dentro de cada time

**Comportamentos:**
- Admin visualiza todos os times da empresa
- Admin visualiza os membros de cada time
- Admin cria um novo time informando o nome
- Admin edita o nome de um time personalizado
- Admin exclui um time personalizado
- Sistema exibe confirmação antes de excluir um time
- Sistema remove os usuários do time excluído (sem excluir os usuários)
- Admin não consegue excluir os times Expansão e Retenção
- Admin não consegue editar o nome dos times Expansão e Retenção
- Admin adiciona um usuário a um time diretamente pela tela de times
- Admin remove um usuário de um time diretamente pela tela de times

---

### Gestão de Números de WhatsApp

**Descrição:** Área onde o Admin conecta e gerencia os números de WhatsApp da empresa via API Oficial. Nesta versão, apenas 1 número pode ser conectado.

**Componentes:**
- Número conectado: número, nome de exibição, status (conectado/desconectado)
- Botão de conectar número (desabilitado quando já há um número conectado)
- Ações: desconectar, reconectar

**Comportamentos:**
- Admin visualiza o número conectado e seu status
- Admin clica em conectar número
- Sistema inicia o fluxo de conexão via API Oficial do WhatsApp (Meta)
- Admin conclui a autenticação com o número desejado
- Sistema confirma a conexão e exibe o número
- Admin desconecta o número
- Admin reconecta o número desconectado
- Sistema impede conectar mais de 1 número nesta versão

---

### Perfil do Usuário

**Descrição:** Página onde cada usuário gerencia seu nome e pode alterar sua senha.

**Componentes:**
- Formulário de perfil: nome, e-mail (somente leitura)
- Seção de segurança: alterar senha (senha atual, nova senha, confirmação)
- Botão de salvar
- Botão de logout

**Comportamentos:**
- Usuário edita o próprio nome
- Usuário salva as alterações do perfil
- Usuário preenche senha atual para alterar a senha
- Usuário preenche nova senha
- Usuário preenche confirmação da nova senha
- Sistema valida a senha atual antes de aceitar a troca
- Sistema exibe erro se a senha atual estiver incorreta
- Sistema exibe erro se as novas senhas não coincidirem
- Usuário realiza logout
