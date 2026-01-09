DROP POLICY IF EXISTS "Affiliates can update own data" ON affiliates;

CREATE POLICY "Affiliates can update own data"
  ON affiliates FOR UPDATE
  TO authenticated
  USING ((auth.uid() = user_id) AND (deleted_at IS NULL))
  WITH CHECK ((auth.uid() = user_id) AND (deleted_at IS NULL));;
