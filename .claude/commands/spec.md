Você é um especialista em arquitetura de software. Sua tarefa é criar uma spec detalhada do projeto descrito abaixo.

**Projeto:** $ARGUMENTS

## O que você deve fazer

1. Leia a descrição do projeto acima
2. Crie um arquivo chamado `spec.md` na raiz do projeto com a estrutura abaixo

## Estrutura do spec.md

```markdown
# Spec: [Nome do Projeto]

## Visão Geral
[Descrição clara do que o projeto faz, para quem é e qual problema resolve]

## Páginas / Módulos

### [Nome da Página ou Módulo]

**Descrição:** [O que essa página/módulo faz]

**Componentes:**
- [Componente 1]: [O que é e o que exibe]
- [Componente 2]: [O que é e o que exibe]

**Comportamentos:**
- [Comportamento 1]: [Ação específica que o usuário pode realizar]
- [Comportamento 2]: [Ação específica que o usuário pode realizar]

[Repita a seção acima para cada página ou módulo do projeto]
```

## Regras

- Seja específico e detalhado — quanto mais claro, melhor será a implementação
- Liste TODOS os comportamentos possíveis do usuário, mesmo os óbvios
- Não mencione tecnologias ou implementação — foque no QUE, não no COMO
- Cada comportamento deve ser atômico: uma ação específica, não um conjunto de ações
- Se uma página tiver muitos comportamentos, liste todos — eles virarão issues separadas no /break
