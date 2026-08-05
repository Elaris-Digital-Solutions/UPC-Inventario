


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."reservation_status" AS ENUM (
    'reserved',
    'active',
    'cancelled',
    'completed',
    'not_picked_up',
    'not_returned'
);


ALTER TYPE "public"."reservation_status" OWNER TO "postgres";


CREATE TYPE "public"."unit_status" AS ENUM (
    'active',
    'maintenance',
    'retired'
);


ALTER TYPE "public"."unit_status" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_update_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
  BEGIN
    NEW.updated_at = now();
    RETURN NEW;
  END;
  $$;


ALTER FUNCTION "public"."fn_update_updated_at"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."alumnos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" "text" NOT NULL,
    "nombre" "text" NOT NULL,
    "apellido" "text" NOT NULL,
    "carrera_id" "uuid",
    "auth_user_id" "uuid",
    "email_verificado" boolean DEFAULT false NOT NULL,
    "activo" boolean DEFAULT true NOT NULL,
    "banned_until" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."alumnos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."campuses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "address" "text",
    "activo" boolean DEFAULT true NOT NULL
);


ALTER TABLE "public"."campuses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."carreras" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "nombre" "text" NOT NULL,
    "codigo" character varying(10),
    "description" "text",
    "activa" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."carreras" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."disabled_days" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "date" "date" NOT NULL,
    "reason" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."disabled_days" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."final_satisfaction_surveys" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "alumno_id" "uuid" NOT NULL,
    "platform_rating" smallint,
    "service_rating" smallint,
    "reservation_process_rating" smallint,
    "support_clarity_rating" smallint,
    "equipment_condition_rating" smallint,
    "would_recommend" boolean,
    "best_feature" "text",
    "improvement_area" "text",
    "comments" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "final_satisfaction_surveys_equipment_condition_rating_check" CHECK ((("equipment_condition_rating" >= 1) AND ("equipment_condition_rating" <= 5))),
    CONSTRAINT "final_satisfaction_surveys_platform_rating_check" CHECK ((("platform_rating" >= 1) AND ("platform_rating" <= 5))),
    CONSTRAINT "final_satisfaction_surveys_reservation_process_rating_check" CHECK ((("reservation_process_rating" >= 1) AND ("reservation_process_rating" <= 5))),
    CONSTRAINT "final_satisfaction_surveys_service_rating_check" CHECK ((("service_rating" >= 1) AND ("service_rating" <= 5))),
    CONSTRAINT "final_satisfaction_surveys_support_clarity_rating_check" CHECK ((("support_clarity_rating" >= 1) AND ("support_clarity_rating" <= 5)))
);


ALTER TABLE "public"."final_satisfaction_surveys" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."inventory_reservations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "product_id" "uuid" NOT NULL,
    "unit_id" "uuid" NOT NULL,
    "alumno_id" "uuid" NOT NULL,
    "purpose" "text",
    "cancellation_reason" "text",
    "start_at" timestamp with time zone NOT NULL,
    "end_at" timestamp with time zone NOT NULL,
    "status" "public"."reservation_status" DEFAULT 'reserved'::"public"."reservation_status" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "chk_reservation_dates" CHECK (("end_at" > "start_at"))
);


ALTER TABLE "public"."inventory_reservations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."inventory_unit_notes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "unit_id" "uuid" NOT NULL,
    "note" "text" NOT NULL,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."inventory_unit_notes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."inventory_units" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "product_id" "uuid" NOT NULL,
    "campus_id" "uuid" NOT NULL,
    "unit_code" "text" NOT NULL,
    "asset_code" "text",
    "status" "public"."unit_status" DEFAULT 'active'::"public"."unit_status" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."inventory_units" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."products" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "category" "text",
    "description" "text",
    "featured" boolean DEFAULT false NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."products" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."product_availability" AS
 SELECT "p"."id" AS "product_id",
    "iu"."campus_id",
    "c"."name" AS "campus_name",
    "count"(*) FILTER (WHERE ("iu"."status" = 'active'::"public"."unit_status")) AS "active_units",
    ("count"(*) FILTER (WHERE ("iu"."status" = 'active'::"public"."unit_status")) > 0) AS "in_stock"
   FROM (("public"."products" "p"
     LEFT JOIN "public"."inventory_units" "iu" ON (("iu"."product_id" = "p"."id")))
     LEFT JOIN "public"."campuses" "c" ON (("c"."id" = "iu"."campus_id")))
  GROUP BY "p"."id", "iu"."campus_id", "c"."name";


ALTER VIEW "public"."product_availability" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."product_images" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "product_id" "uuid" NOT NULL,
    "cloudinary_public_id" "text",
    "secure_url" "text" NOT NULL,
    "format" "text",
    "bytes" integer,
    "width" integer,
    "height" integer,
    "is_main" boolean DEFAULT false NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."product_images" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."reservation_status_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "reservation_id" "uuid" NOT NULL,
    "old_status" "public"."reservation_status",
    "new_status" "public"."reservation_status" NOT NULL,
    "reason" "text",
    "changed_by" "uuid",
    "changed_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."reservation_status_log" OWNER TO "postgres";


ALTER TABLE ONLY "public"."alumnos"
    ADD CONSTRAINT "alumnos_auth_user_id_key" UNIQUE ("auth_user_id");



ALTER TABLE ONLY "public"."alumnos"
    ADD CONSTRAINT "alumnos_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."alumnos"
    ADD CONSTRAINT "alumnos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."campuses"
    ADD CONSTRAINT "campuses_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."campuses"
    ADD CONSTRAINT "campuses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."carreras"
    ADD CONSTRAINT "carreras_codigo_key" UNIQUE ("codigo");



ALTER TABLE ONLY "public"."carreras"
    ADD CONSTRAINT "carreras_nombre_key" UNIQUE ("nombre");



ALTER TABLE ONLY "public"."carreras"
    ADD CONSTRAINT "carreras_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."disabled_days"
    ADD CONSTRAINT "disabled_days_date_key" UNIQUE ("date");



ALTER TABLE ONLY "public"."disabled_days"
    ADD CONSTRAINT "disabled_days_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."final_satisfaction_surveys"
    ADD CONSTRAINT "final_satisfaction_surveys_alumno_id_key" UNIQUE ("alumno_id");



ALTER TABLE ONLY "public"."final_satisfaction_surveys"
    ADD CONSTRAINT "final_satisfaction_surveys_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inventory_reservations"
    ADD CONSTRAINT "inventory_reservations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inventory_unit_notes"
    ADD CONSTRAINT "inventory_unit_notes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inventory_units"
    ADD CONSTRAINT "inventory_units_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inventory_units"
    ADD CONSTRAINT "inventory_units_product_id_unit_code_key" UNIQUE ("product_id", "unit_code");



ALTER TABLE ONLY "public"."product_images"
    ADD CONSTRAINT "product_images_cloudinary_public_id_key" UNIQUE ("cloudinary_public_id");



ALTER TABLE ONLY "public"."product_images"
    ADD CONSTRAINT "product_images_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reservation_status_log"
    ADD CONSTRAINT "reservation_status_log_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_inventory_units_campus_status" ON "public"."inventory_units" USING "btree" ("campus_id", "status");



CREATE INDEX "idx_inventory_units_product_id" ON "public"."inventory_units" USING "btree" ("product_id");



CREATE INDEX "idx_product_images_product_id" ON "public"."product_images" USING "btree" ("product_id", "sort_order");



CREATE INDEX "idx_reservations_alumno_id" ON "public"."inventory_reservations" USING "btree" ("alumno_id");



CREATE INDEX "idx_reservations_start_at" ON "public"."inventory_reservations" USING "btree" ("start_at" DESC);



CREATE INDEX "idx_reservations_unit_status_dates" ON "public"."inventory_reservations" USING "btree" ("unit_id", "status", "start_at", "end_at");



CREATE INDEX "idx_unit_notes_unit_id_date" ON "public"."inventory_unit_notes" USING "btree" ("unit_id", "created_at" DESC);



CREATE OR REPLACE TRIGGER "trg_alumnos_updated_at" BEFORE UPDATE ON "public"."alumnos" FOR EACH ROW EXECUTE FUNCTION "public"."fn_update_updated_at"();



CREATE OR REPLACE TRIGGER "trg_final_satisfaction_surveys_updated_at" BEFORE UPDATE ON "public"."final_satisfaction_surveys" FOR EACH ROW EXECUTE FUNCTION "public"."fn_update_updated_at"();



CREATE OR REPLACE TRIGGER "trg_inventory_reservations_updated_at" BEFORE UPDATE ON "public"."inventory_reservations" FOR EACH ROW EXECUTE FUNCTION "public"."fn_update_updated_at"();



CREATE OR REPLACE TRIGGER "trg_inventory_units_updated_at" BEFORE UPDATE ON "public"."inventory_units" FOR EACH ROW EXECUTE FUNCTION "public"."fn_update_updated_at"();



CREATE OR REPLACE TRIGGER "trg_products_updated_at" BEFORE UPDATE ON "public"."products" FOR EACH ROW EXECUTE FUNCTION "public"."fn_update_updated_at"();



ALTER TABLE ONLY "public"."alumnos"
    ADD CONSTRAINT "alumnos_auth_user_id_fkey" FOREIGN KEY ("auth_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."alumnos"
    ADD CONSTRAINT "alumnos_carrera_id_fkey" FOREIGN KEY ("carrera_id") REFERENCES "public"."carreras"("id");



ALTER TABLE ONLY "public"."disabled_days"
    ADD CONSTRAINT "disabled_days_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."final_satisfaction_surveys"
    ADD CONSTRAINT "final_satisfaction_surveys_alumno_id_fkey" FOREIGN KEY ("alumno_id") REFERENCES "public"."alumnos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."inventory_reservations"
    ADD CONSTRAINT "inventory_reservations_alumno_id_fkey" FOREIGN KEY ("alumno_id") REFERENCES "public"."alumnos"("id");



ALTER TABLE ONLY "public"."inventory_reservations"
    ADD CONSTRAINT "inventory_reservations_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id");



ALTER TABLE ONLY "public"."inventory_reservations"
    ADD CONSTRAINT "inventory_reservations_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "public"."inventory_units"("id");



ALTER TABLE ONLY "public"."inventory_unit_notes"
    ADD CONSTRAINT "inventory_unit_notes_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."inventory_unit_notes"
    ADD CONSTRAINT "inventory_unit_notes_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "public"."inventory_units"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."inventory_units"
    ADD CONSTRAINT "inventory_units_campus_id_fkey" FOREIGN KEY ("campus_id") REFERENCES "public"."campuses"("id");



ALTER TABLE ONLY "public"."inventory_units"
    ADD CONSTRAINT "inventory_units_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."product_images"
    ADD CONSTRAINT "product_images_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reservation_status_log"
    ADD CONSTRAINT "reservation_status_log_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."reservation_status_log"
    ADD CONSTRAINT "reservation_status_log_reservation_id_fkey" FOREIGN KEY ("reservation_id") REFERENCES "public"."inventory_reservations"("id") ON DELETE CASCADE;



ALTER TABLE "public"."alumnos" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "alumnos_select_own" ON "public"."alumnos" FOR SELECT USING (("auth_user_id" = "auth"."uid"()));



CREATE POLICY "alumnos_update_own" ON "public"."alumnos" FOR UPDATE USING (("auth_user_id" = "auth"."uid"()));



ALTER TABLE "public"."campuses" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "campuses_select_public" ON "public"."campuses" FOR SELECT USING (true);



ALTER TABLE "public"."carreras" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "carreras_select_public" ON "public"."carreras" FOR SELECT USING (true);



ALTER TABLE "public"."disabled_days" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "disabled_days_select_auth" ON "public"."disabled_days" FOR SELECT USING (("auth"."uid"() IS NOT NULL));



ALTER TABLE "public"."final_satisfaction_surveys" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."inventory_reservations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."inventory_unit_notes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."inventory_units" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "inventory_units_select_auth" ON "public"."inventory_units" FOR SELECT USING (("auth"."uid"() IS NOT NULL));



ALTER TABLE "public"."product_images" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "product_images_select_public" ON "public"."product_images" FOR SELECT USING (true);



ALTER TABLE "public"."products" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "products_select_public" ON "public"."products" FOR SELECT USING (true);



ALTER TABLE "public"."reservation_status_log" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "reservations_select_own" ON "public"."inventory_reservations" FOR SELECT USING (("alumno_id" IN ( SELECT "alumnos"."id"
   FROM "public"."alumnos"
  WHERE ("alumnos"."auth_user_id" = "auth"."uid"()))));



CREATE POLICY "surveys_insert_own" ON "public"."final_satisfaction_surveys" FOR INSERT WITH CHECK (("alumno_id" IN ( SELECT "alumnos"."id"
   FROM "public"."alumnos"
  WHERE ("alumnos"."auth_user_id" = "auth"."uid"()))));



CREATE POLICY "surveys_select_own" ON "public"."final_satisfaction_surveys" FOR SELECT USING (("alumno_id" IN ( SELECT "alumnos"."id"
   FROM "public"."alumnos"
  WHERE ("alumnos"."auth_user_id" = "auth"."uid"()))));



CREATE POLICY "surveys_update_own" ON "public"."final_satisfaction_surveys" FOR UPDATE USING (("alumno_id" IN ( SELECT "alumnos"."id"
   FROM "public"."alumnos"
  WHERE ("alumnos"."auth_user_id" = "auth"."uid"()))));



CREATE POLICY "unit_notes_select_auth" ON "public"."inventory_unit_notes" FOR SELECT USING (("auth"."uid"() IS NOT NULL));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";






















































































































































GRANT ALL ON FUNCTION "public"."fn_update_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_update_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_update_updated_at"() TO "service_role";


















GRANT ALL ON TABLE "public"."alumnos" TO "anon";
GRANT ALL ON TABLE "public"."alumnos" TO "authenticated";
GRANT ALL ON TABLE "public"."alumnos" TO "service_role";



GRANT ALL ON TABLE "public"."campuses" TO "anon";
GRANT ALL ON TABLE "public"."campuses" TO "authenticated";
GRANT ALL ON TABLE "public"."campuses" TO "service_role";



GRANT ALL ON TABLE "public"."carreras" TO "anon";
GRANT ALL ON TABLE "public"."carreras" TO "authenticated";
GRANT ALL ON TABLE "public"."carreras" TO "service_role";



GRANT ALL ON TABLE "public"."disabled_days" TO "anon";
GRANT ALL ON TABLE "public"."disabled_days" TO "authenticated";
GRANT ALL ON TABLE "public"."disabled_days" TO "service_role";



GRANT ALL ON TABLE "public"."final_satisfaction_surveys" TO "anon";
GRANT ALL ON TABLE "public"."final_satisfaction_surveys" TO "authenticated";
GRANT ALL ON TABLE "public"."final_satisfaction_surveys" TO "service_role";



GRANT ALL ON TABLE "public"."inventory_reservations" TO "anon";
GRANT ALL ON TABLE "public"."inventory_reservations" TO "authenticated";
GRANT ALL ON TABLE "public"."inventory_reservations" TO "service_role";



GRANT ALL ON TABLE "public"."inventory_unit_notes" TO "anon";
GRANT ALL ON TABLE "public"."inventory_unit_notes" TO "authenticated";
GRANT ALL ON TABLE "public"."inventory_unit_notes" TO "service_role";



GRANT ALL ON TABLE "public"."inventory_units" TO "anon";
GRANT ALL ON TABLE "public"."inventory_units" TO "authenticated";
GRANT ALL ON TABLE "public"."inventory_units" TO "service_role";



GRANT ALL ON TABLE "public"."products" TO "anon";
GRANT ALL ON TABLE "public"."products" TO "authenticated";
GRANT ALL ON TABLE "public"."products" TO "service_role";



GRANT ALL ON TABLE "public"."product_availability" TO "anon";
GRANT ALL ON TABLE "public"."product_availability" TO "authenticated";
GRANT ALL ON TABLE "public"."product_availability" TO "service_role";



GRANT ALL ON TABLE "public"."product_images" TO "anon";
GRANT ALL ON TABLE "public"."product_images" TO "authenticated";
GRANT ALL ON TABLE "public"."product_images" TO "service_role";



GRANT ALL ON TABLE "public"."reservation_status_log" TO "anon";
GRANT ALL ON TABLE "public"."reservation_status_log" TO "authenticated";
GRANT ALL ON TABLE "public"."reservation_status_log" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































