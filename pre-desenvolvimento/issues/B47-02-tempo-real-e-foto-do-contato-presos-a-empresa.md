# B47-02: Tempo real e foto do contato presos à empresa

**Tipo:** Implementação
**Página:** Tempo real do chat / Foto do contato
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-seguranca-rodada-5.md`

## Descrição

Fechar o canal pessoal de tempo real para conta desativada, tirar o aviso de foto nova
que ia para a empresa inteira e assinar só o caminho da foto do próprio contato.

## Pronto quando

Conta desativada não ouve o próprio canal, a foto nova não é transmitida para a empresa e
um caminho de foto adulterado não vira link, enquanto a foto certa continua aparecendo.

## Critérios de aceite

- **CA-B47-05** (automática) — conta desativada não ouve o canal pessoal. Dado um atendente com a conta desativada e o acesso ainda válido, quando ele tenta entrar no próprio canal de tempo real, então a entrada é recusada, e com a conta ativa ela continua aceita.
- **CA-B47-06** (automática) — foto nova do contato não é transmitida para a empresa. Dado um contato cuja foto de perfil acabou de ser guardada, quando a guarda termina, então nada é transmitido em tempo real com a foto, e a foto aparece para quem vê o contato no próximo carregamento da lista do chat e do perfil.
- **CA-B47-07** (automática) — caminho de foto de outra empresa não vira link. Dado um contato cujo caminho da foto foi trocado direto no banco para a foto de um contato de outra empresa, quando o perfil do contato e a lista do chat pedem a foto, então nenhuma foto aparece para ele, e a foto de um contato sem adulteração continua aparecendo.

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B47-02 | O aviso de foto nova segue a mesma regra de canais das mensagens novas (gestão, responsável, fila aberta) | invalidada | O aviso sai (Marcelle, 28/10/2026) |

## Perguntas em aberto

Nenhuma.
