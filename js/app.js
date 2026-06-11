document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.getElementById('fileInput');
    const btnAnalizar = document.getElementById('btnAnalizar');
    const alertContainer = document.getElementById('alertContainer');
    const resultadosDiv = document.getElementById('resultados');
    const tbodyParejas = document.getElementById('tbodyParejas');

    // Habilitar botón cuando se selecciona archivo
    fileInput.addEventListener('change', () => {
        btnAnalizar.disabled = !fileInput.files.length;
        alertContainer.innerHTML = '';
        resultadosDiv.style.display = 'none';
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
    function parsearArchivo(texto) {
        const lineas = texto.split(/\r?\n/);
        const movimientos = [];

        lineas.forEach(linea => {
            const cols = linea.split('\t');
            
            // Buscar líneas que tengan una fecha válida (dd-mm-yyyy)
            // En el TXT de Open 4 Business, la fecha está en la columna 0 o 5
            let fechaStr = '';
            for (let i = 0; i < Math.min(cols.length, 10); i++) {
                if (/^\d{2}-\d{2}-\d{4}$/.test(cols[i].trim())) {
                    fechaStr = cols[i].trim();
                    break;
                }
            }
            
            if (fechaStr && cols.length > 8) {
                // Extraer débitos y créditos (columnas 9 y 10 aprox)
                // Buscamos números con formato de moneda
                const montos = cols.filter(c => /[\d,]+\.\d{2}/.test(c));
                
                let debito = 0;
                let credito = 0;
                
                // El formato típico es: Fecha | Asiento | Descripción | Débito | Crédito | Saldo
                for (let i = 0; i < cols.length; i++) {
                    const val = cols[i].trim();
                    if (/^\d{1,3}(,\d{3})*\.\d{2}$/.test(val)) {
                        const num = parseFloat(val.replace(/,/g, ''));
                        // Si es 0.00 probablemente es un crédito vacío
                        // Si hay un número grande, es débito o crédito
                        if (num > 0) {
                            // Determinar si es débito o crédito basado en la posición
                            // En Open 4 Business, después de la descripción vienen Débito, Crédito, Saldo
                            if (i >= 8 && i <= 10) {
                                if (cols[i-1] && cols[i-1].includes('PROVEEDOR') || cols[i-1].includes('BODEGA')) {
                                    debito = num;
                                } else if (i+1 < cols.length && cols[i+1] && !cols[i+1].match(/^\d/)) {
                                    credito = num;
                                }
                            }
                        }
                    }
                }
                
                // Método alternativo: buscar explícitamente en las columnas conocidas
                // Columna 9 = Débito, Columna 10 = Crédito (aproximadamente)
                if (cols[9]) {
                    const valDebito = cols[9].trim();
                    if (/^\d{1,3}(,\d{3})*\.\d{2}$/.test(valDebito)) {
                        debito = parseFloat(valDebito.replace(/,/g, ''));
                    }
                }
                if (cols[10]) {
                    const valCredito = cols[10].trim();
                    if (/^\d{1,3}(,\d{3})*\.\d{2}$/.test(valCredito)) {
                        credito = parseFloat(valCredito.replace(/,/g, ''));
                    }
                }
                
                // Solo agregar si tiene débito O crédito mayor a 0
                if (debito > 0 || credito > 0) {
                    movimientos.push({
                        fecha: fechaStr,
                        asiento: cols[1] ? cols[1].trim() : '',
                        descripcion: cols[2] ? cols[2].trim() : '',
                        debito: debito,
                        credito: credito
                    });
                }
            }
        });
        
        return movimientos;
    }

    // 2. EMPAREJAR DÉBITOS CON CRÉDITOS
    function emparejarDebitosCreditos(movimientos) {
        let debitos = movimientos.filter(m => m.debito > 0).map(m => ({...m, emparejado: false}));
        let creditos = movimientos.filter(m => m.credito > 0).map(m => ({...m, emparejado: false}));
        let parejas = [];

        // NIVEL 1: Coincidencias EXACTAS
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

        // NIVEL 2: Sin pareja (Rojo)
        debitos.filter(d => !d.emparejado).forEach(d => {
            parejas.push({ 
                d, c: null, diff: d.debito, 
                estado: '❌ Sin pareja (Débito)', 
                color: 'roja',
                tooltip: `Débito huérfano: ${d.debito.toFixed(2)}\nAsiento: ${d.asiento}`
            });
        });

        creditos.filter(c => !c.emparejado).forEach(c => {
            parejas.push({ 
                d: null, c, diff: -c.credito, 
                estado: '❌ Sin pareja (Crédito)', 
                color: 'roja',
                tooltip: `Crédito huérfano: ${c.credito.toFixed(2)}\nAsiento: ${c.asiento}`
            });
        });

        // Ordenar de menor a mayor
        parejas.sort((a, b) => {
            const montoA = Math.max(a.d?.debito || 0, a.c?.credito || 0);
            const montoB = Math.max(b.d?.debito || 0, b.c?.credito || 0);
            return montoA - montoB;
        });

        return parejas;
    }

    // 3. RENDERIZAR RESULTADOS
    function renderizarResultados(movimientos, parejas) {
        resultadosDiv.style.display = 'block';
        
        const totalDebitos = movimientos.reduce((sum, m) => sum + m.debito, 0);
        const totalCreditos = movimientos.reduce((sum, m) => sum + m.credito, 0);
        const diferencia = totalDebitos - totalCreditos;

        document.getElementById('lblDebitos').textContent = totalDebitos.toLocaleString('en-US', {minimumFractionDigits: 2});
        document.getElementById('lblCreditos').textContent = totalCreditos.toLocaleString('en-US', {minimumFractionDigits: 2});
        document.getElementById('lblDiferencia').textContent = diferencia.toLocaleString('en-US', {minimumFractionDigits: 2});
        document.getElementById('lblTotalParejas').textContent = parejas.length;

        // Color de la tarjeta de diferencia
        const cardDif = document.getElementById('cardDiferencia');
        cardDif.className = `card text-white card-shadow text-center py-3 ${Math.abs(diferencia) < 0.01 ? 'bg-success' : 'bg-danger'}`;

        // Generar filas
        tbodyParejas.innerHTML = '';
        parejas.forEach(p => {
            const tr = document.createElement('tr');
            tr.className = `fila-${p.color}`;
            
            const fmtDebito = p.d ? p.d.debito.toLocaleString('en-US', {minimumFractionDigits: 2}) : '0.00';
            const fmtCredito = p.c ? p.c.credito.toLocaleString('en-US', {minimumFractionDigits: 2}) : '0.00';
            const fmtDiff = p.diff.toLocaleString('en-US', {minimumFractionDigits: 2});

            tr.innerHTML = `
                <td>${p.d ? p.d.fecha : '-'}</td>
                <td>${p.d ? p.d.asiento : '-'}</td>
                <td><small>${p.d ? p.d.descripcion.substring(0, 50) : '-'}</small></td>
                <td class="text-end monto-debito">${fmtDebito}</td>
                <td class="text-end">${fmtDiff}</td>
                <td class="text-end monto-credito">${fmtCredito}</td>
                <td><small>${p.c ? p.c.descripcion.substring(0, 50) : '-'}</small></td>
                <td>${p.c ? p.c.asiento : '-'}</td>
                <td>${p.c ? p.c.fecha : '-'}</td>
                <td class="text-center">
                    <span class="badge ${p.color === 'verde' ? 'bg-success' : 'bg-danger'}" 
                          title="${p.tooltip}">
                        ${p.estado}
                    </span>
                </td>
            `;
            tbodyParejas.appendChild(tr);
        });

        // Mensaje
        const errores = parejas.filter(p => p.color === 'roja').length;
        if (errores === 0) {
            mostrarAlerta(`✅ ¡CUENTA CUADRADA! Todos los débitos tienen su pareja.`, 'success');
        } else {
            mostrarAlerta(`❌ HAY DESCUADRES. ${errores} líneas sin conciliar.`, 'danger');
        }
    }

    function mostrarAlerta(mensaje, tipo) {
        alertContainer.innerHTML = `<div class="alert alert-${tipo} alert-dismissible fade show" role="alert">
            ${mensaje}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>`;
    }
});
