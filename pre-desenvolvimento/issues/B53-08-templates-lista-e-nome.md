# B53-08: Templates: lista certa com chip e API Oficial, erro visível e nome final antes de enviar

**Tipo:** Implementação
**Página:** Configurações — Templates
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-correcoes-qa-roteiro-luan.md`

## Descrição

A tela busca o número da API Oficial mesmo com chip na empresa, mostra erro quando a Meta recusa, mostra o nome final do template e o servidor confere o nome.

## Pronto quando

A lista de templates aparece na empresa de teste e "Teste Luan" mostra `teste_luan` antes de enviar.

## Critérios de aceite

- **CA-B53-15** (automática) — Lista de templates com chip e API Oficial. Dado uma empresa com um número do canal direto e um da API Oficial, quando o Admin abre a tela de templates, então a lista vem do número da API Oficial.
- **CA-B53-16** (automática) — Falha da Meta aparece como erro. Dado a Meta respondendo com erro à consulta de templates, quando o Admin abre a tela, então a tela mostra "Não foi possível carregar os templates da Meta" e não uma lista vazia.
- **CA-B53-17** (automática) — Nome final do template aparece antes de enviar. Dado o formulário de novo template, quando a pessoa digita "Teste Luan", então a tela mostra que o nome enviado será `teste_luan`.
- **CA-B53-18** (automática) — Servidor confere o nome do template. Dado um pedido de criação com o nome "Promoção-Já", quando ele chega ao servidor, então é recusado com a mensagem do que é aceito, sem chamar a Meta.

## Suposições

Nenhuma.

## Perguntas em aberto

Nenhuma.
