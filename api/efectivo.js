// API: GET|POST /api/efectivo
// Gestiona el saldo de efectivo disponible (tabla única de una sola fila)

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({
      error: 'Supabase configuration missing',
      message: 'Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables'
    });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // GET — leer saldo e historial actuales
  if (req.method === 'GET') {
    try {
      const { data, error } = await supabase
        .from('efectivo')
        .select('saldo, historial, snapshots_capital')
        .eq('id', 1)
        .single();

      if (error && error.code === 'PGRST116') {
        return res.status(200).json({ success: true, saldo: 0, historial: [], snapshots_capital: [] });
      }
      if (error) throw error;

      return res.status(200).json({
        success: true,
        saldo: data.saldo ?? 0,
        historial: data.historial ?? [],
        snapshots_capital: data.snapshots_capital ?? []
      });
    } catch (error) {
      console.error('Efectivo GET error:', error);
      return res.status(500).json({ error: 'Database error', message: error.message });
    }
  }

  // POST — registrar un movimiento (ingreso o egreso)
  if (req.method === 'POST') {
    try {
      const { monto, nota, tipo, snapshots_capital } = req.body;

      // Guardar snapshots de capital sin afectar saldo/historial
      if (tipo === 'snapshot') {
        if (!Array.isArray(snapshots_capital)) {
          return res.status(400).json({ error: 'snapshots_capital debe ser un array' });
        }
        const { error } = await supabase
          .from('efectivo')
          .upsert({ id: 1, snapshots_capital, updated_at: new Date().toISOString() });
        if (error) throw error;
        return res.status(200).json({ success: true, snapshots_capital });
      }

      if (!['ingreso', 'egreso'].includes(tipo) || typeof monto !== 'number' || monto <= 0) {
        return res.status(400).json({ error: 'Body inválido: se requiere monto > 0 y tipo "ingreso"|"egreso"' });
      }

      // Leer estado actual
      const { data: current } = await supabase
        .from('efectivo')
        .select('saldo, historial')
        .eq('id', 1)
        .single();

      const saldoActual = current?.saldo ?? 0;
      const historialActual = current?.historial ?? [];

      const nuevoSaldo = tipo === 'ingreso' ? saldoActual + monto : saldoActual - monto;
      const movimiento = { fecha: new Date().toISOString(), monto, nota: nota || '', tipo };
      const nuevoHistorial = [movimiento, ...historialActual].slice(0, 100);

      const { error } = await supabase
        .from('efectivo')
        .upsert({
          id: 1,
          saldo: nuevoSaldo,
          historial: nuevoHistorial,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      return res.status(200).json({ success: true, saldo: nuevoSaldo, historial: nuevoHistorial });
    } catch (error) {
      console.error('Efectivo POST error:', error);
      return res.status(500).json({ error: 'Database error', message: error.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
