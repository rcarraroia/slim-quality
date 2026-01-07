-- Migration: Create CRM Appointments System
-- Sprint 5: Sistema de CRM e Gestao de Clientes
-- Created: 2025-01-25
-- Author: Kiro AI

BEGIN;
-- Create ENUMs for appointments
DO $$ BEGIN
  CREATE TYPE appointment_type AS ENUM (
    'call',
    'meeting',
    'follow_up',
    'demo',
    'consultation'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
  CREATE TYPE appointment_status AS ENUM (
    'scheduled',
    'confirmed',
    'completed',
    'cancelled',
    'no_show'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
-- Create appointments table
CREATE TABLE IF NOT EXISTS appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  assigned_to UUID NOT NULL REFERENCES auth.users(id),
  
  title VARCHAR(255) NOT NULL,
  description TEXT,
  appointment_type appointment_type NOT NULL,
  status appointment_status DEFAULT 'scheduled',
  
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER DEFAULT 60,
  timezone VARCHAR(50) DEFAULT 'America/Sao_Paulo',
  
  location TEXT,
  meeting_url TEXT,
  notes TEXT,
  
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  
  reminder_sent BOOLEAN DEFAULT FALSE,
  reminder_sent_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);
-- Create indexes
CREATE INDEX idx_appointments_customer_id ON appointments(customer_id);
CREATE INDEX idx_appointments_assigned_to ON appointments(assigned_to);
CREATE INDEX idx_appointments_scheduled_at ON appointments(scheduled_at);
CREATE INDEX idx_appointments_status ON appointments(status);
CREATE INDEX idx_appointments_type ON appointments(appointment_type);
-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_appointments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trigger_update_appointments_updated_at
  BEFORE UPDATE ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION update_appointments_updated_at();
-- Enable RLS
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
-- RLS Policies
CREATE POLICY "Users can view appointments"
  ON appointments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.deleted_at IS NULL
    )
  );
CREATE POLICY "Users can create appointments"
  ON appointments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.deleted_at IS NULL
    )
  );
CREATE POLICY "Users can update appointments"
  ON appointments FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.deleted_at IS NULL
    )
  );
COMMIT;
