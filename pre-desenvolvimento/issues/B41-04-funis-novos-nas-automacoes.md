# B41-04: Funis novos nas automações

**Tipo:** Implementação
**Página:** Configurações → Automações
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-funis-personalizados.md`

## Descrição

Gatilho, condição e ação de funil passam a oferecer os funis novos e as etapas deles; a ação Mover card cria o card no funil novo; apagar funil ou etapa em uso desliga a automação e marca "precisa de ajuste". Depende da B41-01.

## Pronto quando

Uma automação com gatilho ou ação num funil novo funciona de ponta a ponta, e apagar o funil que ela usa avisa e deixa a automação desligada até ser corrigida.

## Critérios de aceite

- **CA-B41-29** (automática) — O editor de automação oferece os funis novos. Dado a empresa com o funil "Feira de Março", quando alguém escolhe o funil no gatilho "Card movido para etapa", na condição "Card está na etapa" ou na ação "Mover card", então as opções são "Funil de Entrada", "Funil de Recompra" e "Feira de Março". Escolhido "Feira de Março", as etapas oferecidas são as dele, na ordem do funil.
- **CA-B41-30** (automática) — Gatilho dispara pela etapa do funil novo. Dado uma automação ligada com o gatilho "Card movido para etapa" em "Feira de Março" → "Confirmou", quando um card desse funil é movido para "Confirmou", pela tela ou por outra automação, então a automação roda para aquele contato. Ela não roda quando o card entra em outra etapa, nem para a etapa de mesmo nome em outro funil.
- **CA-B41-31** (automática) — Condição confere a etapa do funil novo. Dado uma automação com a condição "Card está na etapa" em "Feira de Março" → "Confirmou", quando ela roda para um contato que está nessa etapa e para outro que não está nesse funil, então o primeiro segue pela saída "sim" e o segundo pela saída "não"
- **CA-B41-32** (automática) — A automação coloca o contato no funil novo. Dado uma automação com a ação "Mover card" para "Feira de Março" → "Convidado", quando ela roda para um contato que não está nesse funil, e depois para um que já está em outra etapa dele, então o primeiro ganha um card em "Convidado", e o segundo tem o card movido para "Convidado". Os dois ficam com a mudança no histórico e disparam os gatilhos de card movido.
- **CA-B41-33** (automática) — Salvar automação com etapa que não é do funil é recusado. Dado uma automação montada fora da tela, com uma etapa que não existe no funil escolhido, com um funil de outra empresa ou com um funil apagado, quando alguém tenta salvá-la, então o servidor recusa, como já faz com etapa desconhecida
- **CA-B41-34** (automática) — Resumo da automação usa o nome atual do funil. Dado uma automação que usa "Feira de Março" → "Confirmou", quando o funil é renomeado para "Feira de Abril", então a frase de resumo da automação, na lista e no editor, passa a dizer "Feira de Abril"
- **CA-B41-06** (automática) — Renomear o funil ou a etapa não mexe nos cards. Dado um funil com cards na etapa "Confirmou", e uma automação que move cards para essa etapa, quando o Admin renomeia o funil para "Feira de Abril" e a etapa para "Confirmado", então os cards continuam na mesma coluna, que agora se chama "Confirmado"; a aba passa a se chamar "Feira de Abril"; e a automação continua funcionando e já mostra os nomes novos
- **CA-B41-11** (automática) — Apagar etapa ou funil em uso avisa e desliga a automação. Dado uma automação, ligada ou desligada, que usa o funil "Feira de Março" ou uma das etapas dele, no gatilho, numa condição ou numa ação, quando alguém pede para apagar esse funil ou essa etapa, então a confirmação avisa e lista o nome das automações afetadas. Se a pessoa desiste, nada muda. Se confirma, o funil ou a etapa é apagado, e cada automação afetada fica desligada e marcada "precisa de ajuste" na lista de automações.
- **CA-B41-41** (automática) — Automação marcada "precisa de ajuste" só liga depois de corrigida. Dado uma automação desligada porque o funil ou a etapa que ela usava foi apagado, quando alguém tenta ligá-la sem mudar nada, e depois escolhe outro funil ou outra etapa no bloco afetado e liga, então a primeira tentativa é recusada, com o aviso de qual bloco precisa de ajuste. Depois da correção, ela liga, e a marca "precisa de ajuste" some.

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B41-06 | Apagar etapa ou funil vale também para automação desligada: a trava conta todas as automações da empresa, não só as ligadas | invalidada | Marcelle, 23/10/2026: não trava; permite apagar com aviso, e as automações afetadas (ligadas ou desligadas) ficam desligadas e marcadas "precisa de ajuste" (CA-B41-11 e CA-B41-41) |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| PER-B41-06 | Como o contato entra num funil novo? | respondida | Marcelle, 23/10/2026: botão "Adicionar contato" no quadro (Admin e Gerente) e ação "Mover card" das automações |
| PER-B41-08 | Ao apagar funil, o que acontece? | respondida | Marcelle, 23/10/2026: confirma com o número de cards, e os cards saem junto; a trava por automação foi trocada pelo aviso e pelo desligamento (ver SUP-B41-06) |
