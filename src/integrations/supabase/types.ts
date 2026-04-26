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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      historial_precios: {
        Row: {
          created_at: string
          fecha_desde: string
          fecha_hasta: string | null
          id: string
          locatario_id: string
          monto: number
          propiedad_id: string | null
        }
        Insert: {
          created_at?: string
          fecha_desde?: string
          fecha_hasta?: string | null
          id?: string
          locatario_id: string
          monto: number
          propiedad_id?: string | null
        }
        Update: {
          created_at?: string
          fecha_desde?: string
          fecha_hasta?: string | null
          id?: string
          locatario_id?: string
          monto?: number
          propiedad_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "historial_precios_locatario_id_fkey"
            columns: ["locatario_id"]
            isOneToOne: false
            referencedRelation: "locatarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historial_precios_propiedad_id_fkey"
            columns: ["propiedad_id"]
            isOneToOne: false
            referencedRelation: "propiedades"
            referencedColumns: ["id"]
          },
        ]
      }
      locadores: {
        Row: {
          created_at: string
          direccion: string | null
          dni: string | null
          email: string | null
          id: string
          nombre: string
          notas: string | null
          telefono: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          direccion?: string | null
          dni?: string | null
          email?: string | null
          id?: string
          nombre: string
          notas?: string | null
          telefono?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          direccion?: string | null
          dni?: string | null
          email?: string | null
          id?: string
          nombre?: string
          notas?: string | null
          telefono?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      locatario_propiedades: {
        Row: {
          fecha_fin: string | null
          fecha_inicio: string | null
          fecha_ultimo_ajuste: string | null
          id: string
          indice_actualizacion: string | null
          intervalo_ajuste_meses: number | null
          locatario_id: string
          monto_base: number
          notas: string | null
          propiedad_id: string
        }
        Insert: {
          fecha_fin?: string | null
          fecha_inicio?: string | null
          fecha_ultimo_ajuste?: string | null
          id?: string
          indice_actualizacion?: string | null
          intervalo_ajuste_meses?: number | null
          locatario_id: string
          monto_base?: number
          notas?: string | null
          propiedad_id: string
        }
        Update: {
          fecha_fin?: string | null
          fecha_inicio?: string | null
          fecha_ultimo_ajuste?: string | null
          id?: string
          indice_actualizacion?: string | null
          intervalo_ajuste_meses?: number | null
          locatario_id?: string
          monto_base?: number
          notas?: string | null
          propiedad_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "locatario_propiedades_locatario_id_fkey"
            columns: ["locatario_id"]
            isOneToOne: false
            referencedRelation: "locatarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "locatario_propiedades_propiedad_id_fkey"
            columns: ["propiedad_id"]
            isOneToOne: false
            referencedRelation: "propiedades"
            referencedColumns: ["id"]
          },
        ]
      }
      locatarios: {
        Row: {
          created_at: string
          dni: string | null
          email: string | null
          fecha_fin: string | null
          fecha_inicio: string | null
          id: string
          indice_actualizacion: string | null
          intervalo_ajuste_meses: number | null
          monto_base: number
          nombre: string
          notas: string | null
          telefono: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          dni?: string | null
          email?: string | null
          fecha_fin?: string | null
          fecha_inicio?: string | null
          id?: string
          indice_actualizacion?: string | null
          intervalo_ajuste_meses?: number | null
          monto_base?: number
          nombre: string
          notas?: string | null
          telefono?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          dni?: string | null
          email?: string | null
          fecha_fin?: string | null
          fecha_inicio?: string | null
          id?: string
          indice_actualizacion?: string | null
          intervalo_ajuste_meses?: number | null
          monto_base?: number
          nombre?: string
          notas?: string | null
          telefono?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      propiedades: {
        Row: {
          created_at: string
          descripcion: string | null
          direccion: string
          id: string
          locador_id: string | null
          tipo: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          descripcion?: string | null
          direccion: string
          id?: string
          locador_id?: string | null
          tipo?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          descripcion?: string | null
          direccion?: string
          id?: string
          locador_id?: string | null
          tipo?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "propiedades_locador_id_fkey"
            columns: ["locador_id"]
            isOneToOne: false
            referencedRelation: "locadores"
            referencedColumns: ["id"]
          },
        ]
      }
      recibos: {
        Row: {
          agua: number
          arreglos: number
          concepto: string | null
          created_at: string
          estado: string
          expensas: number
          fecha: string
          fecha_entrega: string | null
          gas: number
          id: string
          locador_nombre: string | null
          locatario_id: string | null
          locatario_nombre: string
          luz: number
          monto: number
          nro_serie: string
          periodo_desde: string | null
          periodo_hasta: string | null
          propiedad: string
          servicios: number
          updated_at: string
          vencimiento: string | null
        }
        Insert: {
          agua?: number
          arreglos?: number
          concepto?: string | null
          created_at?: string
          estado?: string
          expensas?: number
          fecha?: string
          fecha_entrega?: string | null
          gas?: number
          id?: string
          locador_nombre?: string | null
          locatario_id?: string | null
          locatario_nombre: string
          luz?: number
          monto?: number
          nro_serie: string
          periodo_desde?: string | null
          periodo_hasta?: string | null
          propiedad: string
          servicios?: number
          updated_at?: string
          vencimiento?: string | null
        }
        Update: {
          agua?: number
          arreglos?: number
          concepto?: string | null
          created_at?: string
          estado?: string
          expensas?: number
          fecha?: string
          fecha_entrega?: string | null
          gas?: number
          id?: string
          locador_nombre?: string | null
          locatario_id?: string | null
          locatario_nombre?: string
          luz?: number
          monto?: number
          nro_serie?: string
          periodo_desde?: string | null
          periodo_hasta?: string | null
          propiedad?: string
          servicios?: number
          updated_at?: string
          vencimiento?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recibos_locatario_id_fkey"
            columns: ["locatario_id"]
            isOneToOne: false
            referencedRelation: "locatarios"
            referencedColumns: ["id"]
          },
        ]
      }
      servicios_locatario: {
        Row: {
          created_at: string
          id: string
          locatario_id: string
          notas: string | null
          propiedad_id: string | null
          servicios: string[]
          servicios_detalle: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          locatario_id: string
          notas?: string | null
          propiedad_id?: string | null
          servicios?: string[]
          servicios_detalle?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          locatario_id?: string
          notas?: string | null
          propiedad_id?: string | null
          servicios?: string[]
          servicios_detalle?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "servicios_locatario_locatario_id_fkey"
            columns: ["locatario_id"]
            isOneToOne: false
            referencedRelation: "locatarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "servicios_locatario_propiedad_id_fkey"
            columns: ["propiedad_id"]
            isOneToOne: false
            referencedRelation: "propiedades"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      next_nro_serie: { Args: never; Returns: string }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
