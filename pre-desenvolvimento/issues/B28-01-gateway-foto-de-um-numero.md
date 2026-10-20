# B28-01: Gateway responde a foto de perfil de um número

**Tipo:** Implementação
**Página:** Gateway (rota da instância, ao lado de "este número existe?")
**Repositório:** `whatsapp-gateway`
**Spec:** `pre-desenvolvimento/spec-foto-de-perfil.md`

## Descrição

O gateway ganha uma consulta: dado um telefone, uma instância conectada devolve a foto de
perfil dele (tamanho pequeno), entregando a própria imagem e não o endereço temporário do
WhatsApp. Sem foto visível responde "sem foto", sem erro. A consulta não conta como envio.

## Pronto quando

Com uma instância conectada, uma chamada com a credencial dela para um telefone com foto
visível devolve a imagem; para um telefone sem foto devolve "sem foto"; sem credencial ou
com a instância desconectada é recusada; e nada disso mexe no freio nem no ritmo. Publicado
na VPS.

## Critérios de aceite

- **CA-B28-01** (automática) — O gateway entrega a foto de um número. Dado uma instância conectada e um telefone cujo WhatsApp devolve o endereço de uma foto, quando o CRM pede a foto desse telefone, então o gateway responde com a própria imagem (tipo de conteúdo de imagem) e não com o endereço temporário do WhatsApp.
- **CA-B28-02** (automática) — Número sem foto visível responde "sem foto". Dado uma instância conectada e um telefone cujo WhatsApp não devolve foto (escondida ou inexistente), quando o CRM pede a foto desse telefone, então o gateway responde "sem foto" (resposta vazia com código próprio), sem erro, e não grava nada.
- **CA-B28-03** (automática) — Sem credencial ou instância desconectada, a consulta é recusada. Dado um pedido de foto sem a credencial da instância, ou para uma instância que não está conectada, quando o pedido chega, então o gateway recusa (como recusa as demais rotas da instância) e não consulta o WhatsApp.
- **CA-B28-04** (automática) — A consulta não passa pelo freio nem pelo ritmo. Dado uma instância conectada com o freio acionado ou o ritmo esgotado, quando o CRM pede a foto de um telefone, então a resposta vem normalmente, e nenhum envio é contado.

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B28-02 | O tamanho guardado é o pequeno (a "prévia" do WhatsApp, cerca de 100 px), suficiente para os círculos do chat e do perfil, e barato de guardar | confirmada | Marcelle, 20/10/2026. |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|

Nenhuma.
