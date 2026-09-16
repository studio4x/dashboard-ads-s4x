import { ClientContactForm } from "@/components/admin/ClientContactForm";
import { ClientLogoUploader } from "@/components/admin/ClientLogoUploader";
import type { ClientLogoSettings } from "@/lib/client-logo-settings";

type VisualIdentityClient = {
  id: string;
  name: string;
  logo_url?: string | null;
  logo_settings?: ClientLogoSettings | null;
  company_name?: string | null;
  website_url?: string | null;
  email?: string | null;
  emails?: string | null;
  whatsapp?: string | null;
  phones?: string | null;
  phone?: string | null;
};

export function ClientVisualIdentityContent({
  client,
  dashboardName,
}: {
  client: VisualIdentityClient;
  dashboardName: string;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
        gap: 24,
        alignItems: "start",
      }}
    >
      <ClientLogoUploader
        clientId={client.id}
        clientName={client.name}
        logoUrl={client.logo_url}
        logoSettings={client.logo_settings}
        dashboardName={dashboardName}
      />

      <ClientContactForm
        clientId={client.id}
        initialCompanyName={client.company_name}
        initialWebsiteUrl={client.website_url}
        initialEmail={client.email}
        initialEmails={client.emails}
        initialWhatsapp={client.whatsapp}
        initialPhones={client.phones || client.phone}
      />
    </div>
  );
}
