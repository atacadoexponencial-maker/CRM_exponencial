# B36-01: Tema claro e escuro por usuário

**Tipo:** Implementação
**Página:** Todas (fundação do tema)
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-tema-claro-caderno.md`

## Descrição

Criar os dois temas (claro padrão, escuro opcional) com a paleta Caderno Grafite e as fontes IBM Plex, a troca no menu do usuário guardada no perfil, a logo certa para cada tema, login/cadastro/páginas legais no claro e a loja pública intacta.

## Pronto quando

Um usuário entra e vê o sistema no claro; troca para o escuro no menu do usuário e a tela muda na hora; entra em outro navegador e o escuro vem junto; o login aparece claro com a logo grafite e a loja pública está igual a hoje.

## Critérios de aceite

- **CA-B36-01** (automática) — Quem nunca escolheu vê o tema claro. Dado um usuário que nunca trocou o tema, quando ele entra no sistema, então todas as telas aparecem no tema claro (fundo de papel #F6F4EF, texto #1C1B18).
- **CA-B36-02** (automática) — Trocar o tema muda a tela na hora e guarda a escolha. Dado um usuário no tema claro, com uma conversa aberta no Chat, quando ele escolhe "Escuro" no menu do usuário, então a tela passa para o escuro sem recarregar, a conversa continua aberta e a escolha fica gravada no perfil dele.
- **CA-B36-03** (automática) — O tema acompanha o usuário em outro aparelho. Dado um usuário que escolheu "Escuro", quando ele entra por outro navegador, sem nada guardado, então o sistema aparece no escuro.
- **CA-B36-04** (automática) — A tela já nasce no tema certo, sem piscar. Dado um usuário que escolheu "Escuro", quando ele recarrega qualquer tela do sistema, então a primeira pintura da página já é escura (o HTML chega do servidor com o tema aplicado), sem um instante de tela clara antes.
- **CA-B36-05** (automática) — Cada usuário vê o próprio tema. Dado a Ana no escuro e o Caio no claro, usando o mesmo navegador, quando a Ana sai e o Caio entra, então o Caio vê o claro.
- **CA-B36-06** (automática) — Login, cadastro e páginas legais no claro. Dado um visitante sem login, quando ele abre o login, o cadastro, a política de privacidade, os termos de serviço, a exclusão de dados ou uma página que não existe, então a página aparece no tema claro, com a logo escura.
- **CA-B36-07** (automática) — A loja pública não muda. Dado um vendedor que escolheu o tema escuro e está logado no mesmo navegador, quando ele abre a loja pública da empresa e a página de um produto, então a loja aparece clara, igual a hoje (mesmas cores, fontes e disposição).
- **CA-B36-08** (automática) — A logo troca de versão com o tema. Dado um usuário no claro, quando ele vê o menu lateral (e a barra do celular), então a logo aparece em grafite; ao trocar para o escuro, aparece a logo branca de hoje.
- **CA-B36-09** (automática) — Todo texto tem contraste para leitura, nos dois temas. Dado a paleta dos dois temas, quando se mede o contraste de cada par texto/fundo usado no sistema (texto e texto secundário sobre fundo, menu e superfície; destaque sobre fundo; texto do botão principal; alta, queda e aviso sobre os fundos), então todos os pares têm contraste de pelo menos 4,5:1.

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B36-01 | Só existem duas opções de tema, Claro e Escuro, sem "automático pelo sistema" | confirmada | Marcelle, 21/10/2026 |
| SUP-B36-08 | A logo escura usada é `Logo crmatacado exp em grafite1.png` (horizontal, fundo transparente), da pasta Downloads da Marcelle | confirmada | Marcelle, 21/10/2026 |
| SUP-B36-09 | O favicon (o "exp" sobre fundo escuro) não muda | confirmada | Marcelle, 21/10/2026 |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| PER-B36-02 | Onde fica guardada a escolha de tema? | respondida | No perfil do usuário (Marcelle, 21/10/2026) |
| PER-B36-03 | Onde a pessoa troca o tema? | respondida | No menu do usuário (Marcelle, 21/10/2026) |
| PER-B36-04 | Como ficam login, cadastro, páginas legais e loja pública? | respondida | Login, cadastro e legais no claro; a loja só no claro, com o visual de hoje (Marcelle, 21/10/2026) |
| PER-B36-07 | De onde vem a logo escura? | respondida | A Marcelle já tem o arquivo (21/10/2026); ver SUP-B36-08 |

## Cenários

### Happy Path
1. Usuário sem escolha entra: o login lê `profiles.tema` (padrão `claro`) e grava o cookie `tema`; o layout raiz lê o cookie e renderiza o `<html>` sem a classe `dark`: tudo claro.
2. No menu do usuário ele escolhe "Escuro": a classe `dark` entra no `<html>` na hora (sem recarregar), e a action `trocarTema` grava `profiles.tema = 'escuro'` e o cookie.
3. Recarrega: o servidor já manda o `<html class="dark">` (sem piscar).
4. Entra em outro navegador: o login lê `escuro` do perfil e grava o cookie; a primeira tela já vem escura.

### Edge Cases
- Cookie diferente do perfil (trocou no celular, o computador ficou com o cookie antigo): o layout das telas internas compara e o `SincronizarTema` corrige a classe e o cookie no navegador.
- Valor inválido no cookie: vale `claro`.
- Login, cadastro, páginas legais e "não encontrado" ficam dentro de `.tema-claro`, que redeclara as cores claras e desliga as variantes `dark:`; a logo grafite aparece.
- Loja pública: o layout dela fica dentro de `.tema-claro` (esquema de cores claro nos campos nativos); ela já usa cores e fontes próprias, então nada muda.
- Sair: o cookie `tema` é apagado; o próximo login grava o do novo usuário.

### Cenário de Erro
- Falha ao gravar no banco: a tela volta ao tema anterior e mostra "Não foi possível trocar o tema. Tente novamente."

## Prova

| Critério | Prova | Onde | O que confere |
|---|---|---|---|
| CA-B36-01 | automática | `src/test/tema.test.tsx` | sem cookie, o `<html>` sai sem `dark` e as cores claras são #F6F4EF e #1C1B18 |
| CA-B36-02 | automática | `src/test/tema.test.tsx` | escolher "Escuro" no menu põe `dark` no `<html>` sem navegar e chama a gravação com `escuro` |
| CA-B36-02 | automática | `src/test/tema.integration.test.ts` | `trocarTema('escuro')` grava `profiles.tema` e o cookie |
| CA-B36-03 | automática | `src/test/tema.integration.test.ts` | login de quem escolheu escuro, sem cookie, grava o cookie `escuro` |
| CA-B36-04 | automática | `src/test/tema.test.tsx` | com o cookie `escuro`, o HTML do layout raiz já sai com `class` contendo `dark` |
| CA-B36-05 | automática | `src/test/tema.integration.test.ts` | depois do login da Ana (escuro), o login do Caio grava `claro` |
| CA-B36-06 | automática | `src/test/tema.test.tsx` | login, cadastro, páginas legais e não-encontrado ficam dentro de `.tema-claro` com a logo grafite |
| CA-B36-07 | automática | `src/test/tema.test.tsx` | a loja fica dentro de `.tema-claro` e não usa cor de tema nem variante `dark:` |
| CA-B36-08 | automática | `src/test/tema.test.tsx` | a marca tem a logo grafite que some no escuro e a branca que só aparece no escuro |
| CA-B36-09 | automática | `src/test/tema.test.tsx` | todos os pares texto/fundo dos dois temas, lidos do `globals.css`, têm contraste ≥ 4,5:1 |

## Banco de Dados

- Tabela: `profiles`
  - `tema` (text, not null, default `'claro'`, check `claro|escuro`) — tema escolhido pelo usuário. O próprio usuário pode atualizar (grant update (tema)).

## Arquivos

- **Criar:** `supabase/migrations/20261021000009_tema_do_usuario.sql` — coluna `profiles.tema` e permissão de o usuário trocá-la
- **Criar:** `src/lib/tema.ts` — tipo `Tema`, nome do cookie, leitura segura do valor
- **Criar:** `src/components/shared/logo-da-marca.tsx` — logo grafite no claro e branca no escuro
- **Criar:** `src/components/shared/sincronizar-tema.tsx` — corrige classe e cookie quando o perfil diz outro tema
- **Criar:** `src/components/shared/tema-claro.tsx` — invólucro que mantém uma página sempre clara
- **Criar:** `public/logo-crmatacado-exp-grafite.png` — logo escura enviada pela Marcelle
- **Criar:** `src/test/tema.test.tsx` — testes de tela e de cor do tema
- **Criar:** `src/test/tema.integration.test.ts` — testes de gravação do tema no perfil e no login
- **Modificar:** `src/app/globals.css` — paleta Caderno clara em `:root` e escura em `.dark`, `.tema-claro`, fontes IBM Plex, variante `dark` que respeita `.tema-claro`
- **Modificar:** `src/app/layout.tsx` — fontes IBM Plex e classe `dark` no `<html>` pelo cookie
- **Modificar:** `src/app/(auth)/layout.tsx` — passa o tema do perfil ao menu e ao `SincronizarTema`
- **Modificar:** `src/lib/sessao.ts` — lê `tema` do perfil
- **Modificar:** `src/app/(auth)/perfil/actions.ts` — action `trocarTema` e cookie apagado no logout
- **Modificar:** `src/app/login/actions.ts` — grava o cookie do tema do perfil ao entrar
- **Modificar:** `src/app/login/page.tsx` — `TemaClaro` e logo da marca
- **Modificar:** `src/app/cadastro/page.tsx` — `TemaClaro` e logo da marca
- **Modificar:** `src/app/politica-de-privacidade/page.tsx` — `TemaClaro`
- **Modificar:** `src/app/termos-de-servico/page.tsx` — `TemaClaro`
- **Modificar:** `src/app/exclusao-de-dados/[code]/page.tsx` — `TemaClaro`
- **Modificar:** `src/app/not-found.tsx` — `TemaClaro`
- **Modificar:** `src/app/loja/[endereco]/layout.tsx` — `TemaClaro`
- **Modificar:** `src/components/shared/menu-do-usuario.tsx` — opções Claro e Escuro
- **Modificar:** `src/components/shared/sidebar-nav.tsx` — logo da marca
- **Modificar:** `src/integrations/supabase/types.ts` — tipos regerados com `profiles.tema`
- **Modificar:** `.claude/skills/auditor/regras.json` — sai a regra "variante dark: nunca ativa", que valia só enquanto o tema era sempre escuro
- **Modificar:** `src/test/perfil.integration.test.ts` — o sair agora apaga o cookie do tema: o teste ganha os cookies do Next de mentira

## Dependências Externas

- `next/font/google` (já vem com o Next) — IBM Plex Sans e IBM Plex Mono, servidas pelo próprio app

## Checklist

- [x] Migration da coluna `profiles.tema` aplicada (`npx supabase db push --linked`) e tipos regerados
- [x] `src/lib/tema.ts`
- [x] Paleta clara e escura no `globals.css`, `.tema-claro`, variante `dark`, fontes
- [x] Layout raiz com fontes e classe pelo cookie
- [x] Login grava o cookie; logout apaga
- [x] Action `trocarTema` e opções no menu do usuário
- [x] `SincronizarTema` no layout das telas internas
- [x] Logo da marca no menu, no login e no cadastro
- [x] `TemaClaro` nas páginas públicas e na loja
- [x] Testes da tabela Prova
