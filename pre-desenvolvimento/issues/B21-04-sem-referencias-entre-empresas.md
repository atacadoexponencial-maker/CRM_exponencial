# B21-04: Nenhum registro aponta para outra empresa

**Tipo:** Implementação
**Página:** Todo o CRM (times, automações, sequências, chat, funil, etiquetas)
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-seguranca-rodada-3.md` — módulo 3

## Descrição

O banco passa a recusar qualquer registro que ligue empresas diferentes (usuário em time,
automação com etiqueta/atendente/time/sequência/número, sequência para contato ou conversa,
mensagens, etiquetas, notas, histórico). Antes de fechar, uma verificação procura registros
antigos que já apontem para outra empresa e os lista para a Marcelle decidir.

## Pronto quando

A verificação dos dados atuais foi rodada e o resultado mostrado à Marcelle (vazio, ou com
a decisão dela aplicada); o CRM segue funcionando como hoje; e há um teste automatizado por
tipo de ligação provando que gravar referência para algo de outra empresa é recusado.
