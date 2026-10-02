# pre-desenvolvimento — o que está pendente, o que está pronto

Regra da pasta: **o que está na raiz é trabalho em andamento**. O que já entrou
no ar sai daqui. Quem abre a pasta deve saber, sem ler nada, o que falta fazer.

## Em andamento

| Spec | Issues | Estado |
|---|---|---|
| `spec-automacoes-v2.md` — automações com gatilho, condições e ações (fase 1) | `issues/B11-01` a `B11-09` | Escrita em 29/09/2026. Nenhuma issue começada. Implementador: Luan. Ordem sugerida: 01 → 02 → 03 → 04 → 05 → 07 → 06 → 08 → 09. |
| `spec-lixeira-contatos.md` — excluir lead e contato, com lixeira de 30 dias e restaurar | `issues/B13-01` a `B13-06` | Escrita e aprovada em 02/10/2026. Ordem: 01 (protótipo) → 02 → 03 → 04 → 05 → 06. A 06 depende do `CRON_SECRET` no Vercel. |

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

As issues da parte A (gateway) ficam no repositório `whatsapp-gateway`.

## Referência (não é tarefa)

| Arquivo | Para quê |
|---|---|
| `referencia/contrato-gateway-v1.md` | Contrato HTTP do gateway WhatsApp próprio. A fonte de verdade vive no repo do gateway; aqui é cópia. |
| `referencia/checklist-publicacao-app-meta.md` | Passos para publicar o app na Meta (API Oficial). |
| `referencia/avaliacao-whatsapp-nao-oficial.md` | Por que e como o canal direto foi escolhido. |
| `referencia/pesquisa-inicial.md` | Pesquisa de produto do começo do projeto. |
| `referencia/sessao-2026-06-02-whatsapp-api-e-meta-review.md` | Ata da sessão sobre API Oficial e revisão da Meta. |
| `decisoes/` | Decisões de arquitetura registradas (hoje: B1-01, camada de provider). |
| `testes/` | Planos de teste por módulo e série; o skill `testes` lê daqui. |

## Como as séries se chamam

- `NN` (01, 02…): issues dos módulos 0 a 7, agrupadas por módulo em `concluidas_moduloX/`.
- `B<n>-NN`: séries do CRM depois dos módulos (B1–B8 canal direto, B9 desconectar,
  B10 navegação, B11 automações, B12 renomear funis, B13 lixeira). A pasta de concluídas leva o prefixo da série.
- `A<n>-NN`: séries do gateway, no outro repositório.
