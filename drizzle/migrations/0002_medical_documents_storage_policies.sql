create policy "patients manage own documents" on storage.objects for all to authenticated
  using (bucket_id = 'medical-documents' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'medical-documents' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "providers read consented documents" on storage.objects for select to authenticated
  using (
    bucket_id = 'medical-documents' and exists (
      select 1 from public.documents d
      where d.storage_path = storage.objects.name
        and (
          (d.doc_type = 'prescription' and public.has_consent(d.patient_id,'prescriptions'))
          or (d.doc_type = 'lab_report' and public.has_consent(d.patient_id,'lab_reports'))
          or public.has_consent(d.patient_id,'documents')
        )
    )
  );