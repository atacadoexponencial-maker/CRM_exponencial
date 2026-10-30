# B54-04: Tipo Template na campanha, com a lista do número escolhido

**Tipo:** Implementação
**Página:** Campanhas > editor, etapa 2
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-templates-da-meta.md`

## Descrição

Com um número da API Oficial escolhido, a etapa 2 ganha o tipo Template e lista os aprovados daquele número (sem os de autenticação). Com número do canal direto ou sem número escolhido, o tipo não aparece. Trocar o número limpa um template que não existe nele. A tela de templates e a lista na campanha abrem para o Gerente.

## Pronto quando

Admin ou Gerente escolhe um template aprovado do número da campanha, salva, e ao reabrir a campanha o template continua escolhido.

## Critérios de aceite

- **CA-B54-12** (automática) — Número do canal direto não oferece template. Dado a etapa 2 com um número do canal direto escolhido, ou com "Usar o número conectado da empresa", quando a tela mostra os tipos de mensagem, então aparecem só Texto, Imagem + legenda e Documento + legenda, com a nota "Template só existe na API Oficial".
- **CA-B54-13** (automática) — Número da API Oficial oferece o tipo Template. Dado a etapa 2 com um número da API Oficial escolhido, quando a tela mostra os tipos de mensagem, então aparece o quarto tipo, **Template**.
- **CA-B54-14** (automática) — A lista traz só os aprovados do número escolhido. Dado dois números da API Oficial na empresa, cada um com os seus templates, e no escolhido um aprovado, um pendente, um rejeitado e um de autenticação aprovado, quando o Admin escolhe o tipo Template, então a lista mostra só o aprovado desse número; nem o pendente, nem o rejeitado, nem o de autenticação, nem os do outro número aparecem.
- **CA-B54-15** (automática) — Trocar o número limpa um template que não existe nele. Dado a etapa 2 com o tipo Template e um template escolhido, quando o Admin troca para um número que não tem esse template (ou para um do canal direto), então a escolha do template é apagada, o tipo volta a Texto e a tela avisa "O template escolhido não existe neste número".
- **CA-B54-22** (automática) — O Gerente vê e mexe em templates como o Admin. Dado um Gerente logado, quando ele abre Configurações > Templates e, numa campanha, escolhe o tipo Template, então a tela de templates abre para ele com Ver, Editar e Novo template, e a lista de aprovados aparece na campanha como para o Admin; o Atendente continua sem acesso à tela de templates.

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B54-02 | Template de autenticação não aparece na campanha: a Meta fixa o conteúdo dele (código de uso único), e não serve para disparo em massa. | confirmada | Marcelle, 30/10/2026 |
| SUP-B54-03 | O Gerente vê a lista de templates aprovados dentro da campanha, mas a tela de Configurações > Templates continua só do Admin. | invalidada | Marcelle, 30/10/2026: o Gerente vê tudo, inclusive a tela de templates (CA-B54-22) |
| SUP-B54-04 | Com "Usar o número conectado da empresa" (sem escolher um), o tipo Template não aparece: para template, a campanha precisa de um número da API Oficial escolhido. | confirmada | Marcelle, 30/10/2026 |

## Perguntas em aberto

Nenhuma.

## Cenários

### Happy Path
1. Na etapa 2, com um número da API Oficial escolhido, aparece o quarto tipo **Template**. Ao escolhê-lo, a tela pede ao servidor `templatesParaCampanha(numero)`, que lê a conexão com a chave de serviço (empresa + canal `meta`), consulta a Meta (`buscarTemplatesDaMeta`, a mesma consulta da tela de templates) e devolve só os aprovados sem os de autenticação (`aprovadosParaCampanha`).
2. O Admin escolhe um template no seletor; a campanha guarda `{ id, name, language, cabecalho }` em `campaigns.template` (jsonb) com `tipo_mensagem = 'template'`.
3. Salvar como rascunho e reabrir trazem o template escolhido; o reenvio para falhos copia número e template.
4. Gerente: a tela de templates (`page.tsx`, `obterConexao`, menu lateral) passa a aceitar `gerente`; a campanha já era de Admin e Gerente.

### Edge Cases
- Número do canal direto ou "Usar o número conectado da empresa": o tipo Template não aparece e a nota "Template só existe na API Oficial" fica sob os tipos.
- Trocar o número com template escolhido: se o novo número não tem o template (ou é do canal direto), a escolha é apagada, o tipo volta a Texto e o aviso "O template escolhido não existe neste número" aparece.
- Número sem template aprovado: o seletor dá lugar ao aviso para criar em Configurações > Templates.
- O aviso das 24 horas (B53-06) não aparece no tipo Template (o critério completo é o CA-B54-20, na B54-05).

### Cenário de Erro
- A Meta não responde: "Não foi possível carregar os templates da Meta" no lugar do seletor.
- Servidor: tipo template sem template → "Escolha o template da campanha"; sem número → "Escolha o número da API Oficial que vai enviar o template"; número do canal direto → "Template só existe na API Oficial…".
- **Até a B54-06**, confirmar (enviar/agendar) uma campanha de template devolve "O envio de campanha por template ainda não está disponível. A campanha fica salva como rascunho." A B54-06 troca isso pelo envio.

## Prova

| Critério | Prova | Onde | O que confere |
|---|---|---|---|
| CA-B54-12 | automática | `src/test/campanhas-template-tela.test.tsx` | com número do canal direto, e com "Usar o número conectado da empresa", os tipos são só Texto, Imagem + legenda e Documento + legenda e a nota "Template só existe na API Oficial" aparece |
| CA-B54-13 | automática | `src/test/campanhas-template-tela.test.tsx` | com número da API Oficial, o quarto tipo Template aparece |
| CA-B54-14 | automática | `src/test/campanhas-template-actions.test.ts` | `templatesParaCampanha` do número escolhido devolve só o aprovado (não o pendente, o rejeitado nem o de autenticação) e consulta a Meta pela WABA desse número, não pela do outro; número do canal direto devolve vazio |
| CA-B54-15 | automática | `src/test/campanhas-template-tela.test.tsx` | com template escolhido, trocar para número sem esse template (e para o canal direto) apaga a escolha, volta a Texto e mostra "O template escolhido não existe neste número" |
| CA-B54-22 | automática | `src/test/campanhas-template-actions.test.ts` | `listarTemplates` e `templatesParaCampanha` devolvem a lista para o Gerente; o Atendente recebe vazio nas duas; o menu lateral lista Templates para admin e gerente |

## Banco de Dados

- Tabela: `campaigns`
  - `tipo_mensagem` (text) — ganha o valor `template`
  - `template` (jsonb) — `{ id, name, language, cabecalho }` do template escolhido; nulo fora do tipo template

## Arquivos

- **Criar:** `supabase/migrations/20261030000020_campanha_template.sql` — tipo `template` e coluna `template`
- **Criar:** `src/lib/templates-da-meta-graph.ts` — `buscarTemplatesDaMeta(wabaId, token)`, a consulta à Meta compartilhada entre tela de templates e campanha
- **Criar:** `src/test/campanhas-template-tela.test.tsx` — testes dos critérios CA-B54-12, 13 e 15
- **Criar:** `src/test/campanhas-template-actions.test.ts` — testes dos critérios CA-B54-14 e 22
- **Modificar:** `src/lib/templates-da-meta.ts` — `aprovadosParaCampanha`
- **Modificar:** `src/app/(auth)/configuracoes/templates/actions.ts` — Gerente; usa `buscarTemplatesDaMeta`
- **Modificar:** `src/app/(auth)/configuracoes/templates/page.tsx` — Gerente
- **Modificar:** `src/components/shared/sidebar-nav.tsx` — Templates para admin e gerente
- **Modificar:** `src/app/(auth)/campanhas/actions.ts` — tipos, `templatesParaCampanha`, validação, gravação e reenvio com template
- **Modificar:** `src/app/(auth)/campanhas/[id]/editor-campanha-client.tsx` — tipo Template, seletor, troca de número
- **Modificar:** `src/integrations/supabase/types.ts` — regenerado do banco de teste depois da migration (`supabase gen types --project-id cxqdiqhcvdecujlxthmd`)

## Checklist

- [x] migration aplicada no banco de teste e tipos regenerados
- [x] `templatesParaCampanha` só aprovados, sem autenticação, do número da empresa
- [x] editor: tipo Template, seletor, troca de número com limpeza e aviso
- [x] Gerente na tela de templates, no `obterConexao` e no menu
- [x] testes CA-B54-12..15 e 22 passando; tsc limpo
