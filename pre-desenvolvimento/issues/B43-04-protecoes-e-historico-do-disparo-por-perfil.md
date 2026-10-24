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
