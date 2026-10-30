# B53-11: Compra registrada aparece no perfil sem F5

**Tipo:** Implementação
**Página:** Contatos — perfil
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-correcoes-qa-roteiro-luan.md`

## Descrição

Reproduzir pelo caminho que o Luan usou (PER-B53-01) e corrigir para a lista de compras do perfil atualizar sozinha.

## Pronto quando

Registrar a compra pelo mesmo caminho do roteiro A6.4 e vê-la na lista sem recarregar.

## Critérios de aceite

- **CA-B53-24** (manual) — Compra nova aparece sem F5. Dado o perfil do contato aberto, quando uma compra é registrada pelo caminho que o Luan usou no roteiro A6.4 (ver PER-B53-01), então a compra aparece na lista do perfil sem recarregar a página.

## Suposições

Nenhuma.

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| PER-B53-01 | Por onde o Luan registrou a compra que só apareceu com F5 (botão do perfil, pedido do catálogo fechado ou Chat)? O código do botão do perfil já recarrega a lista. | aberta | — |
