# B48-16: Botões perigosos separados dos comuns

**Tipo:** Correção
**Página:** Pipeline (card), Contatos (ficha e lixeira), Relatórios (Carteiras), WhatsApp
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-correcoes-qa-ux.md`
**Origem:** `pre-desenvolvimento/analise-qa/qa-ux-2026-10-27.md`, achados **C-07**, **C-15**, **C-21**, **C-31** e **C-36**
**Gravidade:** Clareza

## Descrição

Excluir, apagar de vez, remover da carteira e remover número ficam no mesmo peso e ao lado de botões comuns.

## Pronto quando

Os botões perigosos ficam num menu ou como secundário vermelho, separados, e remover da carteira pede confirmação.

## Critérios de aceite

- **CA-B48-42** (automática) — Excluir e apagar de vez fora do caminho. Dado o painel do card (C-07), a ficha do contato (C-15), a lixeira (C-36), as Carteiras (C-21) e o WhatsApp (C-31), quando cada um é desenhado, então "Excluir", "Apagar de vez", "Remover da carteira" e "Remover número" ficam num menu "⋯" ou como botão secundário vermelho, separados dos botões comuns, e "Remover da carteira" pede confirmação

## Suposições

Nenhuma.

## Perguntas em aberto

Nenhuma.

## Cenários

### Happy Path
1. No painel do card (funis Entrada e Recompra), o "Excluir" sai da lista de botões e vai para o "⋯" do cabeçalho ("Mais ações do card"), como item vermelho. Clicar nele abre o mesmo resumo de exclusão de antes.
2. Na ficha do contato, "Excluir contato" sai do lado do "Abrir conversa" e vai para o "⋯" ("Mais ações do contato").
3. Na lixeira, cada linha mostra "Restaurar" e um "⋯" ("Mais ações de <nome>") com "Apagar de vez", que continua pedindo confirmação.
4. Nas Carteiras, "Remover da carteira" fica vermelho, na outra ponta da linha, longe do "Transferir carteira", e continua abrindo a confirmação.
5. No WhatsApp, "Remover número" fica vermelho, numa linha só dele, abaixo de "Desconectar" e "Reconectar".

### Edge Cases
- No funil da empresa, o card não tem "Excluir" (já não tinha); o "Tirar do funil" continua como era, fora do escopo.
- O erro de preparar a exclusão do card continua aparecendo no painel, no lugar onde ficava o botão.
- O "⋯" é um componente só (`MenuMaisAcoes`), com rótulo acessível e dica.

### Cenário de Erro
- Nenhum novo: as ações e as confirmações são as mesmas.

## Prova

| Critério | Prova | Onde | O que confere |
|---|---|---|---|
| CA-B48-42 | automática | `src/test/botoes-perigosos-separados.test.tsx` | Excluir (card e ficha) e Apagar de vez (lixeira) não aparecem soltos, só no "⋯", como item vermelho, e seguem para o resumo ou a confirmação; Remover da carteira é vermelho, na outra ponta, e pede confirmação; Remover número é vermelho, num grupo separado de Desconectar |

## Arquivos

- **Criar:** `src/components/shared/menu-mais-acoes.tsx` — o "⋯" das ações perigosas.
- **Criar:** `src/test/botoes-perigosos-separados.test.tsx` — CA-B48-42.
- **Modificar:** `src/app/(auth)/pipeline/components/painel-card.tsx` — Excluir no "⋯" do cabeçalho.
- **Modificar:** `src/app/(auth)/contatos/[id]/components/perfil-contato.tsx` — Excluir contato no "⋯".
- **Modificar:** `src/app/(auth)/contatos/lixeira/components/lista-lixeira.tsx` — Apagar de vez no "⋯" da linha.
- **Modificar:** `src/app/(auth)/relatorios/components/acoes-carteira.tsx` — Remover da carteira em vermelho.
- **Modificar:** `src/app/(auth)/relatorios/components/carteiras-client.tsx` — Remover na outra ponta da linha.
- **Modificar:** `src/app/(auth)/configuracoes/whatsapp/acoes-whatsapp.tsx` — Remover número em vermelho, numa linha só dele.

## Checklist

- [x] Componente do "⋯"
- [x] Excluir do card e da ficha e Apagar de vez da lixeira no "⋯"
- [x] Remover da carteira e Remover número em vermelho, separados
- [x] Testes do CA-B48-42 passando, tsc e lint
