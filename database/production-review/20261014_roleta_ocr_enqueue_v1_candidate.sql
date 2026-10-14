-- REVIEW ONLY: not applied by this commit. Requires DB security audit.
create or replace function roleta_ocr.enqueue_confirmed_photo_v1(
 p_event text, p_version integer, p_digest text, p_actor text, p_image_sha text, p_storage_path text
) returns jsonb
language plpgsql security definer
set search_path=pg_catalog
set row_security=on
as $function$
declare latest roleta_audit.final_roulette_versions%rowtype;
        job roleta_ocr.learning_jobs%rowtype;
begin
 if p_event !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}-[MTI]$' or p_version is null or p_version<1
 or p_digest !~ '^[a-f0-9]{64}$' or p_actor !~ '^[A-Za-z0-9_-]{1,128}$'
 or p_image_sha !~ '^[a-f0-9]{64}$'
 or p_storage_path !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}-[MTI]/[0-9]+/[a-f0-9]{64}[.](jpg|png|webp)$'
 then raise exception 'invalid OCR shadow request' using errcode='22023'; end if;
 if not exists(select 1 from roleta_audit.final_operator_identities
               where google_subject=p_actor and enabled)
 then raise exception 'operator rejected' using errcode='42501'; end if;
 perform pg_advisory_xact_lock(hashtextextended('roleta-final:'||p_event,0));
 select * into latest from roleta_audit.final_roulette_versions
 where event_id=p_event order by version desc limit 1;
 if not found or latest.version<>p_version or latest.payload_sha256<>p_digest
 or latest.actor_subject<>p_actor
 then raise exception 'stale, foreign or missing final version' using errcode='40001'; end if;
 insert into roleta_ocr.learning_jobs
  (event_id,final_version_id,image_sha256,image_storage_path,state,submitted_by,consent_at)
 values (p_event,p_version::text,p_image_sha,p_storage_path,'queued',p_actor,now())
 on conflict (event_id,final_version_id,image_sha256) do nothing;
 select * into job from roleta_ocr.learning_jobs
 where event_id=p_event and final_version_id=p_version::text and image_sha256=p_image_sha;
 if job.image_storage_path is distinct from p_storage_path
 then raise exception 'shadow digest collision with different path' using errcode='23505'; end if;
 return jsonb_build_object('status','queued','job_id',job.id,'event_id',job.event_id,'final_version_id',job.final_version_id);
end $function$;
revoke all on function roleta_ocr.enqueue_confirmed_photo_v1(text,integer,text,text,text,text) from public,anon,authenticated;
grant usage on schema roleta_ocr to roleta_v2_writer;
grant execute on function roleta_ocr.enqueue_confirmed_photo_v1(text,integer,text,text,text,text) to roleta_v2_writer;
