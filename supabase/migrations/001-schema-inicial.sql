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
    image_urls text[] not null default '{}',
    variant_images jsonb not null default '{}'::jsonb,
    ingredients text[] not null default '{}',
    allergens text[] not null default '{}',
    may_contain text[] not null default '{}',
    dietary_tags text[] not null default '{}',
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

    alter table public.menu_items add column if not exists image_urls text[] not null default '{}';
    alter table public.menu_items add column if not exists variant_images jsonb not null default '{}'::jsonb;
    alter table public.menu_items add column if not exists ingredients text[] not null default '{}';
    alter table public.menu_items add column if not exists allergens text[] not null default '{}';
    alter table public.menu_items add column if not exists may_contain text[] not null default '{}';
    alter table public.menu_items add column if not exists dietary_tags text[] not null default '{}';
    alter table public.menu_items drop column if exists allergen_note;

    create unique index if not exists menu_items_name_unique
    on public.menu_items (lower(name));

    update public.menu_items
    set active = false, updated_at = now()
    where active = true;

    insert into public.menu_items
    (name, category, price, description, variants, sides, ingredients, allergens, may_contain, dietary_tags, awards_points, active)
    values
    ('Submarino Mozzarella', 'Submarino', 8.50, 'Tomate, alface, cenoura, milho, queijo mozzarella y molho Ali.', '{}', array['Tomate', 'Alface', 'Cenoura', 'Milho', 'Queijo Mozzarella'], array['pan', 'tomate', 'alface', 'cenoura', 'milho', 'queijo mozzarella', 'molho Ali'], array['gluten', 'leche'], '{}', '{}', true, true),
    ('Cheese Steak', 'Submarino', 9.50, 'Tomate, pimiento, cebolla, queso gratinado y molho Ali.', array['Novilho', 'Porco', 'Frango', 'Peru'], array['Tomate', 'Pimento', 'Cebola', 'Queijo Gratinado'], array['pan', 'carne a elegir', 'tomate', 'pimiento', 'cebolla', 'queso gratinado', 'molho Ali'], array['gluten', 'leche'], '{}', '{}', true, true),
    ('Kebab', 'Kebab', 7.50, 'Kebab con alface, cenoura, couve roxa y molho Ali.', array['Novilho', 'Porco', 'Frango', 'Peru'], array['Alface', 'Cenoura', 'Couve Roxa'], array['pan o tortilla', 'carne a elegir', 'alface', 'cenoura', 'couve roxa', 'molho Ali'], array['gluten'], '{}', '{}', true, true),
    ('Kebab Grill', 'Grill', 10.50, 'Carne kebab servida con salada, arroz y batata.', array['Novilho', 'Porco', 'Frango', 'Peru'], array['Salada', 'Arroz', 'Batata'], array['carne kebab', 'ensalada', 'arroz', 'batata'], '{}', '{}', '{}', true, true),
    ('Bife Grill', 'Grill', 12.50, 'Bife de novilho con salada, arroz y batata.', array['Novilho'], array['Salada', 'Arroz', 'Batata', 'Molho de Cogumelos', 'Manteiga de Ervas Aromáticas'], array['bife de novilho', 'ensalada', 'arroz', 'batata', 'molho de cogumelos', 'manteiga de ervas aromáticas'], array['leche'], '{}', '{}', true, true),
    ('Peito de Frango', 'Grill', 11.50, 'Pechuga de pollo con salada, arroz y batata.', array['Frango'], array['Salada', 'Arroz', 'Batata', 'Molho de Cogumelos', 'Manteiga de Ervas Aromáticas'], array['pechuga de pollo', 'ensalada', 'arroz', 'batata', 'molho de cogumelos', 'manteiga de ervas aromáticas'], array['leche'], '{}', '{}', true, true),
    ('Chicken Burger', 'Grill', 9.00, 'Hamburguesa de pollo con salada, arroz, batata, queso y ananás.', '{}', array['Salada', 'Arroz', 'Batata', 'Queijo', 'Ananás'], array['hamburguesa de pollo', 'ensalada', 'arroz', 'batata', 'queso', 'ananás'], array['leche'], '{}', '{}', true, true),
    ('Sauteed', 'Grill', 10.00, 'Carne a elección con cebolla, pimiento, champiñones, batata y ensalada.', array['Novilho', 'Porco', 'Frango', 'Peru'], array['Cebola', 'Pimento', 'Cogumelos', 'Batata', 'Salada'], array['carne a elegir', 'cebolla', 'pimiento', 'champiñones', 'batata', 'ensalada'], '{}', '{}', '{}', true, true),
    ('K-Rolling', 'K-Rolling', 8.00, 'Wrap enrollado con carne, alface, cenoura, cebolla, tomate y molho Ali.', array['Novilho', 'Porco', 'Frango', 'Peru'], array['Alface', 'Cenoura', 'Cebola', 'Tomate'], array['wrap', 'carne a elegir', 'alface', 'cenoura', 'cebolla', 'tomate', 'molho Ali'], array['gluten'], '{}', '{}', true, true),
    ('K-Chicken Burger', 'K-Rolling', 8.50, 'Alface, cenoura, tomate, queso y molho Ali.', '{}', array['Alface', 'Cenoura', 'Tomate', 'Queijo'], array['alface', 'cenoura', 'tomate', 'queso', 'molho Ali'], array['leche'], '{}', '{}', true, true),
    ('Rolling No-Meat', 'K-Rolling', 8.50, 'Nuggets de soja con alface, cenoura, cebolla y tomate.', '{}', array['Nuggets de Soja', 'Alface', 'Cenoura', 'Cebola', 'Tomate'], array['wrap', 'nuggets de soja', 'alface', 'cenoura', 'cebolla', 'tomate'], array['gluten', 'soja'], '{}', array['vegetariano'], true, true),
    ('Mozzarela', 'Saladas', 8.50, 'Ensalada con couscous, mozzarella, verduras frescas y milho.', '{}', array['Couscous', 'Queijo Mozzarella', 'Alface', 'Cenoura', 'Tomate', 'Pepino', 'Couve Roxa', 'Milho'], array['couscous', 'queso mozzarella', 'alface', 'cenoura', 'tomate', 'pepino', 'couve roxa', 'milho'], array['gluten', 'leche'], '{}', array['vegetariano'], true, true),
    ('Romana', 'Saladas', 9.00, 'Ensalada con peito de frango y verduras frescas.', '{}', array['Peito de Frango', 'Alface', 'Cenoura', 'Tomate', 'Pepino', 'Couve Roxa', 'Milho'], array['pechuga de pollo', 'alface', 'cenoura', 'tomate', 'pepino', 'couve roxa', 'milho'], '{}', '{}', '{}', true, true),
    ('No-Meat Salad', 'Saladas', 8.00, 'Ensalada vegetariana con nuggets de soja y verduras frescas.', '{}', array['Nuggets de Soja', 'Alface', 'Cenoura', 'Tomate', 'Pepino', 'Couve Roxa', 'Milho'], array['nuggets de soja', 'alface', 'cenoura', 'tomate', 'pepino', 'couve roxa', 'milho'], array['soja'], '{}', array['vegetariano'], true, true),
    ('K-Cheese', 'K-Cheese', 8.50, 'Carne con queso gratinado, tomate y aceitunas.', array['Novilho', 'Porco', 'Frango', 'Peru'], array['Queijo Gratinado', 'Tomate', 'Azeitonas'], array['carne a elegir', 'queso gratinado', 'tomate', 'aceitunas'], array['leche'], '{}', '{}', true, true),
    ('Crunchy K-Cheese', 'K-Cheese', 9.50, 'Carne con pimiento, champiñones, milho, queso gratinado y cebolla frita.', array['Novilho', 'Porco', 'Frango', 'Peru'], array['Pimento', 'Cogumelos', 'Milho', 'Queijo Gratinado', 'Cebola Frita'], array['carne a elegir', 'pimiento', 'champiñones', 'milho', 'queso gratinado', 'cebolla frita'], array['leche'], '{}', '{}', true, true)
    on conflict (lower(name)) do update set
        category = excluded.category,
        price = excluded.price,
        description = excluded.description,
        variants = excluded.variants,
        sides = excluded.sides,
        ingredients = excluded.ingredients,
        allergens = excluded.allergens,
        may_contain = excluded.may_contain,
        dietary_tags = excluded.dietary_tags,
        awards_points = excluded.awards_points,
        active = excluded.active,
        updated_at = now();
