-- Add 'pending_payment' to babysitting_requests status CHECK constraint
ALTER TABLE babysitting_requests DROP CONSTRAINT babysitting_requests_status_check;
ALTER TABLE babysitting_requests ADD CONSTRAINT babysitting_requests_status_check
  CHECK (status IN ('draft', 'pending_payment', 'open', 'filled', 'completed', 'cancelled', 'expired'));
