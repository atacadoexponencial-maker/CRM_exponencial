# B9-02: Botão Reconectar volta sem QR Code, e cai para o QR do mesmo número

**Tipo:** Implementação
**Página:** CRM — Configurações → WhatsApp (cartão do número do canal direto)
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-desconectar-reconectar.md`
**Depende de:** B9-01 (forma aprovada) e A10-02 (operação no ar)

## Descrição

Ligar o botão Reconectar do cartão à operação Reconectar do gateway: mostra
"Reconectando…" sem aceitar segundo clique, passa a "conectado" sozinho com o
aviso de sucesso, e, se a sessão acabou, explica o motivo e oferece um QR Code
novo para o mesmo número. Os textos de efeito das três ações ficam como
aprovados na B9-01.

Cobre, em "CRM — Configurações → WhatsApp", os comportamentos: Desconectar,
Reconectar sem QR, Ver a reconexão em andamento, Ver o número voltar sem
recarregar, Cair para o QR quando a sessão acabou, Ver o motivo de outras
recusas, Não criar número novo e Conversas continuam no número.

## Pronto quando

Com um chip real, no CRM publicado: desconectar e depois clicar em Reconectar
traz o número de volta sem ler QR e sem F5, e responder numa conversa antiga
funciona. Removendo o aparelho pelo celular durante a pausa, Reconectar mostra o
motivo e abre o QR do mesmo número; lido o QR, a lista continua com um número só.
