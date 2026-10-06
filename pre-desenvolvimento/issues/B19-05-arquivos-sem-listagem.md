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
