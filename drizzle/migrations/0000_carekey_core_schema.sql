-- ENUMS
create type public.app_role as enum ('patient','doctor','admin');
create type public.consent_status as enum ('pending','active','expired','revoked','rejected');

-- PROFILES
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default 'Unnamed',
  email text,
  organization text,
  specialty text,
  created_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

-- ROLES
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role app_role not null,
  unique (user_id, role)
);
grant select, insert on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

-- PATIENTS
create table public.patients (
  id uuid primary key references public.profiles(id) on delete cascade,
  medical_id text not null unique default ('CK-' || upper(substr(md5(random()::text||clock_timestamp()::text),1,8))),
  date_of_birth date,
  gender text,
  phone text,
  address text,
  emergency_contact_name text,
  emergency_contact_phone text,
  blood_group text,
  rh_factor text,
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.patients to authenticated;
grant all on public.patients to service_role;
alter table public.patients enable row level security;

-- CONSENTS
create table public.consents (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  provider_id uuid not null references public.profiles(id) on delete cascade,
  permissions text[] not null default '{}',
  purpose text not null default 'consultation',
  status consent_status not null default 'pending',
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  revoked_at timestamptz
);
grant select, insert, update on public.consents to authenticated;
grant all on public.consents to service_role;
alter table public.consents enable row level security;

-- CONSENT CHECK (security definer, avoids RLS recursion)
create or replace function public.has_consent(_patient_id uuid, _category text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.consents c
    where c.patient_id = _patient_id
      and c.provider_id = auth.uid()
      and c.status = 'active'
      and c.revoked_at is null
      and (c.expires_at is null or c.expires_at > now())
      and _category = any(c.permissions)
  )
$$;

-- MEDICAL DATA TABLES
create table public.allergies (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  allergen text not null,
  reaction text,
  severity text not null default 'mild',
  created_at timestamptz not null default now()
);
create table public.conditions (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  name text not null,
  diagnosis_date date,
  status text not null default 'active',
  critical boolean not null default false,
  notes text,
  created_at timestamptz not null default now()
);
create table public.medications (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  name text not null,
  dosage text,
  frequency text,
  start_date date,
  end_date date,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create table public.surgeries (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  procedure text not null,
  surgery_date date,
  hospital text,
  major boolean not null default false,
  notes text,
  created_at timestamptz not null default now()
);
create table public.documents (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  file_name text not null,
  doc_type text not null default 'other',
  storage_path text,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.allergies, public.conditions, public.medications, public.surgeries, public.documents to authenticated;
grant all on public.allergies, public.conditions, public.medications, public.surgeries, public.documents to service_role;
alter table public.allergies enable row level security;
alter table public.conditions enable row level security;
alter table public.medications enable row level security;
alter table public.surgeries enable row level security;
alter table public.documents enable row level security;

-- ACCESS LOGS
create table public.access_logs (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references public.patients(id) on delete set null,
  medical_id text,
  provider_id uuid references public.profiles(id) on delete set null,
  provider_name text,
  action text not null,
  categories text[] not null default '{}',
  reason text,
  access_type text not null default 'consent',
  verification_result text,
  success boolean not null default true,
  created_at timestamptz not null default now()
);
grant select, insert on public.access_logs to authenticated;
grant all on public.access_logs to service_role;
alter table public.access_logs enable row level security;

-- HOSPITALS
create table public.hospitals (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  latitude double precision not null,
  longitude double precision not null,
  address text,
  phone text,
  emergency boolean not null default true,
  trauma boolean not null default false,
  ambulance boolean not null default true,
  open_24h boolean not null default true,
  created_at timestamptz not null default now()
);
grant select on public.hospitals to anon, authenticated;
grant select, insert, update, delete on public.hospitals to authenticated;
grant all on public.hospitals to service_role;
alter table public.hospitals enable row level security;

-- POLICIES
create policy "own profile read" on public.profiles for select to authenticated
  using (id = auth.uid() or public.has_role(auth.uid(),'admin') or public.has_consent(id,'basic')
         or exists (select 1 from public.consents c where c.provider_id = profiles.id and c.patient_id = auth.uid())
         or public.has_role(profiles.id,'doctor'));
create policy "own profile insert" on public.profiles for insert to authenticated with check (id = auth.uid());
create policy "own profile update" on public.profiles for update to authenticated using (id = auth.uid());

create policy "roles read" on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "roles self insert" on public.user_roles for insert to authenticated with check (user_id = auth.uid());

create policy "patient own" on public.patients for all to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
create policy "patient shared read" on public.patients for select to authenticated
  using (public.has_consent(id,'basic') or public.has_consent(id,'blood') or public.has_role(auth.uid(),'admin'));

create policy "allergies own" on public.allergies for all to authenticated
  using (patient_id = auth.uid()) with check (patient_id = auth.uid());
create policy "allergies shared" on public.allergies for select to authenticated
  using (public.has_consent(patient_id,'allergies'));

create policy "conditions own" on public.conditions for all to authenticated
  using (patient_id = auth.uid()) with check (patient_id = auth.uid());
create policy "conditions shared" on public.conditions for select to authenticated
  using (public.has_consent(patient_id,'conditions'));

create policy "medications own" on public.medications for all to authenticated
  using (patient_id = auth.uid()) with check (patient_id = auth.uid());
create policy "medications shared" on public.medications for select to authenticated
  using (public.has_consent(patient_id,'medications'));

create policy "surgeries own" on public.surgeries for all to authenticated
  using (patient_id = auth.uid()) with check (patient_id = auth.uid());
create policy "surgeries shared" on public.surgeries for select to authenticated
  using (public.has_consent(patient_id,'surgeries'));

create policy "documents own" on public.documents for all to authenticated
  using (patient_id = auth.uid()) with check (patient_id = auth.uid());
create policy "documents shared" on public.documents for select to authenticated
  using (
    (doc_type = 'prescription' and public.has_consent(patient_id,'prescriptions'))
    or (doc_type = 'lab_report' and public.has_consent(patient_id,'lab_reports'))
    or public.has_consent(patient_id,'documents')
  );

create policy "consent patient manage" on public.consents for all to authenticated
  using (patient_id = auth.uid()) with check (patient_id = auth.uid());
create policy "consent provider read" on public.consents for select to authenticated
  using (provider_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "consent provider request" on public.consents for insert to authenticated
  with check (provider_id = auth.uid() and status = 'pending');

create policy "logs read" on public.access_logs for select to authenticated
  using (patient_id = auth.uid() or provider_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "logs insert" on public.access_logs for insert to authenticated with check (true);

create policy "hospitals read" on public.hospitals for select to authenticated, anon using (true);
create policy "hospitals admin write" on public.hospitals for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- auto-expire helper used by app reads
create or replace function public.expire_stale_consents()
returns void language sql security definer set search_path = public as $$
  update public.consents set status = 'expired'
  where status = 'active' and expires_at is not null and expires_at <= now();
$$;
grant execute on function public.expire_stale_consents() to authenticated;

-- DEMO HOSPITALS (fictional records, Bengaluru area coordinates)
insert into public.hospitals (name, latitude, longitude, address, phone, emergency, trauma, ambulance, open_24h) values
('CareKey Demo City Hospital', 12.9716, 77.5946, '12 MG Road, Demo City', '+91 80 1000 0001', true, true, true, true),
('Sunrise Demo Multispeciality', 12.9352, 77.6245, '45 Koramangala Main Rd', '+91 80 1000 0002', true, true, true, true),
('Green Valley Demo Clinic', 12.9784, 77.6408, '8 Indiranagar 100ft Rd', '+91 80 1000 0003', false, false, false, false),
('Metro Demo Trauma Centre', 12.9141, 77.6101, '77 BTM Layout', '+91 80 1000 0004', true, true, true, true),
('Lotus Demo Hospital', 13.0298, 77.5400, '3 Yeshwanthpur Circle', '+91 80 1000 0005', true, false, true, true),
('Riverside Demo Medical', 12.9081, 77.6476, '19 HSR Layout Sector 2', '+91 80 1000 0006', true, false, true, false),
('Harmony Demo Care', 12.9698, 77.7500, '5 Whitefield Main Rd', '+91 80 1000 0007', true, true, true, true),
('Bluebell Demo Hospital', 13.0067, 77.5560, '22 Malleshwaram 8th Cross', '+91 80 1000 0008', false, false, true, false),
('Unity Demo Emergency Centre', 12.9250, 77.5938, '30 Jayanagar 4th Block', '+91 80 1000 0009', true, true, true, true),
('Pinewood Demo Hospital', 12.9600, 77.5700, '14 Vijayanagar', '+91 80 1000 0010', true, false, true, true),
('Northstar Demo Institute', 13.0460, 77.6200, '9 Hebbal Ring Rd', '+91 80 1000 0011', true, true, true, true),
('Crescent Demo Clinic', 12.8890, 77.5990, '2 Electronic City Ph 1', '+91 80 1000 0012', false, false, false, false),
('Orchid Demo Hospital', 12.9450, 77.5530, '61 Banashankari 2nd Stage', '+91 80 1000 0013', true, false, true, true),
('Silverline Demo Medical', 12.9990, 77.6900, '18 Marathahalli Bridge', '+91 80 1000 0014', true, false, true, true),
('Grandview Demo Trauma', 12.9370, 77.6900, '7 Bellandur Gate', '+91 80 1000 0015', true, true, true, true),
('Maple Demo Hospital', 13.0200, 77.6400, '25 Kalyan Nagar', '+91 80 1000 0016', true, false, true, false),
('Skyline Demo Care', 12.8500, 77.6600, '40 Chandapura', '+91 80 1000 0017', false, false, true, true),
('Aster Demo Community Hospital', 12.9900, 77.5100, '11 Nagarbhavi', '+91 80 1000 0018', true, false, true, true),
('Willow Demo Hospital', 12.9020, 77.5200, '3 Kengeri Satellite Town', '+91 80 1000 0019', true, true, true, true),
('Horizon Demo Emergency', 13.0700, 77.5800, '55 Yelahanka New Town', '+91 80 1000 0020', true, true, true, true);