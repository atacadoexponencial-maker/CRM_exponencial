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
