# B11-03: Histórico de execuções e proteção contra disparo repetido

**Tipo:** Implementação
**Página:** Configurações → Automações → Histórico; Motor
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-automacoes-v2.md`
**Depende de:** B11-02

## Descrição

Toda avaliação de regra vira um registro: concluída, ignorada pela proteção ou
falhou, com o caminho percorrido (a saída tomada em cada condição e o
resultado de cada ação) e o motivo de cada falha em português. A regra
ganha a proteção de repetição (uma vez por contato, uma vez a cada N horas por
contato, ou sempre), aplicada pelo motor. A página de Histórico lista as
execuções dos últimos 30 dias com filtros por regra, resultado e período, e
abre o detalhe de cada uma, inclusive de regras já excluídas.

Cobre "Histórico" inteira e, no "Motor", registrar execuções e respeitar a
proteção.

## Pronto quando

Uma regra "uma vez por contato" disparada duas vezes para o mesmo contato
aparece no histórico como concluída e depois como ignorada, com o motivo. Uma
ação apontando para uma etiqueta apagada aparece como falhou, com o motivo, e
as ações seguintes no caminho aparecem como concluídas.

## Plano (07/10/2026)

### Decisões do plano

O raciocínio completo está na seção 8 de `decisoes/B11-automacoes-em-fluxo.md`.

- **Uma tabela de execuções, `automation_runs`.** Cada execução guarda uma
  cópia do que importa para lê-la depois, mesmo se a regra mudar ou for
  excluída: o nome da regra, o evento e o caminho. O caminho tem a cópia de cada
  bloco percorrido, a saída tomada e o resultado. A regra é apontada por
  `regra_id` sem chave estrangeira, porque pode ser uma regra em fluxo, uma regra
  antiga ou uma regra já excluída.
- **Resultado da execução:**
  - `concluida`: o caminho terminou sem falha.
  - `falhou`: alguma ação falhou, ou uma condição deu erro.
  - `ignorada`: a proteção de repetição barrou.
  Cada ação no caminho tem o próprio resultado. Assim, uma ação que falhou e as
  seguintes que deram certo aparecem como tal.
- **Ações devolvem o motivo da falha em português** ("O contato não tem
  conversa aberta", "A etiqueta não existe mais", "Nenhum número de WhatsApp
  conectado"). O envio de texto ganha uma versão que devolve o motivo. A versão
  que devolve só certo ou errado continua, para as sequências.
- **Proteção de repetição** por regra, numa coluna `repeticao` em
  `automation_flows`:
  - "Uma vez por contato": barra se já houve uma execução concluída ou com falha
    para a regra e o contato.
  - "No máximo a cada N horas": barra se houve uma nas últimas N horas.
  - Sem contato no evento, não há o que proteger, e a regra roda.
  - As regras antigas e as convertidas delas ficam em "sempre", que é como
    funcionavam.
  - Regra nova nasce com "uma vez por contato", como no protótipo aprovado.
- **Página de histórico** em `/configuracoes/automacoes/historico`:
  - Lista as execuções dos últimos 30 dias (ou 7), com filtro por regra e por
    resultado nos parâmetros do endereço.
  - O detalhe abre na própria página, com o caminho bloco a bloco.
  - O menu "Ver histórico" da lista abre a página já filtrada.
- **Colunas da lista:** "Execuções (7 dias)" conta as concluídas e as com falha.
  "Última execução" usa a mais recente das duas.

### Cenários

#### Happy Path

1. Um evento dispara uma regra.
2. O motor confere a proteção de repetição, percorre o fluxo e grava uma
   execução com o caminho.
3. O admin abre o histórico, filtra pela regra e abre o detalhe. Vê a saída de
   cada condição e o resultado de cada ação.

#### Edge Cases

- **Regra "uma vez por contato" disparada de novo para o mesmo contato:** grava
  a execução como `ignorada`, com o motivo, e não percorre o fluxo.
- **"A cada N horas" depois das N horas:** roda de novo.
- **Ação que falha:** a ação fica com o motivo, as seguintes rodam, e a
  execução fica `falhou`.
- **Regra excluída:** as execuções continuam, com o nome que a regra tinha.
- **Bloco que não existe mais na regra atual:** o detalhe mostra a cópia
  gravada na execução.
- **Contato excluído de vez:** a execução fica, sem o link do contato.
- **Contato na lixeira:** nada roda e nada é gravado, como hoje.
- **Simulação ("Testar com um contato"):** não grava execução.

#### Cenário de Erro

- Falha ao gravar a execução: não derruba nada. As ações já rodaram, e o motor
  segue para a próxima regra.
- Falha ao consultar a proteção: a regra não roda, e a execução é gravada como
  `falhou`, com o motivo. É melhor não disparar do que disparar em dobro.

### Banco de Dados

Migration **só de acréscimo**: `supabase/migrations/20261007000002_automation_runs.sql`.

- `automation_flows.repeticao` (jsonb, padrão `{"modo":"sempre"}`): a proteção
  da regra, `{ modo, horas? }`.
- Tabela `automation_runs`:
  - `id` (uuid, pk)
  - `workspace_id` (uuid, fk `workspaces`, cascade)
  - `regra_id` (uuid, sem fk) e `regra_origem` (`fluxo` ou `antiga`)
  - `regra_nome` (text): o nome da regra na hora da execução
  - `contact_id` (uuid, fk `contacts`, `on delete set null`)
  - `evento` (jsonb): o tipo do gatilho e os dados dele (funil, etapa, card,
    conversa)
  - `resultado` (text): `concluida`, `falhou` ou `ignorada`
  - `motivo` (text, nulo): por que foi ignorada, ou o erro que encerrou a regra
  - `caminho` (jsonb): os passos, com a cópia do bloco, a saída tomada, o
    resultado da ação e o motivo
  - `created_at` (timestamptz)
- Índices:
  - `(workspace_id, created_at desc)`, para a página.
  - `(regra_id, contact_id, created_at desc)` só das que não foram ignoradas,
    para a proteção.
- RLS: o admin da empresa lê. Só o service client grava.

### Arquivos

- **Criar:** `supabase/migrations/20261007000002_automation_runs.sql`.
- **Modificar:** `src/integrations/supabase/types.ts`, regenerado.
- **Modificar:** `src/lib/fluxo-automacao.ts`:
  - `ResultadoAcao` (`{ ok: true }` ou `{ ok: false; motivo }`).
  - `percorrerFluxo` guarda o motivo de cada ação.
  - `REPETICAO_DISPONIVEL = true`.
  - `lerRepeticao` (formato e limites da proteção).
- **Modificar:** `src/lib/whatsapp-envio.ts`: `enviarTextoWhatsAppComMotivo`.
  `enviarTextoWhatsApp` passa a usá-la e mantém o retorno.
- **Modificar:** `src/lib/automacoes/acoes.ts`: cada falha com o motivo em
  português.
- **Criar:** `src/lib/automacoes/execucoes.ts`: a proteção de repetição
  (`motivoParaIgnorar`) e a gravação da execução (`registrarExecucao`).
- **Modificar:** `src/lib/automacoes/index.ts`: proteção antes de percorrer e
  registro depois.
- **Modificar:** `src/lib/automacoes/simulacao.ts`: ações desligadas devolvem
  `{ ok: true }`.
- **Modificar:** `src/app/(auth)/configuracoes/automacoes/actions.ts`:
  - Salvar e abrir a regra com a proteção.
  - As contagens da lista.
  - `listarExecucoes` para a página.
- **Criar:** `src/app/(auth)/configuracoes/automacoes/historico/page.tsx` e
  `historico-client.tsx`: a página, os filtros e o detalhe.
- **Modificar:** `src/app/(auth)/configuracoes/automacoes/components/frases-fluxo.ts`:
  `fraseDoEvento`.
- **Modificar:** `src/app/(auth)/configuracoes/automacoes/components/lista-regras.tsx`
  e `lista-client.tsx`: colunas de execução, "Ver histórico" e o link para a
  página.
- **Modificar:** `src/app/(auth)/configuracoes/automacoes/[id]/editor-client.tsx`:
  a proteção da regra.
- **Testes:**
  - `src/test/automacoes.test.ts`: registro, proteção e falha.
  - `src/test/fluxo-automacao.test.ts`: motivos e `lerRepeticao`.
  - `src/test/automacoes-acoes.test.ts`: o novo retorno e os motivos.
  - `src/test/automacoes-simulacao.test.ts`.
- **Criar:** `e2e/preview/roteiro-b11-03.cjs`: o "Pronto quando" no preview.
- **Modificar:** `pre-desenvolvimento/decisoes/B11-automacoes-em-fluxo.md`
  (seção 8).

### Checklist

- [ ] Migration aplicada e `types.ts` regenerado
- [ ] `ResultadoAcao` e motivos em todas as ações; envio com motivo
- [ ] Proteção de repetição no motor, com execução `ignorada`
- [ ] Registro da execução com o caminho
- [ ] Editor salva e abre a proteção; regra nova nasce "uma vez por contato"
- [ ] Página de histórico com filtros e detalhe
- [ ] Lista com execuções em 7 dias, última execução e "Ver histórico"
- [ ] Testes automatizados e suíte unitária passando; build com código 0
- [ ] Roteiro no preview passando
- [ ] Registro de decisões (seção 8)
