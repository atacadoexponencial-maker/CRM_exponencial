# B10-06: Contatos em páginas de 50 com busca sobre todos

**Tipo:** Implementação
**Página:** Contatos
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-navegacao-fluida.md`
**Depende de:** B10-03

## Descrição

Limitar a listagem de contatos a 50 por página, com "carregar mais" ou
paginação para o restante, mantendo a busca por nome ou telefone sobre todos
os contatos da empresa e a identidade resolvida uma vez.

Cobre os comportamentos de "Contatos".

## Pronto quando

No CRM publicado, com mais de 50 contatos de teste, a listagem abre com 50,
o restante vem ao pedir mais, e buscar um contato que não está na primeira
página o encontra. Abrir o perfil de um contato segue funcionando.

## Cenários

### Happy Path
1. Gerente abre Contatos: página usa `sessaoAtual()` e pede a primeira página
   (50 contatos, mais recentes primeiro). Abaixo da tabela aparece o botão
   "Carregar mais" enquanto a última página vier cheia.
2. Clica em "Carregar mais": a action devolve os 50 seguintes (offset) e a
   tabela anexa.
3. Digita "padaria" na busca: após 300 ms sem digitar, a action busca no
   servidor por nome ou telefone entre todos os contatos visíveis a esse
   usuário (limite 50) e a tabela mostra o resultado; apagar a busca volta às
   páginas carregadas.

### Edge Cases
- Filtros de classificação, tipo, nicho e atendente e a ordenação continuam
  no cliente, sobre a lista exibida (páginas carregadas ou resultado da busca).
- Atendente: as regras de visibilidade (conversas e cards atribuídos) valem
  para páginas e busca.
- Busca com menos de 2 caracteres não vai ao servidor: filtra o que já está
  na tela, como hoje.
- `listarContatos()` sem argumentos continua devolvendo tudo: os testes de
  integração existentes seguem válidos.

### Cenário de Erro
- Falha ao carregar mais ou buscar: a lista mantém o que tem; o botão volta
  ao estado normal para tentar de novo.

## Banco de Dados
Não se aplica.

## Arquivos

- **Modificar:** `src/app/(auth)/contatos/actions.ts` — `listarContatos`
  aceita `{ limite?, offset?, busca? }`, usa `sessaoAtual()`, ordena por
  `created_at desc` quando paginado, aplica `ilike` em nome ou telefone.
- **Modificar:** `src/app/(auth)/contatos/mock-contatos.ts` — constante
  `TAMANHO_PAGINA_CONTATOS` (actions.ts é "use server" e não exporta constante).
- **Modificar:** `src/app/(auth)/contatos/page.tsx` — `sessaoAtual()`,
  primeira página de 50, prop `temMais`.
- **Modificar:** `src/app/(auth)/contatos/components/lista-contatos.tsx` —
  estado das páginas carregadas, botão "Carregar mais", busca no servidor
  com debounce.

## Dependências Externas
Nenhuma.

## Checklist

- [x] `listarContatos` paginado e com busca no servidor
- [x] Página com sessão única e primeira página de 50
- [x] Botão "Carregar mais" anexa e some no fim
- [x] Busca encontra contato fora da primeira página
- [x] `npm run lint`, `npm run build` e testes de contatos passando
- [x] Conferido no build local com os 60 contatos de teste
