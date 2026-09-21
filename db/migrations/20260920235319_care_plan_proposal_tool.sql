begin;
insert into public.ai_tools(organisation_id,key,name,description,handler_ref,is_sensitive,input_schema)
select id, 'propose_care_plan_action', 'Propose a wellbeing action',
 'Save a proposed wellbeing action for the member to accept or decline. Never prescribe treatment.',
 'member.propose_care_plan_action', false,
 '{"type":"object","properties":{"title":{"type":"string","maxLength":120},"detail":{"type":"string","maxLength":1500},"evidenceRefs":{"type":"array","items":{"type":"string"},"maxItems":6}},"required":["title","detail","evidenceRefs"],"additionalProperties":false}'::jsonb
from public.organisations
on conflict(organisation_id,key) do nothing;
insert into public.ai_agent_tools(agent_id,tool_id)
select a.id,t.id from public.ai_agents a join public.ai_tools t on t.organisation_id=a.organisation_id
where a.kind='specialist' and t.handler_ref='member.propose_care_plan_action'
on conflict do nothing;
commit;
