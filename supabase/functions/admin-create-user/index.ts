import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const startTime = Date.now()
  console.log('🚀 [START] Edge Function admin-create-user iniciada')

  try {
    // Verificar env vars
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    console.log('🔑 [CHECK] SUPABASE_URL configurado:', !!supabaseUrl)
    console.log('🔑 [CHECK] SERVICE_ROLE_KEY configurado:', !!supabaseKey)

    // Criar cliente Supabase com service_role key (ambiente seguro)
    const supabaseAdmin = createClient(
      supabaseUrl ?? '',
      supabaseKey ?? ''
    )

    console.log('✅ [OK] Cliente Supabase criado')

    // Processar dados da requisição
    const { email, password, userData } = await req.json()

    console.log('📧 [INFO] Email:', email)
    console.log('👤 [INFO] UserData:', JSON.stringify(userData))

    if (!email || !password) {
      console.error('❌ [ERROR] Email ou password não fornecidos')
      return new Response(
        JSON.stringify({ error: 'Email and password are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Criar usuário usando Admin API
    console.log('⏳ [STEP 1/2] Criando usuário via Auth Admin API...')
    const createUserStart = Date.now()

    const { data: authData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: userData.full_name,
        role: userData.role
      }
    })

    const createUserTime = Date.now() - createUserStart
    console.log(`⏱️  [TIMING] createUser levou ${createUserTime}ms`)

    if (createError) {
      console.error('❌ [ERROR] Falha ao criar usuário:', createError.message)
      return new Response(
        JSON.stringify({ error: createError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('✅ [SUCCESS] Usuário criado:', authData.user.id)

    // Criar perfil na tabela profiles (com TODOS os campos necessários)
    if (authData.user) {
      console.log('⏳ [STEP 2/2] Criando perfil na tabela profiles...')
      const createProfileStart = Date.now()

      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .upsert({
          id: authData.user.id,
          full_name: userData.full_name,
          email: email,  // ← Usar parâmetro email ao invés de userData.email
          role: userData.role,
          status: userData.status || 'ativo',
          phone: userData.phone,
          wallet_id: userData.wallet_id,
          is_affiliate: userData.is_affiliate || false,
          affiliate_status: userData.affiliate_status
        })

      const createProfileTime = Date.now() - createProfileStart
      console.log(`⏱️  [TIMING] createProfile levou ${createProfileTime}ms`)

      if (profileError) {
        console.error('⚠️  [WARNING] Erro ao criar perfil:', profileError.message)
        console.error('Detalhes:', JSON.stringify(profileError))
        // Não falhar se perfil já existe (pode ter trigger automático)
      } else {
        console.log('✅ [SUCCESS] Perfil criado/atualizado')
      }
    }

    const totalTime = Date.now() - startTime
    console.log(`✅ [COMPLETE] Edge Function concluída em ${totalTime}ms`)

    return new Response(
      JSON.stringify({
        data: authData,
        message: 'User created successfully'
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    const totalTime = Date.now() - startTime
    console.error(`💥 [ERROR] Erro após ${totalTime}ms:`, error.message)
    console.error('Stack trace:', error.stack)

    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})