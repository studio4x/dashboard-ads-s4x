-- Configuracao global da identidade visual da plataforma.
CREATE TABLE IF NOT EXISTS public.platform_branding (
  id TEXT PRIMARY KEY DEFAULT 'default',
  logo_dark_path TEXT,
  logo_light_path TEXT,
  favicon_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT platform_branding_singleton CHECK (id = 'default')
);

INSERT INTO public.platform_branding (id)
VALUES ('default')
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.platform_branding ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage platform branding"
  ON public.platform_branding
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE profiles.auth_user_id = auth.uid()
        AND profiles.role IN ('admin', 'owner')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE profiles.auth_user_id = auth.uid()
        AND profiles.role IN ('admin', 'owner')
    )
  );

CREATE TRIGGER update_platform_branding_modtime
  BEFORE UPDATE ON public.platform_branding
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- O bucket de logos ja existe e tambem atende ao favicon da plataforma.
UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/svg+xml',
  'image/x-icon'
]
WHERE id = 'logos';
