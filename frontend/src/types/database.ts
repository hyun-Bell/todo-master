// Database types for TodoMaster
// Auto-generated types based on Supabase schema

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      goals: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          description: string | null;
          category: string;
          deadline: string | null;
          status: 'active' | 'completed' | 'paused' | 'cancelled';
          priority: 'low' | 'medium' | 'high';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          description?: string | null;
          category?: string;
          deadline?: string | null;
          status?: 'active' | 'completed' | 'paused' | 'cancelled';
          priority?: 'low' | 'medium' | 'high';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          description?: string | null;
          category?: string;
          deadline?: string | null;
          status?: 'active' | 'completed' | 'paused' | 'cancelled';
          priority?: 'low' | 'medium' | 'high';
          created_at?: string;
          updated_at?: string;
        };
      };
      plans: {
        Row: {
          id: string;
          goal_id: string;
          title: string;
          description: string | null;
          order_index: number;
          status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
          estimated_duration: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          goal_id: string;
          title: string;
          description?: string | null;
          order_index?: number;
          status?: 'pending' | 'in_progress' | 'completed' | 'cancelled';
          estimated_duration?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          goal_id?: string;
          title?: string;
          description?: string | null;
          order_index?: number;
          status?: 'pending' | 'in_progress' | 'completed' | 'cancelled';
          estimated_duration?: number | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      checkpoints: {
        Row: {
          id: string;
          plan_id: string;
          title: string;
          description: string | null;
          is_completed: boolean;
          completed_at: string | null;
          order_index: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          plan_id: string;
          title: string;
          description?: string | null;
          is_completed?: boolean;
          completed_at?: string | null;
          order_index?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          plan_id?: string;
          title?: string;
          description?: string | null;
          is_completed?: boolean;
          completed_at?: string | null;
          order_index?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: 'reminder' | 'achievement' | 'deadline' | 'system';
          title: string;
          message: string | null;
          is_read: boolean;
          data: any | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: 'reminder' | 'achievement' | 'deadline' | 'system';
          title: string;
          message?: string | null;
          is_read?: boolean;
          data?: any | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: 'reminder' | 'achievement' | 'deadline' | 'system';
          title?: string;
          message?: string | null;
          is_read?: boolean;
          data?: any | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}

// Helper types for easier use
export type User = Database['public']['Tables']['users']['Row'];
export type Goal = Database['public']['Tables']['goals']['Row'];
export type Plan = Database['public']['Tables']['plans']['Row'];
export type Checkpoint = Database['public']['Tables']['checkpoints']['Row'];
export type Notification = Database['public']['Tables']['notifications']['Row'];

export type InsertUser = Database['public']['Tables']['users']['Insert'];
export type InsertGoal = Database['public']['Tables']['goals']['Insert'];
export type InsertPlan = Database['public']['Tables']['plans']['Insert'];
export type InsertCheckpoint = Database['public']['Tables']['checkpoints']['Insert'];
export type InsertNotification = Database['public']['Tables']['notifications']['Insert'];

export type UpdateUser = Database['public']['Tables']['users']['Update'];
export type UpdateGoal = Database['public']['Tables']['goals']['Update'];
export type UpdatePlan = Database['public']['Tables']['plans']['Update'];
export type UpdateCheckpoint = Database['public']['Tables']['checkpoints']['Update'];
export type UpdateNotification = Database['public']['Tables']['notifications']['Update'];