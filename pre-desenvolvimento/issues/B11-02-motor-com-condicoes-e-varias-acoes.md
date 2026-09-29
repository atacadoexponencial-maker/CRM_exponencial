# B11-02: Motor com condições e várias ações por regra, sem quebrar as regras de hoje

**Tipo:** Implementação
**Página:** Motor de automações
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-automacoes-v2.md`
**Depende de:** nada (fundação; B11-03 a B11-09 dependem dela)

## Descrição

Trocar a estrutura da regra: em vez de uma ação, uma lista ordenada de ações;
em vez de nada, uma lista de condições avaliadas com E. O motor passa a avaliar
condições e executar as ações em ordem, seguindo com as próximas quando uma
falha. As regras existentes são migradas para a estrutura nova sem o admin
fazer nada, e continuam funcionando igual. As condições e ações desta issue
são só as que já existem hoje mais as de canal e de conversa (etiqueta,
atendente, funil e etapa); as demais entram nas próximas.

Cobre, no "Motor": avaliar regras, aplicar condições, executar ações em ordem,
guardar as regras existentes.

## Pronto quando

Depois da migração, as automações que existiam seguem disparando igual (card
movido e conversa criada). Uma regra criada por script com duas ações
(etiqueta + mensagem) e uma condição de canal executa as duas na ordem e só no
canal escolhido. Testes automatizados do motor cobrem condição falsa, ação que
falha no meio e ordem das ações.
