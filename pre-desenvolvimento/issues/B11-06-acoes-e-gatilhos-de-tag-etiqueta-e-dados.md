# B11-06: Tags, etiquetas e dados do contato como gatilho, condição e ação

**Tipo:** Implementação
**Página:** Motor; Editor de fluxo
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-automacoes-v2.md`
**Depende de:** B11-05

> **Mudança de 07/10/2026:** as ações (adicionar e remover tag, remover etiqueta,
> alterar dado do contato) e as condições de contato (tag, tipo e classificação)
> foram feitas antes, na B11-11. Ficam aqui só os gatilhos. "Aplicar etiqueta" já
> existia desde a primeira versão.

## Descrição

Entram os gatilhos "tag adicionada ao contato", "etiqueta aplicada à conversa"
e "dado do contato alterado" (campo e valor opcional). Mudanças feitas por
automação não disparam esses gatilhos, inclusive as das ações da B11-11.

Cobre os itens correspondentes do "Editor" e do "Motor".

## Pronto quando

No preview do branch `b11-automacoes-v2` (o merge no `master` é um só, no fim da
série), a regra "tag vip adicionada → tipo = Lojista, aplicar etiqueta VIP,
enviar mensagem" roda ao adicionar a tag pela tela de contato, e a etiqueta
aplicada por ela não dispara uma regra de "etiqueta aplicada".
