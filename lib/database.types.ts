export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      alumnos: {
        Row: {
          activo: boolean
          apellido: string | null
          auth_user_id: string | null
          banned_until: string | null
          carrera_id: string | null
          confirmo_facultad: boolean
          created_at: string
          email: string
          email_verificado: boolean
          es_profesor: boolean
          id: string
          nombre: string | null
          updated_at: string
        }
        Insert: {
          activo?: boolean
          apellido?: string | null
          auth_user_id?: string | null
          banned_until?: string | null
          carrera_id?: string | null
          confirmo_facultad?: boolean
          created_at?: string
          email: string
          email_verificado?: boolean
          es_profesor?: boolean
          id?: string
          nombre?: string | null
          updated_at?: string
        }
        Update: {
          activo?: boolean
          apellido?: string | null
          auth_user_id?: string | null
          banned_until?: string | null
          carrera_id?: string | null
          confirmo_facultad?: boolean
          created_at?: string
          email?: string
          email_verificado?: boolean
          es_profesor?: boolean
          id?: string
          nombre?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "alumnos_carrera_id_fkey"
            columns: ["carrera_id"]
            isOneToOne: false
            referencedRelation: "carreras"
            referencedColumns: ["id"]
          },
        ]
      }
      app_settings: {
        Row: {
          booking_window_days: number
          daily_limit_per_product: number
          id: boolean
          min_cancel_minutes: number
          min_duration_minutes: number
          slot_minutes: number
          updated_at: string
        }
        Insert: {
          booking_window_days?: number
          daily_limit_per_product?: number
          id?: boolean
          min_cancel_minutes?: number
          min_duration_minutes?: number
          slot_minutes?: number
          updated_at?: string
        }
        Update: {
          booking_window_days?: number
          daily_limit_per_product?: number
          id?: boolean
          min_cancel_minutes?: number
          min_duration_minutes?: number
          slot_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      campus_hours: {
        Row: {
          campus_id: string
          closes_at: string
          opens_at: string
          weekday: number
        }
        Insert: {
          campus_id: string
          closes_at: string
          opens_at: string
          weekday: number
        }
        Update: {
          campus_id?: string
          closes_at?: string
          opens_at?: string
          weekday?: number
        }
        Relationships: [
          {
            foreignKeyName: "campus_hours_campus_id_fkey"
            columns: ["campus_id"]
            isOneToOne: false
            referencedRelation: "campuses"
            referencedColumns: ["id"]
          },
        ]
      }
      campuses: {
        Row: {
          activo: boolean
          address: string | null
          id: string
          name: string
          salon_devolucion: string | null
        }
        Insert: {
          activo?: boolean
          address?: string | null
          id?: string
          name: string
          salon_devolucion?: string | null
        }
        Update: {
          activo?: boolean
          address?: string | null
          id?: string
          name?: string
          salon_devolucion?: string | null
        }
        Relationships: []
      }
      carreras: {
        Row: {
          activa: boolean
          codigo: string | null
          created_at: string
          description: string | null
          id: string
          nombre: string
          updated_at: string
        }
        Insert: {
          activa?: boolean
          codigo?: string | null
          created_at?: string
          description?: string | null
          id?: string
          nombre: string
          updated_at?: string
        }
        Update: {
          activa?: boolean
          codigo?: string | null
          created_at?: string
          description?: string | null
          id?: string
          nombre?: string
          updated_at?: string
        }
        Relationships: []
      }
      disabled_days: {
        Row: {
          created_at: string
          created_by: string | null
          date: string
          id: string
          reason: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          date: string
          id?: string
          reason?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          date?: string
          id?: string
          reason?: string | null
        }
        Relationships: []
      }
      final_satisfaction_surveys: {
        Row: {
          alumno_id: string
          best_feature: string | null
          comments: string | null
          created_at: string
          equipment_condition_rating: number | null
          id: string
          improvement_area: string | null
          platform_rating: number | null
          reservation_process_rating: number | null
          service_rating: number | null
          support_clarity_rating: number | null
          updated_at: string
          would_recommend: boolean | null
        }
        Insert: {
          alumno_id: string
          best_feature?: string | null
          comments?: string | null
          created_at?: string
          equipment_condition_rating?: number | null
          id?: string
          improvement_area?: string | null
          platform_rating?: number | null
          reservation_process_rating?: number | null
          service_rating?: number | null
          support_clarity_rating?: number | null
          updated_at?: string
          would_recommend?: boolean | null
        }
        Update: {
          alumno_id?: string
          best_feature?: string | null
          comments?: string | null
          created_at?: string
          equipment_condition_rating?: number | null
          id?: string
          improvement_area?: string | null
          platform_rating?: number | null
          reservation_process_rating?: number | null
          service_rating?: number | null
          support_clarity_rating?: number | null
          updated_at?: string
          would_recommend?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "final_satisfaction_surveys_alumno_id_fkey"
            columns: ["alumno_id"]
            isOneToOne: true
            referencedRelation: "alumnos"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_reservations: {
        Row: {
          alumno_id: string
          blocked_range: unknown
          cancellation_reason: string | null
          created_at: string
          end_at: string
          id: string
          product_id: string
          purpose: string | null
          start_at: string
          status: Database["public"]["Enums"]["reservation_status"]
          unit_id: string
          updated_at: string
        }
        Insert: {
          alumno_id: string
          blocked_range: unknown
          cancellation_reason?: string | null
          created_at?: string
          end_at: string
          id?: string
          product_id: string
          purpose?: string | null
          start_at: string
          status?: Database["public"]["Enums"]["reservation_status"]
          unit_id: string
          updated_at?: string
        }
        Update: {
          alumno_id?: string
          blocked_range?: unknown
          cancellation_reason?: string | null
          created_at?: string
          end_at?: string
          id?: string
          product_id?: string
          purpose?: string | null
          start_at?: string
          status?: Database["public"]["Enums"]["reservation_status"]
          unit_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_reservations_alumno_id_fkey"
            columns: ["alumno_id"]
            isOneToOne: false
            referencedRelation: "alumnos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_reservations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_availability"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "inventory_reservations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_reservations_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "inventory_units"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_unit_notes: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          note: string
          unit_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          note: string
          unit_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string
          unit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_unit_notes_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "inventory_units"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_units: {
        Row: {
          asset_code: string | null
          campus_id: string
          created_at: string
          id: string
          product_id: string
          status: Database["public"]["Enums"]["unit_status"]
          unit_code: string
          updated_at: string
        }
        Insert: {
          asset_code?: string | null
          campus_id: string
          created_at?: string
          id?: string
          product_id: string
          status?: Database["public"]["Enums"]["unit_status"]
          unit_code: string
          updated_at?: string
        }
        Update: {
          asset_code?: string | null
          campus_id?: string
          created_at?: string
          id?: string
          product_id?: string
          status?: Database["public"]["Enums"]["unit_status"]
          unit_code?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_units_campus_id_fkey"
            columns: ["campus_id"]
            isOneToOne: false
            referencedRelation: "campuses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_units_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_availability"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "inventory_units_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_images: {
        Row: {
          bytes: number | null
          cloudinary_public_id: string | null
          created_at: string
          format: string | null
          height: number | null
          id: string
          is_main: boolean
          product_id: string
          secure_url: string
          sort_order: number
          width: number | null
        }
        Insert: {
          bytes?: number | null
          cloudinary_public_id?: string | null
          created_at?: string
          format?: string | null
          height?: number | null
          id?: string
          is_main?: boolean
          product_id: string
          secure_url: string
          sort_order?: number
          width?: number | null
        }
        Update: {
          bytes?: number | null
          cloudinary_public_id?: string | null
          created_at?: string
          format?: string | null
          height?: number | null
          id?: string
          is_main?: boolean
          product_id?: string
          secure_url?: string
          sort_order?: number
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_availability"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          buffer_minutes: number
          category: string | null
          created_at: string
          description: string | null
          featured: boolean
          id: string
          max_duration_hours: number
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          buffer_minutes?: number
          category?: string | null
          created_at?: string
          description?: string | null
          featured?: boolean
          id?: string
          max_duration_hours?: number
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          buffer_minutes?: number
          category?: string | null
          created_at?: string
          description?: string | null
          featured?: boolean
          id?: string
          max_duration_hours?: number
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      reservation_status_log: {
        Row: {
          changed_at: string
          changed_by: string | null
          id: string
          new_status: Database["public"]["Enums"]["reservation_status"]
          old_status: Database["public"]["Enums"]["reservation_status"] | null
          reason: string | null
          reservation_id: string
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          id?: string
          new_status: Database["public"]["Enums"]["reservation_status"]
          old_status?: Database["public"]["Enums"]["reservation_status"] | null
          reason?: string | null
          reservation_id: string
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          id?: string
          new_status?: Database["public"]["Enums"]["reservation_status"]
          old_status?: Database["public"]["Enums"]["reservation_status"] | null
          reason?: string | null
          reservation_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reservation_status_log_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "inventory_reservations"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_members: {
        Row: {
          activo: boolean
          created_at: string
          role: Database["public"]["Enums"]["staff_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          activo?: boolean
          created_at?: string
          role: Database["public"]["Enums"]["staff_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          activo?: boolean
          created_at?: string
          role?: Database["public"]["Enums"]["staff_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      staff_shifts: {
        Row: {
          campus_id: string
          ends_at: string
          id: string
          staff_id: string
          starts_at: string
          weekday: number
        }
        Insert: {
          campus_id: string
          ends_at: string
          id?: string
          staff_id: string
          starts_at: string
          weekday: number
        }
        Update: {
          campus_id?: string
          ends_at?: string
          id?: string
          staff_id?: string
          starts_at?: string
          weekday?: number
        }
        Relationships: [
          {
            foreignKeyName: "staff_shifts_campus_id_fkey"
            columns: ["campus_id"]
            isOneToOne: false
            referencedRelation: "campuses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_shifts_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["user_id"]
          },
        ]
      }
    }
    Views: {
      product_availability: {
        Row: {
          active_units: number | null
          campus_id: string | null
          campus_name: string | null
          in_stock: boolean | null
          product_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_units_campus_id_fkey"
            columns: ["campus_id"]
            isOneToOne: false
            referencedRelation: "campuses"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      admin_set_alumno_activo: {
        Args: { p_activo: boolean; p_alumno_id: string }
        Returns: undefined
      }
      admin_set_ban: {
        Args: { p_alumno_id: string; p_banned_until: string }
        Returns: undefined
      }
      available_slots: {
        Args: {
          p_campus_id: string
          p_date: string
          p_duration_minutes: number
          p_product_id: string
        }
        Returns: {
          free: number
          slot_start: string
        }[]
      }
      available_units: {
        Args: {
          p_campus_id: string
          p_duration_minutes: number
          p_product_id: string
          p_start_at: string
        }
        Returns: number
      }
      cancel_reservation: {
        Args: { p_reason: string; p_reservation_id: string }
        Returns: undefined
      }
      create_reservation: {
        Args: {
          p_campus_id: string
          p_duration_minutes: number
          p_product_id: string
          p_purpose: string
          p_start_at: string
        }
        Returns: string
      }
      primer_acceso_personal: {
        Args: never
        Returns: {
          primer_acceso: string
          user_id: string
        }[]
      }
    }
    Enums: {
      reservation_status:
        | "reserved"
        | "active"
        | "cancelled"
        | "completed"
        | "not_picked_up"
        | "not_returned"
      staff_role: "admin" | "operator"
      unit_status: "active" | "maintenance" | "retired"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      reservation_status: [
        "reserved",
        "active",
        "cancelled",
        "completed",
        "not_picked_up",
        "not_returned",
      ],
      staff_role: ["admin", "operator"],
      unit_status: ["active", "maintenance", "retired"],
    },
  },
} as const

