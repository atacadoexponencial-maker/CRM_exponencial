# B11-01: Protótipo do editor de fluxo e da lista de regras

**Tipo:** Protótipo
**Página:** Configurações → Automações (lista e editor de fluxo)
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-automacoes-v2.md`
**Decisões:** `pre-desenvolvimento/decisoes/B11-automacoes-em-fluxo.md`
**Depende de:** nada

## Descrição

Desenhar, com dados fixos e sem gravar nada, a lista de regras nova (resumo em
uma frase, interruptor, contagem de execuções) e o editor de fluxo: o canvas
com os blocos de gatilho, condição (saídas sim e não) e ação ligados por setas,
o "+" nas saídas livres, o painel do bloco selecionado, a proteção de repetição
e o botão "Testar com um contato". Todos os gatilhos, verificações e ações da
spec aparecem nos seletores, mesmo os que só entram em issues posteriores.

Cobre a forma de "Configurações → Automações (lista)" e "Editor de fluxo".

## Pronto quando

Uma rota temporária, fora do menu, mostra a lista e o editor com uma regra de
exemplo que se divide: "mensagem recebida → se contém 'catálogo': aplicar
etiqueta Interessado e enviar o catálogo; se não: se está fora do horário
comercial, enviar mensagem de ausência". Na tela dá para adicionar, ligar,
religar e remover blocos, configurar cada um no painel e simular o caminho de
um contato. O Luan e a Marcelle aprovam a forma. A rota sai do repositório
quando a B11-05 ligar o editor real; os componentes do editor ficam e são
reaproveitados por ela.
