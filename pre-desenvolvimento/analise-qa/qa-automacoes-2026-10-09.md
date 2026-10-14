# Achados do QA das Automações v2 — 09/10/2026

Seis agentes testaram a B11 contra o build local (`next start`, gateway
bloqueado, nenhuma mensagem real enviada) e o Supabase real, cada um numa empresa
`[TESTE] QA Automações <raia>`. Nada foi corrigido. Os relatórios detalhados de cada
agente (passos, scripts e prints) ficam fora do git, na máquina da Marcelle, em
`.qa-agentes/automacoes/`: peça a ela se precisar da evidência de algum item.

Legenda: [ ] aberto · (N agentes) = achado independente por mais de um agente ·
✔ = conferido por mim no código.

Total: nenhum crítico de segurança. 1 grave de regra de negócio, 5 altos, ~20 médios, vários baixos.

## Andamento das correções (série B22)

Atualizado em 14/10/2026. As correções vão em **lotes por área**, um
branch por lote, que entra no `master` ao fim do lote, depois dos roteiros do
preview (decidido pelo Luan em 09/10). Cada achado vira uma issue `B22-NN` em
`issues/concluidas_B22/`, e a decisão vai para `decisoes/B11-automacoes-em-fluxo.md`
(seções 17 em diante).

### Feito: lote 1, motor (no ar desde 09/10/2026)

Branch `b22-lote-motor`, juntado no `master`.

| Issue | Achado | O que mudou |
|---|---|---|
| B22-01 | G1 | Proteção de repetição só gasta a vez quando alguma ação deu certo |
| B22-02 | A3 | "Atribuir atendente" recusa desativado ao salvar e falha com motivo ao rodar |
| B22-03 | A4 | Atribuir põe em atendimento a conversa em espera; resolvida continua resolvida |
| B22-04 | A6 | "Atribuir ao time": fica com quem já é do time; escolha travada no banco (migration `20261009000001`, aplicada) |
| B22-05 | M1 | Gatilho de dado do contato sem diferença de maiúscula e acento |
| B22-06 | A1, A2 | Fila com orçamento de tempo; o que não roda vai para o histórico |
| B22-07 | M2 | Evento que não entra na fila não roda e vai para o histórico |
| — | M7 | Conferido, sem mudança: número fora do ar falha, sem trocar de número (seção 21) |

Verificado: 648 testes unitários, testes de integração no banco real, lint e
build com código 0, e 7 roteiros do preview (72 verificações) passando.

### Feito: lote 2, editor (no ar desde 14/10/2026)

Branch `b22-lote-editor`, aberto em 13/10/2026 a partir do `master` e juntado
nele em 14/10, com aprovação do Luan. Pela
`/triagem`, os itens do lote são **delimitados**: o desenho é aprovado no chat e
não há arquivo de issue. Cada item continua com commit `B22-NN` e seção nas
decisões.

| Issue | Achado | O que mudou |
|---|---|---|
| B22-08 | A5, U2 | "Alterações não salvas", confirmação ao sair pelo "Automações", aviso do navegador ao fechar a aba e rascunho no navegador (seção 24) |
| B22-09 | G1 (padrão) | Repetição no painel do gatilho, com rótulo, e frase no bloco; regra nova em "sempre" nos gatilhos de mensagem (seção 25) |
| B22-10 | M9 | Resultado do teste sai do canvas quando o fluxo muda, com "Testar de novo" (seção 26) |
| B22-11 | M10 | Testar só com o fluxo completo, conferido no servidor e marcado na tela (seção 27) |
| B22-12 | M11 | Campo de horas deixa apagar; fração e acima de um ano avisam no painel e o Salvar recusa (seção 28) |
| B22-13 | U1 | "Duplicar" no painel da condição e da ação; a cópia nasce solta, à direita do original, e selecionada (seção 29) |
| B22-14 | U3 | Botões de variável no campo "Mensagem", que inserem no cursor (seção 30) |

Verificado no fim do lote: 730 testes unitários, lint de `src` e `e2e` e build
com código 0. No preview, os roteiros `roteiro-b22-08.cjs` a `roteiro-b22-14.cjs`
(86 verificações) e os 7 roteiros do lote 1 (72 verificações) passaram. O
`roteiro-b11-04.cjs` para no webhook
simulado: o segredo do gateway só existe no preview do branch
`b11-automacoes-v2` (README de `e2e/preview/`), e por isso ele também ficou de
fora no lote 1.

### A fazer

### Em andamento: lote 3, histórico e lista

Branch `b22-lote-historico`, aberto em 14/10/2026 a partir do `master`. Decisões
na seção 31; roteiro do preview `roteiro-b22-historico.cjs`.

| Issue | Achado | O que mudou |
|---|---|---|
| B22-15 | M12 | Detalhe da execução com botão "Fechar" |
| B22-16 | M13 | Histórico no celular: contato embaixo da automação, data e hora em duas linhas |
| B22-17 | M14 | Contato da linha com link para o perfil |
| B22-18 | M15 | Cópia de regra com nome longo mantém o "(cópia)" |
| B22-19 | M16 | Filtro mostra o nome da regra excluída; `?regra=` desconhecida é ignorada com aviso; erro do banco aparece |
| B22-20 | M17 | Lista vazia pelo filtro diz isso e oferece "Limpar filtros" |

Falta: M18.

**Lote 4, o resto:** A7 (card de Recompra que o atendente não consegue criar
ao arrastar para Ganho), M3, M4, M5, M6, M8, segurança (M19, M20, M21) e os baixos.

Decidido pelo Luan em 14/10: no A7, a action de mover cria o card de Recompra com
a chave de serviço, sem mudar a RLS; no M21, só o admin lê as regras, com a
migration que troca a política aplicada no merge do lote 4.

### Decisões pendentes

- Se incomodar: atribuir numa conversa **resolvida** troca o atendente e a
  mantém resolvida (decidido na B22-03, seção 19).

### Aviso sobre a empresa de teste

Em 09/10, a "[TESTE] Automações B11" estava sem contatos, conversas, cards e
etiquetas, e os roteiros do preview paravam no começo. Os scripts de `e2e/preview/`
não apagam esses dados; o mais provável é a limpeza das empresas `[TESTE] QA
Automações …` ter pegado essa junto. Os dados-base foram repostos com os mesmos
passos do `criar-empresa-teste.cjs`. **Limpeza de empresas de teste não deve
filtrar só pelo prefixo `[TESTE]`.**

### Onde retomar

Lote 3 (M12 a M18), num branch `b22-lote-historico` a partir do `master`.

---

## 🔴 Grave

- [x] **G1. "Uma vez por contato" (padrão de regra nova) e "a cada N horas" gastam a vez quando a regra não fez nada.** Regra "texto contém catálogo → tag": cliente manda "oi", sai pelo "não", gravado "concluída"; depois manda "catálogo" → ignorada para sempre. Mesmo efeito com falha passageira (erro de banco grava `falhou`, que também conta). Ex.: "fora do horário → ausência" com cliente que escreveu às 10h nunca recebe ausência. `execucoes.ts:101-106` conta tudo que não é `ignorada`. Segue a decisão 8.3 ao pé da letra. **Decidido pela Marcelle (09/10): só gastar a vez quando alguma ação rodou; rever o padrão da regra nova (ex.: "sempre" nos gatilhos de mensagem).** ✔ (3 agentes: motor, código, bordas) → **Resolvido na B22-01 (09/10):** só gasta a vez execução com ação que deu certo. O padrão da regra nova ficou para decidir. → **Decidido na B22-09 (14/10):** "sempre" nos gatilhos de mensagem, "uma vez por contato" nos outros.

## 🟠 Altos

- [x] **A1. (rebaixado para médio em 09/10: raro, mas silencioso) Fila para em 50 eventos por contato e o resto é perdido sem histórico.** 62 eventos → 50 rodaram, 12 parados 27 min e descartados ("esperou demais") quando chegou o próximo — inclusive uma mensagem real. `fila.ts:56` para no limite e ninguém retoma; descarte em 10 min na migration `20261007000004…:59`. ✔ (bordas, código) → **Resolvido na B22-06 (09/10):** orçamento de tempo; o que não roda fica no histórico.
- [x] **A2. Evento com mais de 5 min vira "descartado" enquanto ainda roda** → o próximo do mesmo contato roda junto (quebra ordem e proteção de repetição); na Vercel a função morre em ~300 s e o que faltava some sem registro. Com 100 regras, um evento leva ~73 s local (~0,7 s por regra, em série). Migration `:55-56`. ✔ (bordas) → **Resolvido na B22-06 (09/10):** orçamento de tempo; o que não roda fica no histórico.
- [x] **A3. Atribuir atendente aceita usuário desativado** (salva a regra e executa "concluída"). `acoes.ts:290-307`, `actions.ts:222`. "Atribuir ao time" já filtra ativos. ✔ (3 agentes) → **Resolvido na B22-02 (09/10):** recusado ao salvar e, se desativado depois, a ação falha com o motivo.
- [x] **A4. Atribuir (atendente/time) deixa a conversa em "Em espera" com atendente** — o "Atribuir" do chat muda para "em atendimento"; nesse estado o chat só oferece "Atribuir" (sem Transferir/Resolver). `acoes.ts:295`. (motor, código) → **Resolvido na B22-03 (09/10):** em espera passa a em atendimento; resolvida continua resolvida.
- [x] **A5. Sair do editor sem salvar perde tudo sem aviso** (botão voltar, voltar do navegador, fechar aba); e "Automação salva" continua visível após novas edições. `editor-fluxo.tsx:312`. (editor) → **Resolvido na B22-08 (13/10):** "Alterações não salvas" no topo, confirmação no "Automações", aviso do navegador ao fechar a aba e rascunho no navegador para o voltar e o menu lateral.
- [x] **A6. "Atribuir ao time" conta a própria conversa como carga** → com "sempre" em mensagem recebida, a conversa alterna Ana/Bruno/Ana a cada mensagem. E leads simultâneos de contatos diferentes caem todos no mesmo atendente (rodam em paralelo). `acoes.ts:337-364`. (código — suspeita forte, não reproduzido na tela) → **Resolvido na B22-04 (09/10):** conversa com membro ativo do time fica com ele; escolha e gravação travadas por time numa função do banco.
- [ ] **A7. Atendente que arrasta card para Ganho:** o banco recusa em silêncio o card de Recompra (só admin/gerente cria) → não nasce card, gatilho "card movido Onboarding" nem sequência de onboarding. `pipeline/actions.ts:165-221`. Fora do módulo, mas afeta gatilhos. (código)

## 🟡 Médios

**Motor e regras**
- [x] M1. Gatilho "dado do contato alterado" com valor diferencia maiúsculas/acentos ("são paulo" ≠ "São Paulo"; trocar só a caixa conta como alteração). `index.ts:148`, `gatilhos-do-crm.ts:28`. (3 agentes) → **Resolvido na B22-05 (09/10).**
- [x] M2. Se a gravação na fila falha, as regras rodam sem fila → some a proteção contra envio em dobro. `fila.ts:33-35`. (código) → **Resolvido na B22-07 (09/10):** sem fila, não roda; cada regra vai para o histórico como falha.
- [ ] M3. API Oficial: resposta de botão, lista e cartão de contato chegam sem texto e como tipo "desconhecido". (código)
- [ ] M4. Falha de rede no envio aparece só como "Erro inesperado ao executar a ação". (motor)
- [ ] M5. Fluxo inválido gravado direto no banco (o admin pode, pela RLS): laço/dois gatilhos → regra pulada sem registro; bloco sem tipo ou 201 blocos → regra some da lista mesmo ativa (não dá para pausar/excluir pela tela); condição vazia → roda. (bordas)
- [ ] M6. Contato com dois cards no mesmo funil → mover card e condição de etapa falham com "erro no banco"; origem provável `criarNovoLead` sem conferir card existente (= A6 do QA de 06/10). (bordas)
- [x] M7. Envio usa o número gravado na conversa mesmo removido/desconectado (`whatsapp/index.ts:110`). (motor — suspeita) → **Conferido em 09/10, sem mudança:** o envio falha com "O número de envio estava fora do ar"; decidido não trocar de número (decisões, seção 21).

**Referências apagadas**
- [ ] M8. Etiqueta/time/mensagem rápida apagados: bloco e painel mostram o UUID em vez do nome; erro só no topo ao salvar, não no bloco; lista não avisa; reativar não confere; para time apagado o motivo engana ("time não tem atendente ativo"). `frases-fluxo.ts:19`. (editor, bordas)

**Editor**
- [x] M9. Resultado de "Testar com um contato" fica velho após editar o fluxo (só some em "Limpar"). (editor) → **Resolvido na B22-10 (14/10):** com o fluxo diferente, o caminho sai do canvas e a faixa oferece "Testar de novo".
- [x] M10. Simulação roda em fluxo que não poderia ser salvo (condição vazia = "sim"). `actions.ts:462`. (editor) → **Resolvido na B22-11 (14/10):** o servidor recusa e a tela marca o que falta antes de testar.
- [x] M11. Campo "N horas" não deixa apagar (vira "1" → digitar 48 dá 148); aceita 1,5 e 99999 até o servidor recusar. `editor-fluxo.tsx:352`. (editor) → **Resolvido na B22-12 (14/10):** o campo deixa apagar, e o inválido avisa no painel e trava o Salvar.

**Lista e histórico**
- [x] M12. Detalhe da execução sem botão de fechar (só Esc/tocar fora). `historico-client.tsx:200`. → **Resolvido na B22-15 (14/10).**
- [x] M13. Celular 390px: coluna Resultado cortada; coluna Contato some. `historico-client.tsx:177`. → **Resolvido na B22-16 (14/10).**
- [x] M14. Tabela do histórico sem link para o contato (spec pede). `historico-client.tsx:184`. → **Resolvido na B22-17 (14/10).**
- [x] M15. Duplicar regra com nome de 120 caracteres perde o "(cópia)". `actions.ts:367`. → **Resolvido na B22-18 (14/10).**
- [x] M16. Filtro mostra UUID da regra excluída; `?regra=` inválido engole o erro e lista vazio. `historico/page.tsx:36-41`. → **Resolvido na B22-19 (14/10).**
- [x] M17. Estado vazio sempre diz "Nenhuma execução nos últimos 30 dias", mesmo quando é o filtro. → **Resolvido na B22-20 (14/10).**
- [ ] M18. Interruptor leva 2,4–3,7 s sem nenhum estado de "salvando".

**Segurança (nenhum crítico/alto)**
- [ ] M19. Trava de caminho do arquivo da ação contornada com `%2e%2e` → ação aponta para arquivo de outra empresa (precisa saber o caminho; bucket já é público por link). `referencias.ts:113`. (provado)
- [ ] M20. Sem teto de tamanho/custo: fluxo de 3,5 MB salvo; simulação com 200 condições = 24 s, sem limite de frequência; sem limite de regras. (provado)
- [ ] M21. **Decisão:** gerente e atendente leem todas as regras (textos e links de arquivos) direto pela API do Supabase — RLS "membros leem" em `20261007000000_automation_flows.sql:48` x spec "só admin". (seguranca, lista)

## ⚪ Baixos

- Três cliques simultâneos em Salvar criaram 3 regras (duplo clique real cria 1).
- Arquivo > 4 MB dá 500 em vez da mensagem de limite que já existe.
- Regra nova abre com "Complete a configuração" em vermelho; bloco solto nasce em cima de outros.
- "Iniciar sequência" com lista vazia sem orientação; "Alterar dado" vazio mostra `= ""`; tag com espaço vira "tagcomespaço" sem aviso; busca de contato não ignora acento; Delete com tudo selecionado apaga todos os blocos sem desfazer.
- Arquivos escolhidos e trocados ficam no armazenamento para sempre; upload confia no tipo declarado.
- `{{ nome_contato }}` com espaço vai literal; contato chamado `{{nome_vendedor}}` vira o nome do vendedor.
- "contém oi" casa com "Boituva" (é substring, como a spec diz — vale considerar palavra inteira).
- Motivo "últimas 1 horas"; não dá para configurar horário 24 h; linhas descartadas ficam na fila para sempre.
- Agir em regra já apagada mostra "Tente novamente"; nome longo sem espaço estoura a lista no celular.
- Ganho: regras do card novo da Recompra rodam antes das do card da Entrada.
- Entrada malformada nas actions dá 500 (`actions.ts:504`, `:290`).
- Webhook da Meta sem registro de evento: reentrega pode disparar "conversa criada" de novo (suspeita).

## ✅ O que aguentou

Permissões (10 actions recusadas a gerente/atendente; rotas redirecionam), isolamento entre
empresas (actions, RLS e travas do banco seguraram até fluxo gravado direto com ids alheios),
webhooks (assinatura em tempo constante, replay ignorado), XSS, "automação não dispara
automação" em todos os caminhos, todos os tipos de mensagem, as 5 verificações de texto sem
acento/maiúscula, fuso de Brasília, 20 mensagens paralelas = 1 execução, todas as ações gravando
o efeito certo, histórico com caminho e motivos em português, menus "⋯" funcionando,
191 testes unitários passando.

**Sem teste automatizado:** as telas dispararem os gatilhos (`moverCard`, `criarNovoLead`,
`atualizarDadosContato`, `adicionarTagContato`, `aplicarEtiqueta`), `salvarRegra`/`simularRegra`/
`listarExecucoes`, a função da fila no banco (testes usam banco falso), contato na lixeira.
**Não testado:** "mensagem enviada pelo time" com envio real (precisa de chip).

## 🙋 Achados da Marcelle (teste manual, 09/10)

- [x] **U1. Não dá para duplicar blocos do fluxo** (copiar uma ação de mensagem para montar a versão "tem tag X" / "não tem"). Melhoria — não está na spec. → **Feito na B22-13 (14/10)**, aprovado pelo Luan: "Duplicar" no painel do bloco.
- [x] **U2. Sair do editor sem salvar perde tudo e não há rascunho.** Mesmo problema do A5, com o pedido extra de rascunho automático. → **Resolvido na B22-08 (13/10)**, junto com o A5.
- [x] **U3. Variáveis da mensagem precisam ser copiadas à mão** — pedido: botões que inserem a variável no cursor (como no Manychat). Melhoria. → **Feito na B22-14 (14/10)**, aprovado pelo Luan.
