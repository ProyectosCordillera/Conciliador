// js/app.js - Lógica del Analizador de Cuenta Puente (Versión Robusta)

document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.getElementById('fileInput');
    const btnAnalizar = document.getElementById('btnAnalizar');
    const btnLimpiar = document.getElementById('btnLimpiar');
    const alertContainer = document.getElementById('alertContainer');
    const resultadosDiv = document.getElementById('resultados');
    const tbodyParejas = document.getElementById('tbodyParejas');

    const lblEmpresa = document.getElementById('lblEmpresa');
    const lblCuenta = document.getElementById('lblCuenta');
    const footerEmpresa = document.getElementById('footerEmpresa');
    const footerCuenta = document.getElementById('footerCuenta');

    const lblDebitos = document.getElementById('lblDebitos');
    const lblCreditos = document.getElementById('lblCreditos');
    const lblDiferencia = document.getElementById('lblDiferencia');
    const lblTotalParejas = document.getElementById('lblTotalParejas');
    const cardDiferencia = document.getElementById('cardDiferencia');

    fileInput.addEventListener('change', () => {
        btnAnalizar.disabled = !fileInput.files.length;
    });

    btnAnalizar.addEventListener('click', () => {
        const file = fileInput.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const texto = e.target.result;
                
                extraerInfoEmpresa(texto);
                const movimientos = parsearArchivoRobusto(texto);
                
                if (movimientos.length === 0) {
                    mostrarAlerta('⚠️ No se encontraron movimientos válidos. Verifica el formato del archivo.', 'warning');
                    return;
                }

                const parejas = emparejarDebitosCreditos(movimientos);
                renderizarResultados(movimientos, parejas);
                
                btnLimpiar.style.display = 'block';
            } catch (error) {
                console.error(error);
                mostrarAlerta(`❌ Error al procesar: ${error.message}`, 'danger');
            }
        };
        reader.readAsText(file);
    });

    btnLimpiar.addEventListener('click', () => {
        fileInput.value = '';
        resultadosDiv.style.display = 'none';
        tbodyParejas.innerHTML = '';
        alertContainer.innerHTML = '';
        lblDebitos.textContent = '0.00';
        lblCreditos.textContent = '0.00';
        lblDiferencia.textContent = '0.00';
        lblTotalParejas.textContent = '0';
        cardDiferencia.className = 'card text-white bg-secondary card-shadow text-center py-3';
        btnAnalizar.disabled = true;
        btnLimpiar.style.display = 'none';
        
        lblEmpresa.textContent = 'Sin archivo cargado';
        lblCuenta.textContent = 'Cuenta: -';
        footerEmpresa.textContent = 'Esperando archivo...';
        footerCuenta.textContent = '-';
    });

    function extraerInfoEmpresa(texto) {
        // Buscar número de cuenta
        const matchCuenta = texto.match(/(\d{2}-\d{2}-\d{2}-\d{2}-\d{2})/);
        if (matchCuenta) {
            const cuenta = matchCuenta[1];
            footerCuenta.textContent = cuenta;
            lblCuenta.textContent = `Cuenta: ${cuenta}`;
        }

        // Buscar nombre de empresa
        if (texto.includes('URUKA')) {
            lblEmpresa.textContent = 'Uruka Point';
            footerEmpresa.textContent = 'Uruka Point';
        } else if (texto.includes('ALTAMIRA')) {
            lblEmpresa.textContent = 'Condominio Altamira';
            footerEmpresa.textContent = 'Condominio Altamira';
        } else if (texto.includes('TORRE AZUR')) {
            lblEmpresa.textContent = 'Torre Azur';
            footerEmpresa.textContent = 'Torre Azur';
        }
    }

    function parsearArchivoRobusto(texto) {
        const lineas = texto.split(/\r?\n/);
        const movimientos = [];

        lineas.forEach((linea, index) => {
            if (!linea.trim()) return;

            // Ignorar líneas de encabezado
            if (linea.includes('Cuenta Contable') || 
                linea.includes('Total Saldo Anterior') ||
                linea.includes('Total Acumulado') ||
                linea.includes('Impreso el:') ||
                linea.includes('Usuario:') ||
                linea.includes('Reporte:') ||
                linea.includes('Página:')) {
                return;
            }

            // Intentar extraer fecha del inicio de la línea
            const matchFecha = linea.match(/^(\d{2}-\d{2}-\d{4})/);
            if (!matchFecha) return;

            const fecha = matchFecha[1];

            // Intentar extraer asiento (número después de la fecha)
            const matchAsiento = linea.match(/^\d{2}-\d{2}-\d{4}\s+(\d+)/);
            const asiento = matchAsiento ? matchAsiento[1] : '';

            // Extraer descripción (todo entre el asiento y los números)
            const matchDesc = linea.match(/^\d{2}-\d{2}-\d{4}\s+\d+\s+(.+?)(?=\s+[\d,]+\.\d{2})/);
            const descripcion = matchDesc ? matchDesc[1].trim() : '';

            // Extraer todos los números con formato de moneda
            const numeros = linea.match(/[\d,]+\.\d{2}/g);
            if (!numeros || numeros.length < 2) return;

            // Los últimos 2 números son débito y crédito (o saldo)
            // Necesitamos identificar cuál es débito y cuál es crédito
            let debito = 0;
            let credito = 0;

            // Buscar el patrón: descripción, luego débito (puede estar vacío), luego crédito
            const matchMontos = linea.match(/(?:^|\t)([\d,]*\.\d{2})\t([\d,]*\.\d{2})/);
            
            if (matchMontos) {
                debito = parseFloat(matchMontos[1].replace(/,/g, '')) || 0;
                credito = parseFloat(matchMontos[2].replace(/,/g, '')) || 0;
            } else {
                // Si no hay tabs, buscar el patrón con espacios
                const matchMontosEspacios = linea.match(/\s+([\d,]*\.\d{2})\s+([\d,]*\.\d{2})/);
                if (matchMontosEspacios) {
                    debito = parseFloat(matchMontosEspacios[1].replace(/,/g, '')) || 0;
                    credito = parseFloat(matchMontosEspacios[2].replace(/,/g, '')) || 0;
                }
            }

            if (debito > 0 || credito > 0) {
                movimientos.push({
                    lineaOriginal: index + 1,
                    fecha,
                    asiento,
                    descripcion,
                    debito,
                    credito
                });
            }
        });

        return movimientos;
    }

    function emparejarDebitosCreditos(movimientos) {
        let debitos = movimientos.filter(m => m.debito > 0).map(m => ({...m, emparejado: false}));
        let creditos = movimientos.filter(m => m.credito > 0).map(m => ({...m, emparejado: false}));
        let parejas = [];

        debitos.forEach(d => {
            if (d.emparejado) return;
            const c = creditos.find(c => !c.emparejado && c.credito === d.debito);
            if (c) {
                parejas.push({ d, c, diff: 0, estado: '✅ Conciliado', color: 'verde' });
                d.emparejado = true;
                c.emparejado = true;
            }
        });

        debitos.filter(d => !d.emparejado).forEach(d => {
            parejas.push({ d, c: null, diff: d.debito, estado: '❌ Sin pareja (Débito)', color: 'roja' });
        });

        creditos.filter(c => !c.emparejado).forEach(c => {
            parejas.push({ d: null, c, diff: -c.credito, estado: '❌ Sin pareja (Crédito)', color: 'roja' });
        });

        parejas.sort((a, b) => {
            const montoA = Math.max(a.d?.debito || 0, a.c?.credito || 0);
            const montoB = Math.max(b.d?.debito || 0, b.c?.credito || 0);
            return montoA - montoB;
        });

        return parejas;
    }

    function renderizarResultados(movimientos, parejas) {
        resultadosDiv.style.display = 'block';
        
        const totalDebitos = movimientos.reduce((sum, m) => sum + m.debito, 0);
        const totalCreditos = movimientos.reduce((sum, m) => sum + m.credito, 0);
        const diferencia = totalDebitos - totalCreditos;

        lblDebitos.textContent = totalDebitos.toLocaleString('en-US', {minimumFractionDigits: 2});
        lblCreditos.textContent = totalCreditos.toLocaleString('en-US', {minimumFractionDigits: 2});
        lblDiferencia.textContent = diferencia.toLocaleString('en-US', {minimumFractionDigits: 2});
        lblTotalParejas.textContent = parejas.length;

        cardDiferencia.className = `card text-white card-shadow text-center py-3 ${Math.abs(diferencia) < 0.01 ? 'bg-success' : 'bg-danger'}`;

        tbodyParejas.innerHTML = '';
        parejas.forEach(p => {
            const tr = document.createElement('tr');
            tr.className = `fila-${p.color}`;
            
            const fmtDebito = p.d ? p.d.debito.toLocaleString('en-US', {minimumFractionDigits: 2}) : '0.00';
            const fmtCredito = p.c ? p.c.credito.toLocaleString('en-US', {minimumFractionDigits: 2}) : '0.00';
            const fmtDiff = p.diff.toLocaleString('en-US', {minimumFractionDigits: 2});

            tr.innerHTML = `
                <td>${p.d ? p.d.fecha : '-'}</td>
                <td><strong>${p.d ? p.d.asiento : '-'}</strong></td>
                <td><small>${p.d ? p.d.descripcion : '-'}</small></td>
                <td class="text-end">${fmtDebito}</td>
                <td class="text-end"><strong>${fmtDiff}</strong></td>
                <td class="text-end">${fmtCredito}</td>
                <td><small>${p.c ? p.c.descripcion : '-'}</small></td>
                <td><strong>${p.c ? p.c.asiento : '-'}</strong></td>
                <td>${p.c ? p.c.fecha : '-'}</td>
                <td class="text-center">
                    <span class="badge ${p.color === 'verde' ? 'bg-success' : 'bg-danger'}">
                        ${p.estado}
                    </span>
                </td>
            `;
            tbodyParejas.appendChild(tr);
        });

        const errores = parejas.filter(p => p.color === 'roja').length;
        if (errores === 0) {
            mostrarAlerta(`✅ ¡CUENTA CUADRADA! Todas las ${parejas.length} parejas están conciliadas.`, 'success');
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
