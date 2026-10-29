# B52-02: Criar a senha nova pelo link

**Tipo:** Implementação
**Página:** `/redefinir-senha`
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-esqueci-minha-senha.md`

## Descrição

O link do e-mail abre a tela de senha nova sem gastar o link; salvar uma senha válida troca a senha, entra no CRM e encerra as outras sessões; link que não vale mostra o aviso.

## Pronto quando

Pelo link do e-mail a pessoa cria a senha nova e cai no Dashboard logada; o outro aparelho é deslogado; o mesmo link depois disso mostra o aviso de link que não vale mais.

## Critérios de aceite

- **CA-B52-08** (automática) — Link que vale abre o formulário. Dado um link recém-pedido, quando a pessoa o abre (duas vezes, como faz um programa de e-mail que confere links), então nas duas vezes aparece o formulário de senha nova, e o link continua valendo.
- **CA-B52-09** (automática) — Senha nova entra direto. Dado um link que vale, quando a pessoa salva uma senha nova válida, então a senha antiga para de funcionar, a nova funciona, e ela cai no Dashboard já logada.
- **CA-B52-10** (automática) — Outras sessões encerradas. Dado a conta logada em outro aparelho, quando a senha é trocada pelo link, então a sessão do outro aparelho deixa de valer e ele volta ao login.
- **CA-B52-11** (automática) — Link que não vale mostra aviso. Dado um link vencido (mais de 1 hora), um já usado, um derrubado por pedido novo e um inventado, quando a pessoa abre cada um, ou tenta salvar a senha por ele, então a tela diz que o link não vale mais e oferece pedir outro, sem formulário, e nenhuma senha muda (a mesma mensagem para os quatro casos).
- **CA-B52-12** (automática) — Senha inválida não gasta o link. Dado um link que vale, quando a pessoa salva uma senha com menos de 8 caracteres, ou com a confirmação diferente, então a tela mostra o erro, a senha não muda e o link continua valendo.
- **CA-B52-13** (automática) — Conta desativada depois do pedido. Dado um link pedido por uma conta que o Admin desativou em seguida, quando a pessoa tenta salvar a senha nova, então a senha não muda e a tela mostra o aviso de link que não vale mais.
- **CA-B52-14** (manual) — E-mail chega e abre a tela de senha nova. Dado a B52 no ar, quando o Luan pede o link para uma conta dele e abre a caixa de entrada, então o e-mail chegou na caixa de entrada (não no spam), com o remetente e o texto combinados, e o botão abre a tela de senha nova; salvando, ele entra no CRM.

## Suposições

Nenhuma.

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| PER-B52-01 | Por quanto tempo o link vale? | respondida | 1 hora (Luan, 29/10/2026) |
| PER-B52-02 | Depois de criar a senha nova, entra direto ou volta ao login? | respondida | Entra direto no CRM (Luan, 29/10/2026) |
| PER-B52-03 | As outras sessões da conta são encerradas? | respondida | Sim (Luan, 29/10/2026) |

## Cenários

### Happy Path
1. A pessoa abre `/redefinir-senha?codigo=<código>` pelo e-mail. A página (do servidor) confere pelo hash: link pendente, sem derrubar, dentro de 1 hora e conta ativa. Só olha, não gasta.
2. Aparece o formulário "Senha nova" e "Confirmação da senha".
3. Ela salva. O servidor confere a senha (8 caracteres ou mais, confirmação igual) e só então gasta o link, numa função do banco que marca `usado_em` se ele ainda vale e a conta ainda está ativa.
4. Troca a senha no Auth, entra com a senha nova (os cookies da sessão vão para o navegador dela) e encerra as outras sessões daquela conta.
5. A tela leva ao Dashboard, já logada.

### Edge Cases
- Programa de e-mail que abre o link antes da pessoa: abrir não gasta (CA-B52-08).
- Dois cliques em "Salvar" ou duas abas: a função do banco só deixa um gastar o link; o outro recebe o aviso de link que não vale mais.
- Troca de senha recusada pelo Auth depois de gastar o link: o link volta a valer e a tela mostra "Não foi possível salvar a senha. Tente novamente."
- Logado em outra conta e abrindo o link: a página abre (SUP-B52-04) e, ao salvar, a sessão passa a ser a da conta do link.
- Outro aparelho: a sessão dele é encerrada no Auth; a próxima tela ou ação dele cai no login.

### Cenário de Erro
- Link que não vale (vencido, usado, derrubado, inventado, ou conta desativada): "Este link não vale mais. Peça outro para criar sua senha nova.", com o link "Pedir outro link" para `/esqueci-minha-senha`.
- Senha curta: "A senha precisa ter pelo menos 8 caracteres."; confirmação diferente: "As senhas não coincidem."

## Prova

| Critério | Prova | Onde | O que confere |
|---|---|---|---|
| CA-B52-08 | automática | `src/test/redefinir-senha.integration.test.ts` e `src/test/redefinir-senha.test.tsx` | conferir o link duas vezes não o gasta (continua pendente e salva depois); a página com link que vale mostra o formulário |
| CA-B52-09 | automática | `src/test/redefinir-senha.integration.test.ts` e `src/test/redefinir-senha.test.tsx` | depois de salvar, a senha antiga não entra e a nova entra, e o cliente da tela fica com sessão; a tela vai para `/dashboard` |
| CA-B52-10 | automática | `src/test/redefinir-senha.integration.test.ts` | a sessão aberta antes em outro cliente deixa de valer no Auth (getUser e renovar recusados) |
| CA-B52-11 | automática | `src/test/redefinir-senha.integration.test.ts` e `src/test/redefinir-senha.test.tsx` | vencido, usado, derrubado e inventado não valem na conferência e não salvam, e a senha não muda; a página mostra o aviso e "Pedir outro link", sem formulário |
| CA-B52-12 | automática | `src/test/redefinir-senha.integration.test.ts` e `src/test/redefinir-senha.test.tsx` | senha curta e confirmação diferente: erro, senha igual e link ainda pendente; a tela mostra o erro |
| CA-B52-13 | automática | `src/test/redefinir-senha.integration.test.ts` | conta desativada depois do pedido: não salva, a senha não muda, e a página não mostra o formulário |
| CA-B52-14 | manual | roteiro abaixo | o e-mail chega, o botão abre a tela de senha nova e, salvando, a pessoa entra no CRM |

### Roteiro manual — CA-B52-14
1. Com a B52 no ar (ou no preview do branch), abra `/login` e clique em **Esqueci minha senha**.
2. Peça o link para uma conta sua.
3. O e-mail deve chegar na caixa de entrada (não no spam), de **crmatacado exp** <conta@disparos.atacadoexponencial.com>, com o assunto "Criar uma senha nova no crmatacado exp" e a validade de 1 hora.
4. Clique em **Criar senha nova**, crie a senha e salve: você deve cair no Dashboard já logado.
5. Abra o mesmo link de novo: deve aparecer "Este link não vale mais".

## Banco de Dados

- Função nova `usar_redefinicao_de_senha(p_token_hash text) returns uuid` — marca `usado_em` do link se ele ainda vale (sem uso, sem derrubar, dentro da validade) e a conta tem perfil `active`, e devolve o usuário; nulo nos outros casos. Só a chave de serviço executa.

## Arquivos

- **Criar:** `supabase/migrations/20261029000006_usar_redefinicao_de_senha.sql` — a função acima
- **Criar:** `src/lib/senha-nova.ts` — `linkDeSenhaNovaValido(codigo)` (só confere, não gasta) e os avisos
- **Criar:** `src/app/redefinir-senha/page.tsx` — confere o link e mostra o formulário ou o aviso
- **Criar:** `src/app/redefinir-senha/formulario-senha-nova.tsx` — o formulário, que vai ao Dashboard depois de salvar
- **Criar:** `src/app/redefinir-senha/actions.ts` — `salvarSenhaNova`
- **Modificar:** `src/middleware.ts` — `/redefinir-senha` pública (abre mesmo logado)
- **Criar:** `src/test/redefinir-senha.integration.test.ts` — CA-B52-08 a 13
- **Criar:** `src/test/redefinir-senha.test.tsx` — telas: CA-B52-08, 09, 11 e 12

Reuso: `hashDoCodigo` (`src/lib/convites.ts`), `createServiceClient`, o cliente SSR de `src/integrations/supabase/server.ts` (como no fim do cadastro), `TemaClaro` e `LogoDaMarca`.

## Checklist

- [x] Migration da função `usar_redefinicao_de_senha`, aplicada no banco de teste
- [x] `src/lib/senha-nova.ts`
- [x] Action de salvar: confere a senha, gasta o link, troca a senha, entra e encerra as outras sessões
- [x] Página `/redefinir-senha` com o formulário ou o aviso
- [x] Middleware com a rota nova
- [x] Testes do CA-B52-08 a 13
