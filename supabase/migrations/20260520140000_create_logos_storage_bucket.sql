-- Migration: Criar bucket de logos de clientes no Supabase Storage
-- e definir políticas de acesso

-- 1. Cria o bucket 'logos' (público, para servir imagens via URL)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'logos',
  'logos',
  true,
  2097152,  -- 2 MB em bytes
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO NOTHING;

-- 2. Política: leitura pública (qualquer um pode ver o logo)
CREATE POLICY "logos_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'logos');

-- 3. Política: apenas service_role pode fazer upload/update/delete
--    (operações de escrita são feitas via server-side com SUPABASE_SERVICE_ROLE_KEY)
CREATE POLICY "logos_admin_write"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'logos');

CREATE POLICY "logos_admin_update"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'logos');

CREATE POLICY "logos_admin_delete"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'logos');
