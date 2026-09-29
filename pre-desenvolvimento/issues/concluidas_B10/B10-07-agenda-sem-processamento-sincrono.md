# B10-07: Agenda abre sem processar sequências

**Tipo:** Implementação
**Página:** Agenda (minha e da equipe)
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-navegacao-fluida.md`
**Depende de:** B10-03

## Descrição

Retirar da abertura da Agenda o processamento de sequências vencidas e os
envios de WhatsApp que vinham junto, deixando esse trabalho só com a rotina
agendada já existente. Lembretes e conversas ligadas a eles passam a carregar
em paralelo com a identidade resolvida uma vez.

Cobre os comportamentos de "Agenda (minha e da equipe)".

## Pronto quando

No CRM publicado, com uma sequência vencida plantada, abrir a Agenda não envia
mensagem nem cria lembrete novo; a rotina agendada, quando roda, processa
essa mesma sequência. A lista de lembretes e a Agenda da equipe mostram o
mesmo conteúdo de antes.

## Cenários

### Happy Path
1. Vendedor abre Agenda: a página usa `sessaoAtual()`; `listarMinhaAgenda`
   busca só os lembretes pendentes dele e, com os contatos em mãos, as
   conversas ligadas. Nenhuma sequência é processada, nada é enviado.
2. Gerente abre Agenda da equipe: lembretes e sequências em andamento já saem
   juntos; conversas vêm depois (dependem dos contatos).
3. O cron diário `/api/cron/sequencias` continua sendo o único lugar que
   processa sequências vencidas.

### Edge Cases
- A busca de conversas depende dos contatos dos lembretes; não há como
  paralelizá-la sem conhecer os contatos. Fica sequencial, uma consulta só,
  como já era. Registrado aqui como decisão.
- Sequência vencida entre um cron e outro: só é processada no próximo cron.
  É a regra da spec: abrir a Agenda não dispara envios.

### Cenário de Erro
- Sem sessão: `redirect("/login")` nas páginas, vazio nas actions, como hoje.

## Banco de Dados
Não se aplica.

## Arquivos

- **Modificar:** `src/app/(auth)/agenda/actions.ts` — remove a chamada a
  `processarSequenciasPendentes` (e o import) de `listarMinhaAgenda`.
- **Modificar:** `src/app/(auth)/agenda/page.tsx` e
  `src/app/(auth)/agenda/equipe/page.tsx` — `sessaoAtual()`.

## Dependências Externas
Nenhuma.

## Checklist

- [x] Abrir a Agenda não chama o processamento de sequências
- [x] Páginas da Agenda com sessão única
- [x] `npm run lint`, `npm run build` e testes passando
- [x] Conferido no build local: Agenda e Agenda da equipe renderizam
