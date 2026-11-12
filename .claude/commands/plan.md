Você vai planejar em detalhe a implementação da issue fornecida.

**Issue:** $ARGUMENTS

Antes de qualquer coisa, leia o `AGENTS.md` da raiz do projeto: é a página de
princípios, com as regras sempre ativas, a arquitetura, o fluxo e as regras de git.

## O que você deve fazer

### Etapa 1: Lições e pesquisa interna na base de código

Primeiro, leia as lições do projeto e aplique as que tocam esta issue:

```bash
node .claude/skills/auditor/scripts/auditor.mjs licao listar
```

Depois, antes de planejar qualquer coisa, pesquise no projeto atual:
- Componentes e funções que podem ser reutilizados
- Padrões de código já estabelecidos no projeto
- Arquivos que provavelmente precisarão ser modificados
- Arquivos de teste que já cobrem a área, para acrescentar neles em vez de criar outro

Anote o que encontrou — você usará isso no planejamento.

### Etapa 2: Pesquisa externa (se necessário)

Se a issue envolver uma biblioteca ou serviço externo:
- Consulte a documentação oficial
- Identifique o padrão de implementação recomendado
- Não invente — use o que já está documentado

### Etapa 3: Perguntas em aberto

Leia a seção **Perguntas em aberto** da issue. Se houver pergunta `aberta` cuja resposta
muda a implementação, **pare e pergunte** antes de planejar. Grave a resposta na issue
(status `respondida`, quem respondeu e o dia) e na spec.

### Etapa 4: Enriquecer a issue

Atualize o arquivo da issue adicionando as seguintes seções:

```markdown
## Cenários

### Happy Path
[O que acontece quando o fluxo funciona corretamente, passo a passo]

### Edge Cases
[Situações incomuns mas possíveis que precisam ser tratadas]

### Cenário de Erro
[O que acontece quando algo falha — mensagens de erro, fallbacks]

## Prova

| Critério | Prova | Onde | O que confere |
|---|---|---|---|
| CA-[série]-01 | automática | `[caminho/exato/do/arquivo.test.ts]` | [resultado conferido] |
| CA-[série]-02 | manual | roteiro abaixo | [o que a pessoa confere] |

### Roteiro manual — CA-[série]-02
1. [passo que a pessoa faz]
2. [o que ela deve ver]

## Banco de Dados (se aplicável)

- Tabela: `[nome_da_tabela]`
  - `[coluna]` ([tipo]) — [descrição do que armazena]

## Arquivos

- **Criar:** `[caminho/exato/do/arquivo]` — [o que este arquivo faz]
- **Modificar:** `[caminho/exato/do/arquivo]` — [o que muda nele]

> Só liste arquivos que realmente precisam ser tocados.

## Dependências Externas (se aplicável)

- `[nome-do-pacote]` — [para que serve nesta issue]

## Checklist

- [ ] [Tarefa específica 1]
- [ ] [Tarefa específica 2]
- [ ] [Tarefa específica 3]
```

## A tabela Prova

- Uma linha para **cada** critério da seção Critérios de aceite da issue. Nenhum fica
  de fora.
- Critério de prova `automática`: a coluna **Onde** traz o caminho exato do arquivo de
  teste, e **O que confere** descreve o resultado do critério, não o formato do código.
- Critério de prova `manual`: a coluna **Onde** diz `roteiro abaixo`, e a issue ganha
  um `### Roteiro manual — [código]` com os passos e o que a pessoa deve ver.
- Não mude o tipo de prova de um critério por conta própria. Se um critério automático
  não dá para testar sozinho, pare e pergunte.
- Todo arquivo de teste da tabela Prova entra também na seção **Arquivos**.

## Suposições

Tudo o que a pesquisa no código não confirmou e você precisou assumir para planejar vira
uma linha na seção **Suposições** da issue, com o próximo código livre da série e status
`aberta`. Acrescente a mesma linha na spec, para o código não ser usado duas vezes.

## Issue no formato antigo

Se a issue não tem a seção **Critérios de aceite**, ela é do formato antigo. Planeje
como sempre, sem a tabela Prova, e **não invente códigos** para ela.

## Regras

- Seja ESPECÍFICO nos caminhos de arquivo — sem genéricos como `src/components/X.tsx`
- Liste APENAS os arquivos que precisam ser tocados — não mais
- Sempre siga as regras de arquitetura do `AGENTS.md` da raiz do projeto
- Não comece a implementar — apenas planeje
- Se encontrar código reutilizável na base de código, mencione explicitamente qual importar
