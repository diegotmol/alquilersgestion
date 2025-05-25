// Variables globales
let inquilinos = [];
let inquilinosFiltrados = [];
let mesActual = '';
let añoActual = '';

// Cargar inquilinos al iniciar la página
document.addEventListener('DOMContentLoaded', function() {
    // Cargar inquilinos desde el servidor
    fetch('/api/inquilinos')
        .then(response => response.json())
        .then(data => {
            inquilinos = data;
            inquilinosFiltrados = [...inquilinos];
            renderizarTablaInquilinos();
            calcularTotales();
        })
        .catch(error => {
            console.error('Error al cargar inquilinos:', error);
        });
    
    // Cargar fecha de última sincronización
    fetch('/api/sync/last')
        .then(response => response.json())
        .then(data => {
            if (data.success && data.fecha_sincronizacion) {
                // Usar la función de formateo para hora chilena
                const fechaFormateada = formatearFechaChilena(data.fecha_sincronizacion);
                document.getElementById('fecha-sincronizacion').textContent = fechaFormateada;
            }
        })
        .catch(error => {
            console.error('Error al cargar fecha de sincronización:', error);
        });
    
    // Inicializar selectores
    const selectorMes = document.getElementById('mes');
    if (selectorMes) {
        mesActual = selectorMes.value;
        selectorMes.addEventListener('change', cambiarMes);
    }
    
    // Inicializar selector de año y configurarlo dinámicamente
    actualizarSelectorAño();
    
    // Configurar eventos para botones
    document.getElementById('btn-sincronizar').addEventListener('click', sincronizarCorreos);
    document.getElementById('form-inquilino').addEventListener('submit', guardarInquilino);
});

// Función para formatear fecha en hora chilena
function formatearFechaChilena(fechaISO) {
    const fechaObj = new Date(fechaISO);
    
    // Especificar opciones con la zona horaria de Chile
    const opciones = { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit',
        timeZone: 'America/Santiago'  // Zona horaria de Chile
    };
    
    return fechaObj.toLocaleDateString('es-ES', opciones);
}

// Actualizar selector de año dinámicamente
function actualizarSelectorAño() {
    const selectorAño = document.getElementById('año');
    if (!selectorAño) return;
    
    const añoActual = new Date().getFullYear();
    const añoAnterior = añoActual - 1;
    
    // Limpiar opciones existentes
    selectorAño.innerHTML = '';
    
    // Añadir opciones para el año actual y el anterior
    const opcionAñoAnterior = document.createElement('option');
    opcionAñoAnterior.value = añoAnterior.toString();
    opcionAñoAnterior.textContent = añoAnterior.toString();
    selectorAño.appendChild(opcionAñoAnterior);
    
    const opcionAñoActual = document.createElement('option');
    opcionAñoActual.value = añoActual.toString();
    opcionAñoActual.textContent = añoActual.toString();
    opcionAñoActual.selected = true;
    selectorAño.appendChild(opcionAñoActual);
    
    // Actualizar variable global
    añoActual = añoActual.toString();
    
    // Añadir evento de cambio
    selectorAño.addEventListener('change', function() {
        añoActual = this.value;
        renderizarTablaInquilinos();
        calcularTotales();
    });
}

// Cambiar mes
function cambiarMes() {
    const mesSeleccionado = document.getElementById('mes').value;
    mesActual = mesSeleccionado;
    
    // No filtrar los inquilinos, siempre mostrar todos
    inquilinosFiltrados = [...inquilinos];
    
    renderizarTablaInquilinos();
    calcularTotales();
}

// Renderizar tabla de inquilinos
function renderizarTablaInquilinos() {
    const tbody = document.getElementById('inquilinos-body');
    tbody.innerHTML = '';

    inquilinosFiltrados.forEach(inquilino => {
        const tr = document.createElement('tr');
        
        // Obtener el estado de pago para el mes y año seleccionados
        let estadoPago = 'No pagado';
        
        if (mesActual && añoActual) {
            const campo = `pago_${mesActual}_${añoActual}`;
            if (inquilino[campo]) {
                estadoPago = inquilino[campo];
            }
        } else {
            // Si no hay mes o año seleccionado, usar el campo estado_pago por compatibilidad
            estadoPago = inquilino.estado_pago;
        }
        
        // Aplicar clase según estado de pago
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

// Calcular totales
function calcularTotales() {
    let total = 0;
    let totalPagado = 0;
    let totalNoPagado = 0;

    inquilinosFiltrados.forEach(inquilino => {
        const monto = parseFloat(inquilino.monto);
        total += monto;
        
        // Determinar si está pagado según el mes y año seleccionados
        let pagado = false;
        
        if (mesActual && añoActual) {
            const campo = `pago_${mesActual}_${añoActual}`;
            pagado = inquilino[campo] === 'Pagado';
        } else {
            // Si no hay mes o año seleccionado, usar el campo estado_pago por compatibilidad
            pagado = inquilino.estado_pago === 'Pagado';
        }
        
        if (pagado) {
            totalPagado += monto;
        } else {
            totalNoPagado += monto;
        }
    });

    document.getElementById('total').textContent = `$${total}`;
    document.getElementById('total-pagado').textContent = `$${totalPagado}`;
    document.getElementById('total-no-pagado').textContent = `$${totalNoPagado}`;
}

// Sincronizar correos
function sincronizarCorreos() {
    // Cambiar texto del botón
    const btnSincronizar = document.getElementById('btn-sincronizar');
    const textoOriginal = btnSincronizar.textContent;
    btnSincronizar.textContent = 'Sincronizando...';
    btnSincronizar.disabled = true;

    // Obtener URL de autenticación
    fetch('/api/auth/url')
        .then(response => response.json())
        .then(data => {
            if (data.auth_url) {
                // Abrir ventana de autenticación
                window.open(data.auth_url, '_blank', 'width=600,height=600');
                
                // Configurar intervalo para verificar autenticación
                const interval = setInterval(() => {
                    fetch('/api/auth/check')
                        .then(response => response.json())
                        .then(checkData => {
                            if (checkData.authenticated) {
                                clearInterval(interval);
                                sincronizarCorreosAutenticado(mesActual, añoActual);
                            }
                        })
                        .catch(error => {
                            console.error('Error al verificar autenticación:', error);
                        });
                }, 2000);
                
                // Detener el intervalo después de 2 minutos (timeout)
                setTimeout(() => {
                    clearInterval(interval);
                    btnSincronizar.textContent = textoOriginal;
                    btnSincronizar.disabled = false;
                }, 120000);
            }
        })
        .catch(error => {
            console.error('Error al obtener URL de autenticación:', error);
            btnSincronizar.textContent = textoOriginal;
            btnSincronizar.disabled = false;
        });
}

// Sincronizar correos una vez autenticado
function sincronizarCorreosAutenticado(mes, año) {
    // Construir URL con parámetros de mes y año
    let url = '/api/sync';
    const params = new URLSearchParams();
    
    if (mes) {
        params.append('mes', mes);
    }
    
    if (año) {
        params.append('año', año);
    }
    
    if (params.toString()) {
        url += `?${params.toString()}`;
    }
    
    // Realizar sincronización
    fetch(url)
        .then(response => response.json())
        .then(data => {
            // Restaurar botón
            const btnSincronizar = document.getElementById('btn-sincronizar');
            btnSincronizar.textContent = 'Sincronizar Correos';
            btnSincronizar.disabled = false;
            
            // Mostrar mensaje
            alert(data.mensaje);
            
            // Recargar inquilinos
            fetch('/api/inquilinos')
                .then(response => response.json())
                .then(inquilinosData => {
                    inquilinos = inquilinosData;
                    inquilinosFiltrados = [...inquilinos];
                    renderizarTablaInquilinos();
                    calcularTotales();
                });
            
            // Actualizar fecha de sincronización de la API
            if (data.fecha_sincronizacion) {
                // Usar la función de formateo para hora chilena
                const fechaFormateada = formatearFechaChilena(data.fecha_sincronizacion);
                document.getElementById('fecha-sincronizacion').textContent = fechaFormateada;
            }
        })
        .catch(error => {
            console.error('Error en sincronización:', error);
            
            // Restaurar botón
            const btnSincronizar = document.getElementById('btn-sincronizar');
            btnSincronizar.textContent = 'Sincronizar Correos';
            btnSincronizar.disabled = false;
            
            alert('Error en sincronización. Por favor, intenta de nuevo.');
        });
}

// Guardar inquilino
function guardarInquilino(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const inquilino = {
        propietario: formData.get('propietario'),
        propiedad: formData.get('propiedad'),
        telefono: formData.get('telefono'),
        rut: formData.get('rut'),
        monto: formData.get('monto'),
        estado_pago: 'No pagado'
    };
    
    // Si hay un ID, es una edición
    const inquilinoId = formData.get('id');
    const url = inquilinoId ? `/api/inquilinos/${inquilinoId}` : '/api/inquilinos';
    const method = inquilinoId ? 'PUT' : 'POST';
    
    fetch(url, {
        method: method,
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(inquilino)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Recargar inquilinos
            fetch('/api/inquilinos')
                .then(response => response.json())
                .then(inquilinosData => {
                    inquilinos = inquilinosData;
                    inquilinosFiltrados = [...inquilinos];
                    renderizarTablaInquilinos();
                    calcularTotales();
                    
                    // Limpiar formulario
                    document.getElementById('form-inquilino').reset();
                    document.getElementById('id').value = '';
                    document.getElementById('btn-guardar').textContent = 'Agregar';
                });
        } else {
            alert('Error al guardar inquilino. Por favor, intenta de nuevo.');
        }
    })
    .catch(error => {
        console.error('Error al guardar inquilino:', error);
        alert('Error al guardar inquilino. Por favor, intenta de nuevo.');
    });
}

// Editar inquilino
function editarInquilino(id) {
    const inquilino = inquilinos.find(i => i.id === id);
    if (inquilino) {
        document.getElementById('id').value = inquilino.id;
        document.getElementById('propietario').value = inquilino.propietario;
        document.getElementById('propiedad').value = inquilino.propiedad;
        document.getElementById('telefono').value = inquilino.telefono;
        document.getElementById('rut').value = inquilino.rut || '';
        document.getElementById('monto').value = inquilino.monto;
        document.getElementById('btn-guardar').textContent = 'Actualizar';
    }
}

// Eliminar inquilino
function eliminarInquilino(id) {
    if (!confirm('¿Estás seguro de eliminar este inquilino?')) {
        return;
    }
    
    fetch(`/api/inquilinos/${id}`, {
        method: 'DELETE'
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Eliminar de la lista local
            inquilinos = inquilinos.filter(i => i.id !== id);
            inquilinosFiltrados = inquilinosFiltrados.filter(i => i.id !== id);
            
            // Actualizar tabla y totales
            renderizarTablaInquilinos();
            calcularTotales();
        } else {
            throw new Error('Error al eliminar inquilino');
        }
    })
    .catch(error => {
        console.error('Error al eliminar inquilino:', error);
        alert('Error al eliminar inquilino. Por favor, intenta de nuevo.');
        
        // Si no hay conexión con el backend, simular eliminación (solo para demostración)
        inquilinos = inquilinos.filter(i => i.id !== id);
        cambiarMes(); // Esto actualizará inquilinosFiltrados y renderizará la tabla
    });
}
