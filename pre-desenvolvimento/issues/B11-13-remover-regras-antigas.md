# B11-13: Remover as regras antigas (tabela `automations`)

**Tipo:** Implementação
**Página:** Configurações → Automações (lista e editor), motor de automações
**Repositório:** `crm-exponencial`, branch `b11-13-remover-regras-antigas`
**Spec:** `docs/specs-arquivadas/spec-automacoes-v2.md`
**Decisões:** `pre-desenvolvimento/decisoes/B11-automacoes-em-fluxo.md` (seções 4, 5.2 e 6.1)
**Depende de:** o merge da B11 no `master` (feito em 08/10/2026, 75513a6)

## Descrição

A B11 trocou o motor de automações, mas manteve uma camada para as regras da
primeira versão (tabela `automations`, um gatilho e uma ação). O motor lê essas
regras e monta na hora um fluxo de dois blocos. A lista as mostra como "versão
antiga". Salvar uma no editor cria a versão em fluxo, que guarda o `id` da
antiga em `automation_flows.automation_id`. Era necessário enquanto a produção
ainda editava a tabela antiga.

Depois do merge, a limpeza prevista era copiar as regras antigas para
`automation_flows` e apagar a estrutura antiga (decisões, seções 4, 5.2 e 6.1).
Em 08/10/2026, o banco de produção tinha uma regra antiga só, a da empresa de
teste ("Regra antiga: follow do catálogo"). Nenhuma regra nova estava ligada a
uma antiga, e o histórico não tinha execução de regra antiga. Então não há o
que copiar: a camada sai inteira, e a tabela sai depois dela.

A issue tem duas partes, nesta ordem:

1. **Código:** o motor, a tela, os testes e os roteiros param de usar a tabela
   antiga. Entra na produção por merge.
2. **Banco:** só depois de a parte 1 estar no ar, uma migration apaga
   `automation_flows.automation_id` e a tabela `automations`. É a primeira
   migration da B11 que apaga em vez de acrescentar, e não tem volta. Roda com o
   ok do Luan.

Na ordem inversa, a produção ainda leria uma tabela que não existe mais, e a
tela de automações daria erro.

## Pronto quando

- **Parte 1:** no preview, a lista de automações mostra só as regras em fluxo, e
  nenhuma consulta do motor, da tela ou dos roteiros lê `automations`. A suíte
  unitária, o build e os roteiros do preview passam.
- **Parte 2:** depois do merge e com a produção conferida, a migration roda. A
  tabela e a coluna somem do banco, os tipos do Supabase são gerados de novo, e
  a tela de automações da produção continua abrindo e salvando.

## Plano (08/10/2026)

### Decisões do plano

- **Nada a copiar.** A cópia para `automation_flows` prevista na limpeza
  (decisões, seções 5.2 e 6.1) servia às empresas com regra antiga. Não há
  nenhuma: a única linha de `automations` é a regra que a empresa de teste usa
  para testar exatamente esta camada.
- **`automation_runs.regra_origem` fica,** sempre com `'fluxo'`. A coluna é
  `not null`, então o código precisa continuar gravando o valor até ela sair. Se
  ela saísse, seria uma terceira etapa, com código depois da migration, para
  tirar uma coluna que não atrapalha. O `check` continua aceitando `'antiga'`,
  que não aparece mais.
- **Endereço antigo do editor** (`/configuracoes/automacoes/nova?antiga=<id>`):
  o `antiga` passa a ser ignorado e abre uma regra em branco, como `nova`. Só a
  lista criava esse endereço.
- **O roteiro da B11-10 passa a provar a ausência.** Durante a parte 1, a regra
  antiga da empresa de teste continua no banco. A lista não pode mostrá-la, e
  mover a Carla para Follow do Catálogo não pode atribuir o card. Depois da
  parte 2, a verificação continua valendo.

### Cenários

#### Happy Path

1. O admin abre Configurações → Automações. A lista mostra só as regras em
   fluxo, sem o selo "Versão antiga · continua rodando".
2. Editar, duplicar, pausar e excluir funcionam como antes. Excluir não fala
   mais em "a versão antiga volta a rodar".
3. Um card movido, uma tag ou uma mensagem disparam só as regras de
   `automation_flows`. O histórico grava a execução com `regra_origem` `'fluxo'`.
4. Depois do merge e com a produção conferida, a migration apaga a coluna
   `automation_flows.automation_id` e a tabela `automations`. A tela continua
   abrindo, salvando e rodando as regras.

#### Edge Cases

- **Linha que sobrou em `automations` durante a parte 1** (a regra da empresa de
  teste): o motor e a tela não a leem, e ela não roda.
- **Regra em fluxo com `automation_id` preenchido:** hoje não há nenhuma. Se
  houvesse, ela seria uma regra comum. A coluna some na parte 2.
- **Histórico com execução de regra antiga:** hoje não há nenhuma. Se houvesse,
  ela apareceria como "(excluída)", porque a regra não está em `automation_flows`.
- **Endereço `nova?antiga=<id>` salvo nos favoritos:** abre uma regra nova em
  branco.

#### Cenário de Erro

- **Migration antes de o código chegar à produção:** a produção ainda leria
  `automations`. A lista de automações quebraria, e o motor perderia a consulta
  das regras antigas, sem derrubar as outras. Por isso a parte 2 só roda depois
  de conferir o deploy de produção do merge, e com o roteiro da B11-10 passando
  na produção.
- **Migration falha no meio:** o `db push` aplica cada migration numa transação,
  e nada muda. Antes dele, o `supabase migration list --linked` precisa mostrar
  só esta migration pendente.

### Banco

- **Parte 1:** nada.
- **Parte 2:** nova migration `supabase/migrations/20261008000000_remover_regras_antigas.sql`:
  - `alter table public.automation_flows drop column automation_id`. Ela vem
    antes, porque é a chave estrangeira que aponta para a tabela antiga.
  - `drop table public.automations`. As policies saem junto.
  - Nenhuma função, trigger ou view usa `automations`. As migrations da B12, da
    B14 e da B15 só atualizaram dados dela e já foram aplicadas.

### Arquivos

**Parte 1 (código):**

- **Apagar:** `src/lib/automacoes/regra-antiga.ts`. É a conversão de regra
  antiga em fluxo.
- **Modificar:** `src/lib/automacoes/index.ts`. `carregarRegras` lê só
  `automation_flows`, e o comentário do topo deixa de falar em duas tabelas.
- **Modificar:** `src/lib/automacoes/execucoes.ts`. `RegraDaExecucao` perde
  `origem`, e `registrarExecucao` grava `regra_origem: "fluxo"`.
- **Modificar:** `src/app/(auth)/configuracoes/automacoes/actions.ts`:
  - `listarRegras` lê só `automation_flows`;
  - `buscarRegraParaEditor(id)` perde o `antigaId`;
  - `salvarRegra` perde o `automationId`;
  - `duplicarRegra(id)` perde o `versaoAntiga`;
  - `listarExecucoes` considera excluída a regra que não está em
    `automation_flows`;
  - saem `RegraDoEditor.automationId`, `REPETICAO_DA_REGRA_ANTIGA` e o
    comentário do topo sobre regras antigas.
- **Modificar:** `src/app/(auth)/configuracoes/automacoes/components/lista-regras.tsx`.
  Saem `versaoAntiga` e `substituiAntiga`: o selo, o interruptor desligado, a
  dica do interruptor, o "Excluir" escondido e o aviso no diálogo de excluir.
- **Modificar:** `src/app/(auth)/configuracoes/automacoes/lista-client.tsx`.
  Editar abre sempre `/configuracoes/automacoes/<id>`, e duplicar passa só o id.
- **Modificar:** `src/app/(auth)/configuracoes/automacoes/[id]/page.tsx`. Deixa de
  ler `antiga`.
- **Modificar:** `src/app/(auth)/configuracoes/automacoes/[id]/editor-client.tsx`.
  Deixa de passar `automationId`.
- **Testes:**
  - `src/test/automacoes.test.ts`:
    - os 4 primeiros testes do motor passam a ler regras de dois blocos em
      `automation_flows`;
    - os testes que misturavam regra antiga e fluxo usam dois fluxos;
    - saem os testes "regra antiga que já tem versão em fluxo" e "regra antiga
      roda sempre e é gravada como 'antiga'";
    - entra um teste de que o motor não consulta `automations`.
  - `src/test/fluxo-automacao.test.ts`: sai o `describe` de `fluxoDaRegraAntiga`.
- **Roteiros:**
  - `e2e/preview/roteiro-b11-10.cjs`: a parte da regra antiga vira a prova da
    ausência (ver Decisões do plano);
  - `e2e/preview/resetar-empresa-teste.cjs`: sai a linha que reativa a regra
    antiga, que quebraria depois da parte 2;
  - `e2e/preview/criar-empresa-teste.cjs`: deixa de criar a regra antiga;
  - `e2e/preview/README.md`: a empresa de teste sem a regra antiga, e a
    descrição do roteiro da B11-10.
- **Documentação:**
  - a seção 16 de `pre-desenvolvimento/decisoes/B11-automacoes-em-fluxo.md`;
  - `pre-desenvolvimento/README.md`: o "Ainda falta" da B11 aponta para esta
    issue.

**Parte 2 (banco):**

- **Criar:** `supabase/migrations/20261008000000_remover_regras_antigas.sql`.
- **Modificar:** `src/integrations/supabase/types.ts`, gerado de novo
  (`supabase gen types typescript --linked`), sem `automations` e sem
  `automation_flows.automation_id`.

**Reutilizar:** nada novo. `lerFluxo`, `lerRepeticao` e o resto do motor
continuam como estão.

### Checklist

**Parte 1:**

- [x] Motor lê só `automation_flows`, e `regra-antiga.ts` apagado
- [x] Histórico grava sempre `'fluxo'`
- [x] Actions, lista, página e cliente do editor sem regra antiga
- [x] Testes do motor reescritos sem `automations`; suíte unitária passando; lint e build com código 0
- [x] Roteiros e scripts da empresa de teste sem a regra antiga
- [ ] Roteiros do preview passando
- [x] Registro de decisões (seção 16)
- [ ] Merge no `master` (com o ok do Luan) e produção conferida

**Parte 2:**

- [ ] `supabase migration list --linked` com só esta migration pendente
- [ ] Migration aplicada (com o ok do Luan) e conferida no banco
- [ ] `types.ts` gerado de novo; build com código 0
- [ ] Roteiro da B11-10 passando na produção depois da migration
