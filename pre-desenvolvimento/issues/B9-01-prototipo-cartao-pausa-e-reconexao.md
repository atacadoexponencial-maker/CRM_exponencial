# B9-01: Protótipo — Cartão do número: pausa, reconexão e aviso de pausa longa

**Tipo:** Protótipo
**Página:** CRM — Configurações → WhatsApp (cartão do número do canal direto)
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-desconectar-reconectar.md`

## Descrição

Desenhar, com dados fixos no arquivo e sem chamar o gateway, os novos estados do
cartão de um número do canal direto: desconectado a pedido (com "Desconectado há
N dias"), aviso de pausa longa a partir de 10 dias, "Reconectando…", conexão
caída com o gateway tentando voltar, falha da reconexão com a saída para um QR
Code novo do mesmo número, e os textos revisados de Desconectar, Encerrar no
aparelho e Remover.

## Pronto quando

A Marcelle abre a tela e vê, lado a lado, cada um desses estados do cartão, com os
textos finais em português, e aprova a forma antes de qualquer lógica real.
