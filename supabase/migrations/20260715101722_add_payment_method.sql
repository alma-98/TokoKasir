ALTER TABLE public.payments
ADD COLUMN IF NOT EXISTS payment_method TEXT NOT NULL DEFAULT 'qris';

NOTIFY pgrst, 'reload schema';
