export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      access_logs: {
        Row: {
          access_type: string
          action: string
          categories: string[]
          created_at: string
          id: string
          medical_id: string | null
          patient_id: string | null
          provider_id: string | null
          provider_name: string | null
          reason: string | null
          success: boolean
          verification_result: string | null
        }
        Insert: {
          access_type?: string
          action: string
          categories?: string[]
          created_at?: string
          id?: string
          medical_id?: string | null
          patient_id?: string | null
          provider_id?: string | null
          provider_name?: string | null
          reason?: string | null
          success?: boolean
          verification_result?: string | null
        }
        Update: {
          access_type?: string
          action?: string
          categories?: string[]
          created_at?: string
          id?: string
          medical_id?: string | null
          patient_id?: string | null
          provider_id?: string | null
          provider_name?: string | null
          reason?: string | null
          success?: boolean
          verification_result?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "access_logs_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "access_logs_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      allergies: {
        Row: {
          allergen: string
          created_at: string
          id: string
          patient_id: string
          reaction: string | null
          severity: string
        }
        Insert: {
          allergen: string
          created_at?: string
          id?: string
          patient_id: string
          reaction?: string | null
          severity?: string
        }
        Update: {
          allergen?: string
          created_at?: string
          id?: string
          patient_id?: string
          reaction?: string | null
          severity?: string
        }
        Relationships: [
          {
            foreignKeyName: "allergies_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      conditions: {
        Row: {
          created_at: string
          critical: boolean
          diagnosis_date: string | null
          id: string
          name: string
          notes: string | null
          patient_id: string
          status: string
        }
        Insert: {
          created_at?: string
          critical?: boolean
          diagnosis_date?: string | null
          id?: string
          name: string
          notes?: string | null
          patient_id: string
          status?: string
        }
        Update: {
          created_at?: string
          critical?: boolean
          diagnosis_date?: string | null
          id?: string
          name?: string
          notes?: string | null
          patient_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "conditions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      consents: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          patient_id: string
          permissions: string[]
          provider_id: string
          purpose: string
          revoked_at: string | null
          status: Database["public"]["Enums"]["consent_status"]
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          patient_id: string
          permissions?: string[]
          provider_id: string
          purpose?: string
          revoked_at?: string | null
          status?: Database["public"]["Enums"]["consent_status"]
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          patient_id?: string
          permissions?: string[]
          provider_id?: string
          purpose?: string
          revoked_at?: string | null
          status?: Database["public"]["Enums"]["consent_status"]
        }
        Relationships: [
          {
            foreignKeyName: "consents_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consents_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          created_at: string
          doc_type: string
          file_name: string
          id: string
          patient_id: string
          storage_path: string | null
        }
        Insert: {
          created_at?: string
          doc_type?: string
          file_name: string
          id?: string
          patient_id: string
          storage_path?: string | null
        }
        Update: {
          created_at?: string
          doc_type?: string
          file_name?: string
          id?: string
          patient_id?: string
          storage_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      hospitals: {
        Row: {
          address: string | null
          ambulance: boolean
          created_at: string
          emergency: boolean
          id: string
          latitude: number
          longitude: number
          name: string
          open_24h: boolean
          phone: string | null
          trauma: boolean
        }
        Insert: {
          address?: string | null
          ambulance?: boolean
          created_at?: string
          emergency?: boolean
          id?: string
          latitude: number
          longitude: number
          name: string
          open_24h?: boolean
          phone?: string | null
          trauma?: boolean
        }
        Update: {
          address?: string | null
          ambulance?: boolean
          created_at?: string
          emergency?: boolean
          id?: string
          latitude?: number
          longitude?: number
          name?: string
          open_24h?: boolean
          phone?: string | null
          trauma?: boolean
        }
        Relationships: []
      }
      medications: {
        Row: {
          active: boolean
          created_at: string
          dosage: string | null
          end_date: string | null
          frequency: string | null
          id: string
          name: string
          patient_id: string
          start_date: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          dosage?: string | null
          end_date?: string | null
          frequency?: string | null
          id?: string
          name: string
          patient_id: string
          start_date?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          dosage?: string | null
          end_date?: string | null
          frequency?: string | null
          id?: string
          name?: string
          patient_id?: string
          start_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "medications_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patients: {
        Row: {
          address: string | null
          blood_group: string | null
          date_of_birth: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          gender: string | null
          id: string
          medical_id: string
          phone: string | null
          rh_factor: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          blood_group?: string | null
          date_of_birth?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          gender?: string | null
          id: string
          medical_id?: string
          phone?: string | null
          rh_factor?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          blood_group?: string | null
          date_of_birth?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          gender?: string | null
          id?: string
          medical_id?: string
          phone?: string | null
          rh_factor?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "patients_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string
          id: string
          organization: string | null
          specialty: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string
          id: string
          organization?: string | null
          specialty?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          organization?: string | null
          specialty?: string | null
        }
        Relationships: []
      }
      surgeries: {
        Row: {
          created_at: string
          hospital: string | null
          id: string
          major: boolean
          notes: string | null
          patient_id: string
          procedure: string
          surgery_date: string | null
        }
        Insert: {
          created_at?: string
          hospital?: string | null
          id?: string
          major?: boolean
          notes?: string | null
          patient_id: string
          procedure: string
          surgery_date?: string | null
        }
        Update: {
          created_at?: string
          hospital?: string | null
          id?: string
          major?: boolean
          notes?: string | null
          patient_id?: string
          procedure?: string
          surgery_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "surgeries_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      expire_stale_consents: { Args: never; Returns: undefined }
      has_consent: {
        Args: { _category: string; _patient_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "patient" | "doctor" | "admin"
      consent_status: "pending" | "active" | "expired" | "revoked" | "rejected"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["patient", "doctor", "admin"],
      consent_status: ["pending", "active", "expired", "revoked", "rejected"],
    },
  },
} as const
