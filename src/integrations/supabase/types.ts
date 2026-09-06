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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      audit_assignments: {
        Row: {
          area: string
          assigned_by: string | null
          assigned_to: string
          assigned_to_employee_number: string
          audit_code: string
          audit_type: Database["public"]["Enums"]["audit_type"]
          created_at: string
          due_date: string
          id: string
          month: number
          plan_id: string | null
          status: Database["public"]["Enums"]["audit_status"]
          title: string
          updated_at: string
          year: number
        }
        Insert: {
          area?: string
          assigned_by?: string | null
          assigned_to: string
          assigned_to_employee_number: string
          audit_code?: string
          audit_type?: Database["public"]["Enums"]["audit_type"]
          created_at?: string
          due_date: string
          id?: string
          month: number
          plan_id?: string | null
          status?: Database["public"]["Enums"]["audit_status"]
          title: string
          updated_at?: string
          year: number
        }
        Update: {
          area?: string
          assigned_by?: string | null
          assigned_to?: string
          assigned_to_employee_number?: string
          audit_code?: string
          audit_type?: Database["public"]["Enums"]["audit_type"]
          created_at?: string
          due_date?: string
          id?: string
          month?: number
          plan_id?: string | null
          status?: Database["public"]["Enums"]["audit_status"]
          title?: string
          updated_at?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "audit_assignments_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "audit_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_deviations: {
        Row: {
          assignment_id: string | null
          closed_at: string | null
          closed_by: string | null
          corrective_action: string | null
          created_at: string
          description: string
          employee_number: string
          evidence_url: string | null
          id: string
          location_operation: string
          observed_condition: string
          recommended_action: string | null
          record_id: string | null
          reported_by: string
          severity: string
          status: Database["public"]["Enums"]["deviation_status"]
          updated_at: string
        }
        Insert: {
          assignment_id?: string | null
          closed_at?: string | null
          closed_by?: string | null
          corrective_action?: string | null
          created_at?: string
          description: string
          employee_number: string
          evidence_url?: string | null
          id?: string
          location_operation: string
          observed_condition: string
          recommended_action?: string | null
          record_id?: string | null
          reported_by: string
          severity?: string
          status?: Database["public"]["Enums"]["deviation_status"]
          updated_at?: string
        }
        Update: {
          assignment_id?: string | null
          closed_at?: string | null
          closed_by?: string | null
          corrective_action?: string | null
          created_at?: string
          description?: string
          employee_number?: string
          evidence_url?: string | null
          id?: string
          location_operation?: string
          observed_condition?: string
          recommended_action?: string | null
          record_id?: string | null
          reported_by?: string
          severity?: string
          status?: Database["public"]["Enums"]["deviation_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_deviations_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "audit_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_deviations_record_id_fkey"
            columns: ["record_id"]
            isOneToOne: false
            referencedRelation: "audit_records"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_employee_number: string | null
          actor_id: string | null
          created_at: string
          details: Json
          entity_id: string | null
          entity_type: string
          id: string
        }
        Insert: {
          action: string
          actor_employee_number?: string | null
          actor_id?: string | null
          created_at?: string
          details?: Json
          entity_id?: string | null
          entity_type: string
          id?: string
        }
        Update: {
          action?: string
          actor_employee_number?: string | null
          actor_id?: string | null
          created_at?: string
          details?: Json
          entity_id?: string | null
          entity_type?: string
          id?: string
        }
        Relationships: []
      }
      audit_plans: {
        Row: {
          area: string
          audit_type: Database["public"]["Enums"]["audit_type"]
          created_at: string
          created_by: string | null
          description: string | null
          frequency: string
          id: string
          title: string
          year: number
        }
        Insert: {
          area?: string
          audit_type?: Database["public"]["Enums"]["audit_type"]
          created_at?: string
          created_by?: string | null
          description?: string | null
          frequency?: string
          id?: string
          title: string
          year: number
        }
        Update: {
          area?: string
          audit_type?: Database["public"]["Enums"]["audit_type"]
          created_at?: string
          created_by?: string | null
          description?: string | null
          frequency?: string
          id?: string
          title?: string
          year?: number
        }
        Relationships: []
      }
      audit_records: {
        Row: {
          assignment_id: string
          checkpoints: Json
          created_at: string
          employee_number: string
          id: string
          image_1_url: string | null
          image_2_url: string | null
          image_3_url: string | null
          locked: boolean
          observations: string | null
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          signature_name: string | null
          signature_ref: string | null
          signed_at: string | null
          status: Database["public"]["Enums"]["audit_status"]
          submitted_at: string | null
          submitted_by: string
          updated_at: string
        }
        Insert: {
          assignment_id: string
          checkpoints?: Json
          created_at?: string
          employee_number: string
          id?: string
          image_1_url?: string | null
          image_2_url?: string | null
          image_3_url?: string | null
          locked?: boolean
          observations?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          signature_name?: string | null
          signature_ref?: string | null
          signed_at?: string | null
          status?: Database["public"]["Enums"]["audit_status"]
          submitted_at?: string | null
          submitted_by: string
          updated_at?: string
        }
        Update: {
          assignment_id?: string
          checkpoints?: Json
          created_at?: string
          employee_number?: string
          id?: string
          image_1_url?: string | null
          image_2_url?: string | null
          image_3_url?: string | null
          locked?: boolean
          observations?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          signature_name?: string | null
          signature_ref?: string | null
          signed_at?: string | null
          status?: Database["public"]["Enums"]["audit_status"]
          submitted_at?: string | null
          submitted_by?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_records_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: true
            referencedRelation: "audit_assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          active: boolean
          created_at: string
          department: string
          designation: string
          employee_number: string
          full_name: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          active?: boolean
          created_at?: string
          department?: string
          designation?: string
          employee_number: string
          full_name: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          active?: boolean
          created_at?: string
          department?: string
          designation?: string
          employee_number?: string
          full_name?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: []
      }
      login_codes: {
        Row: {
          code: string
          consumed: boolean
          created_at: string
          employee_number: string
          expires_at: string
          id: string
        }
        Insert: {
          code: string
          consumed?: boolean
          created_at?: string
          employee_number: string
          expires_at: string
          id?: string
        }
        Update: {
          code?: string
          consumed?: boolean
          created_at?: string
          employee_number?: string
          expires_at?: string
          id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          department: string
          designation: string
          employee_number: string
          full_name: string
          id: string
        }
        Insert: {
          created_at?: string
          department?: string
          designation?: string
          employee_number: string
          full_name: string
          id: string
        }
        Update: {
          created_at?: string
          department?: string
          designation?: string
          employee_number?: string
          full_name?: string
          id?: string
        }
        Relationships: []
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "employee"
      audit_status:
        | "Planned"
        | "Assigned"
        | "In Progress"
        | "Submitted"
        | "Completed"
        | "Deviation"
        | "Overdue"
      audit_type: "Product" | "Process" | "Revalidation"
      deviation_status: "Open" | "Under Review" | "Action Assigned" | "Closed"
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
  public: {
    Enums: {
      app_role: ["admin", "employee"],
      audit_status: [
        "Planned",
        "Assigned",
        "In Progress",
        "Submitted",
        "Completed",
        "Deviation",
        "Overdue",
      ],
      audit_type: ["Product", "Process", "Revalidation"],
      deviation_status: ["Open", "Under Review", "Action Assigned", "Closed"],
    },
  },
} as const
