# B20-05: Freio de tentativas no cadastro e no login

**Tipo:** Implementação
**Página:** Cadastro (`/cadastro`) e Login (`/login`)
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-seguranca-rodada-2.md` — módulo 5

## Descrição

Cadastro e login passam a contar tentativas no servidor: até 5 cadastros por hora por
endereço de internet; até 10 senhas erradas em 15 minutos por e-mail e 30 por endereço.
Passou do limite, a tela mostra "Muitas tentativas. Aguarde alguns minutos e tente de
novo." e o servidor recusa sem criar nada nem consultar a senha. Login certo não conta.

## Pronto quando

Cadastrar e entrar normalmente continuam iguais; e testes automatizados provam que o 6º
cadastro na mesma hora pelo mesmo endereço é recusado sem criar nada, e que a 11ª senha
errada para o mesmo e-mail é recusada mesmo se estiver certa, até o tempo passar.

## Cenários

### Happy Path
1. Tabela `tentativas_de_acesso` guarda cada tentativa contada: tipo (`cadastro` ou
   `login`), chave e hora. A chave é um **hash SHA-256** de `ip:<endereço>` ou
   `email:<e-mail>` — a tabela não guarda e-mail nem IP em claro. RLS ligada e sem
   policy: só a chave de serviço lê e grava.
2. `src/lib/limite-de-tentativas.ts` (novo, só servidor):
   - `ipDaRequisicao()` — primeiro endereço de `x-forwarded-for` (a Vercel sobrescreve
     esse cabeçalho; não dá para o navegador forjar), com `x-real-ip` de reserva.
   - `passouDoLimite(tipo, regras)` — conta as tentativas de cada chave dentro da janela
     e diz se alguma chegou ao limite.
   - `registrarTentativa(tipo, chaves)` — grava as tentativas e apaga as com mais de 1 dia.
3. **Cadastro** (`cadastrarEmpresa`): depois de validar os dados, se o endereço já fez
   5 cadastros na última hora → `{ erro: "limite" }` sem criar nada; senão registra a
   tentativa e segue. A tela mostra "Muitas tentativas. Aguarde alguns minutos e tente de novo."
4. **Login** (`realizarLogin`): antes de consultar a senha, se o e-mail tem 10 erros nos
   últimos 15 minutos ou o endereço tem 30 → devolve a mensagem de limite. Senha errada
   registra uma tentativa para o e-mail e outra para o endereço. Login certo não registra.

### Edge Cases
- Sem cabeçalho de IP (ambiente local): a chave do endereço vira `ip:desconhecido` — o
  limite por e-mail continua valendo.
- E-mail com maiúsculas/espaços: normalizado (`trim().toLowerCase()`) antes do hash.
- Conta desativada (B20-02) conta como tentativa errada? Não — a resposta de conta
  desativada não registra tentativa.

### Cenário de Erro
- Falha ao ler/gravar a tabela: o freio não bloqueia o uso legítimo (segue sem contar) —
  melhor deixar entrar do que derrubar o login de todos por causa do contador.

## Banco de Dados

- Tabela nova `public.tentativas_de_acesso`
  - `id` (bigint identity) — chave
  - `tipo` (text, `cadastro` | `login`)
  - `chave` (text) — hash SHA-256 de `ip:…` ou `email:…`
  - `criado_em` (timestamptz, default now())
  - índice em `(tipo, chave, criado_em)`
  - RLS ligada, sem policy; `revoke all` de `anon` e `authenticated`

## Arquivos

- **Criar:** `supabase/migrations/20261006000008_tentativas_de_acesso.sql`
- **Criar:** `src/lib/limite-de-tentativas.ts`
- **Modificar:** `src/app/cadastro/actions.ts` — checa e registra antes de criar; novo desfecho `limite`.
- **Modificar:** `src/app/cadastro/page.tsx` — mostra a mensagem de limite.
- **Modificar:** `src/app/login/actions.ts` — checa antes de consultar a senha; registra erro.
- **Modificar:** `src/app/login/avisos.ts` — texto da mensagem de limite (usado também pelo cadastro).
- **Modificar:** `src/test/cadastro-empresa.integration.test.ts`, `src/test/cadastro-seguranca.integration.test.ts`, `src/test/usuario-desativado-seguranca.integration.test.ts` — simulam um IP próprio por rodada (as actions agora leem `next/headers`, e os testes do cadastro criam mais de 5 empresas por rodada).
- **Criar:** `src/test/limite-de-tentativas-seguranca.integration.test.ts` — contra o Supabase real, com o IP simulado.

## Checklist

- [x] Migration aplicada; anon/authenticated sem acesso à tabela
- [x] Biblioteca de limite com hash, janela e limpeza
- [x] Cadastro recusa a partir do 6º na hora pelo mesmo endereço, sem criar nada
- [x] Login recusa a partir do 11º erro no e-mail (ou 31º no endereço), mesmo com a senha certa; erro registra, acerto não
- [x] Testes novos e existentes (cadastro, usuário desativado) passando; build e lint ok
