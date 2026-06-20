alter table pledges add column if not exists phone text;
alter table pledges add column if not exists whatsapp_number text;
alter table pledges add column if not exists reminder_freq text default 'weekly';
alter table pledges add column if not exists paid numeric not null default 0;
alter table pledges add column if not exists remaining numeric not null default 0;
alter table pledges add column if not exists rating int not null default 0;
alter table pledges add column if not exists color_hex text default '#3B82F6';

create table if not exists pledge_payments (
  id uuid primary key default gen_random_uuid(),
  pledge_id uuid not null references pledges(id) on delete cascade,
  amount numeric not null,
  paid_at timestamptz not null default now(),
  receipt_number text,
  method text default 'mpesa',
  notes text
);

create table if not exists bible_verses (
  id uuid primary key default gen_random_uuid(),
  verse text not null,
  reference text not null,
  category text default 'encouragement',
  language text default 'en'
);

create index if not exists idx_pledge_payments_pledge on pledge_payments(pledge_id);
create index if not exists idx_pledges_campaign_amount on pledges(campaign_id, amount desc);

insert into bible_verses (verse, reference, category, language) values
('I can do all things through Christ who strengthens me.', 'Philippians 4:13', 'encouragement', 'en'),
('The Lord is my shepherd; I shall not want.', 'Psalm 23:1', 'encouragement', 'en'),
('Give, and it will be given to you.', 'Luke 6:38', 'giving', 'en'),
('Each of you should give what you have decided in your heart to give, not reluctantly or under compulsion, for God loves a cheerful giver.', '2 Corinthians 9:7', 'giving', 'en'),
('Trust in the Lord with all your heart and lean not on your own understanding.', 'Proverbs 3:5', 'encouragement', 'en'),
('Ninaweza mambo yote kwa Kristu anitiaye nguvu.', 'Wafilipi 4:13', 'encouragement', 'sw'),
('Bwana ndiye mchungaji wangu; sitopungukiwa na kitu.', 'Zaburi 23:1', 'encouragement', 'sw'),
('Toa, nanyi mtapewa.', 'Luka 6:38', 'giving', 'sw'),
('Kila mmoja atoe kama alivyokusudia moyoni mwake, si kwa huzuni wala kwa shuruti, maana Mungu ampenda mtoaji aliye na furaha.', '2 Wakorintho 9:7', 'giving', 'sw'),
('Mwekeni Bwana kwa moyo wenu wote, wala msitegemee akili zenu wenyewe.', 'Mithali 3:5', 'encouragement', 'sw'),
('Nami nimejua kwamba mpango nilio nao kwa ajili yenu, ndio huu: mpango wa amani wala si wa msiba, kuwapa matumaini na wakati ujao.', 'Yeremia 29:11', 'encouragement', 'sw'),
('Mungu hawezi kudanganywa; kwa kuwa kila mtu huvuna kile alichopanda.', 'Wagalatia 6:7', 'giving', 'sw'),
('Mcha Bwana ndiye aliye na heri, anayeshika njia zake.', 'Zaburi 128:1', 'encouragement', 'sw'),
('Baraka za Bwana ndizo zile zinazoleta utajiri, wala hajaleta taabu pamoja nazo.', 'Mithali 10:22', 'encouragement', 'sw'),
('Mungu wetu, utukufu una kwa ajili yako; tunakutendea kwa moyo wote na kutoa kwa furaha.', '1 Mambo ya Nyakati 29:13-14', 'giving', 'sw'),
('The Lord bless you and keep you; the Lord make His face shine upon you and be gracious to you.', 'Numbers 6:24-25', 'encouragement', 'en'),
('Honour the Lord with your wealth, with the firstfruits of all your crops.', 'Proverbs 3:9', 'giving', 'en'),
('Freely you have received, freely give.', 'Matthew 10:8', 'giving', 'en');
