# B11-02: Motor que percorre o fluxo de blocos, sem quebrar as regras de hoje

**Tipo:** Implementação
**Página:** Motor de automações
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-automacoes-v2.md`
**Decisões:** `pre-desenvolvimento/decisoes/B11-automacoes-em-fluxo.md`
**Depende de:** nada (fundação; B11-03 a B11-09 dependem dela)

## Descrição

Trocar a estrutura da regra: em vez de um gatilho e uma ação, um fluxo de
blocos (gatilho, condição, ação) e ligações entre eles. O motor passa a
percorrer o fluxo a partir do gatilho: numa condição, avalia as verificações
(E) e segue pelo "sim" ou pelo "não"; numa ação, executa e segue, mesmo que a
ação falhe; termina numa saída sem ligação.

As regras existentes ganham o fluxo equivalente (gatilho → ação) sem o admin
fazer nada, e continuam funcionando igual. **A migration só acrescenta**: a
estrutura antiga fica no banco, intacta, porque o `master` publicado continua
lendo dela até o merge (ver a seção 4 das decisões). A limpeza é depois do
merge.

As verificações e ações desta issue são só as que já existem hoje, mais as de
canal e de conversa (etiqueta, atendente, funil e etapa); as demais entram nas
próximas.

Cobre, no "Motor": avaliar regras, percorrer o fluxo, aplicar condições,
executar ações, guardar as regras existentes.

## Pronto quando

Depois da migration, as automações que existiam seguem disparando igual (card
movido e conversa criada), e o CRM publicado (ainda no código antigo) não é
afetado. Um fluxo criado por script, "gatilho → condição de canal → sim:
etiqueta e depois mensagem / não: outra mensagem", executa o caminho certo
conforme o canal. Testes automatizados do motor cobrem condição com sim e com
não, ação que falha no meio do caminho, caminhos que se juntam, saída sem
ligação encerrando o caminho, e fluxo com laço recusado.
