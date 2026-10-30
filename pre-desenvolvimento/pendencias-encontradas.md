Pendências que encontrei ao longo do caminho e quero que sejam trabalhadas: 

1. ✅ Criei uma automação de boas-vindas simples apenas para teste, ao receber uma mensagem adicionar uma tag e responder usando a variável "{{primeiro_nome}}", mas a resposta apareceu sem o nome.

2. ✅ O chat da pessoa vem sem foto, eu sei que algumas pessoas bloqueam as imagens e disponibilizam apenas para os contatos salvos, mas podemos criar um ícone padrão para estes casos. 
   - Feito em 15/10: contato sem nome mostra um ícone de pessoa; com nome, as iniciais.
   - A fazer depois (funcionalidade nova, começar por /triagem): mostrar a foto de perfil real. Hoje o CRM não busca foto nenhuma. A API Oficial da Meta não fornece foto; o canal direto (Baileys) consegue buscar a de quem não esconde, mas precisa de endpoint novo no gateway e de lugar para guardar no CRM.

3. Conectei o número via canal diretoo, e quando respondo no celular ele não aparece lá no CRM. 
   - 15/10: o gateway descarta de propósito o que sai do celular. Virou spec própria, aprovada: `spec-canal-direto-envio-pelo-celular.md` (série B25). Falta `/break` e a implementação; antes, a Marcelle avisa o Luan da mudança no contrato.

4. Não há tela informando sobre a questão de aquecimento do número, a mensagem simplemente não é enviada sem nenhum aviso sobre. 
   - 15/10: virou spec própria, `spec-mensagem-na-fila.md` (série B26): relógio "Na fila do número" no chat, ✓ que atualiza sem recarregar e faixa de aquecimento em Campanhas. A hora prevista de saída fica para uma melhoria do gateway.
   - 15/10: B26-01, B26-02 e B26-03 no ar. Falta só o teste com chip da B26-02 (relógio virando ✓ quando a vaga abre) para fechar.

5. ✅ Ativei uma automação de primeira compra, quando o card que estava na pipeline Entrada é movido para ganho ele recebe um novo time, de recompra, e o time de recompra tem um atendente responsável cadastrado e foi criado sem atendente. No caso de times com apenas 1 atendente cadastrado a atribuição deveria ser automática. 

6. ✅ Ao logar aparece embaixo que não foi possível conectar, e logo em seguida conecta. Não entendi. 
   - 16/10: corrigido na tela de login (`ddfd008`). 17/10: Marcelle conferiu na produção: o aviso sumiu e a senha errada continua avisando. Era o "Não foi possível entrar": a troca de página depois do login certo chegava à tela como erro.

7. Estamos com muitas delays nos cliques, parece que nada vai acontecer, precisamos otimizar o sistema, verificar o que pode estar causando lentidão. 
   - 16/10: medido. 27 telas não tinham esqueleto de carregamento, e o clique ficava 0,6 a 1,6 s sem mudar nada. No ar (`4500bc8`): agora o esqueleto aparece em ~0,01 s. Falta o passo 2: reduzir o tempo do servidor (~1 s) na Saúde e no Ritmo. Ele repete a checagem de login e consulta o gateway duas vezes. Para medir com o número real, precisa de um login temporário na Marcelle Midias.
   - 17/10: passo 2 virou a série B27 (porteiro rápido), no ar em `387ef37`. Lista do WhatsApp de 0,64 s para 0,435 s; Saúde de 0,86 s para 0,68 s; Ritmo de 0,95 s para 0,69 s. Faltam os 2 testes manuais da B27-01: aceitar a medição e o teste do usuário desativado.

8. Testei enviar mensagem do aparelho, como se fosse um atendente usando o celular e não chegou no CRM. Logo se o atendente responder via aplicativo no celular, as informações serão perdidas.
## 21/10/2026 (manhã) — dashboard não conta compra de hoje antes do meio-dia

- `src/lib/metricas-dashboard.ts` (B30-03): a receita filtra `new Date(p.data + "T12:00:00") <= fim`, e `fim` é o agora. De manhã, a compra registrada hoje (data = hoje) fica fora até 12h. Os testes CA-B30-16/17/18 e CA-B30-02 falham quando rodam de manhã e passam à tarde.
- Correção provável: `fim` no fim do dia (23:59:59) no `rangeDoPeriodo`, ou comparar só a data. Fora do escopo da B31; precisa de decisão para entrar como issue.

## 30/10/2026 — campanha não aparece na conversa do Chat

- No reteste da B53 (roteiro do Luan), a Marcelle mandou uma campanha com imagem: chegou no celular, mas não aparece na conversa do contato no CRM. Não é defeito: a campanha nunca gravou a mensagem na conversa, só o destinatário (`src/lib/campanhas.ts`; já conferido na B26, SUP-B26-03 invalidada).
- Ela quer isso depois, como funcionalidade nova (começar por /triagem): a mensagem da campanha aparecer na conversa, com o mesmo tique de entregue e lido.
