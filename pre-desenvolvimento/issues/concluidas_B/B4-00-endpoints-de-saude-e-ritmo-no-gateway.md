# B4-00: Endpoints de saúde, ritmo e retomada no gateway

**Tipo:** Implementação
**Módulo:** Pré-requisito de B4 e B5 — vive na **Parte A** (repo `whatsapp-gateway`)
**Repositório:** `whatsapp-gateway` (e `contrato-v1.md`)

> **CONCLUÍDA em 17/09/2026.** Os três endpoints estão especificados na seção 4.5 do
> `contrato-v1.md` (issue `00-03`) e **implementados** no `whatsapp-gateway`:
> `A8-06` (saúde), `A6-08` (perfil de ritmo) e `A6-09` (retomada do freio), todas
> mergeadas na `master`, suíte com 888 testes verdes. **B4 e B5 estão desbloqueadas.**
>
> Falta apenas publicar o gateway numa VPS para o CRM alcançá-lo — enquanto isso, o
> desenvolvimento da Parte B usa o gateway local ou por túnel.
>
> **Esta issue é da Marcelle, não do Luan.** Ela não produz uma linha de código no
> `CRM_exponencial`. Está escrita aqui, junto das issues da Parte B, porque é o que
> **bloqueia** B4 e B5 — sem ela, as duas não têm de onde ler nem para onde escrever.

---

## Contexto

Os blocos B4 (Saúde e Risco do Número) e B5 (Configuração de Ritmo por Número) da
`spec.md` são, inteiros, **leitura e escrita de estado que vive no gateway**. O
aquecimento, os tetos por hora e por dia, o intervalo entre mensagens, a janela de envio
e o freio de emergência já estão implementados na Parte A (módulo A6) e medidos na A8-02.
Nada disso é para ser reimplementado no CRM.

O problema: **o `contrato-v1.md` não expõe nada disso.** A seção 4 tem quatro famílias de
endpoint — instância, pareamento, envio e fila — e nenhuma delas devolve consumo de teto,
proporção de falhas, dia de aquecimento ou perfil de ritmo. Hoje esses números só se leem
**por script, dentro da VPS** (`npm run indicadores`, `npm run painel`, `npm run freio`),
que é operação nossa, não interface de produto.

Ou seja: a Parte B pediria dados que o gateway tem e não entrega.

---

## O que construir

Três endpoints novos no gateway, especificados antes no contrato. São **acréscimos não
quebrantes** (endpoint novo, seção "Versionamento" do contrato), então cabem em `/v1` —
mas exigem aviso a quem toca a Parte B, pela regra do próprio documento.

### 1. Saúde e indicadores de uma instância — leitura

Serve B4. O gateway **já calcula** tudo o que falta expor: `criarLeitorDeIndicadores`
(`src/indicadores/indicadores.ts`) devolve hoje, para uma instância:

- `enviadas` e `recebidas`, cada uma com `ultima_hora` e `ultimas_24h`
- `falhas`: `{ falhas, envios, proporcao }` — a janela do freio (A6-07)
- `tempo_conectada_24h_ms`

Falta somar a esse retorno, e é aqui que está o trabalho de verdade:

- **consumo contra os tetos vigentes** — enviadas na hora e no dia *versus* `tetoHora` e
  `tetoDia` efetivos, que é o que o medidor da B4 desenha;
- **dia de aquecimento e tetos vigentes** — `diaDeVida(first_connected_at)` e
  `tetosDeAquecimento(...)` (`src/fila/ritmo.ts`), para o CRM dizer "número novo, dia 3,
  teto de hoje é X";
- **estado do freio** — `brake_reason` (`failure_rate`, `manual`, `banned`), `braked_at` e
  quantas mensagens ficaram paradas.

**Decisão a tomar ao especificar:** o **sinal de risco** (baixo, médio ou alto) é
calculado onde? Recomendação: o gateway devolve os **ingredientes** (proporção de
respostas, volume para números sem histórico, ritmo, consumo de teto) e o CRM classifica,
porque a classificação é regra de produto e muda sem tocar no gateway. Registrar a escolha
no contrato.

### 2. Perfil de ritmo — leitura e escrita, com os limites do sistema

Serve B5. As colunas já existem na tabela `instances` do gateway
(migrations `0005-instance-send-interval`, `0006-instance-send-caps`,
`0007-instance-send-window`): `send_interval_seconds`, `hourly_cap`, `daily_cap`,
`send_window_start`, `send_window_end`.

O endpoint precisa devolver, junto dos valores configurados, **os limites do sistema** —
`INTERVALO_MINIMO_S`, `TETO_HORA_MAXIMO`, `TETO_DIA_MAXIMO`, `JANELA_INICIO_MINIMO_MIN`,
`JANELA_FIM_MAXIMO_MIN` (`src/fila/ritmo.ts`). Sem isso o formulário da B5 teria que
duplicar esses números no CRM, e eles sairiam de sincronia no primeiro ajuste.

A escrita recusa fora dos limites com motivo legível, no formato de erro da seção 5 do
contrato. O gateway **continua sendo a última palavra**: `aplicarLimites` já aperta o que
vier largo, e essa rede não sai.

### 3. Retomada dos envios de uma instância freada

Serve o comportamento "Solicitar a retomada dos envios de um número interrompido" (B4).
Hoje a liberação do freio só existe como **script na VPS** (`npm run freio`), decisão
registrada em `project-operacao-gateway-por-script`. Para o administrador do cliente
retomar pelo CRM, precisa ser endpoint.

> São **três** endpoints, e não os dois que a conversa inicial supunha. A retomada passou
> despercebida porque no gateway ela é operação nossa, por script.

---

## Comportamentos da spec cobertos

Nenhum, diretamente — esta issue é infraestrutura de fronteira. Ela **habilita** os 8
comportamentos de B4 e os 8 de B5, distribuídos entre `B4-01` a `B4-04` e `B5-01` a
`B5-02`.

---

## Contrato do gateway

Esta issue é a que **altera** o `contrato-v1.md`. Ordem obrigatória: especificar no
contrato primeiro, implementar depois. O contrato está marcado como congelado, e a regra
dele é avisar a Parte B antes de publicar, mesmo em mudança não quebrante.

Caminhos, nomes de campo e credencial de cada endpoint são **decisão desta issue** — as
issues de B4 e B5 apontam para cá e não inventam nada.

Credencial: pelo padrão da seção 1, tudo o que se refere a **um** número usa
`X-Instance-Token`. Nada disso chega ao navegador.

---

## Arquivos

No `whatsapp-gateway`:

- **Modificar:** `pre-desenvolvimento/contrato-v1.md` — seção 4, os três endpoints; seção
  5, os `error.code` novos que a escrita de ritmo precisar
- **Aproveitar:** `src/indicadores/indicadores.ts`, `src/fila/ritmo.ts`,
  `src/freio/freio.ts`, `src/instances/repositorio.ts` — a conta toda já está feita
- **Criar/Modificar:** as rotas, no padrão de `src/instances/rotas.ts`

No `CRM_exponencial`: **nada.**

---

## Depende de

Nada. É a primeira da fila — B4 e B5 esperam por ela.

---

## Critérios de aceite

- [ ] `contrato-v1.md` descreve os três endpoints: método, caminho, credencial, corpo e resposta
- [ ] O contrato registra onde o sinal de risco é calculado, e por quê
- [ ] O endpoint de saúde devolve consumo contra os tetos vigentes, dia de aquecimento, tetos do aquecimento e estado do freio
- [ ] O endpoint de ritmo devolve os valores configurados **e** os limites do sistema
- [ ] A escrita de ritmo recusa valor fora do limite com `error.code` e mensagem legível
- [ ] A retomada do freio funciona por endpoint, e não só pelo script da VPS
- [ ] Testes da Parte A cobrindo os três, no padrão do repo
- [ ] Luan avisado de que o contrato mudou, antes de ele começar B4 ou B5

## Fora de escopo

- Qualquer tela ou código no CRM — é B4 e B5
- Classificar o risco dentro do gateway, se a decisão for classificar no CRM
- Endpoint de configuração de ritmo em lote, para vários números de uma vez
- Mexer no cálculo do aquecimento, dos tetos ou do freio: eles estão prontos e testados
