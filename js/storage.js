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
            
            // Backward compatibility: add fine-related fields and capitalPendiente to existing loans
            loans.forEach(loan => {
                if (loan.tabla) {
                    loan.tabla.forEach(cuota => {
                        if (cuota.multa === undefined) cuota.multa = 0;
                        if (cuota.multaPagada === undefined) cuota.multaPagada = false;
                        if (cuota.fechaPagoMulta === undefined) cuota.fechaPagoMulta = null;
                    });
                }
                if (loan.capitalPendiente === undefined) {
                    const capitalPagado = loan.tabla.filter(c => c.pagada).reduce((sum, c) => sum + c.abonoCapital, 0);
                    loan.capitalPendiente = loan.monto - capitalPagado;
                }
            });
            
            // Backward compatibility: add new properties (telefono, notas, comprobantes) to existing loans
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
