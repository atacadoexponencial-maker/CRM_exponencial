# B22-01: A proteção de repetição só gasta a vez quando alguma ação rodou

**Tipo:** Correção
**Página:** Motor de automações
**Repositório:** `crm-exponencial`
**Origem:** `pre-desenvolvimento/analise-qa/qa-automacoes-2026-10-09.md`, achado **G1**
**Depende de:** B11-03 (no ar)

## Descrição

"Uma vez por contato" e "no máximo a cada N horas" contavam toda execução
concluída ou com falha. Uma execução que só passou por condições e saiu pelo
"não" sem ação nenhuma, ou cujas ações falharam todas, gastava a vez do contato.

Exemplo do QA: regra "texto contém catálogo → tag". O cliente manda "oi", a regra
sai pelo "não" e fica gravada como "concluída". Depois ele manda "catálogo" e a
regra o ignora para sempre. O mesmo acontecia com "fora do horário → ausência"
para quem escreveu às 10h, e com uma falha passageira de banco, que fica gravada
como "falhou" e também contava.

Decisão da Marcelle (09/10/2026): só gastar a vez quando alguma ação rodou.

## Pronto quando

A proteção só barra o contato se já houve, para a regra e o contato (e, no "a
cada N horas", dentro da janela), uma execução com pelo menos uma ação que deu
certo. Execução sem ação, com todas as ações falhando, ou que falhou antes de
percorrer o fluxo não gasta a vez.

## Plano (09/10/2026)

### Decisões

O raciocínio completo está na seção 17 de `decisoes/B11-automacoes-em-fluxo.md`.

- **"Ação rodou" = ação com `ok: true` no caminho gravado.** Ação que não mudou
  nada porque o contato já estava como ela deixaria (tag que ele já tem) já conta
  como feita desde a B11-03, então também gasta a vez. Ação que falhou não gasta:
  a mensagem não chegou, e a próxima vez tenta de novo.
- **Sem migration.** O caminho de cada execução já guarda o resultado de cada
  ação (`automation_runs.caminho`, B11-03). A consulta da proteção passa a pedir
  que o caminho contenha uma ação com `ok: true` (`caminho @> '[{"bloco":{"tipo":"acao"},"ok":true}]'`).
- **O filtro `resultado <> 'ignorada'` fica.** Ele já não muda o resultado
  (execução ignorada não tem caminho), mas é a condição do índice parcial
  `automation_runs_protecao`: sem ele, a consulta deixa de usar o índice.
- **Vale para o histórico que já existe.** Contato que teve a vez gasta por uma
  execução sem ação volta a ser atendido na próxima mensagem.

### Fora desta issue

- A repetição padrão da regra nova ("uma vez por contato"). O seletor já existe
  no editor; a decisão sobre o padrão e sobre deixar o seletor mais visível fica
  com o Luan e a Marcelle.

## Cenários

### Happy Path
- Regra "uma vez por contato" com execução anterior que aplicou uma etiqueta: ignorada.
- Regra "uma vez por contato" com execução anterior que só saiu pelo "não": roda.

### Edge Cases
- Execução anterior com uma ação que falhou e outra que deu certo: gasta a vez.
- Execução anterior em que todas as ações falharam: não gasta a vez.
- Execução anterior "falhou" sem caminho (erro ao conferir a proteção, erro inesperado): não gasta a vez.
- "A cada N horas": só contam as execuções com ação dentro da janela.
- Execução com ação de outra regra ou de outro contato: não conta.

### Cenário de Erro
- Erro do banco ao conferir a proteção: não roda e grava "falhou", como antes.

## Arquivos

- **Modificar:** `src/lib/automacoes/execucoes.ts` — `motivoParaIgnorar` pede uma ação com `ok: true` no caminho.
- **Modificar:** `src/test/automacoes.test.ts` — o filtro novo na consulta da proteção.
- **Criar:** `src/test/automacoes-protecao.integration.test.ts` — `motivoParaIgnorar` contra o banco real, com execuções gravadas em cada cenário.
- **Modificar:** `pre-desenvolvimento/decisoes/B11-automacoes-em-fluxo.md` — 8.3 aponta para a seção 17, nova.
- **Modificar:** `pre-desenvolvimento/analise-qa/qa-automacoes-2026-10-09.md` — G1 resolvido.
- **Modificar:** `pre-desenvolvimento/issues/README.md` — série B22.

## Checklist

- [x] `motivoParaIgnorar` conta só execuções com ação que deu certo
- [x] Teste unitário do filtro
- [x] Teste de integração com os cenários acima passando
- [x] Suíte unitária, lint e build (exit code) passando
- [x] Decisão registrada (seção 17) e G1 marcado no QA
