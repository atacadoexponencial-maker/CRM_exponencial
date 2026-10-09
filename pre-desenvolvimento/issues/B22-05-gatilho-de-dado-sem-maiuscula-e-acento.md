# B22-05: Gatilho "dado do contato alterado" sem diferença de maiúscula e acento

**Tipo:** Correção
**Página:** Motor de automações
**Repositório:** `crm-exponencial`
**Origem:** `pre-desenvolvimento/analise-qa/qa-automacoes-2026-10-09.md`, achado **M1**
**Depende de:** B22-04 (mesmo lote, branch `b22-lote-motor`)

## Descrição

O gatilho "dado do contato alterado" com valor comparava o texto exato: uma regra
para a cidade "são paulo" não disparava quando o vendedor digitava "São Paulo". E
trocar só a caixa ("São Paulo" → "são paulo") contava como alteração e disparava
as regras do campo.

## Pronto quando

O valor do gatilho casa sem diferença de maiúscula, acento e espaços repetidos,
como as verificações de texto. Trocar só maiúscula, acento ou espaço grava o valor
novo, mas não dispara o gatilho.

## Plano (09/10/2026)

- Reaproveita `normalizarTexto` (`src/lib/catalogo/planilha.ts`), a mesma das
  verificações de texto da B11-04 (`verificacoes.ts`).
- `gatilhoCorresponde` compara os valores normalizados.
- `camposQueMudaram` compara os valores normalizados; o valor que vai no evento e
  no banco continua o que a pessoa digitou.

## Cenários

### Happy Path
- Gatilho "cidade = são paulo", vendedor grava "São Paulo": dispara.

### Edge Cases
- Gatilho "cidade = são paulo", valor "São Paulo do Potengi": não dispara.
- Vendedor troca "São Paulo" por "são paulo": grava, mas não dispara.

## Arquivos

- **Modificar:** `src/lib/automacoes/index.ts` — `gatilhoCorresponde`.
- **Modificar:** `src/lib/automacoes/gatilhos-do-crm.ts` — `camposQueMudaram`.
- **Modificar:** `src/test/automacoes.test.ts` — o valor casa normalizado.
- **Modificar:** `src/test/automacoes-gatilhos-do-crm.test.ts` — troca só de caixa não conta.
- **Modificar:** `pre-desenvolvimento/decisoes/B11-automacoes-em-fluxo.md` — seção 9.3 aponta para cá.
- **Modificar:** `pre-desenvolvimento/analise-qa/qa-automacoes-2026-10-09.md` — M1 resolvido.

## Checklist

- [x] Valor do gatilho comparado sem maiúscula, acento e espaço
- [x] Troca só de caixa, acento ou espaço não dispara
- [x] Testes novos falham sem o conserto e passam com ele
- [x] Suíte unitária, lint e build (exit code) passando
- [x] Decisão registrada e M1 marcado no QA
