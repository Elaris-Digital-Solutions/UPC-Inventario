BEGIN;

CREATE TABLE IF NOT EXISTS public.final_satisfaction_surveys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alumno_id INTEGER NOT NULL REFERENCES public.alumnos(id) ON DELETE CASCADE,
    platform_rating SMALLINT NOT NULL CHECK (platform_rating BETWEEN 1 AND 5),
    service_rating SMALLINT NOT NULL CHECK (service_rating BETWEEN 1 AND 5),
    reservation_process_rating SMALLINT NOT NULL CHECK (reservation_process_rating BETWEEN 1 AND 5),
    support_clarity_rating SMALLINT NOT NULL CHECK (support_clarity_rating BETWEEN 1 AND 5),
    equipment_condition_rating SMALLINT NOT NULL CHECK (equipment_condition_rating BETWEEN 1 AND 5),
    would_recommend BOOLEAN NOT NULL,
    best_feature TEXT,
    improvement_area TEXT,
    comments TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_final_satisfaction_surveys_alumno UNIQUE (alumno_id)
);

COMMENT ON TABLE public.final_satisfaction_surveys IS 'Non-anonymous final satisfaction survey about platform and service.';
COMMENT ON COLUMN public.final_satisfaction_surveys.alumno_id IS 'Identified student who submitted the survey (not anonymous).';
COMMENT ON COLUMN public.final_satisfaction_surveys.platform_rating IS 'Student satisfaction score for platform UX (1-5).';
COMMENT ON COLUMN public.final_satisfaction_surveys.service_rating IS 'Student satisfaction score for lending service experience (1-5).';
COMMENT ON COLUMN public.final_satisfaction_surveys.reservation_process_rating IS 'Perception of reservation process simplicity (1-5).';
COMMENT ON COLUMN public.final_satisfaction_surveys.support_clarity_rating IS 'Perception of communication/instructions clarity (1-5).';
COMMENT ON COLUMN public.final_satisfaction_surveys.equipment_condition_rating IS 'Perception of delivered equipment condition (1-5).';
COMMENT ON COLUMN public.final_satisfaction_surveys.would_recommend IS 'Whether student recommends the platform/service.';
COMMENT ON COLUMN public.final_satisfaction_surveys.best_feature IS 'Best perceived feature by student.';
COMMENT ON COLUMN public.final_satisfaction_surveys.improvement_area IS 'Main improvement requested by student.';

CREATE INDEX IF NOT EXISTS idx_final_satisfaction_surveys_alumno
ON public.final_satisfaction_surveys(alumno_id);

ALTER TABLE public.final_satisfaction_surveys ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Final survey read own" ON public.final_satisfaction_surveys;
CREATE POLICY "Final survey read own"
ON public.final_satisfaction_surveys
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Final survey insert own" ON public.final_satisfaction_surveys;
CREATE POLICY "Final survey insert own"
ON public.final_satisfaction_surveys
FOR INSERT
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Final survey update own" ON public.final_satisfaction_surveys;
CREATE POLICY "Final survey update own"
ON public.final_satisfaction_surveys
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

COMMIT;
