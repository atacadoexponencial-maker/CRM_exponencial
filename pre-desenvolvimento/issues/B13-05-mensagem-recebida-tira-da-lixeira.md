# B13-05: Mensagem recebida ou cadastro com o mesmo telefone tira o contato da lixeira

**Tipo:** Implementação
**Página:** Chat (recebimento pela API Oficial e pelo canal direto)
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-lixeira-contatos.md`

## Descrição

Quando chega mensagem de um telefone cujo contato está na lixeira — pelo webhook da API
Oficial ou pelo canal direto (gateway) —, o contato é restaurado sozinho (mesmo efeito
do "Restaurar" da B13-04) e a mensagem entra na conversa como qualquer mensagem
recebida. O mesmo vale ao criar lead ("Novo lead" no pipeline) ou contato (Contatos) com
o telefone de quem está na lixeira: o contato é restaurado e o lead novo entra ligado a
ele (decisão da Marcelle no `/plan` da B13-02). Nenhuma mensagem de cliente se perde nem
cria contato duplicado.

**Push:** a série só vai ao ar ao fim desta issue — antes dela, mensagem de contato na
lixeira cairia numa conversa escondida.

Depende de B13-04.

## Pronto quando

Com o chip de teste: excluir um contato, mandar mensagem do celular dele, e a conversa
aparece na caixa de entrada com o histórico antigo e a mensagem nova; o contato sai da
lixeira e volta ao funil. E criar "Novo lead" com o telefone de um contato na lixeira o
traz de volta, com o card novo no funil.
