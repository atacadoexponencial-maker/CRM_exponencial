# B26-03: Aviso de aquecimento na escolha do número da campanha

**Tipo:** Implementação
**Página:** Campanhas, editor (`/campanhas/[id]`), etapa de escolha do número
**Spec:** `pre-desenvolvimento/spec-mensagem-na-fila.md`

## Descrição

Ao escolher, na campanha, um número do canal direto em aquecimento, aparece junto ao
aviso de risco uma faixa com o dia do aquecimento e os limites que o número usa: "Número
em aquecimento (dia N): até X mensagens por hora e Y por dia. Os limites sobem sozinhos
até o dia 30."

## Pronto quando

O Admin escolhe na campanha um número do canal direto conectado há poucos dias e vê a
faixa com o dia e os limites. Ao trocar para um número maduro ou da API Oficial, a faixa
some.

## Critérios de aceite

- **CA-B26-09** (automática) — Número em aquecimento mostra a faixa com dia e limites. Dado um número do canal direto conectado há 2 dias, quando o Admin o escolhe na campanha, então aparece a faixa "Número em aquecimento (dia 2): até 4 mensagens por hora e 30 por dia", com os valores que o número de fato usa.
- **CA-B26-10** (automática) — Número fora do aquecimento ou da API Oficial não mostra a faixa. Dado um número do canal direto conectado há mais de 30 dias, e um número da API Oficial, quando o Admin escolhe cada um na campanha, então a faixa de aquecimento não aparece para nenhum dos dois.
- **CA-B26-11** (automática) — Sem resposta do número, a campanha não inventa aquecimento. Dado um número do canal direto cujo estado o CRM não consegue ler naquele momento, quando o Admin o escolhe na campanha, então a faixa não aparece, e o aviso de risco e a estimativa aparecem como hoje (estimativa marcada como aproximada).

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B26-04 | O dia do aquecimento e os limites daquela faixa podem ser lidos do número na hora de escolher, pelo mesmo caminho que a estimativa de duração já usa. | confirmada | Marcelle, 15/10/2026. Conferir no código no /plan. |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| PER-B26-01 | Onde a faixa de aquecimento aparece? | respondida | Só em Campanhas, na escolha do número. Marcelle, 15/10/2026. |
| PER-B26-02 | Quando a faixa aparece? | respondida | Durante todo o aquecimento (dia 1 ao 30), com o dia e os limites. Marcelle, 15/10/2026. |
