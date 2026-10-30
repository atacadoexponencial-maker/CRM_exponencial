# B54-02: Criar, editar e apagar template com tudo o que a Meta permite

**Tipo:** Implementação
**Página:** Configurações > Templates
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-templates-da-meta.md`

## Descrição

O formulário de template passa a ter cabeçalho (texto ou mídia com arquivo de exemplo), corpo, rodapé e botões, e serve tanto para criar quanto para editar. Editar só aparece em aprovado, rejeitado e pausado; nome e idioma ficam travados; template aprovado editado volta a Pendente; os limites e as recusas da Meta aparecem em português. A lista ganha o botão Apagar, com confirmação que avisa do bloqueio do nome por 30 dias.

## Pronto quando

Um template é criado com cabeçalho e botões, aparece na prévia, é editado depois de aprovado e volta a Pendente na lista e no Gerenciador da Meta; um template apagado some da lista e do Gerenciador.

## Critérios de aceite

- **CA-B54-03** (automática) — Editar só aparece quando a Meta permite. Dado a lista com um template aprovado, um rejeitado, um pausado e um pendente, quando a lista é mostrada, então os três primeiros têm o botão **Editar** e o pendente, no lugar dele, o aviso "Em análise pela Meta; só pode ser editado depois da resposta".
- **CA-B54-04** (automática) — O formulário de edição abre preenchido e com nome e idioma travados. Dado um template aprovado com cabeçalho de texto, corpo, rodapé e botões, quando o Admin clica em **Editar**, então o formulário abre com cada parte preenchida com o que está na Meta, a categoria editável, e nome e idioma visíveis mas sem edição, com o aviso "A Meta não deixa mudar o nome nem o idioma de um template criado".
- **CA-B54-05** (automática) — Salvar a edição devolve o template à análise. Dado o formulário de edição de um template aprovado com o corpo alterado, quando o Admin salva e a Meta aceita, então a lista mostra o template como **Pendente** e a tela avisa "Template enviado à Meta para nova análise".
- **CA-B54-06** (automática) — A Meta recusa a edição. Dado o formulário de edição com uma alteração, quando o Admin salva e a Meta recusa, então o formulário continua aberto, com o motivo da Meta em português quando conhecido (ou o texto dela quando não), e a lista não muda.
- **CA-B54-07** (automática) — Criar e editar com cabeçalho de texto, rodapé e botões. Dado o formulário de criação ou edição, quando o Admin preenche cabeçalho de texto, corpo, rodapé e um botão de cada tipo (resposta rápida, abrir link, ligar) e salva, então a Meta recebe todas essas partes, e a prévia desse template depois mostra cada uma.
- **CA-B54-08** (automática) — Cabeçalho de mídia exige um arquivo de exemplo. Dado o formulário com cabeçalho "Imagem", "Vídeo" ou "Documento", quando o Admin salva sem anexar o arquivo de exemplo, então a tela avisa "Anexe um exemplo do arquivo do cabeçalho para a análise da Meta" e não envia; com o arquivo anexado, envia.
- **CA-B54-09** (automática) — Limite de edições de template aprovado. Dado o formulário de edição de um template aprovado, quando ele abre, então mostra o aviso "Template aprovado pode ser editado até 10 vezes em 30 dias, uma por dia"; e, se a Meta recusar por ter passado do limite, o motivo aparece em português ("A Meta não aceitou: limite de edições deste template atingido").
- **CA-B54-10** (manual) — Prévia e edição no número real. Dado o número da API Oficial da Marcelle conectado, quando ela cria um template com cabeçalho e botões, vê a prévia, edita o corpo depois de aprovado e salva, então a prévia bate com o que o Gerenciador da Meta mostra e o template volta a Pendente nos dois lugares.
- **CA-B54-30** (automática) — Apagar um template pede confirmação e avisa do bloqueio do nome. Dado um template na lista, em qualquer status, quando o Admin clica em **Apagar**, então abre a confirmação "Apagar o template nome_do_template? A Meta bloqueia esse nome por 30 dias e recusa envios novos com ele; campanhas salvas com este template deixam de confirmar"; ao confirmar, o template some da lista e a tela avisa "Template apagado"; ao cancelar, nada muda.
- **CA-B54-31** (automática) — A Meta recusa a exclusão. Dado a confirmação de apagar aceita, quando a Meta recusa, então o template continua na lista e a tela mostra o motivo em português quando conhecido (ou o texto dela quando não).

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B54-01 | A criação de template ganha os mesmos campos da edição (cabeçalho, rodapé, botões e arquivo de exemplo); hoje só tem o corpo. Sem isso não haveria como criar o template com cabeçalho que a campanha vai usar. | confirmada | Marcelle, 30/10/2026 |
| SUP-B54-08 | Apagar remove o template em todos os idiomas daquele nome, como a Meta faz por padrão; a tela não oferece apagar só um idioma. | confirmada | Marcelle, 30/10/2026 (incluiu apagar no escopo) |

## Perguntas em aberto

Nenhuma.
