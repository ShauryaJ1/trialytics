-- Create table for storing chat history as JSON
CREATE TABLE IF NOT EXISTS public.chat_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  -- A logical grouping for a conversation thread
  session_id UUID NOT NULL,
  title TEXT,
  model TEXT,
  -- Full chat transcript as an array of message objects
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  token_count INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ensure a user has a single row per session
CREATE UNIQUE INDEX IF NOT EXISTS chat_logs_user_session_uidx
  ON public.chat_logs(user_id, session_id);

-- Enforce a single row per session across the table
CREATE UNIQUE INDEX IF NOT EXISTS chat_logs_session_uidx
  ON public.chat_logs(session_id);

-- Lookups by session id (used by API)
CREATE INDEX IF NOT EXISTS chat_logs_session_id_idx
  ON public.chat_logs(session_id);

-- Lookups by user id
CREATE INDEX IF NOT EXISTS chat_logs_user_id_idx
  ON public.chat_logs(user_id);

-- Speed up common queries
CREATE INDEX IF NOT EXISTS chat_logs_updated_at_idx
  ON public.chat_logs(updated_at DESC);

-- Optional GIN index for JSONB containment queries
CREATE INDEX IF NOT EXISTS chat_logs_messages_gin_idx
  ON public.chat_logs USING GIN (messages);

-- Enable Row Level Security
ALTER TABLE public.chat_logs ENABLE ROW LEVEL SECURITY;

-- Policies: users can only manage their own chat logs
CREATE POLICY "Users can view their chat logs"
  ON public.chat_logs FOR SELECT
  USING (
    user_id IN (
      SELECT u.id FROM public.users u WHERE u.email = auth.email()
    )
  );

CREATE POLICY "Users can insert their chat logs"
  ON public.chat_logs FOR INSERT
  WITH CHECK (
    user_id IN (
      SELECT u.id FROM public.users u WHERE u.email = auth.email()
    )
  );

CREATE POLICY "Users can update their chat logs"
  ON public.chat_logs FOR UPDATE
  USING (
    user_id IN (
      SELECT u.id FROM public.users u WHERE u.email = auth.email()
    )
  )
  WITH CHECK (
    user_id IN (
      SELECT u.id FROM public.users u WHERE u.email = auth.email()
    )
  );

CREATE POLICY "Users can delete their chat logs"
  ON public.chat_logs FOR DELETE
  USING (
    user_id IN (
      SELECT u.id FROM public.users u WHERE u.email = auth.email()
    )
  );

-- Reuse the shared updated_at trigger function defined in users migration
CREATE TRIGGER update_chat_logs_updated_at
  BEFORE UPDATE ON public.chat_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Grant permissions (authenticated clients operate under RLS)
GRANT ALL ON public.chat_logs TO authenticated;
