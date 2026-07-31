document.addEventListener('DOMContentLoaded', function() {
    let itensFinanceiros = [];
    let charts = {};
    let itemEmEdicaoId = null;
    
    // URL base do seu servidor Node.js
    const API_URL = 'http://localhost:3000/api/transacoes';
    
    // Estado do mês e ano selecionados
    let mesSelecionado = new Date().getMonth() + 1;
    let anoSelecionado = new Date().getFullYear();

    const formatarMoeda = (valor) => {
        return parseFloat(valor || 0).toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        });
    };

    const formatarData = (data) => {
        if (!data) return '-';
        return new Date(data).toLocaleDateString('pt-BR');
    };

    const formatarStatus = (item) => {
        if (item.tipo === 'entrada') return item.concluido ? 'Recebido' : 'Aguardando';
        return item.concluido ? 'Pago' : 'Pendente';
    };

    // Função auxiliar para obter os parâmetros de mês/ano
    const getParamsMesAno = () => `?mes=${mesSelecionado}&ano=${anoSelecionado}`;

    // Função para inicializar o seletor de mês com opções dinâmicas
    const inicializarSeletorMes = () => {
        const meses = ['JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO', 
                       'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'];
        const selectores = document.querySelectorAll('.select-mes-estilizado');
        const monthInputs = document.querySelectorAll('.select-month-input');
        
        selectores.forEach(select => {
            select.innerHTML = '';
            for (let i = 1; i <= 12; i++) {
                for (let ano = anoSelecionado - 2; ano <= anoSelecionado + 2; ano++) {
                    const option = document.createElement('option');
                    option.value = `${i}-${ano}`;
                    option.textContent = `${meses[i - 1]} / ${ano}`;
                    if (i === mesSelecionado && ano === anoSelecionado) {
                        option.selected = true;
                    }
                    select.appendChild(option);
                }
            }
        });

        // Sincroniza input[type=month] com o estado atual
        monthInputs.forEach(inp => {
            inp.value = `${anoSelecionado}-${String(mesSelecionado).padStart(2, '0')}`;
        });
        
        // Adicionar event listeners aos seletores
        selectores.forEach(select => {
            select.addEventListener('change', (e) => {
                const [mes, ano] = e.target.value.split('-');
                mesSelecionado = parseInt(mes);
                anoSelecionado = parseInt(ano);
                
                // Atualizar todos os seletores e month inputs
                selectores.forEach(s => s.value = `${mesSelecionado}-${anoSelecionado}`);
                monthInputs.forEach(inp => inp.value = `${anoSelecionado}-${String(mesSelecionado).padStart(2, '0')}`);
                
                // Recarregar dados
                carregarTransacoes();
                atualizarDashboard();
                atualizarRelatorios();
                atualizarVisaoMensal();
                atualizarVisaoDoDia();
                atualizarComparativo();
                atualizarGraficosSecundarios();
                atualizarGraficoPrincipal();
            });
        });

        // Adicionar event listeners aos inputs month (mais amigável em mobile)
        monthInputs.forEach(inp => {
            inp.addEventListener('change', (e) => {
                // formato YYYY-MM
                const parts = e.target.value.split('-');
                if (parts.length !== 2) return;
                const ano = parseInt(parts[0]);
                const mes = parseInt(parts[1]);
                if (isNaN(ano) || isNaN(mes)) return;
                anoSelecionado = ano;
                mesSelecionado = mes;

                // Atualizar selects
                selectores.forEach(s => s.value = `${mesSelecionado}-${anoSelecionado}`);

                // Recarregar dados
                carregarTransacoes();
                atualizarDashboard();
                atualizarRelatorios();
                atualizarVisaoMensal();
                atualizarVisaoDoDia();
                atualizarComparativo();
                atualizarGraficosSecundarios();
                atualizarGraficoPrincipal();
            });
        });
    };

    // --- NAVEGAÇÃO ---
    const links = document.querySelectorAll('.menu-link');
    const sections = document.querySelectorAll('.tab-content');

    links.forEach(link => {
        link.addEventListener('click', () => {
            const target = link.dataset.target;
            links.forEach(l => l.classList.remove('active'));
            sections.forEach(s => s.classList.remove('active'));
            link.classList.add('active');
            document.getElementById(target).classList.add('active');
            if (target === 'aba-relatorios') {
            atualizarRelatorios();
            }
            setTimeout(() => { Object.values(charts).forEach(c => c.resize()); }, 50);
        });
    });

    async function atualizarDashboard() {
        try {
            const resposta = await fetch(`http://localhost:3000/api/resumo${getParamsMesAno()}`);
            const dados = await resposta.json();

            // 1. Despesas Totais
            document.querySelector('.card.red h2').innerText = formatarMoeda(dados.total_despesas || 0);
            
            // 2. Entradas Totais
            document.querySelector('.card.green h2').innerText = formatarMoeda(dados.total_entradas || 0);
            
            // 3. Saldo Disponível
            document.querySelector('.card.white:nth-of-type(3) h2').innerText = formatarMoeda(dados.saldo_disponivel || 0);
            
            // 4. Lucro Total
            document.querySelector('.card.white:nth-of-type(4) h2').innerText = formatarMoeda(dados.lucro_total || 0);
            
            const cardsGray = document.querySelectorAll('.card.gray h2');
            if (cardsGray.length >= 2) {
                cardsGray[0].innerText = formatarMoeda(dados.contas_a_pagar || 0);
                cardsGray[1].innerText = formatarMoeda(dados.contas_pagas || 0);
            }

        } catch (erro) {
            console.error("Erro ao atualizar dashboard:", erro);
        }
    }

    async function atualizarRelatorios() {
        try {
            const resposta = await fetch(`http://localhost:3000/api/resumo${getParamsMesAno()}`);
            const dados = await resposta.json();

            // 1. Despesas (Primeira coluna)
            const colDespesas = document.querySelectorAll('.col-relatorio:nth-child(1) .card-relatorio h2');
            colDespesas[0].innerText = formatarMoeda(dados.despesa_fixa || 0);
            colDespesas[1].innerText = formatarMoeda(dados.despesa_variavel || 0);
            colDespesas[2].innerText = formatarMoeda(dados.total_despesas || 0);

            // 2. Entradas (Segunda coluna)
            const colEntradas = document.querySelectorAll('.col-relatorio:nth-child(2) .card-relatorio h2');
            colEntradas[0].innerText = formatarMoeda(dados.entrada_fixa || 0);
            colEntradas[1].innerText = formatarMoeda(dados.entrada_variavel || 0);
            colEntradas[2].innerText = formatarMoeda(dados.total_entradas || 0);

            // 3. Resumo (Terceira coluna)
            const colResumo = document.querySelectorAll('.col-relatorio:nth-child(3) .card-relatorio-destaque h2');
            colResumo[0].innerText = formatarMoeda((dados.total_entradas || 0) - (dados.total_despesas || 0));
            colResumo[1].innerText = formatarMoeda(Math.max(0, (dados.total_entradas || 0) - (dados.total_despesas || 0)));
            
        } catch (erro) { 
            console.error("Erro ao atualizar relatórios:", erro); 
        }
    }

    // --- COMUNICAÇÃO COM O BANCO DE DADOS (API) ---
    async function carregarTransacoes() {
        try {
            const resposta = await fetch(`${API_URL}${getParamsMesAno()}`);
            const dadosBanco = await resposta.json();
            
            itensFinanceiros = dadosBanco.map(item => ({
                id: item.id,
                nome: item.nome,
                desc: item.descricao,
                valor: item.valor,
                tipo: item.tipo,
                cat: item.categoria,
                concluido: item.concluido === 1 || item.concluido === true,
                dataVencimento: item.data_vencimento,
                dataPagamento: item.data_pagamento,
                dataGanho: item.data_ganho,
                recorrencia: item.recorrencia,
                dataCriacao: item.data_criacao
            }));
            
            renderizarLista();
            await atualizarDashboard();
            await atualizarRelatorios();
            await atualizarVisaoMensal();
            await atualizarVisaoDoDia();
            await atualizarComparativo();
            await atualizarGraficosSecundarios();
            await atualizarGraficoPrincipal();
        } catch (erro) {
            console.error("Erro ao carregar os dados do banco:", erro);
        }
    }

    // --- MODAL LÓGICA E INTEGRAÇÃO ---
    const modal = document.getElementById('modal-formulario');
    const btnSalvar = document.getElementById('btn-salvar');
    const listaItens = document.getElementById('lista-itens');
    const listaVazia = document.getElementById('lista-vazia');

    document.getElementById('btn-abrir-modal').onclick = () => {
        itemEmEdicaoId = null;
        limparCampos();
        modal.style.display = 'flex';
    };

    document.getElementById('btn-cancelar').onclick = () => modal.style.display = 'none';

    btnSalvar.onclick = async () => {
        const valor = document.getElementById('form-valor').value;
        const nome = document.getElementById('form-nome').value;
        const desc = document.getElementById('form-descricao').value;
        const tipo = document.getElementById('form-tipo').value;
        const cat = document.getElementById('form-categoria').value;
        const dataVencimento = document.getElementById('form-data-vencimento').value;
        const dataPagamento = document.getElementById('form-data-pagamento').value;
        const dataGanho = document.getElementById('form-data-ganho').value;
        const recorrencia = document.getElementById('form-recorrencia').value;

        if (!valor || !nome) return alert("Preencha Nome e Valor!");

        const transacao = {
            nome,
            desc,
            valor: parseFloat(valor),
            tipo,
            cat,
            dataVencimento: dataVencimento || null,
            dataPagamento: dataPagamento || null,
            dataGanho: dataGanho || null,
            recorrencia: recorrencia || null
        };

        try {
            if (itemEmEdicaoId) {
                const itemAtual = itensFinanceiros.find(i => i.id === itemEmEdicaoId);
                await fetch(`${API_URL}/${itemEmEdicaoId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ...transacao, concluido: itemAtual.concluido })
                });
            } else {
                await fetch(API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(transacao)
                });
            }

            modal.style.display = 'none';
            carregarTransacoes();
        } catch (erro) {
            console.error("Erro ao salvar a transação:", erro);
            alert("Não foi possível salvar no banco de dados.");
        }
    };

    // --- RENDERIZAÇÃO ---
    function renderizarLista() {
        listaItens.innerHTML = '';
        listaVazia.style.display = itensFinanceiros.length === 0 ? 'flex' : 'none';

        itensFinanceiros.forEach(item => {
            const divLinha = document.createElement('div');
            divLinha.className = `item-linha ${item.tipo} ${item.concluido ? 'concluido' : ''}`;
            
            divLinha.innerHTML = `
                <div class="check-container">
                    <input type="checkbox" ${item.concluido ? 'checked' : ''} onchange="toggleConcluir(${item.id})">
                </div>
                
                <div class="item-card">
                    <div class="item-info">
                        <h4>${item.nome.toUpperCase()}</h4>
                        <p>${item.desc || 'Sem descrição'}</p>
                        <div class="item-meta">
                            <span>${item.cat.toUpperCase()}</span>
                            <span>${formatarStatus(item)}</span>
                            <span>${item.recorrencia || '-'}</span>
                        </div>
                        <div class="item-datas">
                            <small>Venc.: ${formatarData(item.dataVencimento)}</small>
                            <small>Pag.: ${formatarData(item.dataPagamento)}</small>
                            <small>Ganho: ${formatarData(item.dataGanho)}</small>
                        </div>
                    </div>
                    <div class="item-valor">
                        ${formatarMoeda(item.valor)}
                    </div>
                </div>

                <div class="item-options-trigger" onclick="toggleMenu(event, ${item.id})">
                    ⋮
                    <div id="menu-${item.id}" class="options-menu">
                        <button onclick="abrirEdicao(${item.id})">Modificar</button>
                        <button onclick="excluirItem(${item.id})">Excluir</button>
                    </div>
                </div>
            `;
            listaItens.appendChild(divLinha);
        });
    }

    // --- FUNÇÕES GLOBAIS COM FETCH ---
    window.toggleConcluir = async (id) => {
        const item = itensFinanceiros.find(i => i.id === id);
        try {
            // Atualiza apenas enviando o status invertido
            await fetch(`${API_URL}/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...item, concluido: !item.concluido })
            });
            carregarTransacoes();
        } catch (erro) {
            console.error("Erro ao alterar status:", erro);
        }
    };

    window.excluirItem = async (id) => {
        if(confirm("Tem certeza que deseja excluir este registro?")) {
            try {
                // Dispara o DELETE para o servidor Node
                await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
                carregarTransacoes();
            } catch (erro) {
                console.error("Erro ao excluir do banco:", erro);
            }
        }
    };

    window.exportarExcel = () => {
        const url = `http://localhost:3000/api/export/excel${getParamsMesAno()}`;
        window.location.href = url;
    };

    window.exportarCsv = () => {
        const url = `http://localhost:3000/api/export/csv${getParamsMesAno()}`;
        window.location.href = url;
    };

    window.exportarPdf = () => {
        const url = `http://localhost:3000/api/export/pdf${getParamsMesAno()}`;
        window.location.href = url;
    };

    window.exportarPng = () => {
        const canvas = document.getElementById('lucroChartPrincipal');
        if (!canvas) return alert('Gráfico principal não encontrado.');

        const link = document.createElement('a');
        link.href = canvas.toDataURL('image/png');
        link.download = `relatorio_${mesSelecionado}_${anoSelecionado}.png`;
        link.click();
    };

    async function atualizarVisaoMensal() {
        try {
            const resposta = await fetch(`http://localhost:3000/api/transacoes${getParamsMesAno()}`);
            const transacoes = await resposta.json();
            const despesas = transacoes.filter(t => t.tipo === 'despesa');
            const maiorDespesa = despesas.reduce((max, t) => t.valor > max ? t.valor : max, 0);
            const totalEntradas = transacoes.filter(t => t.tipo === 'entrada').reduce((sum, t) => sum + t.valor, 0);
            const totalDespesas = despesas.reduce((sum, t) => sum + t.valor, 0);
            const saldoMensal = totalEntradas - totalDespesas;
            const projecao = saldoMensal + (saldoMensal * 0.1);

            document.getElementById('maior-despesa').innerText = formatarMoeda(maiorDespesa);
            document.getElementById('projecao-proximo-mes').innerText = formatarMoeda(projecao);
        } catch (erro) {
            console.error('Erro ao atualizar visão mensal:', erro);
        }
    }

    async function atualizarVisaoDoDia() {
        try {
            const diaSelecionado = document.getElementById('dia-selecionado').value;
            if (!diaSelecionado) return;

            const resposta = await fetch(`http://localhost:3000/api/transacoes${getParamsMesAno()}`);
            const transacoes = await resposta.json();
            const transacoesDoDia = transacoes.filter(t => {
                return t.data_criacao && new Date(t.data_criacao).toISOString().slice(0, 10) === diaSelecionado;
            });

            const saldoDia = transacoesDoDia.reduce((sum, t) => sum + (t.tipo === 'entrada' ? t.valor : -t.valor), 0);
            document.getElementById('saldo-dia').innerText = formatarMoeda(saldoDia);
            document.getElementById('total-dia').innerText = transacoesDoDia.length;

            const listaDia = document.getElementById('lista-dia');
            listaDia.innerHTML = '';
            if (transacoesDoDia.length === 0) {
                listaDia.innerHTML = '<div class="card-relatorio"><p>Nenhum lançamento encontrado para essa data.</p></div>';
                return;
            }

            transacoesDoDia.forEach(item => {
                const card = document.createElement('div');
                card.className = 'card-relatorio';
                card.innerHTML = `
                    <h2>${item.nome}</h2>
                    <p>${formatarStatus(item)} | ${formatarMoeda(item.valor)} | ${item.categoria.toUpperCase()}</p>
                `;
                listaDia.appendChild(card);
            });
        } catch (erro) {
            console.error('Erro ao atualizar visão do dia:', erro);
        }
    }

    async function atualizarGraficoPrincipal() {
        try {
            const resposta = await fetch(`http://localhost:3000/api/transacoes${getParamsMesAno()}`);
            const transacoes = await resposta.json();

            if (!transacoes || transacoes.length === 0) {
                if (charts.principal) {
                    charts.principal.data.labels = [];
                    charts.principal.data.datasets[0].data = [];
                    charts.principal.update();
                }
                return;
            }

            let saldoAcumulado = 0;
            const labels = [];
            const dados = [];

            transacoes.sort((a, b) => new Date(a.data_criacao) - new Date(b.data_criacao));

            transacoes.forEach(t => {
                const valor = parseFloat(t.valor);
                saldoAcumulado += (t.tipo === 'entrada' ? valor : -valor);
                labels.push(new Date(t.data_criacao).toLocaleDateString('pt-BR'));
                dados.push(saldoAcumulado);
            });

            if (charts.principal) {
                charts.principal.data.labels = labels;
                charts.principal.data.datasets[0].data = dados;
                charts.principal.update();
            }
        } catch (erro) {
            console.error("Erro ao atualizar o gráfico:", erro);
        }
    }

    async function atualizarGraficosSecundarios() {
        try {
            const resposta = await fetch(`http://localhost:3000/api/resumo${getParamsMesAno()}`);
            const dados = await resposta.json();

            const despesasPorCategoria = [dados.despesa_fixa || 0, dados.despesa_variavel || 0];
            const entradasPorCategoria = [dados.entrada_fixa || 0, dados.entrada_variavel || 0];
            const saldo = (dados.total_entradas || 0) - (dados.total_despesas || 0);
            const lucro = dados.lucro_total || 0;

            if (charts.despesas) {
                charts.despesas.data.labels = ['Fixa', 'Variável'];
                charts.despesas.data.datasets[0].data = despesasPorCategoria;
                charts.despesas.update();
            }
            if (charts.entradas) {
                charts.entradas.data.labels = ['Fixa', 'Variável'];
                charts.entradas.data.datasets[0].data = entradasPorCategoria;
                charts.entradas.update();
            }
            if (charts.lucro) {
                charts.lucro.data.labels = ['Saldo', 'Lucro'];
                charts.lucro.data.datasets[0].data = [saldo, lucro];
                charts.lucro.update();
            }
            if (charts.saldo) {
                charts.saldo.data.labels = ['Saldo'];
                charts.saldo.data.datasets[0].data = [saldo];
                charts.saldo.update();
            }
        } catch (erro) {
            console.error('Erro ao atualizar gráficos secundários:', erro);
        }
    }

    async function atualizarComparativo() {
        try {
            const resposta = await fetch(`http://localhost:3000/api/resumo/comparativo${getParamsMesAno()}`);
            const dados = await resposta.json();

            document.querySelector('.comparativo-despesas').innerText = `${dados.variacao_percentual.despesas || 0}%`;
            document.querySelector('.comparativo-entradas').innerText = `${dados.variacao_percentual.entradas || 0}%`;
            document.querySelector('.comparativo-saldo').innerText = `${dados.variacao_percentual.saldo || 0}%`;
            document.querySelector('.comparativo-lucro').innerText = `${dados.variacao_percentual.lucro || 0}%`;
        } catch (erro) {
            console.error('Erro ao atualizar comparativo:', erro);
        }
    }

    window.abrirEdicao = (id) => {
        const item = itensFinanceiros.find(i => i.id === id);
        itemEmEdicaoId = id;
        document.getElementById('form-valor').value = item.valor;
        document.getElementById('form-nome').value = item.nome;
        document.getElementById('form-descricao').value = item.desc;
        document.getElementById('form-tipo').value = item.tipo;
        document.getElementById('form-categoria').value = item.cat;
        document.getElementById('form-data-vencimento').value = item.dataVencimento || '';
        document.getElementById('form-data-pagamento').value = item.dataPagamento || '';
        document.getElementById('form-data-ganho').value = item.dataGanho || '';
        document.getElementById('form-recorrencia').value = item.recorrencia || '';
        modal.style.display = 'flex';
    };

    window.toggleMenu = (event, id) => {
        event.stopPropagation();
        document.querySelectorAll('.options-menu').forEach(m => m.style.display = 'none');
        const menu = document.getElementById(`menu-${id}`);
        menu.style.display = 'block';
    };

    const atualizarSaldoInicialUI = () => {
        const saldoInicial = parseFloat(localStorage.getItem('saldoInicial') || 0);
        document.getElementById('valor-saldo-inicial').innerText = formatarMoeda(saldoInicial);
    };

    const abrirModalSaldoInicial = () => {
        document.getElementById('modal-saldo-inicial').style.display = 'flex';
        document.getElementById('form-saldo-inicial').value = localStorage.getItem('saldoInicial') || '';
    };

    const salvarSaldoInicial = () => {
        const valor = parseFloat(document.getElementById('form-saldo-inicial').value);
        if (isNaN(valor)) return alert('Informe um valor válido para o saldo inicial.');
        localStorage.setItem('saldoInicial', valor.toFixed(2));
        atualizarSaldoInicialUI();
        document.getElementById('modal-saldo-inicial').style.display = 'none';
    };

    // Cancela edição do saldo inicial sem salvar
    const cancelarEdicaoSaldoInicial = () => {
        // restaura o valor salvo no localStorage
        document.getElementById('form-saldo-inicial').value = localStorage.getItem('saldoInicial') || '';
        document.getElementById('modal-saldo-inicial').style.display = 'none';
    };

    // Inicializa tooltips simples para .form-row[data-tooltip]
    const initTooltips = () => {
        const tooltip = document.createElement('div');
        tooltip.id = 'ui-tooltip';
        tooltip.style.position = 'fixed';
        tooltip.style.zIndex = 1000;
        tooltip.style.pointerEvents = 'none';
        tooltip.style.display = 'none';
        tooltip.setAttribute('role', 'tooltip');
        document.body.appendChild(tooltip);

        const showTooltip = (text, rect) => {
            tooltip.textContent = text;
            tooltip.style.top = `${Math.max(10, rect.top - 42)}px`;
            tooltip.style.left = `${Math.max(10, rect.left)}px`;
            tooltip.style.display = 'block';
            tooltip.classList.add('show');
        };

        const hideTooltip = () => {
            tooltip.style.display = 'none';
            tooltip.classList.remove('show');
        };

        document.querySelectorAll('.form-row[data-tooltip]').forEach(el => {
            el.addEventListener('mouseenter', () => {
                const text = el.getAttribute('data-tooltip') || el.getAttribute('title') || '';
                if (!text) return;
                const rect = el.getBoundingClientRect();
                showTooltip(text, rect);
            });
            el.addEventListener('mouseleave', hideTooltip);
            el.addEventListener('touchstart', (e) => {
                e.stopPropagation();
                const text = el.getAttribute('data-tooltip') || el.getAttribute('title') || '';
                if (!text) return;
                const rect = el.getBoundingClientRect();
                if (tooltip.style.display === 'block') {
                    hideTooltip();
                } else {
                    showTooltip(text, rect);
                }
            });
        });
        document.addEventListener('click', hideTooltip);
    };

    function limparCampos() {
        document.querySelectorAll('#modal-formulario input').forEach(i => i.value = '');
        document.getElementById('form-tipo').value = 'entrada';
        document.getElementById('form-categoria').value = 'fixa';
        document.getElementById('form-data-vencimento').value = '';
        document.getElementById('form-data-pagamento').value = '';
        document.getElementById('form-data-ganho').value = '';
        document.getElementById('form-recorrencia').value = '';
        itemEmEdicaoId = null;
    }

    window.onclick = () => document.querySelectorAll('.options-menu').forEach(m => m.style.display = 'none');

    // --- GRÁFICOS ---
    const configGrafico = (labels, tipo, cor) => ({
        type: tipo,
        data: {
            labels: labels,
            datasets: [{
                data: [10, 25, 15, 30],
                borderColor: cor,
                backgroundColor: tipo === 'bar' ? cor + '66' : 'transparent',
                borderWidth: 3,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: { border: { color: '#fff' }, grid: { color: 'rgba(255,255,255,0.1)' } },
                x: { border: { color: '#fff' }, grid: { display: false } }
            }
        }
    });

    charts.principal = new Chart(document.getElementById('lucroChartPrincipal'), {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Saldo/Lucro',
                data: [],
                borderColor: '#50fa7b',
                backgroundColor: 'transparent',
                borderWidth: 3,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { grid: { color: 'rgba(255,255,255,0.1)' } },
                x: { grid: { display: false } }
            }
        }
    });
    charts.despesas = new Chart(document.getElementById('chartDespesas'), configGrafico(['Jan','Fev','Mar'], 'bar', '#ff5555'));
    charts.entradas = new Chart(document.getElementById('chartEntradas'), configGrafico(['Jan','Fev','Mar'], 'bar', '#50fa7b'));
    charts.lucro = new Chart(document.getElementById('chartLucro'), configGrafico(['Jan','Fev','Mar'], 'line', '#f1fa8c'));
    charts.saldo = new Chart(document.getElementById('chartSaldo'), configGrafico(['Jan','Fev','Mar'], 'line', '#8be9fd'));

    document.getElementById('btn-editar-saldo').addEventListener('click', abrirModalSaldoInicial);
    document.getElementById('btn-salvar-saldo').addEventListener('click', salvarSaldoInicial);
    // cancelar edição do saldo inicial (novo)
    const btnCancelarSaldo = document.getElementById('btn-cancelar-saldo');
    if (btnCancelarSaldo) btnCancelarSaldo.addEventListener('click', cancelarEdicaoSaldoInicial);
    document.getElementById('btn-filtrar-dia').addEventListener('click', atualizarVisaoDoDia);
    document.getElementById('dia-selecionado').value = new Date().toISOString().slice(0, 10);

    // Inicializa tooltips, seletor de mês e carrega os dados
    initTooltips();
    inicializarSeletorMes();
    atualizarSaldoInicialUI();
    atualizarGraficoPrincipal();
    carregarTransacoes();
    atualizarVisaoDoDia();
});