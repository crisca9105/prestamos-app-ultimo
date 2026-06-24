// ================= STORAGE MANAGEMENT =================
// Integración con Supabase a través de API REST

// Configuración de la API (ajustar según tu dominio de Vercel)
const API_BASE_URL = window.location.origin; // Usa el mismo dominio donde está desplegada la app

// Función auxiliar para mostrar notificaciones
function mostrarNotificacion(mensaje, tipo = 'info') {
    // Crear elemento de notificación si no existe
    let notif = document.getElementById('notificacion');
    if (!notif) {
        notif = document.createElement('div');
        notif.id = 'notificacion';
        notif.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 10000;
            font-weight: 600;
            max-width: 300px;
            transition: opacity 0.3s;
            font-size: 14px;
        `;
        document.body.appendChild(notif);
    }
    
    const colores = {
        success: '#10b981',
        error: '#ef4444',
        warning: '#f59e0b',
        info: '#3b82f6'
    };
    
    notif.style.background = colores[tipo] || colores.info;
    notif.style.color = 'white';
    notif.textContent = mensaje;
    notif.style.opacity = '1';
    notif.style.display = 'block';
    
    setTimeout(() => {
        notif.style.opacity = '0';
        setTimeout(() => {
            notif.style.display = 'none';
        }, 300);
    }, 3000);
}

// Función auxiliar para hacer peticiones a la API
async function hacerPeticion(endpoint, method = 'GET', body = null) {
    try {
        const options = {
            method: method,
            headers: {
                'Content-Type': 'application/json',
            }
        };
        
        if (body) {
            options.body = JSON.stringify(body);
        }
        
        const response = await fetch(`${API_BASE_URL}/api/${endpoint}`, options);
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
            throw new Error(errorData.message || errorData.error || `HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        return result;
    } catch (error) {
        console.error(`Error en petición ${endpoint}:`, error);
        throw error;
    }
}

// Cargar todos los préstamos desde Supabase
async function cargarDatos() {
    try {
        const result = await hacerPeticion('get', 'GET');
        
        if (result.success && Array.isArray(result.data)) {
            loans = result.data;
            
            // Backward compatibility: add fine-related fields, interest-only fields and capitalPendiente to existing loans
            loans.forEach(loan => {
                if (loan.tabla) {
                    loan.tabla.forEach(cuota => {
                        if (cuota.multa === undefined) cuota.multa = 0;
                        if (cuota.multaPagada === undefined) cuota.multaPagada = false;
                        if (cuota.fechaPagoMulta === undefined) cuota.fechaPagoMulta = null;
                        if (cuota.notaPago === undefined) cuota.notaPago = '';
                        if (cuota.interesDelMesPagado === undefined) cuota.interesDelMesPagado = false;
                        if (cuota.montoInteresPagado === undefined) cuota.montoInteresPagado = 0;
                        if (cuota.fechaPagoInteres === undefined) cuota.fechaPagoInteres = null;
                        // Migrar a nuevo formato de historial de pagos de interés
                        if (!cuota.hasOwnProperty('pagosInteres')) {
                            cuota.pagosInteres = [];
                            if (cuota.interesDelMesPagado && cuota.montoInteresPagado) {
                                cuota.pagosInteres.push({
                                    monto: cuota.montoInteresPagado,
                                    fecha: cuota.fechaPagoInteres || new Date().toISOString()
                                });
                            }
                        }
                    });
                }
                if (loan.capitalPendiente === undefined) {
                    const capitalPagado = loan.tabla.filter(c => c.pagada).reduce((sum, c) => sum + c.abonoCapital, 0);
                    loan.capitalPendiente = loan.monto - capitalPagado;
                }
            });
            
            // Backward compatibility: add new properties (telefono, notas, comprobantes, archivado) to existing loans
            loans.forEach(loan => {
                if (!loan.hasOwnProperty('telefono')) {
                    loan.telefono = '';
                }
                if (!loan.hasOwnProperty('notas')) {
                    loan.notas = '';
                }
                if (!loan.hasOwnProperty('comprobantes')) {
                    loan.comprobantes = [];
                }
                if (!loan.hasOwnProperty('archivado')) {
                    loan.archivado = false;
                }
                if (!loan.hasOwnProperty('abonosCapital')) {
                    loan.abonosCapital = [];
                }
            });
            
            renderAll();
            mostrarNotificacion('Datos cargados correctamente', 'success');
        } else {
            loans = [];
            renderAll();
            mostrarNotificacion('No hay datos disponibles', 'info');
        }
    } catch (error) {
        console.error('Error cargando datos:', error);
        mostrarNotificacion('Error al cargar datos: ' + error.message, 'error');
        // Inicializar con array vacío si hay error
        loans = [];
        renderAll();
    }
}

// Guardar todos los préstamos en Supabase
async function guardarDatos() {
    try {
        const result = await hacerPeticion('save', 'POST', { loans });
        
        if (result.success) {
            mostrarNotificacion('Datos guardados correctamente', 'success');
        } else {
            throw new Error(result.message || 'Error al guardar');
        }
    } catch (error) {
        console.error('Error guardando datos:', error);
        mostrarNotificacion('Error al guardar: ' + error.message, 'error');
        // No lanzar error para no interrumpir el flujo, pero mostrar notificación
    }
}

// ── Efectivo ──────────────────────────────────────────────────────────────────

async function cargarEfectivo() {
    try {
        const result = await hacerPeticion('efectivo', 'GET');
        if (result.success) {
            efectivoSaldo = result.saldo;
            efectivoHistorial = result.historial;
            renderEfectivo();
        }
    } catch (error) {
        console.error('Error cargando efectivo:', error);
    }
}

async function guardarMovimientoEfectivo(monto, nota, tipo) {
    try {
        const result = await hacerPeticion('efectivo', 'POST', { monto, nota, tipo });
        if (result.success) {
            efectivoSaldo = result.saldo;
            efectivoHistorial = result.historial;
            renderEfectivo();
            mostrarNotificacion(`${tipo === 'ingreso' ? 'Ingreso' : 'Egreso'} registrado`, 'success');
        }
    } catch (error) {
        mostrarNotificacion('Error al registrar movimiento: ' + error.message, 'error');
    }
}

function renderEfectivo() {
    const statEl = document.getElementById('efectivoDisponible');
    if (statEl) statEl.textContent = formatMoney(efectivoSaldo);

    const saldoEl = document.getElementById('cajaSaldo');
    if (saldoEl) {
        saldoEl.textContent = formatMoney(efectivoSaldo);
        saldoEl.style.color = efectivoSaldo >= 0 ? '#1e293b' : '#ef4444';
    }

    const histEl = document.getElementById('cajaHistorial');
    if (!histEl) return;

    const ultimos = efectivoHistorial.slice(0, 10);
    if (ultimos.length === 0) {
        histEl.innerHTML = '<div class="small" style="color:#94a3b8;padding:8px 0">Sin movimientos registrados.</div>';
        return;
    }
    histEl.innerHTML = ultimos.map(m => `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid #f1f5f9">
            <div>
                <div style="font-weight:600;font-size:13px">${m.nota || '—'}</div>
                <div class="small">${formatearFecha(m.fecha)}</div>
            </div>
            <div style="font-weight:800;font-size:15px;color:${m.tipo === 'ingreso' ? '#10b981' : '#ef4444'}">
                ${m.tipo === 'ingreso' ? '+' : '−'}${formatMoney(m.monto)}
            </div>
        </div>`).join('');
}

async function registrarMovimientoEfectivo(tipo) {
    const notaEl = document.getElementById('cajaNota');
    const montoEl = document.getElementById('cajaMonto');
    const monto = parseFloat(montoEl.value);
    const nota = notaEl.value.trim();

    if (!monto || monto <= 0) {
        mostrarNotificacion('Ingresa un monto válido', 'warning');
        return;
    }

    await guardarMovimientoEfectivo(monto, nota, tipo);
    notaEl.value = '';
    montoEl.value = '';
}

// ──────────────────────────────────────────────────────────────────────────────

// Limpiar todos los préstamos
async function limpiarStorage() {
    if (!confirm('¿Borrar todos los préstamos?')) return;
    
    try {
        // Guardar array vacío
        const result = await hacerPeticion('save', 'POST', { loans: [] });
        
        if (result.success) {
            loans = [];
            renderAll();
            mostrarNotificacion('Datos eliminados correctamente', 'success');
        } else {
            throw new Error(result.message || 'Error al eliminar');
        }
    } catch (error) {
        console.error('Error eliminando datos:', error);
        mostrarNotificacion('Error al eliminar: ' + error.message, 'error');
    }
}
