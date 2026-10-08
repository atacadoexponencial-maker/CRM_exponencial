# B21-02: Atendente só alcança os cards e contatos dele

**Tipo:** Implementação
**Página:** Funis Entrada e Recompra, Contatos, Agenda
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-seguranca-rodada-3.md` — módulo 1 (funil, contatos e agenda)

## Descrição

O funil passa a mostrar ao Atendente só os cards em que ele é o atendente; perfil de contato,
etiquetas/edição/exclusão de contato e "Novo follow-up" passam a aceitar só contatos dele; e
o banco aplica a mesma regra para cards, histórico, notas e contatos. Lead criado pelo
Atendente nasce com ele como atendente. Inclui os achados A1 e A2 do QA.

## Pronto quando

Entrando como atendente de teste: os funis mostram só os cards dele; mover, anotar e criar
lead funcionam (o lead novo aparece no funil dele); contato alheio aberto pela URL mostra
"Contato não encontrado"; "Novo follow-up" só lista contatos dele. Testes automatizados
provam que, pelo CRM e direto no banco, o atendente não lê nem altera cards, histórico,
notas ou contatos de colegas, não troca responsável/contato de card e não agenda follow-up
para contato alheio. Reatribuir (Admin/Gerente) passa o card para o novo dono. Admin e
Gerente seguem vendo tudo.
