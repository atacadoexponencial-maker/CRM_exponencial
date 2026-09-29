# B11-01: Protótipo do editor de regra e da lista (Quando, Se, Então)

**Tipo:** Protótipo
**Página:** Configurações → Automações (lista e editor)
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-automacoes-v2.md`
**Depende de:** nada

## Descrição

Desenhar, com dados fixos e sem gravar nada, a lista de regras nova (resumo em
uma frase, interruptor, contagem de execuções) e o editor em três blocos:
Quando (gatilho e parâmetros), Se (lista de condições com atributo, operador e
valor), Então (lista ordenada de ações), mais o bloco Repetição e o botão
"Testar com um contato". Todos os gatilhos, condições e ações da spec aparecem
nos seletores, mesmo os que só entram em issues posteriores.

Cobre a forma de "Configurações → Automações (lista)" e "Editor de regra".

## Pronto quando

Rota temporária, fora do menu, mostra a lista e o editor com uma regra de
exemplo montada ("mensagem recebida contendo 'catálogo' → aplicar etiqueta,
enviar mensagem"), dá para adicionar e remover condições e ações na tela, e a
Marcelle aprova a forma. Sai do repositório quando a B11-05 ligar o editor real.
