DROP POLICY IF EXISTS "Users can register as affiliates" ON affiliates;

CREATE POLICY "Users can register as affiliates"
  ON affiliates FOR INSERT
  TO authenticated
  WITH CHECK ((auth.uid() = user_id) AND (status = 'pending'::affiliate_status));;
