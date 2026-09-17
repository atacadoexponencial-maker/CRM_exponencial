# B7-02: Canal visível e recurso indisponível

**Tipo:** Implementação
**Módulo:** B7 — Envio pelos Módulos Existentes
**Repositório:** `CRM_exponencial`

## Contexto

Com dois canais em uso, o atendente precisa saber por onde a conversa acontece — muda o
que é possível fazer e muda o que o cliente vê como remetente. E a interface não pode
oferecer o que o canal não faz: templates de mensagem não existem fora da API Oficial,
e oferecê-los para um número do canal direto produz erro sem explicação.

Esta é a parte visível do B7. O que o contrato já resolve: o provider sabe responder
quais recursos suporta (`suporta()`, criado na B1-01 e preenchido na B1-02). A
interface só precisa perguntar.

## O que construir

1. **Indicador de canal na conversa**: qual canal e qual número atendem aquela conversa.
2. **Aviso de recurso indisponível**, quando o que o atendente pediu não existe no canal
   do número em uso.
3. **Ocultar a gestão de templates** para números do canal direto.

## Comportamentos da spec cobertos

- [x] Ver na conversa por qual canal e por qual número ela está acontecendo
- [x] Ver aviso quando um recurso pedido não existe no canal do número escolhido
- [x] Ocultar a gestão de templates para números do canal direto

## Contrato do gateway

Nada é chamado diretamente aqui. O que vale:

- `suporta(recurso)` é a **única** fonte sobre o que um canal faz. A interface não
  decide isso por conta própria, e não existe `if (canal === "gateway")` em componente.
  Os recursos declarados são `templates`, `midia` e `marcar_lida`; no canal direto,
  `templates` é `false`.
- A decisão de mostrar ou esconder é do backend: a página recebe pronto o que pode
  oferecer. Nenhuma regra de autorização ou de capacidade fica no cliente.

## Arquivos

- **Modificar:** a página e o cliente do chat em `src/app/(auth)/chat/` — o cabeçalho da
  conversa passa a mostrar canal e número. Os dados vêm do backend, junto do que a
  conversa já carrega.
- **Modificar:** `src/app/(auth)/chat/actions.ts` — expor canal e número da conversa, e
  os recursos suportados, para a interface.
- **Modificar:** `src/app/(auth)/configuracoes/templates/page.tsx` e
  `templates-client.tsx` — a gestão de templates passa a considerar o canal das conexões
  do workspace. Casos a cobrir: só Meta (como hoje), só canal direto (esconder ou
  explicar), e os dois (deixar claro que templates valem apenas para o número da Meta).
- **Consultar:** `src/app/(auth)/configuracoes/templates/actions.ts` — chama
  `graph.facebook.com` para administração da conta Meta e **fica como está**: foi
  deliberadamente deixado fora da camada de provider na B1-01, porque o gateway não tem
  equivalente.
- **Consultar:** `src/components/shared/` — usar o que já existe de aviso e de selo
  antes de criar componente novo.
- **Criar:** teste em `src/test/`, com banco mockado.

## Depende de

- B7-01 — a conversa precisa saber por qual número ela acontece antes de a interface
  poder mostrar isso.

## Critérios de aceite

- [x] O cabeçalho da conversa mostra o canal e o número que a atendem.
- [x] Num workspace com um número de cada canal, duas conversas abertas mostram canais
      diferentes, corretamente.
- [x] Pedir um recurso que o canal não oferece mostra um aviso que diz **qual** recurso
      e **por quê**, sem erro técnico na tela.
- [x] Workspace só com número do canal direto não vê a gestão de templates.
- [x] Workspace só com número da Meta vê a gestão de templates como hoje.
- [x] Nenhuma decisão de capacidade é tomada em componente React: a interface só exibe o
      que o backend informou.
- [x] `npm run build`, `npm run lint` e os testes passam.

## Execução (17/09/2026)

**Arquivos a mais, declarados:**

- `src/lib/whatsapp/provider-meta.ts` e `provider-gateway.ts` — o mapa de recursos de cada
  canal passou a ser **exportado** (`RECURSOS_DA_META`, `RECURSOS_DO_GATEWAY`). Nenhuma
  lógica mudou: `suporta()` continua lendo o mesmo mapa.
- `src/lib/whatsapp/index.ts` — `recursosDoCanal`, `nomeDoCanal` e
  `motivoDoRecursoIndisponivel`.
- `src/app/(auth)/chat/mock-conversas.ts` — o tipo `Conversa` ganhou `canal`, e os mocks
  o campo novo.
- `src/app/(auth)/chat/page.tsx` e `components/painel-conversa.tsx` — a página traz canal
  e número do banco; o painel exibe.

**Por que `recursosDoCanal` existe, e não `provider.suporta()` direto:** para perguntar ao
provider seria preciso **montá-lo**, e montar exige credencial — `access_token` da Meta ou
`instance_token` da instância. A interface precisa saber o que o canal faz antes disso, e
às vezes sem conexão nenhuma no workspace. A função lê **o mesmo mapa** que o provider, e
há teste comparando as duas respostas recurso por recurso: se um dia divergirem, o teste
quebra.

**Sobre "pedir um recurso que o canal não oferece":** hoje o único recurso que um canal
recusa é `templates`, e o chat não tem função de template. Para o critério não ficar
decorativo, o aviso foi ligado ao **anexo**: o botão lê `recursos.midia` e, se fosse
`false`, desabilita e explica. Nenhum canal atual devolve `false` ali — a fiação está
pronta e exercitada por teste, sem inventar recurso que não existe.

**Nada de `if (canal === "gateway")` em componente.** O canal, o nome e os recursos chegam
prontos do servidor; a única coisa que o componente faz é exibir.

## Fora de escopo

- Cartão de saúde, medidor de consumo e sinal de risco do número — é B4.
- Trocar o número de uma conversa em andamento.
- Qualquer alteração em `configuracoes/templates/actions.ts`.
