# B54-05: Origem das variáveis, arquivo do cabeçalho e prévia do template na campanha

**Tipo:** Implementação
**Página:** Campanhas > editor, etapa 2
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-templates-da-meta.md`

## Descrição

Para cada variável do template (corpo e botão de link), a campanha pede de onde vem o valor (nome do contato, primeiro nome, nome do vendedor, campo personalizado ou texto fixo) e o texto reserva. Template com cabeçalho de mídia pede o arquivo. A prévia mostra o template com as origens; salvar e duplicar guardam tudo; o aviso das 24 horas some no tipo Template.

## Pronto quando

Uma campanha de template com variáveis mapeadas e arquivo do cabeçalho passa da etapa 2, é salva, reaberta e duplicada com tudo preenchido.

## Critérios de aceite

- **CA-B54-16** (automática) — Cada variável tem uma origem. Dado um template escolhido com `{{1}}` e `{{2}}` no corpo e um botão de link com `{{1}}`, quando a tela mostra o template, então há três seletores de origem, um por variável, cada um com Nome do contato, Primeiro nome, Nome do vendedor, os campos personalizados da empresa e Texto fixo; o Texto fixo abre um campo para digitar.
- **CA-B54-17** (automática) — Variável do contato exige texto reserva. Dado uma variável com origem Nome do contato e reserva em branco, quando o Admin clica em Próximo, então a tela avisa "Preencha o texto reserva da variável 1" e não avança; com a reserva preenchida, avança (variável de Texto fixo não pede reserva).
- **CA-B54-18** (automática) — Template com cabeçalho de mídia pede o arquivo. Dado um template escolhido com cabeçalho de imagem, quando o Admin clica em Próximo sem anexar o arquivo, então a tela avisa "Anexe a imagem do cabeçalho" e não avança; o arquivo segue as mesmas regras de tipo e tamanho dos anexos de campanha de hoje.
- **CA-B54-19** (automática) — A prévia mostra o template com as origens. Dado o template "Olá {{1}}, seu vendedor é {{2}}" com `{{1}}` vindo de Nome do contato e `{{2}}` com Texto fixo "Ana", quando a tela mostra a prévia, então ela mostra "Olá [Nome do contato], seu vendedor é Ana", com cabeçalho, rodapé e botões do template.
- **CA-B54-20** (automática) — Sem aviso das 24 horas no tipo Template. Dado a etapa 2 com número da API Oficial, quando o tipo é Template, então o aviso de que a Meta só entrega mensagem livre em 24 horas não aparece; ele volta ao trocar para Texto.
- **CA-B54-21** (automática) — Salvar e duplicar guardam o template e as origens. Dado uma campanha de tipo Template com as origens e o arquivo do cabeçalho preenchidos, quando o Admin salva, reabre, e depois duplica a campanha, então a reaberta e a cópia mostram o mesmo template, as mesmas origens e o mesmo arquivo.

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B54-07 | A reserva da variável vale para Nome do contato, Primeiro nome, Nome do vendedor e campo personalizado; Texto fixo não tem reserva. | confirmada | Marcelle, 30/10/2026 |
| SUP-B54-11 | O anexo da campanha passa a aceitar vídeo MP4 (até os mesmos 10 MB), para o cabeçalho de vídeo do template; imagem e documento seguem iguais. | confirmada | Marcelle, 30/10/2026 |
| SUP-B54-12 | "Duplicar" a campanha, no critério CA-B54-21, vale pelo único caminho de cópia que existe: "Reenviar para os que falharam" no relatório, que copia template, origens, arquivo e número. Não nasce botão Duplicar. | confirmada | Marcelle, 30/10/2026 |

## Perguntas em aberto

Nenhuma.

## Cenários

### Happy Path
1. Com o template escolhido na etapa 2, `OrigensDoTemplate` (`origens-do-template.tsx`, novo) lista cada `{{n}}` do corpo, do cabeçalho de texto e dos links de botão com um seletor de origem (Nome do contato, Primeiro nome, Nome do vendedor, cada campo personalizado como `campo:<chave>`, Texto fixo) e o campo de reserva (ou o texto fixo). As origens nascem de `variaveisVazias(partes)` e ficam em `template.variaveis` (`campaigns.template` jsonb).
2. Se o cabeçalho é imagem, vídeo ou documento, o bloco de arquivo da campanha aparece ("Arquivo do cabeçalho (imagem)") e usa o mesmo `uploadArquivoCampanha`, com `arquivo_url`/`arquivo_nome`.
3. A prévia usa `PreviaDoTemplate` com `partesComOrigens`: variável vira texto fixo ou `[Rótulo da origem]`.
4. Próximo confere `avisoDasVariaveisDoTemplate` e o arquivo do cabeçalho; o servidor confere de novo em `validarDados`.
5. Reabrir a campanha traz template, origens e arquivo (`buscarCampanha`); o reenvio para falhos copia `template`, `arquivo_url`, `arquivo_nome` e `whatsapp_connection_id` (SUP-B54-12).

### Edge Cases
- Template sem variável: o bloco de origens não aparece.
- Template editado na Meta depois de escolhido (mais ou menos variáveis): `ajustarVariaveis` acrescenta as que faltam (Nome do contato, sem reserva) e corta as que sobram.
- Texto fixo não pede reserva; fixo em branco avisa "Preencha o texto fixo da variável n".
- Rascunho pode ser salvo sem o arquivo do cabeçalho; enviar/agendar não (B54-06 mantém).
- O aviso das 24 horas (B53-06) some no tipo Template e volta no Texto (CA-B54-20).

### Cenário de Erro
- Reserva em branco: "Preencha o texto reserva da variável 1" (ou "… do cabeçalho", "… do botão 2").
- Arquivo faltando: "Anexe a imagem do cabeçalho" / "Anexe o vídeo do cabeçalho" / "Anexe o documento do cabeçalho".
- Tipo de arquivo fora da lista: aviso do anexo, agora com "vídeo MP4" (SUP-B54-11).

## Prova

| Critério | Prova | Onde | O que confere |
|---|---|---|---|
| CA-B54-16 | automática | `src/test/campanhas-template-variaveis-tela.test.tsx` | template com `{{1}}` e `{{2}}` no corpo e `{{1}}` no link do botão mostra três seletores de origem com Nome do contato, Primeiro nome, Nome do vendedor, o campo personalizado da empresa e Texto fixo; Texto fixo abre o campo de digitar |
| CA-B54-17 | automática | `src/test/campanhas-template-variaveis-tela.test.tsx` | Próximo com reserva em branco avisa "Preencha o texto reserva da variável 1" e fica na etapa 2; com a reserva, avança; variável de Texto fixo não pede reserva |
| CA-B54-18 | automática | `src/test/campanhas-template-variaveis-tela.test.tsx` | template com cabeçalho de imagem: Próximo sem arquivo avisa "Anexe a imagem do cabeçalho"; o seletor de arquivo é o da campanha (`uploadArquivoCampanha`) e aceita imagem |
| CA-B54-19 | automática | `src/test/campanhas-template-variaveis-tela.test.tsx` | com `{{1}}` de Nome do contato e `{{2}}` fixo "Ana", a prévia mostra "Olá [Nome do contato], seu vendedor é Ana" com cabeçalho, rodapé e botões |
| CA-B54-20 | automática | `src/test/campanhas-template-variaveis-tela.test.tsx` | com número da API Oficial, o aviso das 24h aparece no Texto, some no Template e volta no Texto |
| CA-B54-21 | automática | `src/test/campanhas-template-variaveis-tela.test.tsx` e `src/test/campanhas-template-reenvio.test.ts` | salvar manda `template` com `variaveis` e o arquivo; reabrir a campanha mostra as mesmas origens e o arquivo; o reenvio para falhos copia template, arquivo e número |

## Arquivos

- **Criar:** `src/app/(auth)/campanhas/[id]/origens-do-template.tsx` — o bloco "De onde vem cada variável"
- **Criar:** `src/test/campanhas-template-variaveis-tela.test.tsx` — testes dos critérios CA-B54-16 a 21 (tela)
- **Criar:** `src/test/campanhas-template-reenvio.test.ts` — teste do critério CA-B54-21 (reenvio copia o template)
- **Modificar:** `src/lib/templates-da-meta.ts` — `OrigemDaVariavel`, `VariaveisDoTemplate`, `variaveisVazias`, `ajustarVariaveis`, `avisoDasVariaveisDoTemplate`, `partesComOrigens`, `avisoDoArquivoDoCabecalho`, `cabecalhoEhMidia`
- **Modificar:** `src/app/(auth)/campanhas/actions.ts` — `variaveis` no template, validação, vídeo MP4 no anexo
- **Modificar:** `src/app/(auth)/campanhas/[id]/editor-campanha-client.tsx` — origens, arquivo do cabeçalho, prévia, validação do Próximo
- **Modificar:** `src/test/anexo-da-campanha.integration.test.ts` — o texto do aviso do anexo ganha "vídeo MP4"

## Checklist

- [x] origens por variável (corpo, cabeçalho, botões) com reserva ou texto fixo
- [x] arquivo do cabeçalho de mídia pelo anexo da campanha, com MP4 aceito
- [x] prévia com as origens
- [x] validação na tela e no servidor; reenvio copia tudo
- [x] testes CA-B54-16..21 passando; tsc limpo
