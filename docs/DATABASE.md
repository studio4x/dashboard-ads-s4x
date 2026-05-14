# DATABASE.md
## Modelo de Dados — Dashboard ADS S4X

> ⚠️ Este documento descreve o modelo conceitual. O banco de dados real (Supabase/PostgreSQL) será implementado na Fase 4.

---

## Entidades Principais

### `clients`
```sql
CREATE TABLE clients (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  slug        TEXT UNIQUE NOT NULL,
  logo_url    TEXT,
  industry    TEXT,
  website     TEXT,
  primary_color TEXT DEFAULT '#2563EB',
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);
```

### `dashboards`
```sql
CREATE TABLE dashboards (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id          UUID REFERENCES clients(id) ON DELETE CASCADE,
  title              TEXT NOT NULL,
  slug               TEXT NOT NULL,
  description        TEXT,
  status             TEXT DEFAULT 'draft' CHECK (status IN ('active','draft','archived')),
  date_range_default TEXT DEFAULT 'last_30d',
  created_at         TIMESTAMPTZ DEFAULT now(),
  updated_at         TIMESTAMPTZ DEFAULT now(),
  UNIQUE (client_id, slug)
);
```

### `dashboard_pages`
```sql
CREATE TABLE dashboard_pages (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dashboard_id UUID REFERENCES dashboards(id) ON DELETE CASCADE,
  key          TEXT NOT NULL,
  label        TEXT NOT NULL,
  icon         TEXT,
  "order"      INTEGER DEFAULT 0,
  active       BOOLEAN DEFAULT true
);
```

### `data_sources`
```sql
CREATE TABLE data_sources (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dashboard_id UUID REFERENCES dashboards(id) ON DELETE CASCADE,
  source_type  TEXT NOT NULL,
  label        TEXT NOT NULL,
  config       JSONB DEFAULT '{}',
  status       TEXT DEFAULT 'idle',
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now()
);
```

### `google_sheet_sources`
```sql
CREATE TABLE google_sheet_sources (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data_source_id   UUID REFERENCES data_sources(id) ON DELETE CASCADE,
  spreadsheet_id   TEXT NOT NULL,
  spreadsheet_name TEXT,
  spreadsheet_url  TEXT,
  sync_frequency   TEXT DEFAULT 'daily',
  last_synced_at   TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT now()
);
```

### `sheet_tabs`
```sql
CREATE TABLE sheet_tabs (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sheet_source_id UUID REFERENCES google_sheet_sources(id) ON DELETE CASCADE,
  tab_name       TEXT NOT NULL,
  data_type      TEXT NOT NULL,
  header_row     INTEGER DEFAULT 1,
  data_start_row INTEGER DEFAULT 2,
  range          TEXT,
  active         BOOLEAN DEFAULT true
);
```

### `import_logs`
```sql
CREATE TABLE import_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data_source_id  UUID REFERENCES data_sources(id),
  dashboard_id    UUID REFERENCES dashboards(id),
  client_id       UUID REFERENCES clients(id),
  started_at      TIMESTAMPTZ DEFAULT now(),
  finished_at     TIMESTAMPTZ,
  status          TEXT DEFAULT 'running',
  rows_imported   INTEGER DEFAULT 0,
  rows_error      INTEGER DEFAULT 0,
  error_message   TEXT,
  triggered_by    TEXT DEFAULT 'manual'
);
```

### `users`
```sql
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT UNIQUE NOT NULL,
  name          TEXT,
  role          TEXT DEFAULT 'client' CHECK (role IN ('admin','client','viewer')),
  avatar_url    TEXT,
  created_at    TIMESTAMPTZ DEFAULT now(),
  last_sign_in  TIMESTAMPTZ
);
```

### `client_users`
```sql
CREATE TABLE client_users (
  user_id    UUID REFERENCES users(id) ON DELETE CASCADE,
  client_id  UUID REFERENCES clients(id) ON DELETE CASCADE,
  role       TEXT DEFAULT 'viewer' CHECK (role IN ('owner','viewer')),
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, client_id)
);
```

### `templates`
```sql
CREATE TABLE templates (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  description TEXT,
  preview_url TEXT,
  pages       TEXT[] DEFAULT '{}',
  is_default  BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT now()
);
```

---

## Row Level Security (RLS)

- `clients`: visible only to `client_users` members or `admin` role
- `dashboards`: visible only to clients that own them
- `import_logs`: visible to `admin` role only
- `users`: visible to self + admin
