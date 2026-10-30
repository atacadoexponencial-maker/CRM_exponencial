# B54-01: Ver a prévia de um template como no WhatsApp

**Tipo:** Implementação
**Página:** Configurações > Templates
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-templates-da-meta.md`

## Descrição

A lista de templates ganha o botão Ver, que busca na Meta as partes do template (cabeçalho, corpo, rodapé e botões) e as mostra num balão como o do WhatsApp. Template com cabeçalho de mídia mostra a marca do tipo no lugar do arquivo.

## Pronto quando

Na tela de templates, qualquer template da lista abre a prévia com o conteúdo real que está na Meta.

## Critérios de aceite

- **CA-B54-01** (automática) — Ver um template mostra o conteúdo como no WhatsApp. Dado um template na lista com cabeçalho de texto, corpo com `{{1}}`, rodapé e dois botões, quando o Admin clica em **Ver**, então abre o painel de prévia com o cabeçalho, o corpo com `{{1}}` escrito como está, o rodapé e os dois botões com os textos deles (o conteúdo vem da Meta, não do que foi digitado na criação).
- **CA-B54-02** (automática) — Prévia de template com cabeçalho de mídia. Dado um template cujo cabeçalho é imagem, vídeo ou documento, quando o Admin clica em **Ver**, então a prévia mostra, no lugar da mídia, a marca do tipo ("Imagem", "Vídeo" ou "Documento") acima do corpo.

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B54-06 | A prévia na tela de templates mostra `{{1}}`, `{{2}}` como estão, sem valores de exemplo; a prévia com origem só existe na campanha. | confirmada | Marcelle, 30/10/2026 |

## Perguntas em aberto

Nenhuma.

## Cenários

### Happy Path
1. `listarTemplates` (`src/app/(auth)/configuracoes/templates/actions.ts`) passa a pedir `components` à Graph API junto dos campos de hoje.
2. `partesDoTemplate` (`src/lib/templates-da-meta.ts`) converte o `components` da Meta na estrutura que a tela entende: cabeçalho (texto ou tipo de mídia), corpo, rodapé e botões (texto e tipo).
3. Cada linha da lista ganha o botão **Ver**. O clique abre um `Dialog` com `PreviaDoTemplate` (`src/components/shared/previa-do-template.tsx`): balão no estilo do preview que a campanha já usa (`bg-sucesso-fundo`), com cabeçalho em negrito, corpo com `{{1}}` como está, rodapé em cinza e um botão desenhado por botão do template.

### Edge Cases
- Template sem cabeçalho, rodapé ou botões: a prévia mostra só o que existe.
- Cabeçalho `IMAGE`, `VIDEO`, `DOCUMENT`: a prévia mostra a marca "Imagem", "Vídeo" ou "Documento" num bloco acima do corpo; `LOCATION` mostra "Localização".
- Botão `URL`, `PHONE_NUMBER`, `QUICK_REPLY`, `COPY_CODE`: todos aparecem pelo texto; o tipo entra só como ícone/rotulo discreto.
- Template criado agora pela tela (ainda sem resposta da Meta): a prévia usa o corpo digitado, que a tela já guarda ao criar.
- Template com `components` vazio ou ausente: o botão Ver abre a prévia com o aviso "A Meta não devolveu o conteúdo deste template".

### Cenário de Erro
- Erro da Meta ao listar: continua como hoje (B53-08), a lista não aparece e não há botão Ver.

## Prova

| Critério | Prova | Onde | O que confere |
|---|---|---|---|
| CA-B54-01 | automática | `src/test/templates-previa.test.tsx` | com um template de cabeçalho de texto, corpo com `{{1}}`, rodapé e dois botões vindos da Meta (`components`), clicar em Ver mostra o cabeçalho, o corpo com `{{1}}` literal, o rodapé e os dois textos de botão; e `listarTemplates` pede `components` à Meta |
| CA-B54-02 | automática | `src/test/templates-previa.test.tsx` | com cabeçalho `IMAGE`, `VIDEO` e `DOCUMENT`, a prévia mostra "Imagem", "Vídeo" e "Documento" acima do corpo, sem tentar carregar mídia |

## Arquivos

- **Criar:** `src/lib/templates-da-meta.ts` — tipos `ParteDoTemplate`/`BotaoDoTemplate` e `partesDoTemplate(components)`, a leitura pura do `components` da Graph API (sem React, reutilizável pela campanha nas próximas issues)
- **Criar:** `src/components/shared/previa-do-template.tsx` — `PreviaDoTemplate`: o balão com cabeçalho, corpo, rodapé e botões
- **Criar:** `src/test/templates-previa.test.tsx` — testes dos critérios CA-B54-01 e CA-B54-02
- **Modificar:** `src/app/(auth)/configuracoes/templates/actions.ts` — `fields` ganha `components`; `Template` ganha `partes`
- **Modificar:** `src/app/(auth)/configuracoes/templates/templates-client.tsx` — coluna com o botão Ver e o Dialog da prévia; o template criado na tela guarda o corpo nas `partes`

## Checklist

- [x] `partesDoTemplate` lê HEADER (TEXT e mídia), BODY, FOOTER e BUTTONS
- [x] `PreviaDoTemplate` desenha o balão com as partes
- [x] `listarTemplates` pede `components` e preenche `partes`
- [x] botão Ver na lista e Dialog com a prévia
- [x] testes CA-B54-01 e CA-B54-02 passando
