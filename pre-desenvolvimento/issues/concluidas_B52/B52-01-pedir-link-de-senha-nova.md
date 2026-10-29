# B52-01: Pedir o link de senha nova

**Tipo:** Implementação
**Página:** `/login` e `/esqueci-minha-senha`
**Repositório:** `crm-exponencial`
**Spec:** `docs/specs-arquivadas/spec-esqueci-minha-senha.md`

## Descrição

O login ganha "Esqueci minha senha". A tela nova recebe o e-mail, confere que é uma pessoa e o freio, e manda pelo Resend um link de 1 hora para a conta ativa; para qualquer outro e-mail, a mesma mensagem sem envio.

## Pronto quando

No login, "Esqueci minha senha" abre a tela; pedindo com o e-mail de uma conta ativa, chega o e-mail com o link e a validade; com um e-mail sem conta, a tela diz o mesmo e nada sai.

## Critérios de aceite

- **CA-B52-01** (automática) — Link no login. Dado a tela de login, quando a pessoa olha o formulário, então há o link "Esqueci minha senha", que leva a `/esqueci-minha-senha`.
- **CA-B52-02** (automática) — Conta ativa recebe o link. Dado uma conta ativa com o e-mail `ana@exemplo.com`, quando alguém pede o link com esse e-mail (em qualquer caixa), então sai um e-mail para `ana@exemplo.com` com o link de criar senha nova e a validade de 1 hora, e a tela diz que, se o e-mail tiver conta, o link foi enviado.
- **CA-B52-03** (automática) — E-mail sem conta não revela nada. Dado um e-mail que não tem conta, quando alguém pede o link com ele, então a tela mostra a mesma mensagem do CA-B52-02 e nenhum e-mail sai.
- **CA-B52-04** (automática) — Conta desativada não recebe link. Dado uma conta desativada pelo Admin da empresa, quando alguém pede o link com o e-mail dela, então a tela mostra a mesma mensagem do CA-B52-02 e nenhum e-mail sai.
- **CA-B52-05** (automática) — Pedir de novo derruba o link anterior. Dado uma conta ativa que já pediu um link e ainda não usou, quando ela pede outro, então o link novo funciona e o anterior mostra o aviso de link que não vale mais.
- **CA-B52-06** (automática) — Freio de pedidos. Dado um e-mail que já pediu o link 3 vezes na última hora, ou um endereço de internet que já pediu 10 vezes na última hora, quando chega mais um pedido, então a tela avisa que houve tentativas demais e nenhum e-mail sai.
- **CA-B52-07** (automática) — Só pessoa pede o link. Dado um pedido sem a conferência de que é uma pessoa, ou com ela recusada, quando ele chega ao servidor, então é recusado como no cadastro, e nenhum e-mail sai.

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B52-01 | O freio é de 3 pedidos por e-mail e 10 por endereço de internet, por hora | confirmada | Luan, 29/10/2026 |
| SUP-B52-02 | O remetente é "crmatacado exp" <conta@disparos.atacadoexponencial.com> | confirmada | Luan, 29/10/2026 |
| SUP-B52-03 | Se o envio do e-mail falhar, a tela mostra a mesma mensagem de pedido recebido (dizer que falhou revelaria que o e-mail tem conta) | confirmada | Luan, 29/10/2026 |
| SUP-B52-04 | Quem já está logado e abre `/esqueci-minha-senha` vai para o Dashboard, como acontece hoje no login e no cadastro; `/redefinir-senha` abre mesmo logado | confirmada | Luan, 29/10/2026 |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| PER-B52-01 | Por quanto tempo o link vale? | respondida | 1 hora (Luan, 29/10/2026) |

## Cenários

### Happy Path
1. No login, a pessoa clica em "Esqueci minha senha" e vai para `/esqueci-minha-senha`.
2. Digita o e-mail, a conferência de pessoa termina (o botão espera, como no cadastro) e ela clica em "Enviar link".
3. O servidor confere, nesta ordem: e-mail válido, conferência de pessoa, freio (3 por e-mail e 10 por endereço, por hora) e registra a tentativa.
4. Procura a conta ativa pelo e-mail (função do banco: usuário no Auth com perfil `active`). Achou: derruba os links não usados daquela conta, grava o novo (só o hash do código, vence em 1 hora) e manda o e-mail de "crmatacado exp" <conta@disparos.atacadoexponencial.com> com o link `https://<host>/redefinir-senha?codigo=<código>`.
5. A tela troca o formulário pela mensagem: "Se esse e-mail tiver conta no crmatacado exp, enviamos um link para criar uma senha nova. Ele vale por 1 hora."

### Edge Cases
- E-mail sem conta, conta desativada ou usuário do Auth sem perfil: mesma mensagem, nada gravado, nada enviado.
- E-mail com maiúsculas e espaços: procurado em minúsculas, sem espaços.
- Envio do e-mail falhou: mesma mensagem (SUP-B52-03); o link fica gravado e um pedido novo o derruba.
- Logado abrindo `/esqueci-minha-senha`: vai para o Dashboard (SUP-B52-04), pelo middleware, como `/login` e `/cadastro`.
- O link do e-mail aponta para `/redefinir-senha`, que nasce na B52-02.

### Cenário de Erro
- E-mail em branco ou inválido: "Digite um e-mail válido."
- Sem conferência ou recusada: "Não foi possível confirmar que você é uma pessoa. Tente de novo."
- Freio: "Muitas tentativas. Aguarde alguns minutos e tente de novo." (o mesmo aviso do login e do cadastro).

## Prova

| Critério | Prova | Onde | O que confere |
|---|---|---|---|
| CA-B52-01 | automática | `src/test/esqueci-minha-senha.test.tsx` | o login tem o link "Esqueci minha senha" para `/esqueci-minha-senha` |
| CA-B52-02 | automática | `src/test/esqueci-minha-senha.integration.test.ts` e `src/test/esqueci-minha-senha.test.tsx` | para a conta ativa (e-mail em maiúsculas), o Resend recebe o envio para ela, do remetente combinado, com o link e "1 hora"; fica gravado um link pendente de 1 hora só pelo hash; a tela mostra a mensagem de pedido recebido |
| CA-B52-03 | automática | `src/test/esqueci-minha-senha.integration.test.ts` | e-mail sem conta: mesma resposta, nada gravado, nada enviado |
| CA-B52-04 | automática | `src/test/esqueci-minha-senha.integration.test.ts` | conta desativada: mesma resposta, nada gravado, nada enviado |
| CA-B52-05 | automática | `src/test/esqueci-minha-senha.integration.test.ts` | o segundo pedido derruba o link anterior (não vale mais) e o novo vale |
| CA-B52-06 | automática | `src/test/esqueci-minha-senha.integration.test.ts` e `src/test/esqueci-minha-senha.test.tsx` | o 4º pedido do mesmo e-mail e o 11º do mesmo endereço na hora são recusados sem envio; a tela mostra o aviso de tentativas demais |
| CA-B52-07 | automática | `src/test/esqueci-minha-senha.integration.test.ts` | sem conferência e com conferência recusada: recusado, nada gravado, nada enviado |

## Banco de Dados

- Tabela nova `redefinicoes_de_senha` (RLS ligado, sem política, sem grant para `anon` e `authenticated`)
  - `id` (uuid, pk), `user_id` (uuid → auth.users, cascade), `token_hash` (text, único), `criado_em`, `expira_em`, `usado_em` (B52-02), `cancelado_em` (derrubado por pedido novo)
- Função nova `conta_ativa_por_email(p_email text) returns uuid` — o usuário do Auth com aquele e-mail (minúsculas) e perfil `active`; nulo nos outros casos. Só a chave de serviço executa.
- `tentativas_de_acesso`: o tipo `senha_nova` entra na lista permitida.

## Arquivos

- **Criar:** `supabase/migrations/20261029000005_redefinicoes_de_senha.sql` — tabela, função e o tipo novo de tentativa
- **Criar:** `src/lib/resend.ts` — o envio pela API do Resend, que saiu de `email-do-convite.ts` para servir aos dois e-mails
- **Modificar:** `src/lib/email-do-convite.ts` — passa a usar `src/lib/resend.ts`
- **Criar:** `src/lib/email-de-senha-nova.ts` — texto do e-mail de senha nova
- **Modificar:** `src/lib/limite-de-tentativas.ts` — tipo `senha_nova`
- **Criar:** `src/app/esqueci-minha-senha/actions.ts` — `pedirLinkDeSenhaNova`
- **Criar:** `src/app/esqueci-minha-senha/page.tsx` — formulário, conferência de pessoa e mensagem de pedido recebido
- **Modificar:** `src/app/login/page.tsx` — link "Esqueci minha senha"
- **Modificar:** `src/middleware.ts` — `/esqueci-minha-senha` pública e rota de entrada (logado vai ao Dashboard)
- **Criar:** `src/test/esqueci-minha-senha.integration.test.ts` — CA-B52-02 a 07
- **Criar:** `src/test/esqueci-minha-senha.test.tsx` — telas: CA-B52-01, 02 e 06

Reuso: `novoCodigoDeConvite` e `hashDoCodigo` (`src/lib/convites.ts`) para o código do link, `passouNaConferenciaHumana` e `ConferenciaHumana` (B50), `passouDoLimite`, `registrarTentativa`, `chaveDoIp`, `chaveDoEmail`, `ipDaRequisicao` e `AVISO_MUITAS_TENTATIVAS`, o host do pedido como em `src/app/(auth)/plataforma/convites/actions.ts`, `TemaClaro` e `LogoDaMarca`.

## Dependências Externas

- API do Resend (a mesma da B51-03), sem pacote novo.

## Checklist

- [x] Migration da tabela, da função e do tipo de tentativa, aplicada no banco de teste
- [x] Envio do Resend em `src/lib/resend.ts`, usado pelo convite e pela senha nova
- [x] Action de pedir o link com conferência, freio, conta ativa e link anterior derrubado
- [x] Tela `/esqueci-minha-senha` e link no login
- [x] Middleware com a rota nova
- [x] Testes do CA-B52-01 a 07
