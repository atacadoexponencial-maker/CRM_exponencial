# B44-10: Reforços do chat e da agenda

**Tipo:** Implementação
**Página:** Chat; Agenda
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-seguranca-rodada-4.md`

## Descrição

A busca de contato da Agenda aceita vírgula, parênteses e aspas sem erro, o chat recusa imagem SVG e guarda arquivos com extensão definida pelo tipo, e erro interno inesperado no envio não aparece cru para o atendente.

## Pronto quando

Buscar `Ana (loja), "centro"` na Agenda acha o contato; enviar SVG no chat mostra que o tipo não é aceito; uma falha interna aparece como "Não enviada: tente de novo em instantes.", e os motivos conhecidos continuam como hoje.

## Critérios de aceite

- **CA-B44-36** (automática) — Busca da Agenda aceita vírgula, parênteses e aspas. Dado um contato chamado `Ana (loja), "centro"`, quando o atendente busca por `Ana (loja), "centro"` na Agenda, então o contato aparece, sem erro, e a busca não traz contato que o atendente não pode ver
- **CA-B44-37** (automática) — Chat não aceita imagem SVG e não usa a extensão do nome. Dado o atendente enviando arquivo pelo chat, quando o arquivo é uma imagem SVG, então o chat avisa que o tipo não é aceito e nada é guardado. Uma imagem, um vídeo ou um áudio aceito é guardado com extensão definida pelo tipo dele, não pelo nome
- **CA-B44-38** (automática) — Erro inesperado não aparece cru para o atendente. Dado um envio pelo chat que falha por um erro interno inesperado (por exemplo, erro do banco), quando o chat mostra o motivo da falha, então o atendente vê "Não enviada: tente de novo em instantes.", sem o texto técnico. Os motivos conhecidos (número desconectado, número freado, em aquecimento) continuam aparecendo como hoje

## Suposições

Nenhuma.

## Perguntas em aberto

Nenhuma.
