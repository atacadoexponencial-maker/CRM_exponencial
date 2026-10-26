# B38-05: Variáveis dos campos e texto reserva obrigatório em todas as variáveis

**Tipo:** Implementação
**Página:** Automações → Enviar mensagem; Campanhas → texto; Configurações → Campos personalizados
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-campos-personalizados.md`

## Descrição

Cada campo ganha a sua variável nas mensagens das automações e das campanhas, que acompanha o nome do campo; toda variável, nova ou antiga, passa a exigir texto reserva, e os textos antigos sem reserva ficam marcados "precisa de ajuste".

## Pronto quando

"Seu limite é {{limite_de_credito|a combinar}}" sai com o valor do contato ou com "a combinar"; texto sem reserva não salva; renomear o campo troca a variável nos textos; a automação antiga com {{nome_contato}} aparece como "precisa de ajuste" até ganhar o reserva.

## Critérios de aceite

- **CA-B38-14** (automática) — Variável do campo. Dado o Admin cria o campo "Limite de crédito", quando ele abre o editor do campo, então a tela mostra a variável `{{limite_de_credito}}`
- **CA-B38-41** (automática) — Botão de variável do campo. Dado o editor de automação, na ação "Enviar mensagem", numa empresa com o campo "Limite de crédito", quando o Admin clica no botão "Limite de crédito" com o cursor no meio do texto, então a tela pede o texto reserva antes de inserir a variável; o mesmo vale no texto da campanha
- **CA-B38-42** (automática) — Mensagem sai com o valor do campo. Dado o texto "Seu limite é {{limite_de_credito|a combinar}}" e um contato com Limite de crédito 1500, quando a automação ou a campanha envia a mensagem para ele, então a mensagem sai como "Seu limite é R$ 1.500,00", com o valor no formato do tipo
- **CA-B38-43** (automática) — Campo vazio usa o texto reserva. Dado o texto "Seu limite é {{limite_de_credito|a combinar}}" e um contato sem Limite de crédito, quando a automação ou a campanha envia a mensagem para ele, então a mensagem sai como "Seu limite é a combinar"
- **CA-B38-46** (automática) — Renomear o campo troca a variável nos textos. Dado o campo "Limite de crédito", com `{{limite_de_credito|a combinar}}` no texto de uma automação e de uma campanha agendada, quando o Admin renomeia o campo para "Limite", então o editor do campo mostra `{{limite}}`, os dois textos passam a ter `{{limite|a combinar}}` no lugar da variável antiga, com o mesmo texto reserva, e a mensagem enviada depois sai com o valor do campo; campanha já enviada não muda
- **CA-B38-48** (automática) — Variável sem texto reserva não é aceita. Dado o editor do texto de uma automação ou de uma campanha, quando o Admin tenta inserir uma variável sem texto reserva, ou escreve à mão "Seu limite é {{limite_de_credito}}" ou "Olá {{nome_contato}}" e tenta salvar, então a tela não insere a variável sem reserva e não salva o texto, apontando cada variável que está sem reserva; o servidor também recusa esse texto se ele chegar sem passar pela tela
- **CA-B38-49** (automática) — Inserir variável com texto reserva. Dado o editor do texto de uma automação ou de uma campanha, quando o Admin clica no botão "Limite de crédito" e escreve "a combinar" como texto reserva, então o texto ganha `{{limite_de_credito|a combinar}}` no ponto do cursor
- **CA-B38-60** (automática) — Texto reserva nas variáveis que já existem. Dado o texto "Olá {{nome_contato|cliente}}, aqui é {{nome_vendedor|a equipe}}", um contato sem nome e um contato sem atendente, quando a automação ou a campanha envia a mensagem para os dois, então o contato sem nome recebe "Olá cliente, aqui é …" (na automação, o reserva vai no lugar do telefone que sai hoje) e o contato sem atendente recebe "… aqui é a equipe"; com nome e atendente preenchidos, a mensagem sai com o nome e o vendedor, como hoje; o mesmo vale para `{{primeiro_nome}}` nas automações
- **CA-B38-61** (automática) — Textos antigos sem reserva ficam marcados. Dado uma automação ou uma campanha não enviada salva antes desta mudança, com `{{nome_contato}}` sem reserva, quando o Admin abre a lista de automações, a lista de campanhas ou o editor desse texto, então a automação ou a campanha aparece marcada "precisa de ajuste", o editor aponta a variável sem reserva, e ela só volta a enviar depois que o texto ganha o reserva e é salvo

- **CA-B38-63** (automática) — Mensagem rápida exige texto reserva. Dado a tela de mensagens rápidas, em Configurações, quando o Admin escreve "Olá {{nome_contato}}" e tenta salvar, ou insere uma variável pelo botão, então a tela não salva o texto sem reserva e aponta a variável; pelo botão, pede o texto reserva antes de inserir; com "Olá {{nome_contato|cliente}}", salva; a mensagem rápida antiga sem reserva aparece marcada "precisa de ajuste" na lista e não é enviada por automação até ganhar o reserva
- **CA-B38-64** (automática) — Lembrete da automação exige texto reserva. Dado a ação "Criar lembrete na Agenda" de uma automação, quando o texto do lembrete tem "Ligar para {{primeiro_nome}}", sem reserva, e o Admin tenta salvar, então o editor aponta a variável e o servidor não salva; com "Ligar para {{primeiro_nome|o cliente}}", o lembrete do contato sem nome nasce como "Ligar para o cliente"

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B38-03 | A variável nasce do nome no dia em que o campo é criado (minúsculo, sem acento, espaço vira "_") e não muda ao renomear. | invalidada | A variável acompanha o nome, para não confundir; ao renomear, o sistema troca a variável nos textos das automações e das campanhas não enviadas (CA-B38-46). Marcelle, 26/10/2026. |
| SUP-B38-04 | Campo vazio na mensagem sai como texto vazio, sem impedir o envio. | invalidada | A variável pode ter um texto reserva, usado quando o campo está vazio; o reserva é obrigatório (CA-B38-43, CA-B38-48). Marcelle, 26/10/2026. |
| SUP-B38-12 | A variável nova, depois de renomear, não pode colidir com outra: se o nome novo gerar a variável de outro campo ou de uma variável fixa, a tela recusa o nome. | confirmada | Marcelle, 26/10/2026. |
| SUP-B38-16 | O texto reserva vale só para as variáveis dos campos personalizados. | invalidada | Vale para todas as variáveis, inclusive `{{nome_contato}}`, `{{primeiro_nome}}` e `{{nome_vendedor}}` (CA-B38-60). Marcelle, 26/10/2026. |
| SUP-B38-17 | Nas variáveis que já existem, sem texto reserva tudo fica como hoje: na automação, contato sem nome recebe o telefone no lugar de `{{nome_contato}}` e `{{primeiro_nome}}`; na campanha, sai em branco. A campanha continua sem `{{primeiro_nome}}`. | invalidada | Todas as variáveis, novas ou antigas, têm texto reserva obrigatório; nenhuma sai sem reserva (CA-B38-48, CA-B38-60). A campanha continua sem `{{primeiro_nome}}`. Marcelle, 26/10/2026. |
| SUP-B38-18 | Automação ou campanha não enviada salva antes desta mudança, com variável sem reserva, fica marcada "precisa de ajuste" e não envia até o texto ganhar o reserva (CA-B38-61). | confirmada | Marcelle, 26/10/2026. |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| PER-B38-03 | Além do perfil e do filtro, onde os campos aparecem? | respondida | Painel do contato no Chat, cadastro de novo contato, automações e variáveis na mensagem. Marcelle, 26/10/2026. |
| PER-B38-15 | O texto reserva obrigatório vale também para as mensagens rápidas e para o texto do lembrete da Agenda? | respondida | Sim, em tudo: mensagem das automações, campanhas, mensagens rápidas e lembrete (CA-B38-63, CA-B38-64). Marcelle, 26/10/2026. |

## Cenários

### Happy Path
1. A variável de um campo nasce do nome: minúsculo, sem acento, o resto vira "_" (`Limite de crédito` → `{{limite_de_credito}}`). O editor do campo mostra a variável.
2. Nos textos com variáveis (ação "Enviar mensagem", lembrete, campanha e mensagem rápida), os botões das variáveis (as fixas e uma por campo) abrem o pedido do texto reserva; "Inserir" põe `{{chave|reserva}}` no ponto do cursor. Sem reserva, "Inserir" fica desligado.
3. Ao enviar, cada variável vira o valor do contato (campo no formato do tipo; nome; primeiro nome; vendedor) ou, vazio, o texto reserva.
4. Renomear o campo troca `{{antiga|…}}` por `{{nova|…}}` nas automações, nas campanhas não enviadas e nas mensagens rápidas da empresa, mantendo o reserva.

### Edge Cases
- Texto com variável sem reserva (escrito à mão ou salvo antes): a tela aponta cada uma ("{{nome_contato}} está sem texto reserva") e não salva; o servidor recusa.
- Textos antigos sem reserva: a automação mostra "precisa de ajuste" no bloco e na lista; a campanha não enviada e a mensagem rápida também aparecem marcadas. Na hora de enviar, nada sai: a ação falha com "Precisa de ajuste: {{nome_contato}} está sem texto reserva", e a campanha agendada não começa.
- Nome de campo cuja variável já é de outro campo ou de uma fixa (`nome_contato`, `primeiro_nome`, `nome_vendedor`): recusado (SUP-B38-12).
- Reserva vazio (`{{x|}}`) conta como sem reserva. Reserva não pode ter `{` nem `}`.
- Variável que não existe mais (campo apagado) sai com o reserva.

### Cenário de Erro
- O servidor recusa salvar a automação, a campanha ou a mensagem rápida com variável sem reserva: "A variável {{nome_contato}} está sem texto reserva. Use o botão da variável para pôr o reserva."

## Prova

| Critério | Prova | Onde | O que confere |
|---|---|---|---|
| CA-B38-14 | automática | `src/test/campos-personalizados-variaveis-tela.test.tsx` | O editor do campo "Limite de crédito" mostra `{{limite_de_credito}}` |
| CA-B38-41 | automática | `src/test/campos-personalizados-variaveis-tela.test.tsx` | O botão "Limite de crédito" abre o pedido do reserva, no editor de automação e no de campanha |
| CA-B38-42 | automática | `src/test/campos-personalizados-variaveis.integration.test.ts` | O texto da automação e o da campanha saem "Seu limite é R$ 1.500,00" para o contato com 1500 |
| CA-B38-43 | automática | `src/test/campos-personalizados-variaveis.integration.test.ts` | Sem Limite, o texto sai "Seu limite é a combinar", na automação e na campanha |
| CA-B38-46 | automática | `src/test/campos-personalizados-variaveis.integration.test.ts` | Renomeado para "Limite", a automação, a campanha agendada e a mensagem rápida passam a ter `{{limite|a combinar}}`; a campanha enviada não muda |
| CA-B38-48 | automática | `src/test/campos-personalizados-variaveis.integration.test.ts` | O servidor recusa salvar automação e campanha com `{{nome_contato}}` sem reserva; na tela, o texto é apontado e o Inserir fica desligado sem reserva |
| CA-B38-49 | automática | `src/test/campos-personalizados-variaveis-tela.test.tsx` | Com "a combinar", o texto ganha `{{limite_de_credito|a combinar}}` no ponto do cursor |
| CA-B38-60 | automática | `src/test/campos-personalizados-variaveis.integration.test.ts` | "Olá {{nome_contato|cliente}}, aqui é {{nome_vendedor|a equipe}}" sai com o reserva para quem não tem nome ou vendedor, e com os dados para quem tem |
| CA-B38-61 | automática | `src/test/campos-personalizados-variaveis.integration.test.ts` | Automação, campanha e mensagem rápida antigas com `{{nome_contato}}` aparecem marcadas; a automação não envia e a campanha agendada não começa |
| CA-B38-63 | automática | `src/test/campos-personalizados-variaveis.integration.test.ts` | O servidor recusa a mensagem rápida sem reserva e salva a com reserva; a antiga aparece marcada e a automação não a envia; na tela, os botões pedem o reserva |
| CA-B38-64 | automática | `src/test/campos-personalizados-variaveis.integration.test.ts` | O servidor recusa o lembrete sem reserva; com reserva, o lembrete do contato sem nome nasce "Ligar para o cliente" |

## Arquivos

- **Criar:** `src/lib/variaveis-mensagem.ts` — chave da variável pelo nome, leitura de `{{chave|reserva}}`, variáveis sem reserva, preencher e trocar a chave
- **Criar:** `src/components/shared/texto-com-variaveis.tsx` — texto com os botões das variáveis, o pedido do texto reserva e o aviso de variável sem reserva
- **Modificar:** `src/app/(auth)/configuracoes/automacoes/components/variaveis-mensagem.ts` — variáveis fixas da automação na lista nova
- **Modificar:** `src/app/(auth)/configuracoes/automacoes/components/painel-bloco.tsx` — `TextoComVariaveis` com os botões novos e o aviso de variável sem reserva
- **Modificar:** `src/app/(auth)/configuracoes/automacoes/components/catalogo.ts` — "precisa de ajuste" no bloco com variável sem reserva
- **Modificar:** `src/app/(auth)/configuracoes/automacoes/actions.ts` — recusa salvar texto com variável sem reserva
- **Modificar:** `src/lib/automacoes/envio.ts` — preenche fixas e campos com o reserva; não envia texto sem reserva
- **Modificar:** `src/lib/automacoes/lembrete.ts` — o lembrete sem reserva falha em vez de nascer
- **Modificar:** `src/lib/campanhas.ts` — variáveis com reserva e campos no envio; campanha com variável sem reserva não começa
- **Modificar:** `src/app/(auth)/campanhas/actions.ts` — recusa salvar e confirmar sem reserva; marca "precisa de ajuste" na lista
- **Modificar:** `src/app/(auth)/campanhas/[id]/editor-campanha-client.tsx` — botões das variáveis, aviso e prévia com o reserva
- **Modificar:** `src/app/(auth)/campanhas/campanhas-client.tsx` — marca "precisa de ajuste" na lista
- **Modificar:** `src/app/(auth)/configuracoes/mensagens-rapidas/actions.ts` — recusa sem reserva; marca na lista
- **Modificar:** `src/app/(auth)/configuracoes/mensagens-rapidas/mensagens-rapidas-client.tsx` — botões das variáveis, aviso e marca na lista
- **Modificar:** `src/app/(auth)/configuracoes/mensagens-rapidas/page.tsx` — busca os campos para os botões
- **Modificar:** `src/app/(auth)/configuracoes/campos/actions.ts` — variável que não colide; renomear troca a variável nos textos
- **Modificar:** `src/app/(auth)/configuracoes/campos/campos-client.tsx` — mostra a variável no editor do campo
- **Criar:** `src/test/campos-personalizados-variaveis.integration.test.ts` — critérios no Supabase real
- **Criar:** `src/test/campos-personalizados-variaveis-tela.test.tsx` — critérios de tela
- **Modificar:** `src/test/automacoes-envio.test.ts` — os textos antigos ganham o reserva; sem nome, entra o reserva e não mais o telefone
- **Modificar:** `src/test/automacoes-acoes.test.ts` — o lembrete do teste ganha o reserva
- **Modificar:** `src/test/automacoes-variaveis-mensagem.test.ts` — os botões inserem a variável com o reserva

## Checklist

- [x] Lib das variáveis com reserva
- [x] Envio das automações e lembrete
- [x] Envio, conferência e marca das campanhas
- [x] Mensagens rápidas: conferência, marca e botões
- [x] Botões das variáveis com o pedido do reserva nos três editores
- [x] Variável do campo: mostrar, não colidir, trocar nos textos ao renomear
- [x] Conferência ao salvar a automação e "precisa de ajuste" no bloco
- [x] Testes da tabela Prova e os que tocam as telas e os envios mexidos
- [x] `npx tsc --noEmit`
