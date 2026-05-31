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
        return parseFloat(valor).toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        });
    };

    // Função auxiliar para obter os parâmetros de mês/ano
    const getParamsMesAno = () => `?mes=${mesSelecionado}&ano=${anoSelecionado}`;

    // Função para inicializar o seletor de mês com opções dinâmicas
    const inicializarSeletorMes = () => {
        const meses = ['JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO', 
                       'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'];
        const selectores = document.querySelectorAll('.select-mes-estilizado');
        
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
        
        // Adicionar event listeners aos seletores
        selectores.forEach(select => {
            select.addEventListener('change', (e) => {
                const [mes, ano] = e.target.value.split('-');
                mesSelecionado = parseInt(mes);
                anoSelecionado = parseInt(ano);
                
                // Atualizar todos os seletores
                selectores.forEach(s => s.value = `${mesSelecionado}-${anoSelecionado}`);
                
                // Recarregar dados
                carregarTransacoes();
                atualizarDashboard();
                atualizarRelatorios();
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
            
            // Mapeia os dados das colunas do MySQL
            itensFinanceiros = dadosBanco.map(item => ({
                id: item.id,
                nome: item.nome,
                desc: item.descricao,
                valor: item.valor,
                tipo: item.tipo,
                cat: item.categoria,
                concluido: item.concluido === 1 || item.concluido === true 
            }));
            
            renderizarLista();
            // Atualiza o dashboard apenas após carregar a lista
            await atualizarDashboard(); 
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

        if(!valor || !nome) return alert("Preencha Nome e Valor!");

        const transacao = { nome, desc, valor, tipo, cat };

        try {
            if (itemEmEdicaoId) {
                // Modo Edição: Faz um PUT para atualizar no banco
                const itemAtual = itensFinanceiros.find(i => i.id === itemEmEdicaoId);
                await fetch(`${API_URL}/${itemEmEdicaoId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ...transacao, concluido: itemAtual.concluido })
                });
            } else {
                // Modo Novo: Faz um POST para inserir no banco
                await fetch(API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(transacao)
                });
            }

            modal.style.display = 'none';
            carregarTransacoes(); // Recarrega os dados fresquinhos do banco
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

    async function atualizarGraficoPrincipal() {
        try {
            const resposta = await fetch(`http://localhost:3000/api/transacoes${getParamsMesAno()}`);
            const transacoes = await resposta.json();

            // Se não houver transações, não faz nada para evitar erro de renderização
            if (!transacoes || transacoes.length === 0) return;

            // Criando um saldo acumulado (para a linha ter continuidade)
            let saldoAcumulado = 0;
            const labels = [];
            const dados = [];

            // Ordenar por data caso venham desordenadas
            transacoes.sort((a, b) => new Date(a.data_criacao) - new Date(b.data_criacao));

            transacoes.forEach(t => {
                const valor = parseFloat(t.valor);
                saldoAcumulado += (t.tipo === 'entrada' ? valor : -valor);
                
                labels.push(new Date(t.data_criacao).toLocaleDateString('pt-BR'));
                dados.push(saldoAcumulado);
            });

            // Atualizando o gráfico
            if (charts.principal) {
                charts.principal.data.labels = labels;
                charts.principal.data.datasets[0].data = dados;
                charts.principal.update();
            }
        } catch (erro) {
            console.error("Erro ao atualizar o gráfico:", erro);
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
        modal.style.display = 'flex';
    };

    window.toggleMenu = (event, id) => {
        event.stopPropagation();
        document.querySelectorAll('.options-menu').forEach(m => m.style.display = 'none');
        const menu = document.getElementById(`menu-${id}`);
        menu.style.display = 'block';
    };

    function limparCampos() {
        document.querySelectorAll('#modal-formulario input').forEach(i => i.value = '');
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

    // Inicializa o seletor de mês e carrega os dados
    inicializarSeletorMes();
    atualizarGraficoPrincipal();
    carregarTransacoes();
});