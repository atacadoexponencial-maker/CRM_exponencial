# B53-14: Carteiras: total do atendente e "Remover da carteira" sem diálogo preso

**Tipo:** Implementação
**Página:** Relatórios — Carteiras
**Repositório:** `crm-exponencial`
**Spec:** `docs/specs-arquivadas/spec-correcoes-qa-roteiro-luan.md`

## Descrição

O atendente vê só o total da carteira; "Remover da carteira" não aparece para quem tem 0 e o diálogo fecha depois de remover.

## Pronto quando

O atendente vê "N na carteira" sem selo confuso e remover fecha o diálogo.

## Critérios de aceite

- **CA-B53-27** (automática) — Atendente vê só o total da carteira. Dado um atendente com 2 contatos na carteira, quando ele abre a aba Carteiras, então vê "2 na carteira" e nenhum selo "Minha carteira 1".
- **CA-B53-28** (automática) — Remover só com contatos na carteira. Dado um vendedor com 0 contatos na carteira, quando o Admin vê a linha dele, então "Remover da carteira" não está disponível.
- **CA-B53-29** (automática) — Remover fecha o diálogo. Dado um vendedor com 3 contatos, quando o Admin confirma "Remover da carteira", então o diálogo fecha e a linha mostra 0.

## Suposições

Nenhuma.

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| PER-B53-02 | O "Remover da carteira" que ficou aberto mostrando 0 era a segunda abertura do diálogo, já com 0 contatos? O código atual fecha o diálogo depois de remover. | respondida | Marcelle, 30/10/2026: refez no ar; o diálogo fecha e a linha vai para 0, e com 0 contatos o "Remover" fica desabilitado. |

> Os critérios cobrem as duas respostas possíveis: com 0 contatos o botão fica indisponível (não há segunda abertura com 0) e, ao confirmar, o diálogo fecha e a linha mostra 0. Implementado antes da resposta do Luan, por pedido da Marcelle (urgência, 30/10/2026).

## Cenários

### Happy Path
1. O atendente abre a aba Carteiras: vê "Minha carteira", sem o selo com a quantidade de vendedores (que para ele era sempre 1), e na linha dele "2 na carteira".
2. O Admin vê a linha da Ana com 3 contatos e clica em "Remover da carteira"; o diálogo pergunta "Deixar 3 contatos de Ana sem vendedor?".
3. Ele confirma: a ação no servidor remove, o diálogo fecha e o painel recarrega com a linha da Ana em "0 na carteira".

### Edge Cases
- Vendedor com 0 contatos: "Remover da carteira" aparece indisponível (desabilitado) e não abre o diálogo.
- Gestor (Admin/Gerente) continua vendo o selo com a quantidade de vendedores em "Carteira por vendedor".

### Cenário de Erro
- A ação de remover devolve erro: o diálogo fica aberto com a mensagem, como hoje.

## Prova

| Critério | Prova | Onde | O que confere |
|---|---|---|---|
| CA-B53-27 | automática | `src/test/relatorios-carteiras-acoes.test.tsx` | atendente com 2 contatos vê "2 na carteira" e nenhum selo "1" ao lado de "Minha carteira" |
| CA-B53-28 | automática | `src/test/relatorios-carteiras-acoes.test.tsx` | na linha de um vendedor com 0 contatos, "Remover da carteira" está desabilitado e clicar não abre o diálogo |
| CA-B53-29 | automática | `src/test/relatorios-carteiras-acoes.test.tsx` | confirmar a remoção de um vendedor com 3 contatos chama a ação, fecha o diálogo e a linha passa a mostrar "0 na carteira" |

## Arquivos

- **Modificar:** `src/app/(auth)/relatorios/components/carteiras-client.tsx` — o selo com a quantidade de vendedores só para o gestor.
- **Modificar:** `src/app/(auth)/relatorios/components/acoes-carteira.tsx` — "Remover da carteira" desabilitado com 0 contatos.
- **Modificar:** `src/test/relatorios-carteiras-acoes.test.tsx` — testes do CA-B53-27, CA-B53-28 e CA-B53-29.

## Checklist

- [x] Selo de vendedores só para o gestor
- [x] "Remover da carteira" indisponível com 0 contatos
- [x] Testes do CA-B53-27, CA-B53-28 e CA-B53-29
- [x] Rodar os testes das carteiras e o tsc
