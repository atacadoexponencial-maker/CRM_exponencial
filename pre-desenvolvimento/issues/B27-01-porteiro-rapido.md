# B27-01: Porteiro rápido, com o aviso de conta desativada mantido

**Tipo:** Implementação
**Página:** Porteiro das telas logadas (todas as telas fora das públicas)
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-porteiro-rapido.md`

## Descrição

O porteiro passa a conferir a sessão localmente, sem perguntar ao serviço de logins a
cada clique. A percepção de usuário desativado sai do porteiro e vai para o servidor
das telas e das ações, que fica ao lado do serviço de logins. Assim o desativado
continua barrado no clique seguinte e vê o aviso.

## Pronto quando

Os cliques nas telas logadas ficam cerca de 0,2 s mais rápidos na produção, e um
usuário desativado com o CRM aberto continua indo para o login com o aviso de conta
desativada na próxima tela que abrir.

## Critérios de aceite

- **CA-B27-01** (automática) — Clique de quem está logado não pergunta ao serviço de logins. Dado uma pessoa com sessão válida, quando ela abre uma tela logada, então o porteiro deixa passar sem nenhuma consulta ao serviço de logins (nenhuma chamada de rede ao Auth).
- **CA-B27-02** (automática) — Sem sessão, vai para o login. Dado um visitante sem sessão, quando ele abre `/contatos`, então ele cai em `/login`, sem aviso.
- **CA-B27-03** (automática) — Sessão adulterada não entra. Dado uma sessão com a assinatura alterada ou feita com outra chave, quando ela tenta abrir uma tela logada, então cai em `/login`.
- **CA-B27-04** (automática) — Sessão vencida é renovada e a tela abre. Dado uma pessoa cuja sessão venceu, mas que ainda tem a renovação válida, quando ela abre uma tela logada, então a tela abre, e a sessão nova volta gravada no navegador.
- **CA-B27-05** (automática) — Telas públicas continuam abertas. Dado um visitante sem sessão, quando ele abre `/login`, `/cadastro`, `/politica-de-privacidade` ou uma loja, então a página abre normalmente.
- **CA-B27-06** (manual) — Cliques ficam mais rápidos na produção. Dado a mudança no ar, quando a lista do WhatsApp é aberta 6 vezes por um admin logado, com o mesmo roteiro de medição de 16/10, então a mediana fica em 0,45 s ou menos (era 0,64 s). O resultado é registrado na issue.
- **CA-B27-07** (automática) — Desativado é barrado na próxima tela, com o aviso. Dado uma pessoa logada que acabou de ser desativada por um admin, quando ela abre outra tela logada (navegando pelo menu ou recarregando), então ela cai no login com o aviso de conta desativada.
- **CA-B27-08** (automática) — Ação de desativado é recusada. Dado uma pessoa desativada com uma tela ainda aberta, quando ela tenta uma ação dessa tela, então a ação é recusada, e nenhum dado é lido nem gravado.
- **CA-B27-09** (automática) — Desativar e reativar continuam funcionando como na B20-02. Dado os testes de usuário desativado da B20-02, quando a suíte roda depois da mudança, então todos continuam passando (login recusado com o aviso, sessão antiga sem dados, reativação devolve o acesso).
- **CA-B27-10** (manual) — Teste com um usuário real desativado na produção. Dado a Marcelle logada como admin e um usuário de teste logado em outra janela, quando ela desativa esse usuário e ele clica em outra tela do menu, então ele vai para o login com o aviso de conta desativada.

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B27-01 | Todas as sessões ativas são assinadas com a chave do tipo que permite conferência local; uma sessão antiga com chave diferente não passaria a ser aceita sem conferência | confirmada | Conferido em 17/10 por Claude: a lista pública de chaves do projeto tem uma só, ES256. Sessão com outra chave cai na conferência pelo serviço de logins (mais lenta, nunca aceita sem conferir). Aprovada pela Marcelle com a spec, 17/10. |
| SUP-B27-02 | Os dados continuam fechados para o desativado mesmo que alguma tela não confira o login: quem fecha é o banco (perfil inativo não enxerga dado), não o porteiro | confirmada | Conferido em 17/10 por Claude nos testes da B20-02. Aprovada pela Marcelle com a spec, 17/10. |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| PER-B27-01 | Quando um usuário com o CRM aberto é desativado, ele deve ser barrado no próximo clique (como hoje) ou pode seguir navegando, sem dados, até a sessão vencer (até 1 h)? | respondida | Marcelle, 17/10/2026: no próximo clique, como hoje. |

## Cenários

### Happy Path
1. A pessoa logada clica em uma tela. O porteiro lê a sessão do cookie e confere a assinatura com a chave pública do projeto. A chave fica guardada em memória por 10 minutos (`getClaims`). Não há ida ao serviço de logins, e o porteiro deixa passar.
2. A tela abre no servidor (Oregon). `sessaoAtual()` confere o usuário ao lado do banco (`getUser`, algumas dezenas de ms, como já fazia) e devolve o perfil.

### Edge Cases
- **Sessão vencida com renovação válida:** o porteiro renova (`getClaims` → `getSession` faz o refresh) e grava os cookies novos na resposta.
- **Chave guardada vencida (mais de 10 min) ou instância nova:** uma ida para buscar a lista pública de chaves. É a lista, não o serviço de logins, e ela tem cache na borda da Supabase.
- **Sessão assinada com chave simétrica, ou sem `kid`:** o `getClaims` cai sozinho no `getUser`, que é lento, mas nunca aceita sem conferir.
- **Usuário desativado com o CRM aberto:** o porteiro deixa passar, porque a assinatura ainda vale. A tela chama `sessaoAtual()`, o `getUser` responde `user_banned` e `sessaoAtual()` manda para `/login?motivo=desativada`. Se for uma action, o redirect leva ao login com o aviso.
- **O layout `(auth)` engole erros** no `try/catch` de `dadosDoUsuario`. O redirect pode ser engolido ali, mas a página chama a mesma `sessaoAtual()` (memoizada) e o redirect sai pela página.

### Cenário de Erro
- **Assinatura inválida:** `getClaims` devolve erro e o porteiro manda para `/login`, sem aviso.
- **Renovação recusada por ban** (`error.code === 'user_banned'`): o porteiro manda para `/login?motivo=desativada`, como hoje.
- **Lista de chaves fora do ar:** `getClaims` devolve erro e o porteiro manda para o login. É o mesmo que acontece hoje se o Auth cair.

## Prova

| Critério | Prova | Onde | O que confere |
|---|---|---|---|
| CA-B27-01 | automática | `src/test/porteiro-rapido.test.ts` | com sessão válida e chave já guardada, o porteiro deixa passar sem nenhuma requisição de rede (e nunca chama `/auth/v1/user`) |
| CA-B27-02 | automática | `src/test/porteiro-rapido.test.ts` | sem cookie de sessão, `/contatos` responde redirect para `/login` sem `motivo` |
| CA-B27-03 | automática | `src/test/porteiro-rapido.test.ts` | sessão assinada com outra chave ou com o conteúdo alterado → redirect para `/login` |
| CA-B27-04 | automática | `src/test/porteiro-rapido.test.ts` | sessão vencida com renovação válida → passa, e a resposta traz o cookie de sessão novo |
| CA-B27-05 | automática | `src/test/porteiro-rapido.test.ts` | `/login`, `/cadastro`, `/politica-de-privacidade` e `/loja/x` passam sem sessão e sem rede |
| CA-B27-06 | manual | roteiro abaixo | mediana da lista do WhatsApp ≤ 0,45 s |
| CA-B27-07 | automática | `src/test/sessao-desativado.test.ts` | `sessaoAtual()` de usuário banido redireciona para `/login?motivo=desativada`, e nenhuma página de `(auth)` confere o login por fora de `sessaoAtual()` |
| CA-B27-08 | automática | `src/test/sessao-desativado.test.ts` | uma action (listar mensagens rápidas) chamada por banido é interrompida pelo redirect antes de qualquer leitura no banco |
| CA-B27-09 | automática | `src/test/usuario-desativado-seguranca.integration.test.ts` | os testes da B20-02 (agora com o código no nome) continuam passando |
| CA-B27-10 | manual | roteiro abaixo | desativado com o CRM aberto vai ao login com o aviso no próximo clique |

### Roteiro manual — CA-B27-06
1. Com a mudança no ar, rodar o roteiro de medição de 16/10 (login temporário de admin, 6 aberturas de `/configuracoes/whatsapp`, apagar o login no fim).
2. A mediana deve ficar em 0,45 s ou menos. Anotar o número nesta issue.

### Roteiro manual — CA-B27-10
1. A Marcelle entra como admin em uma janela. Em outra janela anônima, entra um usuário de teste da mesma empresa.
2. Ela desativa esse usuário em Configurações → Usuários.
3. Na janela do usuário de teste, clicar em outra tela do menu.
4. Deve aparecer a tela de login com o aviso de conta desativada.

## Arquivos

- **Modificar:** `src/middleware.ts`: trocar `supabase.auth.getUser()` por `supabase.auth.getClaims()`. Manter o `motivo=desativada` quando o erro vier com `user_banned` (renovação recusada).
- **Modificar:** `src/lib/sessao.ts`: quando o `getUser` devolver `error.code === 'user_banned'`, chamar `redirect('/login?motivo=desativada')`. Reusar o texto do motivo já usado pelo middleware e pela tela de login (`src/app/login/page.tsx` lê `motivo === "desativada"`).
- **Modificar:** `src/app/(auth)/campanhas/[id]/page.tsx`: trocar o `getUser` + leitura de `profiles` pela `sessaoAtual()` já existente.
- **Modificar:** `src/app/(auth)/campanhas/[id]/relatorio/page.tsx`: idem.
- **Modificar:** `src/app/(auth)/contatos/[id]/page.tsx`: idem.
- **Modificar:** `src/app/(auth)/sequencias/[id]/page.tsx`: idem.
- **Modificar:** `src/app/(auth)/configuracoes/whatsapp/[id]/saude/page.tsx`: idem.
- **Modificar:** `src/app/(auth)/configuracoes/whatsapp/[id]/ritmo/page.tsx`: idem.
- **Criar:** `src/test/porteiro-rapido.test.ts`: o porteiro com chave ES256 gerada no teste, lista de chaves e Auth falsos (fetch contado).
- **Criar:** `src/test/sessao-desativado.test.ts`: `sessaoAtual()` com usuário banido, a action recusada e a varredura das páginas.
- **Modificar:** `src/test/usuario-desativado-seguranca.integration.test.ts`: acrescentar `(CA-B27-09)` ao nome dos testes da B20-02.

## Dependências Externas

- `@supabase/ssr` 0.10.2 / `@supabase/supabase-js` 2.104.1, já instalados: `auth.getClaims()`, que a documentação da Supabase recomenda para o middleware no lugar de `getUser()`.

## Checklist

- [x] Middleware usa `getClaims()` e mantém o `motivo=desativada`
- [x] `sessaoAtual()` redireciona usuário banido para o login com o aviso
- [x] As 6 páginas usam `sessaoAtual()`
- [x] Testes `porteiro-rapido` e `sessao-desativado` escritos e passando
- [x] Testes da B20-02 com o código CA-B27-09 e passando
- [x] Build e suíte completa

Os testes manuais (CA-B27-06 e CA-B27-10) são acompanhados pelo auditor, fora do checklist.

## Medição na produção (CA-B27-06), 17/10/2026

Feita por Claude após o deploy de `387ef37`, com o mesmo roteiro de 16/10 (admin temporário na Marcelle Midias, apagado no fim). Mediana de 6 aberturas:

| Tela | Antes (16-17/10) | Depois |
|---|---|---|
| Lista do WhatsApp | 0,64 s | **0,435 s** |
| Saúde (número real) | 0,86 s | 0,68 s |
| Ritmo (número real) | 0,95 s | 0,69 s |
| Saúde/Ritmo sem gateway | 0,65 s | 0,42 s |

Meta: ≤ 0,45 s. Falta a Marcelle aceitar o resultado para registrar.

## Testes manuais

| Critério | Conferido por | Dia |
|---|---|---|
| CA-B27-06 | Marcelle | 19/10/2026 |
