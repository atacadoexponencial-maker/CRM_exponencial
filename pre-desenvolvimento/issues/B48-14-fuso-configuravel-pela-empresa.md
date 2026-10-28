# B48-14: Fuso do CRM configurável pela empresa

**Tipo:** Correção
**Página:** Configurações (empresa) e todas as telas com data
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-correcoes-qa-ux.md`
**Origem:** `pre-desenvolvimento/analise-qa/qa-ux-2026-10-27.md`, pedido do Luan ao responder a SUP-B48-01
**Gravidade:** Médio

## Descrição

Depois da B48-01, o CRM mostra tudo no horário de Brasília. O Luan pediu que a empresa possa trocar o fuso. Só o Admin troca, e vale para todos da empresa. Precisa de uma coluna nova em `workspaces` (migration só acrescenta).

## Pronto quando

O Admin escolhe o fuso em Configurações e todas as telas da empresa passam a mostrar as horas nele; empresa sem escolha fica em Brasília.

## Critérios de aceite

- **CA-B48-35** (automática) — Empresa nova começa no horário de Brasília. Dado uma empresa sem fuso escolhido, quando uma tela formata a hora de um movimento feito às 18:00 UTC, então aparece "15:00"
- **CA-B48-36** (automática) — Admin troca o fuso e as telas seguem. Dado a empresa no horário de Brasília, quando o Admin escolhe "Manaus (UTC−4)" e salva, então o mesmo movimento aparece com "14:00" para todos os usuários da empresa
- **CA-B48-37** (automática) — Só o Admin troca o fuso. Dado um Gerente ou um Atendente da empresa, quando tenta salvar outro fuso, então o servidor recusa ("Sem permissão") e o fuso continua o mesmo

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B48-04 | O fuso é da empresa e só o Admin troca (B48-14). Era a recomendação, aceita junto com as outras | confirmada | Luan, 27/10/2026 ("pode levar em consideração as recomendações") |
| SUP-B48-12 | O fuso vale para as telas, para o que se digita na Agenda e para o horário comercial das automações. Os filtros de data do banco ("comprou há X dias", o dia do pedido que vira compra, a conferência do RFV), a planilha de pedidos e a janela de envio das campanhas (aplicada pelo gateway, em hora de São Paulo) ficam em Brasília; a tela do fuso diz isso | confirmada | Luan, 28/10/2026, depois do levantamento do que usa hora no CRM |
| SUP-B48-13 | Só os fusos do Brasil: Fernando de Noronha, Brasília, Cuiabá, Manaus e Rio Branco. Nenhum tem horário de verão hoje | confirmada | Luan, 28/10/2026 |
| SUP-B48-14 | Dois erros que já existiam entram nesta issue: a estimativa da campanha lia a hora do servidor (UTC) e achava que 18h de Brasília eram 21h, fora da janela; e o período do Dashboard virava o dia às 21h de Brasília. A linha do tempo do contato também saía em UTC | confirmada | Luan, 28/10/2026 |
| SUP-B48-15 | O fuso fica numa tela nova, Configurações → Empresa, só para o Admin. Gravado pela chave de serviço depois de conferir o papel, porque `workspaces` não tem política de update | confirmada | Luan, 28/10/2026; a issue já pedia o fuso "em Configurações" |

## Perguntas em aberto

Nenhuma.

## Cenários

### Happy Path
1. O Admin abre Configurações → Empresa, escolhe "Manaus (UTC−4)" e salva. Aparece "Fuso salvo".
2. Em qualquer tela da empresa, para qualquer papel, o movimento das 18:00 UTC passa a aparecer às 14:00: histórico do card, Chat, Agenda, Dashboard, Campanhas, Catálogo, Automações e Relatórios.
3. Um follow-up marcado para 09:00 vence às 09:00 de Manaus (13:00 UTC). O "Editar follow-up" volta a mostrar 09:00.
4. A condição "dentro do horário comercial" com 08:00–18:00 vale das 08:00 às 18:00 de Manaus.
5. O "hoje" do Dashboard e dos Relatórios vira à meia-noite de Manaus.

### Edge Cases
- Empresa que nunca escolheu fica em Brasília: a coluna nasce com `America/Sao_Paulo`.
- Valor fora da lista no banco: a tela cai em Brasília (`fusoValido`), e o banco recusa gravar (constraint).
- A estimativa da campanha conta a janela em Brasília, que é onde o gateway a aplica, e mostra o "termina em" no fuso da empresa.
- A página pública de exclusão de dados não tem empresa logada e fica em Brasília.
- "Últimos 7, 30 e 90 dias" começam à meia-noite do fuso, como o fim já acabava à meia-noite. Antes o começo era o instante exato da leitura, e duas leituras do Dashboard no mesmo dia davam períodos diferentes desde que a B48-10 passou a devolver o período (o teste CA-B41-38 quebrou por isso).

### Cenário de Erro
- Gerente ou Atendente que chamam a action: "Sem permissão", e o fuso não muda.
- Fuso fora da lista: "Escolha um dos fusos da lista."
- Falha ao gravar: "Não foi possível salvar o fuso. Tente novamente."

## Banco

- Migration `supabase/migrations/20261028000002_fuso_da_empresa.sql`: só acrescenta `workspaces.fuso text not null default 'America/Sao_Paulo'`, com a constraint dos cinco fusos.
- Aplicar primeiro no banco de teste (`npm run db:teste:push`) e só depois na produção (`npx supabase db push --linked`), com o ok do Luan.
- `src/integrations/supabase/types.ts`: as três linhas de `fuso` foram escritas à mão no formato do gerador, porque a coluna ainda não existe em nenhum dos bancos. Conferir com `supabase gen types` depois do push.

## Prova

| Critério | Prova | Onde | O que confere |
|---|---|---|---|
| CA-B48-35 | automática | `src/test/fuso-da-empresa.test.ts` | Empresa sem fuso: `fusoDaEmpresa` dá Brasília e o histórico do card mostra 15:00 para 18:00 UTC; fuso fora da lista também cai em Brasília |
| CA-B48-36 | automática | `src/test/fuso-da-empresa.test.ts` | O Admin salva Manaus e a gravação vai para a empresa dele; com Manaus, Admin, Gerente e Atendente veem 14:00; follow-up das 09:00 vira 13:00 UTC; horário comercial, "hoje" do Dashboard e estimativa da campanha seguem as regras acima |
| CA-B48-37 | automática | `src/test/fuso-da-empresa.test.ts` | Gerente e Atendente recebem "Sem permissão", nada é gravado e o fuso continua Brasília |

## Arquivos

- **Criar:** `supabase/migrations/20261028000002_fuso_da_empresa.sql` — coluna `fuso` em `workspaces`.
- **Criar:** `src/lib/fuso-da-empresa.ts` — `fusoDaEmpresa` (sessão, uma vez por requisição) e `fusoDoWorkspace` (motor das automações).
- **Criar:** `src/components/shared/fuso-da-empresa.tsx` — `ProvedorDeFuso` e `useFuso` para as telas do navegador.
- **Criar:** `src/app/(auth)/configuracoes/empresa/page.tsx` — a tela do fuso, só para o Admin.
- **Criar:** `src/app/(auth)/configuracoes/empresa/empresa-client.tsx` — o seletor e o Salvar.
- **Criar:** `src/app/(auth)/configuracoes/empresa/actions.ts` — `salvarFuso`.
- **Criar:** `src/app/(auth)/configuracoes/empresa/loading.tsx` — esqueleto da tela.
- **Criar:** `src/test/fuso-da-empresa.test.ts` — CA-B48-35, 36 e 37.
- **Modificar:** `src/lib/datas.ts` — todo formatador pede o fuso; lista dos fusos do Brasil; `diaNoFuso`, `relogioNoFuso`, `instanteNoFuso` e `formatarNoFuso`.
- **Modificar:** `src/integrations/supabase/types.ts` — coluna `fuso`.
- **Modificar:** `src/app/(auth)/layout.tsx` — lê o fuso e envolve as telas no `ProvedorDeFuso`.
- **Modificar:** `src/components/shared/sidebar-nav.tsx` — item "Empresa" em Configurações, só para o Admin.
- **Modificar:** `src/app/(auth)/agenda/actions.ts` — vencimento do follow-up no fuso da empresa.
- **Modificar:** `src/app/(auth)/chat/actions.ts` — mensagens e ficha do contato no fuso.
- **Modificar:** `src/app/(auth)/chat/conversas.ts` — lista de conversas no fuso.
- **Modificar:** `src/app/(auth)/pipeline/actions.ts` — histórico, notas e entrada na etapa no fuso.
- **Modificar:** `src/app/(auth)/contatos/actions.ts` — linha do tempo do contato, que saía em UTC.
- **Modificar:** `src/app/(auth)/contatos/lixeira/actions.ts` — "excluído em" no fuso.
- **Modificar:** `src/app/(auth)/dashboard/actions.ts` — período e "Para hoje" no fuso.
- **Modificar:** `src/app/(auth)/dashboard/page.tsx` — cabeçalho do dia no fuso.
- **Modificar:** `src/app/(auth)/relatorios/actions.ts` — "hoje" no fuso.
- **Modificar:** `src/app/(auth)/relatorios/page.tsx` — "hoje" no fuso.
- **Modificar:** `src/app/(auth)/campanhas/actions.ts` — "termina em" da estimativa no fuso.
- **Modificar:** `src/app/(auth)/agenda/agenda-client.tsx` — grupos, vencimento e Editar no fuso.
- **Modificar:** `src/app/(auth)/agenda/equipe/agenda-equipe-client.tsx` — vencimento no fuso.
- **Modificar:** `src/app/(auth)/campanhas/campanhas-client.tsx` — data de envio no fuso.
- **Modificar:** `src/app/(auth)/campanhas/[id]/relatorio/relatorio-client.tsx` — datas do relatório no fuso.
- **Modificar:** `src/app/(auth)/catalogo/components/detalhe-pedido.tsx` — datas do pedido no fuso.
- **Modificar:** `src/app/(auth)/catalogo/components/lista-pedidos.tsx` — datas no fuso.
- **Modificar:** `src/app/(auth)/catalogo/components/secao-pedidos-contato.tsx` — datas no fuso.
- **Modificar:** `src/app/(auth)/chat/components/chat-layout.tsx` — mensagem ao vivo no fuso.
- **Modificar:** `src/app/(auth)/chat/components/painel-conversa.tsx` — hora da mensagem enviada no fuso.
- **Modificar:** `src/app/(auth)/chat/conversa-atualizada.ts` — carimbo da conversa ao vivo no fuso.
- **Modificar:** `src/app/(auth)/configuracoes/automacoes/components/editor-fluxo.tsx` — "alterações não salvas de…" no fuso.
- **Modificar:** `src/app/(auth)/configuracoes/automacoes/components/lista-regras.tsx` — última execução no fuso.
- **Modificar:** `src/app/(auth)/configuracoes/automacoes/historico/historico-client.tsx` — horários do histórico no fuso.
- **Modificar:** `src/app/(auth)/configuracoes/whatsapp/[id]/saude/aviso-de-freio.tsx` — "desde" no fuso.
- **Modificar:** `src/app/(auth)/dashboard/components/blocos-do-dia.tsx` — "Para hoje" no fuso.
- **Modificar:** `src/app/(auth)/dashboard/components/dashboard-client.tsx` — período do faturado no fuso.
- **Modificar:** `src/app/(auth)/relatorios/components/carteiras-client.tsx` — histórico de carteira no fuso.
- **Modificar:** `src/lib/horario-comercial.ts` — horário comercial lido no fuso que vier.
- **Modificar:** `src/lib/automacoes/verificacoes.ts` — o motor lê o fuso da empresa para o horário comercial.
- **Modificar:** `src/lib/painel-dashboard.ts` — fim de hoje e cabeçalho no fuso.
- **Modificar:** `src/lib/metricas-dashboard.ts` — período no fuso, não no relógio do servidor; últimos N dias a partir da meia-noite.
- **Modificar:** `src/lib/relatorios/visao-geral.ts` — `hojeNoFuso` com o fuso.
- **Modificar:** `src/lib/resumo-de-compras.ts` — "há N dias" no fuso.
- **Modificar:** `src/lib/automacoes/perfil-rfv.ts` — conferência do RFV em Brasília, explícito.
- **Modificar:** `src/lib/whatsapp/gateway/fila-campanha.ts` — janela em Brasília; "termina em" no fuso da empresa.
- **Modificar:** `src/test/agenda-fuso.test.ts` — chamadas com o fuso.
- **Modificar:** `src/test/automacoes-horas-e-dia-inteiro.test.ts` — chamadas com o fuso.
- **Modificar:** `src/test/campanhas-aviso-aquecimento.test.ts` — empresa do teste em Brasília.
- **Modificar:** `src/test/chat-caderno.test.tsx` — chamadas com o fuso.
- **Modificar:** `src/test/chat-lista-parada-ao-abrir.test.ts` — chamadas com o fuso.
- **Modificar:** `src/test/conversa-por-numero-dono.test.ts` — chamadas com o fuso.
- **Modificar:** `src/test/datas-no-horario-de-brasilia.test.ts` — banco falso com a sessão.
- **Modificar:** `src/test/horario-comercial.test.ts` — chamadas com o fuso.
- **Modificar:** `src/test/menu-lateral.test.tsx` — item "Empresa".
- **Modificar:** `src/test/metricas-dashboard.test.ts` — chamadas com o fuso.
- **Modificar:** `src/test/qa-baixos.test.ts` — empresa do teste em Brasília.
- **Modificar:** `src/test/qa-medios-funcoes.test.ts` — chamadas com o fuso.

## Checklist

- [x] Migration da coluna `fuso`, só acrescentando
- [x] Formatadores pedem o fuso; telas do servidor e do navegador passam o da empresa
- [x] Agenda grava o vencimento no fuso; horário comercial lido no fuso
- [x] "Hoje" do Dashboard e dos Relatórios no fuso; estimativa da campanha com a janela em Brasília
- [x] Configurações → Empresa, só para o Admin
- [x] Testes do CA-B48-35, 36 e 37 e os das funções tocadas passando, tsc e lint
