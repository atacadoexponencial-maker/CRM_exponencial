# Sessão de 27/10/2026 — B46, correções do teste de UI/UX

Ata para a Marcelle e para quem retomar. O Luan pausou a série com 12 das 19
issues feitas, no branch `b46-correcoes-qa-ux`. **Nada entrou na master**: o
merge espera o ok do Luan.

## De onde veio

Um agente de teste de UI/UX percorreu o CRM inteiro em produção, nos fluxos de um
atendimento comum. Na empresa real ele só olhou; o que cria e apaga foi feito na
"[TESTE] Automações B11". Os achados, com a gravidade revista no código, estão em
`analise-qa/qa-ux-2026-10-27.md`. A spec é `spec-correcoes-qa-ux.md` (série B46).

Durante a limpeza, o agente apagou por engano a etiqueta "Interessado" da empresa de
teste e a recriou (mesma cor, mesmas duas conversas). O id dela mudou: roteiro que
use o id antigo precisa ser atualizado.

## Decisões do Luan (27/10)

- Automação nova nasce **desligada**, com "Salvar e ativar" (PER-B46-01).
- Contatos sem compra das Carteiras se chamam **"Sem compra"** (PER-B46-02).
- Datas no **horário de Brasília**, com configuração de fuso da empresa depois
  (B46-14, só o Admin troca).
- Follow-up: **edição geral**, editar e apagar para todos. Ficou com a regra que o
  banco já tem: cada um mexe no que vê (o atendente nos dele, Admin e Gerente na
  empresa toda).
- Variável escolhida e não inserida **entra sozinha** ao salvar (SUP-B46-03).
- Achados de clareza: valem as recomendações do arquivo do QA; onde falta
  explicação, frase na tela ou ajuda com "?". Os que mudam o produto ficaram fora.

## Feito (no branch)

| Issue | O que muda | Falta |
|---|---|---|
| B46-01 | Datas e horas no horário de Brasília em todas as telas | teste manual CA-B46-03 (`/campanhas` sem erro #418) |
| B46-02 | Lista do Chat não pula ao abrir conversa | — |
| B46-03 | Botão ⋯ de cada linha diz de qual item é | — |
| B46-04 | Esc fecha as janelas; salvar mostra "Produto salvo", "Lead criado"… | — |
| B46-05 | Dashboard mostra "Áudio", não o endereço do arquivo | — |
| B46-06 | Follow-up com Editar, Apagar e "Feito. Desfazer" | **db push** da migration `20261027000020_apagar_lembrete.sql` (política de exclusão em `reminders`, só acrescenta) |
| B46-07 | Variável não some ao salvar; exemplos sem chaves; erros um por linha | — |
| B46-08 | Automação nova nasce desligada, "Salvar e ativar" | — |
| B46-09 | Aba dos Relatórios no endereço (`?aba=rfv`) | teste manual CA-B46-23 (Voltar do navegador) |
| B46-10 | Faturamento diz o período; "Sem compra" nas Carteiras | — |
| B46-11 | Tabela de Contatos sem palavra quebrada; tipo e atendente em "Mais filtros" | teste manual CA-B46-28 (celular) |
| B46-12 | Mesmo contêiner de página em 36 telas (`src/lib/pagina.ts`) | teste manual CA-B46-30 (título no mesmo lugar) |

Cada issue passou pelo auditor ("alinhada" ou "alinhada com teste manual
pendente"), com tsc e lint limpos. As concluídas estão em
`issues/concluidas_B46/`; as com teste manual pendente continuam soltas em
`issues/`.

## Falta fazer

B46-13 (acabamentos), B46-14 (fuso configurável, precisa de coluna nova em
`workspaces`) e B46-15 a B46-19 (clareza: ajuda onde falta explicação, botões
perigosos separados, atalhos entre telas, rótulos padronizados, telas menos
carregadas).

## Para a Marcelle olhar

1. **Migration `20261027000013` no banco, fora do repositório.** O
   `supabase migration list --linked` mostra essa versão na produção sem arquivo no
   master. Deve ser da B45 ainda sem commit. Ela precisa estar no repositório antes
   do `db push` da B46-06, senão o push reclama.
2. **Testes que já falham na master** (sem nada da B46), na suíte unitária:
   - `tema-cores-fixas.test.ts` (CA-B36-10 e 11): cores fixas em `funis-client.tsx`,
     `coluna-kanban.tsx`, `modal-adicionar-contato.tsx`, `landing.tsx`,
     `selo-perfil-rfv.tsx` e `lib/funis.ts`;
   - `tema.test.tsx` (CA-B36-01 e 09);
   - `foto-de-perfil-caminhos.test.ts` (CA-B29-07);
   - `chat-documento-nome-e-previa.test.tsx` (miniatura no recebimento);
   - `planilha-e-csv-seguros.test.ts` (CA-B44-29 e 30);
   - `toda-tela-tem-esqueleto.test.ts` (`configuracoes/campos`, `configuracoes/funis`
     e `pipeline/funil/[id]` sem `loading.tsx`).
3. **Testes antigos ajustados pela B46**, porque o comportamento mudou de propósito:
   três testes de integração das automações agora ligam a regra depois de salvar
   (B46-08); o resumo das Carteiras diz "sem compra" (B35, B46-10); os testes da B37
   e da B40 abrem "Mais filtros" antes de procurar o botão "Lojista" (B46-11).
4. **O merge do b28** (`b28-espera-e-fim-das-sequencias`), que o Luan ia combinar
   com ela: a master tem uns 30 commits que o b28 não tem.
