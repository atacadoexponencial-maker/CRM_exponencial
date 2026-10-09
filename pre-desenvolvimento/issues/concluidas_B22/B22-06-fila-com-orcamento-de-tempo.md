# B22-06: Fila com orçamento de tempo, sem perder evento em silêncio

**Tipo:** Correção
**Página:** Motor de automações (fila)
**Repositório:** `crm-exponencial`
**Origem:** `pre-desenvolvimento/analise-qa/qa-automacoes-2026-10-09.md`, achados **A1** e **A2**
**Depende de:** B22-05 (mesmo lote, branch `b22-lote-motor`)

## Descrição

- **A1.** Um consumo da fila parava em 50 eventos do contato. O resto ficava
  esperando o próximo evento do mesmo contato e, se ele não viesse em 10 minutos,
  era descartado sem aparecer no histórico.
- **A2.** Um evento com mais de 5 minutos rodando era marcado como descartado pelo
  banco enquanto ainda rodava, e o próximo evento do contato rodava junto. Na
  Vercel, a função é cortada em ~300 s, e as regras que faltavam sumiam sem
  registro.

## Pronto quando

Nenhuma regra some em silêncio por falta de tempo: o que não deu tempo de rodar
aparece no histórico como falha, com o motivo. A fila não para mais em 50 eventos.

## Plano (09/10/2026)

### Decisão do Luan (09/10)

**Orçamento de tempo** (em vez de só registrar o que se perde, mantendo os limites).
O raciocínio completo está na seção 22 de `decisoes/B11-automacoes-em-fluxo.md`.

- O consumo mede o tempo desde o começo, sem limite de quantidade.
- **Até 240 s,** as regras rodam normalmente.
- **De 240 s a 270 s,** os eventos que a fila ainda entregar só registram as
  regras deles como "falhou", com o motivo "Não rodou: o tempo desta execução
  acabou antes de chegar nesta regra". É rápido: uma leitura e uma gravação por regra.
- **Depois de 270 s,** o consumo para de pegar eventos. O que sobrar espera o
  próximo evento do contato, como antes.
- Nada muda no banco: com o consumo terminando antes dos 300 s, um evento ainda
  rodando não chega aos 5 minutos em que o banco o considera perdido.

### Limite aceito

Se sobrar evento depois dos 270 s e o contato não mandar mais nada em 10
minutos, o banco descarta o evento sem histórico, como antes. Para isso, um
contato precisa acumular mais de 4 minutos e meio de eventos seguidos.

## Cenários

### Happy Path
- 60 eventos rápidos do mesmo contato: rodam todos no mesmo consumo.

### Edge Cases
- Regra que só começaria depois do prazo: não roda e fica no histórico como "falhou", com o motivo.
- Consumo que passa de 270 s: para de pegar eventos.

## Arquivos

- **Modificar:** `src/lib/automacoes/fila.ts` — `PRAZO_DAS_REGRAS_MS`, `PRAZO_DA_FILA_MS`; sai `LIMITE_POR_CONSUMO`.
- **Modificar:** `src/lib/automacoes/index.ts` — opção `prazo` em `processarAutomacoes`, `SEM_TEMPO`.
- **Modificar:** `src/test/automacoes-fila.test.ts` — orçamento do consumo.
- **Modificar:** `src/test/automacoes.test.ts` — regra depois do prazo.
- **Modificar:** `pre-desenvolvimento/decisoes/B11-automacoes-em-fluxo.md` — seção 22; 11.3 aponta para ela.
- **Modificar:** `pre-desenvolvimento/analise-qa/qa-automacoes-2026-10-09.md` — A1 e A2 resolvidos.

## Checklist

- [x] Consumo sem limite de quantidade, com prazo de 270 s
- [x] Regras depois de 240 s registradas como "falhou", com o motivo
- [x] Testes novos falham sem o conserto e passam com ele
- [x] Suíte unitária, lint e build (exit code) passando
- [x] Decisão registrada (seção 22) e A1/A2 marcados no QA
