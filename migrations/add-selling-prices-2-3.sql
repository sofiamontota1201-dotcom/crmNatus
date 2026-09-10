-- Agregar columnas de precios nivel 2 y 3 a la tabla stocks
ALTER TABLE stocks 
ADD COLUMN IF NOT EXISTS selling_price_2 NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS selling_price_3 NUMERIC DEFAULT 0;
