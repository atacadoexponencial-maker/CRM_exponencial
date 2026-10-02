# B13-03: Contato na lixeira não aparece nem dispara nada no resto do sistema

**Tipo:** Implementação
**Página:** Agenda, Alertas, Sequências, Campanhas, Automações, Dashboard
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-lixeira-contatos.md`

## Descrição

Fazer o resto do sistema ignorar o que está na lixeira, conforme a spec: lembretes fora
da Agenda (e da agenda da equipe), cards fora dos Alertas, sequências em andamento do
contato encerradas ao excluir e nenhuma mensagem de sequência enviada, contato fora da
seleção e da contagem de público das Campanhas e pulado em campanha em andamento
(relatório mostra "excluído"), nenhuma automação disparada, e Dashboard e Performance
sem contar contatos e cards na lixeira.

Depende de B13-02.

## Pronto quando

No CRM publicado, depois de excluir um contato que tinha lembrete, alerta, sequência em
andamento e estava no público de uma campanha: ele não aparece na Agenda nem nos
Alertas, a sequência dele consta como encerrada, a campanha não o conta, e os números do
Dashboard caem na medida dele.
