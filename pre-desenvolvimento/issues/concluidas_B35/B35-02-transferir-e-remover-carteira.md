# B35-02: Transferir e remover carteira

**Tipo:** Implementação
**Página:** Relatórios (`/relatorios`), aba Carteiras
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-relatorios-carteiras.md`

## Descrição

Os botões Transferir carteira (diálogo com o vendedor de destino e confirmação com a contagem) e Remover da carteira (confirmação) em cada cartão de vendedor. As ações, no servidor, mudam o atendente do contato e dos cards dele, gravam no histórico e são recusadas para Atendente. Depende da B35-01.

## Pronto quando

Na empresa de teste, transferir a carteira de um usuário para outro move os contatos e os cards, atualiza os números e grava no histórico; remover deixa os contatos sem vendedor; fechar o diálogo sem confirmar não muda nada; logada como Atendente, não há botões.

## Critérios de aceite

- **CA-B35-04** (automática) — Atendente vê só a própria carteira, sem botões. Dado a Ana com papel Atendente, quando ela abre a aba Carteiras, então vê só o cartão dela, sem Transferir, Remover, Distribuir, Reprocessar nem histórico; e as ações chamadas por ela no servidor são recusadas com "Sem permissão".
- **CA-B35-05** (automática) — Transferir a carteira inteira. Dado a Ana com 3 contatos (um deles com card na Recompra) e o Bruno com 1, quando o Admin transfere a carteira da Ana para o Bruno e confirma, então os 3 contatos e o card passam a ter o Bruno como atendente, a Ana fica com 0 e o Bruno com 4, e o histórico ganha 3 linhas "Ana → Bruno · transferência · Admin".
- **CA-B35-06** (automática) — Remover a carteira. Dado a Ana com 3 contatos, quando o Admin remove a carteira dela e confirma, então os 3 contatos e os cards deles ficam sem atendente, "Sem vendedor" sobe em 3 e o histórico ganha 3 linhas "Ana → ninguém · remoção".
- **CA-B35-07** (automática) — Confirmação antes da ação em massa. Dado o diálogo de transferir aberto, quando o Admin fecha sem confirmar, então nada muda e nada é gravado no histórico.

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B35-02 | Transferir, remover, distribuir e reprocessar mexem no atendente do contato e dos cards dele; a conversa aberta fica com quem está atendendo. | confirmada | Marcelle, 21/10/2026 |

## Perguntas em aberto

Nenhuma.

## Cenários

### Happy Path
1. No cartão de cada vendedor, "Transferir carteira" abre o diálogo com a lista dos outros vendedores; escolhido o destino, aparece "Transferir N contatos de X para Y?" e o Confirmar chama `transferirCarteira(de, para)`.
2. No servidor: Admin ou Gerente; destino da mesma empresa; contatos fora da lixeira com atendente = X recebem atendente = Y, os cards desses contatos também, e o histórico ganha uma linha por contato com motivo "transferência" e quem fez.
3. "Remover da carteira" confirma "Deixar N contatos de X sem vendedor?" e chama `removerCarteira(de)`: contatos e cards ficam sem atendente; histórico com "remoção".
4. Depois da ação, a aba recarrega os números e o histórico.

### Edge Cases
- Carteira vazia: botões desabilitados no Confirmar (nada a fazer).
- Fechar o diálogo (Cancelar ou fora) não chama a ação.
- Atendente: não vê os botões; se chamar a ação, recebe "Sem permissão".
- Destino inexistente ou de outra empresa: "Vendedor não encontrado".

### Cenário de Erro
- Falha no banco: o diálogo mostra "Não foi possível transferir/remover. Tente novamente." e fica aberto.

## Prova

| Critério | Prova | Onde | O que confere |
|---|---|---|---|
| CA-B35-04 | automática | `src/test/relatorios-carteiras-acoes.integration.test.ts` | Atendente recebe "Sem permissão" em `transferirCarteira` e `removerCarteira`; na tela, o painel do Atendente não tem os botões (`relatorios-carteiras-acoes.test.tsx`) |
| CA-B35-05 | automática | `src/test/relatorios-carteiras-acoes.integration.test.ts` | Ana 3 → Bruno: contatos e card com Bruno, Ana 0, Bruno 4, 3 linhas "Ana → Bruno · transferência · Admin" |
| CA-B35-06 | automática | `src/test/relatorios-carteiras-acoes.integration.test.ts` | Remover: contatos e cards sem atendente, sem-vendedor sobe 3, 3 linhas "Ana → ninguém · remoção" |
| CA-B35-07 | automática | `src/test/relatorios-carteiras-acoes.test.tsx` | Abrir o diálogo, escolher destino e cancelar: a ação não é chamada |

## Banco de Dados

Não se aplica (usa `carteira_historico` da B35-01).

## Arquivos

- **Modificar:** `src/app/(auth)/relatorios/actions.ts` — `transferirCarteira` e `removerCarteira`.
- **Criar:** `src/app/(auth)/relatorios/components/acoes-carteira.tsx` — os dois diálogos.
- **Modificar:** `src/app/(auth)/relatorios/components/carteiras-client.tsx` — botões no cartão do vendedor (só gestor) e recarga depois da ação.
- **Criar:** `src/test/relatorios-carteiras-acoes.test.tsx` — CA-B35-07 e a parte de tela do CA-B35-04.
- **Criar:** `src/test/relatorios-carteiras-acoes.integration.test.ts` — CA-B35-04, 05 e 06.

## Dependências Externas

Nenhuma.

## Checklist

- [x] Ações de transferir e remover no servidor, com histórico e sincronia dos cards
- [x] Diálogos com confirmação e recarga
- [x] Testes passando
