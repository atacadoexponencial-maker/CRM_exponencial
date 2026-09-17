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

- [ ] Consultar o ritmo configurado de um número
- [ ] Alterar o intervalo entre mensagens de um número
- [ ] Alterar o teto por hora de um número
- [ ] Alterar o teto por dia de um número
- [ ] Definir a janela de horário de envio de um número
- [ ] Aplicar o perfil sugerido a um número
- [ ] Impedir configuração acima dos limites do sistema, explicando o limite
- [ ] Ver o efeito estimado da configuração sobre o tempo de uma campanha

---

## Contrato do gateway

**Endpoint a definir em `B4-00`** — leitura e escrita do perfil de ritmo, devolvendo junto
os limites do sistema. O contrato v1 não tem nada disso: o perfil mora na tabela
`instances` do gateway e hoje só se altera por SQL ou script.

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

- [ ] O formulário abre com os valores reais do número, lidos do gateway
- [ ] Os limites mostrados ao lado dos campos vêm do gateway, e não estão escritos no código do CRM
- [ ] Alterar intervalo, teto por hora, teto por dia e janela salva no gateway, e reabrir a tela mostra o valor novo
- [ ] O perfil sugerido preenche o formulário conforme o tempo de vida do número
- [ ] Valor acima do limite não salva e a mensagem diz o limite e o valor pedido
- [ ] A validação de limite existe no backend, e não só no formulário
- [ ] Gateway recusa: a `message` do erro do gateway chega ao administrador
- [ ] A estimativa de duração considera intervalo, tetos e janela, e é apresentada como aproximação
- [ ] A estimativa é função pura, com testes de casos
- [ ] Nenhuma credencial do gateway em código de cliente nem em `NEXT_PUBLIC_*`
- [ ] Só Admin altera; a regra está no backend
- [ ] Testes com o gateway simulado, sem rede
- [ ] `npm run build`, `npm run lint` e `npm test` passam

## Fora de escopo

- Configurar ritmo de vários números de uma vez
- Mexer nos limites do sistema: eles são decisão da Parte A, em `decisoes-de-operacao.md`
- Reimplementar aquecimento, tetos ou janela no CRM: o gateway aplica, o CRM lê e escreve
- Histórico de quem mudou o ritmo e quando
- Usar a estimativa para interromper campanha: é B8
- Ritmo de números da Meta: a Meta não tem esse conceito
