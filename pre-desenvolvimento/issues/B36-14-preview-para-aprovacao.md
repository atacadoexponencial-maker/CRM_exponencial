# B36-14: Preview para aprovação e regressão

**Tipo:** Implementação
**Página:** Todas
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-tema-claro-caderno.md`

## Descrição

Rodar toda a suíte de testes do sistema, preparar a empresa de teste com dados em todas as telas e publicar a série num endereço de preview para a Marcelle aprovar antes de ir para o ar.

## Pronto quando

Existe um endereço de preview com a série inteira, a empresa de teste tem conteúdo em todas as telas e todos os testes do sistema passam.

## Critérios de aceite

- **CA-B36-28** (automática) — Nenhuma função some. Dado os testes automáticos que o sistema já tem (de tela, de ponta a ponta e de regra), quando eles rodam depois da mudança, então todos passam, ajustados só no que é aparência (nome de classe, cor, posição), nunca no que conferem de comportamento.
- **CA-B36-37** (manual) — Preview com a empresa de teste pronta. Dado a mudança publicada num endereço de preview, quando a Marcelle entra com o login da empresa de teste, então todas as telas abrem com conteúdo (contatos, cards, conversas, tarefas, vendas, campanhas, sequências e automações de teste), e nada vai para o ar antes da aprovação dela.

## Suposições

Nenhuma.

## Perguntas em aberto

Nenhuma.
