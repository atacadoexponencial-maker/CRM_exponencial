# Spec: Segurança — rodada 2 (falhas altas)

> Origem: auditoria de segurança de 06/10/2026. A rodada 1 (B19, críticos) entrou no ar
> no mesmo dia. Pedido da Marcelle: "Pode seguir". Triagem: **arquitetural** — mexe na
> sessão e na regra de acesso usada por todo o banco (usuário desativado), traz um freio
> novo para cadastro e login, e atualiza a base do sistema (Next.js).

## Visão Geral

Cinco brechas de gravidade alta continuam abertas:

1. **Usuário desativado continua entrando.** Desativar só grava "inativo"; nada impede o
   ex-funcionário de entrar, ler e mandar mensagens.
2. **Campanha atravessa empresas.** Um Gerente consegue disparar campanha pelo número de
   outra empresa, ou apagar e trocar os destinatários de uma campanha de outra empresa,
   se souber os códigos dela.
3. **Next.js desatualizado.** A versão no ar tem falhas públicas conhecidas (entre elas,
   driblar o middleware e derrubar o servidor com Server Actions).
4. **Importar foto por link alcança a rede interna.** Um endereço disfarçado passa pelo
   bloqueio e faz o servidor acessar endereços internos.
5. **Cadastro e login sem freio.** Um robô cria empresas em massa ou testa senhas sem
   limite.

Como na rodada 1: **nada muda para quem usa o sistema do jeito certo**, e cada brecha
fechada ganha um teste automatizado que reproduz o ataque.

### Decisões da Marcelle (06/10/2026)

| Pergunta | Decisão |
|---|---|
| Confirmar e-mail antes de entrar? | **Não** — cadastrou, entra na hora, como hoje |
| Como frear robôs | **Limite de tentativas no próprio CRM**, sem captcha nem serviço externo |

### Premissas (a confirmar na aprovação)

- **Limites:** cadastro — no máximo **5 empresas por hora por endereço de internet**;
  login — no máximo **10 tentativas erradas em 15 minutos** por e-mail e **30 por
  endereço de internet**. Passou do limite, espera e tenta de novo. Login certo não conta.
- **A mensagem do limite** é a mesma para cadastro e login: "Muitas tentativas. Aguarde
  alguns minutos e tente de novo." — sem dizer se o e-mail existe.
- **Desativar derruba na hora:** a sessão aberta do usuário desativado para de funcionar
  imediatamente (próxima ação ou próxima página leva para o login com aviso), e não só
  quando a sessão expirar.
- **Reativar devolve tudo como era:** mesmo papel, mesmos times, mesmas conversas.
- **Desativado continua aparecendo** onde já aparece hoje (lista de usuários, histórico,
  responsável por conversas antigas) — só não entra.

### Regras gerais

- Toda regra fica no servidor e no banco; a tela só mostra o resultado.
- Toda brecha fechada tem um teste automatizado que reproduz o ataque.
- Nenhum fluxo legítimo muda de comportamento visível, exceto as mensagens de limite e
  de conta desativada, que são novas.

---

## Módulos

### 1. Usuário desativado (`/configuracoes/usuarios` e todo o CRM)

**Descrição:** Desativar um usuário passa a cortar o acesso dele de verdade, em todas as
portas: login, páginas, ações e leitura direta do banco.

**Componentes:**
- Botões Desativar e Reativar na gestão de usuários (sem mudança visual).
- Aviso na tela de login para conta desativada (novo).

**Comportamentos:**
- **Admin desativa um usuário:** o usuário aparece como inativo na lista, como hoje.
- **Desativado tenta entrar:** o login recusa com "Esta conta foi desativada. Fale com o
  administrador da sua empresa."
- **Desativado com o CRM aberto:** na próxima página ou ação, é levado para o login com o
  mesmo aviso.
- **Admin reativa o usuário:** ele volta a entrar com a mesma senha, o mesmo papel e os
  mesmos times.
- **Ataque recusado — ler dados pelo banco com a sessão antiga:** um desativado que use
  a sessão que já tinha para pedir conversas, contatos ou mensagens direto ao banco não
  recebe nada.
- **Ataque recusado — usar ações do CRM com a sessão antiga:** mandar mensagem, mover
  card, editar contato etc. são recusados.

### 2. Campanhas (`/campanhas`)

**Descrição:** Toda campanha só usa o número, os destinatários e os dados da própria
empresa — ao salvar, ao confirmar e na hora de disparar.

**Comportamentos:**
- **Criar, editar, confirmar, agendar e disparar campanha:** continuam funcionando, como hoje.
- **Escolher o número da campanha:** só aparecem e só são aceitos números da própria empresa.
- **Ataque recusado — salvar campanha com número de outra empresa:** recusado com erro;
  nada é gravado.
- **Ataque recusado — disparar por número de outra empresa:** mesmo que um número alheio
  já esteja gravado numa campanha, o disparo não usa a credencial dele; a campanha
  falha com motivo visível no relatório.
- **Ataque recusado — mexer na campanha de outra empresa:** salvar rascunho ou confirmar
  com o código de uma campanha alheia é recusado, e os destinatários dela não mudam.

### 3. Base do sistema (Next.js)

**Descrição:** Atualizar o Next.js para a versão corrigida mais recente da mesma linha.

**Comportamentos:**
- **Todas as telas continuam funcionando:** build, testes automatizados e uma volta pelas
  telas principais passam como antes.
- **Ataque recusado — driblar o middleware:** as falhas públicas da versão antiga deixam
  de existir (`npm audit` não acusa mais o Next.js).

### 4. Importar fotos por link (`/catalogo/importar`)

**Descrição:** O servidor só busca fotos em endereços públicos da internet.

**Comportamentos:**
- **Importar planilha com links de fotos públicas:** continua funcionando, como hoje.
- **Ataque recusado — endereço interno disfarçado:** links que apontam para a rede interna,
  inclusive escritos de forma disfarçada (formatos IPv6 que embutem um IPv4 interno,
  endereços reservados), são recusados e a foto aparece como "não foi possível baixar".
- **Ataque recusado — trocar o destino no meio:** um endereço que parece público na
  conferência e aponta para dentro na hora de baixar não é baixado.

### 5. Freio no cadastro e no login (`/cadastro`, `/login`)

**Descrição:** Cadastro e login passam a ter limite de tentativas, contado no servidor.

**Comportamentos:**
- **Cadastrar e entrar normalmente:** nada muda para quem usa como gente.
- **Passar do limite de cadastros:** a tela mostra "Muitas tentativas. Aguarde alguns
  minutos e tente de novo." e nada é criado.
- **Passar do limite de senhas erradas:** a tela de login mostra a mesma mensagem, mesmo
  que a próxima senha esteja certa, até o tempo passar.
- **Login certo:** não conta tentativa e não é bloqueado por tentativas antigas de outras
  pessoas com outros e-mails, abaixo do limite por endereço.
- **Ataque recusado — cadastro em massa por robô:** a partir do limite, o servidor recusa
  sem criar empresa nem usuário.
- **Ataque recusado — testar senhas em massa:** a partir do limite, o servidor recusa sem
  nem consultar a senha.

---

## Critério de pronto

- Cada "Ataque recusado" tem teste automatizado passando.
- Os testes existentes, o build e o lint passam.
- Mudanças no banco aplicadas no Supabase de produção, na ordem que não quebra o que está no ar.
- Teste manual curto da Marcelle: desativar e reativar um usuário de teste; criar e
  disparar uma campanha de teste; importar uma planilha com foto por link.

## Fora desta rodada

Itens médios e baixos da auditoria (times sem checagem de papel, atendente vendo
conversas de colegas, referências entre empresas em outras tabelas, crons e webhook
abertos se faltar segredo, cabeçalhos de segurança, etc.) e tornar o repositório privado
(ação da Marcelle no GitHub).
