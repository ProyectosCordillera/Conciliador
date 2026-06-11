// js/app.js - Lógica del Analizador de Cuenta Puente

document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.getElementById('fileInput');
    const btnAnalizar = document.getElementById('btnAnalizar');
    const alertContainer = document.getElementById('alertContainer');
    const resultadosDiv = document.getElementById('resultados');
    const tbodyParejas = document.getElementById('tbodyParejas');

    // Habilitar botón cuando se selecciona un archivo
    fileInput.addEventListener('change', () => {
        btnAnalizar.disabled = !fileInput.files.length;
        alertContainer.innerHTML = '';
        resultadosDiv.style.display = 'none'; // Ocultar resultados previos
    });

    btnAnalizar.addEventListener('click', () => {
        const file = fileInput.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const texto = e.target.result;
                const movimientos = parsearArchivo(texto);
                
                if (movimientos.length === 0) {
                    mostrarAlerta('⚠️ No se encontraron movimientos válidos. Asegúrate de subir el TXT de Open 4 Business.', 'warning');
                    return;
                }

                const parejas = emparejarDebitosCreditos(movimientos);
                renderizarResultados(movimientos, parejas);
            } catch (error) {
                mostrarAlerta(`❌ Error al procesar: ${error.message}`, 'danger');
            }
        };
        reader.readAsText(file);
    });

    // 1. PARSEAR EL ARCHIVO TXT
    // Basado en la estructura real de Open 4 Business:
    // Col 5: Fecha, Col 6: Asiento, Col 7: Descripción, Col 9: Débito, Col 10: Crédito
    function parsearArchivo(texto) {
        const lineas = texto.split(/\r?\n/);
        const movimientos = [];

        lineas.forEach(linea => {
            const cols = linea.split('\t');
            
            // Validar que tenga suficientes columnas y que la columna 5 sea una fecha válida
            if (cols.length > 10 && /^\d{2}-\d{2}-\d{4}$/.test(cols[5].trim())) {
                movimientos.push({
                    fecha: cols[5].trim(),
                    asiento: cols[6].trim(),
                    descripcion: cols[7].trim(),
                    debito: parseFloat(cols[9].replace(/,/g, '')) || 0,
                    credito: parseFloat(cols[10].replace(/,/g, '')) || 0
                });
            }
        });
        return movimientos;
    }

    // 2. MOTOR DE EMPAREJAMIENTO
    function emparejarDebitosCreditos(movimientos) {
        // Clonar y marcar como no emparejados
        let debitos = movimientos.filter(m => m.debito > 0).map(m => ({...m, emparejado: false}));
        let creditos = movimientos.filter(m => m.credito > 0).map(m => ({...m, emparejado: false}));
        let parejas = [];

        // NIVEL 1: Coincidencias EXACTAS (Verde)
        debitos.forEach(d => {
            if (d.emparejado) return;
            const c = creditos.find(c => !c.emparejado && c.credito === d.debito);
            
            if (c) {
                parejas.push({ 
                    d, c, diff: 0, 
                    estado: '✅ Conciliado', 
                    color: 'verde',
                    tooltip: 'Montos idénticos'
                });
                d.emparejado = true; 
                c.emparejado = true;
            }
        });

        // NIVEL 2: Débitos sin pareja (Rojo)
        debitos.filter(d => !d.emparejado).forEach(d => {
            parejas.push({ 
                d, c: null, diff: d.debito, 
                estado: '❌ Sin pareja (Débito)', 
                color: 'roja',
                tooltip: `Débito huérfano: ${d.debito.toFixed(2)}\nAsiento: ${d.asiento}\nAcción: Buscar crédito por este monto`
            });
        });

        // NIVEL 3: Créditos sin pareja (Rojo)
        creditos.filter(c => !c.emparejado).forEach(c => {
            parejas.push({ 
                d: null, c, diff: -c.credito, 
                estado: ' Sin pareja (Crédito)', 
                color: 'roja',
                tooltip: `Crédito huérfano: ${c.credito.toFixed(2)}\nAsiento: ${c.asiento}\nAcción: Buscar débito por este monto`
            });
        });

        // Ordenar de menor a mayor por monto
        parejas.sort((a, b) => {
            const montoA = Math.max(a.d?.debito || 0, a.c?.credito || 0);
            const montoB = Math.max(b.d?.debito || 0, b.c?.credito || 0);
            return montoA - montoB;
        });

        return parejas;
    }

    // 3. RENDERIZAR EN PANTALLA
    function renderizarResultados(movimientos, parejas) {
        resultadosDiv.style.display = 'block';
        
        const totalDebitos = movimientos.reduce((sum, m) => sum + m.debito, 0);
        const totalCreditos = movimientos.reduce((sum, m) => sum + m.credito, 0);
        const diferencia = totalDebitos - totalCreditos;

        document.getElementById('lblDebitos').textContent = totalDebitos.toLocaleString('en-US', {minimumFractionDigits: 2});
        document.getElementById('lblCreditos').textContent = totalCreditos.toLocaleString('en-US', {minimumFractionDigits: 2});
        document.getElementById('lblDiferencia').textContent = diferencia.toLocaleString('en-US', {minimumFractionDigits: 2});
        document.getElementById('lblTotalParejas').textContent = parejas.length;

        // Cambiar color de la tarjeta de diferencia
        const cardDif = document.getElementById('cardDiferencia');
        cardDif.className = `card text-white card-shadow text-center py-3 ${Math.abs(diferencia) < 0.01 ? 'bg-success' : 'bg-danger'}`;

        // Generar filas de la tabla
        tbodyParejas.innerHTML = '';
        parejas.forEach(p => {
            const tr = document.createElement('tr');
            tr.className = `fila-${p.color}`;
            
            // Formatear montos
            const fmtDebito = p.d ? p.d.debito.toLocaleString('en-US', {minimumFractionDigits: 2}) : '0.00';
            const fmtCredito = p.c ? p.c.credito.toLocaleString('en-US', {minimumFractionDigits: 2}) : '0.00';
            const fmtDiff = p.diff.toLocaleString('en-US', {minimumFractionDigits: 2});

            tr.innerHTML = `
                <td>${p.d ? p.d.fecha : '-'}</td>
                <td>${p.d ? p.d.asiento : '-'}</td>
                <td><small>${p.d ? p.d.descripcion : '-'}</small></td>
                <td class="text-end monto-debito">${fmtDebito}</td>
                <td class="text-end">${fmtDiff}</td>
                <td class="text-end monto-credito">${fmtCredito}</td>
                <td><small>${p.c ? p.c.descripcion : '-'}</small></td>
                <td>${p.c ? p.c.asiento : '-'}</td>
                <td>${p.c ? p.c.fecha : '-'}</td>
                <td class="text-center">
                    <span class="badge ${p.color === 'verde' ? 'bg-success' : 'bg-danger'}" 
                          title="${p.tooltip.replace(/\n/g, ' ')}">
                        ${p.estado}
                    </span>
                </td>
            `;
            tbodyParejas.appendChild(tr);
        });

        // Mensaje de éxito/error general
        const errores = parejas.filter(p => p.color === 'roja').length;
        if (errores === 0) {
            mostrarAlerta(`✅ ¡CUENTA CUADRADA! Todos los débitos tienen su pareja. Diferencia: 0.00`, 'success');
        } else {
            mostrarAlerta(`❌ HAY DESCUADRES. Se encontraron ${errores} líneas sin conciliar. Pasa el mouse sobre las etiquetas rojas para ver detalles.`, 'danger');
        }
    }

    function mostrarAlerta(mensaje, tipo) {
        alertContainer.innerHTML = `<div class="alert alert-${tipo} alert-dismissible fade show" role="alert">
            ${mensaje}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>`;
    }
});
