insert into committee_members (name, role, council, "order") values
  ('Dadson Mbogo', 'Parish board chairman', 'parish_board', 1),
  ('Jeremiah Kimani', 'V Chairman', 'parish_board', 2),
  ('Kariuki Nderitu', 'General Secretary', 'parish_board', 3),
  ('Joseph Kamande', 'Vice General Secretary', 'parish_board', 4),
  ('Johnson Kamau', 'Treasurer', 'parish_board', 5),
  ('George Kibia', 'Vice Treasurer', 'parish_board', 6),
  ('Magdalene Wageni', 'Chairlady', 'women_council', 7),
  ('Alice Kuhunya', 'V Chairlady', 'women_council', 8),
  ('Tiffany Kimani', 'Women council Secretary', 'women_council', 9),
  ('Esther Mbugua', 'Women council Treasurer', 'women_council', 10),
  ('Gilbert Wachira', 'Men council chairman', 'men_council', 11),
  ('Sam Ndiang''ui', 'Development chairman', 'development', 12),
  ('Wilson Thirikwa', 'Development Secretary', 'development', 13),
  ('Maria goretti Njenga', 'Development Treasurer', 'development', 14);

insert into campaigns (slug, title, description, goal, raised, currency, is_active)
values (
  'development-fund',
  'AIPCA Bahati Cathedral Development Fund',
  'Tujenge pamoja – Building our house of worship together. Support the sanctuary improvements, fellowship hall, ministry growth, and grounds maintenance.',
  5000000,
  842500,
  'KES',
  true
);

-- Default admin: email admin@church.org / password: admin123
-- IMPORTANT: Change this password in production!
insert into admin_users (email, password_hash, name, role)
values (
  'admin@church.org',
  '$2a$12$LJ3m4ys3Lg3YOCwKkp/wSeG6NkRpPM.7Y5G0kQ.Y0kY0kY0kY0kY0',
  'Super Admin',
  'super_admin'
);
