# B28-03: Foto do contato no chat e no perfil

**Tipo:** Implementação
**Página:** Chat (`/chat`: lista de conversas e ficha do contato) e perfil do contato (`/contatos/[id]`)
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-foto-de-perfil.md`

## Descrição

Onde hoje aparecem as iniciais ou o ícone de pessoa, aparece a foto quando o contato tem
uma: lista de conversas, ficha do contato no chat e cabeçalho do perfil do contato (que
hoje não tem círculo). Sem foto, tudo como hoje; foto que não carrega volta às iniciais.
A conversa nova chega ao vivo já com a foto.

Depende da B28-02 (o contato precisa apontar para a cópia da foto).

## Pronto quando

Com a mudança no ar, um contato novo com foto visível manda a primeira mensagem e a
conversa aparece na lista com a foto dele, sem recarregar; a ficha e o perfil mostram a
mesma foto; contatos sem foto continuam com as iniciais ou o ícone.

## Critérios de aceite

- **CA-B28-13** (automática) — A lista de conversas mostra a foto. Dado um contato com foto guardada e uma conversa dele, quando a lista de conversas é exibida, então o círculo da conversa mostra a imagem, com o nome do contato como texto alternativo.
- **CA-B28-14** (automática) — A ficha do contato mostra a foto. Dado um contato com foto guardada, quando a ficha dele é aberta no chat, então o círculo grande mostra a imagem.
- **CA-B28-15** (automática) — Sem foto, tudo continua como hoje. Dado um contato sem foto guardada, quando a lista ou a ficha é exibida, então aparecem as iniciais do nome ou, sem nome, o ícone de pessoa.
- **CA-B28-16** (automática) — Foto que não carrega volta às iniciais. Dado um contato cuja foto guardada não abre, quando a lista é exibida, então o círculo mostra as iniciais, sem imagem quebrada.
- **CA-B28-17** (automática) — Foto chega ao vivo com a conversa nova. Dado o chat aberto, quando chega a primeira mensagem de um contato novo com foto, então a conversa nova aparece na lista já com a foto, sem recarregar a página.
- **CA-B28-18** (manual) — Chip real: a foto de um contato de verdade aparece no chat. Dado a mudança no ar e a Marcelle com um número do canal direto conectado, quando um telefone que ela ainda não tem no CRM, com foto visível a todos, manda a primeira mensagem, então a conversa aparece na lista com a foto da pessoa, e a ficha mostra a mesma foto.
- **CA-B28-19** (automática) — O perfil mostra a foto ou as iniciais. Dado um contato com foto guardada e outro sem, quando o perfil de cada um é aberto, então o primeiro mostra a imagem no cabeçalho e o segundo mostra as iniciais ou o ícone de pessoa.

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B28-03 | A cópia fica no mesmo storage privado dos anexos do chat, servida por endereço assinado, como os anexos | confirmada | Marcelle, 20/10/2026. |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| PER-B28-01 | Onde a foto aparece? | respondida | Marcelle, 20/10/2026: no chat (lista e ficha) e no perfil do contato. Não na lista de Contatos nem no cabeçalho da conversa. |
