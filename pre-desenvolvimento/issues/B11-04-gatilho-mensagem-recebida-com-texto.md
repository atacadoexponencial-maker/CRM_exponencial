# B11-04: Gatilho "mensagem recebida do cliente" com condição de texto e tipo

**Tipo:** Implementação
**Página:** Motor; Editor de fluxo (só o necessário)
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-automacoes-v2.md`
**Depende de:** B11-02

## Descrição

Toda mensagem recebida do cliente, pelos dois canais (API Oficial e canal
direto), passa a disparar as regras desse gatilho, depois de a mensagem estar
gravada. Entram as condições de texto (contém, não contém, começa com, é igual
a, contém alguma das palavras; sem distinguir maiúsculas nem acentos) e de tipo
da mensagem (texto, imagem, áudio, vídeo, documento). Reações e edições não
disparam.

Cobre, no "Editor", o gatilho "Mensagem recebida do cliente" e as condições
de texto e tipo; no "Motor", o ponto de disparo nos dois webhooks.

## Pronto quando

No preview do branch `b11-automacoes-v2` (o merge no `master` é um só, no fim da
série), uma regra "mensagem recebida contendo 'catálogo' → aplicar
etiqueta Interessado" (criada por script ou pelo editor provisório) aplica a
etiqueta quando o cliente escreve "Quero o CATÁLOGO", e não aplica quando
escreve "oi". O webhook responde ao WhatsApp antes de as ações terminarem
(ver B11-09; até lá, aceita-se rodar dentro da requisição).
