# B10-04: Chat abre com consultas em paralelo e lista limitada

**Tipo:** Implementação
**Página:** Chat
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-navegacao-fluida.md`
**Depende de:** B10-03

## Descrição

Reescrever a carga do Chat: identidade resolvida uma vez, listas auxiliares
(atendentes, atendentes para transferência, etiquetas, mensagens rápidas) e
conversas carregadas ao mesmo tempo, lista de conversas limitada às 50 mais
recentes com "carregar mais" ao rolar até o fim, e a conversa indicada na URL
sempre aberta mesmo fora das 50.

Cobre todos os comportamentos de "Chat" na spec.

## Pronto quando

No CRM publicado, com mais de 50 conversas de teste, o Chat abre mostrando as
50 mais recentes, rolar até o fim traz as seguintes, e abrir uma URL com uma
conversa antiga abre essa conversa. O tempo de resposta do servidor cai em
relação a antes, e transferir, etiquetar e usar mensagem rápida seguem
funcionando.
