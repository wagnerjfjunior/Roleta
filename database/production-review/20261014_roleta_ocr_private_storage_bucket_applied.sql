-- Applied 2026-10-14, project uobxxgzshrmbtjfdolxd.
-- Private bucket only; uploading requires separate authenticated server-side implementation.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('roleta-ocr-shadow','roleta-ocr-shadow',false,900000,array['image/jpeg','image/png','image/webp']::text[])
on conflict(id) do nothing;
-- No public read/write policies created. Expiration/retention worker not yet implemented.
