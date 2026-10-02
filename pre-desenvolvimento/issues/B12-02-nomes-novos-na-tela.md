# B12-02: Entrada e Recompra em tudo o que o usuário lê

**Tipo:** Implementação
**Página:** Pipeline, Perfil do contato, Dashboard, Alertas, Automações, Sequências
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-renomear-funis.md` — padrão de escrita e as seções de cada página

## Descrição

Trocar todo texto visível "Expansão" → "Entrada" e "Retenção" → "Recompra", seguindo o
padrão de escrita da spec ("Entrada"/"Recompra" sozinhos; "Funil de Entrada"/"Funil de
Recompra"; minúsculo no meio de frase). Só texto: o nome interno (`expansao`/
`retencao`), o endereço `/pipeline/retencao` e os nomes no código continuam como estão
— mudam na B12-04.

Lugares conhecidos: abas dos dois funis, painel do card, perfil do contato (bloco de
cards e linha do tempo), seção "Retenção" do dashboard, descrição e escolha de funil nas
automações, opções de gatilho no editor de sequência, mensagens de erro do pipeline e
qualquer texto de alerta que cite o funil. Fica de fora a seção "4. Retenção de dados"
da Política de Privacidade (termo jurídico) e a seção "Entrada de Leads" do dashboard
(já está certa).

## Pronto quando

No CRM publicado, navegando por Pipeline (as duas abas), um card aberto, o perfil de um
contato com card, o Dashboard, Alertas, Automações e o editor de Sequência, nenhum texto
diz "Expansão" ou "Retenção" referindo-se a funil — e tudo continua funcionando igual,
inclusive os números do dashboard. A Política de Privacidade continua com "Retenção de
dados".
