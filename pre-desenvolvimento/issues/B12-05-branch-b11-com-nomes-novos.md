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
