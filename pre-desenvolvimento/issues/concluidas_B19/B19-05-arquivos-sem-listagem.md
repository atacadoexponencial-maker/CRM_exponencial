# B19-05: Arquivos guardados sem listagem e sem gravação por fora

**Tipo:** Implementação
**Página:** Loja pública, Catálogo, Chat, Campanhas (arquivos)
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-seguranca-rodada-1.md` — módulo 6

## Descrição

Fechar a listagem anônima das pastas de fotos do catálogo e de anexos do chat — que
revela os códigos de todas as empresas — e a gravação direta de arquivo na pasta de
anexos por qualquer usuário logado. Os arquivos continuam abrindo pelo link.

## Pronto quando

Fotos aparecem na loja pública e no catálogo do CRM, subir foto nova funciona, anexos
recebidos e enviados aparecem no chat, enviar anexo no chat e mídia em campanha
funciona; e testes automatizados provam que ninguém de fora lista as pastas do catálogo
nem dos anexos, e que um usuário logado não grava arquivo direto na pasta de anexos.
A mudança está aplicada no Supabase de produção.

## Cenários

### Happy Path
1. Os dois buckets continuam **públicos** (`public = true`): qualquer link de arquivo
   continua abrindo, sem policy — é assim que o Storage serve bucket público.
2. Somem as três policies de `storage.objects` (conferidas no remoto em 06/10):
   - "Leitura publica de anexos do chat" (SELECT, `public`) — só servia para **listar**.
   - "Leitura pública das imagens do catálogo" (SELECT, `public`) — idem.
   - "Usuarios autenticados podem fazer upload de anexos" (INSERT, `authenticated`).
3. Todo envio de arquivo do sistema já usa a chave de serviço (chat `actions.ts`
   ×4, campanhas, mídia recebida, importação) ou URL assinada criada pelo servidor
   (foto do produto e aparência da loja, `uploadToSignedUrl`) — nenhum depende das policies.

### Edge Cases
- Anônimo chamando a listagem dos buckets: devolve vazio.
- Usuário logado tentando subir arquivo direto em `chat-attachments` (na pasta de qualquer empresa): recusado.
- Remoção de arquivos (lixeira, catálogo) usa a chave de serviço — não muda.

### Cenário de Erro
- Nenhum fluxo legítimo depende das policies; se algum dependesse, o envio falharia com
  erro de permissão — os testes de upload do catálogo e do chat acusariam.

## Banco de Dados

- `storage.objects`: `drop policy` das três policies acima. Buckets não mudam.

## Arquivos

- **Criar:** `supabase/migrations/20261006000006_storage_sem_listagem.sql` — remove as três policies.
- **Criar:** `src/test/arquivos-seguranca.integration.test.ts` — com um arquivo de verdade em cada bucket: link público abre; anônimo não lista; usuário logado não grava em `chat-attachments`.

## Dependências Externas

- Supabase Storage — bucket público serve por URL sem policy; `list` passa por RLS de `storage.objects`.

## Checklist

- [x] Migration aplicada no remoto e policies conferidas
- [x] Testes de ataque e do link público passando; testes de catálogo existentes passando
