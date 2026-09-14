Você vai planejar em detalhe a implementação da issue fornecida.

**Issue:** $ARGUMENTS

## O que você deve fazer

### Etapa 1: Pesquisa interna na base de código

Antes de planejar qualquer coisa, pesquise no projeto atual:
- Componentes e funções que podem ser reutilizados
- Padrões de código já estabelecidos no projeto
- Arquivos que provavelmente precisarão ser modificados

Anote o que encontrou — você usará isso no planejamento.

### Etapa 2: Pesquisa externa (se necessário)

Se a issue envolver uma biblioteca ou serviço externo:
- Consulte a documentação oficial
- Identifique o padrão de implementação recomendado
- Não invente — use o que já está documentado

### Etapa 3: Enriquecer a issue

Atualize o arquivo da issue adicionando as seguintes seções:

```markdown
## Cenários

### Happy Path
[O que acontece quando o fluxo funciona corretamente, passo a passo]

### Edge Cases
[Situações incomuns mas possíveis que precisam ser tratadas]

### Cenário de Erro
[O que acontece quando algo falha — mensagens de erro, fallbacks]

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

## Regras

- Seja ESPECÍFICO nos caminhos de arquivo — sem genéricos como `src/components/X.tsx`
- Liste APENAS os arquivos que precisam ser tocados — não mais
- Sempre siga as regras de arquitetura do `CLAUDE.md` da raiz do projeto
- Não comece a implementar — apenas planeje
- Se encontrar código reutilizável na base de código, mencione explicitamente qual importar
