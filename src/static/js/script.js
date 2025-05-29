// Modificación para la función renderizarTablaInquilinos()
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
        
        // Verificar si el campo existe y tiene el valor "Pagado" (COMPARACIÓN FLEXIBLE)
        if (inquilino[campoMesAño] && 
            (typeof inquilino[campoMesAño] === 'string' && 
             inquilino[campoMesAño].toString().trim().toLowerCase() === 'pagado')) {
            estadoPago = 'Pagado';
            
            // Logs opcionales controlados por variable global
            if (window.DEBUG_PAGOS) {
                console.log(`✅ ${inquilino.propietario}: MARCADO COMO PAGADO para ${campoMesAño}`);
            }
        } else {
            // Logs opcionales controlados por variable global
            if (window.DEBUG_PAGOS) {
                console.log(`❌ ${inquilino.propietario}: NO MARCADO COMO PAGADO para ${campoMesAño}`);
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

// Modificación para la función calcularTotales()
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

// Modificación para la función cambiarMes() con logs configurables
function cambiarMes() {
    const mesSeleccionado = document.getElementById('mes').value;
    const mesAnterior = mesActual;
    mesActual = mesSeleccionado;
    
    if (window.DEBUG_PAGOS) {
        console.log(`Cambiando mes de ${mesAnterior} a ${mesActual}`);
    }
    
    // Guardar el mes seleccionado en localStorage
    localStorage.setItem('mesSeleccionado', mesSeleccionado);
    
    // Mantener la tabla visible durante la carga
    const tbody = document.getElementById('inquilinos-body');
    if (tbody) {
        // Añadir indicador de carga pero mantener la estructura de la tabla
        const filasCargando = Array.from(tbody.querySelectorAll('tr')).map(() => 
            '<tr><td colspan="6" style="text-align: center; opacity: 0.5;">Actualizando...</td></tr>'
        ).join('');
        
        if (filasCargando) {
            tbody.innerHTML = filasCargando;
        } else {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">Actualizando...</td></tr>';
        }
    }
    
    // Recargar los datos al cambiar de mes para asegurar datos actualizados
    const timestamp = new Date().getTime();
    if (window.DEBUG_PAGOS) {
        console.log(`Solicitando datos actualizados con timestamp: ${timestamp}`);
    }
    
    fetch(`/api/inquilinos/?t=${timestamp}`)
        .then(response => {
            if (window.DEBUG_PAGOS) {
                console.log(`Respuesta recibida, status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (window.DEBUG_PAGOS) {
                console.log(`Datos recibidos: ${data.length} inquilinos`);
            }
            inquilinos = data;
            
            // Renderizar la tabla con los datos actualizados
            renderizarTablaInquilinos();
            calcularTotales();
            if (window.DEBUG_PAGOS) {
                console.log(`Tabla actualizada para el mes: ${mesActual}`);
            }
        })
        .catch(error => {
            console.error(`Error al recargar datos al cambiar mes: ${error}`);
            
            // En caso de error, intentar renderizar con los datos existentes
            renderizarTablaInquilinos();
            calcularTotales();
        });
    
    // Actualizar visualmente el selector para confirmar el cambio
    const selector = document.getElementById('mes');
    selector.blur();
    setTimeout(() => selector.focus(), 100);
}

// Función para activar/desactivar los logs de depuración
function toggleDebugPagos(activar = true) {
    window.DEBUG_PAGOS = activar;
    console.log(`Logs de depuración de pagos: ${activar ? 'ACTIVADOS' : 'DESACTIVADOS'}`);
    return `Logs de depuración ${activar ? 'activados' : 'desactivados'}`;
}

// Por defecto, los logs están desactivados
window.DEBUG_PAGOS = false;
