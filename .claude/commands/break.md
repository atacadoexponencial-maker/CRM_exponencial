Você vai quebrar a spec fornecida em issues pequenas e gerenciáveis.

**Spec:** $ARGUMENTS

## O que você deve fazer

1. Leia o arquivo de spec fornecido
2. Para cada página/módulo, crie uma issue de protótipo
3. Para cada comportamento, crie uma issue de implementação
4. Salve cada issue como um arquivo `.md` separado dentro da pasta `pre-desenvolvimento/issues/`

## Nomenclatura dos arquivos

- Protótipos: `pre-desenvolvimento/issues/[numero]-prototype-[nome-da-pagina].md`
- Implementações: `pre-desenvolvimento/issues/[numero]-[nome-do-comportamento].md`

Use números sequenciais com zero à esquerda. Protótipos primeiro.

Exemplos:
- `pre-desenvolvimento/issues/01-prototype-login.md`
- `pre-desenvolvimento/issues/02-prototype-dashboard.md`
- `pre-desenvolvimento/issues/03-fazer-login.md`
- `pre-desenvolvimento/issues/04-recuperar-senha.md`

## Estrutura de cada issue

Crie cada arquivo com este conteúdo:

```markdown
# [Número]: [Título da Issue]

**Tipo:** Protótipo | Implementação
**Página:** [A qual página esta issue pertence]

## Descrição

[O que precisa ser feito em 1-2 frases diretas]
```

## Ordem de criação

1. Todas as issues de **protótipo** primeiro (uma por página/módulo)
2. Depois todas as issues de **implementação** (uma por comportamento)

## Regras

- Issues pequenas — se parecer grande demais, quebre em duas
- Uma issue = uma responsabilidade única
- Não comece a implementar — apenas crie os arquivos de issue
- Não pule comportamentos — cada um da spec vira uma issue
