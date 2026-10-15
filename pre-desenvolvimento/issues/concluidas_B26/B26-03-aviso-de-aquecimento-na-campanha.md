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
| SUP-B26-04 | O dia do aquecimento e os limites daquela faixa podem ser lidos do número na hora de escolher, pelo mesmo caminho que a estimativa de duração já usa. | confirmada | Marcelle, 15/10/2026. Conferido no /plan: o dia vem da leitura de saúde do número (`lerSaudeDoNumero`, a mesma da tela Saúde), não da de ritmo; as duas rodam juntas. |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| PER-B26-01 | Onde a faixa de aquecimento aparece? | respondida | Só em Campanhas, na escolha do número. Marcelle, 15/10/2026. |
| PER-B26-02 | Quando a faixa aparece? | respondida | Durante todo o aquecimento (dia 1 ao 30), com o dia e os limites. Marcelle, 15/10/2026. |

## Cenários

### Happy Path
1. O Admin chega à etapa 3 da campanha e escolhe um número do canal direto conectado há poucos dias.
2. O servidor (`avaliarDisparo`) lê, ao mesmo tempo, o ritmo do número (estimativa, como hoje) e a saúde dele (dia do aquecimento e tetos vigentes).
3. Com o aquecimento ativo, devolve a frase pronta: "Número em aquecimento (dia N): até X mensagens por hora e Y por dia. Os limites sobem sozinhos até o dia 30."
4. A tela mostra a faixa logo abaixo do aviso de risco do canal direto.

### Edge Cases
- **Número maduro** (aquecimento inativo): sem faixa.
- **Número da API Oficial:** sem faixa, sem aviso de risco e sem estimativa, como hoje.
- **Nenhum número escolhido:** sem faixa.
- **Trocar de número:** a avaliação é refeita (já acontece) e a faixa acompanha.
- **Os valores X e Y** são os tetos que a fila usa agora (já com aquecimento e limites do sistema), não só os da faixa de aquecimento.

### Cenário de Erro
- **Saúde não pôde ser lida** (gateway fora, recusa ou erro inesperado): sem faixa; aviso de risco e estimativa como hoje. A estimativa só é marcada como aproximada quando o ritmo também falha, como hoje.

## Prova

| Critério | Prova | Onde | O que confere |
|---|---|---|---|
| CA-B26-09 | automática | `src/test/campanhas-aviso-aquecimento.test.ts` | Número do canal direto no dia 2, com tetos 4 por hora e 30 por dia: a avaliação traz a faixa "Número em aquecimento (dia 2): até 4 mensagens por hora e 30 por dia…" |
| CA-B26-10 | automática | `src/test/campanhas-aviso-aquecimento.test.ts` | Número maduro e número da API Oficial: a avaliação vem sem faixa |
| CA-B26-11 | automática | `src/test/campanhas-aviso-aquecimento.test.ts` | Saúde ilegível: sem faixa, com o aviso de risco e a estimativa de sempre; com o ritmo também ilegível, estimativa marcada como aproximada |

## Banco de Dados

Nenhuma mudança.

## Arquivos

- **Modificar:** `src/lib/whatsapp/gateway/fila-campanha.ts` — `fraseDoAquecimento(saude)`: a frase da faixa, ou `null` sem aquecimento ativo.
- **Modificar:** `src/app/(auth)/campanhas/actions.ts` — `AvaliacaoDoDisparo` ganha `aquecimento: string | null`; `avaliarDisparo` lê a saúde (`lerSaudeDoNumero`, de `src/lib/whatsapp/gateway/saude.ts`) junto com o ritmo e preenche a faixa.
- **Modificar:** `src/app/(auth)/campanhas/[id]/editor-campanha-client.tsx` — mostra `avaliacao.aquecimento` abaixo do aviso de risco.
- **Criar:** `src/test/campanhas-aviso-aquecimento.test.ts` — testes da CA-B26-09, 10 e 11.

Reuso: `lerSaudeDoNumero` e `SaudeDoNumero` (`src/lib/whatsapp/gateway/saude.ts`), `buscarRitmoDoNumero` e `clienteGatewayDoAmbiente`, como a avaliação já usa.

## Checklist

- [x] `fraseDoAquecimento` em `fila-campanha.ts`
- [x] `avaliarDisparo` lê a saúde junto com o ritmo e devolve a faixa
- [x] Editor da campanha mostra a faixa abaixo do aviso de risco
- [x] Testes da CA-B26-09, 10 e 11
