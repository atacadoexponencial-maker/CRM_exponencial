# B51-01: Tela de convites da plataforma

**Tipo:** Implementação
**Página:** `/plataforma/convites` e menu lateral
**Repositório:** `crm-exponencial`
**Spec:** `docs/specs-arquivadas/spec-cadastro-por-convite.md`

## Descrição

Marcelle e Luan ganham a tela de convites, com item no menu só para eles, onde criam link avulso com a validade escolhida, veem a lista com a situação de cada convite, cancelam e geram link novo. O banco ganha os convites, guardados só pela marca (hash) do link.

## Pronto quando

Marcelle entra no CRM, clica em "Convites" no menu, cria um link avulso de 7 dias, copia o link, vê o convite pendente na lista e o cancela; um Admin de empresa não vê o item nem a tela.

## Critérios de aceite

- **CA-B51-11** (automática) — Só a plataforma vê a tela. Dado os usuários `marcelle@seteads.com` e `luan@seteads.com`, um Admin de outra empresa e um visitante sem login, quando cada um abre `/plataforma/convites`, então Marcelle e Luan veem a tela; o Admin vê "página não encontrada"; o visitante vai para o login.
- **CA-B51-12** (automática) — Só a plataforma cria e cancela convite. Dado um Admin de empresa logado, quando ele chama direto as ações de criar, gerar link novo ou cancelar convite, então nada é criado nem mudado.
- **CA-B51-14** (automática) — Link avulso não manda e-mail. Dado Luan na tela de convites, quando ele cria um convite sem e-mail, então nenhum e-mail é enviado, o link aparece para copiar e a lista mostra "link avulso" pendente.
- **CA-B51-15** (automática) — Validade personalizada. Dado Marcelle criando um convite, quando ela escolhe uma data e hora futuras, então o convite vale até esse momento e para de valer depois dele.
- **CA-B51-16** (automática) — Validade fora do prazo recusada. Dado Marcelle criando um convite, quando ela escolhe uma data e hora que já passaram, ou mais de 90 dias à frente, então a tela avisa que a validade precisa estar entre agora e 90 dias, e nenhum convite é criado (o servidor recusa também quando a tela é contornada).
- **CA-B51-21** (automática) — Lista mostra a situação de cada convite. Dado um convite pendente, um usado, um vencido e um cancelado, quando Marcelle abre a tela, então cada um aparece com a situação certa, e o usado mostra o nome da empresa criada.
- **CA-B51-23** (automática) — Item no menu só para a plataforma. Dado Marcelle logada e um Admin de empresa logado, quando cada um abre o CRM, então o menu lateral da Marcelle tem o item "Convites", que leva a `/plataforma/convites`; o do Admin não tem.

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B51-02 | O link só aparece para copiar logo depois de criado; para mandar de novo, gera-se um link novo e o anterior para de funcionar | confirmada | Sim, link novo a cada reenvio (Luan, 29/10/2026) |
| SUP-B51-03 | A tela de convites tem um item no menu, que só Marcelle e Luan veem | confirmada | Sim, item só para os dois (Luan, 29/10/2026); CA-B51-23 |
| SUP-B51-04 | O banco de teste também usa o cadastro por convite, com os mesmos dois e-mails da plataforma, e os testes automáticos não mandam e-mail de verdade | confirmada | Sim, o banco de teste também exige convite (Luan, 29/10/2026) |
| SUP-B51-05 | Gerar link novo para um convite pendente mantém a validade dele; para prorrogar, cria-se outro convite | confirmada | Mantém a validade (Luan, 29/10/2026) |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| PER-B51-02 | Qual é a validade do convite? | respondida | Escolhida na hora de criar, com opção personalizada (Luan, 29/10/2026) |
| PER-B51-03 | Quem gera convites? | respondida | `marcelle@seteads.com` e `luan@seteads.com` (Luan, 29/10/2026) |
| PER-B51-05 | Existe uma validade máxima para a data personalizada? | respondida | Até 90 dias (Luan, 29/10/2026); CA-B51-16 |

## Cenários

### Happy Path
1. Marcelle (e-mail na lista da plataforma) entra no CRM; o layout confere a lista e o menu ganha a seção "Plataforma" com o item "Convites".
2. Em `/plataforma/convites`, ela deixa o e-mail em branco, mantém 7 dias e clica em "Criar convite".
3. O servidor confere de novo que ela é da plataforma, gera um código aleatório, grava só o hash dele com a validade e devolve o link `https://<host>/cadastro?convite=<código>`.
4. A tela mostra o link com o botão "Copiar" e a lista ganha a linha "Link avulso · Pendente · vence em …".
5. Ela cancela o convite: a linha passa a "Cancelado". Num convite pendente, "Gerar link novo" troca o hash, mantém a validade e mostra o link novo.

### Edge Cases
- Validade personalizada: o navegador converte a data e hora escolhidas para um instante; o servidor recusa o que não estiver entre agora e 90 dias.
- Cancelar ou gerar link novo num convite que não está pendente (usado, vencido, cancelado): recusado, nada muda.
- Convite usado mostra a empresa criada (preenchida pela B51-02; aqui o teste grava o uso pela chave de serviço).
- Gerente, Atendente e Admin de empresa: sem item no menu, `notFound()` na tela, ações recusadas.
- A tela não guarda o link: recarregar a página some com a caixa do link (SUP-B51-02).

### Cenário de Erro
- Falha ao gravar no banco: "Não foi possível criar o convite. Tente novamente."
- Validade fora do prazo: "A validade precisa estar entre agora e 90 dias."
- Ação chamada por quem não é da plataforma: `{ erro: "Sem permissão" }`, nada gravado.

## Prova

| Critério | Prova | Onde | O que confere |
|---|---|---|---|
| CA-B51-11 | automática | `src/test/convites-plataforma.integration.test.ts` | a página renderiza para o usuário da plataforma, chama `notFound` para o Admin de empresa e redireciona o visitante para `/login` |
| CA-B51-12 | automática | `src/test/convites-plataforma.integration.test.ts` | o Admin de empresa chamando criar, gerar link novo e cancelar recebe recusa, e o banco fica igual |
| CA-B51-14 | automática | `src/test/convites-plataforma.integration.test.ts` e `src/test/convites-plataforma.test.tsx` | a ação devolve o link, grava o convite pendente sem e-mail e só com o hash; a tela mostra o link para copiar e "Link avulso" pendente |
| CA-B51-15 | automática | `src/test/convites-plataforma.integration.test.ts` | o convite grava a data escolhida e aparece pendente; passada a data (gravada no passado pela chave de serviço), aparece vencido |
| CA-B51-16 | automática | `src/test/convites-plataforma.integration.test.ts` e `src/test/convites-plataforma.test.tsx` | a ação recusa data passada e data além de 90 dias sem gravar nada; a tela mostra o aviso |
| CA-B51-21 | automática | `src/test/convites-plataforma.integration.test.ts` e `src/test/convites-plataforma.test.tsx` | a listagem devolve pendente, usado (com o nome da empresa), vencido e cancelado; a tela mostra cada situação e a empresa |
| CA-B51-23 | automática | `src/test/menu-lateral.test.tsx` e `src/test/convites-plataforma.integration.test.ts` | o menu com a marca da plataforma tem "Convites" levando a `/plataforma/convites`, sem ela não tem; a conferência da plataforma diz sim para o e-mail da lista e não para o Admin de empresa |

## Banco de Dados

- Tabela nova `plataforma_admins` — quem cuida da plataforma, por e-mail (vale antes de a conta existir no banco de teste)
  - `email` (text, pk, sempre minúsculo)
  - `criado_em` (timestamptz)
  - Já nasce com `marcelle@seteads.com` e `luan@seteads.com`, nos dois bancos
- Tabela nova `convites`
  - `id` (uuid, pk)
  - `token_hash` (text, único) — SHA-256 do código do link; o código em si não é guardado
  - `email` (text, nulo no link avulso)
  - `criado_por` (uuid → auth.users, set null)
  - `criado_em` (timestamptz)
  - `expira_em` (timestamptz)
  - `usado_em` (timestamptz) e `workspace_id` (uuid → workspaces, set null) — preenchidos pela B51-02
  - `cancelado_em` (timestamptz)
- As duas com RLS ligado e sem política, e sem grant para `anon` e `authenticated`: só a chave de serviço lê e grava, depois de o servidor conferir a plataforma.

## Arquivos

- **Criar:** `supabase/migrations/20261029000002_convites.sql` — tabelas `plataforma_admins` (com os dois e-mails) e `convites`
- **Criar:** `src/lib/plataforma.ts` — `ehDaPlataforma(email)`, lendo `plataforma_admins` pela chave de serviço
- **Criar:** `src/lib/convites.ts` — código do link e hash, prazo (1, 7, 30 dias, até 90), situação do convite
- **Criar:** `src/app/(auth)/plataforma/convites/page.tsx` — confere a plataforma (`notFound` para os outros) e carrega a lista
- **Criar:** `src/app/(auth)/plataforma/convites/actions.ts` — `criarConvite`, `gerarLinkNovo`, `cancelarConvite`, `listarConvites`
- **Criar:** `src/app/(auth)/plataforma/convites/convites-client.tsx` — formulário, caixa do link com copiar e lista
- **Criar:** `src/app/(auth)/plataforma/convites/loading.tsx` — esqueleto, como as outras telas
- **Modificar:** `src/components/shared/sidebar-nav.tsx` — prop `plataforma` e seção "Plataforma" com "Convites"
- **Modificar:** `src/app/(auth)/layout.tsx` — confere a plataforma junto com os outros dados do usuário
- **Modificar:** `src/test/menu-lateral.test.tsx` — CA-B51-23
- **Criar:** `src/test/convites-plataforma.integration.test.ts` — CA-B51-11, 12, 14, 15, 16, 21 e 23 no banco de teste
- **Criar:** `src/test/convites-plataforma.test.tsx` — tela: CA-B51-14, 16 e 21

Reuso: `sessaoAtual` (`src/lib/sessao.ts`), `createServiceClient` (`src/integrations/supabase/service.ts`), `CLASSE_DA_PAGINA` (`src/lib/pagina.ts`), `EsqueletoPagina`, o host do pedido como em `src/app/(auth)/catalogo/configuracoes/page.tsx`, e o padrão de teste com cliente logado de `src/test/usuarios.integration.test.ts`.

## Checklist

- [x] Migration das tabelas `plataforma_admins` e `convites`, aplicada no banco de teste
- [x] `src/lib/plataforma.ts` e `src/lib/convites.ts`
- [x] Actions de criar, gerar link novo, cancelar e listar, só para a plataforma
- [x] Tela `/plataforma/convites` com formulário, link para copiar e lista
- [x] Item "Convites" no menu só para a plataforma
- [x] Testes do CA-B51-11, 12, 14, 15, 16, 21 e 23
