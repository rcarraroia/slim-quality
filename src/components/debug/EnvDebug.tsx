/**
 * Componente de Debug - Verificar Variáveis de Ambiente
 * Temporário para diagnosticar problema de login
 */

import React from 'react';

export function EnvDebug() {
  const envVars = {
    VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
    VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
    MODE: import.meta.env.MODE,
    DEV: import.meta.env.DEV,
    PROD: import.meta.env.PROD,
  };

  return (
    <div style={{ 
      position: 'fixed', 
      top: 10, 
      right: 10, 
      background: 'rgba(0,0,0,0.8)', 
      color: 'white', 
      padding: '10px', 
      borderRadius: '5px',
      fontSize: '12px',
      zIndex: 9999,
      maxWidth: '400px'
    }}>
      <h4>🔍 Debug - Variáveis de Ambiente</h4>
      {Object.entries(envVars).map(([key, value]) => (
        <div key={key}>
          <strong>{key}:</strong> {
            key.includes('KEY') 
              ? (value ? `${String(value).substring(0, 20)}...` : 'UNDEFINED')
              : String(value) || 'UNDEFINED'
          }
        </div>
      ))}
    </div>
  );
}