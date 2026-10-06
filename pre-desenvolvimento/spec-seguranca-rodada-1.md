# Spec: Segurança — rodada 1 (falhas críticas)

> Origem: auditoria de segurança de 06/10/2026, feita a pedido da Marcelle depois da
> pergunta "este projeto vai dar ruim, porque não tem nenhum desenvolvedor revisando?".
> Triagem: **arquitetural** — os consertos mexem no cadastro, nas permissões do perfil,
> na forma como o servidor lê as credenciais do WhatsApp e no canal de tempo real do
> chat, peças das quais outras partes do sistema dependem.
>
> Escopo aprovado em 06/10/2026: **os 4 críticos + fechar a listagem anônima dos
> arquivos**. Os itens Altos e Médios da auditoria ficam para as próximas rodadas.

## Visão Geral

Hoje o CRM tem quatro falhas que deixam alguém de fora — ou um atendente de dentro —
tomar o controle de uma empresa ou ler o que não deveria:

1. **Cadastro:** qualquer pessoa, sem login, consegue se tornar Admin de uma empresa
   que já existe, informando o código dessa empresa.
2. **Perfil:** qualquer usuário logado consegue mudar o próprio papel (virar Admin), a
   própria situação (se reativar) e até a empresa à qual pertence.
3. **Credenciais do WhatsApp:** qualquer membro da empresa consegue ler, pelo navegador,
   as credenciais que permitem enviar mensagens em nome da empresa pelo número dela.
4. **Tempo real do chat:** o aviso de mensagem nova, com o texto da mensagem, é
   transmitido num canal que qualquer pessoa na internet pode ouvir sabendo o código da
   empresa.

E um facilitador: **qualquer pessoa consegue listar os arquivos guardados** (fotos do
catálogo e anexos do chat). A listagem revela o código de todas as empresas, que é o
que torna as falhas 1, 2 e 4 fáceis de explorar.

Esta mudança fecha as cinco portas **sem mudar nada do que o usuário legítimo vê ou
faz**: cadastro, perfil, chat, templates, conexão do WhatsApp, campanhas e loja
continuam funcionando exatamente como hoje.

### Regras gerais

- **Nenhuma mudança visível para quem usa o sistema do jeito certo.** Se algum fluxo
  legítimo parar de funcionar, a correção está errada.
- **Toda falha fechada ganha um teste automatizado que reproduz o ataque** e prova que
  ele passou a ser recusado. O teste fica na suíte para a falha não voltar.
- Toda regra de quem pode o quê fica **no servidor e no banco**, nunca só na tela.
- Credenciais do WhatsApp **nunca** chegam ao navegador, nem para o Admin.

### Premissas (a confirmar na aprovação)

- **O cadastro continua como é hoje para quem o usa:** a pessoa preenche o formulário,
  a conta nasce já confirmada, ela entra logada e cai na tela de conexão do WhatsApp.
  Confirmação de e-mail, captcha e limite de tentativas são da rodada 2 (item "Alto"
  da auditoria).
- **A mensagem "E-mail já está em uso" continua aparecendo** no cadastro, mas só como
  resposta à tentativa de cadastrar — deixa de existir uma consulta avulsa "este e-mail
  existe?" que qualquer um pode chamar à vontade.
- **No perfil, o usuário continua editando só o próprio nome** (e a senha, que é outra
  tela). Papel, situação e empresa só mudam pelas telas de Admin, como hoje.
- **O atendente continua recebendo em tempo real as mensagens da empresa inteira**, como
  hoje. Restringir às conversas dele é o item "Médio" da auditoria, fora desta rodada.
- **Os arquivos continuam abrindo pelo link**, como hoje (fotos da loja, anexos no
  chat). Some só a possibilidade de listar a pasta.

---

## Módulos

### 1. Cadastro de empresa (`/cadastro`)

**Descrição:** Tela pública onde uma empresa nova cria a conta e o primeiro Admin. O
cadastro passa a ser **uma operação só**: ou nasce tudo junto (empresa, Admin, times
padrão, sequências do método), ou não nasce nada.

**Componentes:**
- Formulário de cadastro: nome da empresa, nome do responsável, e-mail, senha e
  confirmação de senha (sem mudança visual).
- Mensagens de erro por campo (sem mudança visual).

**Comportamentos:**
- **Cadastrar empresa nova:** o visitante preenche e envia; o sistema cria a empresa, o
  usuário Admin dela, os times Entrada e Recompra e as sequências do método, entra
  logado e leva para a tela de conexão do WhatsApp.
- **E-mail já cadastrado:** ao enviar com um e-mail que já tem conta, o formulário
  mostra "E-mail já está em uso" no campo de e-mail e **nada é criado**.
- **Dados inválidos:** nome vazio, e-mail malformado, senha curta ou diferente da
  confirmação são recusados **também pelo servidor**, mesmo que alguém pule a tela e
  mande os dados direto; nada é criado.
- **Falha no meio do cadastro:** se qualquer etapa falhar, nada fica pela metade — não
  sobra empresa sem Admin, nem usuário sem empresa — e o formulário mostra "Não foi
  possível concluir o cadastro. Tente novamente."
- **Ataque recusado — virar Admin de empresa existente:** quem tentar criar um Admin
  dentro de uma empresa que já existe (informando o código dela) não consegue: o
  cadastro só cria Admin na empresa que ele mesmo acabou de criar, e não aceita código
  de empresa vindo de fora.
- **Ataque recusado — criar empresa solta:** não existe mais como criar só a empresa,
  sem Admin, chamando o servidor direto.
- **Ataque recusado — consultar e-mails em massa:** não existe mais uma consulta avulsa
  "este e-mail existe?" chamável sem cadastrar.

### 2. Perfil do usuário (`/perfil`)

**Descrição:** Tela onde o usuário logado edita os próprios dados. O banco passa a
aceitar do próprio usuário **apenas a troca do nome**.

**Componentes:**
- Formulário de nome (sem mudança visual).
- Formulário de alterar senha (sem mudança).

**Comportamentos:**
- **Editar o próprio nome:** o usuário troca o nome e salva; o novo nome aparece no
  sistema, como hoje.
- **Ataque recusado — mudar o próprio papel:** um usuário que tente se dar papel de
  Admin (ou qualquer outro) pelo navegador é recusado; o papel continua o mesmo.
- **Ataque recusado — mudar a própria empresa:** um usuário que tente trocar a empresa à
  qual pertence é recusado; ele continua na mesma empresa.
- **Ataque recusado — se reativar:** um usuário desativado que tente mudar a própria
  situação para ativo é recusado.
- **Ataque recusado — editar o perfil de outro:** um usuário não consegue alterar nada no
  perfil de outra pessoa.

### 3. Gestão de usuários (`/configuracoes/usuarios`) — sem mudança visível

**Descrição:** O Admin continua mudando papel, desativando, reativando e adicionando
usuários como hoje. Esta seção existe para garantir que o fechamento do item 2 **não
quebre** essas telas.

**Comportamentos:**
- **Admin muda o papel de um usuário:** continua funcionando.
- **Admin desativa e reativa um usuário:** continua funcionando.
- **Admin adiciona um usuário novo:** continua funcionando.

### 4. Credenciais do WhatsApp (sem tela própria)

**Descrição:** As credenciais de cada número conectado (a da API Oficial da Meta e a do
canal direto) deixam de ser legíveis por qualquer usuário pelo navegador. Só o servidor
as lê, e só depois de confirmar que o número pertence à empresa de quem pediu.

**Comportamentos:**
- **Enviar mensagem no chat:** continua funcionando nos dois canais (API Oficial e canal
  direto), com texto e com mídia.
- **Ver e criar templates (`/configuracoes/templates`):** continua funcionando.
- **Reinscrever o webhook do número (`/configuracoes/whatsapp`):** continua funcionando.
- **Ver a saúde e o ritmo do número, conectar, desconectar e reconectar:** continuam
  funcionando.
- **Enviar campanha e sequência:** continuam funcionando.
- **Listar os números conectados:** continua mostrando número, nome, canal e situação.
- **Ataque recusado — ler as credenciais pelo navegador:** um usuário logado, de
  qualquer papel, que peça as colunas de credencial é recusado pelo banco.
- **Ataque recusado — usar o número de outra empresa:** pedir ao servidor uma ação com o
  número de outra empresa não lê a credencial dela.

### 5. Tempo real do chat (`/chat`)

**Descrição:** O aviso instantâneo de mensagem nova (e de contato excluído) passa a
circular num canal fechado: só quem está logado e pertence àquela empresa entra.

**Comportamentos:**
- **Receber mensagem nova ao vivo:** com o chat aberto, a mensagem que o cliente manda
  aparece na hora, sem recarregar, como hoje.
- **Ver a conversa sumir ao vivo quando o contato vai para a lixeira:** continua
  funcionando.
- **Reconectar o tempo real depois que a sessão renova:** o chat aberto por muito tempo
  continua recebendo mensagens.
- **Ataque recusado — ouvir a empresa sem login:** alguém de fora, sabendo o código da
  empresa, não consegue entrar no canal nem receber nada.
- **Ataque recusado — ouvir outra empresa logado:** um usuário de uma empresa não
  consegue entrar no canal de outra.
- **Ataque recusado — injetar aviso falso:** alguém de fora não consegue mandar um aviso
  falso que apareça na caixa de entrada da empresa.

### 6. Arquivos guardados (fotos do catálogo e anexos do chat)

**Descrição:** Os arquivos continuam abrindo pelo link, mas ninguém de fora consegue
mais listar o que existe nas pastas. Ninguém além do próprio sistema grava anexos do
chat.

**Comportamentos:**
- **Ver fotos dos produtos na loja pública:** continuam aparecendo, como hoje.
- **Ver fotos dos produtos no catálogo do CRM e subir foto nova:** continuam
  funcionando.
- **Ver anexos no chat (recebidos e enviados):** continuam aparecendo.
- **Enviar anexo pelo chat e mídia em campanha:** continua funcionando.
- **Ataque recusado — listar as pastas das fotos do catálogo:** alguém de fora não
  consegue obter a lista de pastas e arquivos (e, com ela, os códigos das empresas).
- **Ataque recusado — listar os anexos do chat:** alguém de fora não consegue obter a
  lista de anexos de nenhuma empresa.
- **Ataque recusado — gravar arquivo na pasta de anexos:** um usuário logado não
  consegue subir arquivo direto na pasta de anexos (nem na de outra empresa) sem passar
  pelo sistema.

### 7. Verificação depois do conserto

**Descrição:** Como as falhas 1 e 2 permitiam criar Admins por fora, depois que elas
forem fechadas é preciso conferir se alguém já se aproveitou disso.

**Comportamentos:**
- **Conferir Admins de cada empresa:** listar, por empresa, quem tem papel de Admin e
  quando entrou, para a Marcelle confirmar se reconhece cada um.
- **Conferir usuários que mudaram de empresa ou de papel sozinhos:** apontar qualquer
  sinal de perfil alterado fora das telas de Admin, se houver registro que permita ver.
- **Nenhum dado é alterado nesta verificação:** o que for suspeito é mostrado para a
  Marcelle decidir.

---

## Critério de pronto

- Cada "Ataque recusado" acima tem um teste automatizado que reproduz o ataque e passa.
- Cada fluxo marcado "continua funcionando" segue funcionando: pelos testes automatizados
  que já existem e por um teste manual curto da Marcelle (cadastro novo, editar nome,
  mandar e receber mensagem no chat com o tempo real, abrir templates, abrir a loja).
- As mudanças no banco foram aplicadas no Supabase de produção, e a permissão de leitura
  das credenciais foi conferida lá (não só no arquivo da mudança).

## Fora desta rodada (próximas rodadas da auditoria)

Usuário desativado ainda conseguir entrar; campanhas usando número de outra empresa;
atualizar o Next.js; tornar o repositório privado; SSRF na importação de fotos;
captcha, limite de tentativas e confirmação de e-mail no cadastro; atendente ver só as
próprias conversas; cabeçalhos de segurança; demais itens Médios e Baixos.
