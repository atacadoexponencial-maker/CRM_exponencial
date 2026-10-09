# B22-03: "Atribuir" põe a conversa em espera em atendimento

**Tipo:** Correção
**Página:** Motor de automações
**Repositório:** `crm-exponencial`
**Origem:** `pre-desenvolvimento/analise-qa/qa-automacoes-2026-10-09.md`, achado **A4**
**Depende de:** B22-02 (mesmo lote, branch `b22-lote-motor`)

## Descrição

As ações "atribuir atendente" e "atribuir ao time" gravavam o responsável, mas
deixavam a conversa em "Em espera". O "Atribuir" do chat põe a conversa em "em
atendimento". Com atendente e em espera, o chat só oferece "Atribuir", sem
Transferir nem Resolver.

## Pronto quando

Depois de "atribuir atendente" ou "atribuir ao time", uma conversa que estava em
espera fica em atendimento, com o atendente, como no chat.

## Plano (09/10/2026)

### Decisões

O raciocínio está na seção 19 de `decisoes/B11-automacoes-em-fluxo.md`.

- **Em espera → em atendimento**, como `atribuirConversa` do chat.
- **Resolvida continua resolvida.** A conversa do evento pode estar resolvida
  (ex.: etiqueta aplicada numa conversa resolvida). Reabrir é a ação "reabrir
  conversa"; atribuir não reabre.
- **Em atendimento:** só troca o responsável, como hoje.
- O status é lido antes de gravar; erro na leitura não grava na conversa, segue
  para o card e a ação conta como erro (as duas gravações já eram independentes).

## Cenários

### Happy Path
- Conversa em espera, "atribuir atendente": fica em atendimento com o atendente.
- O mesmo com "atribuir ao time".

### Edge Cases
- Conversa em atendimento: só troca o atendente.
- Conversa resolvida: continua resolvida, com o atendente novo.

### Cenário de Erro
- Erro ao ler a conversa: não grava nela, passa o card e a ação conta como erro.

## Arquivos

- **Modificar:** `src/lib/automacoes/acoes.ts` — `atribuir` lê o status e põe em atendimento.
- **Modificar:** `src/test/automacoes-acoes.test.ts` — os cenários acima.
- **Modificar:** `pre-desenvolvimento/decisoes/B11-automacoes-em-fluxo.md` — seção 19.
- **Modificar:** `pre-desenvolvimento/analise-qa/qa-automacoes-2026-10-09.md` — A4 resolvido.

## Checklist

- [x] `atribuir` põe em atendimento a conversa em espera
- [x] Resolvida e em atendimento não mudam de status
- [x] Testes novos falham sem o conserto e passam com ele
- [x] Suíte unitária, lint e build (exit code) passando
- [x] Decisão registrada (seção 19) e A4 marcado no QA
