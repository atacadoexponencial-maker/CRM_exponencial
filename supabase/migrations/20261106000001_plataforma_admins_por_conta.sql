-- Auditoria de segurança run-2, pista 5 (06/11/2026): quem cuida da plataforma passa a
-- ser reconhecido pela conta (id), não pelo texto do e-mail.
--
-- Antes, `ehDaPlataforma` conferia o e-mail da sessão contra esta tabela. Como o CRM cria
-- conta já confirmada com qualquer e-mail ("Adicionar usuário" do admin da empresa e o
-- convite sem e-mail), quem criasse uma conta com um destes e-mails, antes do dono,
-- virava admin da plataforma. Agora vale o `user_id`.
--
-- As contas são ligadas pelo id, não pelo e-mail: ligar "a conta que tem o e-mail hoje"
-- tornaria permanente uma conta impostora, se ela já existisse. Os dois ids abaixo foram
-- conferidos na produção em 06/11/2026 (contas criadas em 29/05 e 15/10, antes da lista,
-- reconhecidas pelo Luan). Só liga se o id ainda tiver o mesmo e-mail; no banco de teste,
-- onde essas contas não existem, não liga nada.
--
-- Linha sem `user_id` não dá acesso a ninguém. Para ligar uma conta nova, confira antes
-- quem ela é e ligue pelo id (no SQL do Supabase):
--   update public.plataforma_admins set user_id = '<id conferido>' where email = '<e-mail>';
--
-- Aditiva: a coluna `email` continua, como referência de quem é cada linha.
-- Volta atrás: alter table public.plataforma_admins drop column user_id;

alter table public.plataforma_admins
  add column if not exists user_id uuid unique references auth.users (id) on delete cascade;

update public.plataforma_admins p
   set user_id = u.id
  from auth.users u
 where u.id in (
         '27e9c8e4-f7d0-43cf-bf24-7a9524025dd9', -- marcelle@seteads.com
         '30ea6068-3062-4bf8-98de-d8bd248ec264'  -- luan@seteads.com
       )
   and lower(u.email) = p.email
   and p.user_id is null;
