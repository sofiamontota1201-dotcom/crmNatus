-- Tabla para guardar carritos pendientes (sincronización entre dispositivos y protección contra cortes de luz)
CREATE TABLE IF NOT EXISTS pending_carts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  items JSONB NOT NULL DEFAULT '[]',
  customer_id INTEGER,
  sell_date TEXT,
  payment_method INTEGER DEFAULT 0,
  global_discount TEXT DEFAULT '',
  document_type TEXT DEFAULT 'express',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índice para buscar rápido por usuario
CREATE INDEX IF NOT EXISTS idx_pending_carts_user_id ON pending_carts(user_id);

-- RLS: solo el usuario puede ver/modificar su propio carrito
ALTER TABLE pending_carts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own pending cart"
  ON pending_carts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own pending cart"
  ON pending_carts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own pending cart"
  ON pending_carts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own pending cart"
  ON pending_carts FOR DELETE
  USING (auth.uid() = user_id);
