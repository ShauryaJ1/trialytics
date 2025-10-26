-- Create custom users table (separate from auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  username VARCHAR(100) UNIQUE,
  bio TEXT,
  avatar_url TEXT,
  date_of_birth DATE,
  phone VARCHAR(20),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create an index on email for faster lookups
CREATE INDEX idx_users_email ON public.users(email);

-- Create an index on username for faster lookups
CREATE INDEX idx_users_username ON public.users(username);

-- Create an index on is_active for filtering
CREATE INDEX idx_users_is_active ON public.users(is_active);

-- Add RLS (Row Level Security) policies
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view all active users
CREATE POLICY "Public users are viewable by everyone"
  ON public.users FOR SELECT
  USING (is_active = true);

-- Policy: Users can insert their own profile
CREATE POLICY "Users can insert their own profile"
  ON public.users FOR INSERT
  WITH CHECK (auth.email() = email);

-- Policy: Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  USING (auth.email() = email);

-- Policy: Users can delete their own profile
CREATE POLICY "Users can delete own profile"
  ON public.users FOR DELETE
  USING (auth.email() = email);

-- Create a function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to automatically update the updated_at column
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert some sample data (optional - you can comment this out if not needed)
INSERT INTO public.users (email, full_name, username, bio, avatar_url, date_of_birth, phone)
VALUES 
  ('john.doe@example.com', 'John Doe', 'johndoe', 'Software developer passionate about web technologies', 'https://api.dicebear.com/7.x/avataaars/svg?seed=johndoe', '1990-05-15', '+1234567890'),
  ('jane.smith@example.com', 'Jane Smith', 'janesmith', 'UX Designer with a love for minimalist design', 'https://api.dicebear.com/7.x/avataaars/svg?seed=janesmith', '1992-08-22', '+0987654321'),
  ('mike.wilson@example.com', 'Mike Wilson', 'mikewilson', 'Data scientist exploring machine learning', 'https://api.dicebear.com/7.x/avataaars/svg?seed=mikewilson', '1988-12-03', '+1122334455')
ON CONFLICT DO NOTHING;

-- Grant necessary permissions
GRANT ALL ON public.users TO authenticated;
GRANT SELECT ON public.users TO anon;
