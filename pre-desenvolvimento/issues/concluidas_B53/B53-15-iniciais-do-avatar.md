# B53-15: Iniciais do avatar ignoram símbolos

**Tipo:** Implementação
**Página:** Avatar (contato, usuário e time)
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-correcoes-qa-roteiro-luan.md`

## Descrição

Uma regra só de iniciais, usada por contato, usuário e time, que ignora símbolos.

## Pronto quando

"[TESTE] Automações B11" aparece como "TB".

## Critérios de aceite

- **CA-B53-30** (automática) — Iniciais ignoram símbolos. Dado os nomes "[TESTE] Automações B11", "Loja Beta" e "(11) 99999-0000", quando o avatar é montado, então as iniciais são "TB", "LB" e "19".

## Suposições

Nenhuma.

## Perguntas em aberto

Nenhuma.

## Cenários

### Happy Path
1. O nome é quebrado nos espaços; de cada parte sai tudo o que não é letra nem número (Unicode: letra acentuada conta como letra).
2. Partes que ficam vazias somem ("[TESTE]" vira "TESTE"; "-" some).
3. Com duas partes ou mais, as iniciais são a primeira letra da primeira e da última parte, em maiúsculo: "[TESTE] Automações B11" → "TB", "Loja Beta" → "LB", "(11) 99999-0000" → "19".

### Edge Cases
- Uma parte só: igual a hoje em cada lugar. Contato e time mostram 1 letra ("Ana" → "A"); o menu do usuário mostra 2 ("Ana" → "AN"). A função recebe quantas letras usar nesse caso.
- Nome só de símbolos ("???"): sem iniciais. O avatar do contato mostra o ícone de pessoa (como sem nome); o menu do usuário cai na primeira letra do e-mail, como já faz sem nome.
- "Élida Ávila" → "ÉÁ".

### Cenário de Erro
Nenhum: é função pura, sem chamada externa.

## Prova

| Critério | Prova | Onde | O que confere |
|---|---|---|---|
| CA-B53-30 | automática | `src/test/iniciais-do-avatar.test.tsx` | "[TESTE] Automações B11", "Loja Beta" e "(11) 99999-0000" dão "TB", "LB" e "19" na função (que o avatar do time chama direto, por ser página de servidor), no avatar do contato e na bolinha do usuário |

## Arquivos

- **Criar:** `src/lib/iniciais.ts` — `iniciaisDoNome(nome, letrasDeUmaPalavra = 1)`, a regra única.
- **Modificar:** `src/components/shared/avatar-contato.tsx` — usa `iniciaisDoNome`; sem iniciais, mostra o ícone.
- **Modificar:** `src/components/shared/menu-do-usuario.tsx` — `iniciaisDe` usa `iniciaisDoNome(nome, 2)` e mantém o e-mail como reserva.
- **Modificar:** `src/app/(auth)/configuracoes/times/page.tsx` — `Iniciais` usa `iniciaisDoNome`.
- **Criar:** `src/test/iniciais-do-avatar.test.tsx` — teste da tabela Prova.

## Checklist

- [x] Criar `src/lib/iniciais.ts`
- [x] Avatar do contato usa a função
- [x] Menu do usuário usa a função
- [x] Avatar do time usa a função
