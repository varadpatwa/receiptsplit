-- Events table: groups multiple splits into one event
CREATE TABLE public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  start_date date,
  end_date date,
  created_at timestamptz DEFAULT now()
);

-- Join table: links splits to events
CREATE TABLE public.event_splits (
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  split_id uuid NOT NULL REFERENCES public.splits(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (event_id, split_id)
);

-- Enable RLS
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_splits ENABLE ROW LEVEL SECURITY;

-- Events: owner can do everything
CREATE POLICY events_owner_all ON public.events
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Event_splits: only event owner can read/write
CREATE POLICY event_splits_owner_select ON public.event_splits FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.events e WHERE e.id = event_id AND e.user_id = auth.uid()
  ));

CREATE POLICY event_splits_owner_insert ON public.event_splits FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND e.user_id = auth.uid())
    AND EXISTS (SELECT 1 FROM public.splits s WHERE s.id = split_id AND s.user_id = auth.uid())
  );

CREATE POLICY event_splits_owner_delete ON public.event_splits FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.events e WHERE e.id = event_id AND e.user_id = auth.uid()
  ));

-- Indexes
CREATE INDEX idx_events_user_id ON public.events(user_id);
CREATE INDEX idx_event_splits_event_id ON public.event_splits(event_id);
CREATE INDEX idx_event_splits_split_id ON public.event_splits(split_id);
