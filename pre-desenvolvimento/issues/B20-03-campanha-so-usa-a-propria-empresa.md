# B20-03: Campanha só usa número e dados da própria empresa

**Tipo:** Implementação
**Página:** Campanhas (`/campanhas`)
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-seguranca-rodada-2.md` — módulo 2

## Descrição

Toda campanha passa a ser conferida contra a empresa de quem age: ao salvar (número
escolhido), ao confirmar (campanha e destinatários) e na hora de disparar (credencial do
número). Códigos de campanha ou de número de outra empresa são recusados.

## Pronto quando

Criar, editar, confirmar, agendar e disparar campanha continuam funcionando; e testes
automatizados provam que salvar com número de outra empresa é recusado, que o disparo
nunca usa a credencial de número alheio (a campanha falha com motivo no relatório) e que
salvar ou confirmar com o código de campanha de outra empresa é recusado sem mexer nos
destinatários dela.
