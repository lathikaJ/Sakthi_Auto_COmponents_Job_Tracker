
CREATE POLICY "evidence upload own folder" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'audit-evidence' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "evidence read own or admin" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'audit-evidence' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(), 'admin')));
CREATE POLICY "evidence update own" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'audit-evidence' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "evidence delete own" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'audit-evidence' AND (storage.foldername(name))[1] = auth.uid()::text);
