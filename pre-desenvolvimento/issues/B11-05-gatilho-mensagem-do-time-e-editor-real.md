# B11-05: Gatilho "mensagem enviada pelo time" e editor de fluxo ligado ao banco

**Tipo:** Implementação
**Página:** Motor; Editor de fluxo
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-automacoes-v2.md`
**Depende de:** B11-02, B11-04, B11-10

> **Mudança de 07/10/2026:** o editor e a lista gravando no banco saíram desta
> issue e foram para a B11-10, feita logo depois da B11-02, para o Luan testar
> automações no preview mais cedo. O título do arquivo ficou como era, para não
> quebrar as referências.

## Descrição

Mensagem escrita por uma pessoa no chat (texto ou mídia) dispara as regras
desse gatilho, com as mesmas condições de texto e tipo da B11-04. Mensagens
mandadas por automação, sequência ou campanha nunca disparam. O gatilho
"Mensagem enviada pelo time" entra em `GATILHOS_DISPONIVEIS`
(`src/lib/fluxo-automacao.ts`) e deixa de aparecer como "em breve" no editor.

Cobre, no "Editor", o gatilho "Mensagem enviada pelo time"; no "Motor", o
disparo no envio do chat e a regra "automação não dispara automação".

## Pronto quando

No preview do branch `b11-automacoes-v2` (o merge no `master` é um só, no fim da
série), o admin cria pelo editor a regra "mensagem enviada pelo time
contendo 'segue o catálogo' → mover card para Catálogo Enviado, adicionar tag
catalogo-enviado"; ao responder isso no chat, o card move e a tag entra. Uma
sequência que manda o mesmo texto não dispara a regra.
