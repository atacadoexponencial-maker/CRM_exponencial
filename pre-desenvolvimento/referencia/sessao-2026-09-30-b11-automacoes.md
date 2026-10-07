# Sessão 2026-09-30/10-01 — B11, automações em fluxo de blocos

**Quem:** Luan (com o Claude Code)
**Branch:** `b11-automacoes-v2` (no GitHub, sem merge no `master`)
**Decisões em detalhe:** `pre-desenvolvimento/decisoes/B11-automacoes-em-fluxo.md`

---

## 1. Onde retomar

> **Atualização de 07/10/2026:** esta lista ficou para trás. A B11-02 (motor) e
> a B11-10 (editor e lista gravando no banco) foram feitas, e o protótipo saiu.
> Em `/configuracoes/automacoes` do branch está a tela nova, que grava de
> verdade, e a tela antiga não existe mais no branch. Para retomar, leia as
> issues B11-02 e B11-10 e as seções 5 e 6 do registro de decisões. O texto
> abaixo fica como registro da sessão de 30/09.

1. **Testar o protótipo** (Luan e Marcelle) no preview mais recente do branch,
   que aparece no painel da Vercel. O endereço muda a cada envio.
   - Pede o login da Vercel e depois o login de **admin** do CRM.
   - Desde 07/10, o item "Automações" do menu abre o protótipo (só no branch).
     Antes, o endereço `/configuracoes/automacoes/prototipo` tinha que ser
     digitado.
   - O que experimentar: abrir "Catálogo e ausência", usar o "+" de uma saída
     livre, ligar blocos arrastando, configurar um bloco no painel e usar
     "Testar com um contato" com a Ana, o Bruno e a Carla, que percorrem
     caminhos diferentes.
2. **Juntar o retorno** sobre a forma do editor e ajustar o protótipo, se for
   preciso.
3. **Fechar a B11-01** depois da aprovação dos dois: mover a issue para
   `issues/concluidas_B11/`.
4. **Começar a B11-02** (motor e banco). Ver a seção 6.

> ⚠️ **No preview, não use a tela antiga de automações** (em
> `/configuracoes/automacoes`, fora do menu desde 07/10). O preview grava no
> Supabase de produção, e uma regra salva ali passa a disparar de verdade para
> os clientes. O protótipo não grava nada.

---

## 2. O que foi decidido

| Decisão | Resumo |
|---|---|
| **Fluxo de blocos, estilo N8N** | A regra é um desenho de blocos ligados: gatilho → condições com saídas **sim/não** → ações. Substituiu o formulário Quando/Se/Então da primeira versão da spec (29/09). O Luan pediu um fluxo "bem livre". |
| **Limites da fase 1** | Cada saída leva a um bloco só (sem caminhos em paralelo). Vários caminhos podem chegar ao mesmo bloco. Laços são recusados. O "ou" se monta ligando o "não" de uma condição a outra condição. |
| **Biblioteca do canvas** | React Flow (`@xyflow/react` 12, licença MIT). |
| **Branch e merge** | Tudo no `b11-automacoes-v2`, com **um merge só no fim**, depois que o Luan testar o motor e o editor no preview. O merge por etapas foi descartado. |
| **Banco** | O Supabase é um só (produção = desenvolvimento). As migrations da B11 **só acrescentam**. A limpeza da estrutura antiga é depois do merge. |

---

## 3. O que foi feito

| Commit | O quê |
|---|---|
| `5c0bb17` | Spec `spec-automacoes-v2.md` e issues B11-01 a B11-09 reescritas para o fluxo de blocos. Registro de decisões em `decisoes/B11-automacoes-em-fluxo.md`. |
| `bcae342` | **B11-01: protótipo** da lista nova e do editor de fluxo, em `/configuracoes/automacoes/prototipo` (fora do menu, só admin, dados fixos, nada gravado). |
| `8b52909`, `f72b09a` | Commits vazios, só para a Vercel gerar o preview de novo depois do ajuste das variáveis. |

**Arquivos da B11-01:**

- `src/lib/fluxo-automacao.ts`: formato do fluxo e regras puras (laço, blocos
  soltos, pendências, aviso de repetição). O motor (B11-02) e o servidor
  (B11-05) importam daqui.
- `src/app/(auth)/configuracoes/automacoes/components/`: editor, blocos, painel,
  menu de novo bloco, lista, catálogo e frases. **Ficam e são reaproveitados**
  pela B11-05.
- `src/app/(auth)/configuracoes/automacoes/prototipo/`: rota temporária e dados
  de exemplo. **A B11-05 apaga.**

**Verificação:** build com código de saída 0, lint limpo nos arquivos da issue, e
33 cenários percorridos com o Playwright, todos passando. O detalhe está na seção
"Execução" da issue B11-01.

---

## 4. Preview na Vercel: o que aconteceu e como ficou

- O primeiro preview deu `500 MIDDLEWARE_INVOCATION_FAILED`. O log mostrou
  "Your project's URL and Key are required to create a Supabase client!".
- **Causa:** o projeto `crm-exponencial` na Vercel não tinha nenhuma variável
  de ambiente própria. A produção funciona porque recebe as variáveis de outro
  lugar, provavelmente variáveis compartilhadas do time ligadas só a Production.
  Isso não foi confirmado.
- **Correção:** o Luan adicionou ao projeto `NEXT_PUBLIC_SUPABASE_URL`,
  `NEXT_PUBLIC_SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY`, marcadas para
  **Preview**. Depois disso o preview funcionou.
- Cada envio para o branch gera um endereço novo
  (`crm-exponencial-<hash>-atacadoexponencial-8267s-projects.vercel.app`). O
  endereço fixo do branch foi encurtado pela Vercel e só aparece no painel.
- Os previews pedem login na Vercel (Deployment Protection). Para alguém sem
  conta testar, use o botão **Share** do deploy.
- A raiz `/` do site ainda é a página de exemplo do Next (`src/app/page.tsx`,
  nunca trocada). Não é erro do preview.

---

## 5. Problemas encontrados fora da B11 (não mexidos)

1. **Acentos quebrados no funil de Expansão:** `src/app/(auth)/pipeline/mock-pipeline.ts`
   está com a codificação quebrada desde o commit `507232c` (12/06/2026). "Em
   Qualificação", "Catálogo Enviado" e "Em Negociação" aparecem como "Em
   QualificaÃ§Ã£o" etc. no funil, no painel do card, na tela atual de automações
   e no protótipo.
2. **Menus que talvez não respondam ao clique:** os 11 `DropdownMenuItem` do app
   usam `onSelect`, mas o menu do Base UI só dispara `onClick`. Pelo código,
   "Editar" e "Excluir" da tela atual de automações não devem funcionar. Falta
   confirmar clicando.
3. **`npm run test` mexe no banco real:** os testes de integração criam usuários
   no Supabase de produção (e os apagam no fim). Rodado inteiro, bate no limite
   de login do Auth: foram 27 falhas, nenhuma ligada à B11. `qr-code-conectado`
   procura um texto que a tela não tem mais.
4. **`npm run lint` do repositório:** 528 erros. 285 vêm de
   `.claude/worktrees/b1-provider/`, uma cópia antiga do projeto que o lint
   varre.

---

## 6. Próximo passo: B11-02 (motor e banco)

O que a issue pede (`issues/B11-02-motor-com-condicoes-e-varias-acoes.md`):

- Migration **só de acréscimo** com o fluxo (blocos + ligações), convertendo cada
  regra atual em "gatilho → ação". As colunas antigas de `automations` ficam
  intactas.
- Motor novo em `src/lib/automacoes.ts`, que percorre o fluxo a partir do
  gatilho. Mantém a assinatura de `processarAutomacoes`, para os três pontos que
  chamam o motor não mudarem: pipeline, webhook da Meta e recebimento do gateway.
- Verificações desta etapa: canal, etiqueta, atendente, funil e etapa. Ações
  desta etapa: as 4 que já existem.
- Testes: condição com sim e com não, ação que falha no meio, caminhos que se
  juntam, saída sem ligação e laço recusado.

**Pontos em aberto para decidir no plano da B11-02:**

- **Regras alteradas em produção depois da migration.** Até o merge, a produção
  continua usando a tela antiga e as colunas antigas. Se alguém criar ou editar
  uma regra lá nesse meio-tempo, o fluxo convertido fica desatualizado. No
  merge, é preciso converter de novo, ou converter só no momento do merge.
- **Onde guardar o fluxo:** colunas `jsonb` em `automations` ou tabelas próprias
  de blocos e ligações. Isso afeta o histórico da B11-03, que precisa apontar
  para blocos.
- **Testar no preview:** usar um contato de teste (seu próprio número), porque
  as ações acontecem de verdade.
