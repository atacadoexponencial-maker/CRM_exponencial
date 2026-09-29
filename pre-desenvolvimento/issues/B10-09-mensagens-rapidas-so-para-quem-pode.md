# B10-09: Mensagens Rápidas só no menu de quem pode abrir

**Tipo:** Implementação
**Página:** Menu lateral — Mensagens Rápidas
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-navegacao-fluida.md`

## Descrição

Mostrar o item Mensagens Rápidas no menu apenas para admin, e corrigir a
consulta de perfil da página para buscar o perfil do usuário logado (hoje
busca "um perfil qualquer" e falha quando o admin enxerga mais de um).

Cobre os dois comportamentos de "Menu lateral — Mensagens Rápidas".

## Pronto quando

No CRM publicado, gerente e atendente não veem Mensagens Rápidas no menu; um
admin numa empresa com dois ou mais usuários abre a página normalmente e vê a
lista.
