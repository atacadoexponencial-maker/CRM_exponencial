# 16: Navegar para Card no Pipeline

**Tipo:** Implementação
**Página:** Perfil do Contato

## Descrição

Usuário clica no link de pipeline na seção Pipeline do perfil e é redirecionado para o card do contato no funil correspondente.

## Cenários

### Happy Path
1. Usuário abre o perfil de um contato que possui card no pipeline
2. Na seção "Pipeline", clica no nome do funil exibido (ex.: "Funil de Expansão: Em Qualificação")
3. É redirecionado para `/pipeline` (funil Expansão) ou `/pipeline/retencao` (funil Retenção)

### Edge Cases
- Contato sem card no pipeline: seção exibe "Sem card no pipeline" — sem link
- Contato com cards em ambos os funis: cada card exibe seu próprio link para o funil correspondente

### Cenário de Erro
- Não há cenário de erro — é uma navegação simples via `<Link>`

## Arquivos

- **Modificar:** `src/app/(auth)/contatos/[id]/components/perfil-contato.tsx` — envolver o bloco de informação do card do pipeline em um `<Link>` que aponta para `/pipeline` (expansão) ou `/pipeline/retencao` (retenção)

## Checklist

- [x] `perfil-contato.tsx`: cada card na seção Pipeline vira um `<Link>` clicável apontando para o funil correto (`/pipeline` ou `/pipeline/retencao`)
