# B53-10: Timeline do contato registra "Dados editados"

**Tipo:** Implementação
**Página:** Contatos — perfil
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-correcoes-qa-roteiro-luan.md`

## Descrição

Editar os dados do contato passa a gravar um evento na timeline com quem editou e os nomes dos campos alterados.

## Pronto quando

Editar cidade e telefone de um contato aparece na timeline.

## Critérios de aceite

- **CA-B53-22** (automática) — Edição aparece na timeline. Dado um contato com cidade "Santos", quando a Marcelle muda a cidade e o telefone e salva, então a timeline mostra "Dados editados" por Marcelle, com "Cidade, Telefone".
- **CA-B53-23** (automática) — Salvar sem mudança não grava evento. Dado um contato, quando a pessoa salva sem alterar nada, então nenhum evento "Dados editados" é gravado.

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B53-04 | Os campos que contam como "Dados editados" são os do formulário de edição do contato (nome, telefone, tipo, cidade, UF, ICP, observações e campos personalizados); etiquetas e dono do contato já têm registro próprio ou ficam fora. | confirmada | Marcelle aprovou a spec sem mudança, 30/10/2026. |

## Perguntas em aberto

Nenhuma.
