// ==============================================================================
// SCHEMA COMPLETO SUPABASE POSTGRESQL & POLÍTICAS DE SEGURANÇA (RLS)
// SISTEMA DE SOLICITAÇÃO E GESTÃO DE FÉRIAS CLT
// ==============================================================================

export const SUPABASE_STORAGE_SQL = `-- ==============================================================================
-- POLÍTICAS DE ARMAZENAMENTO ATIVADAS (SUPABASE STORAGE & RLS)
-- BUCKETS DE RECIBOS CLT, COMPROVANTES E DOCUMENTOS DE FÉRIAS
-- ==============================================================================

-- 1. GARANTIR EXTENSÕES E TABELA DE COLABORADORES (Evita erro 42P01 caso ainda não criada)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('employee', 'manager', 'hr')),
    job_title VARCHAR(150) NOT NULL,
    department VARCHAR(100) NOT NULL,
    admission_date DATE NOT NULL DEFAULT CURRENT_DATE,
    base_salary NUMERIC(12, 2) NOT NULL DEFAULT 3500.00 CHECK (base_salary > 0),
    manager_id UUID,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir leitura de colaboradores autenticados" ON public.employees;
CREATE POLICY "Permitir leitura de colaboradores autenticados" 
ON public.employees FOR SELECT TO authenticated USING (true);

-- 2. CRIAÇÃO DOS BUCKETS DE ARMAZENAMENTO
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('recibos-ferias', 'recibos-ferias', false, 10485760, ARRAY['application/pdf']),
  ('comprovantes-ferias', 'comprovantes-ferias', false, 10485760, ARRAY['application/pdf', 'image/jpeg', 'image/png']),
  ('avatars', 'avatars', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET 
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ------------------------------------------------------------------------------
-- 3. POLÍTICAS DE ARMAZENAMENTO PARA: RECIBOS-FERIAS (DOCUMENTOS LEGAIS CLT)
-- ------------------------------------------------------------------------------

DROP POLICY IF EXISTS "Colaborador baixa seus próprios recibos de férias" ON storage.objects;
CREATE POLICY "Colaborador baixa seus próprios recibos de férias"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'recibos-ferias' 
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM public.employees 
      WHERE auth_user_id = auth.uid() 
      AND (role = 'hr' OR id::text = (storage.foldername(name))[1])
    )
  )
);

DROP POLICY IF EXISTS "RH faz upload de recibos oficiais de férias" ON storage.objects;
CREATE POLICY "RH faz upload de recibos oficiais de férias"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'recibos-ferias'
  AND EXISTS (
    SELECT 1 FROM public.employees 
    WHERE auth_user_id = auth.uid() AND role = 'hr'
  )
);

DROP POLICY IF EXISTS "RH atualiza recibos oficiais de férias" ON storage.objects;
CREATE POLICY "RH atualiza recibos oficiais de férias"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'recibos-ferias'
  AND EXISTS (
    SELECT 1 FROM public.employees 
    WHERE auth_user_id = auth.uid() AND role = 'hr'
  )
);

DROP POLICY IF EXISTS "Apenas RH pode remover documentos de recibos" ON storage.objects;
CREATE POLICY "Apenas RH pode remover documentos de recibos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'recibos-ferias'
  AND EXISTS (
    SELECT 1 FROM public.employees 
    WHERE auth_user_id = auth.uid() AND role = 'hr'
  )
);

-- ------------------------------------------------------------------------------
-- 4. POLÍTICAS DE ARMAZENAMENTO PARA: COMPROVANTES-FERIAS (ANEXOS E ATESTADOS)
-- ------------------------------------------------------------------------------

DROP POLICY IF EXISTS "Colaborador envia comprovantes em sua pasta" ON storage.objects;
CREATE POLICY "Colaborador envia comprovantes em sua pasta"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'comprovantes-ferias'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Colaborador visualiza seus comprovantes" ON storage.objects;
CREATE POLICY "Colaborador visualiza seus comprovantes"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'comprovantes-ferias'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Gestor visualiza comprovantes do departamento" ON storage.objects;
CREATE POLICY "Gestor visualiza comprovantes do departamento"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'comprovantes-ferias'
  AND EXISTS (
    SELECT 1 FROM public.employees gestor
    JOIN public.employees sub ON sub.auth_user_id::text = (storage.foldername(storage.objects.name))[1]
    WHERE gestor.auth_user_id = auth.uid()
      AND gestor.role = 'manager'
      AND gestor.department = sub.department
  )
);

DROP POLICY IF EXISTS "RH visualiza todos os comprovantes anexados" ON storage.objects;
CREATE POLICY "RH visualiza todos os comprovantes anexados"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'comprovantes-ferias'
  AND EXISTS (
    SELECT 1 FROM public.employees 
    WHERE auth_user_id = auth.uid() AND role = 'hr'
  )
);

-- ------------------------------------------------------------------------------
-- 5. POLÍTICAS DE ARMAZENAMENTO PARA: AVATARS (FOTOS PÚBLICAS)
-- ------------------------------------------------------------------------------

DROP POLICY IF EXISTS "Avatares são visíveis para todos os usuários" ON storage.objects;
CREATE POLICY "Avatares são visíveis para todos os usuários"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Usuário faz upload de seu próprio avatar" ON storage.objects;
CREATE POLICY "Usuário faz upload de seu próprio avatar"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
`;

export const SUPABASE_SQL_SCHEMA = `-- ==============================================================================
-- SCHEMA COMPLETO UNIFICADO SUPABASE POSTGRESQL & POLÍTICAS DE SEGURANÇA (RLS)
-- SISTEMA DE SOLICITAÇÃO E GESTÃO DE FÉRIAS CLT
-- ORDEM CORRETA DE CRIAÇÃO: EXTENSÕES -> TABELAS -> RLS -> TRIGGERS -> STORAGE
-- ==============================================================================

-- 1. Habilitar extensões
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Tabela de Colaboradores (Employees)
CREATE TABLE IF NOT EXISTS public.employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('employee', 'manager', 'hr')),
    job_title VARCHAR(150) NOT NULL,
    department VARCHAR(100) NOT NULL,
    admission_date DATE NOT NULL DEFAULT CURRENT_DATE,
    base_salary NUMERIC(12, 2) NOT NULL CHECK (base_salary > 0),
    manager_id UUID REFERENCES public.employees(id),
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Tabela de Períodos Aquisitivos (Acquisition Periods - CLT Art. 130)
CREATE TABLE IF NOT EXISTS public.acquisition_periods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    concessive_limit DATE NOT NULL, -- CLT Art. 137: limite antes de dobrar
    total_entitlement_days INTEGER DEFAULT 30 NOT NULL,
    days_taken INTEGER DEFAULT 0 NOT NULL,
    days_scheduled INTEGER DEFAULT 0 NOT NULL,
    days_sold INTEGER DEFAULT 0 NOT NULL, -- Abono pecuniário (CLT Art. 143)
    remaining_days INTEGER GENERATED ALWAYS AS (
        total_entitlement_days - (days_taken + days_scheduled + days_sold)
    ) STORED,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'expired', 'closed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT check_dates_order CHECK (end_date > start_date AND concessive_limit > end_date)
);

-- 4. Tabela de Solicitações de Férias (Vacation Requests)
CREATE TABLE IF NOT EXISTS public.vacation_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    acquisition_period_id UUID NOT NULL REFERENCES public.acquisition_periods(id) ON DELETE RESTRICT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    return_date DATE NOT NULL,
    days_count INTEGER NOT NULL CHECK (days_count >= 5), -- CLT Art. 134 § 1º: min 5 dias
    has_abono_pecuniario BOOLEAN DEFAULT false NOT NULL,
    abono_days_count INTEGER DEFAULT 0 CHECK (abono_days_count <= 10), -- CLT Art. 143: max 1/3 (10d)
    request_thirteenth_advance BOOLEAN DEFAULT false NOT NULL, -- Lei 4.749/65: adiantamento 13º
    notes TEXT,
    status VARCHAR(50) DEFAULT 'pending_manager' NOT NULL 
        CHECK (status IN ('pending_manager', 'pending_hr', 'approved', 'rejected', 'cancelled')),
    
    -- Memória de Cálculo Financeiro CLT Art. 145
    gross_vacation_pay NUMERIC(12, 2) NOT NULL,
    constitutional_bonus NUMERIC(12, 2) NOT NULL, -- 1/3 CF Art. 7º XVII
    abono_amount NUMERIC(12, 2) DEFAULT 0.00 NOT NULL,
    abono_bonus NUMERIC(12, 2) DEFAULT 0.00 NOT NULL,
    thirteenth_advance NUMERIC(12, 2) DEFAULT 0.00 NOT NULL,
    estimated_inss NUMERIC(12, 2) DEFAULT 0.00 NOT NULL,
    estimated_irrf NUMERIC(12, 2) DEFAULT 0.00 NOT NULL,
    total_deductions NUMERIC(12, 2) DEFAULT 0.00 NOT NULL,
    net_total NUMERIC(12, 2) NOT NULL,
    payment_deadline_date DATE NOT NULL, -- 2 dias antes do início (CLT Art. 145)
    
    -- Trilha de Auditoria & Aprovações
    manager_approval_id UUID REFERENCES public.employees(id),
    manager_approved_at TIMESTAMP WITH TIME ZONE,
    manager_feedback TEXT,
    
    hr_approval_id UUID REFERENCES public.employees(id),
    hr_approved_at TIMESTAMP WITH TIME ZONE,
    hr_feedback TEXT,
    
    rejection_reason TEXT,
    rejected_by_id UUID REFERENCES public.employees(id),
    rejected_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    CONSTRAINT check_vacation_dates CHECK (end_date >= start_date)
);

-- 5. Tabela de Documentos e Recibos Armazenados (Storage Metadata)
CREATE TABLE IF NOT EXISTS public.vacation_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vacation_request_id UUID REFERENCES public.vacation_requests(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    bucket_id TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    document_type TEXT NOT NULL CHECK (document_type IN ('recibo_oficial', 'aviso_previo', 'comprovante_viagem', 'atestado_medico', 'acordo_individual')),
    file_name TEXT NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    mime_type TEXT NOT NULL,
    legal_retention_until DATE DEFAULT (CURRENT_DATE + INTERVAL '5 years') NOT NULL, -- CLT Art. 11: 5 anos
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==============================================================================
-- 6. POLÍTICAS DE SEGURANÇA SQL (ROW LEVEL SECURITY - RLS) NAS TABELAS
-- ==============================================================================

ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.acquisition_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vacation_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vacation_documents ENABLE ROW LEVEL SECURITY;

-- POLÍTICAS: EMPLOYEES
DROP POLICY IF EXISTS "Permitir leitura de colaboradores autenticados" ON public.employees;
CREATE POLICY "Permitir leitura de colaboradores autenticados" 
ON public.employees FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "RH pode gerenciar dados de colaboradores" ON public.employees;
CREATE POLICY "RH pode gerenciar dados de colaboradores" 
ON public.employees FOR ALL TO authenticated 
USING (
    EXISTS (SELECT 1 FROM public.employees WHERE auth_user_id = auth.uid() AND role = 'hr')
);

-- POLÍTICAS: ACQUISITION_PERIODS
DROP POLICY IF EXISTS "Colaborador visualiza seus próprios períodos aquisitivos" ON public.acquisition_periods;
CREATE POLICY "Colaborador visualiza seus próprios períodos aquisitivos" 
ON public.acquisition_periods FOR SELECT TO authenticated 
USING (
    employee_id IN (SELECT id FROM public.employees WHERE auth_user_id = auth.uid())
    OR EXISTS (
        SELECT 1 FROM public.employees current_emp
        JOIN public.employees target_emp ON target_emp.id = acquisition_periods.employee_id
        WHERE current_emp.auth_user_id = auth.uid() 
          AND (current_emp.role = 'hr' OR (current_emp.role = 'manager' AND current_emp.department = target_emp.department))
    )
);

-- POLÍTICAS: VACATION_REQUESTS
DROP POLICY IF EXISTS "Controle de Leitura de Férias por Cargo e Departamento" ON public.vacation_requests;
CREATE POLICY "Controle de Leitura de Férias por Cargo e Departamento" 
ON public.vacation_requests FOR SELECT TO authenticated 
USING (
    employee_id IN (SELECT id FROM public.employees WHERE auth_user_id = auth.uid())
    OR EXISTS (
        SELECT 1 FROM public.employees current_emp
        JOIN public.employees req_emp ON req_emp.id = vacation_requests.employee_id
        WHERE current_emp.auth_user_id = auth.uid() 
          AND current_emp.role = 'manager' 
          AND current_emp.department = req_emp.department
    )
    OR EXISTS (
        SELECT 1 FROM public.employees WHERE auth_user_id = auth.uid() AND role = 'hr'
    )
);

DROP POLICY IF EXISTS "Colaborador cria apenas suas próprias solicitações" ON public.vacation_requests;
CREATE POLICY "Colaborador cria apenas suas próprias solicitações" 
ON public.vacation_requests FOR INSERT TO authenticated 
WITH CHECK (
    employee_id IN (SELECT id FROM public.employees WHERE auth_user_id = auth.uid())
);

DROP POLICY IF EXISTS "Gestor atualiza pedidos pendentes do seu time" ON public.vacation_requests;
CREATE POLICY "Gestor atualiza pedidos pendentes do seu time" 
ON public.vacation_requests FOR UPDATE TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.employees current_emp
        JOIN public.employees req_emp ON req_emp.id = vacation_requests.employee_id
        WHERE current_emp.auth_user_id = auth.uid() 
          AND current_emp.role = 'manager' 
          AND current_emp.department = req_emp.department
    )
    AND status = 'pending_manager'
);

DROP POLICY IF EXISTS "RH homologa ou rejeita solicitações de férias" ON public.vacation_requests;
CREATE POLICY "RH homologa ou rejeita solicitações de férias" 
ON public.vacation_requests FOR UPDATE TO authenticated 
USING (
    EXISTS (SELECT 1 FROM public.employees WHERE auth_user_id = auth.uid() AND role = 'hr')
);

-- POLÍTICAS: VACATION_DOCUMENTS
DROP POLICY IF EXISTS "Colaborador acessa seus documentos arquivados" ON public.vacation_documents;
CREATE POLICY "Colaborador acessa seus documentos arquivados"
ON public.vacation_documents FOR SELECT TO authenticated
USING (
    employee_id IN (SELECT id FROM public.employees WHERE auth_user_id = auth.uid())
    OR EXISTS (
        SELECT 1 FROM public.employees WHERE auth_user_id = auth.uid() AND role = 'hr'
    )
);

-- ==============================================================================
-- 7. FUNÇÃO E TRIGGER SQL PARA VALIDAÇÃO AUTOMÁTICA CLT (Art. 134 § 3º)
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.check_clt_vacation_rules()
RETURNS TRIGGER AS $$
DECLARE
    start_day_of_week INTEGER;
BEGIN
    start_day_of_week := EXTRACT(DOW FROM NEW.start_date);

    IF start_day_of_week IN (4, 5, 6, 0) THEN
        RAISE EXCEPTION 'CLT Art. 134 § 3º: Início de férias vedado em quinta-feira, sexta-feira ou finais de semana.';
    END IF;

    IF NEW.days_count < 5 THEN
        RAISE EXCEPTION 'CLT Art. 134 § 1º: Nenhum período de férias pode ser menor que 5 dias corridos.';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validate_clt_vacation ON public.vacation_requests;
CREATE TRIGGER trg_validate_clt_vacation
BEFORE INSERT OR UPDATE ON public.vacation_requests
FOR EACH ROW
EXECUTE FUNCTION public.check_clt_vacation_rules();

-- ==============================================================================
-- 8. STORAGE BUCKETS E POLÍTICAS DE ARMAZENAMENTO RLS
-- ==============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('recibos-ferias', 'recibos-ferias', false, 10485760, ARRAY['application/pdf']),
  ('comprovantes-ferias', 'comprovantes-ferias', false, 10485760, ARRAY['application/pdf', 'image/jpeg', 'image/png']),
  ('avatars', 'avatars', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET 
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Políticas de Armazenamento
DROP POLICY IF EXISTS "Colaborador baixa seus próprios recibos de férias" ON storage.objects;
CREATE POLICY "Colaborador baixa seus próprios recibos de férias"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'recibos-ferias' 
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM public.employees 
      WHERE auth_user_id = auth.uid() 
      AND (role = 'hr' OR id::text = (storage.foldername(name))[1])
    )
  )
);

DROP POLICY IF EXISTS "RH faz upload de recibos oficiais de férias" ON storage.objects;
CREATE POLICY "RH faz upload de recibos oficiais de férias"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'recibos-ferias'
  AND EXISTS (SELECT 1 FROM public.employees WHERE auth_user_id = auth.uid() AND role = 'hr')
);

DROP POLICY IF EXISTS "RH atualiza recibos oficiais de férias" ON storage.objects;
CREATE POLICY "RH atualiza recibos oficiais de férias"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'recibos-ferias'
  AND EXISTS (SELECT 1 FROM public.employees WHERE auth_user_id = auth.uid() AND role = 'hr')
);

DROP POLICY IF EXISTS "Apenas RH pode remover documentos de recibos" ON storage.objects;
CREATE POLICY "Apenas RH pode remover documentos de recibos"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'recibos-ferias'
  AND EXISTS (SELECT 1 FROM public.employees WHERE auth_user_id = auth.uid() AND role = 'hr')
);

DROP POLICY IF EXISTS "Colaborador envia comprovantes em sua pasta" ON storage.objects;
CREATE POLICY "Colaborador envia comprovantes em sua pasta"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'comprovantes-ferias'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Colaborador visualiza seus comprovantes" ON storage.objects;
CREATE POLICY "Colaborador visualiza seus comprovantes"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'comprovantes-ferias'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Gestor visualiza comprovantes do departamento" ON storage.objects;
CREATE POLICY "Gestor visualiza comprovantes do departamento"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'comprovantes-ferias'
  AND EXISTS (
    SELECT 1 FROM public.employees gestor
    JOIN public.employees sub ON sub.auth_user_id::text = (storage.foldername(storage.objects.name))[1]
    WHERE gestor.auth_user_id = auth.uid()
      AND gestor.role = 'manager'
      AND gestor.department = sub.department
  )
);

DROP POLICY IF EXISTS "RH visualiza todos os comprovantes anexados" ON storage.objects;
CREATE POLICY "RH visualiza todos os comprovantes anexados"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'comprovantes-ferias'
  AND EXISTS (SELECT 1 FROM public.employees WHERE auth_user_id = auth.uid() AND role = 'hr')
);

DROP POLICY IF EXISTS "Avatares são visíveis para todos os usuários" ON storage.objects;
CREATE POLICY "Avatares são visíveis para todos os usuários"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Usuário faz upload de seu próprio avatar" ON storage.objects;
CREATE POLICY "Usuário faz upload de seu próprio avatar"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
`;
