-- ====== v5: Reset fake seed data, use only real donations ======

update campaigns
set raised = 0
where slug = 'development-fund'
  and raised > 0;
