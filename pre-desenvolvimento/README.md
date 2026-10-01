# pre-desenvolvimento — o que está pendente, o que está pronto

Regra da pasta: **o que está na raiz é trabalho em andamento**. O que já entrou
no ar sai daqui. Quem abre a pasta deve saber, sem ler nada, o que falta fazer.

## Em andamento

| Spec | Issues | Estado |
|---|---|---|
| `spec-automacoes-v2.md` — automações em fluxo de blocos: gatilho, condições com sim/não e ações (fase 1) | `issues/B11-01` a `B11-09` | Escrita em 29/09/2026 e trocada para fluxo de blocos em 30/09 (`decisoes/B11-automacoes-em-fluxo.md`). Feita no branch `b11-automacoes-v2`, com merge único no fim, depois de testada no preview. Implementador: Luan. Ordem sugerida: 01 → 02 → 03 → 04 → 05 → 07 → 06 → 08 → 09. |

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

As issues da parte A (gateway) ficam no repositório `whatsapp-gateway`.

## Referência (não é tarefa)

| Arquivo | Para quê |
|---|---|
| `referencia/contrato-gateway-v1.md` | Contrato HTTP do gateway WhatsApp próprio. A fonte de verdade vive no repo do gateway; aqui é cópia. |
| `referencia/checklist-publicacao-app-meta.md` | Passos para publicar o app na Meta (API Oficial). |
| `referencia/avaliacao-whatsapp-nao-oficial.md` | Por que e como o canal direto foi escolhido. |
| `referencia/pesquisa-inicial.md` | Pesquisa de produto do começo do projeto. |
| `referencia/sessao-2026-06-02-whatsapp-api-e-meta-review.md` | Ata da sessão sobre API Oficial e revisão da Meta. |
| `referencia/sessao-2026-09-30-b11-automacoes.md` | Ata da sessão da B11: onde retomar, decisões, preview na Vercel e próximos passos. |
| `decisoes/` | Decisões de arquitetura registradas (hoje: B1-01, camada de provider; B11, automações em fluxo). |
| `testes/` | Planos de teste por módulo e série; o skill `testes` lê daqui. |

## Como as séries se chamam

- `NN` (01, 02…): issues dos módulos 0 a 7, agrupadas por módulo em `concluidas_moduloX/`.
- `B<n>-NN`: séries do CRM depois dos módulos (B1–B8 canal direto, B9 desconectar,
  B10 navegação, B11 automações). A pasta de concluídas leva o prefixo da série.
- `A<n>-NN`: séries do gateway, no outro repositório.
