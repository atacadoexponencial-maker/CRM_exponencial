# B22-07: Evento que não entra na fila não roda, e fica no histórico

**Tipo:** Correção
**Página:** Motor de automações (fila)
**Repositório:** `crm-exponencial`
**Origem:** `pre-desenvolvimento/analise-qa/qa-automacoes-2026-10-09.md`, achado **M2**
**Depende de:** B22-06 (mesmo lote, branch `b22-lote-motor`)

## Descrição

Se gravar o evento na fila falhava (erro passageiro do banco), as regras rodavam
mesmo assim, fora da fila. Sem a ordem por contato, mensagens seguidas do cliente
podiam disparar a mesma resposta em dobro: a proteção de repetição de uma não
enxerga a outra (decisões, seção 11.1).

## Pronto quando

Evento que não entrou na fila não roda nenhuma regra, e cada regra que ele
dispararia aparece no histórico como "falhou", com o motivo.

## Plano (09/10/2026)

### Decisão do Luan (09/10)

**Não rodar e registrar** (em vez de rodar sem a fila, como antes). Mesmo princípio
da proteção de repetição: melhor não disparar do que disparar em dobro.

- `processarAutomacoes` ganha a opção `naoRodarPorque`: carrega as regras que o
  evento dispararia e grava cada uma como "falhou", sem executar nada e sem
  consultar a proteção. Usa o mesmo caminho do prazo da B22-06.
- Motivo: "Não rodou: o evento não entrou na fila de automações (erro no banco)".
- Continua depois da resposta, como antes.

### Limite aceito

Se o banco estiver fora do ar, o histórico também não grava, e o evento se perde
sem rastro. É o mesmo banco que a fila e o histórico usam.

## Cenários

### Happy Path
- Evento gravado na fila: consome como antes.

### Cenário de Erro
- Gravação na fila falha: nenhuma regra roda; cada uma vai para o histórico como "falhou", com o motivo.

## Arquivos

- **Modificar:** `src/lib/automacoes/index.ts` — opção `naoRodarPorque`, `SEM_FILA`.
- **Modificar:** `src/lib/automacoes/fila.ts` — sem fila, chama o motor com `naoRodarPorque`.
- **Modificar:** `src/test/automacoes-fila.test.ts` — o teste de "sem fila" muda de expectativa.
- **Modificar:** `src/test/automacoes.test.ts` — evento fora da fila só registra.
- **Modificar:** `pre-desenvolvimento/decisoes/B11-automacoes-em-fluxo.md` — seção 23; 11.3 aponta para ela.
- **Modificar:** `pre-desenvolvimento/analise-qa/qa-automacoes-2026-10-09.md` — M2 resolvido.

## Checklist

- [x] Sem fila, nenhuma regra roda
- [x] Cada regra que o evento dispararia fica no histórico como "falhou", com o motivo
- [x] Testes novos falham sem o conserto e passam com ele
- [x] Suíte unitária, lint e build (exit code) passando
- [x] Decisão registrada (seção 23) e M2 marcado no QA
