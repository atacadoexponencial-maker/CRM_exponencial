# B13-06: Lixeira se esvazia sozinha depois de 30 dias

**Tipo:** Implementação
**Página:** — (rotina diária, sem tela)
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-lixeira-contatos.md`

## Descrição

Rotina diária que apaga de vez (mesmo efeito do "Apagar de vez" da B13-04, inclusive
arquivos de mídia) tudo o que está na lixeira há mais de 30 dias. Só o próprio sistema
pode acionar: chamada de fora sem a credencial do agendador é recusada. Se o caminho for
a rota de cron do Vercel, exige `CRON_SECRET` configurado (hoje não está) — a Marcelle
configura antes de a rotina entrar no ar. Falha num item não impede os outros.

Depende de B13-04.

## Pronto quando

Um contato com data de exclusão de 31 dias atrás some do banco (com cards, conversas e
arquivos) na rodada seguinte da rotina; um de 29 dias continua na lixeira; e chamar a
rotina de fora, sem credencial, é recusado.
