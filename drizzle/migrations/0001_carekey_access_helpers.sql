-- doctors can see identity of patients they have any consent record with
create policy "patients shared identity" on public.patients for select to authenticated
  using (exists (select 1 from public.consents c where c.patient_id = patients.id and c.provider_id = auth.uid()));

-- lookup used by doctors when requesting access by medical id
create or replace function public.find_patient_by_medical_id(_medical_id text)
returns table (patient_id uuid, full_name text, medical_id text)
language sql stable security definer set search_path = public as $$
  select p.id, pr.full_name, p.medical_id
  from public.patients p
  join public.profiles pr on pr.id = p.id
  where upper(p.medical_id) = upper(_medical_id)
    and (public.has_role(auth.uid(),'doctor') or public.has_role(auth.uid(),'admin'))
  limit 1
$$;
grant execute on function public.find_patient_by_medical_id(text) to authenticated;

-- emergency profile: limited critical fields, only for doctors/admins, always logged by caller
create or replace function public.emergency_profile(_medical_id text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare rec record; result jsonb;
begin
  if not (public.has_role(auth.uid(),'doctor') or public.has_role(auth.uid(),'admin')) then
    raise exception 'not authorised for emergency access';
  end if;
  select p.id, p.medical_id, p.blood_group, p.rh_factor, p.emergency_contact_name,
         p.emergency_contact_phone, pr.full_name
    into rec
  from public.patients p join public.profiles pr on pr.id = p.id
  where upper(p.medical_id) = upper(_medical_id);
  if not found then return null; end if;

  select jsonb_build_object(
    'patient_id', rec.id,
    'medical_id', rec.medical_id,
    'full_name', rec.full_name,
    'blood_group', rec.blood_group,
    'rh_factor', rec.rh_factor,
    'emergency_contact_name', rec.emergency_contact_name,
    'emergency_contact_phone', rec.emergency_contact_phone,
    'allergies', coalesce((select jsonb_agg(jsonb_build_object('allergen',a.allergen,'reaction',a.reaction,'severity',a.severity))
                           from public.allergies a where a.patient_id = rec.id and a.severity in ('severe','moderate')), '[]'::jsonb),
    'medications', coalesce((select jsonb_agg(jsonb_build_object('name',m.name,'dosage',m.dosage,'frequency',m.frequency))
                           from public.medications m where m.patient_id = rec.id and m.active), '[]'::jsonb),
    'conditions', coalesce((select jsonb_agg(jsonb_build_object('name',c.name,'status',c.status))
                           from public.conditions c where c.patient_id = rec.id and c.critical), '[]'::jsonb),
    'surgeries', coalesce((select jsonb_agg(jsonb_build_object('procedure',s.procedure,'surgery_date',s.surgery_date,'hospital',s.hospital))
                           from public.surgeries s where s.patient_id = rec.id and s.major), '[]'::jsonb)
  ) into result;
  return result;
end;
$$;
grant execute on function public.emergency_profile(text) to authenticated;

-- regenerate medical id for own record
create or replace function public.regenerate_medical_id()
returns text language plpgsql security definer set search_path = public as $$
declare new_id text;
begin
  new_id := 'CK-' || upper(substr(md5(random()::text||clock_timestamp()::text),1,8));
  update public.patients set medical_id = new_id where id = auth.uid();
  return new_id;
end;
$$;
grant execute on function public.regenerate_medical_id() to authenticated;