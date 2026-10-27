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

## Cenários

### Happy Path
1. Na Agenda, o atendente busca um contato para o follow-up: o servidor faz duas buscas simples, uma pelo nome e outra pelos dígitos do telefone (com 3 dígitos ou mais), sem montar o filtro "ou" como texto, e junta os resultados. O RLS continua limitando aos contatos que ele pode ver.
2. No chat, o atendente envia imagem (JPG, PNG, WebP ou GIF), vídeo (MP4 ou 3GP) ou áudio: o servidor confere o tipo numa lista e grava com a extensão do tipo.
3. Se o envio falha, o chat mostra "Não enviada: " e o motivo. Os motivos para a pessoa (conexão, tipo, tamanho, recusa do canal) continuam como hoje; erro interno vira "tente de novo em instantes.".

### Edge Cases
- Busca com `%`, `_` ou `\`: tratados como texto (escape que já existe em `escaparLike`).
- Busca só com letras: só a busca pelo nome.
- Imagem SVG ou tipo fora da lista: recusado antes de guardar qualquer coisa.
- Documento continua com a lista de tipos de hoje.

### Cenário de Erro
- Tipo não aceito: "Não enviada: Tipo de arquivo não aceito."
- Erro do banco ou do armazenamento: "Não enviada: tente de novo em instantes."

## Prova

| Critério | Prova | Onde | O que confere |
|---|---|---|---|
| CA-B44-36 | automática | `src/test/agenda-busca-segura.integration.test.ts` | a busca `Ana (loja), "centro"` acha o contato com esse nome, sem erro, e um atendente não acha contato que não pode ver |
| CA-B44-37 | automática | `src/test/chat-envio-seguro.test.ts` | imagem SVG é recusada com "Tipo de arquivo não aceito." sem nada guardado; imagem PNG com nome `foto.html` é guardada com `.png` |
| CA-B44-38 | automática | `src/test/chat-envio-seguro.test.ts` | erro do banco ao gravar a mensagem aparece como "Não enviada: tente de novo em instantes." sem o texto técnico, e o número desconectado continua mostrando o aviso de hoje |

## Arquivos

- **Modificar:** `src/app/(auth)/agenda/actions.ts` — `buscarContatosParaFollowUp` com duas buscas simples, sem filtro "ou" montado como texto
- **Modificar:** `src/app/(auth)/chat/actions.ts` — lista de tipos com extensão para imagem, vídeo e áudio; avisos para a pessoa marcados como `AvisoDoEnvio`; `comMotivo` só mostra o texto desses avisos
- **Criar:** `src/test/agenda-busca-segura.integration.test.ts` — CA-B44-36 no Supabase real
- **Criar:** `src/test/chat-envio-seguro.test.ts` — CA-B44-37 e 38 com banco, armazenamento e canal simulados

Reaproveita: `escaparLike` (`src/lib/escapar-like.ts`).

## Checklist

- [x] Busca da Agenda sem filtro "ou" montado como texto
- [x] Tipos e extensões do chat
- [x] Aviso para a pessoa separado de erro interno no `comMotivo`
- [x] Testes do CA-B44-36 a 38
