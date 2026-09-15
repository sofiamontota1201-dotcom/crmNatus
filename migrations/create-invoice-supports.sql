-- ============================================================
-- Tabla invoice_supports — módulo de Soportes (facturas/egresos)
-- Ejecutar en Supabase SQL Editor (la tabla no existía en la DB)
-- ============================================================

create table if not exists public.invoice_supports (
  id uuid primary key default gen_random_uuid(),
  -- tipo de movimiento: gasto | compra | venta | ingreso_caja | prestamo
  type text not null,
  -- interno | proveedor | cliente
  entity_type text not null default 'interno',
  entity_name text,
  category text,
  description text,
  quantity numeric not null default 1,
  unit_price numeric not null default 0,
  -- calculado por la DB: quantity * unit_price (la app solo lo lee)
  total_price numeric generated always as (quantity * unit_price) stored,
  -- efectivo | transferencia | tarjeta
  payment_method text not null default 'efectivo',
  invoice_date date not null default current_date,
  -- URLs públicas de las imágenes del soporte (bucket 'receipts')
  image_urls jsonb not null default '[]'::jsonb,
  -- cuando type='venta': id de la venta (sells.id) que respalda
  reference_id bigint,
  created_at timestamptz not null default now()
);

-- Índices para los filtros que usa la app
create index if not exists idx_invoice_supports_date on public.invoice_supports (invoice_date);
create index if not exists idx_invoice_supports_type on public.invoice_supports (type);
create index if not exists idx_invoice_supports_reference on public.invoice_supports (reference_id);

-- Realtime: la página de soportes escucha cambios en vivo
alter publication supabase_realtime add table public.invoice_supports;

-- (Opcional, recomendado más adelante) RLS con visibilidad total para usuarios
-- autenticados — consistente con el modelo de confianza interno del CRM:
-- alter table public.invoice_supports enable row level security;
-- create policy "authenticated full access" on public.invoice_supports
--   for all to authenticated using (true) with check (true);
