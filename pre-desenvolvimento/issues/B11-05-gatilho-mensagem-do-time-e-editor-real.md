# B11-05: Gatilho "mensagem enviada pelo time" e editor de regra ligado ao banco

**Tipo:** Implementação
**Página:** Motor; Editor de regra; Lista
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-automacoes-v2.md`
**Depende de:** B11-01, B11-02, B11-04

## Descrição

Mensagem escrita por uma pessoa no chat (texto ou mídia) dispara as regras
desse gatilho, com as mesmas condições de texto e tipo da B11-04. Mensagens
mandadas por automação, sequência ou campanha nunca disparam. Nesta issue o
editor aprovado na B11-01 passa a gravar e carregar regras de verdade, com
todos os gatilhos, condições e ações já implementados até aqui; os seletores
dos itens ainda não implementados ficam desabilitados com "em breve". A lista
nova substitui a antiga, com interruptor, duplicar e excluir. A rota do
protótipo sai do repositório.

Cobre, no "Editor", o gatilho "Mensagem enviada pelo time" e as regras do
editor (salvar, trocar gatilho); na "Lista", ver, pausar, duplicar e excluir;
no "Motor", o disparo no envio do chat e a regra "automação não dispara
automação".

## Pronto quando

No CRM publicado, o admin cria pelo editor a regra "mensagem enviada pelo time
contendo 'segue o catálogo' → mover card para Catálogo Enviado, adicionar tag
catalogo-enviado"; ao responder isso no chat, o card move e a tag entra. Uma
sequência que manda o mesmo texto não dispara a regra.
