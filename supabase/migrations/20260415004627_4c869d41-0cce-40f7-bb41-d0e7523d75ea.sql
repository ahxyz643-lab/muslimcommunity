
-- Add voice_url column to messages for voice notes
ALTER TABLE public.messages ADD COLUMN voice_url text;

-- Allow users to delete their own messages
CREATE POLICY "Users can delete own messages"
ON public.messages
FOR DELETE
TO authenticated
USING (auth.uid() = sender_id);
