# B12-04: Nome interno entrada/recompra e endereço /pipeline/recompra

**Tipo:** Implementação
**Página:** Pipeline (Funil de Recompra) e todo o código que usa o funil
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-renomear-funis.md` — seções "Funil de Recompra", "Troca em produção" e "Código, testes e documentação"

## Descrição

Trocar o nome interno do funil de `expansao`/`retencao` para `entrada`/`recompra` em
todas as camadas, numa entrega só (banco e código precisam mudar juntos):

- **Banco:** valor `funil` de todos os cards, a regra que só aceita os dois valores e o
  valor padrão da coluna; configurações de automação salvas que apontem para um funil.
  Hoje (02/10): 2 cards (1 em cada funil) e nenhuma automação com funil — mas a troca
  vale para o que existir no momento.
- **Endereço:** o Funil de Recompra passa para `/pipeline/recompra`; `/pipeline/retencao`
  redireciona para lá. Links internos (abas, perfil do contato) apontam para o novo.
- **Código:** funções, tipos, constantes, componentes e pastas com Expansao/Retencao no
  nome passam a Entrada/Recompra (dashboard, alertas, automações, classificação do
  contato, pipeline, mocks).
- **Testes:** unitários, integração e E2E com os valores e nomes novos.
- **Documentação viva:** `CLAUDE.md` (descrição do produto e lista de rotas) e
  `pre-desenvolvimento/testes/`.

A ordem da troca em produção tem de garantir que ninguém abra um funil vazio nem receba
erro ao criar ou mover card; o `/plan` decide a ordem e registra como voltar atrás. Se
não der para garantir, a troca entra fora do horário comercial (Brasília), com aviso da
Marcelle aos usuários.

Depende de B12-02 (textos já trocados), para que esta issue não tenha mudança visível
além do endereço.

## Pronto quando

No CRM publicado, `/pipeline/recompra` mostra o Funil de Recompra com os mesmos cards de
antes, `/pipeline/retencao` leva para lá, criar e mover card funciona nos dois funis,
dashboard, alertas, classificação do contato e automações dão os mesmos resultados de
antes, o banco só aceita `entrada` e `recompra` como funil, e uma busca por
`expansao`/`retencao` no `src/` e no `e2e/` não acha nada (fora a migration antiga).
