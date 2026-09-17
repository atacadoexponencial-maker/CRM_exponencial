# B5-02: Configuração de ritmo por número

**Tipo:** Implementação
**Módulo:** B5 — Configuração de Ritmo por Número
**Repositório:** `CRM_exponencial`

---

## Contexto

O formulário da `B5-01` está desenhado com números fixos. Esta issue o liga ao gateway: o
administrador passa a ler o ritmo real de um número, alterá-lo e receber a recusa
explicada quando pede algo acima do que o sistema permite.

Regra que governa a issue: **o gateway é a última palavra.** Ele já aplica os limites do
sistema por conta própria (`aplicarLimites`, em `src/fila/ritmo.ts`) e aperta o que vier
largo, e os tetos do aquecimento continuam valendo por cima do que for configurado — um
administrador pode ser mais conservador que o aquecimento, nunca menos. O CRM valida antes
para dar mensagem boa ao usuário, não para substituir essa rede.

---

## O que construir

1. **Leitura do ritmo configurado** de um número, junto dos **limites do sistema** que
   vêm do próprio gateway. Os limites nunca são escritos no código do CRM: chegam na
   resposta e alimentam a validação e o texto de cada campo.
2. **A alteração**, gravando no gateway: intervalo entre mensagens, teto por hora, teto
   por dia e janela de envio.
3. **O perfil sugerido**, aplicado ao formulário conforme o tempo de vida do número.
4. **A recusa explicada**: pedido acima do limite não salva e diz qual é o limite e qual
   foi o valor pedido. A validação existe nos dois lados — Zod no formulário, e a regra no
   backend, que é a que vale.
5. **O efeito estimado sobre uma campanha**: quanto tempo um disparo levaria naquele
   ritmo, considerando o intervalo entre mensagens, os tetos e a janela de envio. É a conta
   que evita o cliente configurar um ritmo com que a campanha dele levaria uma semana sem
   ele perceber.

Sobre a estimativa, dois cuidados que o `/plan` precisa resolver: o gateway tem uma
previsão própria por mensagem (`estimated_send_at`, na resposta de envio) que, segundo as
pendências da Parte A, **ignora teto e fechamento da janela** — não usar como base. E a
conta do CRM é informativa, então arredondar para cima e apresentar como aproximação, nunca
como promessa.

---

## Comportamentos da spec cobertos

- [x] Consultar o ritmo configurado de um número
- [x] Alterar o intervalo entre mensagens de um número
- [x] Alterar o teto por hora de um número
- [x] Alterar o teto por dia de um número
- [x] Definir a janela de horário de envio de um número
- [x] Aplicar o perfil sugerido a um número
- [x] Impedir configuração acima dos limites do sistema, explicando o limite
- [x] Ver o efeito estimado da configuração sobre o tempo de uma campanha

---

## Contrato do gateway

**`GET` e `PATCH /v1/instances/{id}/rate-profile`, credencial `X-Instance-Token`** —
especificados em 17/09/2026 na seção 4.5 do `contrato-v1.md`. A leitura devolve três
blocos: `configured` (o que está gravado), `effective` (o que a fila usa agora, com
aquecimento aplicado) e `system_limits` (os limites do sistema, para o formulário **não**
duplicar esses números).

Valor fora do limite é recusado com `rate_profile_out_of_range` (422), e a `message`
informa o limite — é ela que o formulário mostra ao administrador.

A implementação no gateway é a issue `A6-08`, ainda aberta.

Da especificação em `B4-00`, o que esta issue consome: os valores configurados
(intervalo, teto por hora, teto por dia, início e fim da janela), os limites do sistema, e
o dia de aquecimento com os tetos vigentes. A recusa vem no formato de erro da seção 5 do
contrato, com `code` estável e `message` legível — a `message` é o que o administrador lê.

Credencial: `X-Instance-Token`, do backend. Nunca no navegador.

Detalhe herdado do gateway, que o `/plan` deve confirmar no contrato: a janela é hora de
**São Paulo**, e as colunas são `time` do Postgres no formato `HH:MM:SS`.

---

## Arquivos

- **Criar:** o `actions.ts` co-localizado com a tela de ritmo da `B5-01` — leitura,
  escrita e a validação de servidor
- **Criar:** a conta da estimativa de duração como **função pura** em `src/lib/`, testável
  sem rede, no espírito de `src/lib/alertas.ts`
- **Modificar:** o cliente do gateway em `src/lib/whatsapp/gateway/`, criado na `B4-02`
- **Modificar:** o formulário da `B5-01` — dados reais, limites vindos do gateway, erro
  do servidor no `erroGeral`

Padrões a reutilizar, pesquisados no repo:

- Validação de faixa numérica em action, com retorno de erro legível:
  `src/app/(auth)/alertas/actions.ts:49-68` (`salvarConfigAlertas` — checa papel, valida
  a faixa, devolve `{ erro }`, faz `upsert`)
- Formulário com React Hook Form + Zod:
  `src/app/(auth)/configuracoes/times/criar-time-dialog.tsx:20-45`

---

## Depende de

- `B4-00` — o endpoint de ritmo. **Bloqueante.**
- `B4-02` — o cliente do gateway e a coluna que liga a conexão do CRM à instância do gateway
- `B5-01` — o formulário que esta issue alimenta

---

## Critérios de aceite

- [x] O formulário abre com os valores reais do número, lidos do gateway
- [x] Os limites mostrados ao lado dos campos vêm do gateway, e não estão escritos no código do CRM
- [x] Alterar intervalo, teto por hora, teto por dia e janela salva no gateway, e reabrir a tela mostra o valor novo
- [x] O perfil sugerido preenche o formulário conforme o tempo de vida do número
- [x] Valor acima do limite não salva e a mensagem diz o limite e o valor pedido
- [x] A validação de limite existe no backend, e não só no formulário
- [x] Gateway recusa: a `message` do erro do gateway chega ao administrador
- [x] A estimativa de duração considera intervalo, tetos e janela, e é apresentada como aproximação
- [x] A estimativa é função pura, com testes de casos
- [x] Nenhuma credencial do gateway em código de cliente nem em `NEXT_PUBLIC_*`
- [x] Só Admin altera; a regra está no backend
- [x] Testes com o gateway simulado, sem rede
- [x] `npm run build`, `npm run lint` e `npm test` passam

## Execução (17/09/2026)

O endpoint existe: a `A6-08` foi implementada no gateway hoje.

Arquivos a mais, declarados:

- **`src/lib/whatsapp/gateway/ritmo.ts`** — leitura, conferência e escrita, testáveis com
  gateway simulado. A action autoriza e monta as dependências.
- **`src/lib/estimativa-campanha.ts`** — criado já na B5-01, porque a linha do efeito
  estimado precisava reagir ao que estava digitado.

**A gravação relê o ritmo antes de escrever.** Dois motivos: os limites são do gateway e
não podem ser presumidos, e a janela precisa ser conferida inteira mesmo quando só uma
ponta muda — cada metade isolada parece válida, e junto elas se invertem.

**A recusa diz o limite e o valor pedido** ("O teto por hora vai de 1 a 60 mensagens, e
você pediu 200"). Só "acima do permitido" obriga o administrador a adivinhar qual é o
permitido. Quando o gateway recusa apesar da conferência local, a mensagem dele é a que
chega: ele é a última palavra, e reescrevê-la arriscaria divergir.

**A estimativa ignora o `estimated_send_at` do gateway**, como a issue mandou: aquela
previsão não considera teto nem fechamento da janela, que é justamente a diferença entre
"2 horas" e "3 dias". A conta daqui usa intervalo, tetos e janela, arredonda para cima e
se apresenta como aproximação; acima de um dia ela fala em dias, porque "37 horas" engana
— as mensagens não saem de madrugada.

**Perfil sugerido:** número novo recebe intervalo maior e tetos baixos, com janela curta;
maduro recebe os limites cheios. A idade vem da saúde; quando a saúde não pode ser lida, a
sugestão é a do maduro — e o gateway continua apertando por cima dela, então errar para o
lado largo aqui não afrouxa nada de verdade.

## Fora de escopo

- Configurar ritmo de vários números de uma vez
- Mexer nos limites do sistema: eles são decisão da Parte A, em `decisoes-de-operacao.md`
- Reimplementar aquecimento, tetos ou janela no CRM: o gateway aplica, o CRM lê e escreve
- Histórico de quem mudou o ritmo e quando
- Usar a estimativa para interromper campanha: é B8
- Ritmo de números da Meta: a Meta não tem esse conceito
