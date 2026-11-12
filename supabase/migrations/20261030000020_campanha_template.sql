-- B54-04: campanha por template da API Oficial.
--
-- `tipo_mensagem` ganha o valor 'template' e a campanha guarda qual template usa em
-- `template` (jsonb): id, nome e idioma na Meta, o tipo do cabeçalho e, na B54-05, de
-- onde vem cada variável. Fica em jsonb porque é a cópia do que a Meta devolveu no
-- momento da escolha, não uma entidade do CRM: template é dela, não nosso.

alter table campaigns
  drop constraint if exists campaigns_tipo_mensagem_check;

alter table campaigns
  add constraint campaigns_tipo_mensagem_check
  check (tipo_mensagem in ('texto', 'imagem', 'documento', 'template'));

alter table campaigns
  add column if not exists template jsonb;

comment on column campaigns.template is
  'B54-04: template da Meta escolhido (id, name, language, cabecalho) e, na B54-05, a origem de cada variável. Só quando tipo_mensagem = template.';
