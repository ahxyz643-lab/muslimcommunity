
-- Allow conversation participants to update read_at on messages (not just sender)
DROP POLICY IF EXISTS "Users can update own messages" ON public.messages;

CREATE POLICY "Users can update messages in their conversations"
ON public.messages
FOR UPDATE
TO authenticated
USING (public.is_conversation_participant(conversation_id, auth.uid()));
