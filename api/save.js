// API: POST /api/save
// Guarda todos los préstamos en Supabase (reemplaza todo)

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // CORS headers para permitir peticiones desde cualquier origen
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Manejar preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Solo permitir método POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Validar que se envió el array de préstamos
    const { loans } = req.body;

    if (!Array.isArray(loans)) {
      return res.status(400).json({ 
        error: 'Invalid request',
        message: 'loans must be an array' 
      });
    }

    // Inicializar cliente de Supabase
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({ 
        error: 'Supabase configuration missing',
        message: 'Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables'
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Eliminar todos los préstamos existentes
    const { error: deleteError } = await supabase
      .from('prestamos')
      .delete()
      .neq('id', 0); // Eliminar todos (truco para eliminar todo)

    if (deleteError) {
      console.error('Error deleting existing loans:', deleteError);
      // Continuar de todas formas, puede que no haya datos
    }

    // Si no hay préstamos, solo retornar éxito
    if (loans.length === 0) {
      return res.status(200).json({ 
        success: true, 
        message: 'All loans deleted successfully' 
      });
    }

    // Insertar cada préstamo como una fila separada
    const rowsToInsert = loans.map(loan => ({
      data: loan,
      updated_at: new Date().toISOString()
    }));

    const { data: insertedData, error: insertError } = await supabase
      .from('prestamos')
      .insert(rowsToInsert)
      .select();

    if (insertError) {
      console.error('Supabase insert error:', insertError);
      return res.status(500).json({ 
        error: 'Database error',
        message: insertError.message 
      });
    }

    return res.status(200).json({ 
      success: true, 
      message: `${loans.length} loan(s) saved successfully`,
      count: loans.length
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}



