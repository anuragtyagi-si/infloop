-- Accounts stay unverified (and cannot log in) until the emailed link is used.
ALTER TABLE users ADD COLUMN email_verified_at timestamptz;

-- Single-use verification links. Only a hash of the emailed token is stored.
CREATE TABLE email_verifications (
  token_hash text PRIMARY KEY,
  user_id    uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX email_verifications_user_idx ON email_verifications (user_id);
