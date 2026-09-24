# B9-03: Cartão mostra há quanto tempo o número está pausado, e avisa a partir de 10 dias

**Tipo:** Implementação
**Página:** CRM — Configurações → WhatsApp (cartão do número do canal direto)
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-desconectar-reconectar.md`
**Depende de:** B9-01 (forma aprovada) e A10-01 (pausa distinguível de queda)

## Descrição

O cartão passa a distinguir número desconectado a pedido de número que caiu (e
está tentando voltar), mostra desde quando o número está desconectado a pedido e,
a partir de 10 dias, exibe o aviso de que o WhatsApp pode desfazer a conexão se o
celular ficar mais de 14 dias sem uso, recomendando reconectar. O aviso some ao
reconectar.

Cobre, em "CRM — Configurações → WhatsApp", os comportamentos: Distinguir pausa
de queda no cartão, Ver há quanto tempo está desconectado, Ser avisado de pausa
longa e Ver o aviso sumir.

## Pronto quando

Um número desconectado a pedido mostra "Desconectado há N dias"; com a data da
desconexão recuada para 10 dias atrás, o cartão mostra o aviso de pausa longa, e
ao reconectar o aviso some. Um número que caiu por perda de conexão aparece como
"tentando voltar", e não como pausado.
