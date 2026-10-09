# B22-02: "Atribuir atendente" só para quem está ativo

**Tipo:** Correção
**Página:** Motor de automações; Configurações → Automações → editor (salvar)
**Repositório:** `crm-exponencial`
**Origem:** `pre-desenvolvimento/analise-qa/qa-automacoes-2026-10-09.md`, achado **A3**
**Depende de:** B22-01 (mesmo lote, branch `b22-lote-motor`)

## Descrição

A ação "atribuir atendente" aceitava usuário desativado: a regra era salva e a
execução ficava "concluída", com a conversa e o card passados para alguém que não
entra mais no CRM. O editor já lista só os ativos, mas o servidor não conferia, nem
ao salvar, nem ao executar (o atendente pode ser desativado depois de a regra ser
salva). O "atribuir ao time" já escolhia só entre os ativos.

## Pronto quando

Salvar uma regra cuja ação atribui a um atendente desativado é recusado, com o
motivo. Uma regra salva antes da desativação, ao rodar, não atribui e fica no
histórico com "O atendente está desativado".

## Plano (09/10/2026)

### Decisões

O raciocínio completo está na seção 18 de `decisoes/B11-automacoes-em-fluxo.md`.

- **Ativo só para quem recebe.** A condição "atendente é Fulano" também cita um
  atendente, e citar um desativado ali é legítimo: a conversa pode continuar com
  ele. Por isso a lista de referências do fluxo ganha `atendentesAtribuidos` (os
  das ações), e só esses precisam estar ativos.
- **Ao salvar:** mensagem "Um atendente escolhido está desativado. Escolha outro."
- **Ao executar:** antes de gravar, o motor lê o perfil do atendente na empresa.
  Não existe → "O atendente não existe mais"; desativado → "O atendente está
  desativado"; erro na consulta → "Erro ao gravar no banco", sem atribuir.
- **Reativar a regra não confere** (é o M8, de outro lote): uma regra ativa com
  atendente desativado continua ativa e falha com o motivo no histórico.

## Cenários

### Happy Path
- Regra com atendente ativo: salva e atribui como antes.

### Edge Cases
- Atendente desativado só numa condição: salva.
- Atendente desativado depois de salvar: a ação falha com o motivo e não mexe na conversa nem no card.
- Atendente excluído ou de outra empresa: "O atendente não existe mais".

### Cenário de Erro
- Erro ao conferir o atendente: não atribui; a ação conta como erro.

## Arquivos

- **Modificar:** `src/lib/automacoes/referencias.ts` — `atendentesAtribuidos`.
- **Modificar:** `src/app/(auth)/configuracoes/automacoes/actions.ts` — `conferirReferencias` exige ativo para `atendentesAtribuidos`.
- **Modificar:** `src/lib/automacoes/acoes.ts` — `impedimentoDoAtendente` antes de `atribuir`.
- **Modificar:** `src/test/automacoes-acoes.test.ts` — testes antigos com atendente ativo; casos novos.
- **Modificar:** `src/test/automacoes.test.ts` — teste do motor com atendente ativo.
- **Modificar:** `src/test/automacoes-fluxo-recebido.test.ts` — `atendentesAtribuidos`.
- **Criar:** `src/test/automacoes-salvar-regra.test.ts` — `salvarRegra` com atendente ativo, desativado e desativado só na condição.
- **Modificar:** `pre-desenvolvimento/decisoes/B11-automacoes-em-fluxo.md` — seção 18.
- **Modificar:** `pre-desenvolvimento/analise-qa/qa-automacoes-2026-10-09.md` — A3 resolvido.

## Checklist

- [x] Salvar recusa atendente desativado numa ação, e aceita numa condição
- [x] Motor não atribui a atendente desativado ou excluído, com o motivo
- [x] Testes novos falham sem o conserto e passam com ele
- [x] Suíte unitária, lint e build (exit code) passando
- [x] Decisão registrada (seção 18) e A3 marcado no QA
