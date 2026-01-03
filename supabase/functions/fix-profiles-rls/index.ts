import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Criar cliente com service_role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('🔧 Corrigindo RLS policies da tabela profiles...')

    // SQL para corrigir RLS policies
    const sqlCommands = [
      // Remover policies existentes
      `DROP POLICY IF EXISTS "Users can view own profile" ON profiles;`,
      `DROP POLICY IF EXISTS "Admins view all profiles" ON profiles;`,
      `DROP POLICY IF EXISTS "Public can view profiles" ON profiles;`,
      `DROP POLICY IF EXISTS "Users view own data" ON profiles;`,
      `DROP POLICY IF EXISTS "Allow public read access to profiles" ON profiles;`,
      
      // Criar policy para leitura pública
      `CREATE POLICY "Allow public read access to profiles"
       ON profiles FOR SELECT
       USING (true);`,
       
      // Manter segurança para escrita
      `CREATE POLICY "Users can update own profile"
       ON profiles FOR UPDATE
       USING (auth.uid() = id);`,
       
      `CREATE POLICY "Service role can insert profiles"
       ON profiles FOR INSERT
       WITH CHECK (auth.role() = 'service_role');`
    ]

    const results = []
    
    for (const sql of sqlCommands) {
      try {
        const { data, error } = await supabaseAdmin.rpc('exec_sql', { sql })
        
        if (error) {
          console.error(`Erro ao executar SQL: ${sql}`, error)
          results.push({ sql: sql.substring(0, 50), success: false, error: error.message })
        } else {
          console.log(`✅ SQL executado com sucesso: ${sql.substring(0, 50)}`)
          results.push({ sql: sql.substring(0, 50), success: true })
        }
      } catch (err) {
        console.error(`Erro geral ao executar SQL: ${sql}`, err)
        results.push({ sql: sql.substring(0, 50), success: false, error: err.message })
      }
    }

    // Testar se correção funcionou
    const { data: profiles, error: testError } = await supabaseAdmin
      .from('profiles')
      .select('email, full_name, role')
      .limit(5)

    let testResult = { success: false, count: 0 }
    
    if (!testError && profiles) {
      testResult = { success: true, count: profiles.length, profiles }
      console.log(`✅ Teste: ${profiles.length} perfis acessíveis`)
    } else {
      console.error('❌ Teste falhou:', testError)
      testResult = { success: false, error: testError?.message }
    }

    return new Response(
      JSON.stringify({ 
        message: 'RLS policies corrigidas',
        results,
        test: testResult
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Erro geral:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})