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

## Cenários

### Happy Path
1. O Gerente anexa uma imagem ou um documento no editor da campanha.
2. O servidor confere o tipo (lista da SUP-B44-04) e o tamanho (até 10 MB), escolhe a extensão pelo tipo e guarda em `chat-attachments/<empresa>/campanhas/`.
3. Ao salvar ou confirmar, o servidor confere que o endereço do arquivo é um arquivo desse lugar da própria empresa. A campanha é confirmada e sai com o arquivo.

### Edge Cases
- Endereço de site qualquer, endereço interno (`http://169.254.169.254/...`), arquivo de outra empresa ou caminho com `..`: recusado ao salvar e ao confirmar.
- Campanha de texto sem arquivo: nada muda.
- Reenvio para falhas copia o arquivo da campanha original, que já passou pela conferência.

### Cenário de Erro
- Arquivo de fora: "Anexe o arquivo pela própria campanha".
- Tipo fora da lista: "Tipo de arquivo não aceito. Envie imagem JPG, PNG ou WebP, ou documento PDF, Word, Excel, PowerPoint ou TXT." e nada é guardado.

## Prova

| Critério | Prova | Onde | O que confere |
|---|---|---|---|
| CA-B44-23 | automática | `src/test/anexo-da-campanha.integration.test.ts` | confirmar com endereço de site qualquer, endereço interno ou arquivo de outra empresa devolve "Anexe o arquivo pela própria campanha" e a campanha não é confirmada |
| CA-B44-24 | automática | `src/test/anexo-da-campanha.integration.test.ts` | imagem anexada pela tela da campanha confirma a campanha, que fica gravada com esse arquivo |
| CA-B44-25 | automática | `src/test/anexo-da-campanha.integration.test.ts` | SVG e HTML são recusados com o aviso dos tipos aceitos e nada é guardado; uma imagem PNG com nome `foto.html` é guardada com extensão `.png` e tipo `image/png` |

## Arquivos

- **Modificar:** `src/app/(auth)/campanhas/actions.ts` — `uploadArquivoCampanha` aceita só os tipos da lista e escolhe a extensão; `validarDados` confere que o arquivo é da própria empresa
- **Criar:** `src/test/anexo-da-campanha.integration.test.ts` — CA-B44-23 a 25 no Supabase real, com o motor de campanhas simulado (como em `src/test/campanhas-seguranca.integration.test.ts`)

## Checklist

- [x] Upload com lista de tipos e extensão pelo tipo
- [x] Conferência do arquivo da própria empresa ao salvar e confirmar
- [x] Testes do CA-B44-23 a 25
