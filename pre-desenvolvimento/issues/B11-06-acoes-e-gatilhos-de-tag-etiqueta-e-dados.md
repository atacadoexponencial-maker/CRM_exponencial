# B11-06: Tags, etiquetas e dados do contato como gatilho, condição e ação

**Tipo:** Implementação
**Página:** Motor; Editor de regra
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-automacoes-v2.md`
**Depende de:** B11-05

## Descrição

Entram os gatilhos "tag adicionada ao contato", "etiqueta aplicada à conversa"
e "dado do contato alterado" (campo e valor opcional); as condições de contato
(tem/não tem tag, classificação é/não é, tipo é/não é); e as ações adicionar e
remover tag, aplicar e remover etiqueta, e alterar dado do contato
(classificação, tipo, nicho, cidade, acrescentar linha às observações).
Mudanças feitas por automação não disparam esses gatilhos.

Cobre os itens correspondentes do "Editor" e do "Motor".

## Pronto quando

No CRM publicado, a regra "tag vip adicionada → classificação = ativo, aplicar
etiqueta VIP, enviar mensagem" roda ao adicionar a tag pela tela de contato, e
a etiqueta aplicada por ela não dispara uma regra de "etiqueta aplicada".
