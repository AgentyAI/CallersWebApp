-- Users table (synced with Supabase Auth)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('caller', 'admin')),
  name TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Leads table
CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  specialty TEXT NOT NULL,
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'appointment_booked', 'not_interested', 'follow_up')),
  assigned_caller_id UUID REFERENCES users(id),
  phone TEXT,
  email TEXT,
  notes TEXT,
  data_completeness_score INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tags table
CREATE TABLE IF NOT EXISTS tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  color TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Lead tags junction table
CREATE TABLE IF NOT EXISTS lead_tags (
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (lead_id, tag_id)
);

-- Scripts table
CREATE TABLE IF NOT EXISTS scripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  specialty TEXT UNIQUE NOT NULL,
  opening_line TEXT,
  qualification TEXT,
  talking_points TEXT,
  objection_handling TEXT,
  closing_line TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Call attempts table
CREATE TABLE IF NOT EXISTS call_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  caller_id UUID REFERENCES users(id),
  outcome TEXT NOT NULL CHECK (outcome IN ('no_answer', 'voicemail', 'contacted', 'not_interested', 'appointment_booked')),
  notes TEXT,
  interest_level INTEGER CHECK (interest_level >= 1 AND interest_level <= 5),
  appointment_likelihood INTEGER CHECK (appointment_likelihood >= 1 AND appointment_likelihood <= 5),
  decision_maker_reached BOOLEAN DEFAULT false,
  call_control INTEGER CHECK (call_control >= 1 AND call_control <= 5),
  objection_handling INTEGER CHECK (objection_handling >= 1 AND objection_handling <= 5),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Appointments table
CREATE TABLE IF NOT EXISTS appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  caller_id UUID REFERENCES users(id),
  scheduled_at TIMESTAMP NOT NULL,
  google_calendar_event_id TEXT,
  google_meet_link TEXT,
  notes TEXT,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled', 'no_show')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_leads_assigned_caller ON leads(assigned_caller_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_specialty ON leads(specialty);
CREATE INDEX IF NOT EXISTS idx_call_attempts_lead ON call_attempts(lead_id);
CREATE INDEX IF NOT EXISTS idx_call_attempts_caller ON call_attempts(caller_id);
CREATE INDEX IF NOT EXISTS idx_appointments_lead ON appointments(lead_id);
CREATE INDEX IF NOT EXISTS idx_appointments_caller ON appointments(caller_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON leads
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scripts_updated_at BEFORE UPDATE ON scripts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON appointments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

