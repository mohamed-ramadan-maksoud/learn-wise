// Migration script to drop and recreate the tutorials table for paragraph-level and embedding support
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const dropAndCreateTableSQL = `
DROP TABLE IF EXISTS tutorials CASCADE;
CREATE TABLE tutorials (
  id UUID NOT NULL,
  title VARCHAR(500) NOT NULL,
  content TEXT NOT NULL,
  subject VARCHAR(100) NOT NULL,
  chapter VARCHAR(100),
  paragraph_number INTEGER NOT NULL,
  tags TEXT[] DEFAULT '{}',
  difficulty VARCHAR(20) DEFAULT 'beginner' CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  type VARCHAR(20) DEFAULT 'text' CHECK (type IN ('text', 'video', 'audio')),
  media_url VARCHAR(500),
  duration INTEGER,
  author_id UUID REFERENCES users(id) ON DELETE CASCADE,
  view_count INTEGER DEFAULT 0,
  rating DECIMAL(3,2) DEFAULT 0,
  embedding VECTOR(1536),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (id, paragraph_number)
);
`;

async function migrate() {
  const { error } = await supabase.rpc('execute_sql', { sql: dropAndCreateTableSQL });
  if (error) {
    console.error('Migration failed:', error);
  } else {
    console.log('Tutorials table dropped and recreated successfully.');
  }
}

migrate();
