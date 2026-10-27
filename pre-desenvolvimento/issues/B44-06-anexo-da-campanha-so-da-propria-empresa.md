# B44-06: Anexo da campanha só da própria empresa e dos tipos oferecidos

**Tipo:** Implementação
**Página:** Campanhas → editor
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-seguranca-rodada-4.md`

## Descrição

A campanha só é confirmada com um arquivo enviado pela própria empresa pela tela da campanha, e o envio do anexo aceita só os tipos oferecidos, guardados com extensão definida pelo tipo.

## Pronto quando

Confirmar campanha com endereço de arquivo de fora mostra "Anexe o arquivo pela própria campanha"; anexar SVG ou HTML é recusado; uma imagem anexada pela tela sai normalmente.

## Critérios de aceite

- **CA-B44-23** (automática) — Arquivo de campanha que não veio da própria empresa é recusado. Dado um Gerente da empresa A montando uma campanha de imagem ou documento, quando a campanha é confirmada com um endereço de arquivo que não é um arquivo enviado por A (um site qualquer, um endereço interno ou um arquivo de outra empresa), então a tela avisa "Anexe o arquivo pela própria campanha" e a campanha não é confirmada
- **CA-B44-24** (automática) — Arquivo enviado pela própria campanha continua funcionando. Dado um Gerente da empresa A que anexou uma imagem pela tela da campanha, quando ele confirma a campanha, então a campanha é confirmada e sai com essa imagem
- **CA-B44-25** (automática) — Anexo da campanha aceita só os tipos oferecidos. Dado um Gerente anexando arquivo na campanha, quando o arquivo é uma imagem SVG, uma página HTML ou outro tipo fora da lista (SUP-B44-04), então a tela avisa qual tipo é aceito e nada é guardado. Um arquivo aceito é guardado com extensão definida pelo tipo dele, não pelo nome

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B44-04 | Anexo de campanha aceita: imagem em JPG, PNG ou WebP; documento em PDF, Word, Excel, PowerPoint ou TXT. Até 10 MB, como hoje | confirmada | Marcelle, 27/10/2026 |

## Perguntas em aberto

Nenhuma.
