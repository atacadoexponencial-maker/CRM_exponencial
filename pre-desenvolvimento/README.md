# pre-desenvolvimento — o que está pendente, o que está pronto

Regra da pasta: **o que está na raiz é trabalho em andamento**. O que já entrou
no ar sai daqui. Quem abre a pasta deve saber, sem ler nada, o que falta fazer.

## Em andamento

| Spec | Issues | Estado |
|---|---|---|
| `spec-lixeira-contatos.md` — excluir lead e contato, com lixeira de 30 dias e restaurar | `issues/B13-01` a `B13-06` | Escrita e aprovada em 02/10/2026. Ordem: 01 (protótipo) → 02 → 03 → 04 → 05 → 06. A 06 depende do `CRON_SECRET` no Vercel. |
| `spec-seguranca-rodada-1.md` — falhas críticas da auditoria de 06/10 (cadastro, perfil, credenciais do WhatsApp, tempo real, listagem de arquivos) | `issues/B19-01` a `B19-06` | 06/10/2026: todas no ar; 01, 02, 03, 05 e 06 em `concluidas_B19/`. Falta só o teste manual da Marcelle da **B19-04** (tempo real com mensagem real) para fechar a série e arquivar a spec. |
| `spec-seguranca-rodada-3.md` — falhas médias da auditoria de 06/10 (atendente só no que é dele, times só Admin, referências entre empresas, número de teste da Meta, crons/webhook sem segredo, pedidos da loja, cabeçalhos) | `issues/B21-05` a `B21-08` | 08/10/2026: spec aprovada; **B21-01 a 04 no ar** (em `concluidas_B21/`); demais abertas. |
| `spec-seguranca-rodada-2.md` — falhas altas da auditoria de 06/10 (Next.js, usuário desativado, campanhas entre empresas, SSRF nas fotos por link, freio no cadastro e login) | `issues/concluidas_B20/` | 06/10/2026: as cinco no ar. Falta o teste manual curto da Marcelle (critério de pronto da spec) para arquivar a spec. |

Quando a última issue de uma spec entrar no ar, mova a spec para
`docs/specs-arquivadas/` e as issues para `issues/concluidas_<série>/`.

## Bloqueado

| O quê | Onde | Por quê |
|---|---|---|
| Módulo 6 — Grupos | `bloqueado/spec-modulo-6-grupos.md`, `bloqueado/avaliacao-modulo-6-grupos.md`, `issues/bloqueadas_modulo6/` | A API Oficial da Meta não suporta grupos. Volta quando o canal direto tiver grupos (spec própria). |

## Concluído

- **Módulos 0 a 5 e 7** (fundação, chat, pipeline, contatos, sequências,
  dashboard, campanhas): specs em `docs/specs-arquivadas/spec-modulo-*.md`,
  issues em `issues/concluidas_modulo*/`.
- **Canal direto, parte B** (B1 a B8, 27 issues): spec
  `docs/specs-arquivadas/spec-gateway-whatsapp-proprio.md`, issues em
  `issues/concluidas_B/`.
- **Desconectar e reconectar** (B9 e, no gateway, A10): spec
  `docs/specs-arquivadas/spec-desconectar-reconectar.md`, issues em
  `issues/concluidas_B9/`.
- **Navegação fluida** (B10): spec
  `docs/specs-arquivadas/spec-navegacao-fluida.md`, issues em
  `issues/concluidas_B10/`.
- **Funis Entrada e Recompra** (B12, 02/10/2026): spec
  `docs/specs-arquivadas/spec-renomear-funis.md`, issues em
  `issues/concluidas_B12/`.
- **Etapas novas do Funil de Entrada** (B14, 03/10/2026): spec
  `docs/specs-arquivadas/spec-etapas-funil-entrada.md`, issues em
  `issues/concluidas_B14/`.
- **Etapas novas do Funil de Recompra** (B15, 03/10/2026): spec
  `docs/specs-arquivadas/spec-etapas-funil-recompra.md`, issues em
  `issues/concluidas_B15/`.
- **Catálogo da loja** (B16, 03/10/2026): spec `docs/specs-arquivadas/spec-catalogo.md`,
  issues em `issues/concluidas_B16/`.
- **Automações em fluxo** (B11, 08/10/2026): spec
  `docs/specs-arquivadas/spec-automacoes-v2.md`, issues em
  `issues/concluidas_B11/`, decisões em `decisoes/B11-automacoes-em-fluxo.md`.
  Feita no branch `b11-automacoes-v2`, com merge único no `master` (75513a6).
  - **Regras da primeira versão removidas** (B11-13, 08/10/2026): o código não
    lê mais a tabela `automations`, e uma migration a apagou do banco.

As issues da parte A (gateway) ficam no repositório `whatsapp-gateway`.

## Referência (não é tarefa)

| Arquivo | Para quê |
|---|---|
| `referencia/contrato-gateway-v1.md` | Contrato HTTP do gateway WhatsApp próprio. A fonte de verdade vive no repo do gateway; aqui é cópia. |
| `referencia/checklist-publicacao-app-meta.md` | Passos para publicar o app na Meta (API Oficial). |
| `referencia/avaliacao-whatsapp-nao-oficial.md` | Por que e como o canal direto foi escolhido. |
| `referencia/pesquisa-inicial.md` | Pesquisa de produto do começo do projeto. |
| `referencia/sessao-2026-06-02-whatsapp-api-e-meta-review.md` | Ata da sessão sobre API Oficial e revisão da Meta. |
| `referencia/sessao-2026-09-30-b11-automacoes.md` | Ata da sessão da B11 de 30/09: decisões, preview na Vercel e próximos passos. |
| `referencia/sessao-2026-10-07-b11-automacoes.md` | Ata da sessão da B11 de 07/10: onde retomar, o que muda com o merge e a limpeza depois dele. |
| `../e2e/preview/README.md` | **Empresa de teste** "[TESTE] Automações B11", que fica no banco de produção e não deve ser apagada. Credenciais no `.env.local`; roteiros que testam pela tela no preview e na produção. |
| `decisoes/` | Decisões de arquitetura registradas (hoje: B1-01, camada de provider; B11, automações em fluxo). |
| `testes/` | Planos de teste por módulo e série; o skill `testes` lê daqui. |

## Como as séries se chamam

- `NN` (01, 02…): issues dos módulos 0 a 7, agrupadas por módulo em `concluidas_moduloX/`.
- `B<n>-NN`: séries do CRM depois dos módulos (B1–B8 canal direto, B9 desconectar,
  B10 navegação, B11 automações, B12 renomear funis, B13 lixeira, B14 etapas do Funil de Entrada, B15 etapas do Funil de Recompra, B16 catálogo). A pasta de concluídas leva o prefixo da série.
- `A<n>-NN`: séries do gateway, no outro repositório.
