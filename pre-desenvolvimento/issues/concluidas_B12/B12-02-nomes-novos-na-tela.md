# B12-02: Entrada e Recompra em tudo o que o usuário lê

**Tipo:** Implementação
**Página:** Pipeline, Perfil do contato, Dashboard, Alertas, Automações, Sequências
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-renomear-funis.md` — padrão de escrita e as seções de cada página

## Descrição

Trocar todo texto visível "Expansão" → "Entrada" e "Retenção" → "Recompra", seguindo o
padrão de escrita da spec ("Entrada"/"Recompra" sozinhos; "Funil de Entrada"/"Funil de
Recompra"; minúsculo no meio de frase). Só texto: o nome interno (`expansao`/
`retencao`), o endereço `/pipeline/retencao` e os nomes no código continuam como estão
— mudam na B12-04.

Lugares conhecidos: abas dos dois funis, painel do card, perfil do contato (bloco de
cards e linha do tempo), seção "Retenção" do dashboard, descrição e escolha de funil nas
automações, opções de gatilho no editor de sequência, mensagens de erro do pipeline e
qualquer texto de alerta que cite o funil. Fica de fora a seção "4. Retenção de dados"
da Política de Privacidade (termo jurídico) e a seção "Entrada de Leads" do dashboard
(já está certa).

## Pronto quando

No CRM publicado, navegando por Pipeline (as duas abas), um card aberto, o perfil de um
contato com card, o Dashboard, Alertas, Automações e o editor de Sequência, nenhum texto
diz "Expansão" ou "Retenção" referindo-se a funil — e tudo continua funcionando igual,
inclusive os números do dashboard. A Política de Privacidade continua com "Retenção de
dados".

## Cenários

### Happy Path
1. Pipeline: as abas dos dois funis dizem "Entrada" e "Recompra" (nos dois quadros).
2. Card aberto: o painel mostra o funil como "Entrada" ou "Recompra".
3. Perfil do contato: o bloco de cards diz "Funil de Entrada: <etapa>" / "Funil de
   Recompra: <etapa>"; a linha do tempo diz "Card criado no Funil de Entrada — etapa: …".
4. Dashboard: a seção que dizia "Retenção" diz "Recompra"; os números não mudam.
5. Automações: a descrição de cada regra cita "Entrada"/"Recompra"; o seletor de funil
   (gatilho e ação) oferece "Funil de Entrada" e "Funil de Recompra".
6. Sequências: as opções de gatilho dizem "card criado em Lead (Entrada)" e "card criado
   em Onboarding (Recompra)".

### Edge Cases
- Os `value` dos seletores de automação continuam `expansao`/`retencao` nesta issue — só
  o texto da opção muda. A troca do valor é da B12-04.
- Eventos antigos da linha do tempo também aparecem com o nome novo: o texto é montado
  na hora (`contatos/actions.ts`), não está gravado.
- Política de Privacidade ("4. Retenção de dados") **não** é tocada.
- Nomes de times ("Expansão"/"Retenção" no banco e no cadastro) são da B12-03.
- Nomes no código (tipos, funções, componentes, pasta `retencao/`) e comentários de
  `src/lib/` são da B12-04.

### Cenário de Erro
- Falha ao carregar o funil de recompra: a mensagem passa a ser "Erro ao carregar cards
  do funil de recompra".

## Banco de Dados

Não se aplica.

## Arquivos

Levantamento de 02/10 (todas as ocorrências de texto visível fora de `src/test/`):

- **Modificar:** `src/app/(auth)/pipeline/components/funil-expansao.tsx` — abas (l. 65, 71).
- **Modificar:** `src/app/(auth)/pipeline/components/funil-retencao.tsx` — abas (l. 77, 80).
- **Modificar:** `src/app/(auth)/pipeline/components/painel-card.tsx` — `funilLabel` (l. 51).
- **Modificar:** `src/app/(auth)/pipeline/actions.ts` — mensagem de erro (l. 375).
- **Modificar:** `src/app/(auth)/contatos/actions.ts` — `funilLabel` da linha do tempo (l. 222).
- **Modificar:** `src/app/(auth)/contatos/mock-contatos.ts` — descrições de exemplo (l. 236, 258).
- **Modificar:** `src/app/(auth)/contatos/[id]/components/perfil-contato.tsx` — "Funil de …" (l. 466).
- **Modificar:** `src/app/(auth)/dashboard/components/secoes-metricas.tsx` — título e comentário da seção (l. 37, 39).
- **Modificar:** `src/app/(auth)/configuracoes/automacoes/automacoes-client.tsx` — descrição (l. 69, 88) e opções dos seletores (l. 337–338, 427–428).
- **Modificar:** `src/app/(auth)/sequencias/[id]/editor-client.tsx` — opções de gatilho (l. 21, 23).

Nenhum teste confere esses textos (o único `getByText("Expansão")`, em
`e2e/modulo-0.spec.ts:28-29`, é do nome do time — B12-03).

## Dependências Externas

Nenhuma.

## Checklist

- [x] Abas dos dois funis
- [x] Painel do card
- [x] Mensagem de erro do funil de recompra
- [x] Linha do tempo e bloco de cards do perfil do contato (+ dados de exemplo)
- [x] Seção do dashboard
- [x] Descrição e seletores das automações
- [x] Opções de gatilho das sequências
- [x] Busca: nenhum "Expansão"/"Retenção" visível fora de times, privacidade e nomes de código
- [x] `npx tsc --noEmit` e `npm run lint` sem erro novo (3 avisos já existentes em arquivos de usuários/WhatsApp)
- [x] Testes: não há plano de testes da série B12; nenhum teste confere estes textos
