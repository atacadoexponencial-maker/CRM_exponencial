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

## Cenários

> Levantamento de 08/10 (policies lidas direto do banco): `pipeline_cards` SELECT **já**
> limita o atendente aos cards dele, e o histórico do card herda isso. Abertos para a
> empresa toda: `contacts` SELECT (e INSERT por qualquer membro), `contact_tags`,
> `contact_purchases` SELECT, `pipeline_card_notes` SELECT/INSERT, `pipeline_cards` UPDATE
> (sem checar dono nem impedir troca de contato), `reminders` INSERT (qualquer contato,
> qualquer atendente) e `sequence_runs` INSERT. Atendente **não** cria lead nem contato
> no CRM hoje (`criarNovoLead`/`criarContato` só Admin/Gerente) — a premissa "lead criado
> pelo atendente nasce com ele" não tem fluxo a mudar.
>
> "Contato dele" = contato com conversa em que ele é o responsável ou card em que ele é o
> atendente (mesma regra de `listarContatos`).

### Happy Path
1. Atendente abre o funil: vê só os cards dele (como hoje); move, anota e abre o painel.
2. Abre a lista de contatos (só os dele, como hoje) e o perfil de um contato dele: dados,
   tags, compras, linha do tempo e notas aparecem.
3. Adiciona/remove tag de contato dele.
4. "Novo follow-up": a busca traz só contatos dele; agenda para um deles.
5. Admin/Gerente: tudo da empresa, como hoje; reatribuir card passa o card para o novo dono.

### Edge Cases
- Lembrete antigo do atendente para contato que deixou de ser dele: o lembrete continua
  na agenda dele, mas sem o nome do contato.
- Card reatribuído: o antigo deixa de ver card, notas e contato (se não tiver outra
  ligação com ele) na próxima carga.

### Cenário de Erro
- Perfil de contato alheio pela URL: "Contato não encontrado".
- Tag em contato alheio: "Contato não encontrado" (adicionar) / nada removido.
- Follow-up ou sequência manual para contato alheio: "Contato não encontrado".
- Direto no banco: atendente não lê contato, tag, compra ou nota alheios; não grava nota em
  card alheio; não altera card alheio; não troca `atendente_id` nem `contact_id` do próprio
  card; não cria lembrete/execução de sequência para contato alheio ou em nome de outro;
  não cria contato.

## Banco de Dados

Migration nova (sem coluna nova):

- Função `public.pode_ver_contato(p_contact_id uuid)` — `security definer`, `stable`:
  perfil ativo admin/gerente da empresa do contato, ou conversa do contato com
  `assigned_to = auth.uid()`, ou card do contato com `atendente_id = auth.uid()`.
- `contacts`: SELECT → empresa + `pode_ver_contato(id)`; remover a policy INSERT
  "Membros criam contatos no próprio workspace" (fica só a de Admin/Gerente).
- `contact_tags`: SELECT/INSERT/DELETE → + `pode_ver_contato(contact_id)`.
- `contact_purchases`: SELECT → + `pode_ver_contato(contact_id)`.
- `pipeline_card_notes`: SELECT/INSERT → empresa + card visível (`exists` em
  `pipeline_cards`, que já tem RLS por papel); INSERT também `autor_id = auth.uid()`.
- `pipeline_cards`: UPDATE → `using`/`with check` empresa + (admin/gerente ou
  `atendente_id = auth.uid()`); trigger `cards_campos_protegidos` (usuário logado não
  muda `contact_id`/`workspace_id`; só admin/gerente muda `atendente_id`).
- `reminders`: INSERT → empresa + (admin/gerente ou (`atendente_id = auth.uid()` e
  `pode_ver_contato(contact_id)`)); UPDATE ganha `with check` empresa + (admin/gerente ou
  `atendente_id = auth.uid()`).
- `sequence_runs`: INSERT → mesma regra do INSERT de `reminders`; UPDATE ganha o mesmo
  `with check`.

Nenhum código depende das permissões que fecham → migration pode ir junto com o deploy.

## Arquivos

- **Criar:** `supabase/migrations/20261008000003_atendente_so_nos_contatos_dele.sql` — função, policies e trigger acima.
- **Modificar:** `src/app/(auth)/pipeline/actions.ts` — `atribuirAtendente` confere que o atendente-alvo é da mesma empresa (mesmo ajuste da B21-01 no chat).
- **Criar:** `src/test/atendente-contatos-seguranca.integration.test.ts` — ataques recusados (banco e actions) e fluxos legítimos.
- **Modificar:** `src/test/catalogo-pedidos-crm.integration.test.ts` — (achado na execução) o atendente abria o perfil de um cliente da loja que não era dele; o teste passa a dar a ele o card do contato. A tela do pedido não leva ao perfil, então nenhum caminho da interface muda.

Reutilizar: `pode_ver_conversa`/estilo da B21-01, `buscarDadosContato`, `adicionarTagContato`, `criarFollowUp`, `buscarContatosParaFollowUp`, `adicionarNota`, `buscarDadosPainel` (as actions passam a ser barradas pelo banco, sem mudança).

## Checklist

- [x] Migration com `pode_ver_contato`, policies e trigger
- [x] `atribuirAtendente` checando a empresa do alvo
- [x] Testes de ataque e de fluxo legítimo passando contra o banco
- [x] Testes existentes de contatos, funil e agenda passando
- [x] Build e lint
- [x] Código no ar e migration aplicada
