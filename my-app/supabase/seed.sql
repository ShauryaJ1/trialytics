-- Seed data for the users table
-- This file will be run when you execute `supabase db reset`

-- Clear existing data (optional)
TRUNCATE public.users CASCADE;

-- Insert sample users
INSERT INTO public.users (email, full_name, username, bio, avatar_url, date_of_birth, phone, is_active)
VALUES 
  (
    'alice.johnson@example.com',
    'Alice Johnson',
    'alicej',
    'Frontend developer specializing in React and Next.js',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=alice',
    '1991-03-15',
    '+1234567890',
    true
  ),
  (
    'bob.smith@example.com',
    'Bob Smith',
    'bobsmith',
    'Backend engineer with expertise in Node.js and PostgreSQL',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=bob',
    '1989-07-22',
    '+0987654321',
    true
  ),
  (
    'carol.williams@example.com',
    'Carol Williams',
    'carolw',
    'Full-stack developer and tech lead',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=carol',
    '1993-11-08',
    '+1122334455',
    true
  ),
  (
    'david.brown@example.com',
    'David Brown',
    'davidb',
    'DevOps engineer passionate about cloud infrastructure',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=david',
    '1990-01-30',
    '+5544332211',
    true
  ),
  (
    'emma.davis@example.com',
    'Emma Davis',
    'emmad',
    'UX/UI designer with a focus on accessibility',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=emma',
    '1994-05-18',
    '+9988776655',
    true
  )
ON CONFLICT (email) DO NOTHING;
