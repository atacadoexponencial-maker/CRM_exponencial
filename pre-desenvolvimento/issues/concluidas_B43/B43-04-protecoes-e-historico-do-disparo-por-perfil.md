# B43-04: Proteções e histórico do disparo por perfil

**Tipo:** Implementação
**Página:** Configurações → Automações (disparo e histórico)
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-automacao-por-perfil-rfv.md`

## Descrição

O disparo por perfil pula quem já saiu do perfil de destino antes do horário, não acumula mudanças dos dias em que a automação estava desligada, e o histórico de automações descreve a mudança que disparou ("Entrou em Em Risco (vindo de Campeão)").

## Pronto quando

Um cliente que caiu para Em Risco de madrugada e comprou de manhã não recebe a mensagem de reativação; ligar uma automação parada não dispara mudanças antigas; o histórico mostra de qual perfil para qual o contato foi.

## Critérios de aceite

- **CA-B43-19** (automática) — Quem saiu do perfil antes do horário é pulado. Dado a conferência anotou a Ana entrando em Em Risco, e ela fez uma compra às 8h, antes da automação das 10h, e saiu de Em Risco, quando chegam as 10h, então a automação não roda para a Ana.
- **CA-B43-21** (automática) — Automação desligada não roda e não acumula. Dado uma automação de perfil desligada enquanto mudanças foram anotadas por dois dias, quando a pessoa liga a automação de novo e chega o horário dela, então ela roda só para as mudanças anotadas no dia em que foi ligada, e não para as dos dias em que estava desligada.
- **CA-B43-23** (automática) — O histórico mostra qual mudança disparou. Dado uma automação de perfil que rodou para a Ana, quando a pessoa abre o histórico de automações, então a execução da Ana aparece com o gatilho descrito como "Entrou em Em Risco (vindo de Campeão)".

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B43-03 | Na hora do disparo, a automação confere se o contato ainda está num perfil de destino e pula quem já saiu (CA-B43-19). | confirmada | Marcelle, 24/10/2026 (aprovação da spec). |
| SUP-B43-04 | Automação ligada depois da conferência roda no próprio horário para as mudanças anotadas naquele dia; mudanças de dias anteriores nunca disparam (CA-B43-21). | confirmada | Marcelle, 24/10/2026 (aprovação da spec). |

## Perguntas em aberto

Nenhuma.

## Cenários

### Happy Path
1. No horário da automação, antes de rodar para um contato, o motor confere o perfil da hora dele (`perfis_rfv_do_workspace`). Se ele ainda está num dos perfis de destino, a automação roda como na B43-03.
2. No histórico de automações, a execução mostra o gatilho como "Entrou em Em Risco (vindo de Campeão)". Quem não tinha compra aparece como "(vindo de Sem compras)".

### Edge Cases
- O contato comprou de manhã e saiu do destino antes do horário: a automação não roda. No histórico, a execução aparece como ignorada, com o motivo "Não rodou: o contato já saiu do perfil de destino". A mudança fica marcada para essa automação, e a rotina repetida não registra de novo.
- Automação desligada por dias: o disparo só lê as mudanças da conferência mais recente (B43-03). Ao ligar de novo, ela roda no horário dela só para as mudanças do dia; as dos dias em que estava desligada nunca disparam.

### Cenário de Erro
- Erro do banco ao conferir o perfil: a regra não roda, e o histórico registra a falha (melhor não mandar a mensagem do que mandar para quem já voltou a comprar).

## Prova

| Critério | Prova | Onde | O que confere |
|---|---|---|---|
| CA-B43-19 | automática | `src/test/automacao-perfil-rfv-protecoes.integration.test.ts` | quem saiu do destino antes do horário não ganha a tag; o histórico registra a execução como ignorada |
| CA-B43-21 | automática | `src/test/automacao-perfil-rfv-protecoes.integration.test.ts` | religada, a automação roda só para as mudanças do dia em que foi ligada |
| CA-B43-23 | automática | `src/test/automacao-perfil-rfv-protecoes.integration.test.ts` | o evento gravado da Ana vira "Entrou em Em Risco (vindo de Campeão)" |
| CA-B43-23 | automática | `src/test/automacao-perfil-rfv-historico-tela.test.tsx` | a tela do histórico mostra "Entrou em Em Risco (vindo de Campeão)" |

## Banco de Dados

Nada muda.

## Arquivos

- **Modificar:** `src/lib/automacoes/index.ts` — confere o perfil da hora antes de rodar; quem saiu do destino vai para o histórico como ignorada
- **Modificar:** `src/app/(auth)/configuracoes/automacoes/components/frases-fluxo.ts` — frase do evento no histórico
- **Criar:** `src/test/automacao-perfil-rfv-protecoes.integration.test.ts` — proteções e evento gravado, no banco de verdade
- **Criar:** `src/test/automacao-perfil-rfv-historico-tela.test.tsx` — a frase na tela do histórico

Reuso: `perfis_rfv_do_workspace` (B43-02), `registrarExecucao` com resultado "ignorada", `conferirPerfisRfv`/`dispararPerfisRfv` (B43-03), montagem de `src/test/automacao-entrou-perfil-rfv.integration.test.ts`, `HistoricoClient` como em `src/test/automacoes-historico-tela.test.tsx`.

## Checklist

- [x] Conferência do perfil da hora antes de rodar, com o motivo no histórico
- [x] Frase do evento no histórico
- [x] Testes da tabela Prova passando; tsc e lint limpos; testes de automações rodados
