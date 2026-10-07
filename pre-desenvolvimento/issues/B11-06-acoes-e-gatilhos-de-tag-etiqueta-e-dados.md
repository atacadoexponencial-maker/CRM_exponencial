# B11-06: Tags, etiquetas e dados do contato como gatilho, condição e ação

**Tipo:** Implementação
**Página:** Motor; Editor de fluxo
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-automacoes-v2.md`
**Depende de:** B11-05

> **Mudança de 07/10/2026:** as ações (adicionar e remover tag, remover etiqueta,
> alterar dado do contato) e as condições de contato (tag, tipo e classificação)
> foram feitas antes, na B11-11. Ficam aqui só os gatilhos. "Aplicar etiqueta" já
> existia desde a primeira versão.

## Descrição

Entram os gatilhos "tag adicionada ao contato", "etiqueta aplicada à conversa"
e "dado do contato alterado" (campo e valor opcional). Mudanças feitas por
automação não disparam esses gatilhos, inclusive as das ações da B11-11.

Cobre os itens correspondentes do "Editor" e do "Motor".

## Pronto quando

No preview do branch `b11-automacoes-v2` (o merge no `master` é um só, no fim da
série), a regra "tag vip adicionada → tipo = Lojista, aplicar etiqueta VIP,
enviar mensagem" roda ao adicionar a tag pela tela de contato, e a etiqueta
aplicada por ela não dispara uma regra de "etiqueta aplicada".

## Plano (07/10/2026)

### Decisões do plano

O registro está na seção 9 de `decisoes/B11-automacoes-em-fluxo.md`.

- **Onde cada gatilho nasce:** nas actions do CRM que mudam o dado, depois de
  gravar.
  - Tag: `adicionarTagContato`, usada no perfil do contato e no painel do card.
  - Etiqueta: `aplicarEtiqueta`, do chat.
  - Tipo, nicho e cidade: `atualizarDadosContato`, que compara o antes e o
    depois e dispara um evento por campo que mudou de fato.
  - Classificação: `moverCard` e `criarNovoLead`, do funil. Elas comparam a
    classificação calculada antes e depois, porque a classificação vem da
    etapa dos cards.
- **Automação não dispara automação, por construção.** As ações das automações
  gravam direto no banco e não passam por essas actions.
- **"Atendente" sai da lista de campos do gatilho.** `contacts.atendente_id`
  nunca é gravado, e o perfil mostra o atendente sempre vazio. Um gatilho sobre
  ele nunca dispararia. A troca de responsável acontece na conversa e no card,
  e pode virar outro gatilho na fase 2.
- **O gatilho de tag aceita tag digitada,** como a ação. Vazio vale como
  "qualquer tag".
- **Não dispara o que não mudou:** a tag que o contato já tinha, a etiqueta que
  a conversa já tinha e o dado salvo com o mesmo valor.

### Cenários

#### Happy Path

1. Alguém adiciona a tag `vip` no perfil da Ana.
2. A regra "tag vip adicionada → tipo = Lojista, aplicar etiqueta VIP, enviar
   mensagem" roda.
3. A etiqueta que ela aplica não dispara a regra de "etiqueta aplicada".

Também disparam: a etiqueta aplicada pelo chat, o tipo alterado no perfil e o
card arrastado para Ganho, quando a classificação muda.

#### Edge Cases

- **Tag ou etiqueta repetida:** não dispara.
- **Dado salvo sem mudança:** não dispara.
- **Dado apagado:** dispara com valor vazio. Uma regra que espera um valor não
  casa, e uma regra de "qualquer valor" casa.
- **Movimento que não muda a classificação** (de Lead para Sondagem, por
  exemplo): não dispara.
- **Contato na lixeira:** nada dispara, como nos outros gatilhos.

#### Cenário de Erro

Erro nas automações nunca derruba a ação de quem mexeu no contato: a tag fica
salva mesmo assim. O motor não propaga erro.

### Arquivos

- **Modificar:** `src/lib/automacoes/contexto.ts` (os 3 eventos e a conversa do
  evento de etiqueta), `index.ts` (o gatilho corresponde?), `execucoes.ts`
  (evento gravado) e `simulacao.ts` (o evento simulado).
- **Criar:** `src/lib/automacoes/gatilhos-do-crm.ts`:
  - O que as actions do CRM chamam: `dispararTagAdicionada`,
    `dispararEtiquetaAplicada`, `dispararDadosAlterados`,
    `classificacaoDoContato` e `dispararSeClassificacaoMudou`.
  - A parte pura: `camposQueMudaram`.
- **Modificar:** `src/lib/fluxo-automacao.ts` (os 3 gatilhos em
  `GATILHOS_DISPONIVEIS` e a pendência de formato da tag do gatilho).
- **Modificar:** `src/lib/automacoes/referencias.ts` e
  `src/app/(auth)/configuracoes/automacoes/actions.ts` (o servidor confere o
  campo e o valor do gatilho de dado).
- **Modificar no editor:**
  - `catalogo.ts`: tag digitada no gatilho, e o campo "atendente" sai.
  - `painel-bloco.tsx`: `CampoTag` com texto de ajuda próprio.
  - `frases-fluxo.ts`: `fraseDoEvento` para os eventos novos.
  - `historico/historico-client.tsx`: passa as opções para a frase do evento.
- **Modificar, só a chamada do disparo:**
  - `src/app/(auth)/contatos/actions.ts`: `adicionarTagContato` e
    `atualizarDadosContato`.
  - `src/app/(auth)/chat/actions.ts`: `aplicarEtiqueta`.
  - `src/app/(auth)/pipeline/actions.ts`: `moverCard` e `criarNovoLead`.
- **Testes:**
  - `src/test/automacoes.test.ts`: os gatilhos novos casando ou não.
  - Criar `src/test/automacoes-gatilhos-do-crm.test.ts`.
  - `src/test/automacoes-simulacao.test.ts`.
  - Criar `e2e/preview/roteiro-b11-06.cjs`.

### Checklist

- [ ] Eventos novos no motor, no histórico e na simulação
- [ ] Disparos nas actions do CRM (tag, etiqueta, dados, classificação)
- [ ] Editor: 3 gatilhos liberados, tag digitada, sem "atendente"
- [ ] Servidor confere o gatilho de dado
- [ ] Testes automatizados e suíte unitária passando; build com código 0
- [ ] Roteiro no preview passando, incluindo "automação não dispara automação"
- [ ] Registro de decisões (seção 9)
