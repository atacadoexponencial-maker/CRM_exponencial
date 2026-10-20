# Spec: Porteiro rápido

> série: B27
> estado: aprovada em 17/10/2026

## Visão Geral

Todo clique numa tela logada do CRM passa antes por um porteiro, que confere se a
pessoa está logada. Hoje, a cada clique, esse porteiro pergunta ao serviço de logins.
O porteiro roda em São Paulo e o serviço de logins fica em Oregon, nos EUA, então a
pergunta custa uma viagem de cerca de 0,22 s em todo clique do sistema.

Medição de 16 e 17/10/2026 na produção (mediana de 6 aberturas):

- página pública, que não passa pelo porteiro: **0,32 s** (o piso);
- lista do WhatsApp: **0,64 s**;
- Saúde do número: **0,86 s**;
- Ritmo do número: **0,95 s**.

A conferência feita pelo serviço de logins: **220 ms**. A conferência local da
assinatura da sessão: **1 ms**. O projeto só tem chaves de assinatura do tipo que
permite conferir localmente.

A mudança faz o porteiro conferir a sessão ali mesmo, sem a viagem. Hoje é ele que
percebe na hora que um usuário foi desativado (B20-02). Esse cuidado passa para o
servidor das telas e das ações, que fica ao lado do serviço de logins, e o
comportamento que a pessoa vê continua o mesmo.

É a pendência 7 da lista da Marcelle ("delays nos cliques"). O esqueleto de
carregamento das telas já está no ar (`4500bc8`). Esta é a segunda parte.

## Páginas / Módulos

### Porteiro das telas logadas

**Descrição:** decide, antes de abrir qualquer tela fora das públicas, se a pessoa
pode entrar ou vai para o login.

**Componentes:**
- Porteiro: confere a sessão e manda para o login quem não tem sessão válida.

**Comportamentos:**
- Pessoa logada clica numa tela: o porteiro deixa passar sem perguntar ao serviço de
  logins.
- Visitante sem sessão abre uma tela logada: vai para o login.
- Pessoa com sessão vencida que ainda pode ser renovada abre uma tela: a sessão é
  renovada e a tela abre, como hoje.
- Alguém com uma sessão adulterada ou de outra origem abre uma tela: vai para o login.
- Telas públicas (login, cadastro, políticas, loja) abrem sem passar pelo porteiro,
  como hoje.

**Critérios de aceite:**

#### CA-B27-01 — Clique de quem está logado não pergunta ao serviço de logins · prova: automática

- **Dado** uma pessoa com sessão válida
- **Quando** ela abre uma tela logada
- **Então** o porteiro deixa passar sem nenhuma consulta ao serviço de logins (nenhuma
  chamada de rede ao Auth)

#### CA-B27-02 — Sem sessão, vai para o login · prova: automática

- **Dado** um visitante sem sessão
- **Quando** ele abre `/contatos`
- **Então** ele cai em `/login`, sem aviso

#### CA-B27-03 — Sessão adulterada não entra · prova: automática

- **Dado** uma sessão com a assinatura alterada ou feita com outra chave
- **Quando** ela tenta abrir uma tela logada
- **Então** cai em `/login`

#### CA-B27-04 — Sessão vencida é renovada e a tela abre · prova: automática

- **Dado** uma pessoa cuja sessão venceu, mas que ainda tem a renovação válida
- **Quando** ela abre uma tela logada
- **Então** a tela abre, e a sessão nova volta gravada no navegador

#### CA-B27-05 — Telas públicas continuam abertas · prova: automática

- **Dado** um visitante sem sessão
- **Quando** ele abre `/login`, `/cadastro`, `/politica-de-privacidade` ou uma loja
- **Então** a página abre normalmente

#### CA-B27-06 — Cliques ficam mais rápidos na produção · prova: manual

- **Dado** a mudança no ar
- **Quando** a lista do WhatsApp é aberta 6 vezes por um admin logado, com o mesmo
  roteiro de medição de 16/10
- **Então** a mediana fica em **0,45 s ou menos** (era 0,64 s). O resultado é
  registrado na issue.

### Usuário desativado com o CRM aberto

**Descrição:** quando um admin desativa alguém que está com o CRM aberto, essa pessoa
continua sendo barrada no clique seguinte e vê o aviso de conta desativada, como hoje.

**Componentes:**
- Tela de login com o aviso "conta desativada" (já existe, B20-02).

**Comportamentos:**
- A pessoa desativada abre outra tela: é levada ao login com o aviso de conta
  desativada.
- A pessoa desativada tenta uma ação na tela que já estava aberta (enviar mensagem,
  salvar, mover card): a ação é recusada e ela não vê nem grava nenhum dado.
- A pessoa desativada recarrega a página: é levada ao login com o aviso.

**Critérios de aceite:**

#### CA-B27-07 — Desativado é barrado na próxima tela, com o aviso · prova: automática

- **Dado** uma pessoa logada que acabou de ser desativada por um admin
- **Quando** ela abre outra tela logada (navegando pelo menu ou recarregando)
- **Então** ela cai no login com o aviso de conta desativada

#### CA-B27-08 — Ação de desativado é recusada · prova: automática

- **Dado** uma pessoa desativada com uma tela ainda aberta
- **Quando** ela tenta uma ação dessa tela
- **Então** a ação é recusada, e nenhum dado é lido nem gravado

#### CA-B27-09 — Desativar e reativar continuam funcionando como na B20-02 · prova: automática

- **Dado** os testes de usuário desativado da B20-02
- **Quando** a suíte roda depois da mudança
- **Então** todos continuam passando (login recusado com o aviso, sessão antiga sem
  dados, reativação devolve o acesso)

#### CA-B27-10 — Teste com um usuário real desativado na produção · prova: manual

- **Dado** a Marcelle logada como admin e um usuário de teste logado em outra janela
- **Quando** ela desativa esse usuário e ele clica em outra tela do menu
- **Então** ele vai para o login com o aviso de conta desativada

## Fora de escopo

- Mudar o lugar dos servidores ou do banco (Oregon) ou a hospedagem do gateway.
- A repetição de checagem de login dentro da Saúde e do Ritmo (cerca de dezenas de ms):
  fica para depois, se a medição do CA-B27-06 mostrar que ainda pesa.
- Rotas de API, webhooks e crons: não passam pelo porteiro e não mudam.
- O tempo de duração da sessão e a regra de renovação.

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B27-01 | Todas as sessões ativas são assinadas com a chave do tipo que permite conferência local; uma sessão antiga com chave diferente não passaria a ser aceita sem conferência | confirmada | Conferido em 17/10 por Claude: a lista pública de chaves do projeto tem uma só, ES256. Sessão com outra chave cai na conferência pelo serviço de logins (mais lenta, nunca aceita sem conferir). |
| SUP-B27-02 | Os dados continuam fechados para o desativado mesmo que alguma tela não confira o login: quem fecha é o banco (perfil inativo não enxerga dado), não o porteiro | confirmada | Conferido em 17/10 por Claude nos testes da B20-02 (`usuario-desativado-seguranca.integration.test.ts`: "sessão antiga não lê conversas, contatos, mensagens nem perfis"). |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| PER-B27-01 | Quando um usuário com o CRM aberto é desativado, ele deve ser barrado no próximo clique (como hoje) ou pode seguir navegando, sem dados, até a sessão vencer (até 1 h)? | respondida | Marcelle, 17/10/2026: no próximo clique, como hoje. |
