# B51-03: Convite por e-mail (Resend)

**Tipo:** Implementação
**Página:** `/plataforma/convites` e e-mail do convite
**Repositório:** `crm-exponencial`
**Spec:** `docs/specs-arquivadas/spec-cadastro-por-convite.md`

## Descrição

Convite com e-mail: o CRM recusa e-mail que já tem conta, manda o e-mail do convite pelo Resend e o reenvia ao gerar link novo; se o envio falha, mostra o link para mandar por outro meio.

## Pronto quando

Marcelle cria um convite para um e-mail, o e-mail chega com o botão que abre `/cadastro` com o e-mail já preenchido e travado.

## Critérios de aceite

- **CA-B51-13** (automática) — Convite para e-mail manda o e-mail. Dado Marcelle na tela de convites, quando ela cria um convite para `ana@exemplo.com` com validade de 7 dias, então um e-mail sai para `ana@exemplo.com` com o link do convite, o link aparece para copiar, e a lista mostra o convite pendente, vencendo daqui a 7 dias.
- **CA-B51-17** (automática) — E-mail que já tem conta. Dado um e-mail que já tem conta no CRM, quando Marcelle tenta criar um convite para ele, então a tela avisa que esse e-mail já tem conta e nenhum convite é criado.
- **CA-B51-18** (automática) — E-mail que não saiu. Dado o envio de e-mail fora do ar, quando Marcelle cria um convite para um e-mail, então o convite é criado, a tela avisa que o e-mail não saiu e mostra o link para ela mandar por outro meio.
- **CA-B51-20** (automática) — Gerar link novo. Dado um convite pendente para um e-mail, quando Marcelle gera um link novo para ele, então o link anterior cai no aviso de convite inválido, o novo abre o formulário, e o e-mail é enviado de novo com o link novo.
- **CA-B51-22** (manual) — E-mail chega e abre o cadastro. Dado um convite criado na produção para um e-mail do Luan, quando o Luan abre a caixa de entrada, então o e-mail chegou na caixa de entrada (não no spam), com o remetente e o texto combinados (remetente "crmatacado exp" <convite@disparos.atacadoexponencial.com>), e o botão abre `/cadastro` com o e-mail já preenchido.

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B51-02 | O link só aparece para copiar logo depois de criado; para mandar de novo, gera-se um link novo e o anterior para de funcionar | confirmada | Sim, link novo a cada reenvio (Luan, 29/10/2026) |
| SUP-B51-04 | O banco de teste também usa o cadastro por convite, com os mesmos dois e-mails da plataforma, e os testes automáticos não mandam e-mail de verdade | confirmada | Sim, o banco de teste também exige convite (Luan, 29/10/2026) |
| SUP-B51-05 | Gerar link novo para um convite pendente mantém a validade dele; para prorrogar, cria-se outro convite | confirmada | Mantém a validade (Luan, 29/10/2026) |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| PER-B51-01 | Os dois formatos de convite (para um e-mail e link avulso) existem? | respondida | Sim, os dois (Luan, 29/10/2026) |
| PER-B51-06 | Qual é o remetente do e-mail (nome e endereço)? | respondida | "crmatacado exp" <convite@disparos.atacadoexponencial.com> (Luan, 29/10/2026) |

## Cenários

### Happy Path
1. Marcelle digita `ana@exemplo.com` no campo "E-mail (opcional)", mantém 7 dias e cria o convite.
2. O servidor confere a plataforma, a validade, o formato do e-mail (guardado em minúsculas) e que o e-mail ainda não tem conta.
3. Grava o convite com o e-mail e manda pelo Resend, de "crmatacado exp" <convite@disparos.atacadoexponencial.com>: assunto "Seu convite para o crmatacado exp", botão "Criar minha conta" com o link e a validade no fuso da empresa de quem criou.
4. A tela avisa "Convite enviado para ana@exemplo.com" e mostra o link para copiar; a lista ganha a linha pendente.
5. "Gerar link novo" num convite com e-mail troca o código, mantém a validade (SUP-B51-05) e manda o e-mail de novo, com o link novo.

### Edge Cases
- E-mail com maiúsculas ou espaços: guardado e comparado em minúsculas, sem espaços.
- E-mail que já tem conta: recusa antes de gravar, sem mandar nada.
- Sem `RESEND_API_KEY` no ambiente: o convite é criado e a tela avisa que o e-mail não saiu (mesmo caminho do Resend fora do ar).
- Nos testes, `RESEND_API_KEY` é uma chave falsa fixada no `vitest.config.ts` e a chamada ao Resend é interceptada: nenhum e-mail de verdade sai (SUP-B51-04).

### Cenário de Erro
- E-mail inválido: "Digite um e-mail válido ou deixe em branco."
- E-mail com conta: "Este e-mail já tem conta no CRM."
- Resend recusou ou não respondeu em 10 s: "O convite foi criado, mas o e-mail não saiu. Copie o link abaixo e mande por outro meio."

## Prova

| Critério | Prova | Onde | O que confere |
|---|---|---|---|
| CA-B51-13 | automática | `src/test/convite-por-email.integration.test.ts` e `src/test/convite-por-email.test.tsx` | o Resend recebe um envio para o e-mail, do remetente combinado, com o link devolvido; o convite fica pendente com o e-mail e 7 dias; a tela mostra o link e o aviso de enviado |
| CA-B51-17 | automática | `src/test/convite-por-email.integration.test.ts` e `src/test/convite-por-email.test.tsx` | e-mail que já tem conta é recusado, sem convite gravado e sem envio; a tela mostra o aviso |
| CA-B51-18 | automática | `src/test/convite-por-email.integration.test.ts` e `src/test/convite-por-email.test.tsx` | com o Resend falhando, o convite fica gravado e a ação diz que o e-mail não saiu; a tela avisa e mostra o link |
| CA-B51-20 | automática | `src/test/convite-por-email.integration.test.ts` | depois de gerar link novo, o código antigo não vale, o novo vale, a validade é a mesma e o Resend recebe o link novo |
| CA-B51-22 | manual | roteiro abaixo | o e-mail chega na caixa de entrada, com o remetente e o texto combinados, e o botão abre o cadastro com o e-mail travado |

### Roteiro manual — CA-B51-22
1. Com a B51 no ar (ou no preview do branch, que já tem a `RESEND_API_KEY`), entre como `luan@seteads.com` e abra **Convites** no menu.
2. Crie um convite para um e-mail seu que **não** tenha conta no CRM, com 1 dia.
3. Abra a caixa de entrada desse e-mail: o convite deve estar lá (não no spam), de **crmatacado exp** <convite@disparos.atacadoexponencial.com>, com o assunto "Seu convite para o crmatacado exp" e a validade.
4. Clique em **Criar minha conta**: abre `/cadastro` com o e-mail preenchido e travado.
5. Volte a Convites e cancele o convite (ou cadastre uma empresa `[TESTE]` e apague depois).

## Banco de Dados

- Função nova `email_ja_tem_conta(p_email text) returns boolean` — confere `auth.users` em minúsculas; só a chave de serviço executa.

## Arquivos

- **Criar:** `supabase/migrations/20261029000004_email_ja_tem_conta.sql` — a função acima
- **Criar:** `src/lib/email-do-convite.ts` — monta e manda o e-mail do convite pela API do Resend (`fetch`, 10 s de limite); devolve se saiu
- **Modificar:** `src/app/(auth)/plataforma/convites/actions.ts` — `criarConvite` aceita e-mail, recusa e-mail com conta e manda o e-mail; `gerarLinkNovo` manda de novo
- **Modificar:** `src/app/(auth)/plataforma/convites/convites-client.tsx` — campo de e-mail opcional, aviso de enviado e de e-mail que não saiu
- **Modificar:** `vitest.config.ts` — chave falsa do Resend nos testes
- **Modificar:** `.env.example` — `RESEND_API_KEY`
- **Criar:** `src/test/convite-por-email.integration.test.ts` — CA-B51-13, 17, 18 e 20
- **Criar:** `src/test/convite-por-email.test.tsx` — tela: CA-B51-13, 17 e 18

## Dependências Externas

- API do Resend (`POST https://api.resend.com/emails`, documentação oficial em resend.com/docs/api-reference/emails/send-email), sem pacote novo.

## Checklist

- [x] Migration da função `email_ja_tem_conta`, aplicada no banco de teste
- [x] `src/lib/email-do-convite.ts`
- [x] Criar convite com e-mail e gerar link novo mandando o e-mail
- [x] Tela com campo de e-mail e avisos
- [x] Chave falsa do Resend nos testes e `RESEND_API_KEY` no `.env.example`
- [x] Testes do CA-B51-13, 17, 18 e 20

## Testes manuais

| Critério | Conferido por | Dia |
|---|---|---|
| CA-B51-22 | Luan | 29/10/2026 |
