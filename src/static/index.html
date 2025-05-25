// Funcionalidad completa para la aplicación
document.addEventListener('DOMContentLoaded', function() {
    console.log('Script cargado correctamente');
    
    // Variables globales
    let mesActual = '';
    let añoActual = '';
    
    // Configurar el menú lateral
    const menuToggle = document.getElementById('menu-toggle');
    const menu = document.getElementById('menu');
    if (menuToggle && menu) {
        menuToggle.addEventListener('click', function() {
            console.log('Botón menú clickeado');
            menu.classList.toggle('active');
        });
    }
    
    // Configurar botones del menú
    const btnVerPagos = document.getElementById('Ver Pagos');
    const btnAnadirInquilinos = document.getElementById('Añadir Inquilinos');
    
    if (btnVerPagos) {
        btnVerPagos.addEventListener('click', function() {
            console.log('Botón Ver Pagos clickeado');
            // Ocultar menú
            if (menu) {
                menu.classList.remove('active');
            }
        });
    }
    
    if (btnAnadirInquilinos) {
        btnAnadirInquilinos.addEventListener('click', function() {
            console.log('Botón Añadir Inquilinos clickeado');
            // Mostrar modal
            const modal = document.getElementById('modal-inquilino');
            if (modal) {
                modal.style.display = 'block';
            }
        });
    }
    
    // Configurar botón cancelar del modal
    const btnCancelar = document.getElementById('btn-cancelar');
    if (btnCancelar) {
        btnCancelar.addEventListener('click', function() {
            console.log('Botón Cancelar clickeado');
            // Ocultar modal
            const modal = document.getElementById('modal-inquilino');
            if (modal) {
                modal.style.display = 'none';
            }
        });
    }
    
    // Configurar formulario de inquilino
    const formInquilino = document.getElementById('form-inquilino');
    if (formInquilino) {
        formInquilino.addEventListener('submit', function(e) {
            e.preventDefault();
            console.log('Formulario enviado');
            
            // Obtener datos del formulario
            const id = document.getElementById('inquilino-id').value;
            const propietario = document.getElementById('propietario').value;
            const propiedad = document.getElementById('propiedad').value;
            const telefono = document.getElementById('telefono').value;
            const rut = document.getElementById('rut').value;
            const monto = document.getElementById('monto').value;
            
            // Construir datos para enviar
            const data = {
                id: id,
                propietario: propietario,
                propiedad: propiedad,
                telefono: telefono,
                rut: rut,
                monto: monto
            };
            
            console.log('Datos a enviar:', data);
            
            // Determinar URL según si es edición o creación
            const url = id ? `/api/inquilinos/${id}` : '/api/inquilinos';
            const method = id ? 'PUT' : 'POST';
            
            // Enviar datos
            fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            })
            .then(response => response.json())
            .then(data => {
                console.log('Respuesta:', data);
                if (data.success) {
                    // Ocultar modal
                    const modal = document.getElementById('modal-inquilino');
                    if (modal) {
                        modal.style.display = 'none';
                    }
                    
                    // Recargar página
                    window.location.reload();
                } else {
                    alert('Error: ' + (data.mensaje || 'Error desconocido'));
                }
            })
            .catch(error => {
                console.error('Error:', error);
                alert('Error al guardar inquilino');
            });
        });
    }
    
    // Inicializar selector de mes
    const selectorMes = document.getElementById('mes');
    if (selectorMes) {
        mesActual = selectorMes.value;
        console.log('Mes inicial:', mesActual);
        
        selectorMes.addEventListener('change', function() {
            mesActual = this.value;
            console.log('Mes cambiado a:', mesActual);
            
            // Redirigir con parámetros de mes y año
            const url = new URL(window.location.href);
            url.searchParams.set('mes', mesActual);
            if (añoActual) {
                url.searchParams.set('año', añoActual);
            }
            window.location.href = url.toString();
        });
    }
    
    // Inicializar selector de año
    const selectorAño = document.getElementById('año');
    if (selectorAño) {
        añoActual = selectorAño.value;
        console.log('Año inicial:', añoActual);
        
        selectorAño.addEventListener('change', function() {
            añoActual = this.value;
            console.log('Año cambiado a:', añoActual);
            
            // Redirigir con parámetros de mes y año
            const url = new URL(window.location.href);
            if (mesActual) {
                url.searchParams.set('mes', mesActual);
            }
            url.searchParams.set('año', añoActual);
            window.location.href = url.toString();
        });
    }
    
    // Configurar botón de sincronizar
    const btnSincronizar = document.querySelector('input[value="Sincronizar Correos"]');
    if (btnSincronizar) {
        btnSincronizar.addEventListener('click', function() {
            console.log('Botón sincronizar clickeado');
            console.log('Sincronizando con mes:', mesActual, 'y año:', añoActual);
            
            // Construir URL con parámetros
            let syncUrl = '/api/sync';
            const params = new URLSearchParams();
            
            if (mesActual) {
                params.append('mes', mesActual);
            }
            
            if (añoActual) {
                params.append('año', añoActual);
            }
            
            if (params.toString()) {
                syncUrl += '?' + params.toString();
            }
            
            console.log('URL de sincronización:', syncUrl);
            
            // Mostrar indicador de carga
            btnSincronizar.disabled = true;
            btnSincronizar.value = 'Sincronizando...';
            
            // Realizar sincronización
            fetch(syncUrl)
                .then(response => {
                    console.log('Respuesta recibida:', response);
                    return response.json();
                })
                .then(data => {
                    console.log('Datos recibidos:', data);
                    if (data.success) {
                        // Actualizar última sincronización
                        const ultimaSincronizacion = document.getElementById('ultima-sincronizacion');
                        if (ultimaSincronizacion) {
                            ultimaSincronizacion.textContent = new Date().toLocaleString();
                        }
                        
                        // Recargar la página para mostrar los cambios
                        window.location.reload();
                    } else {
                        alert('Error en sincronización: ' + (data.mensaje || 'Error desconocido'));
                    }
                })
                .catch(error => {
                    console.error('Error en sincronización:', error);
                    alert('Error en sincronización');
                })
                .finally(() => {
                    // Restaurar botón
                    btnSincronizar.disabled = false;
                    btnSincronizar.value = 'Sincronizar Correos';
                });
        });
    }
    
    // Cargar inquilinos al inicio
    cargarInquilinos();
    
    // Función para cargar inquilinos
    function cargarInquilinos() {
        console.log('Cargando inquilinos...');
        
        // Construir URL con parámetros
        let url = '/api/inquilinos';
        const params = new URLSearchParams();
        
        if (mesActual) {
            params.append('mes', mesActual);
        }
        
        if (añoActual) {
            params.append('año', añoActual);
        }
        
        if (params.toString()) {
            url += '?' + params.toString();
        }
        
        console.log('URL de carga:', url);
        
        // Realizar petición
        fetch(url)
            .then(response => {
                console.log('Respuesta recibida:', response);
                return response.json();
            })
            .then(inquilinos => {
                console.log('Inquilinos recibidos:', inquilinos);
                actualizarTablaInquilinos(inquilinos);
            })
            .catch(error => {
                console.error('Error al cargar inquilinos:', error);
            });
    }
    
    // Función para actualizar la tabla de inquilinos
    function actualizarTablaInquilinos(inquilinos) {
        console.log('Actualizando tabla con inquilinos:', inquilinos);
        
        // Obtener tabla
        const tabla = document.querySelector('table');
        if (!tabla) {
            console.error('No se encontró la tabla');
            return;
        }
        
        // Mantener encabezados
        const encabezados = tabla.querySelector('tr');
        tabla.innerHTML = '';
        if (encabezados) {
            tabla.appendChild(encabezados);
        }
        
        // Variables para totales
        let total = 0;
        let totalPagado = 0;
        let totalNoPagado = 0;
        
        // Agregar filas de inquilinos
        inquilinos.forEach(inquilino => {
            console.log('Procesando inquilino:', inquilino);
            
            // Crear fila
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
            
            console.log('Estado de pago:', estadoPago);
            
            // Calcular totales
            const monto = parseFloat(inquilino.monto);
            total += monto;
            
            if (estadoPago === 'Pagado') {
                totalPagado += monto;
            } else {
                totalNoPagado += monto;
            }
            
            // Crear contenido de la fila
            tr.innerHTML = `
                <td>${inquilino.propietario}</td>
                <td>${inquilino.propiedad}</td>
                <td>${inquilino.telefono}</td>
                <td>$${monto}</td>
                <td>${estadoPago}</td>
                <td>
                    <input type="button" value="Eliminar" onclick="eliminarInquilino(${inquilino.id})">
                    <input type="button" value="Editar" onclick="editarInquilino(${inquilino.id})">
                </td>
            `;
            
            // Añadir fila a la tabla
            tabla.appendChild(tr);
        });
        
        console.log('Totales calculados:', { total, totalPagado, totalNoPagado });
        
        // Actualizar totales en la página
        document.getElementById('total').textContent = `$${total}`;
        document.getElementById('total-pagado').textContent = `$${totalPagado}`;
        document.getElementById('total-no-pagado').textContent = `$${totalNoPagado}`;
    }
});

// Funciones globales para editar y eliminar inquilinos
function editarInquilino(id) {
    console.log('Editando inquilino:', id);
    
    // Obtener datos del inquilino
    fetch(`/api/inquilinos/${id}`)
        .then(response => response.json())
        .then(inquilino => {
            console.log('Datos del inquilino:', inquilino);
            
            // Mostrar formulario de edición
            const modal = document.getElementById('modal-inquilino');
            if (modal) {
                modal.style.display = 'block';
                
                // Llenar formulario con datos del inquilino
                document.getElementById('inquilino-id').value = inquilino.id;
                document.getElementById('propietario').value = inquilino.propietario;
                document.getElementById('propiedad').value = inquilino.propiedad;
                document.getElementById('telefono').value = inquilino.telefono;
                document.getElementById('rut').value = inquilino.rut || '';
                document.getElementById('monto').value = inquilino.monto;
                
                // Cambiar texto del botón
                const btnAgregar = document.getElementById('btn-agregar');
                if (btnAgregar) {
                    btnAgregar.value = 'Actualizar';
                }
            }
        })
        .catch(error => {
            console.error('Error al obtener inquilino:', error);
            alert('Error al obtener datos del inquilino');
        });
}

function eliminarInquilino(id) {
    console.log('Eliminando inquilino:', id);
    
    if (confirm('¿Estás seguro de eliminar este inquilino?')) {
        fetch(`/api/inquilinos/${id}`, {
            method: 'DELETE'
        })
        .then(response => response.json())
        .then(data => {
            console.log('Respuesta:', data);
            if (data.success) {
                // Recargar página
                window.location.reload();
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
