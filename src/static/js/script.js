// Variables globales
let mesActual = '';
let añoActual = '';
let inquilinos = [];

// Inicialización cuando el DOM está cargado
document.addEventListener('DOMContentLoaded', function() {
    // Configurar el menú lateral
    const menuToggle = document.getElementById('menu-toggle');
    const menu = document.getElementById('menu');
    if (menuToggle && menu) {
        menuToggle.addEventListener('click', function() {
            menu.classList.toggle('active');
        });
    }
    
    // Configurar botones del menú
    const btnVerPagos = document.getElementById('btn-ver-pagos');
    const btnAnadirInquilinos = document.getElementById('btn-anadir-inquilinos');
    
    if (btnVerPagos) {
        btnVerPagos.addEventListener('click', function() {
            // Ocultar menú lateral
            if (menu) {
                menu.classList.remove('active');
            }
        });
    }
    
    if (btnAnadirInquilinos) {
        btnAnadirInquilinos.addEventListener('click', function() {
            // Mostrar modal de añadir inquilino
            const modal = document.getElementById('modal-inquilino');
            if (modal) {
                modal.style.display = 'block';
                // Limpiar formulario
                document.getElementById('inquilino-id').value = '';
                document.getElementById('propietario').value = '';
                document.getElementById('propiedad').value = '';
                document.getElementById('telefono').value = '';
                document.getElementById('rut').value = '';
                document.getElementById('monto').value = '';
                document.getElementById('btn-agregar').textContent = 'Agregar';
            }
        });
    }
    
    // Configurar botón de cancelar en modal
    const btnCancelar = document.getElementById('btn-cancelar');
    if (btnCancelar) {
        btnCancelar.addEventListener('click', function() {
            const modal = document.getElementById('modal-inquilino');
            if (modal) {
                modal.style.display = 'none';
            }
        });
    }
    
    // Configurar formulario de inquilino
    const formInquilino = document.getElementById('form-inquilino');
    if (formInquilino) {
        formInquilino.addEventListener('submit', function(event) {
            event.preventDefault();
            guardarInquilino();
        });
    }
    
    // Configurar botón de sincronizar
    const btnSincronizar = document.getElementById('sincronizar-correos-btn');
    if (btnSincronizar) {
        btnSincronizar.addEventListener('click', sincronizarCorreos);
    }
    
    // Configurar selector de mes
    const selectorMes = document.getElementById('mes');
    if (selectorMes) {
        mesActual = selectorMes.value;
        selectorMes.addEventListener('change', function() {
            mesActual = this.value;
            actualizarTablaInquilinos();
        });
    }
    
    // Configurar selector de año
    const selectorAño = document.getElementById('año');
    if (selectorAño) {
        añoActual = selectorAño.value;
        selectorAño.addEventListener('change', function() {
            añoActual = this.value;
            actualizarTablaInquilinos();
        });
    }
    
    // Cargar inquilinos al inicio
    cargarInquilinos();
    
    // Cargar última sincronización
    cargarUltimaSincronizacion();
});

// Función para cargar inquilinos
function cargarInquilinos() {
    fetch('/api/inquilinos')
        .then(response => response.json())
        .then(data => {
            inquilinos = data;
            actualizarTablaInquilinos();
        })
        .catch(error => {
            console.error('Error al cargar inquilinos:', error);
        });
}

// Función para actualizar la tabla de inquilinos
function actualizarTablaInquilinos() {
    const tbody = document.getElementById('inquilinos-body');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    inquilinos.forEach(inquilino => {
        const tr = document.createElement('tr');
        tr.setAttribute('data-id', inquilino.id);
        
        // Determinar estado de pago según mes y año seleccionados
        let estadoPago = 'No pagado';
        if (mesActual && añoActual) {
            const campo = `pago_${mesActual}_${añoActual}`;
            if (inquilino[campo]) {
                estadoPago = inquilino[campo];
            }
        } else {
            estadoPago = inquilino.estado_pago;
        }
        
        const claseEstado = estadoPago === 'Pagado' ? 'pagado' : 'no-pagado';
        
        tr.innerHTML = `
            <td>${inquilino.propietario}</td>
            <td>${inquilino.propiedad}</td>
            <td>${inquilino.telefono}</td>
            <td>$${inquilino.monto}</td>
            <td class="estado-pago ${claseEstado}">${estadoPago}</td>
            <td>
                <button class="btn-accion btn-eliminar" onclick="eliminarInquilino(${inquilino.id})">Eliminar</button>
                <button class="btn-accion btn-editar" onclick="editarInquilino(${inquilino.id})">Editar</button>
            </td>
        `;
        
        tbody.appendChild(tr);
    });
    
    calcularTotales();
}

// Función para guardar inquilino
function guardarInquilino() {
    const inquilinoId = document.getElementById('inquilino-id').value;
    
    const inquilino = {
        propietario: document.getElementById('propietario').value,
        propiedad: document.getElementById('propiedad').value,
        telefono: document.getElementById('telefono').value,
        rut: document.getElementById('rut').value,
        monto: document.getElementById('monto').value,
        estado_pago: 'No pagado'
    };
    
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
            // Ocultar modal
            document.getElementById('modal-inquilino').style.display = 'none';
            // Recargar inquilinos
            cargarInquilinos();
        } else {
            alert('Error al guardar inquilino');
        }
    })
    .catch(error => {
        console.error('Error al guardar inquilino:', error);
        alert('Error al guardar inquilino');
    });
}

// Función para editar inquilino
function editarInquilino(id) {
    const inquilino = inquilinos.find(i => i.id === id);
    if (inquilino) {
        document.getElementById('inquilino-id').value = inquilino.id;
        document.getElementById('propietario').value = inquilino.propietario;
        document.getElementById('propiedad').value = inquilino.propiedad;
        document.getElementById('telefono').value = inquilino.telefono;
        document.getElementById('rut').value = inquilino.rut || '';
        document.getElementById('monto').value = inquilino.monto;
        document.getElementById('btn-agregar').textContent = 'Actualizar';
        
        // Mostrar modal
        document.getElementById('modal-inquilino').style.display = 'block';
    }
}

// Función para eliminar inquilino
function eliminarInquilino(id) {
    if (confirm('¿Estás seguro de eliminar este inquilino?')) {
        fetch(`/api/inquilinos/${id}`, {
            method: 'DELETE'
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                cargarInquilinos();
            } else {
                alert('Error al eliminar inquilino');
            }
        })
        .catch(error => {
            console.error('Error al eliminar inquilino:', error);
            alert('Error al eliminar inquilino');
        });
    }
}

// Función para sincronizar correos
function sincronizarCorreos() {
    // Construir URL con parámetros de mes y año
    let url = '/api/sync';
    const params = new URLSearchParams();
    
    if (mesActual) {
        params.append('mes', mesActual);
    }
    
    if (añoActual) {
        params.append('año', añoActual);
    }
    
    if (params.toString()) {
        url += `?${params.toString()}`;
    }
    
    // Realizar sincronización
    fetch(url)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert(data.mensaje || 'Sincronización completada');
                cargarInquilinos();
                cargarUltimaSincronizacion();
            } else {
                alert('Error en sincronización: ' + (data.mensaje || 'Error desconocido'));
            }
        })
        .catch(error => {
            console.error('Error en sincronización:', error);
            alert('Error en sincronización');
        });
}

// Función para cargar última sincronización
function cargarUltimaSincronizacion() {
    fetch('/api/sync/last')
        .then(response => response.json())
        .then(data => {
            if (data.success && data.fecha_sincronizacion) {
                const fecha = new Date(data.fecha_sincronizacion);
                document.getElementById('ultima-sincronizacion').textContent = fecha.toLocaleString();
            }
        })
        .catch(error => {
            console.error('Error al cargar última sincronización:', error);
        });
}

// Función para calcular totales
function calcularTotales() {
    let total = 0;
    let totalPagado = 0;
    let totalNoPagado = 0;
    
    inquilinos.forEach(inquilino => {
        const monto = parseFloat(inquilino.monto);
        total += monto;
        
        // Determinar si está pagado según el mes y año seleccionados
        let pagado = false;
        if (mesActual && añoActual) {
            const campo = `pago_${mesActual}_${añoActual}`;
            pagado = inquilino[campo] === 'Pagado';
        } else {
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
