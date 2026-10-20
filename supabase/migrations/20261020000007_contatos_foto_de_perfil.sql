-- B29-02: foto de perfil do contato, buscada pelo canal direto.
--
-- `photo_path` aponta para a cópia no bucket `contact-photos`; `photo_checked_at`
-- marca quando a busca terminou de vez (achou, ou o WhatsApp disse "sem foto").
-- Nulo = ainda não buscou, ou a busca falhou por culpa do gateway e vai tentar de
-- novo na próxima mensagem do contato.

alter table public.contacts
  add column if not exists photo_path text,
  add column if not exists photo_checked_at timestamptz;

-- Bucket PRIVADO: só a chave de serviço grava, lê e assina endereços. Sem
-- política para `authenticated` nem para `anon`: um endereço público do
-- arquivo responde erro, e um usuário logado não baixa direto. A tela recebe
-- um endereço assinado, de 1 hora, gerado no servidor.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('contact-photos', 'contact-photos', false, 1048576, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;
