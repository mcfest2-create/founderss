document.addEventListener('DOMContentLoaded', () => {
    try {

    /* ==========================================================================
       DATA SEEDING & LOCAL STORAGE
       ========================================================================== */

    // Check and seed default data if not present
    if (!localStorage.getItem('founders_leads')) {
        seedInitialLeadsData();
    }
    if (!localStorage.getItem('founders_clients')) {
        seedInitialClientsData();
    }

    // Load state from localStorage safely with try-catch blocks
    let leads = [];
    try { leads = JSON.parse(localStorage.getItem('founders_leads')) || []; } catch(e) { leads = []; }
    let lists = [];
    try { lists = JSON.parse(localStorage.getItem('founders_lists')) || []; } catch(e) { lists = []; }
    let activeListName = localStorage.getItem('founders_active_list') || 'Dentista Feira';
    let scripts = [];
    try { scripts = JSON.parse(localStorage.getItem('founders_scripts')) || getDefaultScripts(); } catch(e) { scripts = getDefaultScripts(); }
    let counterValue = parseInt(localStorage.getItem('founders_counter_val')) || 0;
    let counterGoal = parseInt(localStorage.getItem('founders_counter_goal')) || 20;
    let demandsMeta = parseInt(localStorage.getItem('founders_demands_meta')) || 100;
    let playerRoutines = [];
    try { playerRoutines = JSON.parse(localStorage.getItem('founders_player_routines')) || getDefaultPlayerRoutines(); } catch(e) { playerRoutines = getDefaultPlayerRoutines(); }
    let calendarEvents = [];
    try { calendarEvents = JSON.parse(localStorage.getItem('founders_calendar_events')) || getDefaultCalendarEvents(); } catch(e) { calendarEvents = getDefaultCalendarEvents(); }
    let promptsList = [];
    try { promptsList = JSON.parse(localStorage.getItem('founders_prompts_list')) || getDefaultPrompts(); } catch(e) { promptsList = getDefaultPrompts(); }
    let clients = [];
    try { clients = JSON.parse(localStorage.getItem('founders_clients')) || []; } catch(e) { clients = []; }
    let customTransactions = [];
    try { customTransactions = JSON.parse(localStorage.getItem('founders_custom_transactions')) || []; } catch(e) { customTransactions = []; }

    let dismissedAlerts = [];
    try { dismissedAlerts = JSON.parse(localStorage.getItem('founders_dismissed_alerts')) || []; } catch(e) { dismissedAlerts = []; }
    let selectedPostMediaFiles = [];
    let selectedAppMediaFiles = [];
    let selectedProdMediaFiles = [];

    let supabase = null;

    // Supabase Sync Helpers
    async function syncClientToSupabase(client) {
        if (!supabase) return;
        try {
            await supabase.from('clients').upsert({
                id: client.id,
                name: client.name || '',
                email: client.email || '',
                password: client.password || '',
                value: parseFloat(client.value) || 0,
                payday: parseInt(client.payday) || 10,
                duration: parseInt(client.duration) || 12,
                start_date: client.startDate || '',
                photo: client.photo || '',
                status: client.status || 'active',
                payment_status: client.paymentStatus || 'Pendente',
                demands: client.demands || [],
                posts: client.posts || [],
                approvals: client.approvals || [],
                campaigns: client.campaigns || [],
                reach: parseInt(client.reach) || 0,
                leads_count: parseInt(client.leadsCount) || 0,
                instagram_connected: !!client.instagramConnected,
                instagram_username: client.instagramUsername || '',
                instagram_followers: parseInt(client.instagramFollowers) || 0,
                instagram_reach: parseInt(client.instagramReach) || 0,
                instagram_engagement: parseFloat(client.instagramEngagement) || 0.0,
                instagram_visits: parseInt(client.instagramVisits) || 0,
                instagram_chart_points: client.instagramChartPoints || '',
                library_files: client.libraryFiles || []
            });
        } catch (err) {
            console.error("Erro ao sincronizar cliente com Supabase:", err);
        }
    }

    async function syncLeadToSupabase(lead) {
        if (!supabase) return;
        try {
            await supabase.from('leads').upsert({
                id: lead.id,
                name: lead.name || '',
                email: lead.email || '',
                phone: lead.phone || '',
                list_name: lead.listName || '',
                status: lead.status || 'Prospecção',
                score: parseInt(lead.score) || 0,
                city: lead.city || '',
                comments: lead.comments || '',
                nicho: lead.nicho || '—',
                follow_up: lead.followUp || '—'
            });
        } catch (err) {
            console.error("Erro ao sincronizar lead com Supabase:", err);
        }
    }

    async function syncOperationalContentToSupabase(content) {
        if (!supabase) return;
        try {
            await supabase.from('operational_contents').upsert({
                id: content.id,
                client_id: content.clientId || null,
                title: content.title || '',
                type: content.type || '',
                network: content.network || '',
                date: content.date || '',
                status: content.status || '',
                body: content.body || '',
                caption: content.caption || '',
                thumbnail: content.thumbnail || '',
                media_files: content.mediaFiles || [],
                logs: content.logs || []
            });
        } catch (err) {
            console.error("Erro ao sincronizar conteúdo operacional com Supabase:", err);
        }
    }

    async function syncCalendarEventToSupabase(event) {
        if (!supabase) return;
        try {
            await supabase.from('calendar_events').upsert({
                id: event.id,
                title: event.title || '',
                date: event.date || '',
                time: event.time || '',
                desc: event.desc || '',
                category: event.category || 'reuniao'
            });
        } catch (err) {
            console.error("Erro ao sincronizar evento de calendário com Supabase:", err);
        }
    }

    async function syncTransactionToSupabase(transaction) {
        if (!supabase) return;
        try {
            await supabase.from('custom_transactions').upsert({
                id: transaction.id,
                type: transaction.type || '',
                amount: parseFloat(transaction.value) || 0,
                date: transaction.date || '',
                description: transaction.description || '',
                category: transaction.category || '',
                client_id: transaction.clientId || null
            });
        } catch (err) {
            console.error("Erro ao sincronizar transação com Supabase:", err);
        }
    }

    async function syncPlayerRoutineToSupabase(routine) {
        if (!supabase) return;
        try {
            await supabase.from('player_routines').upsert({
                id: routine.id,
                name: routine.name || '',
                role: routine.role || '',
                photo: routine.photo || '',
                tasks: routine.tasks || []
            });
        } catch (err) {
            console.error("Erro ao sincronizar rotina de equipe com Supabase:", err);
        }
    }

    async function loadDataFromSupabase() {
        if (!supabase) return;
        try {
            // Load clients
            const { data: dbClients, error: clientsErr } = await supabase.from('clients').select('*');
            if (!clientsErr && dbClients) {
                if (dbClients.length > 0) {
                    clients = dbClients.map(c => ({
                        id: c.id,
                        name: c.name,
                        email: c.email,
                        password: c.password,
                        value: parseFloat(c.value) || 0,
                        payday: parseInt(c.payday) || 10,
                        duration: parseInt(c.duration) || 12,
                        startDate: c.start_date,
                        photo: c.photo,
                        status: c.status,
                        paymentStatus: c.payment_status,
                        demands: c.demands || [],
                        posts: c.posts || [],
                        approvals: c.approvals || [],
                        campaigns: c.campaigns || [],
                        reach: parseInt(c.reach) || 0,
                        leadsCount: parseInt(c.leads_count) || 0,
                        instagramConnected: !!c.instagram_connected,
                        instagramUsername: c.instagram_username,
                        instagramFollowers: parseInt(c.instagram_followers) || 0,
                        instagramReach: parseInt(c.instagram_reach) || 0,
                        instagramEngagement: parseFloat(c.instagram_engagement) || 0.0,
                        instagramVisits: parseInt(c.instagram_visits) || 0,
                        instagramChartPoints: c.instagram_chart_points,
                        libraryFiles: c.library_files || []
                    }));
                    localStorage.setItem('founders_clients', JSON.stringify(clients));
                } else {
                    // Seed initial data to Supabase if empty
                    for (const c of clients) {
                        await syncClientToSupabase(c);
                    }
                }
            }

            // Load leads
            const { data: dbLeads, error: leadsErr } = await supabase.from('leads').select('*');
            if (!leadsErr && dbLeads) {
                if (dbLeads.length > 0) {
                    leads = dbLeads.map(l => ({
                        id: l.id,
                        name: l.name,
                        email: l.email,
                        phone: l.phone,
                        listName: l.list_name,
                        status: l.status,
                        score: parseInt(l.score) || 0,
                        city: l.city,
                        comments: l.comments,
                        nicho: l.nicho || '—',
                        followUp: l.follow_up || '—'
                    }));
                    localStorage.setItem('founders_leads', JSON.stringify(leads));

                    // Reconstruct lists dynamically from leads
                    const uniqueListNames = [...new Set(leads.map(l => l.listName))];
                    const reconstructedLists = uniqueListNames.map(name => {
                        const listLeads = leads.filter(l => l.listName === name);
                        const breakdown = {};
                        listLeads.forEach(l => {
                            breakdown[l.status] = (breakdown[l.status] || 0) + 1;
                        });
                        const existingList = lists.find(li => li.name === name);
                        const date = existingList ? existingList.date : new Date().toLocaleDateString('pt-BR');
                        return {
                            name: name,
                            leadsCount: listLeads.length,
                            date: date,
                            active: name === activeListName,
                            breakdown: breakdown
                        };
                    });
                    lists = reconstructedLists;
                    localStorage.setItem('founders_lists', JSON.stringify(lists));
                } else {
                    for (const l of leads) {
                        await syncLeadToSupabase(l);
                    }
                }
            }

            // Load operational contents
            const { data: dbContents, error: contentsErr } = await supabase.from('operational_contents').select('*');
            if (!contentsErr && dbContents) {
                if (dbContents.length > 0) {
                    operationalContents = dbContents.map(c => ({
                        id: c.id,
                        clientId: c.client_id,
                        title: c.title,
                        type: c.type,
                        network: c.network,
                        date: c.date,
                        status: c.status,
                        body: c.body,
                        caption: c.caption,
                        thumbnail: c.thumbnail,
                        mediaFiles: c.media_files || [],
                        logs: c.logs || []
                    }));
                    localStorage.setItem('founders_operational_contents', JSON.stringify(operationalContents));
                } else {
                    for (const c of operationalContents) {
                        await syncOperationalContentToSupabase(c);
                    }
                }
            }

            // Load calendar events
            const { data: dbEvents, error: eventsErr } = await supabase.from('calendar_events').select('*');
            if (!eventsErr && dbEvents) {
                if (dbEvents.length > 0) {
                    calendarEvents = dbEvents.map(e => ({
                        id: e.id,
                        title: e.title,
                        date: e.date,
                        time: e.time,
                        desc: e.desc,
                        category: e.category
                    }));
                    localStorage.setItem('founders_calendar_events', JSON.stringify(calendarEvents));
                } else {
                    for (const e of calendarEvents) {
                        await syncCalendarEventToSupabase(e);
                    }
                }
            }

            // Load custom transactions
            const { data: dbTx, error: txErr } = await supabase.from('custom_transactions').select('*');
            if (!txErr && dbTx) {
                if (dbTx.length > 0) {
                    customTransactions = dbTx.map(t => ({
                        id: t.id,
                        type: t.type,
                        value: parseFloat(t.amount) || 0,
                        date: t.date,
                        description: t.description,
                        category: t.category,
                        clientId: t.client_id
                    }));
                    localStorage.setItem('founders_custom_transactions', JSON.stringify(customTransactions));
                } else {
                    for (const t of customTransactions) {
                        await syncTransactionToSupabase(t);
                    }
                }
            }

            // Load player routines
            const { data: dbRoutines, error: routinesErr } = await supabase.from('player_routines').select('*');
            if (!routinesErr && dbRoutines) {
                if (dbRoutines.length > 0) {
                    playerRoutines = dbRoutines.map(r => ({
                        id: r.id,
                        name: r.name,
                        role: r.role,
                        photo: r.photo,
                        tasks: r.tasks || []
                    }));
                    localStorage.setItem('founders_player_routines', JSON.stringify(playerRoutines));
                } else {
                    for (const r of playerRoutines) {
                        await syncPlayerRoutineToSupabase(r);
                    }
                }
            }
        } catch (err) {
            console.error("Erro ao carregar dados do Supabase:", err);
        }
    }

    async function initSupabaseConnection() {
        try {
            const res = await fetch('/api/config');
            if (res.ok) {
                const config = await res.json();
                if (config.supabaseUrl && config.supabaseAnonKey) {
                    supabase = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);
                    console.log("Supabase inicializado com sucesso via variáveis de ambiente da Vercel!");
                    await loadDataFromSupabase();
                    
                    // Force refresh main interface components after cloud load
                    if (typeof syncRolePortalInterface === 'function') syncRolePortalInterface();
                    if (typeof renderClientesGrid === 'function') renderClientesGrid();
                    if (typeof initDashboardView === 'function') initDashboardView();
                    if (typeof initCalendarView === 'function') initCalendarView();
                    if (typeof initDemandasView === 'function') initDemandasView();
                    if (typeof initCrmView === 'function') initCrmView();
                    if (typeof initProspeccaoView === 'function') initProspeccaoView();
                }
            }
        } catch (err) {
            console.warn("Sem conexão com o Supabase ou rodando localmente (fallback para localStorage):", err);
        }
    }

    // Chama inicializacao do Supabase
    initSupabaseConnection();

    function saveDismissedAlerts() {
        localStorage.setItem('founders_dismissed_alerts', JSON.stringify(dismissedAlerts));
    }

    function showNotification(msg) {
        let toast = document.getElementById('founders-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'founders-toast';
            toast.style.cssText = 'position: fixed; bottom: 20px; right: 20px; background: var(--color-accent-gold); color: #000; padding: 12px 24px; border-radius: 8px; font-weight: bold; box-shadow: 0 4px 12px rgba(0,0,0,0.5); z-index: 99999; transition: opacity 0.3s; opacity: 0; pointer-events: none;';
            document.body.appendChild(toast);
        }
        toast.textContent = msg;
        toast.style.opacity = '1';
        setTimeout(() => {
            toast.style.opacity = '0';
        }, 3000);
    }

    // Database Migration & Seed Syncing for existing databases
    function migrateDatabase() {
        let changed = false;
        
        if (!localStorage.getItem('founders_library_reset_v1')) {
            clients.forEach(c => {
                c.libraryFiles = [];
            });
            localStorage.setItem('founders_library_reset_v1', 'true');
            changed = true;
        }

        // Sanitize clients array
        if (!Array.isArray(clients)) {
            clients = [];
            changed = true;
        }
        clients = clients.filter(c => c !== null && typeof c === 'object');
        clients.forEach(c => {
            if (!c.id) {
                c.id = 'c_' + Math.random().toString(36).substr(2, 9);
                changed = true;
            }
            if (typeof c.name !== 'string') {
                c.name = 'Sem Nome';
                changed = true;
            }
            if (typeof c.value !== 'number' || isNaN(c.value)) {
                c.value = parseFloat(c.value) || 0;
                changed = true;
            }
            if (typeof c.payday !== 'number' || isNaN(c.payday)) {
                c.payday = parseInt(c.payday) || 10;
                changed = true;
            }
            if (typeof c.duration !== 'number' || isNaN(c.duration)) {
                c.duration = parseInt(c.duration) || 12;
                changed = true;
            }
            if (typeof c.startDate !== 'string') {
                c.startDate = '';
                changed = true;
            }
            if (typeof c.email !== 'string') {
                c.email = '';
                changed = true;
            }
            if (typeof c.password !== 'string') {
                c.password = '123456';
                changed = true;
            }
            if (typeof c.status !== 'string') {
                c.status = 'active';
                changed = true;
            }
            if (typeof c.paymentStatus !== 'string') {
                c.paymentStatus = 'Pendente';
                changed = true;
            }
            if (!Array.isArray(c.demands)) {
                c.demands = [];
                changed = true;
            }
            if (!Array.isArray(c.posts)) {
                c.posts = [];
                changed = true;
            }
            if (!Array.isArray(c.approvals)) {
                c.approvals = [];
                changed = true;
            } else {
                c.approvals = c.approvals.filter(a => a !== null && typeof a === 'object');
                c.approvals.forEach(a => {
                    if (typeof a.network !== 'string') {
                        a.network = 'Instagram';
                        changed = true;
                    }
                    if (typeof a.status !== 'string') {
                        a.status = 'Pendente';
                        changed = true;
                    }
                    if (!a.history) {
                        a.history = [
                            { date: '2026-06-16', user: 'Agência', action: 'Envio de Conteúdo', comments: 'Enviado para aprovação inicial.' }
                        ];
                        changed = true;
                    }
                    if (!a.opContentId) {
                        if (a.title === 'Roteiro Reels: Por que sua pele envelhece mais rápido') {
                            a.opContentId = 'op_1';
                            changed = true;
                        } else if (a.title === 'Design Carrossel: Criomodelagem Estruturada') {
                            a.opContentId = 'op_3';
                            changed = true;
                        } else if (a.title === 'Roteiro Reels: Primeiros 30 Dias de Tráfego') {
                            a.opContentId = 'op_5';
                            changed = true;
                        }
                    }
                });
            }
            if (!Array.isArray(c.libraryFiles)) {
                c.libraryFiles = getDefaultLibraryFiles(c.name);
                changed = true;
            }
            if (!Array.isArray(c.campaigns)) {
                c.campaigns = [
                    { id: 'cam_1', name: 'Campanha Rejuvenescimento Junho', budget: 1500, spent: 850, status: 'Ativa', platform: 'Meta Ads' },
                    { id: 'cam_2', name: 'Campanha Botox Promocional', budget: 2000, spent: 2000, status: 'Concluída', platform: 'Meta Ads' }
                ];
                changed = true;
            }
            if (typeof c.reach !== 'number') {
                c.reach = Math.round(15000 + Math.random() * 25000);
                changed = true;
            }
            if (typeof c.leadsCount !== 'number') {
                c.leadsCount = Math.round(150 + Math.random() * 200);
                changed = true;
            }
        });

        // Sanitize leads array
        if (!Array.isArray(leads)) {
            leads = [];
            changed = true;
        }
        leads = leads.filter(l => l !== null && typeof l === 'object');
        leads.forEach(l => {
            if (!l.id) {
                l.id = 'l_' + Math.random().toString(36).substr(2, 9);
                changed = true;
            }
            if (typeof l.name !== 'string') {
                l.name = 'Sem Nome';
                changed = true;
            }
            if (typeof l.listName !== 'string') {
                l.listName = activeListName || 'Dentista Feira';
                changed = true;
            }
            if (typeof l.status !== 'string') {
                l.status = 'Prospecção';
                changed = true;
            }
            if (typeof l.score !== 'number' || isNaN(l.score)) {
                l.score = parseInt(l.score) || 0;
                changed = true;
            }
        });

        // Ensure Mcfest Founders account exists for client login
        const mcfestExists = clients.some(c => c.email && c.email.toLowerCase() === 'mcfest2@gmail.com');
        if (!mcfestExists) {
            clients.push({
                id: 'c_4',
                name: 'Mcfest Founders',
                email: 'mcfest2@gmail.com',
                password: 'bbmmr18231376',
                value: 6000,
                payday: 10,
                duration: 12,
                startDate: '2026-06-16',
                photo: 'avatar-gold',
                status: 'active',
                paymentStatus: 'Pago',
                demands: [
                    { id: 'cd_4_1', title: 'Gravar vídeo depoimento inicial', desc: 'Falar sobre a expectativa com o tráfego pago.', completed: false }
                ],
                posts: [
                    { id: 'cp_4_1', title: 'Carrossel: Apresentação da Parceria', network: 'Instagram', type: 'Carrossel', date: '2026-06-18', thumbnail: 'assets/post_placeholder.png' }
                ],
                approvals: [
                    {
                        id: 'ca_4_1',
                        title: 'Roteiro Reels: Primeiros 30 Dias de Tráfego',
                        type: 'Roteiro Reels',
                        network: 'Instagram',
                        body: 'GANCHO: O que acontece nos primeiros 30 dias de anúncios online?\n\nDESENVOLVIMENTO: 1. Instalação e teste de pixels.\n2. Lançamento das primeiras campanhas.\n3. Otimização de criativos.\n\nCTA: Envie uma mensagem e comece hoje.',
                        caption: 'Expectativa vs Realidade nos anúncios digitais! 🚀',
                        status: 'Pendente',
                        adjustments: '',
                        thumbnail: 'assets/post_placeholder.png'
                    }
                ]
            });
            changed = true;
        }

        // Sanitize player routines array and assign IDs
        if (!Array.isArray(playerRoutines)) {
            playerRoutines = [];
            changed = true;
        }
        playerRoutines = playerRoutines.filter(p => p !== null && typeof p === 'object');
        playerRoutines.forEach(p => {
            if (!p.id) {
                p.id = 'p_' + Math.random().toString(36).substr(2, 9);
                changed = true;
            }
            if (!p.level) {
                p.level = 1;
                changed = true;
            }
            if (typeof p.xp !== 'number') {
                p.xp = 0;
                changed = true;
            }
            if (!Array.isArray(p.tasks)) {
                p.tasks = [];
                changed = true;
            }
        });

        return changed;
    }

    let shouldSync = migrateDatabase();
    if (shouldSync) {
        localStorage.setItem('founders_clients', JSON.stringify(clients));
        localStorage.setItem('founders_leads', JSON.stringify(leads));
        localStorage.setItem('founders_player_routines', JSON.stringify(playerRoutines));
    }

    // SaaS operational contents local storage seeding & handling
    function getDefaultOperationalContents() {
        return [
            { id: 'op_1', clientId: 'c_1', title: 'Roteiro Reels: Por que sua pele envelhece mais rápido', type: 'Roteiro Reels', network: 'Instagram', date: '2026-06-18', status: 'Em Aprovação', body: 'GANCHO: Você já se perguntou por que algumas pessoas parecem envelhecer mais rápido?\n\nDESENVOLVIMENTO: 1. Falta de protetor solar mesmo no inverno.\n2. Baixa hidratação.\n3. Falta de colágeno.\n\nCTA: Comente PELE para agendar uma avaliação gratuita.', caption: 'Será que você está cometendo esses erros diariamente? 👇\n\nMarque uma amiga que precisa saber disso!\n\n#pele #estetica #cuidados', thumbnail: 'assets/post_botox.png', logs: [{ date: '2026-06-16', msg: 'Criado e enviado para aprovação inicial' }] },
            { id: 'op_2', clientId: 'c_1', title: 'Reels: Bastidores da Clínica', type: 'Reels', network: 'Instagram', date: '2026-06-22', status: 'Em Produção', body: 'Roteiro gravado com a Dra Fernanda mostrando o dia a dia da clínica de estética.', caption: 'Um pouquinho do nosso amor e dedicação por você!', thumbnail: 'assets/post_skincare.png', logs: [{ date: '2026-06-15', msg: 'Roteiro em edição de vídeo' }] },
            { id: 'op_3', clientId: 'c_2', title: 'Design Carrossel: Criomodelagem Estruturada', type: 'Carrossel Arte', network: 'Instagram', date: '2026-06-19', status: 'Em Aprovação', body: 'Mockup das imagens no Canva. Link das artes: [Link mockado Canva]', caption: 'Tudo o que você precisa saber sobre Criomodelagem! ❄️', thumbnail: 'assets/post_criomodelagem.png', logs: [{ date: '2026-06-16', msg: 'Aguardando aprovação do cliente' }] },
            { id: 'op_4', clientId: 'c_1', title: 'Carrossel Arte: Cronograma Skincare', type: 'Carrossel Arte', network: 'Instagram', date: '2026-06-14', status: 'Publicado', body: 'Telas explicando a rotina ideal de skincare pós 30 anos.', caption: 'Chegou nos 30? Veja como cuidar da sua pele!', thumbnail: 'assets/post_skincare.png', logs: [{ date: '2026-06-14', msg: 'Publicado na rede social pelo integrador' }] },
            { id: 'op_5', clientId: 'c_4', title: 'Roteiro Reels: Primeiros 30 Dias de Tráfego', type: 'Roteiro Reels', network: 'Instagram', date: '2026-06-18', status: 'Em Aprovação', body: 'GANCHO: O que acontece nos primeiros 30 dias de anúncios online?\n\nDESENVOLVIMENTO: 1. Instalação e teste de pixels.\n2. Lançamento das primeiras campanhas.\n3. Otimização de criativos.\n\nCTA: Envie uma mensagem e comece hoje.', caption: 'Expectativa vs Realidade nos anúncios digitais! 🚀', thumbnail: 'assets/post_placeholder.png', logs: [{ date: '2026-06-16', msg: 'Criado e enviado para aprovação inicial.' }] }
        ];
    }

    let operationalContents = [];
    try {
        operationalContents = JSON.parse(localStorage.getItem('founders_operational_contents')) || getDefaultOperationalContents();
    } catch(e) {
        operationalContents = getDefaultOperationalContents();
    }
    
    if (!localStorage.getItem('founders_operational_contents')) {
        localStorage.setItem('founders_operational_contents', JSON.stringify(operationalContents));
    }

    async function saveOperationalContents(contentToSync) {
        localStorage.setItem('founders_operational_contents', JSON.stringify(operationalContents));
        if (supabase) {
            if (contentToSync) {
                await syncOperationalContentToSupabase(contentToSync);
            } else {
                for (const op of operationalContents) {
                    await syncOperationalContentToSupabase(op);
                }
            }
        }
    }

    let currentRole = localStorage.getItem('founders_current_role') || 'adm'; // 'adm' or 'client-id'
    let selectedClientDetailId = null; // Client ID currently being managed by ADM

    const statuses = ['Prospecção', 'Contato Feito', 'Respondeu', 'Qualificado', 'Reunião Marcada', 'Proposta Enviada'];
    const calcInputs = ['ads', 'cpl', 'tag', 'tcom', 'tconv', 'ticket'];

    async function saveLeads(leadToSync) {
        localStorage.setItem('founders_leads', JSON.stringify(leads));
        if (supabase) {
            if (leadToSync) {
                await syncLeadToSupabase(leadToSync);
            } else {
                for (const l of leads) {
                    await syncLeadToSupabase(l);
                }
            }
        }
    }

    function saveLists() {
        localStorage.setItem('founders_lists', JSON.stringify(lists));
    }

    function saveActiveListName() {
        localStorage.setItem('founders_active_list', activeListName);
    }

    function saveScripts() {
        localStorage.setItem('founders_scripts', JSON.stringify(scripts));
    }

    async function saveRoutines(routineToSync) {
        localStorage.setItem('founders_player_routines', JSON.stringify(playerRoutines));
        if (supabase) {
            if (routineToSync) {
                await syncPlayerRoutineToSupabase(routineToSync);
            } else {
                for (const r of playerRoutines) {
                    await syncPlayerRoutineToSupabase(r);
                }
            }
        }
    }

    async function saveCalendarEvents(eventToSync) {
        localStorage.setItem('founders_calendar_events', JSON.stringify(calendarEvents));
        if (supabase) {
            if (eventToSync) {
                await syncCalendarEventToSupabase(eventToSync);
            } else {
                for (const e of calendarEvents) {
                    await syncCalendarEventToSupabase(e);
                }
            }
        }
    }

    async function saveClients(clientToSync) {
        localStorage.setItem('founders_clients', JSON.stringify(clients));
        if (supabase) {
            if (clientToSync) {
                await syncClientToSupabase(clientToSync);
            } else {
                for (const c of clients) {
                    await syncClientToSupabase(c);
                }
            }
        }
    }

    async function saveCustomTransactions(txToSync) {
        localStorage.setItem('founders_custom_transactions', JSON.stringify(customTransactions));
        if (supabase) {
            if (txToSync) {
                await syncTransactionToSupabase(txToSync);
            } else {
                for (const t of customTransactions) {
                    await syncTransactionToSupabase(t);
                }
            }
        }
    }

    function saveCurrentRole() {
        localStorage.setItem('founders_current_role', currentRole);
    }

    function openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) modal.classList.remove('hidden');
    }

    function closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) modal.classList.add('hidden');
    }

    // Modal triggers & handlers
    document.getElementById('btn-add-client')?.addEventListener('click', () => openModal('modal-add-client'));
    document.getElementById('btn-add-lead')?.addEventListener('click', () => openModal('modal-add-lead'));
    document.getElementById('btn-import-csv')?.addEventListener('click', () => openModal('modal-import-csv'));
    document.getElementById('btn-new-prompt')?.addEventListener('click', () => openModal('modal-add-prompt'));
    document.getElementById('btn-new-script')?.addEventListener('click', () => openModal('modal-add-script'));
    document.getElementById('btn-new-demanda')?.addEventListener('click', () => {
        populateDemandaPlayerSelect();
        openModal('modal-add-demanda');
    });
    document.getElementById('btn-edit-demanda-meta')?.addEventListener('click', () => {
        document.getElementById('demanda-meta-input').value = demandsMeta;
        openModal('modal-edit-demanda-meta');
    });
    document.getElementById('btn-add-event-modal')?.addEventListener('click', () => {
        if (currentRole !== 'adm') {
            alert('Acesso restrito a administradores.');
            return;
        }
        document.getElementById('event-date').value = new Date().toISOString().substring(0, 10);
        openModal('modal-add-event');
    });
    document.getElementById('btn-edit-counter-goal')?.addEventListener('click', () => {
        document.getElementById('counter-goal-input').value = counterGoal;
        openModal('modal-edit-counter-goal');
    });
    document.getElementById('btn-goto-lists')?.addEventListener('click', () => {
        showView('listas');
    });

    document.getElementById('btn-new-player')?.addEventListener('click', () => {
        document.getElementById('form-add-player').reset();
        openModal('modal-add-player');
    });

    document.getElementById('form-add-player')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('player-name-input').value.trim();
        if (name) {
            const newPlayer = {
                id: 'p_' + Math.random().toString(36).substr(2, 9),
                name: name,
                level: 1,
                xp: 0,
                tasks: []
            };
            playerRoutines.push(newPlayer);
            saveRoutines(newPlayer);
            closeModal('modal-add-player');
            initDemandasView();
        }
    });

    document.getElementById('form-edit-player')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const idx = parseInt(document.getElementById('edit-player-idx').value);
        const name = document.getElementById('edit-player-name-input').value.trim();
        const xp = parseInt(document.getElementById('edit-player-xp-input').value) || 0;
        if (playerRoutines[idx]) {
            playerRoutines[idx].name = name;
            playerRoutines[idx].xp = Math.max(0, Math.min(100, xp));
            saveRoutines();
            closeModal('modal-edit-player');
            initDemandasView();
        }
    });

    document.getElementById('form-edit-task')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const pIdx = parseInt(document.getElementById('edit-task-p-idx').value);
        const tIdx = parseInt(document.getElementById('edit-task-t-idx').value);
        const title = document.getElementById('edit-task-title-input').value.trim();
        const type = document.getElementById('edit-task-type-select').value;
        if (playerRoutines[pIdx] && playerRoutines[pIdx].tasks[tIdx]) {
            playerRoutines[pIdx].tasks[tIdx].title = title;
            playerRoutines[pIdx].tasks[tIdx].type = type;
            saveRoutines();
            closeModal('modal-edit-task');
            initDemandasView();
        }
    });

    // Global modal close handlers
    document.addEventListener('click', (e) => {
        const btn = e.target.closest('.close-modal-btn, [data-modal]');
        if (btn) {
            if (btn.classList.contains('close-modal-btn') || btn.classList.contains('btn-dark') || btn.getAttribute('type') === 'button') {
                const modalId = btn.getAttribute('data-modal') || btn.closest('.modal-overlay')?.id;
                if (modalId) {
                    closeModal(modalId);
                }
            }
        }
    });

    // Demanda/Routine creation
    function populateDemandaPlayerSelect() {
        const select = document.getElementById('demanda-player');
        if (select) {
            select.innerHTML = '';
            playerRoutines.forEach((p, idx) => {
                const opt = document.createElement('option');
                opt.value = idx;
                opt.textContent = p.name;
                select.appendChild(opt);
            });
        }
    }

    document.getElementById('form-add-demanda')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const playerIdx = parseInt(document.getElementById('demanda-player').value);
        const title = document.getElementById('demanda-title').value.trim();
        const type = document.getElementById('demanda-type').value;

        if (playerRoutines[playerIdx]) {
            if (!playerRoutines[playerIdx].tasks) playerRoutines[playerIdx].tasks = [];
            playerRoutines[playerIdx].tasks.push({
                id: 't_' + Math.random().toString(36).substr(2, 9),
                title,
                type,
                completed: false
            });
            saveRoutines(playerRoutines[playerIdx]);
            closeModal('modal-add-demanda');
            document.getElementById('form-add-demanda').reset();
            initDemandasView();
        }
    });

    // Calendar Event creation
    document.getElementById('form-add-event')?.addEventListener('submit', (e) => {
        e.preventDefault();
        if (currentRole !== 'adm') {
            alert('Acesso restrito a administradores.');
            return;
        }
        const title = document.getElementById('event-title').value.trim();
        const date = document.getElementById('event-date').value;
        const time = document.getElementById('event-time').value;
        const desc = document.getElementById('event-desc').value.trim();
        const category = document.getElementById('event-category')?.value || 'reuniao';

        const newEvent = {
            id: 'e_' + Math.random().toString(36).substr(2, 9),
            title,
            date,
            time,
            desc,
            category
        };
        calendarEvents.push(newEvent);
        saveCalendarEvents(newEvent);
        closeModal('modal-add-event');
        document.getElementById('form-add-event').reset();
        initCalendarView();
    });

    // Edit Demanda Meta
    document.getElementById('form-edit-demanda-meta')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const newMeta = parseInt(document.getElementById('demanda-meta-input').value) || 100;
        demandsMeta = newMeta;
        localStorage.setItem('founders_demands_meta', demandsMeta);
        closeModal('modal-edit-demanda-meta');
        initDemandasView();
    });

    // Edit Counter Goal
    document.getElementById('form-edit-counter-goal')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const newGoal = parseInt(document.getElementById('counter-goal-input').value) || 20;
        counterGoal = newGoal;
        localStorage.setItem('founders_counter_goal', counterGoal);
        closeModal('modal-edit-counter-goal');
        initContadorView();
    });

    // Prompt creation
    document.getElementById('form-add-prompt')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const title = document.getElementById('prompt-title').value.trim();
        const category = document.getElementById('prompt-category').value;
        const body = document.getElementById('prompt-content').value.trim();

        promptsList.push({
            id: 'p_' + Math.random().toString(36).substr(2, 9),
            title,
            category,
            body
        });
        localStorage.setItem('founders_prompts_list', JSON.stringify(promptsList));
        closeModal('modal-add-prompt');
        document.getElementById('form-add-prompt').reset();
        initPromptsView();
    });

    // Script creation
    document.getElementById('form-add-script')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const title = document.getElementById('script-title').value.trim();
        const type = document.getElementById('script-type').value;
        const body = document.getElementById('script-body').value.trim();

        scripts.push({
            id: 's_' + Math.random().toString(36).substr(2, 9),
            title,
            type,
            body
        });
        saveScripts();
        closeModal('modal-add-script');
        document.getElementById('form-add-script').reset();
        initScriptsView();
    });

    function initHubView() {
        const activeLeads = leads.filter(l => l.listName === activeListName);
        const totalLeads = activeLeads.length;
        const fechados = activeLeads.filter(l => l.status === 'Reunião Marcada').length;
        
        let receita = 0;
        clients.forEach(c => {
            if (c.status === 'active') {
                receita += c.value;
            }
        });

        document.getElementById('hub-total-leads').textContent = totalLeads;
        document.getElementById('hub-total-fechados').textContent = fechados;
        document.getElementById('hub-receita').textContent = 'R$ ' + receita.toLocaleString('pt-BR');
    }

    // Hub grid navigation
    document.querySelectorAll('.hub-grid-card').forEach(card => {
        card.addEventListener('click', () => {
            const targetView = card.getAttribute('data-link');
            if (targetView) {
                showView(targetView);
                const subNavItem = document.querySelector(`.sub-nav-item[data-view="${targetView}"]`);
                if (subNavItem) {
                    document.getElementById('comercial-toggle').classList.add('active');
                }
            }
        });
    });

    // Seeding mock database for Leads and Lists
    function seedInitialLeadsData() {
        const initialLists = [
            {
                name: 'Founders',
                leadsCount: 11,
                date: '24/03/2026',
                active: false,
                breakdown: {
                    'Qualificado': 3,
                    'Reunião Marcada': 3,
                    'Perdido': 3,
                    'Proposta Enviada': 1,
                    'Respondeu': 1
                }
            },
            {
                name: 'Dentista Feira',
                leadsCount: 106,
                date: '25/03/2026',
                active: true,
                breakdown: {
                    'Prospecção': 48,
                    'Contato Feito': 51,
                    'Respondeu': 3,
                    'Perdido': 4
                }
            }
        ];

        const seededLeads = [];

        const foundersLeadsInfo = [
            { name: 'D3RS HOLDINGS', phone: '(11) 98888-1111', status: 'Qualificado', score: 85 },
            { name: 'DIXON JR. CONSULTING', phone: '(11) 98888-2222', status: 'Reunião Marcada', score: 90 },
            { name: 'BOULEVARD CAPITAL', phone: '(11) 98888-3333', status: 'Perdido', score: 20 },
            { name: 'NOVA PARTNERS', phone: '(11) 98888-4444', status: 'Proposta Enviada', score: 95 },
            { name: 'MERCATTO SA', phone: '(11) 98888-5555', status: 'Respondeu', score: 65 },
            { name: 'F3 PORTFOLIO', phone: '(11) 98888-6666', status: 'Qualificado', score: 80 },
            { name: 'INSIGHT ADVISORY', phone: '(11) 98888-7777', status: 'Reunião Marcada', score: 88 },
            { name: 'ALFA HOLDING', phone: '(11) 98888-8888', status: 'Perdido', score: 15 },
            { name: 'PRIME ADVISORS', phone: '(11) 98888-9999', status: 'Qualificado', score: 75 },
            { name: 'VETOR VENDAS', phone: '(11) 98888-0000', status: 'Reunião Marcada', score: 92 },
            { name: 'NEXUS CAPITAL', phone: '(11) 97777-1111', status: 'Perdido', score: 10 }
        ];
        
        foundersLeadsInfo.forEach(l => {
            seededLeads.push({
                id: 'l_' + Math.random().toString(36).substr(2, 9),
                listName: 'Founders',
                name: l.name,
                phone: l.phone,
                nicho: 'Empresas e CEOs',
                city: 'São Paulo',
                status: l.status,
                score: l.score,
                followUp: '—'
            });
        });

        const clinicPrefixes = ['Clínica', 'Consultório', 'Estética', 'Odonto', 'Dental', 'Instituto'];
        const clinicNames = ['Dra Fernanda Souza', 'WEYLL ESTETICA', 'Revitalizze', 'Royal Face', 'Perfect Beauty', 'San Estética', 'Revita Life', 'Caroline Rios', 'Jocely Teles', 'Moezia Ferreira', 'Dra Fabiana Souza', 'Dr. Felipe Oliveira', 'Dermato', 'lago costa não pode', 'Revitá', 'Marvelle', 'LisDhermo', 'Bestlaser', 'EMAGRECENTRO', 'Slim'];
        
        const screenshotLeads = [
            { name: 'WEYLL ESTETICA', phone: '(75) 3636-8888', status: 'Prospecção', score: 18 },
            { name: 'Estética Revitalizze', phone: '(75) 99212-3819', status: 'Contato Feito', score: 41 },
            { name: 'Royal Face Clínica de Estética - Feira de Santana', phone: '(75) 98258-0227', status: 'Prospecção', score: 18 },
            { name: 'Clínica de Estética - Instituto Perfect Beauty', phone: '(75) 99812-5866', status: 'Prospecção', score: 18 },
            { name: 'Clínica Dra Fernanda Souza- Criomodelagem Feira de Santana|Limpeza de Pele|Drenagem Linfática', phone: '(75) 99190-2465', status: 'Contato Feito', score: 41 },
            { name: 'La Vie | Clínica de Estética', phone: '(75) 98863-7787', status: 'Contato Feito', score: 41 },
            { name: 'lago costa não pode', phone: '(75) 98125-7588', status: 'Prospecção', score: 38 },
            { name: 'Clínica Dermato - Dermatologia e Estética', phone: '(75) 99344-7777', status: 'Respondeu', score: 62 },
            { name: 'Instituto Dr. Felipe Oliveira', phone: '(75) 99544-8888', status: 'Respondeu', score: 58 },
            { name: 'Dra Fabiana Souza - Reabilitação Oral', phone: '(75) 99122-3333', status: 'Respondeu', score: 70 },
            { name: 'San Estética ✕', phone: '(75) 99822-1111', status: 'Prospecção', score: 12 },
            { name: 'Bestlaser Feira de Santana', phone: '(75) 99211-4444', status: 'Prospecção', score: 18 },
            { name: 'Revitá', phone: '(75) 99111-5555', status: 'Prospecção', score: 18 },
            { name: 'Marvelle - Feira de Santana', phone: '(75) 98111-2222', status: 'Prospecção', score: 18 },
            { name: 'LisDhermo - Estética Avançada', phone: '(75) 99888-0000', status: 'Prospecção', score: 18 },
            { name: 'Emagrecimento e estética corporais', phone: '(75) 98855-6666', status: 'Contato Feito', score: 35 },
            { name: 'Clínica Slim - Estética em Feira', phone: '(75) 99122-7777', status: 'Contato Feito', score: 35 },
            { name: 'EMAGRECENTRO Feira de Santana', phone: '(75) 99255-9999', status: 'Contato Feito', score: 35 },
            { name: 'Clínica Dra Moezia Ferreira', phone: '(75) 99144-8888', status: 'Contato Feito', score: 41 },
            { name: 'Clínica Revita Life', phone: '(75) 99877-6666', status: 'Contato Feito', score: 41 },
            { name: 'Clínica Caroline Rios Saúde Integrativa', phone: '(75) 99166-5555', status: 'Contato Feito', score: 41 },
            { name: 'Estética Jocely Teles - Limpeza de Pele', phone: '(75) 98233-1111', status: 'Contato Feito', score: 41 }
        ];

        screenshotLeads.forEach(sl => {
            seededLeads.push({
                id: 'l_' + Math.random().toString(36).substr(2, 9),
                listName: 'Dentista Feira',
                name: sl.name,
                phone: sl.phone,
                nicho: 'Dentista Feira de Santana',
                city: '—',
                status: sl.status,
                score: sl.score,
                followUp: '—'
            });
        });

        const currentCounts = { 'Prospecção': 0, 'Contato Feito': 0, 'Respondeu': 0, 'Perdido': 0 };
        screenshotLeads.forEach(sl => {
            if (currentCounts[sl.status] !== undefined) {
                currentCounts[sl.status]++;
            }
        });

        const targetCounts = { 'Prospecção': 48, 'Contato Feito': 51, 'Respondeu': 3, 'Perdido': 4 };
        
        for (const [status, target] of Object.entries(targetCounts)) {
            const needed = target - currentCounts[status];
            for (let i = 0; i < needed; i++) {
                const name = clinicPrefixes[Math.floor(Math.random() * clinicPrefixes.length)] + ' ' + 
                             clinicNames[Math.floor(Math.random() * clinicNames.length)] + ' ' + 
                             ['Avançada', 'Prime', 'Select', 'Premium', 'Integrada', ''][Math.floor(Math.random() * 6)];
                const phone = '(75) 9' + Math.floor(1000 + Math.random() * 9000) + '-' + Math.floor(1000 + Math.random() * 9000);
                const score = status === 'Prospecção' ? 18 : (status === 'Contato Feito' ? 41 : (status === 'Respondeu' ? 58 : 8));
                
                seededLeads.push({
                    id: 'l_' + Math.random().toString(36).substr(2, 9),
                    listName: 'Dentista Feira',
                    name: name.trim(),
                    phone: phone,
                    nicho: 'Dentista Feira de Santana',
                    city: '—',
                    status: status,
                    score: score,
                    followUp: '—'
                });
            }
        }

        localStorage.setItem('founders_leads', JSON.stringify(seededLeads));
        localStorage.setItem('founders_lists', JSON.stringify(initialLists));
        localStorage.setItem('founders_active_list', 'Dentista Feira');
    }

    // Seeding mock database for Clients & Contracts
    function seedInitialClientsData() {
        const seededClients = [
            {
                id: 'c_1',
                name: 'Estética Revitalizze',
                email: 'revitalizze@gmail.com',
                password: '123456',
                value: 5500,
                payday: 10,
                duration: 12,
                startDate: '2026-01-01',
                photo: 'avatar-gold',
                status: 'active',
                paymentStatus: 'Pago',
                demands: [
                    { id: 'cd_1_1', title: 'Gravar depoimento de aplicação do Bioestimulador', desc: 'Enviar vídeo em alta resolução com boa iluminação nas redes.', completed: false },
                    { id: 'cd_1_2', title: 'Enviar fotos de Antes/Depois de preenchimento labial', desc: 'Mínimo de 3 fotos com bom ângulo.', completed: true }
                ],
                posts: [
                    { id: 'cp_1_1', title: 'Carrossel: Mitos e Verdades do Botox', network: 'Instagram', type: 'Carrossel', date: '2026-06-18', thumbnail: 'assets/post_botox.png' },
                    { id: 'cp_1_2', title: 'Reels: Bastidores da Clínica de Estética', network: 'Instagram', type: 'Reels', date: '2026-06-22', thumbnail: 'assets/post_skincare.png' }
                ],
                approvals: [
                    {
                        id: 'ca_1_1',
                        title: 'Roteiro Reels: Por que sua pele envelhece mais rápido',
                        type: 'Roteiro Reels',
                        network: 'Instagram',
                        body: 'GANCHO: Você já se perguntou por que algumas pessoas parecem envelhecer mais rápido?\n\nDESENVOLVIMENTO: 1. Falta de protetor solar mesmo no inverno.\n2. Baixa hidratação.\n3. Falta de colágeno.\n\nCTA: Comente PELE para agendar uma avaliação gratuita.',
                        caption: 'Será que você está cometendo esses erros diariamente? 👇\n\nMarque uma amiga que precisa saber disso!\n\n#pele #estetica #cuidados',
                        status: 'Pendente',
                        adjustments: '',
                        thumbnail: 'assets/post_botox.png'
                    },
                    {
                        id: 'ca_1_2',
                        title: 'Carrossel Arte: Cronograma de Skincare pós-30 anos',
                        type: 'Carrossel Arte',
                        network: 'Instagram',
                        body: 'TELA 1: O que sua pele precisa depois dos 30 anos?\nTELA 2: Manhã - Vitamina C + Filtro Solar\nTELA 3: Noite - Retinol + Creme Hidratante\nTELA 4: Semanal - Esfoliação suave\nTELA 5: Agende sua consulta no link da bio.',
                        caption: 'Chegou nos 30? Sua rotina de pele precisa mudar! 👇\n\n#skincare #estetica #beleza',
                        status: 'Aprovado',
                        adjustments: '',
                        thumbnail: 'assets/post_skincare.png'
                    }
                ]
            },
            {
                id: 'c_2',
                name: 'WEYLL ESTETICA',
                email: 'weyll@gmail.com',
                password: '123456',
                value: 7000,
                payday: 5,
                duration: 6,
                startDate: '2026-02-15',
                photo: 'avatar-blue',
                status: 'active',
                paymentStatus: 'Pendente',
                demands: [
                    { id: 'cd_2_1', title: 'Enviar logotipo em vetor (.SVG)', desc: 'Para criar as capas de destaques novas.', completed: true },
                    { id: 'cd_2_2', title: 'Gravar introdução de boas-vindas do WEYLL', desc: 'Roteiro de 30 segundos no Reels.', completed: false }
                ],
                posts: [
                    { id: 'cp_2_1', title: 'Post Texto: A importância da criomodelagem estruturada', network: 'LinkedIn', type: 'Post Texto', date: '2026-06-19', thumbnail: 'assets/post_criomodelagem.png' }
                ],
                approvals: [
                    {
                        id: 'ca_2_1',
                        title: 'Design Carrossel: Criomodelagem Estruturada',
                        type: 'Carrossel Arte',
                        network: 'Instagram',
                        body: 'Mockup das imagens no Canva. Link das artes: [Link mockado Canva]',
                        caption: 'Tudo o que você precisa saber sobre Criomodelagem! ❄️',
                        status: 'Pendente',
                        adjustments: '',
                        thumbnail: 'assets/post_criomodelagem.png'
                    }
                ]
            },
            {
                id: 'c_3',
                name: 'Royal Face Feira',
                email: 'royalface@gmail.com',
                password: '123456',
                value: 4800,
                payday: 20,
                duration: 12,
                startDate: '2026-03-10',
                photo: 'avatar-teal',
                status: 'active',
                paymentStatus: 'Atrasado',
                demands: [
                    { id: 'cd_3_1', title: 'Aprovar orçamento extra de tráfego de Junho', desc: 'Discussão via WhatsApp.', completed: false }
                ],
                posts: [],
                approvals: []
            },
            {
                id: 'c_4',
                name: 'Mcfest Founders',
                email: 'mcfest2@gmail.com',
                password: 'bbmmr18231376',
                value: 6000,
                payday: 10,
                duration: 12,
                startDate: '2026-06-16',
                photo: 'avatar-gold',
                status: 'active',
                paymentStatus: 'Pago',
                demands: [
                    { id: 'cd_4_1', title: 'Gravar vídeo depoimento inicial', desc: 'Falar sobre a expectativa com o tráfego pago.', completed: false }
                ],
                posts: [
                    { id: 'cp_4_1', title: 'Carrossel: Apresentação da Parceria', network: 'Instagram', type: 'Carrossel', date: '2026-06-18', thumbnail: 'assets/post_placeholder.png' }
                ],
                approvals: [
                    {
                        id: 'ca_4_1',
                        title: 'Roteiro Reels: Primeiros 30 Dias de Tráfego',
                        type: 'Roteiro Reels',
                        network: 'Instagram',
                        body: 'GANCHO: O que acontece nos primeiros 30 dias de anúncios online?\n\nDESENVOLVIMENTO: 1. Instalação e teste de pixels.\n2. Lançamento das primeiras campanhas.\n3. Otimização de criativos.\n\nCTA: Envie uma mensagem e comece hoje.',
                        caption: 'Expectativa vs Realidade nos anúncios digitais! 🚀',
                        status: 'Pendente',
                        adjustments: '',
                        thumbnail: 'assets/post_placeholder.png'
                      }
                  ]
              }
          ];
  
          localStorage.setItem('founders_clients', JSON.stringify(seededClients));
      }

    function getDefaultScripts() {
        return [
            { id: 's_1', title: 'Apresentação direta', type: 'Primeira Abordagem', body: 'Olá {{nome}}! Tudo bem? 🖐\n\nMeu nome é [Seu Nome], sou da [Agência]. Trabalho com marketing digital para empresas do nicho de {{nicho}} aqui em {{cidade}}.\n\nNotei que sua empresa pode ter um grande potencial online. Posso te mostrar como estamos ajudando negócios parecidos a crescer?' },
            { id: 's_2', title: 'Abordagem com valor', type: 'Primeira Abordagem', body: 'Oi {{nome}}, tudo certo? 😊\n\nVi que você atua no segmento de {{nicho}} em {{cidade}} e tive algumas ideias que podem ajudar a atrair mais clientes para o seu negócio.\n\nPosso compartilhar com você em uma conversa rápida de 15 min?' },
            { id: 's_3', title: 'Follow-up de conexão', type: 'Follow-up', body: 'Olá {{nome}}, passando para saber se você conseguiu ver minha última mensagem.\n\nSei que seu dia a dia gerenciando uma empresa de {{nicho}} é corrido, mas acredito muito no potencial dessa parceria!' },
            { id: 's_4', title: 'Tratamento: Sem tempo', type: 'Quebra de Objeção', body: 'Entendo perfeitamente, {{nome}}! Rotina de empresário é super atarefada.\n\nPor isso mesmo nossa conversa é bem objetiva (10 minutos). Se eu te enviar um link de agendamento rápido, você conseguiria escolher um horário na próxima semana?' }
        ];
    }

    function getDefaultPlayerRoutines() {
        return [
            {
                name: 'Theo',
                level: 1,
                xp: 70,
                tasks: [
                    { id: 't_t1', title: 'Cbm', type: 'Fixa', completed: false },
                    { id: 't_t2', title: 'Prospecção Fria', type: 'Fixa', completed: false },
                    { id: 't_t3', title: 'Carrossel', type: 'Fixa', completed: false },
                    { id: 't_t4', title: 'Frase 6S', type: 'Fixa', completed: false },
                    { id: 't_t5', title: '6S - 1', type: 'Fixa', completed: false }
                ]
            },
            {
                name: 'João',
                level: 2,
                xp: 45,
                tasks: [
                    { id: 't_j1', title: 'Planilha comercial', type: 'Fixa', completed: false },
                    { id: 't_j2', title: 'Reuniões agendadas', type: 'Fixa', completed: false },
                    { id: 't_j3', title: 'Follow-up', type: 'Fixa', completed: false }
                ]
            }
        ];
    }

    function getDefaultCalendarEvents() {
        return [
            { id: 'e_1', title: 'Call de Alinhamento - Estética Revitalizze', date: '2026-06-16', time: '14:30', desc: 'Apresentação de proposta comercial', category: 'reuniao' },
            { id: 'e_2', title: 'Apresentação de Estratégia - WEYLL ESTETICA', date: '2026-06-18', time: '10:00', desc: 'Call no Meet', category: 'reuniao-agência' },
            { id: 'e_3', title: 'Corpo de Deus', date: '2026-06-04', time: '00:00', desc: 'Feriado Nacional', category: 'feriado' },
            { id: 'e_4', title: 'Dia dos Namorados', date: '2026-06-12', time: '00:00', desc: 'Dia dos Namorados no Brasil', category: 'feriado' },
            { id: 'e_5', title: '4 tarefas pendentes', date: '2026-06-17', time: '00:00', desc: 'Organizar prospecção, postar conteúdo, revisar financeiro, responder leads.', category: 'tarefa' }
        ];
    }

    function getDefaultPrompts() {
        return [
            { id: 'p_1', title: 'Posicionamento | Tráfego', category: 'GERAL', body: 'ESTRUTURA IDENTIFICADA:1. THREAD NARRATIVO (Storytelling em sequência)\n\nNão é post de dica para dono de negócio\nÉ uma HISTÓRIA que o dono de clínica, salão ou consultório viveu na pele.' },
            { id: 'p_2', title: 'Mios Bug', category: 'GERAL', body: 'MIOS MARKDOWN TITULO DESENVOLVIMENTO (ESPAÇO)\n\nEstrutura rápida para postagem no LinkedIn.' },
            { id: 'p_3', title: 'Notícia | 5 Slides', category: 'GERAL', body: 'Crie um carrossel estilo notícia com 5 slides sobre resultados obtidos com tráfego pago para uma cliente.\n\nCada slide deve conter uma headline curta com ponto final.' }
        ];
    }

    function getDefaultLibraryFiles(clientName) {
        return [];
    }

    /* ==========================================================================
       LOGIN PORTAL & MAIN ROUTING
       ========================================================================== */

    const loginScreen = document.getElementById('login-screen');
    const appShell = document.getElementById('app-shell');
    const roleBadgeLabel = document.getElementById('role-badge-label');
    const profileSelector = document.getElementById('profile-selector');

    const formClient = document.getElementById('form-login-auth');
    const formAdmin = document.getElementById('form-login-admin');
    
    const inputEmail = document.getElementById('login-email');
    const inputPassword = document.getElementById('login-password');
    const inputAdminCode = document.getElementById('admin-code');
    
    const loginError = document.getElementById('login-error-message');
    const logoutBtn = document.getElementById('btn-sidebar-logout');
    
    const btnGotoAdmin = document.getElementById('btn-goto-admin');
    const btnBackToClient = document.getElementById('btn-back-to-client');
    const btnCreateAccount = document.getElementById('btn-create-account');

    // Toggle screen views
    btnGotoAdmin?.addEventListener('click', () => {
        formClient.classList.add('hidden');
        formAdmin.classList.remove('hidden');
        loginError.classList.add('hidden');
        inputAdminCode.value = '';
    });

    btnBackToClient?.addEventListener('click', () => {
        formAdmin.classList.add('hidden');
        formClient.classList.remove('hidden');
        loginError.classList.add('hidden');
        inputEmail.value = '';
        inputPassword.value = '';
    });

    // Create Account Button (Premium message overlay or simple notification alert)
    btnCreateAccount?.addEventListener('click', () => {
        alert('A criação de conta direta pelo Hub está desabilitada temporariamente. Entre em contato com a administração da Founders para obter suas credenciais.');
    });

    // Client Login Submission (checks matching email and password)
    formClient?.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = inputEmail.value.trim().toLowerCase();
        const password = inputPassword.value;

        // Try to match client email and password
        const matchedClient = clients.find(c => c.email && c.email.toLowerCase() === email && c.password === password);
        
        if (matchedClient) {
            currentRole = 'client-' + matchedClient.id;
            const session = {
                role: 'client-' + matchedClient.id,
                email: email,
                timestamp: Date.now()
            };
            localStorage.setItem('founders_session', JSON.stringify(session));
            loginScreen.classList.add('hidden');
            appShell.classList.remove('hidden');
            populateProfileSelector();
            syncRolePortalInterface();
            loginError.classList.add('hidden');
        } else {
            loginError.textContent = "E-mail ou senha de cliente incorretos.";
            loginError.classList.remove('hidden');
        }
    });

    // Admin Login Submission (checks code 18231376)
    formAdmin?.addEventListener('submit', (e) => {
        e.preventDefault();
        const code = inputAdminCode.value.trim();

        if (code === '18231376') {
            currentRole = 'adm';
            const session = {
                role: 'adm',
                email: 'admin@founders.com.br',
                timestamp: Date.now()
            };
            localStorage.setItem('founders_session', JSON.stringify(session));
            loginScreen.classList.add('hidden');
            appShell.classList.remove('hidden');
            populateProfileSelector();
            syncRolePortalInterface();
            loginError.classList.add('hidden');
        } else {
            loginError.textContent = "Código de acesso administrativo inválido.";
            loginError.classList.remove('hidden');
        }
    });

    // Logout Action
    logoutBtn?.addEventListener('click', () => {
        localStorage.removeItem('founders_session');
        currentRole = 'adm';
        loginScreen.classList.remove('hidden');
        appShell.classList.add('hidden');
        
        // Show client login form by default on logout
        formAdmin.classList.add('hidden');
        formClient.classList.remove('hidden');
        
        inputEmail.value = '';
        inputPassword.value = '';
        inputAdminCode.value = '';
        loginError.classList.add('hidden');
    });

    function populateProfileSelector() {
        profileSelector.innerHTML = '<option value="adm">Dono da Agência (ADM)</option>';
        clients.forEach(c => {
            const opt = document.createElement('option');
            opt.value = `client-${c.id}`;
            opt.textContent = `Cliente: ${c.name}`;
            if (currentRole === `client-${c.id}`) {
                opt.selected = true;
            }
            profileSelector.appendChild(opt);
        });
        
        if (currentRole === 'adm') {
            profileSelector.value = 'adm';
        }
    }

    // Toggle ADM menu vs Client menu on role switcher changes
    profileSelector.addEventListener('change', (e) => {
        currentRole = e.target.value;
        saveCurrentRole();
        syncRolePortalInterface();
    });

    function syncRolePortalInterface() {
        const menuAdm = document.getElementById('sidebar-menu-adm');
        const menuClient = document.getElementById('sidebar-menu-client');
        
        if (currentRole === 'adm') {
            // Show ADM Sidebar, Hide Client Sidebar
            menuAdm.classList.remove('hidden');
            menuClient.classList.add('hidden');
            
            // Update role indicator badge
            roleBadgeLabel.textContent = 'Dono da Agência (ADM)';
            roleBadgeLabel.classList.remove('client-mode');

            // Default to hub
            showView('hub');
        } else {
            // Client Mode
            const clientId = currentRole.replace('client-', '');
            const activeClient = clients.find(c => c.id === clientId);

            if (activeClient) {
                menuAdm.classList.add('hidden');
                menuClient.classList.remove('hidden');

                // Update client name in header and sidebar title
                document.getElementById('client-sidebar-title').textContent = `PORTAL: ${activeClient.name.toUpperCase()}`;
                roleBadgeLabel.textContent = `Cliente: ${activeClient.name}`;
                roleBadgeLabel.classList.add('client-mode');

                // Default view for clients
                showView('client-dashboard');
            } else {
                // Fail-safe
                currentRole = 'adm';
                saveCurrentRole();
                syncRolePortalInterface();
            }
        }
    }

    // Central Router
    const navItems = document.querySelectorAll('.nav-item, .sub-nav-item');
    const viewPanes = document.querySelectorAll('.view-pane');

    function showView(viewName) {
        // Enforce role-based access control (RBAC)
        const isClientView = viewName.startsWith('client-') && viewName !== 'client-detail';
        if (currentRole !== 'adm' && !isClientView) {
            // Redirect clients to client dashboard if they try to access admin views
            showView('client-dashboard');
            return;
        }
        if (currentRole === 'adm' && isClientView) {
            // Redirect admins to admin hub if they try to access client views
            showView('hub');
            return;
        }

        // Remove active class from all links
        navItems.forEach(item => {
            if (item.getAttribute('data-view') === viewName) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });

        // Hide all view panes
        viewPanes.forEach(pane => {
            if (pane.id === `view-${viewName}`) {
                pane.classList.add('active');
            } else {
                pane.classList.remove('active');
            }
        });

        // View-specific loaders
        if (viewName === 'hub') initHubView();
        else if (viewName === 'prospeccao') initProspeccaoView();
        else if (viewName === 'listas') initListasView();
        else if (viewName === 'crm') initCrmView();
        else if (viewName === 'dashboard') initDashboardView();
        else if (viewName === 'scripts') initScriptsView();
        else if (viewName === 'demandas') initDemandasView();
        else if (viewName === 'calendario') initCalendarView();
        else if (viewName === 'calculadora') initCalculadoraView();
        else if (viewName === 'contador') initContadorView();
        else if (viewName === 'cidades') initCidadesView();
        else if (viewName === 'prompts') initPromptsView();
        else if (viewName === 'clientes') initClientesView();
        else if (viewName === 'client-detail') initClientDetailView();
        else if (viewName === 'financeiro') initFinanceiroView();
        else if (viewName === 'alertas') initAlertasView();
        else if (viewName === 'producao') initProducaoView();
        else if (viewName === 'aprovacoes') initAprovacoesView();
        else if (viewName === 'client-dashboard') initClientDashboardView();
        else if (viewName === 'client-demandas') initClientPortalDemandasView();
        else if (viewName === 'client-posts') initClientPortalPostsView();
        else if (viewName === 'client-aprovacoes') initClientPortalApprovalsView();
        else if (viewName === 'client-financeiro') initClientPortalFinanceiroView();
        else if (viewName === 'client-insights') initClientPortalInsightsView();
        else if (viewName === 'client-calendario-gcal') initClientPortalCalendarioView();
        else if (viewName === 'client-arquivos') initClientPortalLibraryView();
        else if (viewName === 'client-relatorios') initClientPortalRelatoriosView();
    }

    // Handles sidebar item click routing
    document.querySelectorAll('.nav-item, .sub-nav-item').forEach(el => {
        el.addEventListener('click', (e) => {
            e.preventDefault();
            const view = el.getAttribute('data-view');
            if (view) {
                showView(view);
                
                // Close mobile sidebar if open
                const sidebarEl = document.querySelector('.app-sidebar');
                const overlayEl = document.getElementById('sidebar-mobile-overlay');
                if (sidebarEl) sidebarEl.classList.remove('mobile-open');
                if (overlayEl) overlayEl.classList.remove('active');
                
                // If it's a subnav item, make sure "Comercial" is marked as active
                if (el.classList.contains('sub-nav-item')) {
                    document.getElementById('comercial-toggle').classList.add('active');
                } else {
                    document.getElementById('comercial-toggle').classList.remove('active');
                }
            }
        });
    });

    // Submenu Toggle logic
    const comercialToggle = document.getElementById('comercial-toggle');
    const comercialSubmenu = document.getElementById('comercial-submenu-list');

    comercialToggle.addEventListener('click', () => {
        comercialToggle.classList.toggle('submenu-open');
        comercialSubmenu.classList.toggle('collapsed');
    });

    // Initial check for session validity (2 hours = 7.200.000 ms)
    const session = JSON.parse(localStorage.getItem('founders_session'));
    if (session && session.role && session.timestamp && (Date.now() - session.timestamp < 7200000)) {
        currentRole = session.role;
        loginScreen.classList.add('hidden');
        appShell.classList.remove('hidden');
        populateProfileSelector();
        syncRolePortalInterface();
    } else {
        localStorage.removeItem('founders_session');
        loginScreen.classList.remove('hidden');
        appShell.classList.add('hidden');
    }

    /* ==========================================================================
       VIEW: CLIENTES ADM LOGIC
       ========================================================================== */

    function initClientesView() {
        renderClientesGrid();
    }

    function renderClientesGrid() {
        const wrapper = document.getElementById('clients-grid-wrapper');
        wrapper.innerHTML = '';

        if (clients.length === 0) {
            wrapper.innerHTML = '<div class="empty-state-text" style="grid-column: 1/-1;">Nenhum cliente cadastrado.</div>';
            return;
        }

        clients.forEach(c => {
            const card = document.createElement('div');
            card.className = 'client-manage-card';
            card.setAttribute('data-id', c.id);
            
            const initials = c.name.substring(0, 2).toUpperCase();
            
            // Stats counts for display
            const pendingDemands = c.demands ? c.demands.filter(d => !d.completed).length : 0;
            const scheduledPosts = c.posts ? c.posts.length : 0;
            const pendingApprovals = c.approvals ? c.approvals.filter(a => a.status === 'Pendente').length : 0;

            let avatarHtml = '';
            if (c.photo && (c.photo.startsWith('http') || c.photo.startsWith('data:') || c.photo.includes('/') || c.photo.includes('.'))) {
                avatarHtml = `<div class="client-card-avatar" style="background-image: url('${c.photo}'); background-size: cover; background-position: center; border: 1px solid var(--color-accent-gold);"></div>`;
            } else {
                avatarHtml = `<div class="client-card-avatar ${c.photo || 'avatar-gold'}">${initials}</div>`;
            }

            card.innerHTML = `
                <div>
                    <div class="client-card-header-row">
                        ${avatarHtml}
                        <div class="client-card-title-info">
                            <h3>${c.name}</h3>
                            <span class="client-card-status-badge status-active-badge">Ativo</span>
                        </div>
                    </div>
                    
                    <div class="client-card-finance-info">
                        <div class="client-card-finance-row">
                            <span>Contrato:</span>
                            <strong>R$ ${c.value.toLocaleString('pt-BR')} /mês</strong>
                        </div>
                        <div class="client-card-finance-row">
                            <span>Vencimento:</span>
                            <strong>Dia ${c.payday}</strong>
                        </div>
                    </div>
                    
                    <div style="margin-top: 15px; display:flex; flex-direction:column; gap:4px; font-size:12px; color: var(--color-text-muted);">
                        <span style="display: inline-flex; align-items: center;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14" style="vertical-align: middle; margin-right: 6px;"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg> ${pendingDemands} demandas pendentes</span>
                        <span style="display: inline-flex; align-items: center;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14" style="vertical-align: middle; margin-right: 6px;"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg> ${scheduledPosts} posts agendados</span>
                        <span style="display: inline-flex; align-items: center;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14" style="vertical-align: middle; margin-right: 6px;"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg> ${pendingApprovals} aguardando aprovação</span>
                    </div>
                </div>
                
                <div class="client-card-actions-row" style="display: flex; justify-content: space-between; align-items: center; margin-top: 15px; padding-top: 10px; border-top: 1px solid var(--color-bg-tertiary);">
                    <span class="edit-client-btn" data-id="${c.id}" style="display: inline-flex; align-items: center; gap: 4px; color: var(--color-accent-gold); cursor: pointer;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14" style="color: var(--color-accent-gold);"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg> Editar</span>
                    <span class="delete-client-btn" data-id="${c.id}" style="display: inline-flex; align-items: center; gap: 4px; color: #fc8181; cursor: pointer;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14" style="color: #fc8181;"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg> Deletar</span>
                </div>
            `;
            wrapper.appendChild(card);
        });
    }

    // Handles clicks inside client cards
    document.getElementById('clients-grid-wrapper').addEventListener('click', (e) => {
        const deleteBtn = e.target.closest('.delete-client-btn');
        const editBtn = e.target.closest('.edit-client-btn');
        const card = e.target.closest('.client-manage-card');
        
        if (deleteBtn) {
            e.stopPropagation();
            const id = deleteBtn.getAttribute('data-id');
            const client = clients.find(c => c.id === id);
            if (client && confirm(`Tem certeza de que deseja deletar a conta do cliente "${client.name}" e todos os seus dados?`)) {
                clients = clients.filter(c => c.id !== id);
                saveClients();
                if (supabase) {
                    supabase.from('clients').delete().eq('id', id).then(() => {
                        console.log("Cliente deletado do Supabase:", id);
                    });
                }
                populateProfileSelector();
                renderClientesGrid();
            }
            return;
        }

        if (editBtn) {
            e.stopPropagation();
            const id = editBtn.getAttribute('data-id');
            openEditClientModal(id);
            return;
        }

        if (card) {
            const id = card.getAttribute('data-id');
            selectedClientDetailId = id;
            showView('client-detail');
        }
    });

    // Image Upload & Preview variables
    let tempAddClientPhotoBase64 = '';
    let tempEditClientPhotoBase64 = '';

    // Add Client submit form
    document.getElementById('form-add-client').addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('client-name').value.trim();
        const value = parseFloat(document.getElementById('client-value').value) || 0;
        const payday = parseInt(document.getElementById('client-payday').value) || 10;
        const duration = parseInt(document.getElementById('client-duration').value) || 12;
        const startDate = document.getElementById('client-startdate').value;
        const email = document.getElementById('client-email').value.trim().toLowerCase();
        const password = document.getElementById('client-password').value;

        let photo = document.getElementById('client-photo').value.trim();
        if (tempAddClientPhotoBase64) {
            photo = tempAddClientPhotoBase64;
        }

        const newClient = {
            id: 'c_' + Math.random().toString(36).substr(2, 9),
            name,
            email,
            password,
            value,
            payday,
            duration,
            startDate,
            photo,
            status: 'active',
            paymentStatus: 'Pendente',
            demands: [],
            posts: [],
            approvals: []
        };

        clients.push(newClient);
        saveClients();
        populateProfileSelector();
        
        closeModal('modal-add-client');
        document.getElementById('form-add-client').reset();
        tempAddClientPhotoBase64 = '';
        document.getElementById('client-photo-preview-container').style.display = 'none';
        
        renderClientesGrid();
    });

    // Image Upload & Preview logic for ADD CLIENT
    const addPhotoInput = document.getElementById('client-photo');
    const addPhotoFileInput = document.getElementById('client-photo-file');
    const addPreviewContainer = document.getElementById('client-photo-preview-container');
    const addPreviewImg = document.getElementById('client-photo-preview');
    const addPreviewName = document.getElementById('client-photo-preview-name');
    const addRemoveBtn = document.getElementById('btn-remove-client-photo');

    addPhotoFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                tempAddClientPhotoBase64 = event.target.result;
                addPhotoInput.value = '';
                addPreviewContainer.style.display = 'flex';
                addPreviewImg.style.backgroundImage = `url('${tempAddClientPhotoBase64}')`;
                addPreviewName.textContent = file.name;
            };
            reader.readAsDataURL(file);
        }
    });

    addPhotoInput.addEventListener('input', (e) => {
        const url = e.target.value.trim();
        tempAddClientPhotoBase64 = '';
        addPhotoFileInput.value = '';
        if (url.startsWith('http') || url.startsWith('data:') || url.includes('/') || url.includes('.')) {
            addPreviewContainer.style.display = 'flex';
            addPreviewImg.style.backgroundImage = `url('${url}')`;
            addPreviewName.textContent = 'URL da Imagem';
        } else {
            addPreviewContainer.style.display = 'none';
        }
    });

    addRemoveBtn.addEventListener('click', () => {
        tempAddClientPhotoBase64 = '';
        addPhotoInput.value = '';
        addPhotoFileInput.value = '';
        addPreviewContainer.style.display = 'none';
    });

    // Image Upload & Preview logic for EDIT CLIENT
    const editPhotoInput = document.getElementById('edit-client-photo');
    const editPhotoFileInput = document.getElementById('edit-client-photo-file');
    const editPreviewContainer = document.getElementById('edit-client-photo-preview-container');
    const editPreviewImg = document.getElementById('edit-client-photo-preview');
    const editPreviewName = document.getElementById('edit-client-photo-preview-name');
    const editRemoveBtn = document.getElementById('edit-btn-remove-client-photo');

    editPhotoFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                tempEditClientPhotoBase64 = event.target.result;
                editPhotoInput.value = '';
                editPreviewContainer.style.display = 'flex';
                editPreviewImg.style.backgroundImage = `url('${tempEditClientPhotoBase64}')`;
                editPreviewName.textContent = file.name;
            };
            reader.readAsDataURL(file);
        }
    });

    editPhotoInput.addEventListener('input', (e) => {
        const url = e.target.value.trim();
        tempEditClientPhotoBase64 = '';
        editPhotoFileInput.value = '';
        if (url.startsWith('http') || url.startsWith('data:') || url.includes('/') || url.includes('.')) {
            editPreviewContainer.style.display = 'flex';
            editPreviewImg.style.backgroundImage = `url('${url}')`;
            editPreviewName.textContent = 'URL da Imagem';
        } else {
            editPreviewContainer.style.display = 'none';
        }
    });

    editRemoveBtn.addEventListener('click', () => {
        tempEditClientPhotoBase64 = '';
        editPhotoInput.value = '';
        editPhotoFileInput.value = '';
        editPreviewContainer.style.display = 'none';
    });

    // Bind Edit Client Contract trigger
    document.getElementById('btn-edit-client-contract')?.addEventListener('click', () => {
        if (selectedClientDetailId) {
            openEditClientModal(selectedClientDetailId);
        }
    });

    // Open Edit Client Modal Function
    function openEditClientModal(clientId) {
        const client = clients.find(c => c.id === clientId);
        if (!client) return;

        document.getElementById('edit-client-id').value = client.id;
        document.getElementById('edit-client-name').value = client.name;
        document.getElementById('edit-client-value').value = client.value;
        document.getElementById('edit-client-payday').value = client.payday;
        document.getElementById('edit-client-duration').value = client.duration || 12;
        document.getElementById('edit-client-startdate').value = client.startDate || '';
        document.getElementById('edit-client-email').value = client.email || '';
        document.getElementById('edit-client-password').value = client.password || '';
        document.getElementById('edit-client-photo').value = (client.photo && !client.photo.startsWith('data:')) ? client.photo : '';
        
        // Handle photo preview
        tempEditClientPhotoBase64 = '';
        document.getElementById('edit-client-photo-file').value = '';

        if (client.photo) {
            if (client.photo.startsWith('data:')) {
                tempEditClientPhotoBase64 = client.photo;
                editPreviewContainer.style.display = 'flex';
                editPreviewImg.style.backgroundImage = `url('${client.photo}')`;
                editPreviewName.textContent = 'Imagem carregada';
            } else if (client.photo.startsWith('http') || client.photo.includes('/') || client.photo.includes('.')) {
                editPreviewContainer.style.display = 'flex';
                editPreviewImg.style.backgroundImage = `url('${client.photo}')`;
                editPreviewName.textContent = 'URL da Imagem';
            } else {
                editPreviewContainer.style.display = 'none';
            }
        } else {
            editPreviewContainer.style.display = 'none';
        }

        openModal('modal-edit-client');
    }

    // Edit Client Submit Form
    document.getElementById('form-edit-client').addEventListener('submit', (e) => {
        e.preventDefault();
        const id = document.getElementById('edit-client-id').value;
        const name = document.getElementById('edit-client-name').value.trim();
        const value = parseFloat(document.getElementById('edit-client-value').value) || 0;
        const payday = parseInt(document.getElementById('edit-client-payday').value) || 10;
        const duration = parseInt(document.getElementById('edit-client-duration').value) || 12;
        const startDate = document.getElementById('edit-client-startdate').value;
        const email = document.getElementById('edit-client-email').value.trim().toLowerCase();
        const password = document.getElementById('edit-client-password').value;
        
        let photo = document.getElementById('edit-client-photo').value.trim();
        if (tempEditClientPhotoBase64) {
            photo = tempEditClientPhotoBase64;
        }

        const client = clients.find(c => c.id === id);
        if (client) {
            client.name = name;
            client.value = value;
            client.payday = payday;
            client.duration = duration;
            client.startDate = startDate;
            client.email = email;
            client.password = password;
            client.photo = photo;

            saveClients();
            populateProfileSelector();
            
            closeModal('modal-edit-client');
            document.getElementById('form-edit-client').reset();
            tempEditClientPhotoBase64 = '';
            document.getElementById('edit-client-photo-preview-container').style.display = 'none';
            
            // Re-render views
            renderClientesGrid();
            if (selectedClientDetailId === id) {
                initClientDetailView();
            }
            initFinanceiroView();
        }
    });

    /* ==========================================================================
       VIEW: CLIENT DETAILED WORKSPACE (ADM VIEW)
       ========================================================================== */

    let activeDetailTab = 'demandas';

    function initClientDetailView() {
        const client = clients.find(c => c.id === selectedClientDetailId);
        if (!client) {
            showView('clientes');
            return;
        }

        // Render basic header/sidebar info
        document.getElementById('detail-client-name').textContent = client.name;
        document.getElementById('detail-client-contract-summary').textContent = `Contrato R$ ${client.value.toLocaleString('pt-BR')} / mês`;
        
        const avatarBox = document.getElementById('detail-client-avatar');
        if (client.photo && (client.photo.startsWith('http') || client.photo.startsWith('data:') || client.photo.includes('/') || client.photo.includes('.'))) {
            avatarBox.className = 'detail-avatar-box';
            avatarBox.style.backgroundImage = `url('${client.photo}')`;
            avatarBox.style.backgroundSize = 'cover';
            avatarBox.style.backgroundPosition = 'center';
            avatarBox.style.border = '1px solid var(--color-accent-gold)';
            avatarBox.textContent = '';
        } else {
            avatarBox.className = `detail-avatar-box ${client.photo || 'avatar-gold'}`;
            avatarBox.style.backgroundImage = 'none';
            avatarBox.style.border = 'none';
            avatarBox.textContent = client.name.substring(0, 2).toUpperCase();
        }

        document.getElementById('detail-client-value').textContent = `R$ ${client.value.toLocaleString('pt-BR')},00`;
        document.getElementById('detail-client-payday').textContent = `Dia ${client.payday}`;
        document.getElementById('detail-client-duration').textContent = `${client.duration} meses`;
        
        let dateStr = '00/00/0000';
        if (client.startDate && client.startDate.includes('-')) {
            const parts = client.startDate.split('-');
            if (parts.length === 3) {
                dateStr = `${parts[2]}/${parts[1]}/${parts[0]}`;
            }
        }
        document.getElementById('detail-client-startdate').textContent = dateStr;

        // Render sub-tabs content
        renderClientDetailTabContent(client);
    }

    function renderClientDetailTabContent(client) {
        if (activeDetailTab === 'demandas') {
            const list = document.getElementById('detail-demands-list');
            list.innerHTML = '';
            
            if (!client.demands || client.demands.length === 0) {
                list.innerHTML = '<div class="empty-state-text">Nenhuma demanda pendente para este cliente.</div>';
                return;
            }

            client.demands.forEach((d, idx) => {
                const row = document.createElement('div');
                row.className = `task-row ${d.completed ? 'completed' : ''}`;
                row.innerHTML = `
                    <div class="task-checkbox ${d.completed ? 'completed' : ''}"></div>
                    <span class="task-title"><strong>${d.title}</strong>${d.desc ? `<br><small style="color:var(--color-text-muted);">${d.desc}</small>` : ''}</span>
                    <span class="task-delete-btn delete-client-demand" data-idx="${idx}" style="display: inline-flex; align-items: center; justify-content: center; width: 20px; height: 20px; color: var(--color-text-muted);"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></span>
                `;
                list.appendChild(row);
            });
        }
        
        else if (activeDetailTab === 'posts') {
            const list = document.getElementById('detail-posts-list');
            list.innerHTML = '';

            if (!client.posts || client.posts.length === 0) {
                list.innerHTML = '<div class="empty-state-text">Nenhum post agendado.</div>';
                return;
            }

            client.posts.forEach((p, idx) => {
                const row = document.createElement('div');
                row.className = 'task-row';
                
                const [year, month, day] = p.date.split('-');
                const formattedDate = `${day}/${month}/${year}`;

                row.innerHTML = `
                    <span class="task-title" style="cursor:pointer;"><strong>${p.title}</strong><br><small style="color:var(--color-text-muted);">Rede: ${p.network} | Tipo: ${p.type} | Data: ${formattedDate}</small></span>
                    <span class="task-delete-btn delete-client-post" data-idx="${idx}" style="display: inline-flex; align-items: center; justify-content: center; width: 20px; height: 20px; color: var(--color-text-muted);"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></span>
                `;
                row.querySelector('.task-title').addEventListener('click', () => {
                    openContentPreview(p, 'post', client);
                });
                list.appendChild(row);
            });
        }
        
        else if (activeDetailTab === 'aprovacao') {
            const list = document.getElementById('detail-approvals-list');
            list.innerHTML = '';

            if (!client.approvals || client.approvals.length === 0) {
                list.innerHTML = '<div class="empty-state-text">Nenhum arquivo enviado para aprovação.</div>';
                return;
            }

            client.approvals.forEach((a, idx) => {
                const card = document.createElement('div');
                card.className = 'task-row';
                
                let badgeClass = 'app-status-pending';
                if (a.status === 'Aprovado') badgeClass = 'app-status-approved';
                else if (a.status === 'Rejeitado') badgeClass = 'app-status-rejected';

                card.innerHTML = `
                    <span class="task-title" style="cursor:pointer;">
                        <strong>${a.title}</strong> <span class="approval-status-label ${badgeClass}" style="display:inline-block; font-size:9px; padding: 1px 6px; margin-left: 10px;">${a.status}</span>
                        <br><small style="color:var(--color-text-muted);">Rede: ${a.network || 'Instagram'} | Tipo: ${a.type}</small>
                        ${a.adjustments ? `<br><small style="color:#fc8181; font-weight:500;">Ajustes solicitados: "${a.adjustments}"</small>` : ''}
                    </span>
                    <span class="task-delete-btn delete-client-approval" data-idx="${idx}" style="display: inline-flex; align-items: center; justify-content: center; width: 20px; height: 20px; color: var(--color-text-muted);"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></span>
                `;
                card.querySelector('.task-title').addEventListener('click', () => {
                    openContentPreview(a, 'approval', client);
                });
                list.appendChild(card);
            });
        }
        
        else if (activeDetailTab === 'instagram') {
            document.getElementById('insights-username').value = client.instagramUsername || '';
            document.getElementById('insights-followers').value = client.instagramFollowers || '';
            document.getElementById('insights-reach').value = client.instagramReach || '';
            document.getElementById('insights-engagement').value = client.instagramEngagement || '';
            document.getElementById('insights-visits').value = client.instagramVisits || '';
            document.getElementById('insights-chart-points').value = client.instagramChartPoints || '';
        }
    }

    // Handles sub-tabs selections
    document.querySelectorAll('.detail-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.detail-tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.detail-tab-pane').forEach(p => p.classList.remove('active'));

            btn.classList.add('active');
            activeDetailTab = btn.getAttribute('data-detail-tab');
            
            const pane = document.getElementById(`detail-tab-${activeDetailTab}`);
            if (pane) pane.classList.add('active');

            const client = clients.find(c => c.id === selectedClientDetailId);
            if (client) renderClientDetailTabContent(client);
        });
    });

    document.getElementById('btn-back-clients').addEventListener('click', () => {
        showView('clientes');
    });

    // Detail lists actions (toggles, deletes)
    document.getElementById('detail-tab-demandas').addEventListener('click', (e) => {
        const client = clients.find(c => c.id === selectedClientDetailId);
        if (!client) return;

        // Toggle completion status
        const checkbox = e.target.closest('.task-checkbox');
        if (checkbox) {
            const row = checkbox.closest('.task-row');
            const demandsList = Array.from(row.parentNode.children);
            const idx = demandsList.indexOf(row);
            
            if (idx !== -1 && client.demands[idx]) {
                client.demands[idx].completed = !client.demands[idx].completed;
                saveClients();
                renderClientDetailTabContent(client);
            }
        }
        
        // Delete demand
        const delBtn = e.target.closest('.delete-client-demand');
        if (delBtn) {
            const idx = parseInt(delBtn.getAttribute('data-idx'));
            if (confirm('Deletar essa tarefa?')) {
                client.demands.splice(idx, 1);
                saveClients();
                renderClientDetailTabContent(client);
            }
        }
    });

    document.getElementById('detail-tab-posts').addEventListener('click', (e) => {
        const delBtn = e.target.closest('.delete-client-post');
        if (delBtn) {
            const idx = parseInt(delBtn.getAttribute('data-idx'));
            const client = clients.find(c => c.id === selectedClientDetailId);
            if (client && confirm('Remover post agendado?')) {
                client.posts.splice(idx, 1);
                saveClients();
                renderClientDetailTabContent(client);
            }
        }
    });

    document.getElementById('detail-tab-aprovacao').addEventListener('click', (e) => {
        const delBtn = e.target.closest('.delete-client-approval');
        if (delBtn) {
            const idx = parseInt(delBtn.getAttribute('data-idx'));
            const client = clients.find(c => c.id === selectedClientDetailId);
            if (client && confirm('Deletar arquivo de aprovação?')) {
                client.approvals.splice(idx, 1);
                saveClients();
                renderClientDetailTabContent(client);
            }
        }
    });

    // Add shortcuts clicks in Client management tabs
    document.getElementById('btn-add-client-demand').addEventListener('click', () => {
        openModal('modal-add-client-demand');
    });

    document.getElementById('btn-add-client-post').addEventListener('click', () => {
        openModal('modal-add-client-post');
        document.getElementById('client-post-date').value = new Date().toISOString().substring(0, 10);
    });

    document.getElementById('btn-add-client-approval').addEventListener('click', () => {
        openModal('modal-add-client-approval');
    });

    // Forms submission for client detailed items
    document.getElementById('form-add-client-demand').addEventListener('submit', (e) => {
        e.preventDefault();
        const client = clients.find(c => c.id === selectedClientDetailId);
        if (!client) return;

        const title = document.getElementById('client-demand-title').value.trim();
        const desc = document.getElementById('client-demand-desc').value.trim();

        if (!client.demands) client.demands = [];
        
        client.demands.push({
            id: 'cd_' + Math.random().toString(36).substr(2, 9),
            title,
            desc,
            completed: false
        });

        saveClients();
        closeModal('modal-add-client-demand');
        document.getElementById('form-add-client-demand').reset();
        
        renderClientDetailTabContent(client);
    });

    // Helper to read multiple files
    function setupFileUpload(btnId, fileInputId, textInputId, previewContainerId, storageArray) {
        const btn = document.getElementById(btnId);
        const fileInput = document.getElementById(fileInputId);
        const textInput = document.getElementById(textInputId);
        const preview = document.getElementById(previewContainerId);

        if (btn && fileInput) {
            btn.addEventListener('click', () => fileInput.click());
            fileInput.addEventListener('change', (e) => {
                const files = e.target.files;
                if (!files || files.length === 0) return;

                storageArray.length = 0;

                if (preview) {
                    preview.innerHTML = '';
                    preview.style.display = 'flex';
                }

                const fileNames = [];

                Array.from(files).forEach(file => {
                    fileNames.push(file.name);
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        const base64 = event.target.result;
                        storageArray.push(base64);

                        if (preview) {
                            const imgWrap = document.createElement('div');
                            imgWrap.style.cssText = 'position: relative; width: 60px; height: 60px; border-radius: 4px; overflow: hidden; border: 1px solid var(--color-accent-gold);';
                            
                            if (file.type.startsWith('image/')) {
                                imgWrap.innerHTML = `<img src="${base64}" style="width:100%; height:100%; object-fit:cover;">`;
                            } else {
                                imgWrap.innerHTML = `
                                    <div style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; background:var(--color-bg-secondary); color:var(--color-accent-gold); font-size:10px; text-align:center; word-break:break-all; padding:2px;">
                                        ${file.name.split('.').pop().toUpperCase()}
                                    </div>`;
                            }
                            preview.appendChild(imgWrap);
                        }
                    };
                    reader.readAsDataURL(file);
                });

                if (textInput) {
                    textInput.value = fileNames.join(', ');
                }
            });
        }
    }

    // Initialize the file uploaders
    setupFileUpload('btn-upload-post-media', 'client-post-media-file', 'client-post-media-url', 'post-media-preview-container', selectedPostMediaFiles);
    setupFileUpload('btn-upload-app-media', 'client-app-media-file', 'client-app-media-url', 'app-media-preview-container', selectedAppMediaFiles);
    setupFileUpload('btn-upload-prod-media', 'prod-conteudo-media-file', 'prod-conteudo-media', 'prod-media-preview-container', selectedProdMediaFiles);

    // Setup library file uploader
    const btnLib = document.getElementById('btn-upload-library-file');
    const fileLib = document.getElementById('prod-library-file-input');
    if (btnLib && fileLib) {
        btnLib.addEventListener('click', () => fileLib.click());
        fileLib.addEventListener('change', (e) => {
            const files = e.target.files;
            if (!files || files.length === 0) return;
            const file = files[0];
            
            const nameInput = document.getElementById('prod-file-name');
            if (nameInput) nameInput.value = file.name;
            
            const sizeInput = document.getElementById('prod-file-size');
            if (sizeInput) {
                const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
                sizeInput.value = `${sizeMB} MB`;
            }
            
            const reader = new FileReader();
            reader.onload = (event) => {
                const urlInput = document.getElementById('prod-file-url');
                if (urlInput) urlInput.value = event.target.result;
            };
                        reader.readAsDataURL(file);
        });
    }

    // Alert file uploader listener
    const alertUploader = document.getElementById('alert-file-uploader');
    if (alertUploader) {
        alertUploader.addEventListener('change', (e) => {
            const files = e.target.files;
            if (!files || files.length === 0) return;
            const file = files[0];
            const alertId = alertUploader.dataset.activeAlertId;
            if (!alertId) return;

            const reader = new FileReader();
            reader.onload = (event) => {
                const fileData = event.target.result;
                
                // Process the upload based on alertId
                if (alertId.startsWith('al_ops_task_')) {
                    const parts = alertId.split('_');
                    const pIdx = parseInt(parts[3]);
                    const tIdx = parseInt(parts[4]);
                    if (playerRoutines[pIdx] && playerRoutines[pIdx].tasks[tIdx]) {
                        playerRoutines[pIdx].tasks[tIdx].completed = true;
                        playerRoutines[pIdx].tasks[tIdx].mediaFile = fileData;
                        playerRoutines[pIdx].tasks[tIdx].mediaFileName = file.name;
                        localStorage.setItem('founders_player_routines', JSON.stringify(playerRoutines));
                        if (typeof renderPlayerRoutines === 'function') renderPlayerRoutines();
                        showNotification('Arquivo enviado e rotina concluída!');
                    }
                } else if (alertId.startsWith('al_cont_app_') || alertId.startsWith('al_cont_rej_')) {
                    const parts = alertId.split('_');
                    const cId = parts[3];
                    const aId = parts[4];
                    const client = clients.find(c => c.id === cId);
                    if (client && client.approvals) {
                        const approval = client.approvals.find(app => app.id === aId || client.approvals.indexOf(app) === parseInt(aId));
                        if (approval) {
                            if (!approval.mediaFiles) approval.mediaFiles = [];
                            approval.mediaFiles.push(fileData);
                            approval.status = 'Pendente'; // new content upload goes back to pending review
                            saveClients();

                            if (approval.opContentId) {
                                const opItem = operationalContents.find(op => op.id === approval.opContentId);
                                if (opItem) {
                                    if (!opItem.mediaFiles) opItem.mediaFiles = [];
                                    opItem.mediaFiles.push(fileData);
                                    opItem.status = 'Em Aprovação';
                                    saveOperationalContents();
                                }
                            }
                            showNotification('Mídia enviada para aprovação!');
                        }
                    }
                }
                
                if (!dismissedAlerts.includes(alertId)) {
                    dismissedAlerts.push(alertId);
                    saveDismissedAlerts();
                }
                renderAlertsList();
            };
            reader.readAsDataURL(file);
        });
    }

    document.getElementById('form-add-client-post').addEventListener('submit', (e) => {
        e.preventDefault();
        const client = clients.find(c => c.id === selectedClientDetailId);
        if (!client) return;

        const title = document.getElementById('client-post-title').value.trim();
        const date = document.getElementById('client-post-date').value;
        const network = document.getElementById('client-post-network').value;
        const type = document.getElementById('client-post-type').value;
        const thumbnail = document.getElementById('client-post-thumbnail').value;

        if (!client.posts) client.posts = [];

        const customMediaUrl = document.getElementById('client-post-media-url').value.trim();
        let mediaFiles = [...selectedPostMediaFiles];
        if (customMediaUrl && !selectedPostMediaFiles.length && !customMediaUrl.includes(', ')) {
            mediaFiles.push(customMediaUrl);
        }

        client.posts.push({
            id: 'cp_' + Math.random().toString(36).substr(2, 9),
            title,
            date,
            network,
            type,
            thumbnail,
            mediaFiles: mediaFiles
        });

        saveClients();
        closeModal('modal-add-client-post');
        document.getElementById('form-add-client-post').reset();
        
        // Reset upload preview and state
        selectedPostMediaFiles = [];
        const previewCont = document.getElementById('post-media-preview-container');
        if (previewCont) {
            previewCont.innerHTML = '';
            previewCont.style.display = 'none';
        }

        renderClientDetailTabContent(client);
    });

    document.getElementById('form-add-client-approval').addEventListener('submit', (e) => {
        e.preventDefault();
        const client = clients.find(c => c.id === selectedClientDetailId);
        if (!client) return;

        const title = document.getElementById('client-app-title').value.trim();
        const type = document.getElementById('client-app-type').value;
        const network = document.getElementById('client-app-network').value;
        const body = document.getElementById('client-app-body').value.trim();
        const caption = document.getElementById('client-app-caption').value.trim();
        const thumbnail = document.getElementById('client-app-thumbnail').value;

        if (!client.approvals) client.approvals = [];

        const customMediaUrl = document.getElementById('client-app-media-url').value.trim();
        let mediaFiles = [...selectedAppMediaFiles];
        if (customMediaUrl && !selectedAppMediaFiles.length && !customMediaUrl.includes(', ')) {
            mediaFiles.push(customMediaUrl);
        }

        client.approvals.push({
            id: 'ca_' + Math.random().toString(36).substr(2, 9),
            title,
            type,
            network,
            body,
            caption,
            status: 'Pendente',
            adjustments: '',
            thumbnail,
            mediaFiles: mediaFiles
        });

        saveClients();
        closeModal('modal-add-client-approval');
        document.getElementById('form-add-client-approval').reset();

        renderClientDetailTabContent(client);
    });

    document.getElementById('form-client-instagram-insights').addEventListener('submit', (e) => {
        e.preventDefault();
        const client = clients.find(c => c.id === selectedClientDetailId);
        if (!client) return;

        client.instagramUsername = document.getElementById('insights-username').value.trim();
        client.instagramFollowers = parseInt(document.getElementById('insights-followers').value) || 0;
        client.instagramReach = parseInt(document.getElementById('insights-reach').value) || 0;
        client.instagramEngagement = parseFloat(document.getElementById('insights-engagement').value) || 0.0;
        client.instagramVisits = parseInt(document.getElementById('insights-visits').value) || 0;
        client.instagramChartPoints = document.getElementById('insights-chart-points').value.trim();

        saveClients();
        alert('Métricas do Instagram salvas com sucesso!');
        renderClientDetailTabContent(client);
    });

    /* ==========================================================================
       VIEW: FINANCEIRO ADM LOGIC
       ========================================================================== */

    let finSubtabsInitialized = false;
    let currentScenario = 'realista'; // global scenario variable

    function initFinanceiroSubtabs() {
        if (finSubtabsInitialized) return;
        document.querySelectorAll('#view-financeiro .saas-subtab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const targetSubview = btn.getAttribute('data-subview');
                // Deactivate all subtabs
                document.querySelectorAll('#view-financeiro .saas-subtab-btn').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('#view-financeiro .saas-subview-pane').forEach(p => p.classList.remove('active'));
                
                // Activate clicked subtab
                btn.classList.add('active');
                const pane = document.getElementById(targetSubview);
                if (pane) pane.classList.add('active');
                
                // Render corresponding charts or data on tab change
                updateFinanceiroSaaSCharts();
            });
        });
        
        // Setup scenario buttons listeners
        document.querySelectorAll('.active-scenario-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const scen = btn.getAttribute('data-scenario');
                currentScenario = scen;
                document.querySelectorAll('.active-scenario-btn').forEach(b => b.classList.remove('active-scenario'));
                btn.classList.add('active-scenario');
                updateFinanceiroSaaSCharts();
            });
        });
        
        finSubtabsInitialized = true;
    }

    function initFinanceiroView() {
        initFinanceiroSubtabs();
        
        // Compute MRR, Recebido, Atrasado
        let mrr = 0;
        let recebido = 0;
        let atrasado = 0;
        let ativosCount = 0;

        clients.forEach(c => {
            if (c.status === 'active') {
                mrr += c.value;
                ativosCount++;
                if (c.paymentStatus === 'Pago') {
                    recebido += c.value;
                } else if (c.paymentStatus === 'Atrasado') {
                    atrasado += c.value;
                }
            }
        });

        // Custom manual transactions calculations
        let customEntradas = 0;
        let customSaidas = 0;
        customTransactions.forEach(t => {
            if (t.type === 'entrada') customEntradas += t.value;
            else if (t.type === 'saida') customSaidas += t.value;
        });

        const netBalance = recebido + customEntradas - customSaidas;

        // Original Finance elements (for contracts view)
        const finMrrVal = document.getElementById('fin-mrr-val');
        if (finMrrVal) finMrrVal.textContent = 'R$ ' + mrr.toLocaleString('pt-BR');
        const finRecebidoVal = document.getElementById('fin-recebido-val');
        if (finRecebidoVal) finRecebidoVal.textContent = 'R$ ' + recebido.toLocaleString('pt-BR');
        const finCustomEntradasVal = document.getElementById('fin-custom-entradas-val');
        if (finCustomEntradasVal) finCustomEntradasVal.textContent = 'R$ ' + customEntradas.toLocaleString('pt-BR');
        const finCustomSaidasVal = document.getElementById('fin-custom-saidas-val');
        if (finCustomSaidasVal) finCustomSaidasVal.textContent = 'R$ ' + customSaidas.toLocaleString('pt-BR');
        
        const netEl = document.getElementById('fin-net-balance-val');
        if (netEl) {
            netEl.textContent = 'R$ ' + netBalance.toLocaleString('pt-BR');
            if (netBalance < 0) {
                netEl.style.color = '#e53e3e';
            } else if (netBalance > 0) {
                netEl.style.color = '#48bb78';
            } else {
                netEl.style.color = 'var(--color-accent-gold)';
            }
        }

        renderFinanceiroTable();
        renderCustomTransactionsTable();

        const savedPix = localStorage.getItem('founders_agency_pix_key') || 'financeiro@foundersledgrowth.com.br';
        const agencyPixInput = document.getElementById('agency-pix-key-input');
        if (agencyPixInput) agencyPixInput.value = savedPix;

        // --- SaaS Financeiro Stats Update ---
        const saasMrrVal = document.getElementById('saas-mrr-val');
        if (saasMrrVal) saasMrrVal.textContent = 'R$ ' + mrr.toLocaleString('pt-BR');
        const saasFaturamentoVal = document.getElementById('saas-faturamento-val');
        if (saasFaturamentoVal) saasFaturamentoVal.textContent = 'R$ ' + (recebido + customEntradas).toLocaleString('pt-BR');
        
        const faturamentoTotal = recebido + customEntradas;
        const despesasTotal = customSaidas;
        const lucroEstimado = faturamentoTotal - despesasTotal;
        const lucroMargem = faturamentoTotal > 0 ? Math.round((lucroEstimado / faturamentoTotal) * 100) : 0;

        const saasLucroVal = document.getElementById('saas-lucro-val');
        if (saasLucroVal) {
            saasLucroVal.textContent = 'R$ ' + lucroEstimado.toLocaleString('pt-BR');
            saasLucroVal.style.color = lucroEstimado >= 0 ? '#48bb78' : '#e53e3e';
        }

        const saasAtivosVal = document.getElementById('saas-ativos-val');
        if (saasAtivosVal) saasAtivosVal.textContent = ativosCount;
        const saasContratosVal = document.getElementById('saas-contratos-val');
        if (saasContratosVal) saasContratosVal.textContent = clients.filter(c => c.status === 'active').length;
        
        const saasInadimplenciaVal = document.getElementById('saas-inadimplencia-val');
        if (saasInadimplenciaVal) saasInadimplenciaVal.textContent = 'R$ ' + atrasado.toLocaleString('pt-BR');
        
        const saasGrowthVal = document.getElementById('saas-growth-val');
        if (saasGrowthVal) saasGrowthVal.textContent = '+8.5%';

        // Populate faturamento table
        const fatTbody = document.getElementById('saas-faturamento-tbody');
        if (fatTbody) {
            fatTbody.innerHTML = '';
            clients.forEach(c => {
                const totalFat = c.paymentStatus === 'Pago' ? c.value : 0;
                const partPercent = faturamentoTotal > 0 ? ((totalFat / faturamentoTotal) * 100).toFixed(1) : '0.0';
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td><strong>${c.name}</strong></td>
                    <td>R$ ${c.value.toLocaleString('pt-BR')}</td>
                    <td>R$ 0</td>
                    <td>R$ ${totalFat.toLocaleString('pt-BR')}</td>
                    <td>${partPercent}%</td>
                `;
                fatTbody.appendChild(tr);
            });
        }

        // Populate MRR table
        const mrrTbody = document.getElementById('saas-mrr-tbody');
        if (mrrTbody) {
            mrrTbody.innerHTML = '';
            clients.forEach(c => {
                const tr = document.createElement('tr');
                let startStr = c.startDate ? c.startDate.split('-').reverse().join('/') : '—';
                tr.innerHTML = `
                    <td><strong>${c.name}</strong></td>
                    <td>R$ ${c.value.toLocaleString('pt-BR')}</td>
                    <td>${startStr}</td>
                    <td>${c.duration} meses</td>
                    <td><span style="color:#48bb78; font-weight:600;">Ativa</span></td>
                `;
                mrrTbody.appendChild(tr);
            });
        }
        
        // MRR stats boxes
        const arpu = ativosCount > 0 ? Math.round(mrr / ativosCount) : 0;
        const ltv = arpu * 12;
        const mrrArpu = document.getElementById('saas-mrr-arpu');
        if (mrrArpu) mrrArpu.textContent = 'R$ ' + arpu.toLocaleString('pt-BR');
        const mrrLtv = document.getElementById('saas-mrr-ltv');
        if (mrrLtv) mrrLtv.textContent = 'R$ ' + ltv.toLocaleString('pt-BR');

        // Populate Lucro details
        const lucroRec = document.getElementById('saas-lucro-receita');
        if (lucroRec) lucroRec.textContent = 'R$ ' + faturamentoTotal.toLocaleString('pt-BR');
        const lucroDes = document.getElementById('saas-lucro-despesas');
        if (lucroDes) lucroDes.textContent = 'R$ ' + despesasTotal.toLocaleString('pt-BR');
        const lucroLiq = document.getElementById('saas-lucro-liquido');
        if (lucroLiq) lucroLiq.textContent = 'R$ ' + lucroEstimado.toLocaleString('pt-BR');
        const lucroMarg = document.getElementById('saas-lucro-margem');
        if (lucroMarg) lucroMarg.textContent = `${lucroMargem}%`;

        // Populate Inadimplência table
        const inadTbody = document.getElementById('saas-inadimplencia-tbody');
        const inadRateEl = document.getElementById('saas-inadimplencia-rate');
        const totalContratosValor = clients.reduce((acc, c) => acc + c.value, 0);
        const inadRate = totalContratosValor > 0 ? ((atrasado / totalContratosValor) * 100).toFixed(1) : '0.0';
        if (inadRateEl) inadRateEl.textContent = `${inadRate}%`;

        if (inadTbody) {
            inadTbody.innerHTML = '';
            const lateClients = clients.filter(c => c.paymentStatus === 'Atrasado');
            if (lateClients.length === 0) {
                inadTbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--color-text-muted); padding: 20px;">Nenhum cliente inadimplente. Muito bem!</td></tr>`;
            } else {
                lateClients.forEach(c => {
                    const tr = document.createElement('tr');
                    const msgWhatsApp = encodeURIComponent(`Olá ${c.name}, notamos que a mensalidade deste mês está pendente. Segue nossa chave Pix para regularização.`);
                    tr.innerHTML = `
                        <td><strong>${c.name}</strong></td>
                        <td>Fatura Mensal</td>
                        <td style="color:#e53e3e; font-weight:600;">R$ ${c.value.toLocaleString('pt-BR')}</td>
                        <td>Dia ${c.payday}</td>
                        <td style="color:#e53e3e;">Atrasado</td>
                        <td><a href="https://wa.me/5575999999999?text=${msgWhatsApp}" target="_blank" class="btn btn-dark btn-xs" style="color:var(--color-accent-gold); display:inline-block; border-color:var(--color-accent-gold-glow);">Cobrar WhatsApp</a></td>
                    `;
                    inadTbody.appendChild(tr);
                });
            }
        }

        // Renewals & Churn tables
        const saasRenovacoesTbody = document.getElementById('saas-renovacoes-tbody');
        if (saasRenovacoesTbody) {
            saasRenovacoesTbody.innerHTML = '';
            clients.slice(0, 3).forEach(c => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td><strong>${c.name}</strong></td>
                    <td>10/12/2026</td>
                    <td>R$ ${c.value.toLocaleString('pt-BR')}</td>
                `;
                saasRenovacoesTbody.appendChild(tr);
            });
        }
        
        const saasEncerradosTbody = document.getElementById('saas-encerrados-tbody');
        if (saasEncerradosTbody) {
            saasEncerradosTbody.innerHTML = `
                <tr>
                    <td><strong>Clínica Sorriso (Antigo)</strong></td>
                    <td>15/05/2026</td>
                    <td>R$ 4.000</td>
                </tr>
            `;
        }

        // Simulação de cenários calculations
        const realistCaixa = mrr + customEntradas - customSaidas;
        const optimistCaixa = (mrr + 12000) + customEntradas - customSaidas;
        const conservCaixa = (mrr * 0.9) + customEntradas - customSaidas;
        
        const realistEl = document.getElementById('saas-proj-realista-val');
        if (realistEl) realistEl.textContent = 'R$ ' + realistCaixa.toLocaleString('pt-BR');
        const optimistEl = document.getElementById('saas-proj-otimista-val');
        if (optimistEl) optimistEl.textContent = 'R$ ' + optimistCaixa.toLocaleString('pt-BR');
        const conservEl = document.getElementById('saas-proj-conservador-val');
        if (conservEl) conservEl.textContent = 'R$ ' + conservCaixa.toLocaleString('pt-BR');

        // Draw initial SVG charts
        updateFinanceiroSaaSCharts();
    }

    function renderFinanceiroTable() {
        const tbody = document.getElementById('financeiro-tbody');
        tbody.innerHTML = '';

        if (clients.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--color-text-muted); padding: 30px;">Nenhum contrato ativo.</td></tr>`;
            return;
        }

        clients.forEach(c => {
            const tr = document.createElement('tr');
            
            let badgeClass = 'pay-pendente';
            if (c.paymentStatus === 'Pago') badgeClass = 'pay-pago';
            else if (c.paymentStatus === 'Atrasado') badgeClass = 'pay-atrasado';

            let dateStr = '00/00/0000';
            if (c.startDate && c.startDate.includes('-')) {
                dateStr = c.startDate.split('-').reverse().join('/');
            }

            tr.innerHTML = `
                <td><strong>${c.name}</strong></td>
                <td>R$ ${c.value.toLocaleString('pt-BR')}</td>
                <td>Dia ${c.payday}</td>
                <td>${c.duration} meses (Início: ${dateStr})</td>
                <td>
                    <select class="finance-status-select" data-id="${c.id}" style="background-color: var(--color-bg-primary); border: 1px solid var(--color-bg-tertiary); font-weight:600; padding: 4px 10px; border-radius: var(--border-radius-sm);">
                        <option value="Pago" ${c.paymentStatus === 'Pago' ? 'selected' : ''} style="color: #48bb78;">Pago</option>
                        <option value="Pendente" ${c.paymentStatus === 'Pendente' ? 'selected' : ''} style="color: #dd6b20;">Pendente</option>
                        <option value="Atrasado" ${c.paymentStatus === 'Atrasado' ? 'selected' : ''} style="color: #e53e3e;">Atrasado</option>
                    </select>
                </td>
                <td style="text-align:center;">
                    <button class="btn btn-dark btn-sm toggle-quick-payment-btn" data-id="${c.id}">${c.paymentStatus === 'Pago' ? 'Reverter' : 'Marcar como Pago'}</button>
                </td>
            `;
        });
    }

    function renderCustomTransactionsTable() {
        const tbody = document.getElementById('custom-transactions-tbody');
        if (!tbody) return;
        tbody.innerHTML = '';

        let totalAvulso = 0;

        if (customTransactions.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--color-text-muted); padding: 20px;">Nenhum lançamento avulso cadastrado.</td></tr>`;
            const saldoEl = document.getElementById('fin-saldo-avulso');
            if (saldoEl) {
                saldoEl.textContent = 'R$ 0,00';
                saldoEl.style.color = 'var(--color-accent-gold)';
            }
            return;
        }

        customTransactions.forEach(t => {
            const tr = document.createElement('tr');
            
            let typeBadge = '';
            if (t.type === 'entrada') {
                typeBadge = `<span class="badge pay-pago" style="color: #48bb78; background: rgba(72, 187, 120, 0.1); padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: 600;">Entrada</span>`;
                totalAvulso += t.value;
            } else {
                typeBadge = `<span class="badge pay-atrasado" style="color: #e53e3e; background: rgba(229, 62, 62, 0.1); padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: 600;">Saída</span>`;
                totalAvulso -= t.value;
            }

            let dateStr = '00/00/0000';
            if (t.date && t.date.includes('-')) {
                dateStr = t.date.split('-').reverse().join('/');
            }

            tr.innerHTML = `
                <td style="padding: 10px 15px;"><strong>${t.description}</strong></td>
                <td style="padding: 10px 15px;">${typeBadge}</td>
                <td style="padding: 10px 15px; color: ${t.type === 'entrada' ? '#48bb78' : '#e53e3e'}; font-weight: 600;">R$ ${t.value.toLocaleString('pt-BR')}</td>
                <td style="padding: 10px 15px; color: var(--color-text-muted);">${dateStr}</td>
                <td style="text-align:center; padding: 10px 15px;">
                    <button class="btn btn-red btn-sm delete-custom-tx-btn" data-id="${t.id}" style="padding: 4px 8px; font-size: 11px;">Excluir</button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        const saldoEl = document.getElementById('fin-saldo-avulso');
        if (saldoEl) {
            saldoEl.textContent = (totalAvulso >= 0 ? '' : '-') + 'R$ ' + Math.abs(totalAvulso).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
            if (totalAvulso < 0) {
                saldoEl.style.color = '#e53e3e';
            } else if (totalAvulso > 0) {
                saldoEl.style.color = '#48bb78';
            } else {
                saldoEl.style.color = 'var(--color-accent-gold)';
            }
        }
    }

    // Handles payment status changes
    document.getElementById('financeiro-tbody').addEventListener('change', (e) => {
        if (e.target.classList.contains('finance-status-select')) {
            const id = e.target.getAttribute('data-id');
            const newStatus = e.target.value;
            const client = clients.find(c => c.id === id);
            if (client) {
                client.paymentStatus = newStatus;
                saveClients();
                initFinanceiroView();
            }
        }
    });

    document.getElementById('financeiro-tbody').addEventListener('click', (e) => {
        const btn = e.target.closest('.toggle-quick-payment-btn');
        if (btn) {
            const id = btn.getAttribute('data-id');
            const client = clients.find(c => c.id === id);
            if (client) {
                client.paymentStatus = client.paymentStatus === 'Pago' ? 'Pendente' : 'Pago';
                saveClients();
                initFinanceiroView();
            }
        }
    });

    document.getElementById('btn-save-agency-pix').addEventListener('click', () => {
        const val = document.getElementById('agency-pix-key-input').value.trim();
        localStorage.setItem('founders_agency_pix_key', val);
        alert('Chave PIX da agência salva com sucesso!');
        // Refresh client view if currently open
        const client = getActiveClientPortalObject();
        if (client) initClientPortalFinanceiroView();
    });

    document.getElementById('form-add-transaction').addEventListener('submit', (e) => {
        e.preventDefault();
        const desc = document.getElementById('tx-description').value.trim();
        const val = parseFloat(document.getElementById('tx-value').value) || 0;
        const type = document.getElementById('tx-type').value;
        const date = document.getElementById('tx-date').value;

        const newTx = {
            id: 'tx_' + Math.random().toString(36).substr(2, 9),
            description: desc,
            value: val,
            type: type,
            date: date
        };
        customTransactions.push(newTx);
        saveCustomTransactions(newTx);
        initFinanceiroView();

        document.getElementById('form-add-transaction').reset();
        document.getElementById('tx-date').value = new Date().toISOString().substring(0, 10);
    });

    document.getElementById('custom-transactions-tbody').addEventListener('click', (e) => {
        const btn = e.target.closest('.delete-custom-tx-btn');
        if (btn) {
            const id = btn.getAttribute('data-id');
            if (confirm('Deletar este lançamento avulso?')) {
                customTransactions = customTransactions.filter(t => t.id !== id);
                saveCustomTransactions();
                initFinanceiroView();
            }
        }
    });

    /* ==========================================================================
       CLIENT PORTAL: DASHBOARD & VIEWS LOGIC
       ========================================================================== */

    function getActiveClientPortalObject() {
        const clientId = currentRole.replace('client-', '');
        return clients.find(c => c.id === clientId);
    }

    function initClientDashboardView() {
        const client = getActiveClientPortalObject();
        if (!client) return;

        document.getElementById('client-portal-welcome').innerHTML = `Painel Geral: <span class="gold-text">${client.name}</span>`;
        document.getElementById('client-portal-contract-text').textContent = `Seu contrato recorrente de R$ ${client.value.toLocaleString('pt-BR')}/mês está ativo e saudável.`;
        
        let dueNoticeClass = 'client-portal-due-notice';
        if (client.paymentStatus === 'Atrasado') dueNoticeClass += ' red-text';
        
        const dueNotice = document.getElementById('client-portal-due-card');
        dueNotice.className = dueNoticeClass;
        dueNotice.innerHTML = `Próximo vencimento: <strong>Dia ${client.payday}</strong> (Status atual: <strong>${client.paymentStatus}</strong>)`;

        // Update counts
        const pendingDemands = client.demands ? client.demands.filter(d => !d.completed).length : 0;
        const scheduledPosts = client.posts ? client.posts.length : 0;
        const pendingApprovals = client.approvals ? client.approvals.filter(a => a.status === 'Pendente').length : 0;

        document.getElementById('client-stat-demandas').textContent = pendingDemands;
        document.getElementById('client-stat-posts').textContent = scheduledPosts;
        document.getElementById('client-stat-aprovacoes').textContent = pendingApprovals;
    }

    // Handles portal dashboard clicks shortcut routing
    document.addEventListener('click', (e) => {
        const box = e.target.closest('.dash-stat-box');
        if (box && currentRole !== 'adm') {
            const action = box.getAttribute('data-client-action');
            if (action === 'goto-demandas') showView('client-demandas');
            else if (action === 'goto-posts') showView('client-posts');
            else if (action === 'goto-aprovacoes') showView('client-aprovacoes');
        }
    });

    /* CLIENT PORTAL: MINHAS DEMANDAS LOGIC */
    function initClientPortalDemandasView() {
        const client = getActiveClientPortalObject();
        if (!client) return;

        const list = document.getElementById('client-portal-demandas-list');
        list.innerHTML = '';

        const total = client.demands ? client.demands.length : 0;
        const completed = client.demands ? client.demands.filter(d => d.completed).length : 0;

        // Progress bar
        const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
        document.getElementById('client-demands-progress').style.width = percent + '%';
        document.getElementById('client-demands-summary-text').textContent = `${completed} de ${total} concluídas (${percent}%)`;

        if (total === 0) {
            list.innerHTML = '<div class="empty-state-text" style="padding: 20px;">Nenhuma demanda cadastrada para você no momento. Bom trabalho!</div>';
            return;
        }

        client.demands.forEach((d, idx) => {
            const row = document.createElement('div');
            row.className = `task-row ${d.completed ? 'completed' : ''}`;
            row.innerHTML = `
                <div class="task-checkbox client-toggle-checkbox ${d.completed ? 'completed' : ''}" data-idx="${idx}"></div>
                <span class="task-title"><strong>${d.title}</strong>${d.desc ? `<br><small style="color:var(--color-text-muted);">${d.desc}</small>` : ''}</span>
            `;
            list.appendChild(row);
        });
    }

    // Toggle demands checkmark from the client side
    document.getElementById('client-portal-demandas-list').addEventListener('click', (e) => {
        const cb = e.target.closest('.client-toggle-checkbox');
        if (cb) {
            const idx = parseInt(cb.getAttribute('data-idx'));
            const client = getActiveClientPortalObject();
            
            if (client && client.demands[idx]) {
                client.demands[idx].completed = !client.demands[idx].completed;
                saveClients();
                initClientPortalDemandasView();
            }
        }
    });

    /* CLIENT PORTAL: SCHEDULED POSTS LOGIC */
    function initClientPortalPostsView() {
        const client = getActiveClientPortalObject();
        if (!client) return;

        const list = document.getElementById('client-portal-posts-list');
        list.innerHTML = '';

        if (!client.posts || client.posts.length === 0) {
            list.innerHTML = '<div class="empty-state-text" style="grid-column: 1/-1; padding: 40px 0;">Nenhum post agendado no seu cronograma no momento.</div>';
            return;
        }

        // Sort posts chronologically
        const sortedPosts = [...client.posts].sort((a, b) => new Date(a.date) - new Date(b.date));

        sortedPosts.forEach(p => {
            const [year, month, day] = p.date.split('-');
            const formattedDate = `${day}/${month}/${year}`;

            const card = document.createElement('div');
            card.className = 'portal-post-card';
            card.style.cursor = 'pointer';
            
            const thumbSrc = p.thumbnail || 'assets/post_placeholder.png';
            card.innerHTML = `
                <div class="portal-post-thumb-wrapper" style="width: 100%; height: 140px; overflow: hidden; border-radius: var(--border-radius-sm); margin-bottom: 12px; border: 1px solid var(--color-bg-tertiary);">
                    <img src="${thumbSrc}" alt="Thumbnail" style="width: 100%; height: 100%; object-fit: cover;">
                </div>
                <div class="portal-post-header">
                    <span class="portal-post-network-badge">${p.network}</span>
                    <span class="portal-post-date">${formattedDate}</span>
                </div>
                <span class="portal-post-type-tag">${p.type}</span>
                <h4 style="margin-top: 8px;">${p.title}</h4>
            `;
            
            card.addEventListener('click', () => {
                openContentPreview(p, 'post', client);
            });
            
            list.appendChild(card);
        });
    }

    /* CLIENT PORTAL: APPROVAL INTERFACE LOGIC */
    function initClientPortalApprovalsView() {
        const client = getActiveClientPortalObject();
        if (!client) return;

        const list = document.getElementById('client-portal-approvals-list');
        list.innerHTML = '';

        if (!client.approvals || client.approvals.length === 0) {
            list.innerHTML = '<div class="empty-state-text" style="padding:40px 0;">Nenhum conteúdo aguardando sua revisão no momento.</div>';
            return;
        }

        client.approvals.forEach((a, idx) => {
            const card = document.createElement('div');
            card.className = 'approval-feed-card';
            
            let statusBadgeClass = 'app-status-pending';
            if (a.status === 'Aprovado') statusBadgeClass = 'app-status-approved';
            else if (a.status === 'Rejeitado') statusBadgeClass = 'app-status-rejected';

            const thumbSrc = a.thumbnail || 'assets/post_placeholder.png';
            const network = a.network || 'Instagram';
            let networkBadgeHtml = `<span class="portal-post-network-badge" style="margin-left: 8px; vertical-align: middle;">${network}</span>`;

            card.innerHTML = `
                <div class="approval-card-top">
                    <div>
                        <h3 style="display: flex; align-items: center; flex-wrap: wrap; gap: 8px;">
                            ${a.title}
                            ${networkBadgeHtml}
                        </h3>
                        <span class="prompt-card-category" style="margin-top:5px;">${a.type}</span>
                    </div>
                    <span class="approval-status-label ${statusBadgeClass}">${a.status}</span>
                </div>
                
                <div class="approval-card-content-split">
                    <div class="approval-thumb-box" style="width: 100%; max-width: 180px; height: 180px; overflow: hidden; border-radius: var(--border-radius-md); border: 1px solid var(--color-bg-tertiary);">
                        <img src="${thumbSrc}" alt="Preview" style="width: 100%; height: 100%; object-fit: cover;">
                    </div>
                    <div class="approval-preview-box">
                        <h5>Roteiro / Conteúdo</h5>
                        <div class="approval-preview-text">${a.body}</div>
                    </div>
                    <div class="approval-caption-box">
                        <h5>Legenda proposta</h5>
                        <div class="approval-caption-text">${a.caption || 'Nenhuma legenda necessária.'}</div>
                    </div>
                </div>

                ${a.adjustments ? `
                    <div class="approval-adjustments-notes" style="margin-bottom:20px;">
                        <strong>Ajustes Solicitados por você:</strong> "${a.adjustments}"
                    </div>
                ` : ''}

                ${a.status === 'Pendente' ? `
                    <div class="approval-action-row" data-idx="${idx}">
                        <button class="btn btn-dark btn-sm reject-content-btn">Solicitar Ajustes</button>
                        <button class="btn btn-gold-solid btn-sm approve-content-btn">Aprovar Conteúdo</button>
                    </div>
                ` : ''}
            `;
            
            // Add click listener to the thumbnail and header to open detailed preview
            const thumbBox = card.querySelector('.approval-thumb-box');
            const cardTop = card.querySelector('.approval-card-top');
            
            if (thumbBox) {
                thumbBox.style.cursor = 'pointer';
                thumbBox.addEventListener('click', () => {
                    openContentPreview(a, 'approval', client);
                });
            }
            if (cardTop) {
                cardTop.style.cursor = 'pointer';
                cardTop.addEventListener('click', () => {
                    openContentPreview(a, 'approval', client);
                });
            }

            list.appendChild(card);
        });
    }

    /* CLIENT PORTAL: FINANCEIRO & INSTAGRAM INSIGHTS LOGIC */
    
    function initClientPortalFinanceiroView() {
        const client = getActiveClientPortalObject();
        if (!client) return;

        // Fill contract details
        document.getElementById('client-fin-monthly-value').textContent = `R$ ${client.value.toLocaleString('pt-BR')},00`;
        document.getElementById('client-fin-due-day').textContent = `Dia ${client.payday}`;
        
        // Status Badge
        const statusBadge = document.getElementById('client-fin-status-badge');
        statusBadge.className = 'approval-status-label'; // Reset
        statusBadge.textContent = client.paymentStatus || 'Pendente';
        
        if (client.paymentStatus === 'Pago') {
            statusBadge.classList.add('app-status-approved');
        } else if (client.paymentStatus === 'Atrasado') {
            statusBadge.classList.add('app-status-rejected');
        } else {
            statusBadge.classList.add('app-status-pending');
        }

        // Start Date
        let dateStr = '00/00/0000';
        if (client.startDate && client.startDate.includes('-')) {
            const parts = client.startDate.split('-');
            if (parts.length === 3) {
                dateStr = `${parts[2]}/${parts[1]}/${parts[0]}`;
            }
        }
        document.getElementById('client-fin-start-date').textContent = dateStr;

        // Pix Key loading
        const pixKey = localStorage.getItem('founders_agency_pix_key') || 'financeiro@foundersledgrowth.com.br';
        document.getElementById('client-pix-key-label').textContent = pixKey;

        // Pix Copy and Paste string
        const pixCode = `00020101021226820014br.gov.bcb.pix25600016${pixKey.replace(/[^a-zA-Z0-9@.-]/g, '')}5204000053039865405${client.value.toFixed(2)}5802BR5908Founders6005Feira62070503***6304`;
        document.getElementById('client-pix-copia-cola').value = pixCode;

        // Copy Pix handler
        const copyBtn = document.getElementById('btn-copy-client-pix');
        const newCopyBtn = copyBtn.cloneNode(true);
        copyBtn.parentNode.replaceChild(newCopyBtn, copyBtn);
        newCopyBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(pixCode).then(() => {
                const origText = newCopyBtn.textContent;
                newCopyBtn.textContent = '✓ Copiado';
                newCopyBtn.style.backgroundColor = '#48bb78';
                setTimeout(() => {
                    newCopyBtn.textContent = origText;
                    newCopyBtn.style.backgroundColor = '';
                }, 2000);
            }).catch(err => {
                alert('Erro ao copiar Chave PIX: ' + err);
            });
        });

        // Faturas history rendering
        const tbody = document.getElementById('client-invoice-history-tbody');
        tbody.innerHTML = '';

        // Current calendar month name and year
        const dateObj = new Date();
        const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
        const currentMonthName = monthNames[dateObj.getMonth()];
        const currentYear = dateObj.getFullYear();

        // Row 1: Current invoice
        const tr1 = document.createElement('tr');
        tr1.style.borderBottom = '1px solid rgba(255,255,255,0.05)';
        
        let badgeClass = 'app-status-pending';
        if (client.paymentStatus === 'Pago') badgeClass = 'app-status-approved';
        else if (client.paymentStatus === 'Atrasado') badgeClass = 'app-status-rejected';

        // Due date formatted for current month
        const formattedDueDate = `${client.payday.toString().padStart(2, '0')}/${(dateObj.getMonth() + 1).toString().padStart(2, '0')}/${currentYear}`;

        tr1.innerHTML = `
            <td style="padding: 12px 20px;"><strong>Mensalidade - ${currentMonthName} / ${currentYear}</strong></td>
            <td style="padding: 12px 20px;">R$ ${client.value.toLocaleString('pt-BR')},00</td>
            <td style="padding: 12px 20px;">${formattedDueDate}</td>
            <td style="padding: 12px 20px;"><span class="approval-status-label ${badgeClass}">${client.paymentStatus || 'Pendente'}</span></td>
            <td style="padding: 12px 20px; text-align: center;">
                ${client.paymentStatus === 'Pago' ? '<span style="color: #48bb78; font-size: 13px;">✓ Confirmado</span>' : '<button class="btn btn-gold btn-xs btn-pay-invoice-mock">Pagar via Pix</button>'}
            </td>
        `;
        
        const payBtn = tr1.querySelector('.btn-pay-invoice-mock');
        if (payBtn) {
            payBtn.addEventListener('click', () => {
                // Focus copy-paste input or scroll to it
                document.getElementById('client-pix-copia-cola').focus();
                document.getElementById('client-pix-copia-cola').select();
                alert('Chave PIX selecionada. Copie o código ao lado e cole no aplicativo do seu banco!');
            });
        }
        tbody.appendChild(tr1);

        // Row 2: Past invoice (Maio / 2026 or previous month)
        const prevDate = new Date();
        prevDate.setMonth(prevDate.getMonth() - 1);
        const prevMonthName = monthNames[prevDate.getMonth()];
        const prevYear = prevDate.getFullYear();

        const tr2 = document.createElement('tr');
        tr2.innerHTML = `
            <td style="padding: 12px 20px;"><strong>Mensalidade - ${prevMonthName} / ${prevYear}</strong></td>
            <td style="padding: 12px 20px;">R$ ${client.value.toLocaleString('pt-BR')},00</td>
            <td style="padding: 12px 20px;">${client.payday.toString().padStart(2, '0')}/${(prevDate.getMonth() + 1).toString().padStart(2, '0')}/${prevYear}</td>
            <td style="padding: 12px 20px;"><span class="approval-status-label app-status-approved">Pago</span></td>
            <td style="padding: 12px 20px; text-align: center;"><span style="color: #48bb78; font-size: 13px;">✓ Confirmado</span></td>
        `;
        tbody.appendChild(tr2);
    }

    function renderSVGChart(points) {
        if (!points || points.length === 0) points = [0, 0, 0, 0, 0, 0];
        
        const width = 500;
        const height = 200;
        const paddingLeft = 45;
        const paddingRight = 20;
        const paddingTop = 20;
        const paddingBottom = 30;
        
        const chartWidth = width - paddingLeft - paddingRight;
        const chartHeight = height - paddingTop - paddingBottom;
        
        const minVal = Math.min(...points) * 0.95;
        const maxVal = Math.max(...points) * 1.05;
        const valRange = maxVal - minVal || 100;
        
        const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'];
        
        // Calculate points coordinates
        const coords = points.map((val, idx) => {
            const x = paddingLeft + (idx / (points.length - 1)) * chartWidth;
            const y = paddingTop + chartHeight - ((val - minVal) / valRange) * chartHeight;
            return { x, y, val };
        });
        
        // Build SVG path
        let pathD = `M ${coords[0].x} ${coords[0].y}`;
        for (let i = 1; i < coords.length; i++) {
            pathD += ` L ${coords[i].x} ${coords[i].y}`;
        }
        
        // Build fill path
        const fillD = `${pathD} L ${coords[coords.length - 1].x} ${paddingTop + chartHeight} L ${coords[0].x} ${paddingTop + chartHeight} Z`;
        
        // Grid lines and labels
        let gridHtml = '';
        const gridSteps = 4;
        for (let i = 0; i <= gridSteps; i++) {
            const y = paddingTop + (i / gridSteps) * chartHeight;
            const val = maxVal - (i / gridSteps) * valRange;
            gridHtml += `
                <line x1="${paddingLeft}" y1="${y}" x2="${width - paddingRight}" y2="${y}" class="chart-grid-line" />
                <text x="${paddingLeft - 10}" y="${y + 4}" text-anchor="end" class="chart-axis-text">${Math.round(val).toLocaleString('pt-BR')}</text>
            `;
        }
        
        // X-axis labels and dot nodes
        let xLabelsHtml = '';
        coords.forEach((coord, idx) => {
            xLabelsHtml += `
                <text x="${coord.x}" y="${height - 10}" text-anchor="middle" class="chart-axis-text">${months[idx] || ''}</text>
                <circle cx="${coord.x}" cy="${coord.y}" r="4" class="chart-dot" data-val="${coord.val.toLocaleString('pt-BR')}" />
                <text x="${coord.x}" y="${coord.y - 8}" text-anchor="middle" class="chart-tooltip-text" style="display:none;" id="chart-tooltip-${idx}">${coord.val.toLocaleString('pt-BR')}</text>
            `;
        });
        
        const svg = `
            <svg viewBox="0 0 ${width} ${height}" width="100%" height="100%" style="overflow: visible;">
                <defs>
                    <linearGradient id="chart-gradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stop-color="var(--color-accent-gold)" stop-opacity="0.3"/>
                        <stop offset="100%" stop-color="var(--color-accent-gold)" stop-opacity="0"/>
                    </linearGradient>
                </defs>
                
                <!-- Grid & Axes -->
                ${gridHtml}
                <line x1="${paddingLeft}" y1="${paddingTop + chartHeight}" x2="${width - paddingRight}" y2="${paddingTop + chartHeight}" class="chart-axis-line" />
                <line x1="${paddingLeft}" y1="${paddingTop}" x2="${paddingLeft}" y2="${paddingTop + chartHeight}" class="chart-axis-line" />
                
                <!-- Fill Area -->
                <path d="${fillD}" class="chart-gradient-fill" />
                
                <!-- Trend Line -->
                <path d="${pathD}" class="chart-trend-line" fill="none" />
                
                <!-- Dots & Labels -->
                ${xLabelsHtml}
            </svg>
        `;
        return svg;
    }

    function initClientPortalInsightsView() {
        const client = getActiveClientPortalObject();
        if (!client) return;

        const unconnectedState = document.getElementById('instagram-unconnected-state');
        const connectedState = document.getElementById('instagram-connected-state');

        if (!client.instagramConnected) {
            unconnectedState.style.display = 'flex';
            connectedState.style.display = 'none';
            return;
        }

        unconnectedState.style.display = 'none';
        connectedState.style.display = 'block';

        // Load details
        const username = client.instagramUsername || 'naoconfigurado';
        document.getElementById('insights-connected-username').textContent = `@${username}`;

        // Fill KPIs
        const followers = client.instagramFollowers || 0;
        const reach = client.instagramReach || 0;
        const engagement = client.instagramEngagement || 0.0;
        const visits = client.instagramVisits || 0;

        document.getElementById('insights-followers-val').textContent = followers.toLocaleString('pt-BR');
        document.getElementById('insights-reach-val').textContent = reach.toLocaleString('pt-BR');
        document.getElementById('insights-engagement-val').textContent = `${engagement.toFixed(1).replace('.', ',')}%`;
        document.getElementById('insights-visits-val').textContent = visits.toLocaleString('pt-BR');

        // Metas de crescimento bars
        const followersPercent = Math.min(100, Math.round((followers / 20000) * 100));
        document.getElementById('insights-meta-followers-percent').textContent = `${followersPercent}%`;
        document.getElementById('insights-meta-followers-bar').style.width = `${followersPercent}%`;

        const reachPercent = Math.min(100, Math.round((reach / 60000) * 100));
        document.getElementById('insights-meta-reach-percent').textContent = `${reachPercent}%`;
        document.getElementById('insights-meta-reach-bar').style.width = `${reachPercent}%`;

        // Render dynamic SVG Line Chart
        let chartPoints = [0, 0, 0, 0, 0, followers];
        if (client.instagramChartPoints) {
            try {
                const parsed = client.instagramChartPoints.split(',').map(Number);
                if (parsed.length === 6 && parsed.every(n => !isNaN(n))) {
                    chartPoints = parsed;
                }
            } catch (e) {
                console.error("Erro ao ler pontos do gráfico do instagram:", e);
            }
        }
        
        document.getElementById('insights-chart-container').innerHTML = renderSVGChart(chartPoints);

        // Setup chart dots hovering/tooltip showing
        const container = document.getElementById('insights-chart-container');
        container.querySelectorAll('.chart-dot').forEach((dot, idx) => {
            dot.addEventListener('mouseenter', () => {
                const tooltip = container.querySelector(`#chart-tooltip-${idx}`);
                if (tooltip) tooltip.style.display = 'block';
            });
            dot.addEventListener('mouseleave', () => {
                const tooltip = container.querySelector(`#chart-tooltip-${idx}`);
                if (tooltip) tooltip.style.display = 'none';
            });
        });

        // Top content feed rendering
        const topGrid = document.getElementById('insights-top-posts-grid');
        topGrid.innerHTML = '';

        // Default top posts metrics
        const topPosts = [
            { img: 'assets/post_botox.png', likes: 412, comments: 32 },
            { img: 'assets/post_skincare.png', likes: 389, comments: 24 },
            { img: 'assets/post_criomodelagem.png', likes: 524, comments: 45 }
        ];

        // If client has scheduled posts with custom media, let's use them as top posts!
        if (client.posts && client.posts.length > 0) {
            let mediaCounter = 0;
            client.posts.forEach(p => {
                if (p.mediaFiles && p.mediaFiles.length > 0 && mediaCounter < 3) {
                    // Update image to client's actual upload!
                    topPosts[mediaCounter].img = p.mediaFiles[0];
                    topPosts[mediaCounter].likes = Math.round(150 + Math.random() * 400);
                    topPosts[mediaCounter].comments = Math.round(10 + Math.random() * 40);
                    mediaCounter++;
                }
            });
        }

        topPosts.forEach(post => {
            const card = document.createElement('div');
            card.className = 'insights-post-card';
            card.innerHTML = `
                <img src="${post.img}" alt="Top Post">
                <div class="insights-post-overlay">
                    <span class="insights-post-stat-item">
                        <svg viewBox="0 0 24 24" fill="white" width="14" height="14" style="color:red;"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                        ${post.likes}
                    </span>
                    <span class="insights-post-stat-item">
                        <svg viewBox="0 0 24 24" fill="white" width="14" height="14"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                        ${post.comments}
                    </span>
                </div>
            `;
            topGrid.appendChild(card);
        });
    }

    // Set up Instagram Connect buttons and simulated OAuth dialog triggers
    document.addEventListener('click', (e) => {
        const client = getActiveClientPortalObject();
        
        // Open simulated Meta Login modal
        if (e.target.id === 'btn-connect-instagram') {
            const modal = document.getElementById('modal-connect-instagram');
            if (modal) modal.classList.remove('hidden');
        }
        
        // Close simulated Meta Login modal
        if (e.target.classList.contains('close-instagram-oauth')) {
            const modal = document.getElementById('modal-connect-instagram');
            if (modal) modal.classList.add('hidden');
        }

        // Approve and connect instagram in simulated OAuth dialog
        if (e.target.id === 'btn-meta-oauth-approve') {
            if (!client) return;
            const btn = e.target;
            const origText = btn.innerHTML;
            btn.disabled = true;
            btn.innerHTML = '<span class="loading-spinner-mock" style="display:inline-block; width:12px; height:12px; border:2px solid white; border-top-color:transparent; border-radius:50%; animation: pulse 1s infinite; margin-right:5px;"></span> Conectando...';

            setTimeout(() => {
                client.instagramConnected = true;
                client.instagramUsername = client.instagramUsername || '';
                
                // Initialize default metrics as 0/empty if not set
                if (!client.instagramFollowers) client.instagramFollowers = 0;
                if (!client.instagramReach) client.instagramReach = 0;
                if (!client.instagramEngagement) client.instagramEngagement = 0.0;
                if (!client.instagramVisits) client.instagramVisits = 0;
                if (!client.instagramChartPoints) client.instagramChartPoints = "0,0,0,0,0,0";

                saveClients();
                btn.disabled = false;
                btn.innerHTML = origText;

                const modal = document.getElementById('modal-connect-instagram');
                if (modal) modal.classList.add('hidden');

                initClientPortalInsightsView();
                alert('Conta do Instagram conectada com sucesso!');
            }, 1500);
        }

        // Disconnect Instagram
        if (e.target.id === 'btn-disconnect-instagram') {
            if (!client) return;
            if (confirm('Tem certeza de que deseja desconectar o Instagram de seu painel?')) {
                client.instagramConnected = false;
                saveClients();
                initClientPortalInsightsView();
            }
        }

        // Refresh Instagram metrics simulation
        if (e.target.id === 'btn-refresh-instagram' || e.target.closest('#btn-refresh-instagram')) {
            if (!client) return;
            const btn = document.getElementById('btn-refresh-instagram');
            const origText = btn.innerHTML;
            btn.disabled = true;
            btn.innerHTML = '<svg class="loading-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12" style="animation: pulse 1s infinite;"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"></path></svg> Sincronizando...';

            setTimeout(() => {
                // Add slight growth to stats to simulate real live data change!
                client.instagramFollowers = (client.instagramFollowers || 0) + Math.round(Math.random() * 5);
                client.instagramReach = (client.instagramReach || 0) + Math.round(Math.random() * 20);
                client.instagramVisits = (client.instagramVisits || 0) + Math.round(Math.random() * 3);
                
                saveClients();
                btn.disabled = false;
                btn.innerHTML = origText;
                
                initClientPortalInsightsView();
            }, 1200);
        }
    });

    // Global function to open detailed post/approval preview modal
    function openContentPreview(item, type, client) {
        const modal = document.getElementById('modal-content-preview');
        if (!modal) return;

        // Set title and network badge
        document.getElementById('preview-modal-title').textContent = item.title;
        
        const network = item.network || 'Instagram';
        const badge = document.getElementById('preview-network-badge');
        badge.textContent = network;
        
        // Style network badge based on platform
        if (network === 'Instagram') {
            badge.style.backgroundColor = 'rgba(225, 48, 108, 0.15)';
            badge.style.color = '#e1306c';
            badge.style.borderColor = 'rgba(225, 48, 108, 0.3)';
        } else if (network === 'TikTok') {
            badge.style.backgroundColor = 'rgba(0, 242, 234, 0.15)';
            badge.style.color = '#00f2ea';
            badge.style.borderColor = 'rgba(0, 242, 234, 0.3)';
        } else if (network === 'LinkedIn') {
            badge.style.backgroundColor = 'rgba(0, 119, 181, 0.15)';
            badge.style.color = '#0077b5';
            badge.style.borderColor = 'rgba(0, 119, 181, 0.3)';
        } else if (network === 'WhatsApp') {
            badge.style.backgroundColor = 'rgba(37, 211, 102, 0.15)';
            badge.style.color = '#25d366';
            badge.style.borderColor = 'rgba(37, 211, 102, 0.3)';
        } else {
            badge.style.backgroundColor = 'rgba(66, 153, 225, 0.15)';
            badge.style.color = '#4299e1';
            badge.style.borderColor = 'rgba(66, 153, 225, 0.3)';
        }

        // Fill Metadata
        document.getElementById('preview-content-type').textContent = item.type;

        // Handle Date vs Status Blocks
        const dateBlock = document.getElementById('preview-date-block');
        const statusBlock = document.getElementById('preview-status-block');
        const actionsRow = document.getElementById('preview-modal-actions');
        const adjSection = document.getElementById('preview-adjustments-section');

        if (type === 'post') {
            dateBlock.classList.remove('hidden');
            statusBlock.classList.add('hidden');
            actionsRow.classList.add('hidden');
            adjSection.classList.add('hidden');

            const [year, month, day] = item.date.split('-');
            document.getElementById('preview-content-date').textContent = `${day}/${month}/${year}`;
        } else {
            dateBlock.classList.add('hidden');
            statusBlock.classList.remove('hidden');
            
            const statusLabel = document.getElementById('preview-content-status');
            statusLabel.textContent = item.status;
            statusLabel.className = 'approval-status-label'; // Reset classes
            if (item.status === 'Aprovado') statusLabel.classList.add('app-status-approved');
            else if (item.status === 'Rejeitado') statusLabel.classList.add('app-status-rejected');
            else statusLabel.classList.add('app-status-pending');

            // Show adjustments notes if rejected
            if (item.adjustments) {
                adjSection.classList.remove('hidden');
                document.getElementById('preview-adjustments-text').textContent = item.adjustments;
            } else {
                adjSection.classList.add('hidden');
            }

            // Show actions only if status is Pendente AND logged-in user is Client!
            const session = JSON.parse(localStorage.getItem('founders_session'));
            if (item.status === 'Pendente' && session && session.role && session.role.startsWith('client-')) {
                actionsRow.classList.remove('hidden');
                
                // Set dataset attributes for click handlers
                actionsRow.setAttribute('data-client-id', client.id);
                // We need the index of the approval item in client.approvals
                const appIdx = client.approvals.findIndex(a => a.id === item.id);
                actionsRow.setAttribute('data-app-idx', appIdx);
            } else {
                actionsRow.classList.add('hidden');
            }
        }

        // Fill Body / Script section
        const bodySec = document.getElementById('preview-body-section');
        if (item.body) {
            bodySec.classList.remove('hidden');
            document.getElementById('preview-body-text').textContent = item.body;
        } else {
            bodySec.classList.add('hidden');
        }

        // Fill Caption section
        const captionSec = document.getElementById('preview-caption-section');
        if (item.caption) {
            captionSec.classList.remove('hidden');
            document.getElementById('preview-caption-text').textContent = item.caption;
        } else {
            captionSec.classList.add('hidden');
        }

        // Render Media
        const mediaContainer = document.getElementById('preview-media-container');
        mediaContainer.innerHTML = '';

        const itemTypeLower = item.type.toLowerCase();
        const isVideo = itemTypeLower.includes('reels') || itemTypeLower.includes('vídeo') || itemTypeLower.includes('video') || itemTypeLower.includes('tiktok');
        const isCarousel = itemTypeLower.includes('carrossel') || itemTypeLower.includes('slides');

        if (isVideo) {
            // Render Video Player
            const wrapper = document.createElement('div');
            wrapper.className = 'preview-video-wrapper';
            
            let videoUrl = 'https://player.vimeo.com/external/371433846.sd.mp4?s=236da2f3c05cba276ebdc4c0ea2cc3d73673f837&profile_id=139&oauth2_token_id=57447761';
            if (item.mediaFiles && item.mediaFiles.length > 0) {
                videoUrl = item.mediaFiles[0];
            }
            
            wrapper.innerHTML = `
                <video src="${videoUrl}" autoplay loop muted playsinline></video>
                <div style="position:absolute; bottom:15px; left:15px; background:rgba(0,0,0,0.5); padding:4px 8px; border-radius:4px; font-size:10px; pointer-events:none; display:flex; align-items:center; gap:5px; color:white; z-index:10;">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="10" height="10"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                    ${item.mediaFiles && item.mediaFiles.length > 0 ? 'Mídia do Cliente' : 'Vídeo Demo'}
                </div>
            `;
            mediaContainer.appendChild(wrapper);
        } else if (isCarousel) {
            // Dynamic slides logic
            let slides = [];
            if (item.mediaFiles && item.mediaFiles.length > 0) {
                slides = [...item.mediaFiles];
            } else {
                slides = [item.thumbnail || 'assets/post_placeholder.png'];
                const pool = ['assets/post_botox.png', 'assets/post_skincare.png', 'assets/post_criomodelagem.png'];
                pool.forEach(p => {
                    if (p !== item.thumbnail && slides.length < 4) {
                        slides.push(p);
                    }
                });
            }

            // Create carousel container
            const container = document.createElement('div');
            container.className = 'carousel-slider-container';
            
            let slidesHtml = '';
            slides.forEach(src => {
                slidesHtml += `<div class="carousel-slide-item"><img src="${src}" alt="Slide"></div>`;
            });

            let dotsHtml = '';
            slides.forEach((_, sIdx) => {
                dotsHtml += `<span class="carousel-dot-node ${sIdx === 0 ? 'active-dot' : ''}" data-slide="${sIdx}"></span>`;
            });

            container.innerHTML = `
                <!-- Invisible Instagram style click zones -->
                <div class="carousel-click-region-left"></div>
                <div class="carousel-click-region-right"></div>
                
                <div class="carousel-slides-wrapper" style="transform: translateX(0px);">
                    ${slidesHtml}
                </div>
                
                <!-- Chevrons -->
                <button class="carousel-nav-btn carousel-prev-btn" style="display:none;">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="16" height="16"><polyline points="15 18 9 12 15 6"></polyline></svg>
                </button>
                <button class="carousel-nav-btn carousel-next-btn">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="16" height="16"><polyline points="9 18 15 12 9 6"></polyline></svg>
                </button>
                
                <!-- Dots indicator -->
                <div class="carousel-dots-indicator">
                    ${dotsHtml}
                </div>
            `;
            
            mediaContainer.appendChild(container);

            // Activate slide navigation logic
            let currentSlide = 0;
            const slidesWrapper = container.querySelector('.carousel-slides-wrapper');
            const prevBtn = container.querySelector('.carousel-prev-btn');
            const nextBtn = container.querySelector('.carousel-next-btn');
            const dots = container.querySelectorAll('.carousel-dot-node');
            const totalSlides = slides.length;

            function updateCarousel() {
                // Move slides wrapper
                slidesWrapper.style.transform = `translateX(-${currentSlide * 100}%)`;
                
                // Show/hide chevrons
                prevBtn.style.display = currentSlide === 0 ? 'none' : 'flex';
                nextBtn.style.display = currentSlide === totalSlides - 1 ? 'none' : 'flex';
                
                // Update dots
                dots.forEach((dot, dIdx) => {
                    if (dIdx === currentSlide) dot.classList.add('active-dot');
                    else dot.classList.remove('active-dot');
                });
            }

            prevBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (currentSlide > 0) {
                    currentSlide--;
                    updateCarousel();
                }
            });

            nextBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (currentSlide < totalSlides - 1) {
                    currentSlide++;
                    updateCarousel();
                }
            });

            // Tap left/right region
            container.querySelector('.carousel-click-region-left').addEventListener('click', (e) => {
                if (currentSlide > 0) {
                    currentSlide--;
                    updateCarousel();
                }
            });

            container.querySelector('.carousel-click-region-right').addEventListener('click', (e) => {
                if (currentSlide < totalSlides - 1) {
                    currentSlide++;
                    updateCarousel();
                }
            });
        } else {
            // Render Simple Photo
            const img = document.createElement('img');
            img.src = (item.mediaFiles && item.mediaFiles.length > 0) ? item.mediaFiles[0] : (item.thumbnail || 'assets/post_placeholder.png');
            img.alt = item.title;
            mediaContainer.appendChild(img);
        }

        // Setup Copy Caption Button
        const copyBtn = document.getElementById('btn-copy-preview-caption');
        if (copyBtn) {
            const newCopyBtn = copyBtn.cloneNode(true);
            copyBtn.parentNode.replaceChild(newCopyBtn, copyBtn);
            
            newCopyBtn.addEventListener('click', () => {
                navigator.clipboard.writeText(item.caption || '').then(() => {
                    const origText = newCopyBtn.innerHTML;
                    newCopyBtn.innerHTML = `✓ Copiado`;
                    newCopyBtn.style.color = '#48bb78';
                    setTimeout(() => {
                        newCopyBtn.innerHTML = origText;
                        newCopyBtn.style.color = '';
                    }, 2000);
                }).catch(err => {
                    console.error('Erro ao copiar legenda:', err);
                });
            });
        }

        // Setup Modal Actions (Approve/Reject)
        const approveBtnModal = modal.querySelector('.approve-content-btn-modal');
        const rejectBtnModal = modal.querySelector('.reject-content-btn-modal');

        if (approveBtnModal && rejectBtnModal) {
            const newAppBtn = approveBtnModal.cloneNode(true);
            approveBtnModal.parentNode.replaceChild(newAppBtn, approveBtnModal);
            
            const newRejBtn = rejectBtnModal.cloneNode(true);
            rejectBtnModal.parentNode.replaceChild(newRejBtn, rejectBtnModal);

            newAppBtn.addEventListener('click', () => {
                const cId = actionsRow.getAttribute('data-client-id');
                const appIdx = parseInt(actionsRow.getAttribute('data-app-idx'));
                const activeClient = clients.find(c => c.id === cId);
                
                if (activeClient && activeClient.approvals[appIdx]) {
                    activeClient.approvals[appIdx].status = 'Aprovado';
                    activeClient.approvals[appIdx].adjustments = '';
                    syncClientApprovalStatusToOperational(activeClient.approvals[appIdx]);
                    saveClients();
                    initClientPortalApprovalsView();
                    closeModal('modal-content-preview');
                    alert('Conteúdo aprovado com sucesso! O time da agência foi notificado.');
                }
            });

            newRejBtn.addEventListener('click', () => {
                const cId = actionsRow.getAttribute('data-client-id');
                const appIdx = parseInt(actionsRow.getAttribute('data-app-idx'));
                const activeClient = clients.find(c => c.id === cId);
                
                if (activeClient && activeClient.approvals[appIdx]) {
                    const comments = prompt('Descreva quais ajustes você gostaria que fossem feitos neste conteúdo:');
                    if (comments !== null && comments.trim() !== '') {
                        activeClient.approvals[appIdx].status = 'Rejeitado';
                        activeClient.approvals[appIdx].adjustments = comments.trim();
                        syncClientApprovalStatusToOperational(activeClient.approvals[appIdx]);
                        saveClients();
                        initClientPortalApprovalsView();
                        closeModal('modal-content-preview');
                        alert('Feedback enviado! O time comercial receberá os ajustes.');
                    }
                }
            });
        }

        // Open modal
        openModal('modal-content-preview');
    }

    // Handles Approve/Reject clicks on the client approvals page
    document.getElementById('client-portal-approvals-list').addEventListener('click', (e) => {
        const approveBtn = e.target.closest('.approve-content-btn');
        const rejectBtn = e.target.closest('.reject-content-btn');
        
        if (!approveBtn && !rejectBtn) return;
        
        const row = e.target.closest('.approval-action-row');
        const idx = parseInt(row.getAttribute('data-idx'));
        const client = getActiveClientPortalObject();

        if (client && client.approvals[idx]) {
            if (approveBtn) {
                client.approvals[idx].status = 'Aprovado';
                client.approvals[idx].adjustments = '';
                syncClientApprovalStatusToOperational(client.approvals[idx]);
                saveClients();
                initClientPortalApprovalsView();
                alert('Conteúdo aprovado com sucesso! O time da agência foi notificado.');
            } else if (rejectBtn) {
                const comments = prompt('Descreva quais ajustes você gostaria que fossem feitos neste conteúdo:');
                if (comments !== null && comments.trim() !== '') {
                    client.approvals[idx].status = 'Rejeitado';
                    client.approvals[idx].adjustments = comments.trim();
                    syncClientApprovalStatusToOperational(client.approvals[idx]);
                    saveClients();
                    initClientPortalApprovalsView();
                    alert('Feedback enviado! O time comercial receberá os ajustes.');
                }
            }
        }
    });


    /* ==========================================================================
       PREVIOUSLY IMPLEMENTED MODULES INTERNAL CODE
       ========================================================================== */

    // Prospecção
    let currentSortScoreDesc = true;
    function initProspeccaoView() {
        document.getElementById('active-list-title').textContent = activeListName;
        document.getElementById('active-list-pill-text').textContent = `${activeListName} (${leads.filter(l => l.listName === activeListName).length})`;
        document.getElementById('search-leads-input').value = '';
        document.getElementById('filter-status-select').value = 'all';
        renderLeadsTable();
    }

    function renderLeadsTable() {
        const activeLeads = leads.filter(l => l.listName === activeListName);
        const searchQuery = document.getElementById('search-leads-input').value.toLowerCase();
        const statusFilter = document.getElementById('filter-status-select').value;
        let filtered = activeLeads.filter(l => {
            const matchesSearch = l.name.toLowerCase().includes(searchQuery) || l.nicho.toLowerCase().includes(searchQuery);
            const matchesStatus = statusFilter === 'all' || l.status === statusFilter;
            return matchesSearch && matchesStatus;
        });
        if (!currentSortScoreDesc) filtered.sort((a, b) => a.score - b.score);
        else filtered.sort((a, b) => b.score - a.score);
        document.getElementById('leads-total').textContent = activeLeads.length;
        document.getElementById('leads-nichos').textContent = [...new Set(activeLeads.map(l => l.nicho))].length;
        document.getElementById('leads-filtrados').textContent = filtered.length;
        const tbody = document.getElementById('leads-tbody');
        tbody.innerHTML = '';
        if (filtered.length === 0) {
            tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: var(--color-text-muted); padding: 30px;">Nenhum lead encontrado.</td></tr>`;
            return;
        }
        filtered.forEach((l, index) => {
            const tr = document.createElement('tr');
            let statusSelectColorClass = '';
            if (l.status === 'Prospecção') statusSelectColorClass = 'color: #9c8e85; font-weight:600;';
            else if (l.status === 'Contato Feito') statusSelectColorClass = 'color: #3182ce; font-weight:600;';
            else if (l.status === 'Respondeu') statusSelectColorClass = 'color: #dd6b20; font-weight:600;';
            else if (l.status === 'Qualificado') statusSelectColorClass = 'color: #805ad5; font-weight:600;';
            else if (l.status === 'Reunião Marcada') statusSelectColorClass = 'color: #319795; font-weight:600;';
            else if (l.status === 'Proposta Enviada') statusSelectColorClass = 'color: #d69e2e; font-weight:600;';
            else if (l.status === 'Perdido') statusSelectColorClass = 'color: #e53e3e; font-weight:600;';
            tr.innerHTML = `
                <td>${index + 1}</td>
                <td><strong>${l.name}</strong></td>
                <td>${l.phone}</td>
                <td><span>${l.nicho}</span></td>
                <td>${l.city}</td>
                <td>
                    <select class="status-select" data-id="${l.id}" style="${statusSelectColorClass}">
                        <option value="Prospecção" ${l.status === 'Prospecção' ? 'selected' : ''}>Prospecção</option>
                        <option value="Contato Feito" ${l.status === 'Contato Feito' ? 'selected' : ''}>Contato Feito</option>
                        <option value="Respondeu" ${l.status === 'Respondeu' ? 'selected' : ''}>Respondeu</option>
                        <option value="Qualificado" ${l.status === 'Qualificado' ? 'selected' : ''}>Qualificado</option>
                        <option value="Reunião Marcada" ${l.status === 'Reunião Marcada' ? 'selected' : ''}>Reunião Marcada</option>
                        <option value="Proposta Enviada" ${l.status === 'Proposta Enviada' ? 'selected' : ''}>Proposta Enviada</option>
                        <option value="Perdido" ${l.status === 'Perdido' ? 'selected' : ''}>Perdido</option>
                    </select>
                </td>
                <td><span class="score-badge" style="color: ${l.score > 50 ? '#3182ce' : 'var(--color-text-muted)'}">${l.score}</span></td>
                <td>${l.followUp || '—'}</td>
                <td>
                    <div class="action-buttons-cell" style="display: flex; gap: 12px; align-items: center;">
                        <span class="action-btn copy-phone-btn" data-phone="${l.phone}" title="Copiar Telefone" style="cursor: pointer; display: inline-flex; align-items: center; justify-content: center; color: var(--color-text-muted); transition: color 0.2s;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg></span>
                        <span class="action-btn chat-whatsapp-btn" data-phone="${l.phone}" title="WhatsApp" style="cursor: pointer; display: inline-flex; align-items: center; justify-content: center; color: var(--color-text-muted); transition: color 0.2s;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg></span>
                        <span class="action-btn delete-btn" data-id="${l.id}" title="Deletar Lead" style="cursor: pointer; display: inline-flex; align-items: center; justify-content: center; color: var(--color-text-muted); transition: color 0.2s;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></span>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    document.getElementById('search-leads-input').addEventListener('input', renderLeadsTable);
    document.getElementById('filter-status-select').addEventListener('change', renderLeadsTable);
    document.getElementById('btn-sort-score').addEventListener('click', () => {
        currentSortScoreDesc = !currentSortScoreDesc;
        renderLeadsTable();
    });

    document.getElementById('btn-clear-leads').addEventListener('click', () => {
        if (confirm('Limpar leads?')) {
            leads = leads.filter(l => l.listName !== activeListName);
            saveLeads();
            if (supabase) {
                supabase.from('leads').delete().eq('list_name', activeListName).then(() => {
                    console.log("Leads da lista removidos do Supabase:", activeListName);
                });
            }
            renderLeadsTable();
        }
    });

    document.getElementById('leads-tbody').addEventListener('change', (e) => {
        if (e.target.classList.contains('status-select')) {
            const id = e.target.getAttribute('data-id');
            const newStatus = e.target.value;
            const lead = leads.find(l => l.id === id);
            if (lead) {
                const oldStatus = lead.status;
                lead.status = newStatus;
                saveLeads(lead);
                const list = lists.find(li => li.name === lead.listName);
                if (list) {
                    if (list.breakdown[oldStatus]) list.breakdown[oldStatus]--;
                    list.breakdown[newStatus] = (list.breakdown[newStatus] || 0) + 1;
                    saveLists();
                }
                renderLeadsTable();
            }
        }
    });

    document.getElementById('leads-tbody').addEventListener('click', (e) => {
        const target = e.target;
        if (target.classList.contains('copy-phone-btn')) {
            navigator.clipboard.writeText(target.getAttribute('data-phone'));
            alert('Copiado!');
        } else if (target.classList.contains('chat-whatsapp-btn')) {
            const phone = target.getAttribute('data-phone').replace(/\D/g, '');
            window.open(`https://wa.me/55${phone}`, '_blank');
        } else if (target.classList.contains('delete-btn')) {
            const id = target.getAttribute('data-id');
            leads = leads.filter(l => l.id !== id);
            saveLeads();
            if (supabase) {
                supabase.from('leads').delete().eq('id', id).then(() => {
                    console.log("Lead deletado do Supabase:", id);
                });
            }
            renderLeadsTable();
        }
    });

    document.getElementById('form-add-lead').addEventListener('submit', (e) => {
        e.preventDefault();
        const newLead = {
            id: 'l_' + Math.random().toString(36).substr(2, 9),
            listName: activeListName,
            name: document.getElementById('lead-name').value.trim(),
            phone: document.getElementById('lead-phone').value.trim(),
            nicho: document.getElementById('lead-nicho').value.trim(),
            city: document.getElementById('lead-city').value.trim() || '—',
            status: document.getElementById('lead-status').value,
            score: parseInt(document.getElementById('lead-score').value) || 18,
            followUp: '—'
        };
        leads.push(newLead);
        saveLeads(newLead);
        closeModal('modal-add-lead');
        renderLeadsTable();
    });

    document.getElementById('form-import-csv').addEventListener('submit', (e) => {
        e.preventDefault();
        const listName = document.getElementById('import-list-name').value.trim();
        const nicho = document.getElementById('import-list-nicho').value.trim();
        const csvData = document.getElementById('import-csv-data').value.trim();
        csvData.split('\n').forEach(row => {
            const cols = row.split(',');
            if (cols.length >= 2) {
                leads.push({
                    id: 'l_' + Math.random().toString(36).substr(2, 9),
                    listName,
                    name: cols[0].trim(),
                    phone: cols[1].trim(),
                    nicho,
                    city: cols[2] ? cols[2].trim() : '—',
                    status: 'Prospecção',
                    score: 18,
                    followUp: '—'
                });
            }
        });
        lists.push({ name: listName, leadsCount: csvData.split('\n').length, date: new Date().toLocaleDateString('pt-BR'), active: true, breakdown: { 'Prospecção': csvData.split('\n').length } });
        activeListName = listName;
        saveActiveListName();
        saveLeads();
        saveLists();
        closeModal('modal-import-csv');
        showView('prospeccao');
    });

    // Listas
    function initListasView() {
        const wrapper = document.getElementById('lists-items-wrapper');
        wrapper.innerHTML = '';
        lists.forEach(list => {
            const card = document.createElement('div');
            card.className = `list-item-card ${list.name === activeListName ? 'active-list' : ''}`;
            let pillsHtml = '';
            for (const [status, count] of Object.entries(list.breakdown)) {
                pillsHtml += `<span class="list-pill ${status.replace(/\s+/g, '').toLowerCase()}">${status}: ${count}</span> `;
            }
            card.innerHTML = `
                <div>
                    <h3>${list.name}</h3>
                    <div class="list-meta-info" style="display: flex; gap: 15px; margin-top: 8px; font-size: 13px; color: var(--color-text-muted);">
                        <span style="display: inline-flex; align-items: center; gap: 4px;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg> ${list.leadsCount} leads</span>
                        <span style="display: inline-flex; align-items: center; gap: 4px;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg> ${list.date}</span>
                    </div>
                    <div class="list-status-breakdown">${pillsHtml}</div>
                </div>
                <div>
                    <button class="btn btn-gold btn-sm load-list-btn" data-name="${list.name}">Carregar</button>
                    <button class="btn btn-xs delete-list-btn" data-name="${list.name}" style="background: transparent; color: #fc8181; border: 1px solid rgba(252, 129, 129, 0.2); padding: 7px 12px; height: 32px; cursor: pointer;">Excluir</button>
                </div>
            `;
            wrapper.appendChild(card);
        });
    }

    document.getElementById('lists-items-wrapper').addEventListener('click', (e) => {
        if (e.target.classList.contains('load-list-btn')) {
            activeListName = e.target.getAttribute('data-name');
            saveActiveListName();
            initListasView();
        }
        else if (e.target.classList.contains('delete-list-btn')) {
            const listName = e.target.getAttribute('data-name');
            if (confirm(`Excluir a lista "${listName}" e todos os leads vinculados a ela? Esta ação é irreversível!`)) {
                // Remove list
                lists = lists.filter(l => l.name !== listName);
                saveLists();

                // Remove leads in list
                leads = leads.filter(l => l.listName !== listName);
                saveLeads();

                // Adjust active list if it was deleted
                if (activeListName === listName) {
                    activeListName = lists.length > 0 ? lists[0].name : '';
                    saveActiveListName();
                }

                initListasView();
            }
        }
    });

    // CRM
    function initCrmView() {
        renderKanban();
        setupKanbanDragDrop();
    }

    function renderKanban() {
        const activeLeads = leads.filter(l => l.listName === activeListName);
        statuses.forEach(status => {
            const statusLeads = activeLeads.filter(l => l.status === status);
            const countEl = document.getElementById(`count-${status.replace(/\s+/g, '').toLowerCase()}`);
            const container = document.getElementById(`cards-${status.replace(/\s+/g, '').toLowerCase()}`);
            if (countEl) countEl.textContent = statusLeads.length;
            if (container) {
                container.innerHTML = '';
                statusLeads.forEach(l => {
                    const card = document.createElement('div');
                    card.className = 'kanban-card';
                    card.setAttribute('draggable', 'true');
                    card.setAttribute('data-id', l.id);
                    card.innerHTML = `<h5>${l.name}</h5><p>${l.nicho}</p>`;
                    container.appendChild(card);
                });
            }
        });
    }

    function setupKanbanDragDrop() {
        const containers = document.querySelectorAll('.kanban-cards-container');
        let draggedCardId = null;
        containers.forEach(container => {
            container.addEventListener('dragstart', (e) => {
                const card = e.target.closest('.kanban-card');
                if (card) { draggedCardId = card.getAttribute('data-id'); card.classList.add('dragging'); }
            });
            container.addEventListener('dragend', (e) => {
                const card = e.target.closest('.kanban-card');
                if (card) card.classList.remove('dragging');
                containers.forEach(c => c.classList.remove('drag-over'));
            });
            container.addEventListener('dragover', (e) => { e.preventDefault(); container.classList.add('drag-over'); });
            container.addEventListener('dragleave', () => container.classList.remove('drag-over'));
            container.addEventListener('drop', (e) => {
                e.preventDefault();
                container.classList.remove('drag-over');
                const column = container.closest('.kanban-column');
                const targetStatus = column.getAttribute('data-status');
                if (draggedCardId && targetStatus) {
                    const lead = leads.find(l => l.id === draggedCardId);
                    if (lead) {
                        const oldStatus = lead.status;
                        lead.status = targetStatus;
                        saveLeads();
                        const list = lists.find(li => li.name === lead.listName);
                        if (list) {
                            if (list.breakdown[oldStatus]) list.breakdown[oldStatus]--;
                            list.breakdown[targetStatus] = (list.breakdown[targetStatus] || 0) + 1;
                            saveLists();
                        }
                        renderKanban();
                    }
                }
            });
        });
    }

    // Dashboard detailed
    function initDashboardView() {
        const activeLeads = leads.filter(l => l.listName === activeListName);
        const total = activeLeads.length;
        const counts = {};
        statuses.concat(['Perdido']).forEach(s => counts[s] = activeLeads.filter(l => l.status === s).length);
        const contatados = total - (counts['Prospecção'] || 0);
        const respostaRate = contatados > 0 ? (((counts['Respondeu'] || 0) + (counts['Qualificado'] || 0) + (counts['Reunião Marcada'] || 0) + (counts['Proposta Enviada'] || 0)) / contatados * 100).toFixed(1) : '0.0';
        const reuniaoRate = total > 0 ? (((counts['Reunião Marcada'] || 0) + (counts['Proposta Enviada'] || 0)) / total * 100).toFixed(1) : '0.0';
        const fechados = counts['Reunião Marcada'] || 0;
        const closeRate = total > 0 ? (fechados / total * 100).toFixed(1) : '0.0';

        document.getElementById('dash-total-leads').textContent = total;
        document.getElementById('dash-contatados').textContent = contatados;
        document.getElementById('dash-taxa-resposta').textContent = respostaRate + '%';
        document.getElementById('dash-taxa-reuniao').textContent = reuniaoRate + '%';
        document.getElementById('dash-taxa-fechamento').textContent = closeRate + '%';
        document.getElementById('dash-fechados').textContent = fechados;
        renderDonutChart(counts, total);
        renderNichoBarChart(activeLeads);
    }

    function renderDonutChart(counts, total) {
        const donut = document.getElementById('status-donut-chart');
        const legend = document.getElementById('status-chart-legend');
        document.getElementById('donut-center-title').textContent = total;
        legend.innerHTML = '';
        if (total === 0) {
            donut.innerHTML = `<circle cx="50" cy="50" r="35" fill="transparent" stroke="#2a1914" stroke-width="15"></circle>`;
            return;
        }
        const statusColors = { 'Prospecção': '#9c8e85', 'Contato Feito': '#3182ce', 'Respondeu': '#dd6b20', 'Qualificado': '#805ad5', 'Reunião Marcada': '#319795', 'Proposta Enviada': '#d69e2e', 'Perdido': '#e53e3e' };
        let accPct = 0;
        let svgHtml = '';
        for (const [status, count] of Object.entries(counts)) {
            if (count > 0) {
                const pct = (count / total) * 100;
                const strokeDash = `${(pct / 100) * 219.91} 219.91`;
                const strokeOffset = -((accPct / 100) * 219.91);
                svgHtml += `<circle cx="50" cy="50" r="35" fill="transparent" stroke="${statusColors[status]}" stroke-width="14" stroke-dasharray="${strokeDash}" stroke-dashoffset="${strokeOffset}"></circle>`;
                accPct += pct;
                legend.innerHTML += `<div class="legend-item"><span class="legend-color" style="background-color: ${statusColors[status]};"></span><span>${status}: ${count}</span></div>`;
            }
        }
        svgHtml += `<circle cx="50" cy="50" r="28" fill="#221410"></circle>`;
        donut.innerHTML = svgHtml;
    }

    function renderNichoBarChart(leadsList) {
        const wrapper = document.getElementById('nicho-bar-chart');
        wrapper.innerHTML = '';
        const groups = {};
        leadsList.forEach(l => groups[l.nicho] = (groups[l.nicho] || 0) + 1);
        const sorted = Object.entries(groups).sort((a,b)=>b[1]-a[1]);
        if (sorted.length > 0) {
            const max = sorted[0][1];
            sorted.forEach(([nicho, count]) => {
                wrapper.innerHTML += `
                    <div class="bar-row">
                        <div class="bar-labels"><span>${nicho}</span><span>${count}</span></div>
                        <div class="bar-bg"><div class="bar-fill" style="width: ${(count/max)*100}%;"></div></div>
                    </div>
                `;
            });
        }
    }

    // Scripts
    let activeScriptType = 'all';
    function initScriptsView() {
        const select = document.getElementById('script-lead-select');
        select.innerHTML = '<option value="none">Nenhum</option>';
        leads.filter(l => l.listName === activeListName).forEach(l => {
            select.innerHTML += `<option value="${l.id}">${l.name}</option>`;
        });
        renderScriptsList();
    }

    function renderScriptsList() {
        const container = document.getElementById('scripts-list');
        const query = document.getElementById('search-scripts-input').value.toLowerCase();
        const leadId = document.getElementById('script-lead-select').value;
        const lead = leads.find(l => l.id === leadId);
        container.innerHTML = '';
        scripts.forEach(s => {
            if (activeScriptType !== 'all' && s.type !== activeScriptType) return;
            if (query && !s.title.toLowerCase().includes(query)) return;
            let body = s.body;
            if (lead) {
                body = body.replace(/\{\{nome\}\}/g, lead.name).replace(/\{\{nicho\}\}/g, lead.nicho).replace(/\{\{cidade\}\}/g, lead.city);
            }
            container.innerHTML += `
                <div class="script-card">
                    <h4>${s.title}</h4>
                    <div class="script-body-box" id="scr-b-${s.id}">${body}</div>
                    <button class="btn btn-dark btn-sm cp-scr-btn" data-id="${s.id}">Copiar</button>
                </div>
            `;
        });
    }

    document.getElementById('search-scripts-input').addEventListener('input', renderScriptsList);
    document.getElementById('script-lead-select').addEventListener('change', renderScriptsList);
    document.getElementById('script-type-filters').addEventListener('click', (e) => {
        if (e.target.classList.contains('filter-btn')) {
            document.querySelectorAll('#script-type-filters .filter-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            activeScriptType = e.target.getAttribute('data-type');
            renderScriptsList();
        }
    });

    document.getElementById('scripts-list').addEventListener('click', (e) => {
        if (e.target.classList.contains('cp-scr-btn')) {
            navigator.clipboard.writeText(document.getElementById(`scr-b-${e.target.getAttribute('data-id')}`).innerText);
            alert('Copiado!');
        }
    });

    // Demandas
    function initDemandasView() {
        renderDemandsMeta();
        renderPlayerRoutines();
    }

    function renderDemandsMeta() {
        document.getElementById('meta-current-value').textContent = demandsMeta;
        let tot = 0, comp = 0;
        playerRoutines.forEach(p => p.tasks.forEach(t => { tot++; if (t.completed) comp++; }));
        document.getElementById('meta-progress-bar').style.width = (tot > 0 ? (comp/tot)*100 : 0) + '%';
        document.getElementById('meta-tasks-today').textContent = comp;
    }

    function renderPlayerRoutines() {
        const wrapper = document.getElementById('players-routines-list');
        wrapper.innerHTML = '';
        playerRoutines.forEach((p, pIdx) => {
            let listHtml = '';
            p.tasks.forEach((t, tIdx) => {
                listHtml += `
                    <div class="task-row ${t.completed ? 'completed' : ''}">
                        <div class="task-checkbox toggle-play-task ${t.completed ? 'completed' : ''}" data-p="${pIdx}" data-t="${tIdx}"></div>
                        <span class="task-title">${t.title}</span>
                        <div class="task-actions" style="display: flex; gap: 8px; align-items: center; margin-left: auto;">
                            <button class="btn-edit-task" data-p="${pIdx}" data-t="${tIdx}" style="background:transparent; border:none; color:var(--color-accent-gold); cursor:pointer; padding: 2px; display: inline-flex; align-items: center; justify-content: center; opacity: 0.7; transition: opacity 0.2s;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg></button>
                            <button class="btn-delete-task" data-p="${pIdx}" data-t="${tIdx}" style="background:transparent; border:none; color:#fc8181; cursor:pointer; padding: 2px; display: inline-flex; align-items: center; justify-content: center; opacity: 0.7; transition: opacity 0.2s;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button>
                        </div>
                    </div>
                `;
            });
            wrapper.innerHTML += `
                <div class="player-card">
                    <div class="player-header" style="display: flex; align-items: center; width: 100%;">
                        <div class="player-avatar">${p.name ? p.name[0] : '?'}</div>
                        <div style="flex-grow: 1;">
                            <h4 style="margin: 0;">${p.name || 'Sem Nome'}</h4>
                            <div class="player-xp-bar-bg" style="margin-top: 4px;"><div class="player-xp-bar-fill" style="width: ${p.xp || 0}%;"></div></div>
                        </div>
                        <div class="player-header-actions" style="display: flex; gap: 8px; align-items: center; margin-left: auto;">
                            <button class="btn-edit-player" data-p="${pIdx}" style="background:transparent; border:none; color:var(--color-accent-gold); cursor:pointer; padding: 4px; display: inline-flex; align-items: center; justify-content: center; opacity: 0.7; transition: opacity 0.2s;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg></button>
                            <button class="btn-delete-player" data-p="${pIdx}" style="background:transparent; border:none; color:#fc8181; cursor:pointer; padding: 4px; display: inline-flex; align-items: center; justify-content: center; opacity: 0.7; transition: opacity 0.2s;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button>
                        </div>
                    </div>
                    <div class="task-list">${listHtml}</div>
                </div>
            `;
        });
    }

    document.getElementById('players-routines-list').addEventListener('click', (e) => {
        const toggleBtn = e.target.closest('.toggle-play-task');
        const editPlayerBtn = e.target.closest('.btn-edit-player');
        const deletePlayerBtn = e.target.closest('.btn-delete-player');
        const editTaskBtn = e.target.closest('.btn-edit-task');
        const deleteTaskBtn = e.target.closest('.btn-delete-task');

        if (toggleBtn) {
            const pIdx = parseInt(toggleBtn.getAttribute('data-p'));
            const tIdx = parseInt(toggleBtn.getAttribute('data-t'));
            playerRoutines[pIdx].tasks[tIdx].completed = !playerRoutines[pIdx].tasks[tIdx].completed;
            saveRoutines(playerRoutines[pIdx]);
            initDemandasView();
        } else if (editPlayerBtn) {
            const pIdx = parseInt(editPlayerBtn.getAttribute('data-p'));
            const p = playerRoutines[pIdx];
            if (p) {
                document.getElementById('edit-player-idx').value = pIdx;
                document.getElementById('edit-player-name-input').value = p.name || '';
                document.getElementById('edit-player-xp-input').value = p.xp || 0;
                openModal('modal-edit-player');
            }
        } else if (deletePlayerBtn) {
            const pIdx = parseInt(deletePlayerBtn.getAttribute('data-p'));
            const p = playerRoutines[pIdx];
            if (p && confirm(`Deseja realmente remover o player "${p.name}" e todas as suas rotinas?`)) {
                const deletedPlayerId = p.id;
                playerRoutines.splice(pIdx, 1);
                saveRoutines();
                if (supabase) {
                    supabase.from('player_routines').delete().eq('id', deletedPlayerId).then(() => {
                        console.log("Player deletado do Supabase:", deletedPlayerId);
                    });
                }
                initDemandasView();
            }
        } else if (editTaskBtn) {
            const pIdx = parseInt(editTaskBtn.getAttribute('data-p'));
            const tIdx = parseInt(editTaskBtn.getAttribute('data-t'));
            const p = playerRoutines[pIdx];
            const t = p ? p.tasks[tIdx] : null;
            if (t) {
                document.getElementById('edit-task-p-idx').value = pIdx;
                document.getElementById('edit-task-t-idx').value = tIdx;
                document.getElementById('edit-task-title-input').value = t.title || '';
                document.getElementById('edit-task-type-select').value = t.type || 'Fixa';
                openModal('modal-edit-task');
            }
        } else if (deleteTaskBtn) {
            const pIdx = parseInt(deleteTaskBtn.getAttribute('data-p'));
            const tIdx = parseInt(deleteTaskBtn.getAttribute('data-t'));
            const p = playerRoutines[pIdx];
            const t = p ? p.tasks[tIdx] : null;
            if (t && confirm(`Deseja realmente excluir a tarefa "${t.title}"?`)) {
                p.tasks.splice(tIdx, 1);
                saveRoutines(p);
                initDemandasView();
            }
        }
    });

    // Calendario
    let calY = 2026, calM = 5; // Month index 5 is June
    let miniCalY = 2026, miniCalM = 5;
    let selectedEventId = null;

    function initCalendarView() {
        const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
        document.getElementById('calendar-month-year-title').textContent = `${months[calM]} de ${calY}`;
        
        // Filter values
        const uncheckedCategories = new Set();
        document.querySelectorAll('.agenda-filter-checkbox').forEach(cb => {
            if (!cb.checked) {
                uncheckedCategories.add(cb.getAttribute('data-category'));
            }
        });
        
        const searchQuery = document.getElementById('calendar-search-input')?.value.trim().toLowerCase() || '';

        const grid = document.getElementById('calendar-days-grid');
        if (!grid) return;
        grid.innerHTML = '';
        
        const numDays = new Date(calY, calM + 1, 0).getDate();
        const firstDayIndex = new Date(calY, calM, 1).getDay();
        const prevMonthDays = new Date(calY, calM, 0).getDate();
        
        const today = new Date();
        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
        
        const totalCells = 42;
        
        // 1. Previous month padding days
        for (let i = firstDayIndex - 1; i >= 0; i--) {
            const dayNum = prevMonthDays - i;
            const pmYear = calM === 0 ? calY - 1 : calY;
            const pmMonth = calM === 0 ? 12 : calM;
            const dateStr = `${pmYear}-${String(pmMonth).padStart(2,'0')}-${String(dayNum).padStart(2,'0')}`;
            
            const dayEvents = filterAndGetEvents(dateStr, uncheckedCategories, searchQuery);
            const eventsHtml = renderEventPillsHtml(dayEvents);
            
            grid.innerHTML += `
                <div class="calendar-day-cell other-month" data-date="${dateStr}">
                    <div class="day-header-row">
                        <span class="day-number-text">${dayNum}</span>
                    </div>
                    <div class="day-events-container">${eventsHtml}</div>
                </div>
            `;
        }
        
        // 2. Active month days
        for (let i = 1; i <= numDays; i++) {
            const dateStr = `${calY}-${String(calM + 1).padStart(2,'0')}-${String(i).padStart(2,'0')}`;
            const isToday = dateStr === todayStr;
            
            const dayEvents = filterAndGetEvents(dateStr, uncheckedCategories, searchQuery);
            const eventsHtml = renderEventPillsHtml(dayEvents);
            
            grid.innerHTML += `
                <div class="calendar-day-cell ${isToday ? 'today-cell' : ''}" data-date="${dateStr}">
                    <div class="day-header-row">
                        <span class="day-number-text">${i}</span>
                    </div>
                    <div class="day-events-container">${eventsHtml}</div>
                </div>
            `;
        }
        
        // 3. Next month padding days
        const renderedSoFar = firstDayIndex + numDays;
        const nextMonthPadding = totalCells - renderedSoFar;
        for (let i = 1; i <= nextMonthPadding; i++) {
            const nmYear = calM === 11 ? calY + 1 : calY;
            const nmMonth = calM === 11 ? 1 : calM + 2;
            const dateStr = `${nmYear}-${String(nmMonth).padStart(2,'0')}-${String(i).padStart(2,'0')}`;
            
            const dayEvents = filterAndGetEvents(dateStr, uncheckedCategories, searchQuery);
            const eventsHtml = renderEventPillsHtml(dayEvents);
            
            grid.innerHTML += `
                <div class="calendar-day-cell other-month" data-date="${dateStr}">
                    <div class="day-header-row">
                        <span class="day-number-text">${i}</span>
                    </div>
                    <div class="day-events-container">${eventsHtml}</div>
                </div>
            `;
        }
        
        renderMiniCalendar();
    }

    function filterAndGetEvents(dateStr, uncheckedCats, query) {
        return calendarEvents.filter(e => {
            if (e.date !== dateStr) return false;
            if (uncheckedCats.has(e.category || 'reuniao')) return false;
            if (query && !e.title.toLowerCase().includes(query)) return false;
            return true;
        }).sort((a,b) => (a.time || '00:00').localeCompare(b.time || '00:00'));
    }

    function renderEventPillsHtml(events) {
        let html = '';
        events.forEach(e => {
            const cat = e.category || 'reuniao';
            const displayTime = e.time && e.time !== '00:00' ? `<span style="opacity: 0.8; font-weight: normal; margin-right: 4px;">${e.time}</span>` : '';
            html += `
                <div class="gcal-event-pill event-${cat}" data-id="${e.id}" title="${e.title}">
                    ${displayTime}${e.title}
                </div>
            `;
        });
        return html;
    }

    // Mini Calendar Rendering
    function renderMiniCalendar() {
        const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
        const titleEl = document.getElementById('mini-cal-month-year');
        if (titleEl) titleEl.textContent = `${months[miniCalM]} ${miniCalY}`;
        
        const grid = document.getElementById('mini-calendar-grid');
        if (!grid) return;
        grid.innerHTML = '';
        
        const numDays = new Date(miniCalY, miniCalM + 1, 0).getDate();
        const firstDayIndex = new Date(miniCalY, miniCalM, 1).getDay();
        const prevMonthDays = new Date(miniCalY, miniCalM, 0).getDate();
        
        const today = new Date();
        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
        
        const totalMiniCells = 42;
        
        // 1. Prev month padding days
        for (let i = firstDayIndex - 1; i >= 0; i--) {
            const dayNum = prevMonthDays - i;
            const pmM = miniCalM === 0 ? 11 : miniCalM - 1;
            const pmY = miniCalM === 0 ? miniCalY - 1 : miniCalY;
            grid.innerHTML += `<div class="mini-cal-cell faded" data-day="${dayNum}" data-month="${pmM}" data-year="${pmY}">${dayNum}</div>`;
        }
        
        // 2. Active month days
        for (let i = 1; i <= numDays; i++) {
            const dateStr = `${miniCalY}-${String(miniCalM + 1).padStart(2,'0')}-${String(i).padStart(2,'0')}`;
            const isToday = dateStr === todayStr;
            const isSelected = miniCalY === calY && miniCalM === calM;
            
            grid.innerHTML += `
                <div class="mini-cal-cell active-month-day ${isToday ? 'today-mini' : ''} ${isSelected ? 'selected-mini' : ''}" data-day="${i}" data-month="${miniCalM}" data-year="${miniCalY}">
                    ${i}
                </div>
            `;
        }
        
        // 3. Next month padding days
        const rendered = firstDayIndex + numDays;
        const padding = totalMiniCells - rendered;
        for (let i = 1; i <= padding; i++) {
            const nmM = miniCalM === 11 ? 0 : miniCalM + 1;
            const nmY = miniCalM === 11 ? miniCalY + 1 : miniCalY;
            grid.innerHTML += `<div class="mini-cal-cell faded" data-day="${i}" data-month="${nmM}" data-year="${nmY}">${i}</div>`;
        }
    }

    // Mini Calendar Navigation
    document.getElementById('mini-cal-prev')?.addEventListener('click', (e) => {
        e.stopPropagation();
        miniCalM--;
        if (miniCalM < 0) { miniCalM = 11; miniCalY--; }
        renderMiniCalendar();
    });

    document.getElementById('mini-cal-next')?.addEventListener('click', (e) => {
        e.stopPropagation();
        miniCalM++;
        if (miniCalM > 11) { miniCalM = 0; miniCalY++; }
        renderMiniCalendar();
    });

    // Handle Mini Calendar day selection
    document.getElementById('mini-calendar-grid')?.addEventListener('click', (e) => {
        const cell = e.target.closest('.mini-cal-cell');
        if (cell) {
            const d = parseInt(cell.getAttribute('data-day'));
            const m = parseInt(cell.getAttribute('data-month'));
            const y = parseInt(cell.getAttribute('data-year'));
            calM = m;
            calY = y;
            miniCalM = m;
            miniCalY = y;
            initCalendarView();
        }
    });

    // Navigation and interactive controls
    document.getElementById('calendar-prev-month')?.addEventListener('click', () => {
        calM--;
        if (calM < 0) { calM = 11; calY--; }
        miniCalM = calM;
        miniCalY = calY;
        initCalendarView();
    });
    
    document.getElementById('calendar-next-month')?.addEventListener('click', () => {
        calM++;
        if (calM > 11) { calM = 0; calY++; }
        miniCalM = calM;
        miniCalY = calY;
        initCalendarView();
    });
    
    document.getElementById('calendar-today-btn')?.addEventListener('click', () => {
        const today = new Date();
        calM = today.getMonth();
        calY = today.getFullYear();
        miniCalM = calM;
        miniCalY = calY;
        initCalendarView();
    });

    // Filters and search input listeners
    document.querySelectorAll('.agenda-filter-checkbox').forEach(cb => {
        cb.addEventListener('change', () => {
            initCalendarView();
        });
    });

    document.getElementById('calendar-search-input')?.addEventListener('input', () => {
        initCalendarView();
    });

    // Handle Click on Main Grid Day Cells or Event Pills
    document.getElementById('calendar-days-grid')?.addEventListener('click', (e) => {
        const pill = e.target.closest('.gcal-event-pill');
        if (pill) {
            e.stopPropagation();
            const eventId = pill.getAttribute('data-id');
            const event = calendarEvents.find(ev => ev.id === eventId);
            if (event) {
                selectedEventId = eventId;
                
                // Show modal details
                document.getElementById('event-details-title-text').textContent = event.title;
                
                // Format date nicely
                let formattedDate = event.date;
                if (event.date && event.date.includes('-')) {
                    const parts = event.date.split('-');
                    const dateObj = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
                    const weekdays = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
                    const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
                    formattedDate = `${weekdays[dateObj.getDay()]}, ${parts[2]} de ${months[dateObj.getMonth()]} de ${parts[0]}`;
                }
                document.getElementById('event-details-datetime').textContent = `${formattedDate} · ${event.time || '00:00'}`;
                
                // Set description
                document.getElementById('event-details-desc').textContent = event.desc || 'Sem observações adicionais.';
                
                // Set dot color based on category
                const dot = document.getElementById('event-details-category-dot');
                if (dot) {
                    const cat = event.category || 'reuniao';
                    if (cat === 'reuniao') {
                        dot.style.backgroundColor = '#3182ce';
                    } else if (cat === 'reuniao-agência') {
                        dot.style.backgroundColor = '#48bb78';
                    } else if (cat === 'feriado') {
                        dot.style.backgroundColor = '#d4af37';
                    } else if (cat === 'tarefa') {
                        dot.style.backgroundColor = '#a0aec0';
                    }
                }
                
                openModal('modal-event-details');
            }
        }
    });

    // Delete Event logic
    document.getElementById('btn-delete-event')?.addEventListener('click', () => {
        if (currentRole !== 'adm') {
            alert('Acesso restrito a administradores.');
            return;
        }
        if (selectedEventId) {
            const event = calendarEvents.find(ev => ev.id === selectedEventId);
            if (event && confirm(`Deseja realmente excluir o compromisso "${event.title}"?`)) {
                calendarEvents = calendarEvents.filter(ev => ev.id !== selectedEventId);
                saveCalendarEvents();
                closeModal('modal-event-details');
                selectedEventId = null;
                initCalendarView();
            }
        }
    });

    // Calculadora
    function initCalculadoraView() {
        calcInputs.forEach(i => {
            const inEl = document.getElementById(`calc-in-${i}`);
            const range = document.getElementById(`calc-range-${i}`);
            if (inEl && range) {
                inEl.addEventListener('input', () => { range.value = inEl.value; runCalculations(); });
                range.addEventListener('input', () => { inEl.value = range.value; runCalculations(); });
            }
        });
        runCalculations();
    }

    function runCalculations() {
        const ads = parseFloat(document.getElementById('calc-in-ads').value) || 0;
        const cpl = parseFloat(document.getElementById('calc-in-cpl').value) || 1;
        const tag = parseFloat(document.getElementById('calc-in-tag').value) || 0;
        const tcom = parseFloat(document.getElementById('calc-in-tcom').value) || 0;
        const tconv = parseFloat(document.getElementById('calc-in-tconv').value) || 0;
        const ticket = parseFloat(document.getElementById('calc-in-ticket').value) || 0;

        const leadsCount = Math.round(ads/cpl);
        const agendados = Math.round(leadsCount * (tag/100));
        const realizadas = Math.round(agendados * (tcom/100));
        const vendas = Math.round(realizadas * (tconv/100));
        const faturamento = vendas * ticket;
        const roas = ads > 0 ? (faturamento/ads).toFixed(1) : '0.0';

        document.getElementById('calc-leads-total').textContent = leadsCount.toLocaleString();
        document.getElementById('calc-agendados-total').textContent = agendados.toLocaleString();
        document.getElementById('calc-realizadas-total').textContent = realizadas.toLocaleString();
        document.getElementById('calc-vendas-total').textContent = vendas.toLocaleString();
        document.getElementById('calc-faturamento-total').textContent = 'R$ ' + faturamento.toLocaleString();
        document.getElementById('calc-roas-status').textContent = `ROAS ${roas}x`;
        document.getElementById('res-faturamento-mensal').textContent = 'R$ ' + faturamento.toLocaleString();
        document.getElementById('res-numero-vendas').textContent = vendas;
        document.getElementById('res-roas-value').textContent = roas + 'x';
        document.getElementById('res-faturamento-anual').textContent = 'R$ ' + (faturamento*12).toLocaleString();
        document.getElementById('res-lucro-anual').textContent = 'R$ ' + ((faturamento*12)-(ads*12)).toLocaleString();
    }

    // Contador
    function initContadorView() {
        document.getElementById('counter-daily-goal').textContent = counterGoal;
        document.getElementById('counter-value-num').textContent = counterValue;
        const pct = (counterValue / counterGoal) * 100;
        document.getElementById('counter-progress-fill').style.width = Math.min(100, pct) + '%';
    }

    document.getElementById('btn-counter-inc').addEventListener('click', () => { counterValue++; localStorage.setItem('founders_counter_val', counterValue); initContadorView(); });
    document.getElementById('btn-counter-dec').addEventListener('click', () => { counterValue = Math.max(0, counterValue-1); localStorage.setItem('founders_counter_val', counterValue); initContadorView(); });
    document.getElementById('btn-counter-reset').addEventListener('click', () => { counterValue = 0; localStorage.setItem('founders_counter_val', counterValue); initContadorView(); });

    // Calculadora reset button handler
    document.getElementById('btn-reset-calc')?.addEventListener('click', () => {
        if (confirm('Deseja resetar todos os valores da calculadora para o padrão?')) {
            document.getElementById('calc-in-ads').value = 1002000;
            document.getElementById('calc-range-ads').value = 1002000;
            document.getElementById('calc-in-cpl').value = 550;
            document.getElementById('calc-range-cpl').value = 550;
            document.getElementById('calc-in-tag').value = 20;
            document.getElementById('calc-range-tag').value = 20;
            document.getElementById('calc-in-tcom').value = 80;
            document.getElementById('calc-range-tcom').value = 80;
            document.getElementById('calc-in-tconv').value = 30;
            document.getElementById('calc-range-tconv').value = 30;
            document.getElementById('calc-in-ticket').value = 5000;
            document.getElementById('calc-range-ticket').value = 5000;
            runCalculations();
        }
    });

    // Cidades
    let loadedCities = [];
    let citiesSortAsc = true;

    function initCidadesView() {
        document.getElementById('cidades-list-wrapper').innerHTML = '<div class="cidades-empty-state"><p>Selecione um estado para começar.</p></div>';
    }

    function renderCitiesList() {
        const wrapper = document.getElementById('cidades-list-wrapper');
        wrapper.innerHTML = '';
        
        if (loadedCities.length === 0) {
            wrapper.innerHTML = '<div class="cidades-empty-state"><p>Nenhuma cidade carregada.</p></div>';
            return;
        }

        const sorted = [...loadedCities].sort((a, b) => {
            if (citiesSortAsc) return a.nome.localeCompare(b.nome);
            else return b.nome.localeCompare(a.nome);
        });

        const grid = document.createElement('div');
        grid.className = 'cidades-premium-list';
        
        sorted.forEach(c => {
            const mockPop = ((c.nome.length * 37) % 450 + 50) * 1000;
            grid.innerHTML += `
                <div class="cidade-item-row">
                    <span>${c.nome}</span>
                    <span>Pop: ${mockPop.toLocaleString('pt-BR')}</span>
                </div>
            `;
        });
        wrapper.appendChild(grid);
    }

    document.getElementById('cidades-state-select').addEventListener('change', (e) => {
        const uf = e.target.value;
        const wrapper = document.getElementById('cidades-list-wrapper');
        if (!uf) {
            loadedCities = [];
            initCidadesView();
            return;
        }
        wrapper.innerHTML = '<div class="spinner-loader"></div>';
        fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios`)
            .then(res => res.json())
            .then(data => {
                loadedCities = data.slice(0, 30);
                renderCitiesList();
            });
    });

    document.getElementById('btn-sort-cidades')?.addEventListener('click', () => {
        citiesSortAsc = !citiesSortAsc;
        document.getElementById('btn-sort-cidades').textContent = citiesSortAsc ? '▲ Crescente' : '▼ Decrescente';
        renderCitiesList();
    });

    // Prompts
    function initPromptsView() {
        const grid = document.getElementById('prompts-list-grid');
        if (grid) {
            grid.innerHTML = '';
            promptsList.forEach(p => {
                grid.innerHTML += `
                    <div class="prompt-card">
                        <h4>${p.title}</h4>
                        <span class="prompt-card-category">${p.category}</span>
                        <div class="prompt-card-body">${p.body}</div>
                    </div>
                `;
            });
        }
    }

    /* ==========================================================================
       NEW SAAS MODULES LOGIC & CONTROLLERS
       ========================================================================== */

    // Helper: contract days to expiration
    function getDaysToExpiration(startDateStr, durationMonths) {
        if (!startDateStr) return 999;
        const start = new Date(startDateStr);
        const end = new Date(start);
        end.setMonth(start.getMonth() + durationMonths);
        const today = new Date();
        const diffTime = end - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    }

    // --- ALERTAS ADM ---
    let currentAlertFilter = 'todos';
    
    function initAlertasView() {
        document.querySelectorAll('#view-alertas .saas-subtabs-nav .saas-subtab-btn').forEach(btn => {
            if (!btn.dataset.listenerBound) {
                btn.addEventListener('click', (e) => {
                    document.querySelectorAll('#view-alertas .saas-subtabs-nav .saas-subtab-btn').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    currentAlertFilter = btn.getAttribute('data-alert-filter');
                    renderAlertsList();
                });
                btn.dataset.listenerBound = 'true';
            }
        });
        renderAlertsList();
    }

    function renderAlertsList() {
        const alerts = [];
        
        // 1. Financeiro: Atrasados e Próximos do Fim
        clients.forEach(c => {
            if (c.status === 'active') {
                if (c.paymentStatus === 'Atrasado') {
                    alerts.push({
                        id: 'al_fin_late_' + c.id,
                        type: 'financeiro',
                        title: `Fatura Atrasada: ${c.name}`,
                        desc: `A mensalidade de R$ ${c.value.toLocaleString('pt-BR')},00 (Vencimento: Dia ${c.payday}) está com pagamento em atraso.`,
                        badgeText: 'Crítico',
                        badgeClass: 'badge-red'
                    });
                }
                
                const daysLeft = getDaysToExpiration(c.startDate, c.duration);
                if (daysLeft >= 0 && daysLeft <= 30) {
                    alerts.push({
                        id: 'al_fin_exp_' + c.id,
                        type: 'financeiro',
                        title: `Contrato Próximo do Fim: ${c.name}`,
                        desc: `O contrato expira em ${daysLeft} dias. Valor: R$ ${c.value.toLocaleString('pt-BR')},00/mês.`,
                        badgeText: `${daysLeft} dias`,
                        badgeClass: 'badge-orange'
                    });
                }
            }
        });

        // 2. Operação: Rotinas pendentes
        playerRoutines.forEach((p, pIdx) => {
            if (p.tasks) {
                p.tasks.forEach((t, tIdx) => {
                    if (!t.completed) {
                        alerts.push({
                            id: `al_ops_task_${pIdx}_${tIdx}`,
                            type: 'operacao',
                            title: `Demanda Pendente: ${p.name}`,
                            desc: `O player ${p.name} ainda não concluiu a rotina: "${t.title}".`,
                            badgeText: t.type || 'Rotina',
                            badgeClass: 'badge-orange'
                        });
                    }
                });
            }
        });

        // 3. Conteúdo: Aprovações do cliente pendentes/rejeitadas
        clients.forEach(c => {
            if (c.approvals) {
                c.approvals.forEach((a, idx) => {
                    if (a.status === 'Pendente') {
                        alerts.push({
                            id: `al_cont_app_${c.id}_${a.id || idx}`,
                            type: 'conteudo',
                            title: `Aprovação Pendente: ${c.name}`,
                            desc: `O conteúdo "${a.title}" aguarda a revisão do cliente.`,
                            badgeText: 'Pendente',
                            badgeClass: 'badge-gold'
                        });
                    } else if (a.status === 'Rejeitado' || a.status === 'Correção Solicitada') {
                        alerts.push({
                            id: `al_cont_rej_${c.id}_${a.id || idx}`,
                            type: 'conteudo',
                            title: `Ajuste Solicitado: ${c.name}`,
                            desc: `O cliente solicitou correções em "${a.title}". Motivo: "${a.adjustments || 'Ver detalhes'}"`,
                            badgeText: 'Refação',
                            badgeClass: 'badge-red'
                        });
                    }
                });
            }
        });

        // Update Counts (excluding dismissed alerts)
        const activeAlerts = alerts.filter(a => !dismissedAlerts.includes(a.id));
        const countAll = activeAlerts.length;
        const countFin = activeAlerts.filter(a => a.type === 'financeiro').length;
        const countOps = activeAlerts.filter(a => a.type === 'operacao').length;
        const countCont = activeAlerts.filter(a => a.type === 'conteudo').length;

        const allEl = document.getElementById('alert-count-all');
        if (allEl) allEl.textContent = countAll;
        const finEl = document.getElementById('alert-count-fin');
        if (finEl) finEl.textContent = countFin;
        const opsEl = document.getElementById('alert-count-ops');
        if (opsEl) opsEl.textContent = countOps;
        const contEl = document.getElementById('alert-count-cont');
        if (contEl) contEl.textContent = countCont;

        // Filter list
        let filtered = alerts.filter(a => !dismissedAlerts.includes(a.id));
        if (currentAlertFilter !== 'todos') {
            filtered = filtered.filter(a => a.type === currentAlertFilter);
        }

        const wrapper = document.getElementById('alerts-feed-wrapper');
        if (!wrapper) return;
        wrapper.innerHTML = '';

        if (filtered.length === 0) {
            wrapper.innerHTML = `<div class="empty-state-text" style="padding: 40px 0; text-align: center; color: var(--color-text-muted);">Nenhum alerta nesta categoria no momento. Bom trabalho!</div>`;
            return;
        }

        filtered.forEach(a => {
            const card = document.createElement('div');
            card.className = `saas-alert-card alert-${a.type}`;
            
            let iconSvg = '';
            if (a.type === 'financeiro') {
                iconSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>`;
            } else if (a.type === 'operacao') {
                iconSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path></svg>`;
            } else {
                iconSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>`;
            }

            const isUploadable = (a.type === 'operacao' || a.type === 'conteudo');

            card.innerHTML = `
                <div style="display: flex; gap: 15px; align-items: center; flex: 1;">
                    <div class="saas-alert-icon-wrapper">${iconSvg}</div>
                    <div class="saas-alert-info">
                        <div class="saas-alert-title">${a.title}</div>
                        <div class="saas-alert-desc">${a.desc}</div>
                        <div class="saas-alert-actions" style="margin-top: 8px; display: flex; gap: 8px;">
                            ${isUploadable ? `<button class="btn btn-gold btn-alert-upload" style="padding: 4px 8px; font-size: 11px; height: 24px; border-radius: var(--border-radius-sm); line-height: 1;">Subir Conteúdo</button>` : ''}
                            <button class="btn btn-green btn-alert-complete" style="padding: 4px 8px; font-size: 11px; height: 24px; border-radius: var(--border-radius-sm); background: #2e7d32; border-color: #2e7d32; color: #fff; line-height: 1;">Concluir</button>
                            <button class="btn btn-red btn-alert-remove" style="padding: 4px 8px; font-size: 11px; height: 24px; border-radius: var(--border-radius-sm); background: #c62828; border-color: #c62828; color: #fff; line-height: 1;">Remover</button>
                        </div>
                    </div>
                </div>
                <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 8px; justify-content: center;">
                    <span class="saas-alert-badge ${a.badgeClass}">${a.badgeText}</span>
                </div>
            `;

            // Bind events
            const uploadBtn = card.querySelector('.btn-alert-upload');
            if (uploadBtn) {
                uploadBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    iniciarUploadAlerta(a.id);
                });
            }

            card.querySelector('.btn-alert-complete').addEventListener('click', (e) => {
                e.stopPropagation();
                concluirAlerta(a.id);
            });

            card.querySelector('.btn-alert-remove').addEventListener('click', (e) => {
                e.stopPropagation();
                removerAlerta(a.id);
            });

            wrapper.appendChild(card);
        });
    }

    // Alert callbacks
    function iniciarUploadAlerta(alertId) {
        const uploader = document.getElementById('alert-file-uploader');
        if (uploader) {
            uploader.dataset.activeAlertId = alertId;
            uploader.value = '';
            uploader.click();
        }
    }

    function removerAlerta(alertId) {
        if (!dismissedAlerts.includes(alertId)) {
            dismissedAlerts.push(alertId);
            saveDismissedAlerts();
            renderAlertsList();
            showNotification('Alerta removido!');
        }
    }

    function concluirAlerta(alertId) {
        if (alertId.startsWith('al_fin_late_')) {
            const clientId = alertId.replace('al_fin_late_', '');
            const client = clients.find(c => c.id === clientId);
            if (client) {
                client.paymentStatus = 'Em Dia';
                saveClients();
                showNotification('Fatura marcada como paga!');
            }
        } else if (alertId.startsWith('al_fin_exp_')) {
            const clientId = alertId.replace('al_fin_exp_', '');
            const client = clients.find(c => c.id === clientId);
            if (client) {
                client.duration = (client.duration || 12) + 12;
                saveClients();
                showNotification('Contrato renovado por mais 12 meses!');
            }
        } else if (alertId.startsWith('al_ops_task_')) {
            const parts = alertId.split('_');
            const pIdx = parseInt(parts[3]);
            const tIdx = parseInt(parts[4]);
            if (playerRoutines[pIdx] && playerRoutines[pIdx].tasks[tIdx]) {
                playerRoutines[pIdx].tasks[tIdx].completed = true;
                localStorage.setItem('founders_player_routines', JSON.stringify(playerRoutines));
                if (typeof renderPlayerRoutines === 'function') renderPlayerRoutines();
                showNotification('Demanda marcada como concluída!');
            }
        } else if (alertId.startsWith('al_cont_app_') || alertId.startsWith('al_cont_rej_')) {
            const parts = alertId.split('_');
            const cId = parts[3];
            const aId = parts[4];
            const client = clients.find(c => c.id === cId);
            if (client && client.approvals) {
                const approval = client.approvals.find(app => app.id === aId || client.approvals.indexOf(app) === parseInt(aId));
                if (approval) {
                    approval.status = 'Aprovado';
                    saveClients();
                    if (approval.opContentId) {
                        const opItem = operationalContents.find(op => op.id === approval.opContentId);
                        if (opItem) {
                            opItem.status = 'Aprovado';
                            saveOperationalContents();
                        }
                    }
                    showNotification('Conteúdo aprovado!');
                }
            }
        }
        
        if (!dismissedAlerts.includes(alertId)) {
            dismissedAlerts.push(alertId);
            saveDismissedAlerts();
        }
        renderAlertsList();
    }

    // --- PRODUÇÃO ADM ---
    let prodActiveSubview = 'prod-subview-conteudos';
    let prodCalendarYear = 2026;
    let prodCalendarMonth = 5; // June 2026

    function initProducaoView() {
        // Setup tab buttons click handlers
        document.querySelectorAll('#view-producao .saas-subtabs-nav .saas-subtab-btn').forEach(btn => {
            if (!btn.dataset.listenerBound) {
                btn.addEventListener('click', (e) => {
                    const subviewId = btn.getAttribute('data-subview');
                    document.querySelectorAll('#view-producao .saas-subtabs-nav .saas-subtab-btn').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    
                    document.querySelectorAll('#view-producao .saas-subview-pane').forEach(p => p.classList.remove('active'));
                    const targetPane = document.getElementById(subviewId);
                    if (targetPane) targetPane.classList.add('active');
                    
                    prodActiveSubview = subviewId;
                    renderProducaoSubview();
                });
                btn.dataset.listenerBound = 'true';
            }
        });

        // Populate client filters
        const selects = ['prod-conteudos-client-filter', 'prod-calendario-client-filter', 'prod-arquivos-client-filter', 'prod-conteudo-client', 'prod-file-client'];
        selects.forEach(selId => {
            const sel = document.getElementById(selId);
            if (sel) {
                const firstOpt = sel.options[0];
                sel.innerHTML = '';
                if (firstOpt && (selId.includes('filter') || firstOpt.value === 'all')) {
                    sel.appendChild(firstOpt);
                }
                clients.forEach(c => {
                    const opt = document.createElement('option');
                    opt.value = c.id;
                    opt.textContent = c.name;
                    sel.appendChild(opt);
                });
            }
        });

        // Setup filter change listeners
        const contFilter = document.getElementById('prod-conteudos-client-filter');
        if (contFilter && !contFilter.dataset.listenerBound) {
            contFilter.addEventListener('change', () => renderProdConteudos());
            document.getElementById('prod-conteudos-status-filter')?.addEventListener('change', () => renderProdConteudos());
            document.getElementById('prod-calendario-client-filter')?.addEventListener('change', () => renderProdCalendar());
            document.getElementById('prod-arquivos-client-filter')?.addEventListener('change', () => renderProdLibrary());
            contFilter.dataset.listenerBound = 'true';
        }

        // Setup modal button clicks
        const addContBtn = document.getElementById('btn-prod-add-conteudo');
        if (addContBtn && !addContBtn.dataset.listenerBound) {
            addContBtn.addEventListener('click', () => {
                document.getElementById('form-prod-add-conteudo').reset();
                document.getElementById('prod-conteudo-date').value = new Date().toISOString().substring(0, 10);
                openModal('modal-prod-add-conteudo');
            });
            addContBtn.dataset.listenerBound = 'true';
        }

        const addFileBtn = document.getElementById('btn-prod-add-file');
        if (addFileBtn && !addFileBtn.dataset.listenerBound) {
            addFileBtn.addEventListener('click', () => {
                document.getElementById('form-prod-add-file').reset();
                const filterVal = document.getElementById('prod-arquivos-client-filter').value;
                if (filterVal && filterVal !== 'all') {
                    document.getElementById('prod-file-client').value = filterVal;
                }
                openModal('modal-prod-add-file');
            });
            addFileBtn.dataset.listenerBound = 'true';
        }

        // Setup modal submit listeners
        const formConteudo = document.getElementById('form-prod-add-conteudo');
        if (formConteudo && !formConteudo.dataset.listenerBound) {
            formConteudo.addEventListener('submit', (e) => {
                e.preventDefault();
                const title = document.getElementById('prod-conteudo-title').value.trim();
                const clientId = document.getElementById('prod-conteudo-client').value;
                const network = document.getElementById('prod-conteudo-network').value;
                const type = document.getElementById('prod-conteudo-type').value;
                const date = document.getElementById('prod-conteudo-date').value;
                const status = document.getElementById('prod-conteudo-status').value;
                const body = document.getElementById('prod-conteudo-body').value.trim();
                const caption = document.getElementById('prod-conteudo-caption').value.trim();
                const media = document.getElementById('prod-conteudo-media').value.trim() || 'assets/post_placeholder.png';

                const customMediaUrl = document.getElementById('prod-conteudo-media').value.trim();
                let mediaFiles = [...selectedProdMediaFiles];
                if (customMediaUrl && !selectedProdMediaFiles.length && !customMediaUrl.includes(', ')) {
                    mediaFiles.push(customMediaUrl);
                }

                const newContent = {
                    id: newId,
                    clientId,
                    title,
                    type,
                    network,
                    date,
                    status,
                    body,
                    caption,
                    thumbnail: media,
                    mediaFiles: mediaFiles,
                    logs: [{ date: new Date().toISOString().substring(0, 10), msg: `Criado no painel administrativo. Status inicial: ${status}` }]
                };

                operationalContents.push(newContent);
                saveOperationalContents();

                if (status === 'Em Aprovação') {
                    const clientObj = clients.find(c => c.id === clientId);
                    if (clientObj) {
                        if (!clientObj.approvals) clientObj.approvals = [];
                        clientObj.approvals.push({
                            id: 'ca_' + Math.random().toString(36).substr(2, 9),
                            title,
                            type,
                            network,
                            body,
                            caption,
                            status: 'Pendente',
                            adjustments: '',
                            thumbnail: media,
                            mediaFiles: mediaFiles,
                            opContentId: newId
                        });
                        saveClients();
                    }
                }

                // Reset upload preview and state
                selectedProdMediaFiles = [];
                const previewCont = document.getElementById('prod-media-preview-container');
                if (previewCont) {
                    previewCont.innerHTML = '';
                    previewCont.style.display = 'none';
                }

                closeModal('modal-prod-add-conteudo');
                renderProdConteudos();
                renderProdCalendar();
                showNotification('Novo conteúdo operacional adicionado com sucesso!');
            });
            formConteudo.dataset.listenerBound = 'true';
        }

        const formFile = document.getElementById('form-prod-add-file');
        if (formFile && !formFile.dataset.listenerBound) {
            formFile.addEventListener('submit', (e) => {
                e.preventDefault();
                const clientId = document.getElementById('prod-file-client').value;
                const name = document.getElementById('prod-file-name').value.trim();
                const type = document.getElementById('prod-file-type').value;
                const size = document.getElementById('prod-file-size').value.trim();
                const url = document.getElementById('prod-file-url').value.trim() || '#';

                const clientObj = clients.find(c => c.id === clientId);
                if (clientObj) {
                    if (!clientObj.libraryFiles) clientObj.libraryFiles = [];
                    clientObj.libraryFiles.push({
                        id: 'f_' + Math.random().toString(36).substr(2, 9),
                        name,
                        type,
                        url,
                        size,
                        uploadDate: new Date().toISOString().substring(0, 10).split('-').reverse().join('/')
                    });
                    saveClients();
                    closeModal('modal-prod-add-file');
                    renderProdLibrary();
                    alert('Arquivo adicionado com sucesso à biblioteca do cliente!');
                }
            });
            formFile.dataset.listenerBound = 'true';
        }

        // Calendar month navigation
        const prevCal = document.getElementById('btn-prod-cal-prev');
        if (prevCal && !prevCal.dataset.listenerBound) {
            prevCal.addEventListener('click', (e) => {
                e.stopPropagation();
                prodCalendarMonth--;
                if (prodCalendarMonth < 0) { prodCalendarMonth = 11; prodCalendarYear--; }
                renderProdCalendar();
            });
            prevCal.dataset.listenerBound = 'true';
        }

        const nextCal = document.getElementById('btn-prod-cal-next');
        if (nextCal && !nextCal.dataset.listenerBound) {
            nextCal.addEventListener('click', (e) => {
                e.stopPropagation();
                prodCalendarMonth++;
                if (prodCalendarMonth > 11) { prodCalendarMonth = 0; prodCalendarYear++; }
                renderProdCalendar();
            });
            nextCal.dataset.listenerBound = 'true';
        }

        renderProducaoSubview();
    }

    function renderProducaoSubview() {
        if (prodActiveSubview === 'prod-subview-conteudos') renderProdConteudos();
        else if (prodActiveSubview === 'prod-subview-calendario') renderProdCalendar();
        else if (prodActiveSubview === 'prod-subview-publicados') renderProdPublicados();
        else if (prodActiveSubview === 'prod-subview-arquivos') renderProdLibrary();
    }

    function renderProdConteudos() {
        const clientFilter = document.getElementById('prod-conteudos-client-filter')?.value || 'all';
        const statusFilter = document.getElementById('prod-conteudos-status-filter')?.value || 'all';
        const wrapper = document.getElementById('prod-conteudos-cards-wrapper');
        if (!wrapper) return;
        wrapper.innerHTML = '';

        const filtered = operationalContents.filter(item => {
            if (clientFilter !== 'all' && item.clientId !== clientFilter) return false;
            if (statusFilter !== 'all' && item.status !== statusFilter) return false;
            return true;
        });

        if (filtered.length === 0) {
            wrapper.innerHTML = `<div class="empty-state-text" style="grid-column: 1/-1; padding: 40px 0; text-align: center;">Nenhum conteúdo operacional cadastrado ou correspondente aos filtros.</div>`;
            return;
        }

        filtered.forEach(item => {
            const clientObj = clients.find(c => c.id === item.clientId) || { name: 'Desconhecido' };
            const card = document.createElement('div');
            card.className = 'saas-conteudo-card';

            let statClass = 'status-producao';
            if (item.status === 'Em Aprovação') statClass = 'status-aprovacao';
            else if (item.status === 'Correção Solicitada') statClass = 'status-correcao';
            else if (item.status === 'Aprovado') statClass = 'status-aprovado';
            else if (item.status === 'Publicado') statClass = 'status-publicado';

            const thumbUrl = item.thumbnail || 'assets/post_placeholder.png';

            card.innerHTML = `
                <div class="saas-conteudo-thumb" style="background-image: url('${thumbUrl}');">
                    <span class="saas-conteudo-format-tag">${item.type}</span>
                    <span class="saas-conteudo-client-tag">${clientObj.name}</span>
                </div>
                <div class="saas-conteudo-body-pane">
                    <div>
                        <div class="saas-conteudo-header-row">
                            <h3>${item.title}</h3>
                            <span class="saas-conteudo-status ${statClass}">${item.status}</span>
                        </div>
                        <p class="saas-conteudo-desc">${item.body || 'Sem descrição/roteiro.'}</p>
                    </div>
                    
                    <div>
                        <div style="margin-bottom: 12px; display: flex; gap: 8px; align-items: center; justify-content: space-between;">
                            <span style="font-size: 11px; color: var(--color-text-muted);">Status:</span>
                            <select class="change-op-status-select" data-id="${item.id}" style="font-size: 11px; padding: 3px; background: var(--color-bg-primary); border: 1px solid var(--color-bg-tertiary); color: var(--color-text-primary); border-radius: var(--border-radius-sm);">
                                <option value="Em Produção" ${item.status === 'Em Produção' ? 'selected' : ''}>Em Produção</option>
                                <option value="Em Aprovação" ${item.status === 'Em Aprovação' ? 'selected' : ''}>Em Aprovação</option>
                                <option value="Correção Solicitada" ${item.status === 'Correção Solicitada' ? 'selected' : ''}>Correção Solicitada</option>
                                <option value="Aprovado" ${item.status === 'Aprovado' ? 'selected' : ''}>Aprovado</option>
                                <option value="Publicado" ${item.status === 'Publicado' ? 'selected' : ''}>Publicado</option>
                            </select>
                        </div>
                        
                        <div class="saas-conteudo-footer-info">
                            <span>Rede: <strong>${item.network}</strong></span>
                            <button class="saas-conteudo-logs-btn btn-show-logs" data-id="${item.id}">Ver Histórico</button>
                        </div>
                        
                        <div style="display:flex; justify-content: space-between; align-items:center; margin-top: 10px; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 8px;">
                            <button class="btn btn-dark btn-xs btn-preview-op" data-id="${item.id}">Pré-visualizar</button>
                            <span class="btn-delete-op" data-id="${item.id}" style="color: #fc8181; font-size:11px; cursor:pointer; display:inline-flex; align-items:center; gap:3px;">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="10" height="10"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg> Excluir
                            </span>
                        </div>
                    </div>
                </div>
            `;

            card.querySelector('.change-op-status-select').addEventListener('change', (e) => {
                const opId = e.target.getAttribute('data-id');
                const newStatus = e.target.value;
                const opItem = operationalContents.find(op => op.id === opId);
                if (opItem) {
                    const oldStatus = opItem.status;
                    opItem.status = newStatus;
                    if (!opItem.logs) opItem.logs = [];
                    opItem.logs.push({ date: new Date().toISOString().substring(0, 10), msg: `Status alterado de "${oldStatus}" para "${newStatus}" pelo ADM.` });
                    
                    syncOperationalStatusToClientApproval(opItem);
                    saveOperationalContents();
                    renderProdConteudos();
                }
            });

            card.querySelector('.btn-show-logs').addEventListener('click', () => {
                const opItem = operationalContents.find(op => op.id === item.id);
                if (opItem && opItem.logs) {
                    const logStr = opItem.logs.map(l => `[${l.date.split('-').reverse().join('/')}] ${l.msg}`).join('\n');
                    alert(`Histórico de logs para "${opItem.title}":\n\n${logStr}`);
                }
            });

            card.querySelector('.btn-preview-op').addEventListener('click', () => {
                openContentPreview(item, 'approval', clientObj);
            });

            card.querySelector('.btn-delete-op').addEventListener('click', () => {
                if (confirm(`Deseja realmente excluir o conteúdo "${item.title}"?`)) {
                    operationalContents = operationalContents.filter(op => op.id !== item.id);
                    saveOperationalContents();
                    renderProdConteudos();
                }
            });

            wrapper.appendChild(card);
        });
    }

    function syncOperationalStatusToClientApproval(opItem) {
        const client = clients.find(c => c.id === opItem.clientId);
        if (!client) return;

        if (!client.approvals) client.approvals = [];
        let linkedApproval = client.approvals.find(a => a.opContentId === opItem.id);

        if (opItem.status === 'Em Aprovação') {
            if (!linkedApproval) {
                linkedApproval = {
                    id: 'ca_' + Math.random().toString(36).substr(2, 9),
                    title: opItem.title,
                    type: opItem.type,
                    network: opItem.network,
                    body: opItem.body,
                    caption: opItem.caption,
                    status: 'Pendente',
                    adjustments: '',
                    thumbnail: opItem.thumbnail,
                    opContentId: opItem.id
                };
                client.approvals.push(linkedApproval);
            } else {
                linkedApproval.status = 'Pendente';
                linkedApproval.adjustments = '';
            }
        } else if (opItem.status === 'Aprovado') {
            if (linkedApproval) {
                linkedApproval.status = 'Aprovado';
                linkedApproval.adjustments = '';
            }
        } else if (opItem.status === 'Correção Solicitada') {
            if (linkedApproval) {
                linkedApproval.status = 'Rejeitado';
            }
        } else if (opItem.status === 'Publicado') {
            if (linkedApproval) {
                linkedApproval.status = 'Publicado';
            }
        }

        saveClients();
    }

    function syncClientApprovalStatusToOperational(appItem) {
        if (!appItem.opContentId) return;
        const opItem = operationalContents.find(op => op.id === appItem.opContentId);
        if (opItem) {
            const oldStatus = opItem.status;
            if (appItem.status === 'Aprovado') {
                opItem.status = 'Aprovado';
            } else if (appItem.status === 'Rejeitado') {
                opItem.status = 'Correção Solicitada';
            } else if (appItem.status === 'Publicado') {
                opItem.status = 'Publicado';
            }
            
            if (!opItem.logs) opItem.logs = [];
            opItem.logs.push({
                date: new Date().toISOString().substring(0, 10),
                msg: `Status atualizado pelo cliente no Portal. Novo status: "${opItem.status}". Obs: "${appItem.adjustments || 'Nenhuma'}"`
            });
            saveOperationalContents();
        }
    }

    function renderProdCalendar() {
        const clientFilter = document.getElementById('prod-calendario-client-filter')?.value || 'all';
        const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
        
        const titleEl = document.getElementById('prod-cal-month-title');
        if (titleEl) titleEl.textContent = `${months[prodCalendarMonth]} ${prodCalendarYear}`;

        const grid = document.getElementById('prod-calendario-monthly-grid');
        if (!grid) return;
        grid.innerHTML = '';

        const numDays = new Date(prodCalendarYear, prodCalendarMonth + 1, 0).getDate();
        const firstDayIndex = new Date(prodCalendarYear, prodCalendarMonth, 1).getDay();
        const prevMonthDays = new Date(prodCalendarYear, prodCalendarMonth, 0).getDate();

        const today = new Date();
        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;

        const totalCells = 42;

        // Prev month padding
        for (let i = firstDayIndex - 1; i >= 0; i--) {
            const dayNum = prevMonthDays - i;
            grid.innerHTML += `
                <div class="mini-gcal-cell other-month">
                    <div class="mini-gcal-daynum">${dayNum}</div>
                    <div class="mini-gcal-events-list"></div>
                </div>
            `;
        }

        // Active month days
        for (let i = 1; i <= numDays; i++) {
            const dateStr = `${prodCalendarYear}-${String(prodCalendarMonth + 1).padStart(2,'0')}-${String(i).padStart(2,'0')}`;
            const isToday = dateStr === todayStr;

            const dayEvents = calendarEvents.filter(e => e.date === dateStr);
            const dayContents = operationalContents.filter(c => {
                if (c.date !== dateStr) return false;
                if (clientFilter !== 'all' && c.clientId !== clientFilter) return false;
                return true;
            });

            let pillsHtml = '';
            dayEvents.forEach(e => {
                pillsHtml += `<div class="mini-gcal-event-pill pill-reuniao" title="${e.title}">${e.time ? e.time + ' ' : ''}${e.title}</div>`;
            });
            dayContents.forEach(c => {
                let typePill = 'pill-post';
                if (c.status === 'Publicado') typePill = 'pill-publicado';
                else if (c.status === 'Correção Solicitada') typePill = 'pill-tarefa';
                pillsHtml += `<div class="mini-gcal-event-pill ${typePill}" title="[${c.status}] ${c.title}">${c.title}</div>`;
            });

            grid.innerHTML += `
                <div class="mini-gcal-cell ${isToday ? 'today' : ''}">
                    <div class="mini-gcal-daynum">${i}</div>
                    <div class="mini-gcal-events-list">${pillsHtml}</div>
                </div>
            `;
        }

        // Next month padding
        const rendered = firstDayIndex + numDays;
        const padding = totalCells - rendered;
        for (let i = 1; i <= padding; i++) {
            grid.innerHTML += `
                <div class="mini-gcal-cell other-month">
                    <div class="mini-gcal-daynum">${i}</div>
                    <div class="mini-gcal-events-list"></div>
                </div>
            `;
        }
    }

    function renderProdPublicados() {
        const tbody = document.getElementById('prod-publicados-tbody');
        if (!tbody) return;
        tbody.innerHTML = '';

        const published = operationalContents.filter(item => item.status === 'Publicado');

        if (published.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--color-text-muted); padding: 25px;">Nenhum conteúdo publicado no momento.</td></tr>`;
            return;
        }

        published.forEach(item => {
            const clientObj = clients.find(c => c.id === item.clientId) || { name: 'Desconhecido' };
            const tr = document.createElement('tr');
            const formattedDate = item.date ? item.date.split('-').reverse().join('/') : '—';
            
            tr.innerHTML = `
                <td><strong>${clientObj.name}</strong></td>
                <td>${item.title}</td>
                <td><span class="portal-post-network-badge">${item.network}</span></td>
                <td>${item.type}</td>
                <td>${formattedDate}</td>
            `;
            tbody.appendChild(tr);
        });
    }

    function renderProdLibrary() {
        const clientFilter = document.getElementById('prod-arquivos-client-filter')?.value || 'all';
        const wrapper = document.getElementById('prod-library-files-wrapper');
        if (!wrapper) return;
        wrapper.innerHTML = '';

        let activeClientId = clientFilter;
        if (activeClientId === 'all' || !activeClientId) {
            if (clients.length > 0) {
                activeClientId = clients[0].id;
                const filterEl = document.getElementById('prod-arquivos-client-filter');
                if (filterEl) filterEl.value = activeClientId;
            } else {
                wrapper.innerHTML = `<div class="empty-state-text" style="grid-column: 1/-1; padding: 40px 0; text-align: center;">Nenhum cliente disponível.</div>`;
                return;
            }
        }

        const client = clients.find(c => c.id === activeClientId);
        if (!client) return;

        const files = client.libraryFiles || [];

        if (files.length === 0) {
            wrapper.innerHTML = `<div class="empty-state-text" style="grid-column: 1/-1; padding: 40px 0; text-align: center;">Nenhum arquivo cadastrado para este cliente.</div>`;
            return;
        }

        files.forEach((file, idx) => {
            const card = document.createElement('div');
            card.className = 'saas-file-card';

            let fileIcon = '';
            if (file.type === 'video') {
                fileIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="24" height="24"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>`;
            } else if (file.type === 'arte') {
                fileIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="24" height="24"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>`;
            } else {
                fileIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="24" height="24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>`;
            }

            card.innerHTML = `
                <div class="saas-file-top-row">
                    <div class="saas-file-icon">${fileIcon}</div>
                    <button class="btn-delete-file" data-idx="${idx}" style="background:transparent; border:none; color:#fc8181; cursor:pointer; padding:2px;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button>
                </div>
                <div>
                    <div class="saas-file-name" title="${file.name}">${file.name}</div>
                    <div style="font-size:10px; color:var(--color-text-muted); text-transform:uppercase;">${file.type}</div>
                </div>
                <div class="saas-file-meta">
                    <span>${file.size || '—'}</span>
                    <span>${file.uploadDate || '—'}</span>
                </div>
                <div style="margin-top:10px; display:flex; justify-content:flex-end;">
                    <a href="${file.url}" download="${file.name}" class="btn btn-dark btn-xs" style="color:var(--color-accent-gold); text-decoration:none; display:inline-block; text-align:center;">Baixar</a>
                </div>
            `;

            card.querySelector('.btn-delete-file').addEventListener('click', (e) => {
                e.stopPropagation();
                if (confirm(`Deseja realmente excluir o arquivo "${file.name}"?`)) {
                    client.libraryFiles.splice(idx, 1);
                    saveClients();
                    renderProdLibrary();
                }
            });

            wrapper.appendChild(card);
        });
    }

    // --- APROVAÇÕES ADM ---
    let currentAprovFilter = 'Pendente';
    
    function initAprovacoesView() {
        document.querySelectorAll('#view-aprovacoes .saas-subtabs-nav .saas-subtab-btn').forEach(btn => {
            if (!btn.dataset.listenerBound) {
                btn.addEventListener('click', (e) => {
                    document.querySelectorAll('#view-aprovacoes .saas-subtabs-nav .saas-subtab-btn').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    currentAprovFilter = btn.getAttribute('data-aprov-filter');
                    renderAprovacoesList();
                });
                btn.dataset.listenerBound = 'true';
            }
        });
        renderAprovacoesList();
    }

    function renderAprovacoesList() {
        const wrapper = document.getElementById('adm-approvals-list-wrapper');
        if (!wrapper) return;
        wrapper.innerHTML = '';

        const allApprovals = [];
        clients.forEach(c => {
            if (c.approvals) {
                c.approvals.forEach((a, idx) => {
                    allApprovals.push({
                        client: c,
                        item: a,
                        idx: idx
                    });
                });
            }
        });

        const filtered = allApprovals.filter(entry => {
            const status = entry.item.status;
            if (currentAprovFilter === 'Pendente') return status === 'Pendente';
            if (currentAprovFilter === 'Ajustar') return status === 'Rejeitado';
            if (currentAprovFilter === 'Aprovado') return status === 'Aprovado';
            if (currentAprovFilter === 'Publicado') return status === 'Publicado';
            return true;
        });

        if (filtered.length === 0) {
            wrapper.innerHTML = `<div class="empty-state-text" style="padding: 40px 0; text-align: center;">Nenhuma aprovação correspondente nesta categoria.</div>`;
            return;
        }

        filtered.forEach(entry => {
            const c = entry.client;
            const a = entry.item;
            const card = document.createElement('div');
            card.className = 'approval-feed-card';

            let badgeClass = 'app-status-pending';
            if (a.status === 'Aprovado') badgeClass = 'app-status-approved';
            else if (a.status === 'Rejeitado') badgeClass = 'app-status-rejected';
            else if (a.status === 'Publicado') badgeClass = 'app-status-approved';

            const thumbSrc = a.thumbnail || 'assets/post_placeholder.png';
            const network = a.network || 'Instagram';
            let actionBtnHtml = '';

            if (a.status === 'Aprovado') {
                actionBtnHtml = `<button class="btn btn-gold-solid btn-sm btn-publish-content" data-client-id="${c.id}" data-app-id="${a.id}">Publicar Post</button>`;
            }

            card.innerHTML = `
                <div class="approval-card-top" style="cursor:pointer;">
                    <div>
                        <h3 style="display:flex; align-items:center; gap:8px;">
                            ${a.title}
                            <span class="portal-post-network-badge" style="margin-left: 8px; vertical-align: middle;">${network}</span>
                        </h3>
                        <span class="prompt-card-category" style="margin-top:5px;">${c.name} | ${a.type}</span>
                    </div>
                    <span class="approval-status-label ${badgeClass}">${a.status === 'Rejeitado' ? 'Ajuste Solicitado' : a.status}</span>
                </div>
                
                <div class="approval-card-content-split">
                    <div class="approval-thumb-box" style="width: 100%; max-width: 180px; height: 180px; overflow: hidden; border-radius: var(--border-radius-md); border: 1px solid var(--color-bg-tertiary); cursor:pointer;">
                        <img src="${thumbSrc}" alt="Preview" style="width: 100%; height: 100%; object-fit: cover;">
                    </div>
                    <div class="approval-preview-box">
                        <h5>Roteiro / Conteúdo</h5>
                        <div class="approval-preview-text">${a.body}</div>
                    </div>
                    <div class="approval-caption-box">
                        <h5>Legenda proposta</h5>
                        <div class="approval-caption-text">${a.caption || 'Nenhuma legenda necessária.'}</div>
                    </div>
                </div>

                ${a.adjustments ? `
                    <div class="approval-adjustments-notes" style="margin-bottom:20px; border-left-color: #e53e3e; background: rgba(229, 62, 62, 0.05);">
                        <strong>Ajustes Solicitados pelo Cliente:</strong> "${a.adjustments}"
                    </div>
                ` : ''}

                ${actionBtnHtml ? `
                    <div style="display:flex; justify-content:flex-end; gap:12px; margin-top:15px; border-top:1px solid var(--color-bg-tertiary); padding-top:15px;">
                        ${actionBtnHtml}
                    </div>
                ` : ''}
            `;

            const previewTrigger = card.querySelector('.approval-card-top');
            const thumbTrigger = card.querySelector('.approval-thumb-box');
            if (previewTrigger) previewTrigger.addEventListener('click', () => openContentPreview(a, 'approval', c));
            if (thumbTrigger) thumbTrigger.addEventListener('click', () => openContentPreview(a, 'approval', c));

            const pubBtn = card.querySelector('.btn-publish-content');
            if (pubBtn) {
                pubBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (confirm(`Deseja publicar o post "${a.title}" nas redes sociais do cliente?`)) {
                        a.status = 'Publicado';
                        syncClientApprovalStatusToOperational(a);
                        
                        if (!c.posts) c.posts = [];
                        c.posts.push({
                            id: 'cp_' + Math.random().toString(36).substr(2, 9),
                            title: a.title,
                            network: a.network,
                            type: a.type,
                            date: new Date().toISOString().substring(0, 10),
                            thumbnail: a.thumbnail
                        });
                        
                        saveClients();
                        renderAprovacoesList();
                        alert(`O conteúdo "${a.title}" foi publicado com sucesso! Ele foi adicionado ao histórico do cliente.`);
                    }
                });
            }

            wrapper.appendChild(card);
        });
    }

    // --- CLIENT PORTAL: CALENDÁRIO CLIENTE ---
    let clientCalendarYear = 2026;
    let clientCalendarMonth = 5; // June 2026

    function initClientPortalCalendarioView() {
        const prevBtn = document.getElementById('btn-client-cal-prev');
        const nextBtn = document.getElementById('btn-client-cal-next');

        if (prevBtn && !prevBtn.dataset.listenerBound) {
            prevBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                clientCalendarMonth--;
                if (clientCalendarMonth < 0) { clientCalendarMonth = 11; clientCalendarYear--; }
                renderClientCalendar();
            });
            prevBtn.dataset.listenerBound = 'true';
        }

        if (nextBtn && !nextBtn.dataset.listenerBound) {
            nextBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                clientCalendarMonth++;
                if (clientCalendarMonth > 11) { clientCalendarMonth = 0; clientCalendarYear++; }
                renderClientCalendar();
            });
            nextBtn.dataset.listenerBound = 'true';
        }

        renderClientCalendar();
    }

    function renderClientCalendar() {
        const client = getActiveClientPortalObject();
        if (!client) return;

        const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
        const titleEl = document.getElementById('client-cal-month-title');
        if (titleEl) titleEl.textContent = `${months[clientCalendarMonth]} ${clientCalendarYear}`;

        const grid = document.getElementById('client-calendario-monthly-grid');
        if (!grid) return;
        grid.innerHTML = '';

        const numDays = new Date(clientCalendarYear, clientCalendarMonth + 1, 0).getDate();
        const firstDayIndex = new Date(clientCalendarYear, clientCalendarMonth, 1).getDay();
        const prevMonthDays = new Date(clientCalendarYear, clientCalendarMonth, 0).getDate();

        const today = new Date();
        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;

        const totalCells = 42;

        // Prev month padding
        for (let i = firstDayIndex - 1; i >= 0; i--) {
            const dayNum = prevMonthDays - i;
            const pmYear = clientCalendarMonth === 0 ? clientCalendarYear - 1 : clientCalendarYear;
            const pmMonth = clientCalendarMonth === 0 ? 12 : clientCalendarMonth;
            const pmDateStr = `${pmYear}-${String(pmMonth).padStart(2,'0')}-${String(dayNum).padStart(2,'0')}`;
            grid.innerHTML += `
                <div class="mini-gcal-cell other-month" data-date="${pmDateStr}">
                    <div class="mini-gcal-daynum">${dayNum}</div>
                    <div class="mini-gcal-events-list"></div>
                </div>
            `;
        }

        // Active month days
        for (let i = 1; i <= numDays; i++) {
            const dateStr = `${clientCalendarYear}-${String(clientCalendarMonth + 1).padStart(2,'0')}-${String(i).padStart(2,'0')}`;
            const isToday = dateStr === todayStr;

            const dayContents = operationalContents.filter(c => c.clientId === client.id && c.date === dateStr);

            let pillsHtml = '';
            dayContents.forEach(c => {
                let typePill = 'pill-post';
                if (c.status === 'Publicado') typePill = 'pill-publicado';
                else if (c.status === 'Correção Solicitada') typePill = 'pill-tarefa';
                pillsHtml += `<div class="mini-gcal-event-pill ${typePill}" title="[${c.status}] ${c.title}">${c.title}</div>`;
            });

            grid.innerHTML += `
                <div class="mini-gcal-cell ${isToday ? 'today' : ''}" data-date="${dateStr}">
                    <div class="mini-gcal-daynum">${i}</div>
                    <div class="mini-gcal-events-list">${pillsHtml}</div>
                </div>
            `;
        }

        // Next month padding
        const rendered = firstDayIndex + numDays;
        const padding = totalCells - rendered;
        for (let i = 1; i <= padding; i++) {
            const nmYear = clientCalendarMonth === 11 ? clientCalendarYear + 1 : clientCalendarYear;
            const nmMonth = clientCalendarMonth === 11 ? 1 : clientCalendarMonth + 2;
            const nmDateStr = `${nmYear}-${String(nmMonth).padStart(2,'0')}-${String(i).padStart(2,'0')}`;
            grid.innerHTML += `
                <div class="mini-gcal-cell other-month" data-date="${nmDateStr}">
                    <div class="mini-gcal-daynum">${i}</div>
                    <div class="mini-gcal-events-list"></div>
                </div>
            `;
        }
    }

    // --- CLIENT PORTAL: BIBLIOTECA DE ARQUIVOS ---
    function initClientPortalLibraryView() {
        const client = getActiveClientPortalObject();
        if (!client) return;

        const wrapper = document.getElementById('client-library-files-wrapper');
        if (!wrapper) return;
        wrapper.innerHTML = '';

        const files = client.libraryFiles || [];

        if (files.length === 0) {
            wrapper.innerHTML = `<div class="empty-state-text" style="padding: 40px 0; text-align: center; color: var(--color-text-muted);">Nenhum arquivo compartilhado com você ainda.</div>`;
            return;
        }

        files.forEach(file => {
            const card = document.createElement('div');
            card.className = 'saas-file-card';

            let fileIcon = '';
            if (file.type === 'video') {
                fileIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="24" height="24"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>`;
            } else if (file.type === 'arte') {
                fileIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="24" height="24"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>`;
            } else {
                fileIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="24" height="24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>`;
            }

            card.innerHTML = `
                <div class="saas-file-top-row">
                    <div class="saas-file-icon">${fileIcon}</div>
                </div>
                <div>
                    <div class="saas-file-name" title="${file.name}">${file.name}</div>
                    <div style="font-size:10px; color:var(--color-text-muted); text-transform:uppercase;">${file.type}</div>
                </div>
                <div class="saas-file-meta">
                    <span>${file.size || '—'}</span>
                    <span>${file.uploadDate || '—'}</span>
                </div>
                <div style="margin-top:10px; display:flex; justify-content:flex-end;">
                    <a href="${file.url}" download="${file.name}" class="btn btn-gold btn-xs" style="text-decoration:none; display:inline-block; text-align:center;">Baixar</a>
                </div>
            `;
            wrapper.appendChild(card);
        });
    }

    // --- CLIENT PORTAL: RELATÓRIOS ---
    function initClientPortalRelatoriosView() {
        const client = getActiveClientPortalObject();
        if (!client) return;

        const reach = client.reach || 25000;
        const leadsCount = client.leadsCount || 180;
        
        let budget = 0;
        let spent = 0;
        let metaSpent = 0;
        let googleSpent = 0;
        if (client.campaigns) {
            client.campaigns.forEach(c => {
                budget += c.budget || 0;
                spent += c.spent || 0;
                if (c.platform === 'Meta Ads') metaSpent += c.spent || 0;
                else if (c.platform === 'Google Ads') googleSpent += c.spent || 0;
            });
        }
        
        if (metaSpent === 0 && googleSpent === 0) {
            metaSpent = Math.round(spent * 0.6) || 1200;
            googleSpent = spent - metaSpent || 800;
        }

        const cpl = leadsCount > 0 ? (spent / leadsCount) : 0;

        const reachEl = document.getElementById('client-rep-reach');
        if (reachEl) reachEl.textContent = reach.toLocaleString('pt-BR');
        const leadsEl = document.getElementById('client-rep-leads');
        if (leadsEl) leadsEl.textContent = leadsCount.toLocaleString('pt-BR');
        const budgetEl = document.getElementById('client-rep-budget');
        if (budgetEl) budgetEl.textContent = 'R$ ' + spent.toLocaleString('pt-BR');
        const cplEl = document.getElementById('client-rep-cpl');
        if (cplEl) cplEl.textContent = 'R$ ' + cpl.toFixed(2).replace('.', ',');

        // Render Line Chart
        const baseLeads = Math.round(leadsCount / 6) || 30;
        const leadPoints = [
            Math.round(baseLeads * 0.75),
            Math.round(baseLeads * 0.9),
            Math.round(baseLeads * 1.1),
            Math.round(baseLeads * 0.95),
            Math.round(baseLeads * 1.25),
            leadsCount
        ];
        const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'];
        const chartDiv = document.getElementById('client-rep-leads-chart');
        if (chartDiv) {
            chartDiv.innerHTML = renderGenericSVGChart(leadPoints, months, 'var(--color-accent-gold)');
        }

        // Render bar platform distribution
        const distDiv = document.getElementById('client-rep-traffic-dist-chart');
        if (distDiv) {
            distDiv.innerHTML = renderPlatformBarChart(metaSpent, googleSpent);
        }

        // Setup pdf download mock button
        const pdfBtn = document.getElementById('btn-download-client-pdf');
        if (pdfBtn && !pdfBtn.dataset.listenerBound) {
            pdfBtn.addEventListener('click', () => {
                alert('Gerando seu relatório consolidado em PDF...\nO download começará em instantes.');
                setTimeout(() => {
                    alert('Sucesso! O relatório PDF de desempenho foi gerado e baixado.');
                }, 1200);
            });
            pdfBtn.dataset.listenerBound = 'true';
        }
    }

    // --- GRAPH RENDERING ENGINES ---
    function renderGenericSVGChart(points, labels, strokeColor) {
        if (!points || points.length === 0) points = [10, 20, 15, 30, 25, 40];
        if (!labels || labels.length === 0) labels = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'];
        if (!strokeColor) strokeColor = 'var(--color-accent-gold)';

        const width = 500;
        const height = 200;
        const paddingLeft = 45;
        const paddingRight = 20;
        const paddingTop = 20;
        const paddingBottom = 30;
        
        const chartWidth = width - paddingLeft - paddingRight;
        const chartHeight = height - paddingTop - paddingBottom;
        
        const minVal = Math.min(...points) * 0.95;
        const maxVal = Math.max(...points) * 1.05;
        const valRange = maxVal - minVal || 100;
        
        const coords = points.map((val, idx) => {
            const x = paddingLeft + (idx / (points.length - 1)) * chartWidth;
            const y = paddingTop + chartHeight - ((val - minVal) / valRange) * chartHeight;
            return { x, y, val };
        });
        
        let pathD = `M ${coords[0].x} ${coords[0].y}`;
        for (let i = 1; i < coords.length; i++) {
            pathD += ` L ${coords[i].x} ${coords[i].y}`;
        }
        
        const fillD = `${pathD} L ${coords[coords.length - 1].x} ${paddingTop + chartHeight} L ${coords[0].x} ${paddingTop + chartHeight} Z`;
        
        let gridHtml = '';
        const gridSteps = 4;
        for (let i = 0; i <= gridSteps; i++) {
            const y = paddingTop + (i / gridSteps) * chartHeight;
            const val = maxVal - (i / gridSteps) * valRange;
            gridHtml += `
                <line x1="${paddingLeft}" y1="${y}" x2="${width - paddingRight}" y2="${y}" class="chart-grid-line" />
                <text x="${paddingLeft - 10}" y="${y + 4}" text-anchor="end" class="chart-axis-text">${Math.round(val).toLocaleString('pt-BR')}</text>
            `;
        }
        
        let xLabelsHtml = '';
        coords.forEach((coord, idx) => {
            xLabelsHtml += `
                <text x="${coord.x}" y="${height - 10}" text-anchor="middle" class="chart-axis-text">${labels[idx] || ''}</text>
                <circle cx="${coord.x}" cy="${coord.y}" r="4" class="chart-dot" style="stroke:${strokeColor};" data-val="${coord.val}" />
            `;
        });
        
        const gradId = 'grad_' + Math.random().toString(36).substr(2, 9);
        
        const svg = `
            <svg viewBox="0 0 ${width} ${height}" width="100%" height="100%" style="overflow: visible;">
                <defs>
                    <linearGradient id="${gradId}" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stop-color="${strokeColor}" stop-opacity="0.3"/>
                        <stop offset="100%" stop-color="${strokeColor}" stop-opacity="0"/>
                    </linearGradient>
                </defs>
                
                <!-- Grid & Axes -->
                ${gridHtml}
                <line x1="${paddingLeft}" y1="${paddingTop + chartHeight}" x2="${width - paddingRight}" y2="${paddingTop + chartHeight}" class="chart-axis-line" />
                <line x1="${paddingLeft}" y1="${paddingTop}" x2="${paddingLeft}" y2="${paddingTop + chartHeight}" class="chart-axis-line" />
                
                <!-- Fill Area -->
                <path d="${fillD}" fill="url(#${gradId})" opacity="0.15" />
                
                <!-- Trend Line -->
                <path d="${pathD}" class="chart-trend-line" style="stroke:${strokeColor};" fill="none" />
                
                <!-- Dots & Labels -->
                ${xLabelsHtml}
            </svg>
        `;
        return svg;
    }

    function renderPlatformBarChart(metaAdsSpent, googleAdsSpent) {
        const total = metaAdsSpent + googleAdsSpent || 1;
        const metaPct = Math.round((metaAdsSpent / total) * 100);
        const googlePct = 100 - metaPct;

        return `
            <div style="display:flex; flex-direction:column; gap:15px; padding-top:10px;">
                <div>
                    <div style="display:flex; justify-content:space-between; font-size:12px; margin-bottom:5px;">
                        <span style="display:inline-flex; align-items:center; gap:5px;"><span style="display:inline-block; width:8px; height:8px; border-radius:50%; background-color:#3182ce;"></span>Meta Ads (${metaPct}%)</span>
                        <strong>R$ ${metaAdsSpent.toLocaleString('pt-BR')}</strong>
                    </div>
                    <div style="height:8px; background:rgba(255,255,255,0.05); border-radius:4px; overflow:hidden;">
                        <div style="width:${metaPct}%; height:100%; background-color:#3182ce; border-radius:4px;"></div>
                    </div>
                </div>
                <div>
                    <div style="display:flex; justify-content:space-between; font-size:12px; margin-bottom:5px;">
                        <span style="display:inline-flex; align-items:center; gap:5px;"><span style="display:inline-block; width:8px; height:8px; border-radius:50%; background-color:#48bb78;"></span>Google Ads (${googlePct}%)</span>
                        <strong>R$ ${googleAdsSpent.toLocaleString('pt-BR')}</strong>
                    </div>
                    <div style="height:8px; background:rgba(255,255,255,0.05); border-radius:4px; overflow:hidden;">
                        <div style="width:${googlePct}%; height:100%; background-color:#48bb78; border-radius:4px;"></div>
                    </div>
                </div>
            </div>
        `;
    }

    // --- FINANCEIRO SAAS CHARTS & SCENARIOS ---
    function updateFinanceiroSaaSCharts() {
        let mrr = 0;
        let recebido = 0;
        let atrasado = 0;
        
        clients.forEach(c => {
            if (c.status === 'active') {
                mrr += c.value;
                if (c.paymentStatus === 'Pago') {
                    recebido += c.value;
                } else if (c.paymentStatus === 'Atrasado') {
                    atrasado += c.value;
                }
            }
        });

        let customEntradas = 0;
        let customSaidas = 0;
        customTransactions.forEach(t => {
            if (t.type === 'entrada') customEntradas += t.value;
            else if (t.type === 'saida') customSaidas += t.value;
        });

        const faturamentoTotal = recebido + customEntradas;
        const despesasTotal = customSaidas;
        const lucroEstimado = faturamentoTotal - despesasTotal;

        const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'];

        // 1. Visão Geral: saas-chart-visao-geral
        const vgEl = document.getElementById('saas-chart-visao-geral');
        if (vgEl) {
            const vgPoints = [
                Math.round(mrr * 0.7),
                Math.round(mrr * 0.8),
                Math.round(mrr * 0.95),
                Math.round(mrr * 0.9),
                Math.round(mrr * 1.05),
                mrr
            ];
            vgEl.innerHTML = renderGenericSVGChart(vgPoints, months, 'var(--color-accent-gold)');
        }

        // 2. Visão Geral: saas-chart-composicao
        const compEl = document.getElementById('saas-chart-composicao');
        if (compEl) {
            let html = '<div style="display:flex; flex-direction:column; gap:12px; padding:10px;">';
            const totalVal = mrr || 1;
            clients.forEach((c, idx) => {
                if (c.status === 'active') {
                    const pct = Math.round((c.value / totalVal) * 100);
                    const colors = ['#3182ce', '#48bb78', '#319795', '#d69e2e', '#805ad5'];
                    const color = colors[idx % colors.length];
                    html += `
                        <div>
                            <div style="display:flex; justify-content:space-between; font-size:12px; margin-bottom:4px;">
                                <span>${c.name} (${pct}%)</span>
                                <strong>R$ ${c.value.toLocaleString('pt-BR')}</strong>
                            </div>
                            <div style="height:6px; background:rgba(255,255,255,0.05); border-radius:3px; overflow:hidden;">
                                <div style="width:${pct}%; height:100%; background-color:${color}; border-radius:3px;"></div>
                            </div>
                        </div>
                    `;
                }
            });
            html += '</div>';
            compEl.innerHTML = html;
        }

        // 3. Faturamento: saas-chart-faturamento-evolucao
        const fatEvEl = document.getElementById('saas-chart-faturamento-evolucao');
        if (fatEvEl) {
            const fatPoints = [
                Math.round(faturamentoTotal * 0.6),
                Math.round(faturamentoTotal * 0.75),
                Math.round(faturamentoTotal * 0.9),
                Math.round(faturamentoTotal * 0.85),
                Math.round(faturamentoTotal * 0.95),
                faturamentoTotal
            ];
            fatEvEl.innerHTML = renderGenericSVGChart(fatPoints, months, '#48bb78');
        }

        // 4. Faturamento: saas-chart-faturamento-comparativo
        const fatCompEl = document.getElementById('saas-chart-faturamento-comparativo');
        if (fatCompEl) {
            const totalIn = faturamentoTotal;
            const totalOut = despesasTotal;
            const totalMax = Math.max(totalIn, totalOut) || 1;
            const inPct = Math.round((totalIn / totalMax) * 100);
            const outPct = Math.round((totalOut / totalMax) * 100);
            fatCompEl.innerHTML = `
                <div style="display:flex; flex-direction:column; gap:16px; padding:15px 10px;">
                    <div>
                        <div style="display:flex; justify-content:space-between; font-size:12px; margin-bottom:5px;">
                            <span style="color:#48bb78; font-weight:600;">Entradas Totais</span>
                            <strong>R$ ${totalIn.toLocaleString('pt-BR')}</strong>
                        </div>
                        <div style="height:8px; background:rgba(255,255,255,0.05); border-radius:4px; overflow:hidden;">
                            <div style="width:${inPct}%; height:100%; background-color:#48bb78; border-radius:4px;"></div>
                        </div>
                    </div>
                    <div>
                        <div style="display:flex; justify-content:space-between; font-size:12px; margin-bottom:5px;">
                            <span style="color:#e53e3e; font-weight:600;">Saídas Totais (Despesas)</span>
                            <strong>R$ ${totalOut.toLocaleString('pt-BR')}</strong>
                        </div>
                        <div style="height:8px; background:rgba(255,255,255,0.05); border-radius:4px; overflow:hidden;">
                            <div style="width:${outPct}%; height:100%; background-color:#e53e3e; border-radius:4px;"></div>
                        </div>
                    </div>
                </div>
            `;
        }

        // 5. MRR: saas-chart-mrr-evolucao
        const mrrEvEl = document.getElementById('saas-chart-mrr-evolucao');
        if (mrrEvEl) {
            const mrrPoints = [
                Math.round(mrr * 0.8),
                Math.round(mrr * 0.85),
                Math.round(mrr * 0.9),
                Math.round(mrr * 0.92),
                Math.round(mrr * 0.96),
                mrr
            ];
            mrrEvEl.innerHTML = renderGenericSVGChart(mrrPoints, months, '#3182ce');
        }

        // 6. Lucro: saas-chart-lucro-evolucao
        const lucEvEl = document.getElementById('saas-chart-lucro-evolucao');
        if (lucEvEl) {
            const lucPoints = [
                Math.round(lucroEstimado * 0.5),
                Math.round(lucroEstimado * 0.7),
                Math.round(lucroEstimado * 0.8),
                Math.round(lucroEstimado * 0.75),
                Math.round(lucroEstimado * 0.9),
                lucroEstimado
            ];
            lucEvEl.innerHTML = renderGenericSVGChart(lucPoints, months, '#319795');
        }

        // 7. Projeções: saas-chart-projecoes-caixa
        const projEl = document.getElementById('saas-chart-projecoes-caixa');
        if (projEl) {
            let projPoints = [];
            let strokeColor = 'var(--color-accent-gold)';
            if (currentScenario === 'conservador') {
                projPoints = [
                    mrr,
                    Math.round(mrr * 0.98),
                    Math.round(mrr * 0.96),
                    Math.round(mrr * 0.95),
                    Math.round(mrr * 0.94),
                    Math.round(mrr * 0.93)
                ];
                strokeColor = '#e53e3e';
            } else if (currentScenario === 'otimista') {
                projPoints = [
                    mrr,
                    Math.round(mrr * 1.1),
                    Math.round(mrr * 1.25),
                    Math.round(mrr * 1.4),
                    Math.round(mrr * 1.55),
                    Math.round(mrr * 1.7)
                ];
                strokeColor = '#48bb78';
            } else {
                projPoints = [
                    mrr,
                    Math.round(mrr * 1.05),
                    Math.round(mrr * 1.1),
                    Math.round(mrr * 1.15),
                    Math.round(mrr * 1.2),
                    Math.round(mrr * 1.25)
                ];
                strokeColor = 'var(--color-accent-gold)';
            }
            projEl.innerHTML = renderGenericSVGChart(projPoints, ['Mês 1', 'Mês 2', 'Mês 3', 'Mês 4', 'Mês 5', 'Mês 6'], strokeColor);
        }
    }

    // Setup Mobile Navigation toggle listeners
    const mobileToggle = document.getElementById('btn-mobile-menu-toggle');
    const mobileOverlay = document.getElementById('sidebar-mobile-overlay');
    const sidebar = document.querySelector('.app-sidebar');

    if (mobileToggle && sidebar && mobileOverlay) {
        mobileToggle.addEventListener('click', () => {
            sidebar.classList.toggle('mobile-open');
            mobileOverlay.classList.toggle('active');
        });

        mobileOverlay.addEventListener('click', () => {
            sidebar.classList.remove('mobile-open');
            mobileOverlay.classList.remove('active');
        });
    }

    } catch (err) {
        const div = document.createElement('div');
        div.style.position = 'fixed';
        div.style.top = '0';
        div.style.left = '0';
        div.style.width = '100%';
        div.style.height = '100%';
        div.style.backgroundColor = '#9b2c2c';
        div.style.color = 'white';
        div.style.zIndex = '999999';
        div.style.padding = '20px';
        div.style.fontFamily = 'monospace';
        div.style.fontSize = '14px';
        div.style.overflow = 'auto';
        div.innerHTML = '<h2 style="margin-top:0;">Erro de Execução (JS Local)</h2><p>Por favor, envie uma captura deste erro para corrreção:</p><pre style="background:#4a1212; padding:15px; border-radius:5px; white-space:pre-wrap; word-break:break-all;">' + err.message + '\n\nStack:\n' + err.stack + '</pre>';
        document.body.appendChild(div);
    }
});
