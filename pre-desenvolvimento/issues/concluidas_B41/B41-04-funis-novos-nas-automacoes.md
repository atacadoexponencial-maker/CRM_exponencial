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
- **CA-B41-30** (automática) — Gatilho dispara pela etapa do funil novo. Dado uma automação ligada com o gatilho "Card movido para etapa" em "Feira de Março" → "Confirmou", quando uma pessoa move um card desse funil para "Confirmou" (arrastando, pelo painel ou ao adicionar o contato direto nessa etapa), então a automação roda para aquele contato. Ela não roda quando o card entra em outra etapa, nem para a etapa de mesmo nome em outro funil, nem quando quem moveu o card foi outra automação (automação não dispara automação, regra da B11).
- **CA-B41-31** (automática) — Condição confere a etapa do funil novo. Dado uma automação com a condição "Card está na etapa" em "Feira de Março" → "Confirmou", quando ela roda para um contato que está nessa etapa e para outro que não está nesse funil, então o primeiro segue pela saída "sim" e o segundo pela saída "não"
- **CA-B41-32** (automática) — A automação coloca o contato no funil novo. Dado uma automação com a ação "Mover card" para "Feira de Março" → "Convidado", quando ela roda para um contato que não está nesse funil, e depois para um que já está em outra etapa dele, então o primeiro ganha um card em "Convidado", e o segundo tem o card movido para "Convidado". Os dois ficam com a mudança no histórico. Como em Entrada e Recompra, esse movimento feito pela automação não dispara outras automações.
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
| PER-B41-10 | Card movido por automação num funil novo dispara outras automações de "Card movido"? | respondida | Marcelle, 23/10/2026: não; mantém a regra da B11 (automação não dispara automação), igual a Entrada e Recompra |

## Cenários

### Happy Path
1. O editor de automações recebe os funis da empresa com as etapas (`carregarOpcoesEditor`). No gatilho "Card movido para etapa", na condição "Card do contato está em" e na ação "Mover card", a escolha de funil lista Funil de Entrada, Funil de Recompra e os funis da empresa. Escolhido um funil da empresa, aparecem as etapas dele, na ordem.
2. Ao salvar, o servidor confere no banco que o funil é da empresa e a etapa é desse funil.
3. Uma pessoa move um card de funil da empresa: arrasta, usa o painel ou adiciona o contato (o card nasce na primeira etapa). O evento "card movido" leva o id do funil e o da etapa, e as automações daquele funil e daquela etapa rodam.
4. A condição "Card do contato está em" confere o card do contato naquele funil e naquela etapa.
5. A ação "Mover card" para um funil da empresa:
   - contato sem card nesse funil: o card nasce na etapa escolhida;
   - contato com card: o card muda de etapa, com uma linha no histórico.
   Como em toda ação de automação, esse movimento não dispara outras automações (PER-B41-10).
6. As frases de resumo, na lista e no editor, usam os nomes atuais. O funil e a etapa são guardados pelo id, então renomear não quebra nada.
7. Apagar etapa ou funil (tela de funis):
   - a confirmação lista as automações, ligadas ou não, que usam o que vai ser apagado;
   - confirmado, elas ficam desligadas;
   - na lista de automações e no editor, o bloco aparece com "precisa de ajuste, o funil ou a etapa escolhida foi apagada".
8. Ligar uma automação marcada é recusado, com o nome do bloco que precisa de ajuste. Depois que alguém escolhe outro funil ou etapa e salva, ela liga, e a marca some, porque é calculada na hora.

### Edge Cases
- A marca "precisa de ajuste" não fica gravada: é a conferência que já existe no ligar (B22-27) e o aviso de opção apagada da lista (`referenciasQueSumiram`).
- Só o Admin lê as automações pela RLS, mas o Gerente também apaga funis. Por isso a busca das automações afetadas e o desligar rodam no servidor, com a chave de serviço e presos à empresa de quem pediu.
- Fluxo fora do formato: a busca procura o id no texto do fluxo, para não deixar uma automação de fora.
- Simulação ("testar com um contato") de gatilho em funil da empresa usa o card do contato naquele funil.
- Se a ação mover para uma etapa apagada depois de salva, o banco recusa (23514) e a ação falha com "O funil ou a etapa escolhida não existe mais".

### Cenário de Erro
- Salvar ou ligar com etapa que não é do funil, com funil de outra empresa ou com funil apagado: recusado com mensagem.
- Falha ao desligar as automações depois de apagar: o ligar continua recusando, então a regra não roda com etapa apagada.

## Prova

| Critério | Prova | Onde | O que confere |
|---|---|---|---|
| CA-B41-29 | automática | `src/test/funis-nas-automacoes.test.ts` | A escolha de funil traz Entrada, Recompra e "Feira de Março", e as etapas do funil da empresa vêm na ordem, no gatilho, na condição e na ação |
| CA-B41-30 | automática | `src/test/funis-nas-automacoes.integration.test.ts` | Mover para "Confirmou" pela tela roda a automação (tag no contato); mover para outra etapa, ou mover por outra automação, não roda |
| CA-B41-31 | automática | `src/test/funis-nas-automacoes.integration.test.ts` | A condição vale para o contato na etapa e não vale para quem não está no funil |
| CA-B41-32 | automática | `src/test/funis-nas-automacoes.integration.test.ts` | A ação cria o card em "Convidado" para quem não está e move quem está, com o histórico, sem disparar outra automação |
| CA-B41-33 | automática | `src/test/funis-nas-automacoes.integration.test.ts` | Salvar com etapa de outro funil, com funil de outra empresa ou com funil apagado é recusado |
| CA-B41-34 | automática | `src/test/funis-nas-automacoes.test.ts` | A frase de resumo diz o nome atual: "Feira de Março" e, depois de renomear, "Feira de Abril" |
| CA-B41-06 | automática | `src/test/funis-nas-automacoes.integration.test.ts` | Depois de renomear o funil e a etapa, os cards ficam na mesma coluna, a automação liga e roda, e o resumo mostra os nomes novos |
| CA-B41-11 | automática | `src/test/funis-nas-automacoes.integration.test.ts` | O aviso lista a automação; apagar a etapa (pelo Gerente) e apagar o funil deixam a automação desligada, com "precisa de ajuste" no bloco |
| CA-B41-41 | automática | `src/test/funis-nas-automacoes.integration.test.ts` | Ligar sem mudar é recusado, com o nome do bloco; depois de escolher outra etapa e salvar, liga, e a marca some |

## Arquivos

- **Modificar:** `src/app/(auth)/configuracoes/automacoes/components/catalogo.ts` — `funisDoEditor`, `etapasDoFunil` com os funis da empresa, `funilEEtapaExistem` e a marca "precisa de ajuste" em `referenciasQueSumiram`.
- **Modificar:** `src/app/(auth)/configuracoes/automacoes/opcoes-editor.ts` — carregar os funis da empresa com as etapas.
- **Modificar:** `src/app/(auth)/configuracoes/automacoes/components/frases-fluxo.ts` — nomes dos funis e das etapas da empresa nas frases.
- **Modificar:** `src/app/(auth)/configuracoes/automacoes/components/painel-bloco.tsx` — os seletores de funil e etapa usam os funis da empresa.
- **Modificar:** `src/app/(auth)/configuracoes/automacoes/actions.ts` — a conferência ao salvar e ligar olha os funis da empresa no banco e nomeia o bloco que precisa de ajuste.
- **Modificar:** `src/lib/automacoes/referencias.ts` — etapas citadas com o bloco, e `etapaValida` com os funis da empresa.
- **Modificar:** `src/lib/automacoes/contexto.ts` — o evento "card movido" aceita funil da empresa.
- **Modificar:** `src/lib/automacoes/simulacao.ts` — a simulação usa o funil escolhido.
- **Modificar:** `src/lib/automacoes/acoes.ts` — "Mover card" cria o card no funil da empresa e trata a etapa que não existe mais.
- **Modificar:** `src/app/(auth)/pipeline/actions.ts` — adicionar contato ao funil dispara o "card movido"; o tipo do funil no evento.
- **Modificar:** `src/app/(auth)/configuracoes/funis/actions.ts` — `automacoesQueUsam`; apagar etapa ou funil desliga as automações afetadas.
- **Modificar:** `src/app/(auth)/configuracoes/funis/funis-client.tsx` — o aviso lista as automações que vão ser desligadas.
- **Modificar:** `src/test/automacoes-fluxo-recebido.test.ts` — as etapas citadas agora dizem o bloco.
- **Criar:** `src/test/funis-nas-automacoes.test.ts` — opções do editor e frases.
- **Criar:** `src/test/funis-nas-automacoes.integration.test.ts` — motor, salvar, ligar e apagar, no banco de verdade.

## Checklist

- [x] Editor: funis da empresa nos seletores, nas frases e no aviso de opção apagada
- [x] Servidor: conferência ao salvar e ligar, evento, simulação e ação "Mover card"
- [x] Adicionar contato dispara o "card movido"
- [x] Apagar etapa ou funil avisa e desliga as automações
- [x] Testes da tabela Prova
- [x] `npx tsc --noEmit`, lint e testes passando
