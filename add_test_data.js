// Script to add test data for demonstrating calendar dots
// This will create loans with different payment statuses

// Wait for the page to load
window.addEventListener('DOMContentLoaded', function() {
    // Check if we should add test data (only if no loans exist)
    setTimeout(function() {
        if (loans && loans.length === 0) {
            if (confirm('No hay préstamos en el sistema. ¿Desea agregar datos de prueba para ver los puntos de colores en el calendario?')) {
                agregarDatosPrueba();
            }
        }
    }, 2000); // Wait 2 seconds for data to load
});

function agregarDatosPrueba() {
    // Add test loans with different payment statuses
    
    // 1. Loan with overdue payment (red dot)
    const hoy = new Date();
    const fechaPasada = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 15); // Last month
    
    loans.unshift({
        id: Date.now() + 1,
        nombre: "Juan Pérez (Atrasado)",
        monto: 1000000,
        tasa: 5,
        tipo: 'cuotas_fijas',
        cuotas: 6,
        cuotaFija: 193328,
        totalPagar: 1160000,
        totalIntereses: 160000,
        fechaPrestamo: fechaPasada.toISOString().slice(0, 10),
        diaCobro: 15,
        tabla: [
            {
                cuota: 1,
                cuotaFija: 193328,
                interes: 50000,
                abonoCapital: 143328,
                saldo: 856672,
                fechaCobro: new Date(hoy.getFullYear(), hoy.getMonth() - 1, 15).toISOString(),
                pagada: false,
                fechaPago: null,
                multa: 0,
                multaPagada: false,
                fechaPagoMulta: null
            },
            {
                cuota: 2,
                cuotaFija: 193328,
                interes: 42834,
                abonoCapital: 150494,
                saldo: 706178,
                fechaCobro: new Date(hoy.getFullYear(), hoy.getMonth(), 15).toISOString(),
                pagada: false,
                fechaPago: null,
                multa: 0,
                multaPagada: false,
                fechaPagoMulta: null
            }
        ],
        capitalPendiente: 1000000
    });

    // 2. Loan with today's payment (yellow dot)
    loans.unshift({
        id: Date.now() + 2,
        nombre: "María García (Hoy)",
        monto: 1500000,
        tasa: 4,
        tipo: 'cuotas_fijas',
        cuotas: 12,
        cuotaFija: 143000,
        totalPagar: 1716000,
        totalIntereses: 216000,
        fechaPrestamo: new Date(hoy.getFullYear(), hoy.getMonth() - 2, 1).toISOString().slice(0, 10),
        diaCobro: hoy.getDate(),
        tabla: [
            {
                cuota: 1,
                cuotaFija: 143000,
                interes: 60000,
                abonoCapital: 83000,
                saldo: 1417000,
                fechaCobro: new Date(hoy.getFullYear(), hoy.getMonth() - 2, hoy.getDate()).toISOString(),
                pagada: true,
                fechaPago: new Date(hoy.getFullYear(), hoy.getMonth() - 2, hoy.getDate()).toISOString(),
                multa: 0,
                multaPagada: false,
                fechaPagoMulta: null
            },
            {
                cuota: 2,
                cuotaFija: 143000,
                interes: 56680,
                abonoCapital: 86320,
                saldo: 1330680,
                fechaCobro: new Date(hoy.getFullYear(), hoy.getMonth() - 1, hoy.getDate()).toISOString(),
                pagada: true,
                fechaPago: new Date(hoy.getFullYear(), hoy.getMonth() - 1, hoy.getDate()).toISOString(),
                multa: 0,
                multaPagada: false,
                fechaPagoMulta: null
            },
            {
                cuota: 3,
                cuotaFija: 143000,
                interes: 53227,
                abonoCapital: 89773,
                saldo: 1240907,
                fechaCobro: hoy.toISOString(),
                pagada: false,
                fechaPago: null,
                multa: 0,
                multaPagada: false,
                fechaPagoMulta: null
            }
        ],
        capitalPendiente: 1240907
    });

    // 3. Loan with upcoming payment (blue dot - within next 7 days)
    const fechaProxima = new Date(hoy);
    fechaProxima.setDate(hoy.getDate() + 3); // 3 days from now
    
    loans.unshift({
        id: Date.now() + 3,
        nombre: "Carlos Rodríguez (Próximo)",
        monto: 2000000,
        tasa: 3,
        tipo: 'cuotas_fijas',
        cuotas: 18,
        cuotaFija: 128000,
        totalPagar: 2304000,
        totalIntereses: 304000,
        fechaPrestamo: new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1).toISOString().slice(0, 10),
        diaCobro: fechaProxima.getDate(),
        tabla: [
            {
                cuota: 1,
                cuotaFija: 128000,
                interes: 60000,
                abonoCapital: 68000,
                saldo: 1932000,
                fechaCobro: new Date(hoy.getFullYear(), hoy.getMonth() - 1, fechaProxima.getDate()).toISOString(),
                pagada: true,
                fechaPago: new Date(hoy.getFullYear(), hoy.getMonth() - 1, fechaProxima.getDate()).toISOString(),
                multa: 0,
                multaPagada: false,
                fechaPagoMulta: null
            },
            {
                cuota: 2,
                cuotaFija: 128000,
                interes: 57960,
                abonoCapital: 70040,
                saldo: 1861960,
                fechaCobro: fechaProxima.toISOString(),
                pagada: false,
                fechaPago: null,
                multa: 0,
                multaPagada: false,
                fechaPagoMulta: null
            }
        ],
        capitalPendiente: 1861960
    });

    // Save and render
    guardarDatos();
    renderAll();
    
    alert('Datos de prueba agregados correctamente. Ahora puede ver los puntos de colores en el calendario:' + 
          '\n- Rojo: Juan Pérez (pago atrasado)' + 
          '\n- Amarillo: María García (pago de hoy)' + 
          '\n- Azul: Carlos Rodríguez (pago en 3 días)');
}