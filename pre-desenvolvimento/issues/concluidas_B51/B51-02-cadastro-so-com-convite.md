# B51-02: Cadastro só com convite

**Tipo:** Implementação
**Página:** `/cadastro`
**Repositório:** `crm-exponencial`
**Spec:** `docs/specs-arquivadas/spec-cadastro-por-convite.md`

## Descrição

A tela e a ação de cadastro passam a exigir um convite válido: sem ele, aviso no lugar do formulário; com ele, o cadastro de hoje, gastando o convite uma vez só.

## Pronto quando

`/cadastro` sem link mostra o aviso de cadastro por convite; com um link criado na B51-01 a empresa nasce, e o mesmo link depois disso cai no aviso de convite inválido.

## Critérios de aceite

- **CA-B51-01** (automática) — Sem convite não há formulário. Dado um visitante sem login, quando ele abre `/cadastro` sem link de convite, então a tela diz que o cadastro é feito por convite e não mostra o formulário.
- **CA-B51-02** (automática) — Convite que não vale mostra aviso. Dado um convite vencido, um já usado, um cancelado e um código que não existe, quando o visitante abre `/cadastro` com cada um deles, então a tela diz que o convite não vale mais e que é preciso pedir outro, e não mostra o formulário (a mesma mensagem para os quatro casos).
- **CA-B51-03** (automática) — Convite para e-mail trava o e-mail. Dado um convite válido para `ana@exemplo.com`, quando o visitante abre o link, então o formulário aparece com `ana@exemplo.com` no campo de e-mail, que não pode ser editado.
- **CA-B51-04** (automática) — Servidor recusa e-mail diferente do convite. Dado um convite válido para `ana@exemplo.com`, quando alguém envia o cadastro com esse convite e o e-mail `outro@exemplo.com` (mesmo contornando a tela), então nenhuma conta nem empresa é criada, e o convite continua valendo.
- **CA-B51-05** (automática) — Link avulso aceita qualquer e-mail. Dado um link avulso válido, quando o visitante preenche o formulário com o e-mail dele e envia, então a empresa e o Admin são criados, e a pessoa entra no CRM.
- **CA-B51-06** (automática) — Convite serve uma vez só. Dado um convite que acabou de ser usado num cadastro, quando alguém tenta cadastrar outra empresa com o mesmo convite, então o cadastro é recusado e nenhuma conta nova é criada.
- **CA-B51-07** (automática) — Dois cadastros ao mesmo tempo com o mesmo convite. Dado um convite válido, quando dois cadastros com ele chegam ao mesmo tempo, então só um cria empresa; o outro é recusado e não deixa usuário solto no Auth.
- **CA-B51-08** (automática) — Cadastro sem convite recusado no servidor. Dado alguém que chama a ação de cadastro direto, sem convite ou com convite inventado, quando ela é executada, então nenhuma conta nem empresa é criada.
- **CA-B51-09** (automática) — Falha no cadastro não gasta o convite. Dado um link avulso válido, quando o cadastro falha porque o e-mail já tem conta, então a tela avisa que o e-mail está em uso e o link continua valendo para outra tentativa.
- **CA-B51-10** (automática) — Proteções de hoje continuam. Dado um convite válido, quando o cadastro chega sem a conferência de que é uma pessoa, ou depois de passar do limite de cadastros por hora, então é recusado como hoje, e o convite continua valendo.
- **CA-B51-19** (automática) — Cancelar convite. Dado um convite pendente, quando Luan o cancela, então a lista mostra "cancelado" e o link dele cai no aviso de convite inválido (CA-B51-02).

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B51-01 | Os quatro casos de convite que não vale (vencido, usado, cancelado, inventado) mostram a mesma mensagem, para não dizer a quem tem um link alheio o que aconteceu com ele | confirmada | Mesma mensagem (Luan, 29/10/2026) |
| SUP-B51-04 | O banco de teste também usa o cadastro por convite, com os mesmos dois e-mails da plataforma, e os testes automáticos não mandam e-mail de verdade | confirmada | Sim, o banco de teste também exige convite (Luan, 29/10/2026) |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| PER-B51-01 | Os dois formatos de convite (para um e-mail e link avulso) existem? | respondida | Sim, os dois (Luan, 29/10/2026) |
| PER-B51-04 | O botão da landing muda nesta série? | respondida | Não; depende de conversa com a Marcelle (Luan, 29/10/2026) |

## Cenários

### Happy Path
1. A pessoa abre `/cadastro?convite=<código>`. A página (agora do servidor) confere o convite pelo hash: pendente, sem cancelar e dentro da validade.
2. Link avulso: o formulário de hoje aparece, com o e-mail em branco. Convite para um e-mail: o e-mail vem preenchido e só leitura.
3. Ela envia. A action confere, nesta ordem: dados, conferência de pessoa, limite por hora (como hoje), convite válido e e-mail igual ao do convite. Depois cria o usuário no Auth.
4. A função nova do banco `cadastrar_empresa_com_convite` marca o convite como usado (só se ainda estiver pendente e o e-mail bater), cria a empresa pela `cadastrar_empresa` de sempre e grava a empresa no convite. Tudo numa transação.
5. A pessoa entra no CRM, como hoje.

### Edge Cases
- Dois cadastros ao mesmo tempo com o mesmo convite: os dois passam pela conferência da action, mas no banco o segundo espera a trava da linha do convite, encontra `usado_em` preenchido e a função recusa. A action apaga o usuário do Auth que acabou de criar (o mesmo caminho de "falha no meio" de hoje).
- E-mail com maiúsculas: compara em minúsculas.
- E-mail já em uso: o Auth recusa antes da função do banco, e o convite fica pendente.
- Sem conferência, ou passado o limite por hora: recusa antes de olhar o convite, e o convite fica pendente.
- `cadastrar_empresa` continua existindo, só para a chave de serviço: o `e2e/preview/criar-empresa-teste.cjs` usa ela para recriar a empresa de teste.
- Quem já está logado continua indo para o Dashboard (middleware de hoje).

### Cenário de Erro
- Sem convite: "Cadastro por convite", com o texto de que o cadastro é feito por convite e o link para entrar.
- Convite que não vale, na página ou na hora de enviar: "Este convite não vale mais. Peça um novo a quem te convidou." (a mesma para os quatro casos, SUP-B51-01).
- Falha da função do banco por outro motivo: "Não foi possível concluir o cadastro. Tente novamente.", como hoje.

## Prova

| Critério | Prova | Onde | O que confere |
|---|---|---|---|
| CA-B51-01 | automática | `src/test/cadastro-por-convite.test.tsx` | a página sem convite mostra "Cadastro por convite" e nenhum campo do formulário |
| CA-B51-02 | automática | `src/test/cadastro-por-convite.integration.test.ts` e `src/test/cadastro-por-convite.test.tsx` | vencido, usado, cancelado e inventado não valem na conferência do servidor; a página com convite que não vale mostra o aviso e nenhum campo |
| CA-B51-03 | automática | `src/test/cadastro-por-convite.test.tsx` | com convite para `ana@exemplo.com`, o campo de e-mail mostra esse e-mail e é só leitura |
| CA-B51-04 | automática | `src/test/cadastro-por-convite.integration.test.ts` | cadastro com e-mail diferente do convite é recusado, sem usuário nem empresa, e o convite continua pendente |
| CA-B51-05 | automática | `src/test/cadastro-por-convite.integration.test.ts` | link avulso cria empresa e Admin, e o convite fica usado com a empresa |
| CA-B51-06 | automática | `src/test/cadastro-por-convite.integration.test.ts` | o segundo cadastro com o mesmo convite é recusado e não cria usuário |
| CA-B51-07 | automática | `src/test/cadastro-por-convite.integration.test.ts` | dois cadastros simultâneos: um cria empresa, o outro é recusado e o usuário dele não fica no Auth |
| CA-B51-08 | automática | `src/test/cadastro-por-convite.integration.test.ts` | sem convite ou com convite inventado: recusado, sem usuário nem empresa |
| CA-B51-09 | automática | `src/test/cadastro-por-convite.integration.test.ts` e `src/test/cadastro-por-convite.test.tsx` | e-mail em uso devolve "em uso" e o convite segue pendente; a tela mostra "E-mail já está em uso" |
| CA-B51-10 | automática | `src/test/cadastro-por-convite.integration.test.ts` | sem conferência e depois do limite: recusado como hoje, e o convite segue pendente |
| CA-B51-19 | automática | `src/test/cadastro-por-convite.integration.test.ts` | depois de cancelar pela tela de convites, a lista mostra cancelado e o link não vale mais |

## Banco de Dados

- Função nova `cadastrar_empresa_com_convite(p_user_id, p_nome_empresa, p_nome_responsavel, p_convite_hash, p_email)` → uuid da empresa
  - `update convites set usado_em = now()` onde o hash bate, pendente, dentro da validade e com e-mail nulo ou igual; sem linha, `raise exception 'convite_invalido'`
  - chama `cadastrar_empresa` e grava `workspace_id` no convite
  - só a chave de serviço executa (revoke de `public`, `anon` e `authenticated`)
- `cadastrar_empresa` não muda (migration aditiva).

## Arquivos

- **Criar:** `supabase/migrations/20261029000003_cadastrar_empresa_com_convite.sql` — a função nova
- **Modificar:** `src/lib/convites.ts` — `conviteParaCadastro(codigo)` e o aviso de convite inválido
- **Modificar:** `src/app/cadastro/actions.ts` — exige o convite e usa a função nova
- **Modificar:** `src/app/cadastro/page.tsx` — vira página do servidor: confere o convite e mostra o aviso ou o formulário
- **Criar:** `src/app/cadastro/formulario-cadastro.tsx` — o formulário de hoje, saído da página, com o e-mail do convite travado e o erro de convite inválido
- **Criar:** `src/test/convite-de-teste.ts` — cria convites no banco de teste para os testes do cadastro e os apaga depois
- **Criar:** `src/test/cadastro-por-convite.integration.test.ts` — CA-B51-02, 04 a 10 e 19
- **Criar:** `src/test/cadastro-por-convite.test.tsx` — página: CA-B51-01, 02, 03 e 09
- **Modificar:** `src/test/cadastro-empresa.integration.test.ts` — os cadastros que dão certo passam a levar convite; a falha forçada mira a função nova
- **Modificar:** `src/test/cadastro-seguranca.integration.test.ts` — o cadastro que dá certo leva convite
- **Modificar:** `src/test/conferencia-humana.integration.test.ts` — o cadastro aceito (CA-B50-10) leva convite
- **Modificar:** `src/test/fim-das-sequencias.test.tsx` — o mock devolve um convite e espera a função nova
- **Modificar:** `src/test/tema.test.tsx` — a página do cadastro passou a ser do servidor

Reuso: `cadastrar_empresa` (banco), `hashDoCodigo` (`src/lib/convites.ts`), `cancelarConvite` e `listarConvites` (B51-01), `TemaClaro`, `LogoDaMarca`, `ConferenciaHumana`.

## Checklist

- [x] Migration da função `cadastrar_empresa_com_convite`, aplicada no banco de teste
- [x] `conviteParaCadastro` em `src/lib/convites.ts`
- [x] Action do cadastro exige o convite e usa a função nova
- [x] Página do cadastro: aviso sem convite ou com convite que não vale; formulário com e-mail travado no convite para e-mail
- [x] Testes antigos do cadastro com convite
- [x] Testes do CA-B51-01 a 10 e 19
