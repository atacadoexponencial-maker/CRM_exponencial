# B63-02: Tela de Permissões

**Tipo:** Implementação
**Página:** Configurações › Permissões
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-permissoes-por-cargo.md`

## Descrição

Tela nova em Configurações, só do Admin, em que ele escolhe o que Atendente e Gerente
veem ("Só os atribuídos a ele", "Os dele e os sem dono", "Todos da empresa") e salva.
O Admin aparece numa linha fixa, "Vê tudo da empresa". Depende da B63-01.

## Pronto quando

O Admin abre Configurações › Permissões, vê a opção atual de cada cargo, muda, salva,
e a atendente passa a ver o que ele escolheu. Gerente e Atendente não veem nem salvam
a tela.

## Critérios de aceite

- **CA-B63-01** (automática) — O Admin vê a tela de Permissões com a opção atual de cada cargo. Dado uma empresa com Atendente em "Os dele e os sem dono" e Gerente em "Todos da empresa", quando o Admin abre Configurações › Permissões, então a tela mostra os blocos Atendente e Gerente com essas opções marcadas, e a linha do Admin com "Vê tudo da empresa", sem opção para mudar.
- **CA-B63-02** (automática) — Só o Admin vê e salva as permissões. Dado um Gerente e um Atendente da empresa, quando cada um tenta abrir Configurações › Permissões ou salvar uma escolha, então o item não aparece no menu deles, a tela não abre, e a tentativa de salvar é recusada, sem mudar a escolha guardada.
- **CA-B63-03** (automática) — Salvar muda o que o cargo vê. Dado o Atendente em "Os dele e os sem dono" e uma conversa sem dono na empresa, quando o Admin muda o Atendente para "Só os atribuídos a ele" e salva, então a tela confirma que salvou, e o atendente, ao recarregar o Chat, não vê mais essa conversa.
- **CA-B63-04** (automática) — A escolha de uma empresa não muda outra. Dado duas empresas, a A com Atendente em "Todos da empresa" e a B com Atendente em "Só os atribuídos a ele", quando o Admin da A salva uma mudança, então o atendente da B continua vendo só o que é dele.
- **CA-B63-05** (automática) — Empresa nova nasce com o Atendente fechado na carteira. Dado uma empresa recém-cadastrada, quando o Admin abre a tela de Permissões, então o Atendente está em "Só os atribuídos a ele" e o Gerente em "Todos da empresa".
- **CA-B63-06** (automática) — A tela explica o efeito de "Só os atribuídos a ele". Dado a tela de Permissões aberta, quando o Admin marca "Só os atribuídos a ele" num cargo, então o bloco mostra o aviso de que o lead novo sem dono só aparece para quem vê os sem dono, sugerindo a automação "Atribuir ao time".

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B63-01 | A permissão é por cargo, não por pessoa. | confirmada | Luan, 19/11/2026 |
| SUP-B63-04 | O Admin sempre vê tudo da empresa; a tela não deixa restringir o Admin. | confirmada | Luan, 19/11/2026 |
| SUP-B63-07 | A troca da fila aberta como padrão substitui a decisão da Marcelle de 27/10/2026 (PER-B45-04); a fila aberta fica como opção na tela. | confirmada | Luan, 19/11/2026 |
| SUP-B63-08 | O texto curto das outras duas opções (a spec só escreve o de "Só os atribuídos a ele"): "Os dele e os sem dono" → "Vê também o lead novo que ainda não tem dono, e quem responde primeiro vira o dono."; "Todos da empresa" → "Vê e atende tudo da empresa, mas só o Admin e o Gerente trocam o dono." Uma escolha só para os dois cargos, um botão Salvar. | confirmada | Luan, 19/11/2026 |

## Perguntas em aberto

Nenhuma.

## Cenários

### Happy Path
1. O Admin clica em Configurações › Permissões no menu.
2. A página confere no servidor que é Admin e lê a escolha da empresa (`workspaces.alcance_atendente` e `alcance_gerente`).
3. A tela mostra o bloco Atendente e o bloco Gerente, cada um com as três opções e a atual marcada, e a linha fixa "Admin — Vê tudo da empresa".
4. Cada bloco mostra o texto curto da opção marcada; em "Só os atribuídos a ele", o aviso do lead novo sem dono e da automação "Atribuir ao time".
5. O Admin muda uma opção e clica em Salvar; a action confere de novo que é Admin, valida as duas opções e grava na empresa dele pela chave de serviço (`workspaces` não tem política de update, como o fuso da B48-14).
6. A tela avisa "Permissões salvas"; quem tem o cargo passa a ver a escolha nova na próxima carga da tela (as políticas da B63-01 leem a escolha no banco).

### Edge Cases
- Nada mudou: o Salvar fica desligado.
- Sair sem salvar: nada é gravado.
- Gerente ou Atendente pelo endereço: a página manda para `/perfil?motivo=sem-permissao`; o item não aparece no menu.
- Empresa nova: a coluna nasce com o padrão (Atendente "atribuidos", Gerente "todos").

### Cenário de Erro
- Gerente ou Atendente chamando a action direto: "Sem permissão", nada é gravado.
- Valor fora das três opções: "Escolha uma das opções.", nada é gravado.
- Falha ao gravar: "Não foi possível salvar as permissões. Tente novamente.", e a tela continua com a escolha marcada.

## Prova

| Critério | Prova | Onde | O que confere |
|---|---|---|---|
| CA-B63-01 | automática | `src/test/permissoes-tela.test.tsx` | o Admin abre a página e vê Atendente em "Os dele e os sem dono" e Gerente em "Todos da empresa" marcados, e a linha do Admin "Vê tudo da empresa" sem opção |
| CA-B63-01 | automática | `src/test/permissoes-por-cargo.integration.test.ts` | a leitura da tela traz do banco a escolha gravada da empresa |
| CA-B63-02 | automática | `src/test/permissoes-tela.test.tsx` | o item "Permissões" não aparece no menu do Gerente nem do Atendente, e a página os manda para "sem permissão" |
| CA-B63-02 | automática | `src/test/permissoes-por-cargo.integration.test.ts` | salvar como Gerente e como Atendente é recusado e a escolha guardada não muda |
| CA-B63-03 | automática | `src/test/permissoes-tela.test.tsx` | marcar outra opção e Salvar chama a action com a escolha nova e mostra "Permissões salvas" |
| CA-B63-03 | automática | `src/test/permissoes-por-cargo.integration.test.ts` | depois de o Admin salvar "atribuidos", a atendente não vê mais a conversa sem dono no Chat |
| CA-B63-04 | automática | `src/test/permissoes-por-cargo.integration.test.ts` | o Admin da empresa A salva e o atendente da B continua sem ver o que não é dele |
| CA-B63-05 | automática | `src/test/permissoes-por-cargo.integration.test.ts` | uma empresa recém-criada abre a tela com Atendente em "atribuidos" e Gerente em "todos" |
| CA-B63-06 | automática | `src/test/permissoes-tela.test.tsx` | marcar "Só os atribuídos a ele" no Gerente mostra no bloco dele o aviso do lead sem dono e de "Atribuir ao time" |

## Arquivos

- **Criar:** `src/app/(auth)/configuracoes/permissoes/actions.ts` — `carregarPermissoes()` e `salvarPermissoes()`, só do Admin, com a validação pelas `ALCANCES` de `src/lib/alcance.ts`
- **Criar:** `src/app/(auth)/configuracoes/permissoes/page.tsx` — confere o Admin, lê a escolha e entrega à tela (como `configuracoes/empresa/page.tsx`)
- **Criar:** `src/app/(auth)/configuracoes/permissoes/permissoes-client.tsx` — os dois blocos, a linha do Admin, o texto da opção marcada e o Salvar
- **Criar:** `src/app/(auth)/configuracoes/permissoes/loading.tsx` — `EsqueletoPagina`, como as outras telas de Configurações
- **Criar:** `src/test/permissoes-tela.test.tsx` — CA-B63-01, 02, 03 e 06 pela tela
- **Modificar:** `src/components/shared/sidebar-nav.tsx` — item "Permissões" em Configurações, só para o Admin
- **Modificar:** `src/test/menu-lateral.test.tsx` — o menu do Admin ganha "Permissões" (L-05)
- **Modificar:** `src/test/permissoes-por-cargo.integration.test.ts` — CA-B63-01 a 05 pelo servidor

## Checklist

- [x] Actions `carregarPermissoes` e `salvarPermissoes`
- [x] Página, tela e esqueleto de carregamento
- [x] Item no menu e ajuste do teste do menu
- [x] Testes de tela e de integração
- [x] Rodar os testes que renderizam o menu lateral (L-05)
- [x] `npx tsc --noEmit` e lint
