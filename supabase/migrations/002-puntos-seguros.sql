
drop policy if exists profiles_update_admin on public.profiles;
drop policy if exists point_transactions_insert_admin on public.point_transactions;

create or replace function public.admin_add_points(
  target_customer uuid,
  points_to_add integer,
  operation_note text default ''
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_profile public.profiles;
  previous_points integer;
begin
  if not public.is_admin() then
    raise exception 'Solo un administrador puede sumar puntos';
  end if;
  if points_to_add is null or points_to_add <= 0 then
    raise exception 'La cantidad debe ser mayor que cero';
  end if;

  select points into previous_points
  from public.profiles
  where id = target_customer;

  update public.profiles
  set points = least(10, points + points_to_add), updated_at = now()
  where id = target_customer
  returning * into updated_profile;

  if updated_profile.id is null then
    raise exception 'Cliente no encontrado';
  end if;

  insert into public.point_transactions (customer_id, performed_by, amount, transaction_type, note)
  values (target_customer, auth.uid(), updated_profile.points - previous_points, 'suma', coalesce(operation_note, ''));

  return updated_profile;
end;
$$;

create or replace function public.admin_redeem_points(
  target_customer uuid,
  operation_note text default ''
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_profile public.profiles;
begin
  if not public.is_admin() then
    raise exception 'Solo un administrador puede canjear puntos';
  end if;

  update public.profiles
  set points = 0, updated_at = now()
  where id = target_customer and points >= 10
  returning * into updated_profile;

  if updated_profile.id is null then
    raise exception 'El cliente no tiene suficientes puntos para canjear';
  end if;

  insert into public.point_transactions (customer_id, performed_by, amount, transaction_type, note)
  values (target_customer, auth.uid(), -10, 'canje', coalesce(operation_note, ''));

  return updated_profile;
end;
$$;

grant execute on function public.admin_add_points(uuid, integer, text) to authenticated;
grant execute on function public.admin_redeem_points(uuid, text) to authenticated;
