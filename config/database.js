const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase configuration. Please check your environment variables.');
}

// Create Supabase client for regular operations
const supabase = createClient(supabaseUrl, supabaseKey);

// Create Supabase client with service role for admin operations
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);


console.log('Supabase clients initialized successfully', supabaseAdmin);
module.exports = {
  supabase,
  supabaseAdmin,
  // Database table names
  tables: {
    users: 'users',
    questions: 'questions',
    answers: 'answers',
    tutorials: 'tutorials',
    examPapers: 'exam_papers',
    notifications: 'notifications',
    tags: 'tags',
    questionTags: 'question_tags',
    tutorialTags: 'tutorial_tags',
    examTags: 'exam_tags',
    votes: 'votes',
    userActivity: 'user_activity'
  }
}; 