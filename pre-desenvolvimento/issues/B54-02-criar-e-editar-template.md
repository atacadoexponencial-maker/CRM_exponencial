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
| SUP-B54-09 | Variável no corpo, no cabeçalho de texto ou no link de botão vai à Meta com um exemplo gerado pela tela ("Exemplo 1", "Exemplo 2"…), porque a Meta exige exemplo para analisar e o formulário não pede mais um campo por variável. | invalidada | Marcelle, 30/10/2026: o formulário pede um campo de exemplo por variável (corpo, cabeçalho de texto e link de botão), obrigatório |
| SUP-B54-10 | O arquivo de exemplo do cabeçalho de mídia vai direto do navegador à Meta pelo servidor do CRM, sem ficar guardado, e aceita até 4 MB (limite do servidor); o arquivo real da campanha segue as regras dela. | confirmada | Marcelle, 30/10/2026 |
| SUP-B54-08 | Apagar remove o template em todos os idiomas daquele nome, como a Meta faz por padrão; a tela não oferece apagar só um idioma. | confirmada | Marcelle, 30/10/2026 (incluiu apagar no escopo) |

## Perguntas em aberto

Nenhuma.

## Cenários

### Happy Path
1. **Formulário** (`formulario-do-template.tsx`, novo): nome, categoria, idioma, cabeçalho (nenhum, texto ou Imagem/Vídeo/Documento com arquivo de exemplo), corpo, rodapé e até três botões (resposta rápida, abrir link, ligar). Serve para criar e para editar; ao editar, nome e idioma ficam desabilitados com o aviso da Meta e, se o template está aprovado, mostra o aviso dos 10 por 30 dias.
2. **Criar**: `criarTemplate` recebe as partes; `componentsParaMeta` (`src/lib/templates-da-meta.ts`) monta o `components` da Graph API com os exemplos (`example.body_text`, `header_text`, `header_handle`, botão URL) e a action faz o `POST /{waba}/message_templates`.
3. **Arquivo de exemplo**: a tela manda o arquivo em `FormData` para `enviarExemploDoCabecalho`, que usa a Resumable Upload API da Meta (`POST /{app-id}/uploads` → `POST /{upload-id}` com o binário) e devolve o `h` (handle) para entrar em `header_handle`.
4. **Editar**: botão Editar só em APPROVED, REJECTED e PAUSED. `editarTemplate(id, partes, categoria)` faz `POST /{template-id}` com `components` (e `category` quando mudou). Com sucesso a lista marca o template como PENDING e avisa "Template enviado à Meta para nova análise".
5. **Apagar**: botão Apagar em qualquer linha abre o diálogo de confirmação (mesmo padrão das etiquetas) com o aviso dos 30 dias; `apagarTemplate(nome)` faz `DELETE /{waba}/message_templates?name=`; a linha some e a tela avisa "Template apagado".
6. **Ver** continua da B54-01; o template editado atualiza as `partes` na lista para a prévia refletir.

### Edge Cases
- Template PENDING: no lugar de Editar, o aviso "Em análise pela Meta; só pode ser editado depois da resposta". Outros status (DISABLED, IN_APPEAL, PENDING_DELETION…): sem Editar e sem aviso.
- Status PAUSED ganha o badge "Pausado" (hoje cai no badge cru).
- Cabeçalho de mídia sem arquivo: "Anexe um exemplo do arquivo do cabeçalho para a análise da Meta", sem chamar a Meta. Ao editar um template com cabeçalho de mídia, a Meta exige o `header_handle` de novo, então o arquivo é pedido sempre.
- Botão de link com `{{1}}` na URL: a Meta exige exemplo; a tela gera "…/exemplo".
- Mais de três botões: a tela não deixa adicionar o quarto.
- Nome com espaço continua virando underscore (B53-08).

### Cenário de Erro
- A Meta recusa criar/editar: o formulário fica aberto com `error_user_msg`/`message` da Meta; os códigos conhecidos ganham texto em português (limite de edições → "A Meta não aceitou: limite de edições deste template atingido"; nome em uso → "Já existe um template com este nome; apagado há menos de 30 dias o nome ainda está bloqueado").
- A Meta recusa apagar: o diálogo fica aberto com o motivo; a lista não muda.
- Upload do exemplo falha: "Não foi possível enviar o arquivo de exemplo à Meta", sem criar o template.

## Prova

| Critério | Prova | Onde | O que confere |
|---|---|---|---|
| CA-B54-03 | automática | `src/test/templates-editar-e-apagar.test.tsx` | com aprovado, rejeitado, pausado e pendente na lista, os três primeiros têm "Editar" e o pendente mostra o aviso "Em análise pela Meta; só pode ser editado depois da resposta" |
| CA-B54-04 | automática | `src/test/templates-editar-e-apagar.test.tsx` | clicar em Editar num aprovado com cabeçalho, corpo, rodapé e botões abre o formulário com cada campo preenchido, categoria editável, nome e idioma desabilitados e o aviso "A Meta não deixa mudar o nome nem o idioma de um template criado" |
| CA-B54-05 | automática | `src/test/templates-editar-e-apagar.test.tsx` | salvar a edição com a Meta aceitando faz o `POST /{template-id}` com os `components` novos, a linha vira "Pendente" e a tela avisa "Template enviado à Meta para nova análise" |
| CA-B54-06 | automática | `src/test/templates-editar-e-apagar.test.tsx` | com a Meta recusando, o formulário segue aberto com o motivo e a lista não muda de status |
| CA-B54-07 | automática | `src/test/templates-editar-e-apagar.test.tsx` | criar com cabeçalho de texto, corpo, rodapé e um botão de cada tipo manda à Meta HEADER TEXT, BODY, FOOTER e BUTTONS (QUICK_REPLY, URL, PHONE_NUMBER); a prévia do template criado mostra cada parte |
| CA-B54-08 | automática | `src/test/templates-editar-e-apagar.test.tsx` | com cabeçalho Imagem e sem arquivo, salvar mostra "Anexe um exemplo do arquivo do cabeçalho para a análise da Meta" e não chama a Meta; com arquivo, o HEADER vai com `example.header_handle` |
| CA-B54-09 | automática | `src/test/templates-editar-e-apagar.test.tsx` | o formulário de edição de um aprovado mostra o aviso dos 10 em 30 dias; a recusa da Meta por limite vira "A Meta não aceitou: limite de edições deste template atingido" |
| CA-B54-10 | manual | roteiro abaixo | prévia igual ao Gerenciador da Meta e template voltando a Pendente nos dois lugares |
| CA-B54-30 | automática | `src/test/templates-editar-e-apagar.test.tsx` | Apagar abre a confirmação com o texto do bloqueio de 30 dias; confirmar faz o `DELETE …/message_templates?name=` e a linha some com "Template apagado"; cancelar não chama a Meta |
| CA-B54-31 | automática | `src/test/templates-editar-e-apagar.test.tsx` | com a Meta recusando o DELETE, a linha continua e o motivo aparece |

### Roteiro manual — CA-B54-10
1. Em Configurações > Templates, no número da API Oficial, clique em Novo template e preencha nome, cabeçalho de texto, corpo com `{{1}}`, rodapé e dois botões (resposta rápida e link). Salve.
2. Clique em Ver e compare com o template no Gerenciador do WhatsApp (business.facebook.com > Gerenciador do WhatsApp > Templates): cabeçalho, corpo, rodapé e botões iguais.
3. Quando a Meta aprovar, clique em Editar, mude o corpo e salve. A lista deve mostrar Pendente e o Gerenciador também.
4. Crie um template com cabeçalho Imagem e um arquivo de exemplo; confira no Gerenciador que a imagem de exemplo apareceu.
5. Apague um template de teste e confira que ele sumiu dos dois lugares.

## Arquivos

- **Criar:** `src/app/(auth)/configuracoes/templates/formulario-do-template.tsx` — o formulário de criar/editar: campos de todas as partes, botões, arquivo de exemplo, avisos da Meta
- **Criar:** `src/test/templates-editar-e-apagar.test.tsx` — testes dos critérios CA-B54-03 a 09, 30 e 31
- **Modificar:** `src/lib/templates-da-meta.ts` — `componentsParaMeta(partes, opcoes)` (partes → `components` da Meta, com exemplos), `PODE_EDITAR` (status editáveis) e o tipo `BotaoDoTemplate` com `url`/`telefone`
- **Modificar:** `src/app/(auth)/configuracoes/templates/actions.ts` — `criarTemplate` com todas as partes; `editarTemplate`; `apagarTemplate`; `enviarExemploDoCabecalho`; motivos da Meta em português
- **Modificar:** `src/app/(auth)/configuracoes/templates/templates-client.tsx` — botões Editar/Apagar, aviso do pendente, badge Pausado, diálogo de confirmação, avisos de sucesso; usa o formulário novo
- **Modificar:** `src/test/templates-lista-e-nome.test.tsx` — o teste CA-B53-17 continua, ajustado ao formulário novo se o rótulo mudar de lugar

## Checklist

- [x] `componentsParaMeta` monta HEADER (texto/mídia com handle), BODY, FOOTER e BUTTONS com exemplos
- [x] `criarTemplate`, `editarTemplate`, `apagarTemplate` e `enviarExemploDoCabecalho` no servidor, só Admin
- [x] formulário com todas as partes, modo edição (nome/idioma travados, avisos)
- [x] lista: Editar só em aprovado/rejeitado/pausado, aviso no pendente, badge Pausado, Apagar com confirmação
- [x] testes CA-B54-03..09, 30 e 31 passando; suíte de templates verde; tsc limpo
