# B5-01: Protótipo — Formulário de Ritmo do Número

**Tipo:** Protótipo
**Módulo:** B5 — Configuração de Ritmo por Número
**Repositório:** `CRM_exponencial`

---

## Contexto

Cada cliente tem uma tolerância a risco diferente: um quer disparar o máximo possível,
outro prefere ir devagar para não perder o número. O gateway já sabe respeitar intervalo
entre mensagens, tetos por hora e por dia e janela de horário (módulo A6) — falta o
administrador poder ajustar isso pelo CRM, dentro de limites que o sistema não deixa
ultrapassar.

Esta issue monta só o formulário, com dados fixos. Nada é salvo, nada é lido do gateway.

---

## O que construir

O formulário de ritmo de **um** número, com os quatro componentes da spec:

1. **Formulário de Ritmo** — intervalo entre mensagens, teto por hora, teto por dia
2. **Janela de Envio** — horário inicial e final permitidos
3. **Limites do Sistema** — os valores máximos, visíveis ao lado de cada campo, para o
   administrador saber o teto antes de tentar
4. **Perfil Sugerido** — valores recomendados conforme o tempo de vida do número, com um
   botão que os aplica ao formulário

Monte dois estados: um número novo, onde o perfil sugerido é conservador e o aquecimento
limita os tetos; e um número maduro, com os limites cheios.

O formulário também mostra, em uma linha, **o efeito estimado da configuração sobre o
tempo de uma campanha** — no protótipo, com um número fixo e um texto do tipo "uma
campanha de 500 mensagens levaria cerca de X horas nesse ritmo". O cálculo real é da
`B5-02`.

Pesquisa feita: **não existe primitivo de select nem de slider** em `src/components/ui/`
— há `badge`, `button`, `dialog`, `dropdown-menu`, `input` e `label`. A janela de horário
sai com `input` de tipo hora, e não se instala biblioteca nova para isso.

---

## Comportamentos da spec cobertos

Nenhum — protótipo é tela. Os 8 comportamentos de B5 entram na `B5-02`.

---

## Contrato do gateway

Nenhuma chamada nesta issue.

Os limites reais e os valores configurados vêm do endpoint de ritmo, que **ainda não
existe** e será definido em `B4-00`. No protótipo eles são fixos — e é proibido escrever
esses números como se fossem definitivos no CRM: eles vivem no gateway
(`INTERVALO_MINIMO_S`, `TETO_HORA_MAXIMO`, `TETO_DIA_MAXIMO` e os limites da janela) e
duplicá-los aqui é garantia de sair de sincronia.

---

## Arquivos

- **Criar:** a rota da tela, ao lado da tela de saúde da `B4-01` — sugestão
  `src/app/(auth)/configuracoes/whatsapp/[id]/ritmo/`, com `page.tsx` (server component,
  checa papel) e o formulário como client component
- **Reutilizar:** `src/components/ui/input.tsx`, `label.tsx`, `button.tsx`, `badge.tsx`
- **Reutilizar o padrão de formulário do projeto:**
  `src/app/(auth)/configuracoes/times/criar-time-dialog.tsx:1-45` — React Hook Form com
  `zodResolver`, schema Zod no topo do arquivo, `formState.errors` por campo e um
  `erroGeral` para a falha vinda do servidor
- **Reutilizar:** a checagem de papel de
  `src/app/(auth)/configuracoes/whatsapp/page.tsx:12-19`

---

## Depende de

- `B4-01` — não é bloqueante, mas as duas telas são vizinhas e do mesmo número; fazer
  depois evita desenhar duas vezes a navegação entre elas

---

## Critérios de aceite

- [ ] O formulário mostra os cinco campos: intervalo, teto por hora, teto por dia, início e fim da janela
- [ ] Cada campo mostra o limite do sistema ao lado
- [ ] O botão do perfil sugerido preenche os campos
- [ ] A linha do efeito estimado sobre uma campanha aparece
- [ ] Os dois estados (número novo e número maduro) são visíveis sem editar o código
- [ ] Validação de formato no cliente com Zod, no padrão do repo
- [ ] Funciona em largura de celular
- [ ] Papel: só Admin
- [ ] `npm run build` e `npm run lint` passam

## Fora de escopo

- Salvar de verdade, ou ler do gateway — é `B5-02`
- Calcular o efeito estimado: no protótipo é número fixo
- Decidir os valores do perfil sugerido: quem sabe a idade do número é o gateway
- Configurar ritmo de vários números de uma vez
