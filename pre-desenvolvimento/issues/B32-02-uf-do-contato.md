# B32-02: UF do contato

**Tipo:** Implementação
**Página:** Novo contato (`/contatos`), perfil do contato (`/contatos/[id]`) e painel do contato no chat (`/chat`)
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-relatorios-visao-geral.md`

## Descrição

O contato ganha o campo UF, com a lista fixa das 27 siglas, ao lado da cidade nos três lugares onde a cidade já é editada ou mostrada. O servidor só aceita sigla válida ou vazio. Contatos antigos ficam sem UF.

## Pronto quando

Na empresa de teste, abrir o perfil de um contato, escolher "PE" e salvar mostra "Recife · PE" no perfil e no painel do chat. Criar um contato novo já com UF funciona. Um salvamento forçado com "XX" é recusado.

## Critérios de aceite

- **CA-B32-25** (automática) — Salvar a UF do contato. Dado o perfil de um contato sem UF, quando o usuário escolhe "PE" e salva, então o perfil mostra "PE" ao lado da cidade e o valor fica gravado no contato.
- **CA-B32-26** (automática) — UF só aceita sigla válida. Dado um pedido de salvar contato com UF "XX", quando o servidor valida, então recusa com a mensagem "UF inválida" e nada é gravado.

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B32-09 | A UF entra só onde a cidade já é editada ou mostrada (novo contato, perfil, painel do chat) e no relatório. Campanhas, automações, lista de contatos e importação ficam para depois. | confirmada | Marcelle, 21/10/2026 |

## Perguntas em aberto

Nenhuma.
