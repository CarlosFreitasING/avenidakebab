    -- Club Kebab: schema inicial para Supabase
    -- Ejecutar en Supabase -> SQL Editor -> New query.
    -- Este script no contiene claves API ni contrasenas.

    create table if not exists public.profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    email text not null,
    role text not null default 'cliente' check (role in ('cliente', 'admin')),
    points integer not null default 0 check (points >= 0 and points <= 10),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
    );

    create table if not exists public.menu_items (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    category text not null,
    price numeric(10, 2) not null check (price >= 0),
    description text not null default '',
    variants text[] not null default '{}',
    sides text[] not null default '{}',
    awards_points boolean not null default false,
    active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
    );

    create table if not exists public.point_transactions (
    id uuid primary key default gen_random_uuid(),
    customer_id uuid not null references public.profiles(id) on delete cascade,
    performed_by uuid not null references public.profiles(id),
    amount integer not null,
    transaction_type text not null check (transaction_type in ('suma', 'canje')),
    note text not null default '',
    created_at timestamptz not null default now()
    );

    create index if not exists point_transactions_customer_id_idx
    on public.point_transactions(customer_id, created_at desc);

    create or replace function public.is_admin()
    returns boolean
    language sql
    stable
    security definer
    set search_path = public
    as $$
    select exists (
        select 1
        from public.profiles
        where id = auth.uid() and role = 'admin'
    );
    $$;

    create or replace function public.handle_new_user()
    returns trigger
    language plpgsql
    security definer
    set search_path = public
    as $$
    begin
    insert into public.profiles (id, email)
    values (new.id, coalesce(new.email, ''))
    on conflict (id) do update set email = excluded.email;
    return new;
    end;
    $$;

    drop trigger if exists on_auth_user_created on auth.users;
    create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();

    alter table public.profiles enable row level security;
    alter table public.menu_items enable row level security;
    alter table public.point_transactions enable row level security;

    drop policy if exists profiles_select_self_or_admin on public.profiles;
    create policy profiles_select_self_or_admin
    on public.profiles for select
    to authenticated
    using (id = auth.uid() or public.is_admin());

    drop policy if exists profiles_update_admin on public.profiles;
    create policy profiles_update_admin
    on public.profiles for update
    to authenticated
    using (public.is_admin())
    with check (public.is_admin());

    drop policy if exists menu_items_select_active on public.menu_items;
    create policy menu_items_select_active
    on public.menu_items for select
    to anon, authenticated
    using (active = true or public.is_admin());

    drop policy if exists menu_items_insert_admin on public.menu_items;
    create policy menu_items_insert_admin
    on public.menu_items for insert
    to authenticated
    with check (public.is_admin());

    drop policy if exists menu_items_update_admin on public.menu_items;
    create policy menu_items_update_admin
    on public.menu_items for update
    to authenticated
    using (public.is_admin())
    with check (public.is_admin());

    drop policy if exists menu_items_delete_admin on public.menu_items;
    create policy menu_items_delete_admin
    on public.menu_items for delete
    to authenticated
    using (public.is_admin());

    drop policy if exists point_transactions_select_customer_or_admin on public.point_transactions;
    create policy point_transactions_select_customer_or_admin
    on public.point_transactions for select
    to authenticated
    using (customer_id = auth.uid() or public.is_admin());

    drop policy if exists point_transactions_insert_admin on public.point_transactions;
    create policy point_transactions_insert_admin
    on public.point_transactions for insert
    to authenticated
    with check (public.is_admin() and performed_by = auth.uid());

    insert into public.menu_items
    (name, category, price, description, variants, sides, awards_points)
    values
    ('Menu kebab en pan', 'Menus con pan', 7.50, 'Pan tostado con carne, ensalada, salsa, patatas fritas y bebida.', array['Pollo', 'Ternera', 'Mixto', 'Cerdo'], array['Patatas fritas', 'Ensalada', 'Salsa blanca', 'Salsa picante'], true),
    ('Menu kebab en tortilla', 'Menus con tortilla', 8.00, 'Tortilla enrollada con carne, verduras frescas, salsa, patatas fritas y bebida.', array['Pollo', 'Ternera', 'Mixto', 'Cerdo'], array['Patatas fritas', 'Ensalada', 'Salsa blanca', 'Salsa picante'], true),
    ('Plato kebab completo', 'Platos', 9.50, 'Carne al plato con patatas, ensalada, pan y salsa.', array['Pollo', 'Ternera', 'Mixto'], array['Arroz', 'Patatas fritas', 'Ensalada', 'Pan'], true),
    ('Kebab solo en pan', 'Kebabs', 5.00, 'Kebab en pan sin menu. Ideal para algo rapido.', array['Pollo', 'Ternera', 'Mixto', 'Cerdo'], array['Ensalada', 'Salsa blanca', 'Salsa picante'], false),
    ('Durum solo', 'Kebabs', 5.80, 'Tortilla enrollada sin patatas ni bebida.', array['Pollo', 'Ternera', 'Mixto', 'Cerdo'], array['Ensalada', 'Salsa blanca', 'Salsa picante'], false),
    ('Menu falafel', 'Vegetariano', 7.20, 'Falafel con ensalada, salsa, patatas fritas y bebida.', array['Falafel clasico', 'Falafel picante'], array['Patatas fritas', 'Ensalada', 'Salsa de yogur'], true),
    ('Patatas fritas', 'Complementos', 2.50, 'Racion de patatas fritas crujientes.', array['Pequena', 'Grande'], array['Salsa blanca', 'Salsa picante', 'Ketchup'], false),
    ('Bebida', 'Bebidas', 1.80, 'Bebida fria para acompanar.', array['Agua', 'Refresco', 'Zumo'], array[]::text[], false)
    on conflict do nothing;
