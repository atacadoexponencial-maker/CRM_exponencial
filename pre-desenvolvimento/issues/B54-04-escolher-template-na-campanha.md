# B54-04: Tipo Template na campanha, com a lista do número escolhido

**Tipo:** Implementação
**Página:** Campanhas > editor, etapa 2
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-templates-da-meta.md`

## Descrição

Com um número da API Oficial escolhido, a etapa 2 ganha o tipo Template e lista os aprovados daquele número (sem os de autenticação). Com número do canal direto ou sem número escolhido, o tipo não aparece. Trocar o número limpa um template que não existe nele. A tela de templates e a lista na campanha abrem para o Gerente.

## Pronto quando

Admin ou Gerente escolhe um template aprovado do número da campanha, salva, e ao reabrir a campanha o template continua escolhido.

## Critérios de aceite

- **CA-B54-12** (automática) — Número do canal direto não oferece template. Dado a etapa 2 com um número do canal direto escolhido, ou com "Usar o número conectado da empresa", quando a tela mostra os tipos de mensagem, então aparecem só Texto, Imagem + legenda e Documento + legenda, com a nota "Template só existe na API Oficial".
- **CA-B54-13** (automática) — Número da API Oficial oferece o tipo Template. Dado a etapa 2 com um número da API Oficial escolhido, quando a tela mostra os tipos de mensagem, então aparece o quarto tipo, **Template**.
- **CA-B54-14** (automática) — A lista traz só os aprovados do número escolhido. Dado dois números da API Oficial na empresa, cada um com os seus templates, e no escolhido um aprovado, um pendente, um rejeitado e um de autenticação aprovado, quando o Admin escolhe o tipo Template, então a lista mostra só o aprovado desse número; nem o pendente, nem o rejeitado, nem o de autenticação, nem os do outro número aparecem.
- **CA-B54-15** (automática) — Trocar o número limpa um template que não existe nele. Dado a etapa 2 com o tipo Template e um template escolhido, quando o Admin troca para um número que não tem esse template (ou para um do canal direto), então a escolha do template é apagada, o tipo volta a Texto e a tela avisa "O template escolhido não existe neste número".
- **CA-B54-22** (automática) — O Gerente vê e mexe em templates como o Admin. Dado um Gerente logado, quando ele abre Configurações > Templates e, numa campanha, escolhe o tipo Template, então a tela de templates abre para ele com Ver, Editar e Novo template, e a lista de aprovados aparece na campanha como para o Admin; o Atendente continua sem acesso à tela de templates.

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B54-02 | Template de autenticação não aparece na campanha: a Meta fixa o conteúdo dele (código de uso único), e não serve para disparo em massa. | confirmada | Marcelle, 30/10/2026 |
| SUP-B54-03 | O Gerente vê a lista de templates aprovados dentro da campanha, mas a tela de Configurações > Templates continua só do Admin. | invalidada | Marcelle, 30/10/2026: o Gerente vê tudo, inclusive a tela de templates (CA-B54-22) |
| SUP-B54-04 | Com "Usar o número conectado da empresa" (sem escolher um), o tipo Template não aparece: para template, a campanha precisa de um número da API Oficial escolhido. | confirmada | Marcelle, 30/10/2026 |

## Perguntas em aberto

Nenhuma.
