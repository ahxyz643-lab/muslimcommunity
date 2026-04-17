CREATE TABLE public.call_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL,
  caller_id UUID NOT NULL,
  receiver_id UUID NOT NULL,
  call_type TEXT NOT NULL CHECK (call_type IN ('voice', 'video')),
  status TEXT NOT NULL CHECK (status IN ('completed', 'missed', 'declined', 'cancelled')),
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ
);

CREATE INDEX idx_call_logs_caller ON public.call_logs(caller_id, started_at DESC);
CREATE INDEX idx_call_logs_receiver ON public.call_logs(receiver_id, started_at DESC);

ALTER TABLE public.call_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own call logs"
ON public.call_logs FOR SELECT
TO authenticated
USING (auth.uid() = caller_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can create call logs"
ON public.call_logs FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = caller_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can update own call logs"
ON public.call_logs FOR UPDATE
TO authenticated
USING (auth.uid() = caller_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can delete own call logs"
ON public.call_logs FOR DELETE
TO authenticated
USING (auth.uid() = caller_id OR auth.uid() = receiver_id);