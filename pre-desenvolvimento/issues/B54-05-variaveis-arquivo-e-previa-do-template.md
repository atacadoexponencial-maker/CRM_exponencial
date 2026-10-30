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

## Perguntas em aberto

Nenhuma.
