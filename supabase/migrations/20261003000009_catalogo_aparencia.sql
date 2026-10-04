-- B16-08: aparência da loja (a marca do lojista na vitrine). Só acrescenta colunas.

alter table public.catalog_settings
  add column store_name text check (store_name is null or length(trim(store_name)) between 1 and 60),
  add column welcome_text text not null default '' check (length(welcome_text) <= 140),
  add column logo_path text,
  add column banner_path text,
  add column primary_color text not null default '#1f2937' check (primary_color ~ '^#[0-9a-f]{6}$'),
  add column background_color text not null default '#ffffff' check (background_color ~ '^#[0-9a-f]{6}$'),
  add column font_id text not null default 'inter',
  add column layout text not null default 'grade' check (layout in ('grade', 'lista', 'destaque'));
