
ALTER TABLE public.comments ADD COLUMN parent_id uuid REFERENCES public.comments(id) ON DELETE CASCADE DEFAULT NULL;

CREATE INDEX idx_comments_parent_id ON public.comments(parent_id);
