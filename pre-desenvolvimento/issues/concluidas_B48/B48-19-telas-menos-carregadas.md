# B48-19: Telas menos carregadas

**Tipo:** Correção
**Página:** Chat (lista), ficha do contato, Pipeline (painel do card), Alertas, Dashboard
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-correcoes-qa-ux.md`
**Origem:** `pre-desenvolvimento/analise-qa/qa-ux-2026-10-27.md`, achados **C-06**, **C-10**, **C-14**, **C-22** e **C-34**
**Gravidade:** Clareza

## Descrição

Filtros demais no Chat, dois Editar na ficha, painel do card que fecha ao mover, alertas sem agrupar e filtro do Dashboard misturado.

## Pronto quando

Cada uma dessas telas fica com menos passos e menos coisa à vista, como nos critérios.

## Critérios de aceite

- **CA-B48-46** (automática) — Filtros do Chat numa linha. Dado a lista de conversas, quando é desenhada, então "Minhas / Meu time / Todas" e o status ficam no mesmo seletor, e as etiquetas atrás de um botão "Etiquetas" (C-10)
- **CA-B48-47** (automática) — Um Editar só na ficha. Dado a ficha do contato, quando se clica em Editar, então os dados do contato e os campos personalizados ficam editáveis juntos, com um Salvar (C-14)
- **CA-B48-48** (automática) — Mover pelo painel mantém o painel aberto. Dado o painel do card aberto, quando se move o card de etapa pela lista, então o painel continua aberto, com a etapa nova e o histórico atualizado (C-06)
- **CA-B48-49** (automática) — Alertas agrupados e filtro do Dashboard separado. Dado 46 alertas de "Lead sem resposta" e o filtro "Todos os contatos" do Dashboard, quando as telas são desenhadas, então os alertas aparecem agrupados por tipo, com "ver mais", e o filtro do Dashboard separa os grupos de contato dos campos (C-34, C-22)

## Suposições

Nenhuma.

## Perguntas em aberto

Nenhuma.

## Cenários

### Happy Path
1. C-10: a lista do Chat tem a busca e, numa linha, o seletor "Mostrar" (grupos Minhas, Meu time e Todas, cada um com Todos os status, Em espera, Em atendimento e Resolvidas) e o botão "Etiquetas". As etiquetas aparecem ao clicar no botão; com uma escolhida, ele diz "Etiquetas · <nome>". A fileira de números, quando há mais de um, continua como era.
2. C-14: a ficha tem um "Editar" só, em "Dados do contato". Ele abre os dados e os campos personalizados juntos, e um "Salvar" grava os dois (`atualizarDadosContato` e `salvarCamposDoContato`).
3. C-06: mover o card pela lista "Mover para etapa..." deixa o painel aberto, mostra a etapa nova (tempo "agora", entrada "hoje") e recarrega o histórico; o funil atrás recarrega como antes.
4. C-34: os alertas vêm agrupados por tipo, com o total no título, os 5 primeiros e "Ver mais N".
5. C-22: o filtro do Dashboard (o mesmo dos Relatórios) separa o grupo "Contatos" ("Todos os contatos") do grupo "Por campo personalizado".

### Edge Cases
- Atendente: o "Editar" abre só os campos personalizados; os dados fixos continuam só para leitura, como antes (CA-B38-19). Sem campos personalizados, o Atendente não vê "Editar".
- Atendente no Chat: o seletor não tem o grupo "Todas", como os botões de antes.
- Sem etiquetas na empresa, o botão "Etiquetas" não aparece.
- Valor de campo fora do formato: o Salvar aponta o campo na tela e não chama o servidor (CA-B38-21); erro de um campo devolvido pelo servidor também volta para o campo.
- Filtro por tipo nos alertas continua valendo: com um tipo escolhido, aparece só o grupo dele.

### Cenário de Erro
- Falha ao salvar os dados ou os campos: a mensagem aparece acima do Salvar e a edição continua aberta.

## Prova

| Critério | Prova | Onde | O que confere |
|---|---|---|---|
| CA-B48-46 | automática | `src/test/telas-menos-carregadas.test.tsx` | O seletor "Mostrar" tem os grupos de visibilidade com os status e filtra a lista; os botões soltos saíram; o Atendente não tem "Todas"; as etiquetas só aparecem pelo botão e filtram |
| CA-B48-47 | automática | `src/test/telas-menos-carregadas.test.tsx` | Um Editar abre Cidade e CNPJ juntos, há um Salvar só, e ele chama as duas actions e fecha a edição |
| CA-B48-48 | automática | `src/test/telas-menos-carregadas.test.tsx` | Depois de mover, o painel não fecha, a etapa é a nova e o histórico recarregado aparece |
| CA-B48-49 | automática | `src/test/telas-menos-carregadas.test.tsx` | 46 alertas de um tipo num grupo com 5 visíveis e "Ver mais 41"; o filtro separa "Contatos" de "Por campo personalizado" |

## Arquivos

- **Criar:** `src/test/telas-menos-carregadas.test.tsx` — CA-B48-46 a 49.
- **Modificar:** `src/app/(auth)/chat/components/filtros-caixa.tsx` — seletor "Mostrar" e botão "Etiquetas".
- **Modificar:** `src/app/(auth)/contatos/[id]/components/perfil-contato.tsx` — um Editar e um Salvar para dados e campos.
- **Modificar:** `src/app/(auth)/contatos/[id]/components/campos-personalizados-contato.tsx` — bloco controlado pela ficha, sem Editar próprio.
- **Modificar:** `src/app/(auth)/pipeline/components/painel-card.tsx` — painel aberto depois de mover.
- **Modificar:** `src/app/(auth)/alertas/alertas-client.tsx` — grupos por tipo com "Ver mais".
- **Modificar:** `src/components/shared/filtro-por-campo.tsx` — grupos "Contatos" e "Por campo personalizado".
- **Modificar:** `src/test/campos-personalizados-tela.test.tsx` — os testes da B38 usam o Editar único.

## Checklist

- [x] Filtros do Chat numa linha
- [x] Um Editar e um Salvar na ficha
- [x] Painel do card aberto depois de mover
- [x] Alertas agrupados e filtro do Dashboard separado
- [x] Testes do CA-B48-46 a 49 passando, tsc e lint
