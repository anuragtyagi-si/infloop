CREATE TABLE users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email         text NOT NULL,
  name          text NOT NULL,
  password_hash text NOT NULL,
  role          text NOT NULL DEFAULT 'creator' CHECK (role IN ('creator')),
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX users_email_key ON users (lower(email));

CREATE TABLE campaigns (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand        text NOT NULL,
  title        text NOT NULL,
  goal         text NOT NULL CHECK (goal IN ('Awareness', 'Engagement', 'Conversions')),
  platform     text NOT NULL,
  deliverables text NOT NULL,
  fee_cents    integer NOT NULL CHECK (fee_cents >= 0),
  starts_on    date NOT NULL,
  ends_on      date NOT NULL CHECK (ends_on >= starts_on),
  is_sample    boolean NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE campaign_creators (
  campaign_id uuid NOT NULL REFERENCES campaigns (id) ON DELETE CASCADE,
  creator_id  uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  status      text NOT NULL CHECK (status IN ('invited', 'active', 'completed')),
  joined_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (campaign_id, creator_id)
);
CREATE INDEX campaign_creators_creator_idx ON campaign_creators (creator_id);
