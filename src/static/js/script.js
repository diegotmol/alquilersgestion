// Al inicio del archivo, añadir:
// Variable global para activar/desactivar logs de depuración
window.DEBUG_PAGOS = false;

// Función para activar/desactivar logs de depuración
function toggleDebugPagos(activar = true) {
    window.DEBUG_PAGOS = activar;
    console.log(`Logs de depuración de pagos: ${activar ? 'ACTIVADOS' : 'DESACTIVADOS'}`);
    return `Logs de depuración ${activar ? 'activados' : 'desactivados'}`;
}

// Modificar la función renderizarTablaInquilinos()
function renderizarTablaInquilinos() {
    const tbody = document.getElementById('inquilinos-body');
    if (!tbody) {
        console.error('No se encontró el elemento tbody');
        return;
    }
    
    tbody.innerHTML = '';

    inquilinos.forEach(inquilino => {
        const tr = document.createElement('tr');
        
        // Determinar el estado de pago según el mes seleccionado
        let estadoPago = 'No pagado'; // Valor por defecto
        
        // Asegurar que el mes tenga dos dígitos
        const mesDosDigitos = mesActual.toString().padStart(2, '0');
        const campoMesAño = `pago_${mesDosDigitos}_${añoActual}`;
        
        // LOGS DETALLADOS PARA LA COMPARACIÓN (generalizados)
        if (window.DEBUG_PAGOS) {
            console.log(`--- COMPARACIÓN PARA ${inquilino.propietario} ---`);
            console.log(`Mes actual: ${mesActual}, formateado: ${mesDosDigitos}`);
            console.log(`Año actual: ${añoActual}`);
            console.log(`Campo a verificar: ${campoMesAño}`);
            console.log(`¿El campo existe en el objeto?: ${campoMesAño in inquilino}`);
            console.log(`Valor del campo: "${inquilino[campoMesAño]}"`);
            console.log(`Tipo de dato: ${typeof inquilino[campoMesAño]}`);
        }
        
        // Verificar si el campo existe y tiene el valor "Pagado" (COMPARACIÓN FLEXIBLE)
        if (inquilino[campoMesAño] && 
            (typeof inquilino[campoMesAño] === 'string' && 
             inquilino[campoMesAño].toString().trim().toLowerCase() === 'pagado')) {
            estadoPago = 'Pagado';
            
            // Log adicional cuando se marca como pagado
            if (window.DEBUG_PAGOS) {
                console.log(`✅ ${inquilino.propietario}: MARCADO COMO PAGADO`);
            }
        } else {
            // Log cuando NO se marca como pagado
            if (window.DEBUG_PAGOS) {
                console.log(`❌ ${inquilino.propietario}: NO MARCADO COMO PAGADO`);
                if (inquilino[campoMesAño]) {
                    console.log(`   Valor encontrado: "${inquilino[campoMesAño]}" (${typeof inquilino[campoMesAño]})`);
                } else {
                    console.log(`   Campo no encontrado en el objeto`);
                }
            }
        }
        
        // Aplicar color según estado de pago
        const propietarioClass = estadoPago === 'Pagado' ? 'pagado' : 'no-pagado';
        
        tr.innerHTML = `
            <td class="${propietarioClass}">${inquilino.propietario}</td>
            <td>${inquilino.propiedad}</td>
            <td>${inquilino.telefono}</td>
            <td>$${inquilino.monto}</td>
            <td class="${propietarioClass}">${estadoPago}</td>
            <td>
                <button class="btn-accion btn-eliminar" onclick="eliminarInquilino(${inquilino.id})">Eliminar</button>
                <button class="btn-accion btn-editar" onclick="editarInquilino(${inquilino.id})">Editar</button>
            </td>
        `;
        
        tbody.appendChild(tr);
    });
}

// Modificar la función calcularTotales() de manera similar
function calcularTotales() {
    let totalMonto = 0;
    let totalPagado = 0;
    let totalNoPagado = 0;

    inquilinos.forEach(inquilino => {
        const monto = parseFloat(inquilino.monto);
        totalMonto += monto;
        
        // Determinar si está pagado según el mes y año seleccionados
        let pagado = false;
        
        // Asegurar que el mes tenga dos dígitos
        const mesDosDigitos = mesActual.toString().padStart(2, '0');
        const campoMesAño = `pago_${mesDosDigitos}_${añoActual}`;
        
        // Verificar si el campo existe y tiene el valor "Pagado" (COMPARACIÓN FLEXIBLE)
        if (inquilino[campoMesAño] && 
            (typeof inquilino[campoMesAño] === 'string' && 
             inquilino[campoMesAño].toString().trim().toLowerCase() === 'pagado')) {
            pagado = true;
        }
        
        if (pagado) {
            totalPagado += monto;
        } else {
            totalNoPagado += monto;
        }
    });

    document.getElementById('total-monto').textContent = `$${totalMonto}`;
    document.getElementById('total-pagado').textContent = `$${totalPagado}`;
    document.getElementById('total-no-pagado').textContent = `$${totalNoPagado}`;
}
