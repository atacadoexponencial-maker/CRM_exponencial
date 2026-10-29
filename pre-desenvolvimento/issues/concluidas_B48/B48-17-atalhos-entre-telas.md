# B48-17: Atalhos do Chat para a ficha e do pedido para a conversa

**Tipo:** Correção
**Página:** Chat (cabeçalho) e Pedidos
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-correcoes-qa-ux.md`
**Origem:** `pre-desenvolvimento/analise-qa/qa-ux-2026-10-27.md`, achados **C-09** e **C-19**
**Gravidade:** Clareza

## Descrição

Do chat não há como ir à ficha do contato, e do pedido não há como abrir a conversa.

## Pronto quando

O nome no cabeçalho do chat leva à ficha, e o pedido tem "Abrir conversa".

## Critérios de aceite

- **CA-B48-43** (automática) — Do chat para a ficha do contato. Dado uma conversa aberta com contato cadastrado, quando se olha o cabeçalho, então ao lado do nome há um link "Abrir ficha completa" para `/contatos/<id>`, e o nome continua abrindo o painel lateral (SUP-B48-16)
- **CA-B48-44** (automática) — Do pedido para a conversa. Dado um pedido de contato que tem conversa, quando o pedido é aberto, então há "Abrir conversa" ao lado de "Perfil do contato", levando à conversa dele no Chat

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B48-16 | No cabeçalho do Chat, o nome do contato continua abrindo o painel lateral (o único jeito de abri-lo, sem sair da conversa); ao lado do nome entra um ícone "Abrir ficha completa" que leva a `/contatos/<id>`. O CA-B48-43 foi reescrito para isso | confirmada | Luan, 28/10/2026, ao ver que o nome era o único caminho para o painel |

## Perguntas em aberto

Nenhuma.

## Cenários

### Happy Path
1. Conversa aberta com contato cadastrado: ao lado do nome, no cabeçalho, um ícone "Abrir ficha completa" leva a `/contatos/<id>`. Clicar no nome continua abrindo o painel lateral do contato (SUP-B48-16).
2. Pedido de contato que tem conversa: "Abrir conversa" aparece ao lado de "Perfil do contato" e leva a `/chat?conversa=<id>`, a conversa mais recente do contato.

### Edge Cases
- Conversa de número sem contato cadastrado: sem o ícone da ficha.
- Pedido de contato sem conversa: só "Perfil do contato". Era o caso do QA: a empresa de teste não tem WhatsApp conectado, e o contato do pedido não tinha conversa. O "Abrir conversa" do pedido já existia desde a B16-10; esta issue só ganha a prova.

### Cenário de Erro
- Nenhum novo.

## Prova

| Critério | Prova | Onde | O que confere |
|---|---|---|---|
| CA-B48-43 | automática | `src/test/atalhos-entre-telas.test.tsx` | O link "Abrir ficha completa de <nome>" vai a `/contatos/c-1`, o nome continua chamando o painel lateral, e sem contato não há link |
| CA-B48-44 | automática | `src/test/atalhos-entre-telas.test.tsx` | "Abrir conversa" fica no mesmo grupo de "Perfil do contato", com o link da conversa; sem conversa, não aparece |
| CA-B48-44 | automática | `src/test/pedido-abre-conversa.integration.test.ts` | No banco de teste, o pedido de contato com conversa traz `/chat?conversa=<id>`, e o de contato sem conversa traz null |

## Arquivos

- **Criar:** `src/test/atalhos-entre-telas.test.tsx` — CA-B48-43 e 44 na tela.
- **Criar:** `src/test/pedido-abre-conversa.integration.test.ts` — CA-B48-44 no servidor.
- **Modificar:** `src/app/(auth)/chat/components/painel-conversa.tsx` — ícone "Abrir ficha completa" ao lado do nome.

## Checklist

- [x] Ícone da ficha completa no cabeçalho do Chat, com o nome ainda abrindo o painel
- [x] "Abrir conversa" do pedido conferido na tela e no servidor
- [x] Testes do CA-B48-43 e 44 passando, tsc e lint
