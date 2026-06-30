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

async function corregirFechasCuotas() {
    if (localStorage.getItem('fechasCorregidas') === 'true') return;

    const sumarMes = (fechaISO, dia) => {
        const d = new Date(fechaISO);
        d.setMonth(d.getMonth() + 1);
        if (dia) {
            const ultimoDia = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
            d.setDate(Math.min(dia, ultimoDia));
        }
        return d.toISOString().split('T')[0];
    };

    let huboCambios = false;

    loans.forEach(loan => {
        if (!loan.tabla || loan.tabla.length === 0) return;

        const dia = loan.diaCobro || new Date(loan.tabla[0].fechaCobro).getDate();
        const primeraNoPagadaIdx = loan.tabla.findIndex(c => !c.pagada);
        if (primeraNoPagadaIdx === -1) return; // todas pagadas

        // Punto de partida: última cuota pagada, o primera cuota no pagada como ancla
        let fechaBase = primeraNoPagadaIdx > 0
            ? loan.tabla[primeraNoPagadaIdx - 1].fechaCobro
            : loan.tabla[0].fechaCobro;
        const desdeIdx = primeraNoPagadaIdx > 0 ? primeraNoPagadaIdx : 1;

        for (let i = desdeIdx; i < loan.tabla.length; i++) {
            const nuevaFecha = sumarMes(fechaBase, dia);
            if (loan.tabla[i].fechaCobro.split('T')[0] !== nuevaFecha) {
                loan.tabla[i].fechaCobro = nuevaFecha;
                huboCambios = true;
            }
            fechaBase = nuevaFecha;
        }
    });

    localStorage.setItem('fechasCorregidas', 'true');

    if (huboCambios) {
        await guardarDatos();
    }
}

async function migracionJun2026() {
    if (localStorage.getItem('migracion_jun2026') === 'true') return;

    let huboCambios = false;

    // 1. Corrección específica de "Diana Silvia último"
    const diana = loans.find(l => l.nombre === 'Diana Silvia último');
    if (diana && diana.tabla) {
        const fechasDiana = {
            1: '2026-03-05',
            2: '2026-04-05',
            3: '2026-05-05',
            4: '2026-06-05',
            5: '2026-07-05'
        };
        diana.tabla.forEach((c, i) => {
            if (c.pagada) return;
            if (!c.pagosInteres || c.pagosInteres.length > 0) {
                c.pagosInteres = [];
                huboCambios = true;
            }
            if (i > 0 && fechasDiana[i] && c.fechaCobro.split('T')[0] !== fechasDiana[i]) {
                c.fechaCobro = fechasDiana[i];
                huboCambios = true;
            }
        });
    }

    // 2. Fechas consecutivas en todos los loans
    const sumarMes = (fechaISO, dia) => {
        const d = new Date(fechaISO);
        d.setMonth(d.getMonth() + 1);
        if (dia) {
            const ultimoDia = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
            d.setDate(Math.min(dia, ultimoDia));
        }
        return d.toISOString().split('T')[0];
    };

    loans.forEach(loan => {
        if (!loan.tabla || loan.tabla.length === 0) return;
        const dia = loan.diaCobro || new Date(loan.tabla[0].fechaCobro).getDate();
        const primeraNoPagadaIdx = loan.tabla.findIndex(c => !c.pagada);
        if (primeraNoPagadaIdx === -1) return;

        let fechaBase = primeraNoPagadaIdx > 0
            ? loan.tabla[primeraNoPagadaIdx - 1].fechaCobro
            : loan.tabla[0].fechaCobro;
        const desdeIdx = primeraNoPagadaIdx > 0 ? primeraNoPagadaIdx : 1;

        for (let i = desdeIdx; i < loan.tabla.length; i++) {
            const nuevaFecha = sumarMes(fechaBase, dia);
            if (loan.tabla[i].fechaCobro.split('T')[0] !== nuevaFecha) {
                loan.tabla[i].fechaCobro = nuevaFecha;
                huboCambios = true;
            }
            fechaBase = nuevaFecha;
        }
    });

    localStorage.setItem('migracion_jun2026', 'true');
    if (huboCambios) await guardarDatos();
}

async function migracionJun2026b() {
    if (localStorage.getItem('migracion_jun2026b') === 'true') return;
    let huboCambios = false;
    const diana = loans.find(l => l.nombre === 'Diana Silvia último');
    if (diana && diana.tabla) {
        diana.tabla.forEach(c => {
            if (!c.pagada && c.pagosInteres && c.pagosInteres.length > 0) {
                c.pagosInteres = [];
                huboCambios = true;
            }
        });
    }
    localStorage.setItem('migracion_jun2026b', 'true');
    if (huboCambios) await guardarDatos();
}

async function migracionFechasDianaSilvia() {
    if (localStorage.getItem('fechasDianaSilvia') === 'true') return;
    const diana = loans.find(l => l.nombre === 'Diana Silvia último');
    if (diana && diana.tabla) {
        const prorrogadaIdx = diana.tabla.findIndex(c => c.prorrogada === true);
        if (prorrogadaIdx !== -1) {
            const fechaBase = diana.tabla[prorrogadaIdx].fechaCobro.split('T')[0];
            let offset = 1;
            for (let i = prorrogadaIdx + 1; i < diana.tabla.length; i++) {
                if (diana.tabla[i].pagada || diana.tabla[i].prorrogada) { offset++; continue; }
                const d = new Date(fechaBase);
                d.setMonth(d.getMonth() + offset);
                diana.tabla[i].fechaCobro = d.toISOString().split('T')[0];
                offset++;
            }
        }
    }
    localStorage.setItem('fechasDianaSilvia', 'true');
    await guardarDatos();
    renderAll();
}

async function correccionDianaSilvia2() {
    if (localStorage.getItem('correccionDianaSilvia2') === 'true') return;
    const diana = loans.find(l => l.nombre === 'Diana Silvia último');
    if (diana && diana.tabla) {
        const pi = diana.tabla.findIndex(c => c.prorrogada === true);
        if (pi !== -1) {
            const cp = diana.tabla[pi];
            const saldoBase = cp.saldo;
            const cf = cp.cuotaFija;
            const interes = Math.round(saldoBase * (diana.tasa / 100));
            const abono = Math.max(0, cf - interes);
            const saldo = Math.max(0, saldoBase - abono);

            diana.tabla.splice(pi + 1, 0, {
                cuota: pi + 2,
                cuotaFija: cf,
                interes,
                abonoCapital: abono,
                saldo,
                fechaCobro: '2026-04-05',
                pagada: false,
                prorrogada: false,
                pagosInteres: [],
                multa: 0, multaPagada: false, fechaPagoMulta: null,
                notaPago: '', interesDelMesPagado: false,
                soloInteresPagado: false, montoInteresPagado: 0, fechaPagoInteres: null
            });

            // Desplazar fechas de las cuotas siguientes +1 mes
            for (let i = pi + 2; i < diana.tabla.length; i++) {
                const d = new Date(diana.tabla[i].fechaCobro);
                d.setMonth(d.getMonth() + 1);
                diana.tabla[i].fechaCobro = d.toISOString().split('T')[0];
            }

            // Renumerar
            for (let i = pi + 1; i < diana.tabla.length; i++) {
                diana.tabla[i].cuota = i + 1;
            }

            // Recalcular en cascada
            let sc = saldo;
            for (let i = pi + 2; i < diana.tabla.length; i++) {
                if (diana.tabla[i].pagada) { sc = diana.tabla[i].saldo; continue; }
                const ni = Math.round(sc * (diana.tasa / 100));
                const na = Math.max(0, diana.tabla[i].cuotaFija - ni);
                sc = Math.max(0, sc - na);
                diana.tabla[i].interes = ni;
                diana.tabla[i].abonoCapital = na;
                diana.tabla[i].saldo = sc;
            }
        }
    }
    localStorage.setItem('correccionDianaSilvia2', 'true');
    await guardarDatos();
    renderAll();
}

async function correccionDianaSilvia3() {
    if (localStorage.getItem('correccionDianaSilvia3') === 'true') return;
    const diana = loans.find(l => l.nombre === 'Diana Silvia último');
    if (diana && diana.tabla) {
        let saldo = diana.tabla[1].saldo; // $1.432.928 — saldo de la cuota prorrogada (índice 1)
        const cf = diana.tabla[1].cuotaFija;
        let mesOffset = 1; // índice 2 = abr = +1 mes desde mar

        for (let i = 2; i < diana.tabla.length; i++) {
            if (diana.tabla[i].pagada || diana.tabla[i].prorrogada) continue;

            // Fecha: día 5 del mes correspondiente
            const d = new Date('2026-03-05');
            d.setMonth(d.getMonth() + mesOffset);
            d.setDate(5);
            diana.tabla[i].fechaCobro = d.toISOString().split('T')[0];

            // Interés y capital
            const interes = Math.round(saldo * diana.tasa / 100);
            const abonoCapital = Math.max(0, cf - interes);
            saldo = Math.max(0, saldo - abonoCapital);

            diana.tabla[i].interes = interes;
            diana.tabla[i].abonoCapital = abonoCapital;
            diana.tabla[i].saldo = saldo;

            mesOffset++;
        }
    }
    localStorage.setItem('correccionDianaSilvia3', 'true');
    await guardarDatos();
    renderAll();
}

async function correccionDianaSilvia4() {
    if (localStorage.getItem('correccionDianaSilvia4') === 'true') return;
    const diana = loans.find(l => l.nombre === 'Diana Silvia último');
    if (diana && diana.tabla) {
        let mesOffset = 1; // índice 2 = abr = mar + 1
        for (let i = 2; i < diana.tabla.length; i++) {
            if (diana.tabla[i].pagada || diana.tabla[i].prorrogada) continue;
            const saldoAnterior = diana.tabla[i - 1].saldo;
            const interes = Math.round(saldoAnterior * diana.tasa / 100);
            const abonoCapital = Math.max(0, diana.tabla[i].cuotaFija - interes);
            const saldo = Math.max(0, saldoAnterior - abonoCapital);
            const d = new Date('2026-03-05');
            d.setMonth(d.getMonth() + mesOffset);
            d.setDate(5);
            diana.tabla[i].fechaCobro = d.toISOString().split('T')[0];
            diana.tabla[i].interes = interes;
            diana.tabla[i].abonoCapital = abonoCapital;
            diana.tabla[i].saldo = saldo;
            mesOffset++;
        }
    }
    localStorage.setItem('correccionDianaSilvia4', 'true');
    await guardarDatos();
    renderAll();
}

async function correccionDianaSilvia5() {
    if (localStorage.getItem('correccionDianaSilvia5') === 'true') return;
    const diana = loans.find(l => l.nombre === 'Diana Silvia último');
    if (diana && diana.tabla) {
        let saldoBase = 1727369;
        let mesOffset = 1; // índice 2 = abr = mar + 1
        for (let i = 2; i < diana.tabla.length; i++) {
            if (diana.tabla[i].pagada || diana.tabla[i].prorrogada) continue;
            const interes = Math.round(saldoBase * 0.08);
            const abonoCapital = Math.max(0, diana.tabla[i].cuotaFija - interes);
            const saldo = Math.max(0, saldoBase - abonoCapital);
            const d = new Date('2026-03-05');
            d.setMonth(d.getMonth() + mesOffset);
            d.setDate(5);
            diana.tabla[i].fechaCobro = d.toISOString().split('T')[0];
            diana.tabla[i].interes = interes;
            diana.tabla[i].abonoCapital = abonoCapital;
            diana.tabla[i].saldo = saldo;
            saldoBase = saldo;
            mesOffset++;
        }
    }
    localStorage.setItem('correccionDianaSilvia5', 'true');
    await guardarDatos();
    renderAll();
}

async function correccionDianaSilvia6() {
    if (localStorage.getItem('correccionDianaSilvia6') === 'true') return;
    const diana = loans.find(l => l.nombre === 'Diana Silvia último');
    if (diana && diana.tabla) {
        // Índice 2 (abr): marcar como prorrogada con pago de interés registrado
        if (diana.tabla[2]) {
            diana.tabla[2].prorrogada = true;
            diana.tabla[2].soloInteresPagado = true;
            diana.tabla[2].fechaPagoInteres = '2026-04-05';
            diana.tabla[2].interesDelMesPagado = true;
            diana.tabla[2].montoInteresPagado = 138190;
            diana.tabla[2].pagosInteres = [{ monto: 138190, fecha: '2026-04-05' }];
            diana.tabla[2].fechaCobro = '2026-04-05';
            diana.tabla[2].interes = 138190;
            diana.tabla[2].abonoCapital = 294441;
            diana.tabla[2].saldo = 1432928;
        }

        // Índice 3 en adelante: cascade desde saldoBase=1727369
        let saldoBase = 1727369;
        let mesOffset = 2; // índice 3 = may = mar + 2
        for (let i = 3; i < diana.tabla.length; i++) {
            const interes = Math.round(saldoBase * 0.08);
            const abonoCapital = Math.max(0, diana.tabla[i].cuotaFija - interes);
            const saldo = Math.max(0, saldoBase - abonoCapital);
            const d = new Date('2026-03-05');
            d.setMonth(d.getMonth() + mesOffset);
            d.setDate(5);
            diana.tabla[i].fechaCobro = d.toISOString().split('T')[0];
            diana.tabla[i].interes = interes;
            diana.tabla[i].abonoCapital = abonoCapital;
            diana.tabla[i].saldo = saldo;
            diana.tabla[i].prorrogada = false;
            diana.tabla[i].pagosInteres = [];
            diana.tabla[i].soloInteresPagado = false;
            diana.tabla[i].interesDelMesPagado = false;
            diana.tabla[i].montoInteresPagado = 0;
            diana.tabla[i].fechaPagoInteres = null;
            saldoBase = saldo;
            mesOffset++;
        }
    }
    localStorage.setItem('correccionDianaSilvia6', 'true');
    await guardarDatos();
    renderAll();
}

async function resetDianaSilvia() {
    if (localStorage.getItem('resetDianaSilvia') === 'true') return;
    const diana = loans.find(l => l.nombre === 'Diana Silvia último');
    if (diana && diana.tabla) {
        diana.tabla = diana.tabla.slice(0, 6);
        let saldoBase = diana.tabla[0].saldo;
        const cf = diana.tabla[0].cuotaFija;
        for (let i = 1; i <= 5; i++) {
            const interes = Math.round(saldoBase * diana.tasa / 100);
            const abonoCapital = Math.max(0, cf - interes);
            const saldo = Math.max(0, saldoBase - abonoCapital);
            const d = new Date('2026-02-05');
            d.setMonth(d.getMonth() + i);
            d.setDate(5);
            diana.tabla[i] = {
                ...diana.tabla[i],
                cuota: i + 1,
                cuotaFija: cf,
                interes,
                abonoCapital,
                saldo,
                fechaCobro: d.toISOString().split('T')[0],
                pagada: false,
                prorrogada: false,
                pagosInteres: [],
                soloInteresPagado: false,
                interesDelMesPagado: false,
                montoInteresPagado: 0,
                fechaPagoInteres: null,
                multa: 0,
                multaPagada: false,
                fechaPagoMulta: null,
                notaPago: ''
            };
            saldoBase = saldo;
        }
    }
    localStorage.setItem('resetDianaSilvia', 'true');
    await guardarDatos();
    renderAll();
}

async function resetDianaSilviaV7() {
    if (localStorage.getItem('resetDianaSilviaV7') === 'true') return;
    const diana = loans.find(l => l.nombre === 'Diana Silvia último');
    if (diana && diana.tabla) {
        // Índice 0 (feb): no tocar, pagada=true

        // Índice 1 (mar): prorrogada con valores explícitos
        if (diana.tabla[1]) {
            Object.assign(diana.tabla[1], {
                prorrogada: true,
                soloInteresPagado: true,
                fechaCobro: '2026-03-05',
                pagosInteres: [{ monto: 138190, fecha: '2026-03-05' }],
                interes: 138190,
                abonoCapital: 294441,
                saldo: 1432928,
                pagada: false
            });
        }

        // Índice 2 (abr): prorrogada con valores explícitos
        if (diana.tabla[2]) {
            Object.assign(diana.tabla[2], {
                prorrogada: true,
                soloInteresPagado: true,
                fechaCobro: '2026-04-05',
                pagosInteres: [{ monto: 138190, fecha: '2026-04-05' }],
                interes: 138190,
                abonoCapital: 294441,
                saldo: 1432928,
                pagada: false
            });
        }

        // Índice 3 en adelante: cascade desde saldoBase=1727369, 8%, día 5 fijo
        let saldoBase = 1727369;
        for (let i = 3; i < diana.tabla.length; i++) {
            const cf = diana.tabla[i].cuotaFija;
            const interes = Math.round(saldoBase * 0.08);
            const abonoCapital = Math.max(0, cf - interes);
            const saldo = Math.max(0, saldoBase - abonoCapital);
            const d = new Date('2026-05-05');
            d.setMonth(d.getMonth() + (i - 3));
            d.setDate(5);
            Object.assign(diana.tabla[i], {
                fechaCobro: d.toISOString().split('T')[0],
                interes,
                abonoCapital,
                saldo,
                prorrogada: false,
                pagosInteres: [],
                pagada: false
            });
            saldoBase = saldo;
        }

        // Truncar a 8 cuotas (índices 0–7)
        if (diana.tabla.length > 8) {
            diana.tabla = diana.tabla.slice(0, 8);
        }
    }
    localStorage.setItem('resetDianaSilviaV7', 'true');
    await guardarDatos();
    renderAll();
}

async function resetDianaSilviaFinal() {
    if (localStorage.getItem('resetDianaSilviaFinal') === 'true') return;
    const diana = loans.find(l => l.nombre === 'Diana Silvia último');
    if (diana && diana.tabla) {
        // Índice 0 (feb): no tocar, ya está pagada=true

        // Índice 1 (mar): prorrogada, solo interés pagado
        if (diana.tabla[1]) {
            diana.tabla[1].prorrogada = true;
            diana.tabla[1].soloInteresPagado = true;
            diana.tabla[1].fechaCobro = '2026-03-05';
            diana.tabla[1].pagosInteres = [{ monto: 138190, fecha: '2026-03-05' }];
            diana.tabla[1].pagada = false;
        }

        // Índice 2 (abr): prorrogada, solo interés pagado
        if (diana.tabla[2]) {
            diana.tabla[2].prorrogada = true;
            diana.tabla[2].soloInteresPagado = true;
            diana.tabla[2].fechaCobro = '2026-04-05';
            diana.tabla[2].pagosInteres = [{ monto: 138190, fecha: '2026-04-05' }];
            diana.tabla[2].pagada = false;
        }

        // Índice 3 en adelante: cascade desde saldoBase=1727369, tasa 8%, día 5 fijo
        let saldoBase = 1727369;
        for (let i = 3; i < diana.tabla.length; i++) {
            const cf = diana.tabla[i].cuotaFija;
            const interes = Math.round(saldoBase * 0.08);
            const abonoCapital = Math.max(0, cf - interes);
            const saldo = Math.max(0, saldoBase - abonoCapital);
            const d = new Date('2026-05-05');
            d.setMonth(d.getMonth() + (i - 3));
            d.setDate(5);
            diana.tabla[i].fechaCobro = d.toISOString().split('T')[0];
            diana.tabla[i].interes = interes;
            diana.tabla[i].abonoCapital = abonoCapital;
            diana.tabla[i].saldo = saldo;
            diana.tabla[i].prorrogada = false;
            diana.tabla[i].pagosInteres = [];
            diana.tabla[i].pagada = false;
            saldoBase = saldo;
        }

        // Truncar a 8 cuotas (índices 0–7)
        if (diana.tabla.length > 8) {
            diana.tabla = diana.tabla.slice(0, 8);
        }
    }
    localStorage.setItem('resetDianaSilviaFinal', 'true');
    await guardarDatos();
    renderAll();
}

async function correccionLuisPolicia() {
    if (localStorage.getItem('correccionLuisPolicia') === 'true') return;
    const luis = loans.find(l => l.nombre === 'Luis policía');
    if (luis && luis.tabla) {
        // Ajustar a 7 cuotas
        while (luis.tabla.length < 7) {
            luis.tabla.push({ ...luis.tabla[0], pagada: false, prorrogada: false, pagosInteres: [] });
        }
        luis.tabla = luis.tabla.slice(0, 7);

        const saldoMar = luis.tabla[1].saldo; // saldo después de marzo (cuota 1)
        const cf = luis.tabla[0].cuotaFija;
        const interesProrroga = Math.round(saldoMar * luis.tasa / 100);
        const abonoProrroga = Math.max(0, cf - interesProrroga);
        const saldoProrroga = Math.max(0, saldoMar - abonoProrroga);

        // Índice 2 (abr): prorrogada
        luis.tabla[2] = {
            ...luis.tabla[2],
            cuota: 3, cuotaFija: cf,
            interes: interesProrroga, abonoCapital: abonoProrroga, saldo: saldoProrroga,
            fechaCobro: '2026-04-26', pagada: false, prorrogada: true,
            soloInteresPagado: true, interesDelMesPagado: true,
            montoInteresPagado: interesProrroga, fechaPagoInteres: '2026-04-26',
            pagosInteres: [{ monto: interesProrroga, fecha: '2026-04-26' }],
            multa: 0, multaPagada: false, fechaPagoMulta: null, notaPago: ''
        };

        // Índice 3 (may): prorrogada — mismo saldoBase que abr porque no se abonó capital
        luis.tabla[3] = {
            ...luis.tabla[3],
            cuota: 4, cuotaFija: cf,
            interes: interesProrroga, abonoCapital: abonoProrroga, saldo: saldoProrroga,
            fechaCobro: '2026-05-26', pagada: false, prorrogada: true,
            soloInteresPagado: true, interesDelMesPagado: true,
            montoInteresPagado: interesProrroga, fechaPagoInteres: '2026-05-26',
            pagosInteres: [{ monto: interesProrroga, fecha: '2026-05-26' }],
            multa: 0, multaPagada: false, fechaPagoMulta: null, notaPago: ''
        };

        // Índices 4-6 (jun, jul, ago): cascade desde saldoMar (cuotas 2 y 3 no abonaron capital)
        const fechas = ['2026-06-26', '2026-07-26', '2026-08-26'];
        let saldoCascada = saldoMar;
        for (let i = 4; i <= 6; i++) {
            const interes = Math.round(saldoCascada * luis.tasa / 100);
            const abonoCapital = Math.max(0, cf - interes);
            const saldo = Math.max(0, saldoCascada - abonoCapital);
            luis.tabla[i] = {
                ...luis.tabla[i],
                cuota: i + 1, cuotaFija: cf,
                interes, abonoCapital, saldo,
                fechaCobro: fechas[i - 4], pagada: false, prorrogada: false,
                soloInteresPagado: false, interesDelMesPagado: false,
                montoInteresPagado: 0, fechaPagoInteres: null,
                pagosInteres: [],
                multa: 0, multaPagada: false, fechaPagoMulta: null, notaPago: ''
            };
            saldoCascada = saldo;
        }
    }
    localStorage.setItem('correccionLuisPolicia', 'true');
    await guardarDatos();
    renderAll();
}

async function correccionCharlyMono() {
    if (localStorage.getItem('correccionCharlyMono') === 'true') return;
    const charly = loans.find(l => l.nombre === 'Charly mono');
    if (charly && charly.tabla) {
        const cf = charly.cuotaFija || charly.tabla[0]?.cuotaFija;

        // Índice 0 (abr): prorrogada
        charly.tabla[0] = {
            ...charly.tabla[0],
            cuota: 1, cuotaFija: cf,
            interes: 231680, abonoCapital: 0, saldo: charly.monto,
            fechaCobro: '2026-04-20', pagada: false, prorrogada: true,
            soloInteresPagado: true, interesDelMesPagado: true,
            pagosInteres: [{ monto: 231680, fecha: '2026-04-20' }],
            montoInteresPagado: 231680, fechaPagoInteres: '2026-04-20',
            multa: 0, multaPagada: false, fechaPagoMulta: null, notaPago: ''
        };

        // Índice 1 (may): prorrogada
        charly.tabla[1] = {
            ...charly.tabla[1],
            cuota: 2, cuotaFija: cf,
            interes: 231680, abonoCapital: 0, saldo: charly.monto,
            fechaCobro: '2026-05-20', pagada: false, prorrogada: true,
            soloInteresPagado: true, interesDelMesPagado: true,
            pagosInteres: [{ monto: 231680, fecha: '2026-05-20' }],
            montoInteresPagado: 231680, fechaPagoInteres: '2026-05-20',
            multa: 0, multaPagada: false, fechaPagoMulta: null, notaPago: ''
        };

        // Índices 2+ en cascada desde loan.monto (nunca se abonó capital)
        let saldoCascada = charly.monto;
        for (let i = 2; i < charly.tabla.length; i++) {
            const interes = Math.round(saldoCascada * charly.tasa / 100);
            const abonoCapital = Math.max(0, cf - interes);
            const saldo = Math.max(0, saldoCascada - abonoCapital);
            const d = new Date(2026, 5 + (i - 2), 20); // jun=5, jul=6, ...
            const fechaCobro = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-20`;
            charly.tabla[i] = {
                ...charly.tabla[i],
                cuota: i + 1, cuotaFija: cf,
                interes, abonoCapital, saldo, fechaCobro,
                pagada: false, prorrogada: false,
                soloInteresPagado: false, interesDelMesPagado: false,
                montoInteresPagado: 0, fechaPagoInteres: null,
                pagosInteres: [],
                multa: 0, multaPagada: false, fechaPagoMulta: null, notaPago: ''
            };
            saldoCascada = saldo;
        }
    }
    localStorage.setItem('correccionCharlyMono', 'true');
    await guardarDatos();
    renderAll();
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
                if (!loan.hasOwnProperty('capitalAjeno')) {
                    loan.capitalAjeno = false;
                }
            });
            
            // Las siguientes funciones de migración histórica fueron comentadas para evitar
            // re-ejecuciones accidentales desde diferentes dispositivos (con distinto localStorage)
            // que corrompan los datos de Supabase.
            /*
            await corregirFechasCuotas();
            await migracionJun2026();
            await migracionJun2026b();
            await migracionFechasDianaSilvia();
            await correccionDianaSilvia2();
            await correccionDianaSilvia3();
            await correccionDianaSilvia4();
            await correccionDianaSilvia5();
            await correccionDianaSilvia6();
            await resetDianaSilvia();
            await resetDianaSilviaV7();
            await resetDianaSilviaFinal();
            await correccionLuisPolicia();
            await correccionCharlyMono();
            */
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
            efectivoSnapshots = result.snapshots_capital ?? [];
            renderEfectivo();
            await verificarYGuardarSnapshot();
        }
    } catch (error) {
        console.error('Error cargando efectivo:', error);
    }
}

async function verificarYGuardarSnapshot() {
    const hoy = new Date().toISOString().split('T')[0];
    const ultimo = efectivoSnapshots[efectivoSnapshots.length - 1];

    if (ultimo) {
        const dias = Math.floor((new Date(hoy) - new Date(ultimo.fecha)) / 86400000);
        if (dias < 30) return;
    }

    const capitalTotal = loans
        .filter(l => !l.archivado && !l.capitalAjeno)
        .reduce((sum, l) => {
            if (l.capitalPendiente !== undefined) return sum + l.capitalPendiente;
            const pagado = (l.tabla || []).filter(c => c.pagada).reduce((s, c) => s + c.abonoCapital, 0);
            return sum + (l.monto - pagado);
        }, 0);

    const saldoEfectivo = efectivoSaldo || 0;
    const totalPatrimonio = capitalTotal + saldoEfectivo;
    efectivoSnapshots = [...efectivoSnapshots, { fecha: hoy, capital: capitalTotal, efectivo: saldoEfectivo, total: totalPatrimonio }].slice(-24);
    await guardarSnapshotCapital();
}

async function guardarSnapshotCapital() {
    try {
        await hacerPeticion('efectivo', 'POST', { tipo: 'snapshot', snapshots_capital: efectivoSnapshots });
    } catch (error) {
        console.error('Error guardando snapshot de capital:', error);
    }
}

async function guardarMovimientoEfectivo(monto, tipo) {
    try {
        const result = await hacerPeticion('efectivo', 'POST', { monto, tipo });
        if (result.success) {
            efectivoSaldo = result.saldo;
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
        saldoEl.style.cssText = `font-size:32px;font-weight:700;margin-bottom:1rem;color:${efectivoSaldo > 0 ? '#34d399' : efectivoSaldo === 0 ? '#94a3b8' : '#ef4444'}`;
    }

    if (typeof renderHistorialSnapshots === 'function') renderHistorialSnapshots();
}

async function registrarMovimientoEfectivo(tipo) {
    const montoEl = document.getElementById('cajaMonto');
    const monto = parseFloat(montoEl.value);

    if (!monto || monto <= 0) {
        mostrarNotificacion('Ingresa un monto válido', 'warning');
        return;
    }

    await guardarMovimientoEfectivo(monto, tipo);
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
