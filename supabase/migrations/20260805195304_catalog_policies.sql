-- Catalogo: lectura abierta, escritura solo de admin. Cierra la parte de P0-2
-- que corresponde al inventario.
--
-- Las politicas de la linea base eran para el rol `public`, que incluye a todos
-- los roles existentes y futuros. Se reemplazan por otras TO anon, authenticated,
-- que dicen explicitamente a quien aplican. Los DROP van primero porque dos de
-- los nombres nuevos coinciden con los viejos.
--
-- El GRANT de escritura a `authenticated` es necesario para que las politicas de
-- admin tengan a quien aplicarse. Sin privilegio la sentencia no se planifica;
-- con privilegio pero sin politica, RLS deja el cambio en cero filas.

drop policy if exists products_select_public       on public.products;
drop policy if exists product_images_select_public on public.product_images;
drop policy if exists campuses_select_public       on public.campuses;
drop policy if exists carreras_select_public       on public.carreras;
drop policy if exists inventory_units_select_auth  on public.inventory_units;
drop policy if exists disabled_days_select_auth    on public.disabled_days;


grant select on public.campuses, public.carreras, public.products,
                public.product_images, public.product_availability
  to anon, authenticated;

grant select on public.inventory_units, public.disabled_days
  to authenticated;

grant insert, update, delete on
    public.campuses, public.carreras, public.products,
    public.product_images, public.inventory_units, public.disabled_days
  to authenticated;


create policy products_select_all on public.products
  for select to anon, authenticated using (true);
create policy products_admin_all on public.products
  for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

create policy product_images_select_all on public.product_images
  for select to anon, authenticated using (true);
create policy product_images_admin_all on public.product_images
  for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

create policy campuses_select_all on public.campuses
  for select to anon, authenticated using (true);
create policy campuses_admin_all on public.campuses
  for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

create policy carreras_select_all on public.carreras
  for select to anon, authenticated using (true);
create policy carreras_admin_all on public.carreras
  for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

-- El inventario fisico no es publico: un anonimo no tiene por que saber cuantas
-- camaras hay ni sus codigos de activo.
create policy units_select_auth on public.inventory_units
  for select to authenticated using (true);
create policy units_admin_all on public.inventory_units
  for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

create policy disabled_days_select_auth on public.disabled_days
  for select to authenticated using (true);
create policy disabled_days_admin_all on public.disabled_days
  for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
