DROP POLICY IF EXISTS "Affiliates can view own data" ON affiliates;

CREATE POLICY "Affiliates can view own data"
  ON affiliates FOR SELECT
  TO authenticated
  USING ((auth.uid() = user_id) AND (deleted_at IS NULL));;
