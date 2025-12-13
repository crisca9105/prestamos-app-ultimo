// API: DELETE /api/delete
// Elimina un préstamo específico de Supabase

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // CORS headers para permitir peticiones desde cualquier origen
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Manejar preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Solo permitir método DELETE
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Validar que se envió el id del préstamo
    const { loanId } = req.body;

    if (!loanId) {
      return res.status(400).json({ 
        error: 'Invalid request',
        message: 'loanId is required' 
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
    const rowToDelete = existingRows.find(row => row.data && row.data.id === loanId);

    if (!rowToDelete) {
      return res.status(404).json({ 
        error: 'Loan not found',
        message: `Loan with id ${loanId} not found` 
      });
    }

    // Eliminar la fila
    const { error: deleteError } = await supabase
      .from('prestamos')
      .delete()
      .eq('id', rowToDelete.id);

    if (deleteError) {
      console.error('Supabase delete error:', deleteError);
      return res.status(500).json({ 
        error: 'Database error',
        message: deleteError.message 
      });
    }

    return res.status(200).json({ 
      success: true, 
      message: 'Loan deleted successfully'
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}



