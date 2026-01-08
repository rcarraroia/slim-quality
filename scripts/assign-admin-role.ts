/**
 * Script para atribuir role admin ao usuário
 * Execute: npx tsx scripts/assign-admin-role.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function assignAdminRole() {
  const email = 'admin@slimquality.com';
  
  console.log(`Atribuindo role admin para ${email}...`);
  
  // Buscar usuário
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('id, email, full_name')
    .eq('email', email)
    .single();
  
  if (profileError || !profile) {
    console.error('Erro ao buscar usuário:', profileError);
    return;
  }
  
  console.log('Usuário encontrado:', profile);
  
  // Verificar se já tem role admin
  const { data: existingRole } = await supabaseAdmin
    .from('user_roles')
    .select('*')
    .eq('user_id', profile.id)
    .eq('role', 'admin')
    .is('deleted_at', null)
    .single();
  
  if (existingRole) {
    console.log('✅ Usuário já tem role admin!');
    return;
  }
  
  // Atribuir role admin
  const { error: roleError } = await supabaseAdmin
    .from('user_roles')
    .insert({
      user_id: profile.id,
      role: 'admin'
    });
  
  if (roleError) {
    console.error('Erro ao atribuir role:', roleError);
    return;
  }
  
  console.log('✅ Role admin atribuída com sucesso!');
  
  // Verificar roles finais
  const { data: roles } = await supabaseAdmin
    .from('user_roles')
    .select('role')
    .eq('user_id', profile.id)
    .is('deleted_at', null);
  
  console.log('Roles do usuário:', roles?.map(r => r.role));
}

assignAdminRole()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Erro:', error);
    process.exit(1);
  });
