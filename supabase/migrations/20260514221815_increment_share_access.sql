-- Função para incrementar acessos e registrar último acesso em um dashboard_share_link
CREATE OR REPLACE FUNCTION public.increment_share_access(link_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE public.dashboard_share_links
    SET 
        access_count = access_count + 1,
        last_accessed_at = NOW()
    WHERE id = link_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
