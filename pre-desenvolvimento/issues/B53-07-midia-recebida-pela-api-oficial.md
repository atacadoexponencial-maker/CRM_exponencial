# B53-07: Mídia recebida pela API Oficial aparece no Chat

**Tipo:** Implementação
**Página:** Chat
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-correcoes-qa-roteiro-luan.md`

## Descrição

O webhook da Meta passa a baixar a mídia recebida (imagem, áudio, vídeo, documento e figurinha), guardar no armazenamento da empresa e gravar a mensagem com o tipo certo, como o canal direto já faz.

## Pronto quando

Imagem, áudio, PDF e vídeo mandados ao número da API Oficial aparecem e abrem no Chat.

## Critérios de aceite

- **CA-B53-12** (automática) — Mídia da Meta vira mídia no Chat. Dado um aviso de mensagem recebida da Meta com imagem e legenda, quando o CRM o recebe, então a mensagem fica gravada como imagem, com o arquivo guardado no armazenamento da empresa e a legenda como texto (o mesmo vale para áudio, vídeo, documento com nome e figurinha).
- **CA-B53-13** (automática) — Falha ao baixar não deixa balão vazio. Dado um aviso de mídia cujo download na Meta falha, quando o CRM o recebe, então a mensagem é gravada e o balão mostra "Mídia não pôde ser carregada".
- **CA-B53-14** (manual) — Mídia recebida aparece no Chat pela API Oficial. Dado o número +55 11 95504-6911, quando o contato manda imagem, áudio, PDF e vídeo, então os quatro aparecem no Chat e abrem.

## Suposições

Nenhuma.

## Perguntas em aberto

Nenhuma.
