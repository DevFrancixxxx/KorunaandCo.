-- Seed extracted from "KC_Roadmap_Gantt_v1_DRAFT - Gantt.pdf" (12 Oct 2026).
-- Prerequisite: run 202610160002_separate_roadmap_table.sql and
-- 202610160003_roadmap_tasks.sql first.
-- This replaces every roadmap task for roadmap_id = 1.

begin;

insert into public.project_roadmap (id, data)
values (
  1,
  $roadmap$
  {
    "workbookTitle":"Koruna & Co Roadmap – Gantt Timeline",
    "headerContext":"Draft V1 · 12 Oct 2026 · Fast-track",
    "instruction":"Week 1 starts Monday 5 October 2026. Planned dates set the bars. Update Status as work moves.",
    "project":{"company":"Koruna & Co","project":"Koruna & Co Roadmap","asOf":"2026-10-12","preparedBy":"Jeralyn Alunan","for":"Jessica Timon","sponsor":"Petra Novakova","targetCompletion":"2027-04-02"},
    "legend":["Done","In progress","Not started","Milestone"],
    "notesAndPointsToConfirm":[
      {"heading":"Fast-track","text":"Follows Miss Jess's roadmap weeks because Miss P wants immediate rollout."},
      {"heading":"SOPs","text":"Two working days per AI tool. Priority: Claude → GHL → Xero × Claude."},
      {"heading":"Training","text":"Runs alongside testing, on dummy tasks only."},
      {"heading":"Xero × Claude","text":"Separate track: review project progress first; SOP dates are TBC."},
      {"heading":"Still to confirm","text":"Phase 1 status and owners, skills-assessment timing, first pilot client, and complaint baseline."},
      {"heading":"Guardrails","text":"Use approved tools only; use dummy/test data until client approval; pilots require human review and escalation."}
    ]
  }
  $roadmap$::jsonb
)
on conflict (id) do update set data = excluded.data, updated_at = now();

insert into public.project_snapshot (id, version, rows, updated_at)
values (
  1,
  1,
  $tasks$
[
 {"id":"phase-1-foundation","phase":"Foundation","step":"PHASE 1 · FOUNDATION","type":"Phase","owner":"","roadmapTiming":"Week 1","plannedStart":"2026-10-05","plannedEnd":"2026-10-09","workDays":5,"status":"In progress","notes":""},
 {"id":"task-01","phase":"Foundation","step":"HK company structure","type":"Task","owner":"TBC","roadmapTiming":"Week 1","plannedStart":"2026-10-05","plannedEnd":"2026-10-09","workDays":5,"status":"In progress","notes":"Ticked on roadmap; Jeralyn checking."},
 {"id":"task-02","phase":"Foundation","step":"Finalise KC positioning","type":"Task","owner":"TBC","roadmapTiming":"Week 1","plannedStart":"2026-10-05","plannedEnd":"2026-10-09","workDays":5,"status":"In progress","notes":""},
 {"id":"task-03","phase":"Foundation","step":"Lock pricing + commercial model","type":"Task","owner":"TBC","roadmapTiming":"Week 1","plannedStart":"2026-10-05","plannedEnd":"2026-10-09","workDays":5,"status":"In progress","notes":"Tracker v6 Pricing row still Open."},
 {"id":"task-04","phase":"Foundation","step":"Define the 4 core offers: AI VAs, Recruitment, Payroll/HR, Cybersecurity & Compliance","type":"Task","owner":"TBC","roadmapTiming":"Week 1","plannedStart":"2026-10-05","plannedEnd":"2026-10-09","workDays":5,"status":"In progress","notes":"Kept as is for now (differs from Charter; no change yet)."},
 {"id":"phase-2-build-product","phase":"Build The Product","step":"PHASE 2 · BUILD THE PRODUCT","type":"Phase","owner":"","roadmapTiming":"Weeks 1–2","plannedStart":"2026-10-05","plannedEnd":"2026-10-20","workDays":12,"status":"In progress","notes":""},
 {"id":"task-05","phase":"Build The Product","step":"Define AI tool stack (AI Tools Repository)","type":"Task","owner":"Jeralyn","roadmapTiming":"Weeks 1–2","plannedStart":"2026-10-05","plannedEnd":"2026-10-08","workDays":4,"status":"Done","notes":"Repository done 8 Oct. Priority: Claude → GHL → Xero × Claude."},
 {"id":"task-06","phase":"Build The Product","step":"Claude_SOP1–5 drafted","type":"Task","owner":"Jeralyn","roadmapTiming":"Week 2","plannedStart":"2026-10-09","plannedEnd":"2026-10-12","workDays":2,"status":"Done","notes":"Writing, large files, Office files, web pages, research."},
 {"id":"task-07","phase":"Build The Product","step":"Claude_SOP1–5 approval (Jessica)","type":"Task","owner":"Jessica","roadmapTiming":"Week 2","plannedStart":"2026-10-13","plannedEnd":"2026-10-16","workDays":4,"status":"In progress","notes":"Sent for approval 12–13 Oct."},
 {"id":"task-08","phase":"Build The Product","step":"Claude_SOP6–10 drafted","type":"Task","owner":"Jeralyn","roadmapTiming":"Week 2","plannedStart":"2026-10-13","plannedEnd":"2026-10-13","workDays":1,"status":"Done","notes":"Social graphics, brand matching, saving designs, email nurture, coding (proposed SOP10)."},
 {"id":"task-09","phase":"Build The Product","step":"GHL_SOP1–5","type":"Task","owner":"Jeralyn","roadmapTiming":"Week 2","plannedStart":"2026-10-14","plannedEnd":"2026-10-14","workDays":1,"status":"Done","notes":"Test account / dummy data only (GHL not KA-approved)."},
 {"id":"task-10","phase":"Build The Product","step":"GHL_SOP1–5 approval (Jessica)","type":"Task","owner":"Jessica","roadmapTiming":"Week 2","plannedStart":"2026-10-15","plannedEnd":"2026-10-20","workDays":null,"status":"Not started","notes":"Sent for approval 14 Oct."},
 {"id":"task-11","phase":"Build The Product","step":"GHL_SOP6 onward","type":"Task","owner":"Jeralyn","roadmapTiming":"Week 2","plannedStart":"2026-10-15","plannedEnd":"2026-10-15","workDays":1,"status":"Done","notes":"Count set by GHL repository bullets."},
 {"id":"task-12","phase":"Build The Product","step":"GHL_SOP7–11 approval (Jessica)","type":"Task","owner":"Jessica","roadmapTiming":"Week 2","plannedStart":"2026-10-15","plannedEnd":"2026-10-20","workDays":4,"status":"Not started","notes":"Sent for approval 15 Oct."},
 {"id":"task-13","phase":"Build The Product","step":"Create AI skills assessment","type":"Task","owner":"TBC","roadmapTiming":"Week 2","plannedStart":"2026-10-12","plannedEnd":"2026-10-16","workDays":5,"status":"Not started","notes":"HR competency draft due 23 Oct (Tracker v6) — later than roadmap."},
 {"id":"task-14","phase":"Build The Product","step":"Create KC Skills Passport","type":"Task","owner":"TBC","roadmapTiming":"Week 2","plannedStart":"2026-10-12","plannedEnd":"2026-10-16","workDays":5,"status":"Not started","notes":""},
 {"id":"task-15","phase":"Build The Product","step":"Build KC Academy (modules from SOPs)","type":"Task","owner":"Jeralyn","roadmapTiming":"Week 3","plannedStart":"2026-10-19","plannedEnd":"2026-10-23","workDays":5,"status":"In progress","notes":"AI Solutions creates and delivers modules."},
 {"id":"task-16","phase":"Build The Product","step":"Select first 5–10 VAs","type":"Task","owner":"TBC","roadmapTiming":"Week 2","plannedStart":"2026-10-14","plannedEnd":"2026-10-16","workDays":3,"status":"Not started","notes":""},
 {"id":"task-17","phase":"Build The Product","step":"Train + certify: Claude SOP1–10","type":"Task","owner":"Jeralyn","roadmapTiming":"Week 2","plannedStart":"2026-10-15","plannedEnd":"2026-10-16","workDays":2,"status":"Not started","notes":"Fast-track: train while testing, dummy tasks only."},
 {"id":"task-18","phase":"Build The Product","step":"Train + certify: GHL SOPs","type":"Task","owner":"Jeralyn","roadmapTiming":"Week 3","plannedStart":"2026-10-19","plannedEnd":"2026-10-23","workDays":5,"status":"Not started","notes":"Dummy data only."},
 {"id":"milestone-01","phase":"Build The Product","step":"Goal: “AI-Powered VA” is real","type":"Milestone","owner":"","roadmapTiming":"End wk 2","plannedStart":"2026-10-16","plannedEnd":"2026-10-16","workDays":1,"status":"Not started","notes":"First cohort trained on Claude SOPs."},
 {"id":"phase-xero-claude","phase":"Xero × Claude","step":"XERO × CLAUDE","type":"Phase","owner":"","roadmapTiming":"TBC","plannedStart":"2026-10-16","plannedEnd":"2026-10-19","workDays":2,"status":"Not started","notes":""},
 {"id":"task-19","phase":"Xero × Claude","step":"Review project progress (restart checklist)","type":"Task","owner":"Jeralyn","roadmapTiming":"—","plannedStart":"2026-10-16","plannedEnd":"2026-10-19","workDays":2,"status":"Not started","notes":"11 Aug approval outcome, trial setup, read-only scopes, missing docs."},
 {"id":"milestone-02","phase":"Xero × Claude","step":"Set Xero SOP dates","type":"Milestone","owner":"Jeralyn","roadmapTiming":"—","plannedStart":"2026-10-19","plannedEnd":"2026-10-19","workDays":1,"status":"Not started","notes":"Dates TBC after review. Dummy data only."},
 {"id":"phase-3-package","phase":"Package It","step":"PHASE 3 · PACKAGE IT","type":"Phase","owner":"","roadmapTiming":"Weeks 2–3","plannedStart":"2026-10-12","plannedEnd":"2026-10-23","workDays":10,"status":"Not started","notes":""},
 {"id":"task-20","phase":"Package It","step":"Website","type":"Task","owner":"TBC","roadmapTiming":"Weeks 2–3","plannedStart":"2026-10-12","plannedEnd":"2026-10-23","workDays":10,"status":"Not started","notes":"Tracker v6 Launch row Open."},
 {"id":"task-21","phase":"Package It","step":"1-page offer","type":"Task","owner":"TBC","roadmapTiming":"Week 3","plannedStart":"2026-10-19","plannedEnd":"2026-10-20","workDays":2,"status":"Not started","notes":"Needs offers and pricing locked."},
 {"id":"task-22","phase":"Package It","step":"Pricing (published)","type":"Task","owner":"TBC","roadmapTiming":"Week 3","plannedStart":"2026-10-19","plannedEnd":"2026-10-20","workDays":2,"status":"Not started","notes":""},
 {"id":"task-23","phase":"Package It","step":"Sales deck","type":"Task","owner":"TBC","roadmapTiming":"Week 3","plannedStart":"2026-10-19","plannedEnd":"2026-10-21","workDays":3,"status":"Not started","notes":""},
 {"id":"task-24","phase":"Package It","step":"Sales scripts","type":"Task","owner":"TBC","roadmapTiming":"Week 3","plannedStart":"2026-10-21","plannedEnd":"2026-10-23","workDays":3,"status":"Not started","notes":""},
 {"id":"task-25","phase":"Package It","step":"AI workflow demos (Claude + GHL)","type":"Task","owner":"Jeralyn","roadmapTiming":"Week 3","plannedStart":"2026-10-19","plannedEnd":"2026-10-23","workDays":5,"status":"Not started","notes":"Built from the SOPs."},
 {"id":"task-26","phase":"Package It","step":"Skills Passport (sales version)","type":"Task","owner":"TBC","roadmapTiming":"Week 3","plannedStart":"2026-10-22","plannedEnd":"2026-10-23","workDays":2,"status":"Not started","notes":""},
 {"id":"phase-4-prove","phase":"Prove It","step":"PHASE 4 · PROVE IT","type":"Phase","owner":"","roadmapTiming":"Weeks 3–6","plannedStart":"2026-10-19","plannedEnd":"2026-11-13","workDays":20,"status":"Not started","notes":""},
 {"id":"task-27","phase":"Prove It","step":"Pick existing KA clients + set complaint baseline","type":"Task","owner":"TBC","roadmapTiming":"Week 3","plannedStart":"2026-10-19","plannedEnd":"2026-10-21","workDays":3,"status":"Not started","notes":"Target client still TBC (Tracker v6 Pilot row)."},
 {"id":"task-28","phase":"Prove It","step":"Offer AI-powered VA pilot","type":"Task","owner":"TBC","roadmapTiming":"Week 3","plannedStart":"2026-10-21","plannedEnd":"2026-10-23","workDays":3,"status":"Not started","notes":"Human review, escalation, approved tools only."},
 {"id":"task-29","phase":"Prove It","step":"Run pilot: measure time + cost savings","type":"Task","owner":"TBC","roadmapTiming":"Weeks 4–6","plannedStart":"2026-10-26","plannedEnd":"2026-11-13","workDays":15,"status":"Not started","notes":"3-week pilot."},
 {"id":"task-30","phase":"Prove It","step":"Document before / after workflows","type":"Task","owner":"TBC","roadmapTiming":"Weeks 4–6","plannedStart":"2026-10-26","plannedEnd":"2026-11-13","workDays":15,"status":"Not started","notes":""},
 {"id":"task-31","phase":"Prove It","step":"Build first case studies","type":"Task","owner":"TBC","roadmapTiming":"Week 6","plannedStart":"2026-11-09","plannedEnd":"2026-11-13","workDays":5,"status":"Not started","notes":""},
 {"id":"milestone-03","phase":"Prove It","step":"Target: 5–10 successful placements","type":"Milestone","owner":"","roadmapTiming":"End wk 6","plannedStart":"2026-11-13","plannedEnd":"2026-11-13","workDays":1,"status":"Not started","notes":""},
 {"id":"phase-5-niche","phase":"Find The Next Niche","step":"PHASE 5 · FIND THE NEXT NICHE","type":"Phase","owner":"","roadmapTiming":"Months 2–3","plannedStart":"2026-11-02","plannedEnd":"2027-01-08","workDays":50,"status":"Not started","notes":""},
 {"id":"task-32","phase":"Find The Next Niche","step":"Shortlist 2–3 industries","type":"Task","owner":"TBC","roadmapTiming":"Month 2","plannedStart":"2026-11-02","plannedEnd":"2026-11-06","workDays":5,"status":"Not started","notes":"Options in Sponsor Q&A v1.1, Section 2."},
 {"id":"task-33","phase":"Find The Next Niche","step":"Test Industry A, B, C","type":"Task","owner":"TBC","roadmapTiming":"Months 2–3","plannedStart":"2026-11-09","plannedEnd":"2026-12-18","workDays":30,"status":"Not started","notes":""},
 {"id":"milestone-04","phase":"Find The Next Niche","step":"Find the winner: fastest sales, retention, ROI","type":"Milestone","owner":"","roadmapTiming":"End month 3","plannedStart":"2027-01-08","plannedEnd":"2027-01-08","workDays":1,"status":"Not started","notes":"First working week after the holidays."},
 {"id":"phase-6-scale","phase":"Scale","step":"PHASE 6 · SCALE","type":"Phase","owner":"","roadmapTiming":"Months 3–6","plannedStart":"2026-11-30","plannedEnd":"2027-04-02","workDays":90,"status":"Not started","notes":""},
 {"id":"task-34","phase":"Scale","step":"Outbound sales + referral program","type":"Task","owner":"TBC","roadmapTiming":"Months 3–6","plannedStart":"2026-11-30","plannedEnd":"2027-04-02","workDays":90,"status":"Not started","notes":""},
 {"id":"task-35","phase":"Scale","step":"Partnerships","type":"Task","owner":"TBC","roadmapTiming":"Months 3–6","plannedStart":"2026-11-30","plannedEnd":"2027-04-02","workDays":90,"status":"Not started","notes":""},
 {"id":"task-36","phase":"Scale","step":"Larger KC Academy cohorts","type":"Task","owner":"Jeralyn","roadmapTiming":"Months 3–6","plannedStart":"2026-11-30","plannedEnd":"2027-04-02","workDays":90,"status":"Not started","notes":""},
 {"id":"task-37","phase":"Scale","step":"Paid acquisition","type":"Task","owner":"TBC","roadmapTiming":"Months 3–6","plannedStart":"2027-01-11","plannedEnd":"2027-04-02","workDays":60,"status":"Not started","notes":"After the niche winner."},
 {"id":"task-38","phase":"Scale","step":"Industry-specific AI VA training","type":"Task","owner":"Jeralyn","roadmapTiming":"Months 3–6","plannedStart":"2027-01-11","plannedEnd":"2027-04-02","workDays":60,"status":"Not started","notes":"For the winning niche."},
 {"id":"milestone-05","phase":"Scale","step":"10 → 25 → 50 → 100 KC people","type":"Milestone","owner":"","roadmapTiming":"End month 6","plannedStart":"2027-04-02","plannedEnd":"2027-04-02","workDays":1,"status":"Not started","notes":""}
]
  $tasks$::jsonb,
  now()
)
on conflict (id) do update
set rows = excluded.rows,
    version = public.project_snapshot.version + 1,
    updated_at = now();

delete from public.roadmap_tasks where roadmap_id = 1;

insert into public.roadmap_tasks
  (id, roadmap_id, position, task, phase, owner, reviewer, status, due_date, notes, data)
select
  item ->> 'id',
  1,
  ordinal,
  item ->> 'step',
  item ->> 'phase',
  nullif(item ->> 'owner', ''),
  nullif(item ->> 'reviewer', ''),
  item ->> 'status',
  (item ->> 'plannedEnd')::date,
  nullif(item ->> 'notes', ''),
  item
from public.project_snapshot snapshot
cross join lateral jsonb_array_elements(snapshot.rows) with ordinality as entries(item, ordinal)
where snapshot.id = 1;

commit;
