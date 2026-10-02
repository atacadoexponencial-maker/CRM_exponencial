# B12-05: Branch da B11 com os nomes novos

**Tipo:** Implementação
**Página:** Protótipo de automações (`/configuracoes/automacoes/prototipo`) e documentos da B11
**Repositório:** `crm-exponencial`, branch `b11-automacoes-v2`
**Spec:** `pre-desenvolvimento/spec-renomear-funis.md` — seção "Coordenação com a série B11"

## Descrição

Trazer a `master` (com B12-01 a 04) para o branch `b11-automacoes-v2` do Luan e trocar
os nomes antigos que só existem lá: dados de exemplo do protótipo (funis, times, regra
"Lead qualificado vai para a Expansão", `funil: "expansao"`, `time-expansao`), imports
das constantes renomeadas na B12-04, `spec-automacoes-v2.md`, as issues B11 e
`decisoes/B11-automacoes-em-fluxo.md` reescritos no branch. Commit próprio, com mensagem
dizendo o que mudou e por quê. Marcelle confirma antes que o Luan não tem nada pendente
no branch.

Depende de B12-04 estar na `master`.

## Pronto quando

O protótipo do branch abre no preview e funciona igual, mostrando "Funil de Entrada",
"Funil de Recompra" e os times "Entrada"/"Recompra"; uma busca por expans/retenc no
diff do branch contra a `master` não acha nada; e o Luan é avisado de que pode retomar.

## Cenários

### Happy Path
1. Conferir que o branch não mudou desde 01/10 00:45 (`ffa26ab`) — Luan avisado pela
   Marcelle em 02/10 e sem atividade.
2. Num worktree separado, `git merge master` no `b11-automacoes-v2`.
3. Resolver o único conflito (`pre-desenvolvimento/README.md`, tabela "Em andamento"):
   manter a linha da B11 do Luan (fluxo de blocos) e acrescentar a linha da B12.
4. Trocar os nomes antigos que só existem no branch (lista abaixo), em commit próprio.
5. `tsc`, lint e build do branch; push do branch; o preview do Vercel abre o protótipo.

### Edge Cases
- `package-lock.json` cita "brace-expansion" (nome de pacote npm): não é o funil, fica.
- `pre-desenvolvimento/referencia/sessao-2026-09-30-b11-automacoes.md` (ata de 30/09)
  cita "funil de Expansão" ao relatar o defeito de acentos: é registro histórico, fica.
- `spec-automacoes-v2.md` e `decisoes/B11-automacoes-em-fluxo.md` do branch não citam os
  nomes antigos (busca de 02/10).
- Merge em vez de rebase: não reescreve a história que o Luan já tem localmente.

### Cenário de Erro
- Se o branch tiver commit novo do Luan na hora do merge: parar e perguntar à Marcelle.
- Se o merge trouxer conflito além do README: parar e informar.

## Banco de Dados

Não se aplica (o protótipo usa dados de exemplo).

## Arquivos

No branch `b11-automacoes-v2` (worktree em pasta temporária):

- **Modificar (merge):** `pre-desenvolvimento/README.md` — resolver o conflito.
- **Modificar:** `src/app/(auth)/configuracoes/automacoes/components/catalogo.ts` — import
  `ETAPAS_ENTRADA`/`ETAPAS_RECOMPRA`, funis `entrada`/`recompra` com nomes "Funil de
  Entrada"/"Funil de Recompra" (l. 26, 69–74).
- **Modificar:** `src/app/(auth)/configuracoes/automacoes/prototipo/dados-exemplo.ts` — times
  `time-entrada`/`time-recompra` ("Entrada"/"Recompra"), regra "Lead qualificado vai para
  a Entrada", `funil: "entrada"` (l. 33–34, 132–143).
- **Modificar:** `pre-desenvolvimento/issues/B11-01-prototipo-editor-de-regra.md` (l. 162, 235).
- **Modificar:** `pre-desenvolvimento/issues/B11-08-atribuir-time-sequencia-conversa-e-horario.md` (l. 22).

## Dependências Externas

Nenhuma.

## Checklist

- [ ] Branch sem commit novo desde `ffa26ab`
- [ ] Merge da `master` com o conflito do README resolvido
- [ ] Nomes trocados nos 4 arquivos do branch, em commit separado do merge
- [ ] Busca por expans/retenc no branch: só `package-lock.json` e a ata de 30/09
- [ ] `npx tsc --noEmit`, `npm run lint` e `npm run build` no branch
- [ ] Push do branch e preview do protótipo abrindo
- [ ] Mensagem para o Luan com o que mudou (Marcelle envia)
