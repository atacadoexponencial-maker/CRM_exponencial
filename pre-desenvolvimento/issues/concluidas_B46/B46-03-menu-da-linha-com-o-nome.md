# B46-03: O menu de cada linha diz de quem é, e apagar mostra o nome

**Tipo:** Correção
**Página:** Configurações (Etiquetas e demais listas com menu ⋯)
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-correcoes-qa-ux.md`
**Origem:** `pre-desenvolvimento/analise-qa/qa-ux-2026-10-27.md`, achado **M-12**
**Gravidade:** Médio

## Descrição

O botão ⋯ de cada linha só se chama "Abrir menu", e a confirmação de apagar não destaca o nome. No teste, isso levou a apagar a etiqueta errada.

## Pronto quando

Cada botão de menu diz de qual linha é, e a confirmação de apagar mostra o nome em negrito.

## Critérios de aceite

- **CA-B46-06** (automática) — Botão de menu com o nome da linha. Dado as etiquetas "Interessado" e "Cliente" na lista de Etiquetas, quando a lista é desenhada, então os botões de menu se chamam "Abrir menu de Interessado" e "Abrir menu de Cliente", e não só "Abrir menu"
- **CA-B46-07** (automática) — Confirmação de apagar com o nome em destaque. Dado a etiqueta "Interessado", quando se escolhe Apagar no menu dela, então a confirmação mostra "Interessado" em negrito, antes do botão de confirmar

## Suposições

Nenhuma.

## Perguntas em aberto

Nenhuma.

## Cenários

### Happy Path
1. O Admin abre Etiquetas. Cada botão ⋯ tem o nome escondido para leitor de tela "Abrir menu de <nome da etiqueta>".
2. Ele abre o menu de "Interessado" e escolhe Excluir; a confirmação diz "Tem certeza que deseja excluir **Interessado**?".

### Edge Cases
- Mensagens rápidas usam o título (o atalho); Times, o nome do time; Usuários, o nome da pessoa.
- Automações e filtros salvos de Contatos já tinham o nome no botão: não mudam.

### Cenário de Erro
- Sem mudança de servidor: nada novo pode falhar.

## Prova

| Critério | Prova | Onde | O que confere |
|---|---|---|---|
| CA-B46-06 | automática | `src/test/menu-da-linha-com-o-nome.test.tsx` | Os botões se chamam "Abrir menu de Interessado" e "Abrir menu de Cliente", nenhum só "Abrir menu"; mensagens rápidas, times e usuários levam o nome |
| CA-B46-07 | automática | `src/test/menu-da-linha-com-o-nome.test.tsx` | Pelo menu de "Interessado", Excluir abre a confirmação com "Interessado" em `<strong>` e o botão Excluir |

## Arquivos

- **Modificar:** `src/app/(auth)/configuracoes/etiquetas/etiquetas-client.tsx` — nome da etiqueta no botão de menu.
- **Modificar:** `src/app/(auth)/configuracoes/mensagens-rapidas/mensagens-rapidas-client.tsx` — título da mensagem no botão de menu.
- **Modificar:** `src/app/(auth)/configuracoes/times/acoes-time.tsx` — nome do time no botão de menu.
- **Modificar:** `src/app/(auth)/configuracoes/usuarios/acoes-usuario.tsx` — nome do usuário no botão de menu.
- **Criar:** `src/test/menu-da-linha-com-o-nome.test.tsx` — testes do CA-B46-06 e do CA-B46-07.

Reuso: o padrão "Abrir menu de {nome}" já usado em `automacoes/components/lista-regras.tsx`.

## Checklist

- [x] Nome da linha no botão de menu das quatro listas
- [x] Testes do CA-B46-06 e do CA-B46-07 passando
- [x] Testes que renderizam essas telas passando (L-05), tsc (L-07), lint
