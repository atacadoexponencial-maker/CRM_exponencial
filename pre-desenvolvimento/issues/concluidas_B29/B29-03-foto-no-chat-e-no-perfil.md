# B29-03: Foto do contato no chat e no perfil

**Tipo:** Implementação
**Página:** Chat (`/chat`: lista de conversas e ficha do contato) e perfil do contato (`/contatos/[id]`)
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-foto-de-perfil.md`

## Descrição

Onde hoje aparecem as iniciais ou o ícone de pessoa, aparece a foto quando o contato tem
uma: lista de conversas, ficha do contato no chat e cabeçalho do perfil do contato (que
hoje não tem círculo). Sem foto, tudo como hoje; foto que não carrega volta às iniciais.
A conversa nova chega ao vivo já com a foto.

Depende da B29-02 (o contato precisa apontar para a cópia da foto).

## Pronto quando

Com a mudança no ar, um contato novo com foto visível manda a primeira mensagem e a
conversa aparece na lista com a foto dele, sem recarregar; a ficha e o perfil mostram a
mesma foto; contatos sem foto continuam com as iniciais ou o ícone.

## Critérios de aceite

- **CA-B29-13** (automática) — A lista de conversas mostra a foto. Dado um contato com foto guardada e uma conversa dele, quando a lista de conversas é exibida, então o círculo da conversa mostra a imagem, com o nome do contato como texto alternativo.
- **CA-B29-14** (automática) — A ficha do contato mostra a foto. Dado um contato com foto guardada, quando a ficha dele é aberta no chat, então o círculo grande mostra a imagem.
- **CA-B29-15** (automática) — Sem foto, tudo continua como hoje. Dado um contato sem foto guardada, quando a lista ou a ficha é exibida, então aparecem as iniciais do nome ou, sem nome, o ícone de pessoa.
- **CA-B29-16** (automática) — Foto que não carrega volta às iniciais. Dado um contato cuja foto guardada não abre, quando a lista é exibida, então o círculo mostra as iniciais, sem imagem quebrada.
- **CA-B29-17** (automática) — Foto chega ao vivo com a conversa nova. Dado o chat aberto, quando chega a primeira mensagem de um contato novo com foto, então a conversa nova aparece na lista já com a foto, sem recarregar a página.
- **CA-B29-18** (manual) — Chip real: a foto de um contato de verdade aparece no chat. Dado a mudança no ar e a Marcelle com um número do canal direto conectado, quando um telefone que ela ainda não tem no CRM, com foto visível a todos, manda a primeira mensagem, então a conversa aparece na lista com a foto da pessoa, e a ficha mostra a mesma foto.
- **CA-B29-19** (automática) — O perfil mostra a foto ou as iniciais. Dado um contato com foto guardada e outro sem, quando o perfil de cada um é aberto, então o primeiro mostra a imagem no cabeçalho e o segundo mostra as iniciais ou o ícone de pessoa.

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B29-03 | A cópia fica no mesmo storage privado dos anexos do chat, servida por endereço assinado, como os anexos | confirmada | Marcelle, 20/10/2026. |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| PER-B29-01 | Onde a foto aparece? | respondida | Marcelle, 20/10/2026: no chat (lista e ficha) e no perfil do contato. Não na lista de Contatos nem no cabeçalho da conversa. |

## Cenários

### Happy Path
1. A lista do chat é montada no servidor (`listarConversas`): a consulta traz
   `contacts.photo_path`; os caminhos são assinados de uma vez (`urlsAssinadasDasFotos`,
   chave de serviço, 1 h) e cada conversa leva `contato.fotoUrl` (ou `null`).
2. `AvatarContato` ganha `fotoUrl`: com ela, mostra `<img>` redonda com `alt` = nome (ou
   "Foto do contato"); sem ela, as iniciais ou o ícone, como hoje. Se a imagem não
   carregar (`onError`), volta às iniciais.
3. `ItemConversa` e a ficha (`PainelContato`) passam `conversa.contato.fotoUrl`.
4. O perfil (`buscarDadosContato`) traz `photo_path`, assina e devolve `fotoUrl` em
   `ContatoPerfil`; `PerfilContato` mostra o círculo grande ao lado do nome.
5. Ao vivo: `chat-layout` escuta `contato_foto` (B29-02) no canal da empresa e troca
   `contato.fotoUrl` da(s) conversa(s) daquele `contact_id`. A conversa nova que chega
   pelo `INSERT` já vem de `buscarConversa` com a foto, se ela já estava guardada;
   senão, o `contato_foto` chega logo depois e completa.

### Edge Cases
- Endereço assinado vencido (1 h) numa aba aberta: a imagem falha e o círculo volta às
  iniciais; ao recarregar, vem endereço novo.
- Conversa de contato sem `contactId` (dado antigo): sem foto.
- Mesmo contato em duas conversas (dois números): o evento troca as duas.

### Cenário de Erro
- Assinar falha (storage fora): `fotoUrl` fica `null` e a lista carrega como hoje.

## Prova

| Critério | Prova | Onde | O que confere |
|---|---|---|---|
| CA-B29-13 | automática | `src/test/foto-nas-telas.test.tsx` | `ItemConversa` com `fotoUrl` mostra `<img>` com o nome no `alt` |
| CA-B29-14 | automática | `src/test/chat-ficha-do-contato.test.tsx` | a ficha com `fotoUrl` mostra a imagem no círculo grande |
| CA-B29-15 | automática | `src/test/foto-nas-telas.test.tsx` | sem `fotoUrl`: iniciais com nome, ícone sem nome, na lista e na ficha |
| CA-B29-16 | automática | `src/test/avatar-contato.test.tsx` | `onError` da imagem troca para as iniciais, sem `<img>` quebrada |
| CA-B29-17 | automática | `src/test/foto-ao-vivo.test.tsx` | o evento `contato_foto` no canal da empresa troca a foto da conversa daquele contato sem recarregar |
| CA-B29-18 | manual | roteiro abaixo | foto real na lista e na ficha, com o chip |
| CA-B29-19 | automática | `src/test/foto-nas-telas.test.tsx` | `PerfilContato` com foto mostra a imagem; sem foto, iniciais |

### Roteiro manual — CA-B29-18
1. Com a B29 no ar e o número do canal direto conectado, peça a alguém que você ainda não
   tem no CRM, e que mostre a foto a todos, para mandar uma mensagem.
2. A conversa aparece na lista com a foto da pessoa, sem recarregar.
3. Abra a ficha do contato: o círculo grande mostra a mesma foto. Em Contatos → perfil
   dela, o cabeçalho também.

## Arquivos

- **Modificar:** `src/components/shared/avatar-contato.tsx` — `fotoUrl`, `<img>` com fallback.
- **Modificar:** `src/app/(auth)/chat/mock-conversas.ts` — `contato.fotoUrl` no tipo `Conversa`.
- **Modificar:** `src/app/(auth)/chat/conversas.ts` — `photo_path` na consulta e os endereços assinados.
- **Modificar:** `src/app/(auth)/chat/components/item-conversa.tsx` — passa a foto.
- **Modificar:** `src/app/(auth)/chat/components/painel-contato.tsx` — passa a foto no círculo grande.
- **Modificar:** `src/app/(auth)/chat/components/chat-layout.tsx` — escuta `contato_foto`.
- **Modificar:** `src/app/(auth)/contatos/mock-contatos.ts` — `fotoUrl` em `ContatoPerfil`.
- **Modificar:** `src/app/(auth)/contatos/actions.ts` — `photo_path` no perfil, assinado.
- **Modificar:** `src/app/(auth)/contatos/[id]/components/perfil-contato.tsx` — círculo no cabeçalho.
- **Criar:** `src/test/foto-nas-telas.test.tsx` — lista, ficha sem foto e perfil.
- **Criar:** `src/test/foto-ao-vivo.test.tsx` — o evento `contato_foto` no chat.
- **Modificar:** `src/test/avatar-contato.test.tsx` — imagem e fallback.
- **Modificar:** `src/test/chat-ficha-do-contato.test.tsx` — a ficha com foto.

## Dependências Externas

Nenhuma nova.

## Checklist

- [x] Avatar com imagem e fallback
- [x] Lista, ficha e perfil com a foto (endereços assinados no servidor)
- [x] Evento `contato_foto` trocando a foto ao vivo
- [x] Testes da tabela Prova passando; `tsc`, lint e build

## Resultado

Implementada em 20/10/2026. A parte de `src/app/(auth)/contatos/actions.ts` (foto no
perfil) entrou no commit da B29-02 (`3ac6880`), porque o arquivo também recebe a chamada
da busca; o restante está no commit desta issue. Testes: `foto-nas-telas`, `foto-ao-vivo`,
`avatar-contato` e `chat-ficha-do-contato`. Falta o teste com chip (CA-B29-18).

## Testes manuais

| Critério | Conferido por | Dia |
|---|---|---|
| CA-B29-18 | Marcelle | 25/10/2026 |
