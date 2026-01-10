SELECT COUNT(*) as inconsistentes FROM affiliate_network WHERE parent_affiliate_id IS NOT NULL AND parent_id IS NULL;
