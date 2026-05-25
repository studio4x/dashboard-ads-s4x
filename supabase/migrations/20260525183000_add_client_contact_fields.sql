-- Add contact fields to clients for automation recipients
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS emails TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS phones TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp TEXT;

