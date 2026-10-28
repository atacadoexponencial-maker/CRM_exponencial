# Relatório de conclusão — B48, correções do teste de UI/UX

> Série B48 · spec `docs/specs-arquivadas/spec-correcoes-qa-ux.md` · issues em `pre-desenvolvimento/issues/concluidas_B48/`
> Branch `b46-correcoes-qa-ux`, no ar pelo merge na master em 28/10/2026, com o ok do Luan.
> Escrito para a Marcelle consultar: o que mudou para quem usa o CRM, o que mudou no código e o que vale saber antes de mexer perto.

## Em uma frase

As 19 issues que nasceram do teste de UI/UX do CRM inteiro (27/10/2026, `pre-desenvolvimento/analise-qa/qa-ux-2026-10-27.md`) estão no ar. O auditor da série diz **alinhada**: cada critério tem teste automático passando, e os 5 testes manuais (CA-B48-03, 23, 28, 30 e 34) foram conferidos pelo Luan no preview em 28/10/2026.

## Por que a série se chama B48

Ela nasceu como **B46** no branch `b46-correcoes-qa-ux`, ao mesmo tempo que a B46 do banco de teste. Virou **B47** e, quando a rodada 5 de segurança usou B47, ficou **B48**, como a Marcelle reservou no README das issues. Os commits até `cc8ebac` dizem B46, os de `ced44b4` a `9293f99` dizem B47, e o nome do branch ficou como estava. Nos arquivos que têm as duas séries (`licoes.md`, `recebimento.ts`, `conversas.ts`, `contatos/actions.ts`), o "B47-02/03" e a lição L-05 são da Marcelle; a L-13 é da B48.

## O que mudou para quem usa

| Issue | O que mudou |
|---|---|
| B48-01 | Datas e horas no horário de Brasília em todo o CRM, no servidor e no navegador; Campanhas sem o erro React #418 |
| B48-02 | A lista do Chat não pula ao abrir uma conversa; só mensagem nova sobe a conversa |
| B48-03 | O menu "⋯" de cada linha diz de quem é, e apagar mostra o nome |
| B48-04 | Esc fecha as janelas montadas à mão, e salvar mostra a mesma confirmação em todas as telas |
| B48-05 | O Dashboard mostra "Áudio", "Imagem"… em vez do endereço do arquivo |
| B48-06 | Follow-up com editar, apagar e desfazer o Feito; "Agendar" diz o que falta |
| B48-07 | Variáveis das automações não somem ao ir direto ao Salvar, com exemplos sem chaves |
| B48-08 | Automação nova nasce desligada, com "Salvar e ativar" no editor |
| B48-09 | A aba dos Relatórios fica no endereço: link direto e Voltar do navegador funcionam |
| B48-10 | Faturamento diz o período no Dashboard e nos Relatórios; Carteiras dizem "Sem compra" |
| B48-11 | Tabela de Contatos sem palavra quebrada; tipo e atendente atrás de "Mais filtros" |
| B48-12 | Todas as telas logadas com a mesma largura e margem |
| B48-13 | Acabamentos: funil e etiqueta avisam na hora, "empresa" no lugar de "workspace" e ajustes visuais |
| B48-14 | **Fuso configurável pela empresa** (Configurações → Empresa, só o Admin): telas, Agenda e horário comercial seguem o fuso escolhido |
| B48-15 | "?" com explicação ao lado de termos e botões (funil fixo, ICP, Perfil RFV, Tag, Corrigir recebimento); ícones do campo de mensagem com nome; template rejeitado mostra o motivo da Meta; tag não aceita espaço na digitação |
| B48-16 | Excluir, Apagar de vez, Remover da carteira e Remover número separados dos botões comuns ("⋯" ou vermelho à parte) |
| B48-17 | Ícone "Abrir ficha completa" ao lado do nome no Chat; o "Abrir conversa" do pedido ganhou prova |
| B48-18 | Rótulos padronizados: "Funis", Novo lead com nome obrigatório, "Tirar a loja do ar", "Uma opção"/"Várias opções", "Atalho (digite / no chat)", "Dispensar", "Filtros salvos", "Ver todos os N" |
| B48-19 | Filtros do Chat numa linha; um Editar só na ficha (dados e campos personalizados); painel do card aberto depois de mover; alertas agrupados por tipo; filtro do Dashboard com grupos separados |

## Banco

Duas migrations, as duas **só acrescentam** e já estão nos dois bancos (teste e produção). Nada pendente em `supabase migration list` em 28/10.

| Migration | O que faz |
|---|---|
| `20261027000020_apagar_lembrete.sql` (B48-06) | Permite apagar o follow-up |
| `20261028000002_fuso_da_empresa.sql` (B48-14) | `workspaces.fuso text not null default 'America/Sao_Paulo'`, com a constraint dos 5 fusos do Brasil |

A do fuso nasceu como `20261028000001`, o mesmo número da `canal_pessoal_so_conta_ativa`, e o banco a pulava sem erro; foi renomeada. O arquivo foi sozinho à master antes do merge (`5ef4ae5`), com a explicação no próprio `.sql`, para um `db push` feito da master não parar com "Remote migration versions not found in local migrations directory".

## O que mudou no código e vale saber antes de mexer perto

**Fuso (B48-14).**
- Todo formatador de `src/lib/datas.ts` **pede o fuso** (`formatarHoraDoDia(iso, fuso)`, `formatarData(iso, fuso)`…). Esquecer de passar dá erro de tipo, de propósito, em vez de voltar a Brasília sem ninguém ver.
- No servidor: `await fusoDaEmpresa()` (`src/lib/fuso-da-empresa.ts`, uma leitura por requisição). No motor das automações: `fusoDoWorkspace(supabase, workspaceId)`. No navegador: `useFuso()` (`src/components/shared/fuso-da-empresa.tsx`), fornecido pelo layout logado.
- Ficam em **Brasília de propósito**: os filtros de data feitos no banco ("comprou há X dias", o dia do pedido que vira compra, a conferência do RFV), a planilha de pedidos e a janela de envio das campanhas, que o gateway aplica em hora de São Paulo. A tela do fuso avisa isso.
- `rangeDoPeriodo(filtro, fuso, agora)`: "últimos 7/30/90 dias" começam à meia-noite do fuso, como o fim já acabava. Antes o começo era o instante da leitura, e o teste CA-B41-38 quebrava desde a B48-10.
- Dois erros antigos corrigidos junto: a estimativa da campanha lia a janela na hora do servidor (UTC), e o "hoje" do Dashboard virava às 21h de Brasília.

**Componentes e ganchos novos, para reusar.**
- `src/components/shared/ajuda.tsx` — o "?" que abre uma frase curta e fecha com Esc.
- `src/components/shared/menu-mais-acoes.tsx` — o "⋯" para ação perigosa, com item `DropdownMenuItem variant="destructive"`.
- `src/hooks/use-campo-de-tag.ts` — campo de tag que barra o espaço, usado no card, na ficha e no Chat.
- `src/hooks/use-fechar-com-esc.ts` e `src/lib/aviso-na-tela.ts` (B48-04) — Esc nas janelas montadas à mão e a confirmação de salvar.
- `src/lib/pagina.ts` (`CLASSE_DA_PAGINA`, B48-12) — o contêiner de toda tela logada.

**Contratos que mudaram.**
- `criarNovoLead(telefone, nome)` recusa sem nome ("Informe o nome do contato."), como o Novo contato.
- `contarDestinatarios(segmento, todos = false)`: com `todos`, devolve a lista inteira (o "Ver todos os N").
- `listarTemplates()` pede `rejected_reason` à Graph API e devolve `motivo` em português nos rejeitados.
- `CamposPersonalizadosContato` ficou controlado pela ficha (`editando`, `rascunho`, `erros`, `onMudar`); quem salva é o `perfil-contato.tsx`, com `rascunhoDosCampos` e `conferirCampos`.
- Tipos de campo: os rótulos são "Uma opção" e "Várias opções"; os ids (`lista`, `multipla`) não mudaram.

## Decisões do Luan (suposições confirmadas)

Estão na spec, de SUP-B48-01 a SUP-B48-16. As que mudam comportamento:
- O fuso é da empresa, só o Admin troca, só fusos do Brasil, e vale para telas, Agenda e horário comercial (SUP-B48-04, 12, 13, 15).
- No Chat, o nome continua abrindo o painel lateral; o ícone ao lado leva à ficha completa (SUP-B48-16).
- A tag sem espaço vale também na ficha e no painel do Chat, além do card (pedido do Luan depois da B48-15).

## Testes

- Cada critério CA-B48-01 a 49 tem teste com o código no nome; a série está **alinhada** no auditor.
- Falham também na master, antes da B48, e não são desta série: `b36-nenhuma-funcao-some`, `chat-documento-nome-e-previa`, `planilha-e-csv-seguros`, `tema`, `tema-cores-fixas`, `toda-tela-tem-esqueleto` (unitários) e, na integração, `caixa-de-entrada`, `conversa-nova-ao-vivo`, `mensagens` (status de entrega) e `funis-card-parado`.
- Os 4 testes `banco-de-teste*` comparam com a produção pelo `.env.local`; na máquina do Luan o `.env.local` só tem os dados da empresa de teste B11, e eles falham lá por isso.
- O banco de teste grátis bate no limite de login com a integração em paralelo: rodar com `npx vitest run --no-file-parallelism integration`.

## Para lembrar

- O auditor compara só o que **não foi commitado**. Para auditar um complemento de uma issue já commitada, foi preciso voltar o HEAD com `git reset --soft HEAD~1`, auditar e devolver; não há opção de commit base.
- Antes de commitar uma série longa em branch, vale um `git fetch` e conferir se a master usou o mesmo número de série ou a mesma versão de migration; aqui as duas coisas aconteceram no mesmo dia.
