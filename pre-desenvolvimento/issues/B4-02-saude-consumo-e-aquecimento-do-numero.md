# B4-02: Saúde, consumo de tetos e aquecimento do número

**Tipo:** Implementação
**Módulo:** B4 — Saúde e Risco do Número
**Repositório:** `CRM_exponencial`

---

## Contexto

O protótipo da `B4-01` mostra a tela com números fixos. Esta issue liga os fios: a tela
passa a mostrar a saúde real de um número conectado, lida do gateway.

Regra que governa a issue: **o CRM não calcula nada disso.** Tempo conectado, volume
enviado, tetos vigentes e dia de aquecimento são conta da Parte A, já implementada e
testada (módulos A6 e A8-02). Aqui se lê e se exibe. Qualquer conta refeita no CRM sai de
sincronia com o gateway no primeiro ajuste e passa a mentir para o cliente.

---

## O que construir

1. **Um cliente do gateway no backend do CRM** — o lugar onde as credenciais do gateway
   vivem e o único ponto que sabe falar HTTP com ele. Nasce aqui e é reaproveitado por
   B4-04, B5, B6 e B7.
2. **A leitura da saúde de um número**, servindo a tela da `B4-01` com dados reais:
   estado da conexão, tempo conectado, enviadas na hora e no dia, consumo contra os tetos
   vigentes, e o período de aquecimento com os tetos que valem hoje.

Onde o gateway não souber responder — instância fora do ar, gateway inalcançável, tempo
limite —, a tela diz que não conseguiu ler a saúde, e **não** mostra zero. Zero envios e
"não sei quantos envios" são coisas diferentes, e confundir as duas faz o cliente achar
que o número está parado.

---

## Comportamentos da spec cobertos

- [x] Consultar a saúde de um número conectado
- [x] Ver o consumo dos tetos por hora e por dia
- [x] Ver que o número está em período de aquecimento e quais tetos valem

---

## Contrato do gateway

**`GET /v1/instances/{id}/health`, credencial `X-Instance-Token`** — especificado em
17/09/2026 na seção 4.5 do `contrato-v1.md` (issue `00-03` do gateway). O contrato é a
fonte dos nomes de campo; leia de lá antes de escrever tipo.

A implementação no gateway é a issue `A8-06`, ainda aberta — a especificação existe, o
endpoint no ar ainda não.

O que vem do endpoint, segundo `B4-00`: enviadas e recebidas por período, proporção de
falhas, tempo conectada, consumo contra os tetos vigentes, dia de aquecimento com os
tetos do dia, e o estado do freio.

Credencial: `X-Instance-Token`, no header, do backend. **Nunca no navegador** — é a
credencial que dá acesso ao número do cliente.

---

## Arquivos

- **Usar:** `src/lib/whatsapp/gateway/` — o cliente HTTP do gateway, criado pela **B0-01**.
  Esta issue não cria cliente próprio; se faltar método, a issue dona é a B0-01
- **Criar:** o `actions.ts` co-localizado com a tela da `B4-01`, no padrão do projeto
  (lógica backend em `actions.ts` junto da rota)
- **Modificar:** os componentes criados na `B4-01` — trocam dados fixos por dados reais
- **Modificar:** `.env.example` — endereço do gateway e a credencial de serviço

Achados da pesquisa que valem para o `/plan`:

- O padrão de leitura autenticada com checagem de papel está em
  `src/app/(auth)/alertas/actions.ts:15-27` (`perfilAtual()`: `auth.getUser()` e depois
  `profiles.role, workspace_id`)
- As conexões vivem em `whatsapp_connections`, lidas por workspace com
  `.eq("status","connected")` — hoje centralizado em
  `src/lib/whatsapp/index.ts:resolverProvider`
- A coluna que liga uma conexão do CRM à instância do gateway **ainda não existe**: o
  `contrato-v1.md` identifica número por `instance_id`, e `whatsapp_connections` só tem os
  campos da Meta. Criar essa coluna é escopo da issue do provider do gateway (B2/B6),
  não desta. Se ela ainda não existir quando esta issue começar, **pare e pergunte**

---

## Depende de

- `B4-00` — sem o endpoint de saúde no gateway, esta issue não tem de onde ler. **Bloqueante.**
- `B0-01` — cliente HTTP e credenciais do gateway. **Bloqueante.**
- `B1-02` — a coluna que guarda o `instance_id` da conexão. **Bloqueante.**
- `B4-01` — a tela que esta issue alimenta

---

## Critérios de aceite

- [x] A tela de saúde mostra dados reais de um número conectado ao gateway
- [x] O medidor mostra o consumo contra os tetos **vigentes**, não contra os máximos do sistema
- [x] Número em aquecimento aparece como tal, com o dia e os tetos daquele dia
- [x] Gateway inalcançável ou fora do tempo limite: a tela diz que não conseguiu ler, e não mostra zero
- [x] Nenhuma credencial do gateway aparece em código de cliente, em `NEXT_PUBLIC_*` ou em resposta de action
- [x] Nenhum dos números exibidos é calculado no CRM
- [x] Papel: só Admin e Gerente
- [x] Testes com o gateway simulado, sem rede — no padrão de mock que o `plano-testes-B1.md` fixou
- [x] `npm run build`, `npm run lint` e `npm test` passam

## Execução (17/09/2026)

**O bloqueio caiu antes da execução.** A issue dizia "o endpoint no ar ainda não" — a
`A8-06` foi implementada no gateway em 17/09/2026, e a seção 4.5 do contrato é a fonte dos
nomes de campo usados aqui.

Arquivos a mais, declarados:

- **`src/lib/whatsapp/gateway/saude.ts`** — a leitura e a tradução do contrato para o
  vocabulário da tela. Ficam aqui, e não na action, para serem testáveis com gateway
  simulado; a action autoriza, busca a conexão e traduz o resultado.
- **`[id]/saude/tipos.ts`** — passou a reexportar o tipo de `src/lib`. O tipo e quem o
  preenche precisam morar juntos, senão um muda e o outro não; os cinco componentes da
  B4-01 seguem importando daqui.
- **`canal-direto/lista-numeros.tsx`** — links de Saúde e Ritmo no cartão de cada número
  do canal direto. A B4-01 dizia "alcançada por URL direta, enquanto B2 não existir"; B2
  existe desde hoje, e deixar a tela sem porta de entrada seria entregar algo inalcançável.

**Achado que mudou o desenho: o contrato não expõe o último dia do aquecimento.** Ele é
constante do gateway (`ULTIMO_DIA_DE_AQUECIMENTO`, 30). Escrevê-lo no CRM duplicaria regra
da Parte A — exatamente o que a issue proíbe. A tela passou a mostrar o dia atual e a
omitir o total ("dia 9" em vez de "dia 9 de 30"), e `aquecimento.ultimoDia` é
`number | null`. Para fechar isso, o endpoint de saúde precisaria devolver o último dia:
issue nova no gateway, não nesta.

## Fora de escopo

- Sinal de risco e alertas — é `B4-03`
- Ver e liberar o freio — é `B4-04`
- Configurar ritmo — é B5
- Cachear a resposta do gateway, ou tempo real: a tela lê quando abre
- Histórico de saúde ao longo do tempo: a spec pede o estado atual
