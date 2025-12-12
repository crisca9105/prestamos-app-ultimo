// API: PUT /api/update
// Actualiza un préstamo específico en Supabase

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // CORS headers para permitir peticiones desde cualquier origen
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Manejar preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Solo permitir método PUT
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Validar que se envió el préstamo
    const { loan } = req.body;

    if (!loan || !loan.id) {
      return res.status(400).json({ 
        error: 'Invalid request',
        message: 'loan object with id is required' 
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

    // Buscar el préstamo por el id dentro del campo data
    const { data: existingRows, error: findError } = await supabase
      .from('prestamos')
      .select('*');

    if (findError) {
      console.error('Supabase find error:', findError);
      return res.status(500).json({ 
        error: 'Database error',
        message: findError.message 
      });
    }

    // Encontrar la fila que contiene el préstamo con este id
    const rowToUpdate = existingRows.find(row => row.data && row.data.id === loan.id);

    if (!rowToUpdate) {
      return res.status(404).json({ 
        error: 'Loan not found',
        message: `Loan with id ${loan.id} not found` 
      });
    }

    // Actualizar la fila
    const { data: updatedData, error: updateError } = await supabase
      .from('prestamos')
      .update({
        data: loan,
        updated_at: new Date().toISOString()
      })
      .eq('id', rowToUpdate.id)
      .select();

    if (updateError) {
      console.error('Supabase update error:', updateError);
      return res.status(500).json({ 
        error: 'Database error',
        message: updateError.message 
      });
    }

    return res.status(200).json({ 
      success: true, 
      message: 'Loan updated successfully',
      data: updatedData[0].data
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}
