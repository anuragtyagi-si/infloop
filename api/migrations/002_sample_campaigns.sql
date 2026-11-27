-- Illustrative campaigns. Every new creator account is added to these so the
-- dashboard has something to show until real campaign assignment exists.
INSERT INTO campaigns (brand, title, goal, platform, deliverables, fee_cents, starts_on, ends_on, is_sample) VALUES
  ('Northwind Coffee', 'Slow mornings launch',   'Awareness',   'Instagram', '3 Reels, 4 Stories',        180000, current_date - 10, current_date + 32, true),
  ('Atlas Trail Co.',  'Summit series',          'Engagement',  'YouTube',   '1 long-form video, 2 Shorts', 260000, current_date - 3,  current_date + 53, true),
  ('Lumen Skincare',   'Daily SPF habit',        'Conversions', 'TikTok',    '4 videos with tracked link', 210000, current_date + 12, current_date + 54, true),
  ('Fold Studio',      'Desk setup refresh',     'Awareness',   'LinkedIn',  '2 posts, 1 carousel',        120000, current_date + 25, current_date + 53, true),
  ('Kiln & Table',     'Weeknight recipes',      'Engagement',  'Instagram', '4 Reels',                    150000, current_date - 70, current_date - 21, true);
