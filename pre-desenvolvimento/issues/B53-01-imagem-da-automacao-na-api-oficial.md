# B53-01: Imagem enviada por automação chega pela API Oficial

**Tipo:** Implementação
**Página:** Automações — enviar arquivo
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-correcoes-qa-roteiro-luan.md`

## Descrição

A ação "Enviar arquivo" deixa de mandar o nome do arquivo quando é imagem; a Meta recusa esse campo em imagem. Documento continua com nome.

## Pronto quando

Uma automação com imagem no número da API Oficial entrega a imagem no celular.

## Critérios de aceite

- **CA-B53-01** (automática) — Imagem da automação sai sem nome de arquivo. Dado uma automação com a ação "Enviar arquivo" com uma imagem, quando ela roda para um contato num número da API Oficial, então o pedido à Meta leva a imagem sem o nome do arquivo (a Meta recusa `filename` em `image`), e um documento continua levando o nome.
- **CA-B53-02** (manual) — Imagem da automação chega no celular pela API Oficial. Dado a automação do roteiro B5.3 no número +55 11 95504-6911, quando o gatilho dispara, então a imagem chega no celular do contato e o Histórico mostra a execução concluída.

## Suposições

Nenhuma.

## Perguntas em aberto

Nenhuma.
