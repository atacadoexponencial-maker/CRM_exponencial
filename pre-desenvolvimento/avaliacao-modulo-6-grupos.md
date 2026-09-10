# Avaliação — Módulo 6 (Grupos WhatsApp): BLOQUEADO

**Data:** 12/06/2026
**Status:** não implementável com a stack atual. Issues mantidas em `issues/modulo6-grupos/` aguardando decisão.

## O bloqueio

A spec assume que a **API Oficial Meta (WhatsApp Business Cloud API)** — o canal já usado pelos módulos de Chat, Sequências e Campanhas — permite criar grupos, gerenciar participantes e enviar mensagens a grupos ("Grupos criados aqui aparecem no WhatsApp do número conectado ao workspace").

**Isso não existe.** A Cloud API da Meta não tem nenhum endpoint de grupos: não cria grupo, não envia mensagem para grupo, não lista participantes. O limite citado na spec ("1024 participantes — limite da API Oficial") se refere ao aplicativo WhatsApp comum, não à API. Não há previsão pública da Meta para adicionar suporte a grupos na Cloud API.

## Alternativas (decisão de produto)

1. **Recomendada — manter grupos fora do CRM**: o time opera os grupos VIP/Clientes pelo WhatsApp Business app no celular, e o CRM cobre a nutrição em escala via **Campanhas** (módulo 7, já implementado), que atinge o mesmo objetivo (mensagem em massa para leads/ativos segmentados) dentro da API oficial.
2. **API não-oficial (Evolution API, Baileys, Z-API)**: suportam grupos, mas violam os Termos de Serviço do WhatsApp → risco real de banimento do número. Não recomendado para um produto à venda.
3. **Redesenhar o módulo como "Comunidades/Listas"**: usar listas de transmissão lógicas dentro do CRM (na prática, uma evolução das Campanhas com envios recorrentes). Exigiria nova spec.

## Impacto no produto

Nenhuma funcionalidade já entregue depende de grupos. O método "nutrição em escala" está coberto pelas Campanhas segmentadas + Sequências automáticas.
