require('dotenv').config();
const { supabaseAdmin } = require('../config/database');

async function runMigrations() {
  console.log('🚀 Starting database migrations...');

  try {
    // Enable pgvector extension
    console.log('📦 Enabling pgvector extension...');
    await supabaseAdmin.rpc('create_extension_if_not_exists', { extname: 'vector' });

    // Create users table
    console.log('👥 Creating users table...');
    await supabaseAdmin.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS users (
          id UUID PRIMARY KEY,
          email VARCHAR(255) UNIQUE NOT NULL,
          password VARCHAR(255) NOT NULL,
          full_name VARCHAR(255) NOT NULL,
          role VARCHAR(50) NOT NULL CHECK (role IN ('student', 'teacher', 'admin')),
          grade VARCHAR(50),
          subject VARCHAR(100),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    });

    // Create questions table with vector support
    console.log('❓ Creating questions table...');
    await supabaseAdmin.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS questions (
          id UUID PRIMARY KEY,
          title VARCHAR(500) NOT NULL,
          content TEXT NOT NULL,
          subject VARCHAR(100) NOT NULL,
          tags TEXT[] DEFAULT '{}',
          difficulty VARCHAR(20) DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
          grade VARCHAR(50),
          author_id UUID REFERENCES users(id) ON DELETE CASCADE,
          exam_paper_id UUID REFERENCES exam_papers(id) ON DELETE SET NULL,
          upvotes INTEGER DEFAULT 0,
          downvotes INTEGER DEFAULT 0,
          embedding VECTOR(1024),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    });

    // Create answers table
    console.log('💬 Creating answers table...');
    await supabaseAdmin.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS answers (
          id UUID PRIMARY KEY,
          content TEXT NOT NULL,
          question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
          author_id UUID REFERENCES users(id) ON DELETE CASCADE,
          is_accepted BOOLEAN DEFAULT FALSE,
          upvotes INTEGER DEFAULT 0,
          downvotes INTEGER DEFAULT 0,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    });

    // Create tutorials table with vector support
    console.log('📚 Creating tutorials table...');
    await supabaseAdmin.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS tutorials (
          id UUID PRIMARY KEY,
          title VARCHAR(500) NOT NULL,
          content TEXT NOT NULL,
          subject VARCHAR(100) NOT NULL,
          tags TEXT[] DEFAULT '{}',
          difficulty VARCHAR(20) DEFAULT 'beginner' CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
          grade VARCHAR(50),
          type VARCHAR(20) DEFAULT 'text' CHECK (type IN ('text', 'video', 'audio')),
          media_url VARCHAR(500),
          duration INTEGER,
          prerequisites TEXT[] DEFAULT '{}',
          author_id UUID REFERENCES users(id) ON DELETE CASCADE,
          view_count INTEGER DEFAULT 0,
          rating DECIMAL(3,2) DEFAULT 0,
          embedding VECTOR(1024),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    });

    // Create exam_papers table with vector support
    console.log('📝 Creating exam_papers table...');
    await supabaseAdmin.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS exam_papers (
          id UUID PRIMARY KEY,
          title VARCHAR(500) NOT NULL,
          subject VARCHAR(100) NOT NULL,
          year INTEGER NOT NULL,
          description TEXT,
          tags TEXT[] DEFAULT '{}',
          grade VARCHAR(50),
          term VARCHAR(20) CHECK (term IN ('first', 'second', 'final')),
          exam_type VARCHAR(20) CHECK (exam_type IN ('midterm', 'final', 'quiz')),
          duration INTEGER,
          total_marks INTEGER,
          file_url VARCHAR(500),
          answer_key_url VARCHAR(500),
          uploader_id UUID REFERENCES users(id) ON DELETE CASCADE,
          download_count INTEGER DEFAULT 0,
          embedding VECTOR(1024),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    });

    // Create votes table
    console.log('🗳️ Creating votes table...');
    await supabaseAdmin.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS votes (
          id UUID PRIMARY KEY,
          user_id UUID REFERENCES users(id) ON DELETE CASCADE,
          question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
          answer_id UUID REFERENCES answers(id) ON DELETE CASCADE,
          vote_type VARCHAR(20) NOT NULL CHECK (vote_type IN ('upvote', 'downvote')),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(user_id, question_id),
          UNIQUE(user_id, answer_id)
        );
      `
    });

    // Create notifications table
    console.log('🔔 Creating notifications table...');
    await supabaseAdmin.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS notifications (
          id UUID PRIMARY KEY,
          user_id UUID REFERENCES users(id) ON DELETE CASCADE,
          title VARCHAR(255) NOT NULL,
          message TEXT NOT NULL,
          type VARCHAR(50) NOT NULL,
          is_read BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    });

    // Create user_activity table
    console.log('📊 Creating user_activity table...');
    await supabaseAdmin.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS user_activity (
          id UUID PRIMARY KEY,
          user_id UUID REFERENCES users(id) ON DELETE CASCADE,
          activity_type VARCHAR(50) NOT NULL,
          content_id UUID,
          content_type VARCHAR(50),
          metadata JSONB,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    });

    // Create indexes for better performance
    console.log('🔍 Creating indexes...');
    await supabaseAdmin.rpc('exec_sql', {
      sql: `
        CREATE INDEX IF NOT EXISTS idx_questions_subject ON questions(subject);
        CREATE INDEX IF NOT EXISTS idx_questions_author ON questions(author_id);
        CREATE INDEX IF NOT EXISTS idx_questions_created ON questions(created_at);
        CREATE INDEX IF NOT EXISTS idx_questions_embedding ON questions USING ivfflat (embedding vector_cosine_ops);
        
        CREATE INDEX IF NOT EXISTS idx_tutorials_subject ON tutorials(subject);
        CREATE INDEX IF NOT EXISTS idx_tutorials_author ON tutorials(author_id);
        CREATE INDEX IF NOT EXISTS idx_tutorials_embedding ON tutorials USING ivfflat (embedding vector_cosine_ops);
        
        CREATE INDEX IF NOT EXISTS idx_exam_papers_subject ON exam_papers(subject);
        CREATE INDEX IF NOT EXISTS idx_exam_papers_year ON exam_papers(year);
        CREATE INDEX IF NOT EXISTS idx_exam_papers_embedding ON exam_papers USING ivfflat (embedding vector_cosine_ops);
        
        CREATE INDEX IF NOT EXISTS idx_answers_question ON answers(question_id);
        CREATE INDEX IF NOT EXISTS idx_answers_author ON answers(author_id);
        
        CREATE INDEX IF NOT EXISTS idx_votes_user_question ON votes(user_id, question_id);
        CREATE INDEX IF NOT EXISTS idx_votes_user_answer ON votes(user_id, answer_id);
        
        CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
        CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read);
        
        CREATE INDEX IF NOT EXISTS idx_user_activity_user ON user_activity(user_id);
        CREATE INDEX IF NOT EXISTS idx_user_activity_type ON user_activity(activity_type);
      `
    });

    // Create vector search function
    console.log('🔍 Creating vector search function...');
    await supabaseAdmin.rpc('exec_sql', {
      sql: `
        CREATE OR REPLACE FUNCTION match_documents(
          query_embedding VECTOR(1024),
          match_threshold FLOAT,
          match_count INT,
          table_name TEXT
        )
        RETURNS TABLE (
          id UUID,
          similarity FLOAT
        )
        LANGUAGE plpgsql
        AS $$
        BEGIN
          RETURN QUERY EXECUTE format(
            'SELECT id, 1 - (embedding <=> $1) as similarity
             FROM %I
             WHERE 1 - (embedding <=> $1) > $2
             ORDER BY embedding <=> $1
             LIMIT $3',
            table_name
          ) USING query_embedding, match_threshold, match_count;
        END;
        $$;
      `
    });

    // Create trigger to update updated_at timestamp
    console.log('⏰ Creating update timestamp triggers...');
    await supabaseAdmin.rpc('exec_sql', {
      sql: `
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
          NEW.updated_at = NOW();
          RETURN NEW;
        END;
        $$ language 'plpgsql';

        CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        
        CREATE TRIGGER update_questions_updated_at BEFORE UPDATE ON questions
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        
        CREATE TRIGGER update_answers_updated_at BEFORE UPDATE ON answers
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        
        CREATE TRIGGER update_tutorials_updated_at BEFORE UPDATE ON tutorials
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        
        CREATE TRIGGER update_exam_papers_updated_at BEFORE UPDATE ON exam_papers
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
      `
    });

    console.log('✅ Database migrations completed successfully!');
    console.log('📋 Tables created:');
    console.log('  - users');
    console.log('  - questions (with vector embeddings)');
    console.log('  - answers');
    console.log('  - tutorials (with vector embeddings)');
    console.log('  - exam_papers (with vector embeddings)');
    console.log('  - votes');
    console.log('  - notifications');
    console.log('  - user_activity');
    console.log('');
    console.log('🔍 Vector search function created: match_documents()');
    console.log('⏰ Update timestamp triggers created');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migrations if this file is executed directly
if (require.main === module) {
  runMigrations();
}

module.exports = { runMigrations };