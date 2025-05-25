// Funcionalidad para el menú lateral y botón flotante
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
            // Mostrar sección de pagos (ya visible por defecto)
            // Puedes agregar lógica adicional si es necesario
        });
    }
    
    if (btnAnadirInquilinos) {
        btnAnadirInquilinos.addEventListener('click', function() {
            // Mostrar modal de añadir inquilino o enfocar el formulario
            const formulario = document.getElementById('form-inquilino');
            if (formulario) {
                const propietarioInput = document.getElementById('propietario');
                if (propietarioInput) {
                    propietarioInput.focus();
                }
            }
        });
    }
});
