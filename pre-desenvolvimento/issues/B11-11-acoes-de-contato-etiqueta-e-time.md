# B11-11: Ações de tag, etiqueta, dado do contato e time

**Tipo:** Implementação
**Página:** Motor; Editor de fluxo
**Repositório:** `crm-exponencial`, branch `b11-automacoes-v2`
**Spec:** `pre-desenvolvimento/spec-automacoes-v2.md`
**Decisões:** `pre-desenvolvimento/decisoes/B11-automacoes-em-fluxo.md`, seção 7
**Depende de:** B11-10
**Ordem:** logo depois da B11-10. Tirada da B11-06 (ações de tag, etiqueta e
dado do contato) e da B11-08 (atribuir a um time) em 07/10/2026, a pedido do
Luan, para testar no preview ações que não dependem do WhatsApp.

## Descrição

Entram no motor e no editor cinco ações:

- **Adicionar tag ao contato** e **remover tag do contato.** Adicionar aceita uma
  tag nova digitada, com as tags existentes como sugestão. As regras são as mesmas
  da tela do contato: minúsculas, sem espaço, até 50 caracteres.
- **Remover etiqueta da conversa:** o par do "aplicar etiqueta".
- **Alterar dado do contato:** tipo, nicho, cidade, ou acrescentar uma linha às
  observações. A classificação fica de fora (ver Decisões do plano).
- **Atribuir a um time:** o CRM escolhe o atendente ativo do time com menos
  conversas abertas e faz o mesmo que "atribuir atendente".

Os gatilhos e as condições de tag, etiqueta e dados continuam na B11-06. Iniciar
sequência, resolver e reabrir conversa e o horário comercial continuam na
B11-08.

## Pronto quando

No preview, a regra "card movido para Sondagem → adicionar tag `interessado`,
alterar o tipo para Lojista, acrescentar 'entrou em sondagem' às observações,
atribuir ao time Entrada" faz tudo isso no contato de teste quando o card é
movido. Uma segunda regra com "remover tag" e "remover etiqueta" desfaz as duas.

## Plano (07/10/2026)

### Decisões do plano

- **Classificação fora do "alterar dado do contato".** O CRM calcula a
  classificação pela etapa dos cards (`calcularClassificacao`), no perfil, na
  lista e nas campanhas. A coluna `contacts.classificacao` nunca é gravada. Uma
  automação que gravasse ali não mudaria nada visível. Quem muda a
  classificação é a etapa do card, e "mover card" já faz isso.
- **Tag nova pode ser digitada.** O editor só oferecia as tags que algum contato
  já tem. Numa empresa sem tags, "adicionar tag" não teria o que escolher.
- **Atribuir a um time:** entre os membros ativos do time, ganha o que tem menos
  conversas abertas (`em_espera` e `em_atendimento`). No empate, o primeiro pelo
  nome, para o resultado ser previsível. O atendente escolhido recebe a conversa
  e o card, como em "atribuir atendente". Time sem membro ativo é falha.
- **Validação no servidor:** o time precisa ser da empresa, o campo do contato
  precisa ser um dos quatro, e o tipo precisa ser lojista, revendedor ou
  empreendedor. O formato da tag vira pendência, que o editor e o servidor
  conferem.

### Cenários

#### Happy Path

O admin monta o fluxo com as ações novas, salva, e move o card do contato de
teste. A tag entra (ou sai), a etiqueta sai da conversa, o dado muda e a
conversa e o card passam para o atendente do time com menos conversas abertas.

#### Edge Cases

- **Adicionar uma tag que o contato já tem:** nada muda, e conta como feito.
- **Remover uma tag ou etiqueta que não está lá:** nada muda, e conta como feito.
- **Acrescentar às observações vazias:** a linha vira o texto inteiro.
- **Contato sem conversa aberta:** remover etiqueta falha. Atribuir a um time
  atualiza só o card, como "atribuir atendente".
- **Time sem membro ativo:** a ação falha e o caminho segue.

#### Cenário de Erro

Erro de banco numa ação marca só ela como falha, e o caminho segue, como nas
outras ações.

### Banco de Dados

Nenhuma mudança. As ações usam `contact_tags`, `conversation_labels`,
`contacts`, `user_teams`, `profiles`, `conversations` e `pipeline_cards`.

### Arquivos

- **Modificar:** `src/lib/fluxo-automacao.ts`: as cinco ações em
  `ACOES_DISPONIVEIS`, `normalizarTag` e a pendência de formato da tag.
- **Modificar:** `src/lib/automacoes/acoes.ts`: as cinco ações. "Atribuir
  atendente" e "atribuir a um time" passam a usar a mesma gravação.
- **Modificar:** `src/lib/automacoes/referencias.ts`: times citados e
  `dadoDoContatoValido`.
- **Modificar:** `src/app/(auth)/configuracoes/automacoes/actions.ts`: confere
  os times e o dado do contato antes de gravar.
- **Modificar:** `src/app/(auth)/configuracoes/automacoes/components/catalogo.ts`:
  campo de tag livre em "adicionar tag" e classificação fora dos campos da
  ação.
- **Modificar:** `src/app/(auth)/configuracoes/automacoes/components/painel-bloco.tsx`:
  o campo de tag livre, com as sugestões.
- **Criar:** `src/test/automacoes-acoes.test.ts`: as cinco ações no motor,
  chamando `executarAcao` direto com um banco falso que registra as gravações.
- **Modificar:** `src/test/fluxo-automacao.test.ts`: pendência de formato da tag.
- **Modificar:** `src/test/automacoes-fluxo-recebido.test.ts`: times e dado do
  contato em `referencias`.
- **Modificar:** `pre-desenvolvimento/issues/B11-06-acoes-e-gatilhos-de-tag-etiqueta-e-dados.md`
  e `pre-desenvolvimento/issues/B11-08-atribuir-time-sequencia-conversa-e-horario.md`:
  saem as ações que vieram para cá.
- **Modificar:** `pre-desenvolvimento/decisoes/B11-automacoes-em-fluxo.md` (seção
  7) e `pre-desenvolvimento/README.md` (ordem da série).

**Reutilizar:** as regras de tag de `adicionarTagContato`
(`src/app/(auth)/contatos/actions.ts`), `TIPO_LABEL` de
`src/app/(auth)/contatos/mock-contatos.ts` e `conversaDoEvento`.

### Checklist

- [x] Cinco ações em `ACOES_DISPONIVEIS` e pendência de formato da tag
- [x] Adicionar e remover tag no motor
- [x] Remover etiqueta no motor
- [x] Alterar dado do contato (tipo, nicho, cidade, observações) no motor
- [x] Atribuir a um time no motor, com o atendente de menos conversas abertas
- [x] Servidor confere time e dado do contato
- [x] Campo de tag livre com sugestões; classificação fora dos campos da ação
- [x] Testes novos e suíte unitária passando
- [x] Build com código de saída 0 e lint limpo
- [x] B11-06, B11-08, decisões e README atualizados

## Execução (07/10/2026)

**Aberta até o teste no preview**, como a B11-10.

**O que ficou diferente do plano:**

- **Os testes das ações ficaram num arquivo próprio**
  (`automacoes-acoes.test.ts`), e não em `automacoes.test.ts`. Assim chamam
  `executarAcao` direto, sem passar pelo carregamento das regras.
- **Um teste da B11-10 mudou de exemplo:** ele usava "adicionar tag" como ação
  "em breve". Passou a usar "iniciar sequência", que continua em breve.
- **`dadoDoContatoValido` confere o tipo com `Object.hasOwn`**, e não com `in`.
  Com `in`, um valor como `toString` passaria, porque vem do protótipo do objeto.

## Ajuste de 07/10/2026: condições de contato junto com as ações

No primeiro teste, o Luan notou que as ações de tag e de dado do contato estavam
liberadas, mas as condições ainda apareciam "em breve". Dava para adicionar uma
tag e não dava para perguntar se o contato tinha ela. O bloco de condição foi
conferido contra o que o motor faz, e três verificações entraram:

- **Tag do contato tem / não tem.** O valor aceita tag digitada, como na ação,
  para conferir uma tag que o próprio fluxo acabou de adicionar. O campo de tag
  virou um componente (`CampoTag`), usado na ação e na condição.
- **Tipo do contato é / não é.** Contato sem tipo "não é" nenhum tipo.
- **Classificação do contato é / não é**, calculada pela etapa dos cards com
  `calcularClassificacao`, igual ao que o CRM mostra (seção 7.1 das decisões).

Continuam "em breve" e fazem sentido assim: texto e tipo da mensagem (só valem
nos gatilhos de mensagem, que ainda não estão liberados) e horário comercial
(precisa da configuração de horário, B11-08).

**Arquivos do ajuste:** `src/lib/automacoes/verificacoes.ts` (as três
verificações), `src/lib/fluxo-automacao.ts` (`VERIFICACOES_DISPONIVEIS`, com a
tag primeiro, que vira o padrão da verificação nova), `src/lib/automacoes/referencias.ts`
e `actions.ts` (o servidor confere tipo e classificação), `catalogo.ts` e
`painel-bloco.tsx` (tag digitada na condição), `src/test/automacoes-verificacoes.test.ts`
(novo), `src/test/automacoes-banco-falso.ts` (o banco falso, que saiu do teste
das ações para servir aos dois) e ajustes nos testes de fluxo e de referências.
Um teste da B11-10 trocou de novo de exemplo de verificação "em breve": de tag
para horário.

**Verificação do ajuste:** suíte unitária com 42 arquivos e 475 testes passando,
`tsc` e lint limpos, build com código 0. No Playwright, numa rota temporária
apagada antes do commit, o seletor de atributo mostrou 7 verificações
disponíveis e 3 "em breve", e a tag digitada "Cliente VIP" virou `clientevip`.

**Como foi verificado (primeira parte):** 19 testes novos. A suíte unitária inteira, sem os
`*.integration.test.ts`, deu 41 arquivos e 465 testes passando. `tsc` sem erro,
lint limpo nos arquivos da issue e `npm run build` com código de saída 0. As
ações rodando de verdade ficam para o teste no preview.
