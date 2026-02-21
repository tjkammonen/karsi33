import React, { useState, useEffect } from 'react';
import './App.css'; 

// --- APUFUNKTIOT JA DATAT ---
const generateId = () => typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : Date.now() + '-' + Math.floor(Math.random() * 1000);

const ROOM_TEMPLATES = {
    'empty': { label: 'Tyhjä huone (Aloita nollasta)', categories: ['Tavarat'] },
    'bedroom': { label: 'Vaatekaappi & Makuuhuone', categories: ['Yläosat', 'Alaosat', 'Sukat & Alusvaatteet', 'Vuodevaatteet', 'Yöpöydän sälä'] },
    'kitchen': { label: 'Keittiö', categories: ['Arkiasiat', 'Lasit & Mukit', 'Ruoanvalmistus', 'Aterimet & Ottimet', 'Muovirasiat', 'Pienkoneet'] },
    'entryway': { label: 'Eteinen', categories: ['Kengät', 'Takit & Päällysvaatteet', 'Asusteet (pipot/hanskat)', 'Laukut & Reput', 'Avaimet & Pikkusälä'] },
    'bathroom': { label: 'Kylpyhuone & WC', categories: ['Pyyhkeet', 'Kosmetiikka & Meikit', 'Pesuaineet', 'Lääkkeet & Ensiapu', 'Siivousvälineet'] },
    'livingroom': { label: 'Olohuone & Viihde', categories: ['Kirjat & Lehdet', 'Elektroniikka & Johdot', 'Koriste-esineet', 'Pelit & Harrasteet', 'Tekstiilit'] },
    'office': { label: 'Työhuone / Paperit', categories: ['Toimistotarvikkeet', 'Paperit & Kansiot', 'Johdot & Laturit', 'Elektroniikkaromu', 'Kirjat'] },
    'storage': { label: 'Varasto / Autotalli', categories: ['Työkalut', 'Kausivaatteet/varusteet', 'Harrastusvälineet', 'Ehkä tarvitsen joskus', 'Romu & Risat'] }
};

// --- PÄÄKOMPONENTTI ---
export default function App() {
    const [state, setState] = useState(() => {
        const saved = localStorage.getItem('karsinta_final_v1');
        if (saved) {
            return JSON.parse(saved).map(room => ({
                ...room, id: String(room.id), locked: room.locked === true,
                categories: room.categories.map(c => ({ ...c, id: String(c.id) }))
            }));
        }
        return [];
    });

    const [sortMethod, setSortMethod] = useState('created-asc');
    const [activeModal, setActiveModal] = useState(null); 
    const [activeRoomId, setActiveRoomId] = useState(null);
    const [activeCatId, setActiveCatId] = useState(null);

    useEffect(() => {
        localStorage.setItem('karsinta_final_v1', JSON.stringify(state));
    }, [state]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && activeModal) {
                closeModal();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [activeModal]);

    const updateRoom = (roomId, updater) => {
        setState(prev => prev.map(r => r.id === roomId ? { ...updater(r), lastEdited: Date.now() } : r));
    };

    const updateCategory = (roomId, catId, updater) => {
        updateRoom(roomId, room => ({
            ...room,
            categories: room.categories.map(c => c.id === catId ? updater(c) : c)
        }));
    };

    const closeModal = () => {
        setActiveModal(null);
        setActiveRoomId(null);
        setActiveCatId(null);
        document.body.style.overflow = 'auto';
    };

    const openModal = (modalName, roomId = null, catId = null) => {
        setActiveRoomId(roomId);
        setActiveCatId(catId);
        setActiveModal(modalName);
        document.body.style.overflow = 'hidden';
    };

    let totalStart = 0, totalGoal = 0, totalRem = 0;
    const processedRooms = state.map(room => {
        let rStart = 0, rGoal = 0, rRem = 0;
        room.categories.forEach(cat => {
            const g = Math.ceil(cat.start / 3);
            rStart += cat.start; rGoal += g; rRem += cat.removed;
        });
        totalStart += rStart; totalGoal += rGoal; totalRem += rRem;
        const rPerc = rGoal > 0 ? (rRem / rGoal) * 100 : 0;
        const isGolden = room.locked && rPerc >= 100;
        return { ...room, rStart, rGoal, rRem, rPerc, isGolden };
    });

    const globalPerc = totalGoal > 0 ? Math.round((totalRem / totalGoal) * 100) : 0;
    const globalDiff = totalRem - totalGoal;
    const allRoomsLocked = state.length > 0 && state.every(r => r.locked);
    const isGlobalVictory = allRoomsLocked && globalPerc >= 100;

    const sortedRooms = [...processedRooms].sort((a, b) => {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        switch (sortMethod) {
            case 'last-edited': return (b.lastEdited || 0) - (a.lastEdited || 0);
            case 'progress-desc': return b.rPerc - a.rPerc;
            case 'alpha-asc': return a.name.localeCompare(b.name);
            default: return String(a.id).localeCompare(String(b.id));
        }
    });

    // --- UUSI: Tervetuloa-ruutu vs Aktiivinen ruutu ---
    const renderWelcomeScreen = () => (
        <div className="welcome-screen">
            <h1>Tervetuloa<br/>karsimaan!</h1>
            <p>
                Tavoitteemme on yksinkertainen: laske tavarat ja hankkiudu eroon joka kolmannesta. 
                Ei hifistelyä, ei turhaa filosofiaa.
            </p>
            <button className="btn-massive" onClick={() => openModal('addRoom')}>
                Aloita tästä
            </button>
        </div>
    );

    const renderDashboardAndRooms = () => (
        <>
            <div 
                className={`overall-summary hover-card ${isGlobalVictory ? 'gold-mode' : ''}`} 
                onClick={() => isGlobalVictory ? openModal('victory') : openModal('stats')} 
                style={{ cursor: 'pointer' }}
            >
                <div className="flex" style={{ marginBottom: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <h2 style={{ margin: 0, fontSize: '1.2em', color: isGlobalVictory ? '#4a3b00' : 'var(--text)' }}>
                            {isGlobalVictory ? "🏆 URAKKA VALMIS!" : "Kokonaisedistys"}
                        </h2>
                    </div>
                    <div style={{ color: isGlobalVictory ? '#4a3b00' : 'var(--p)', fontSize: '1.2em' }}>➔</div>
                </div>

                <div className="flex" style={{ marginBottom: '5px' }}>
                    <strong style={{ fontSize: '1em', color: isGlobalVictory ? '#4a3b00' : 'var(--text)' }}>Valmis</strong>
                    <strong style={{ color: isGlobalVictory ? '#4a3b00' : 'var(--p)', fontSize: '1.2em' }}>{globalPerc}&thinsp;%</strong>
                </div>
                
                <div className="bar-bg" style={{ height: '16px' }}><div className="bar-fill" style={{ width: `${Math.min(100, globalPerc)}%`, background: isGlobalVictory ? '#fff' : 'var(--p)' }}></div></div>
                
                <div className="stats-grid">
                    <div className="stat-box"><span className="stat-label">Alku</span><span className="stat-value">{totalStart}</span></div>
                    <div className="stat-box"><span className="stat-label">Poistettu</span><span className="stat-value">{totalRem}</span></div>
                    <div className="stat-box"><span className="stat-label">Tavoite</span><span className="stat-value">{totalGoal}</span></div>
                </div>
            </div>

            <div className="flex" style={{ alignItems: 'flex-end', marginTop: '30px' }}>
                <h3 className="section-title" style={{ margin: 0, border: 'none' }}>Valitse huone</h3>
                <div className="sort-container" style={{ margin: 0 }}>
                    <select value={sortMethod} onChange={(e) => setSortMethod(e.target.value)} className="sort-select" style={{ padding: '4px 8px', fontSize: '0.85em' }}>
                        <option value="created-asc">Vanhin</option>
                        <option value="last-edited">Muokattu</option>
                        <option value="progress-desc">Valmius %</option>
                        <option value="alpha-asc">Aakkoset</option>
                    </select>
                </div>
            </div>
            
            <hr style={{ marginTop: '5px', marginBottom: '20px' }} />

            <div id="roomContainer">
                {sortedRooms.map(room => {
                    const diff = room.rRem - room.rGoal;
                    const statusIcon = room.isGolden ? '🏆' : (room.locked ? '🔒' : '');
                    
                    return (
                        <div 
                            key={room.id}
                            className={`room-section hover-card ${room.isGolden ? 'room-gold' : ''}`}
                            onClick={(e) => {
                                if (!e.target.classList.contains('btn-star')) {
                                    if (room.isGolden) openModal('roomVictory', room.id);
                                    else openModal('room', room.id);
                                }
                            }}
                            style={{ 
                                cursor: 'pointer',
                                background: room.isGolden ? '' : (room.locked ? '#f9f9f9' : 'var(--white)'),
                                borderColor: room.isGolden ? '' : (room.locked ? '#ccc' : (room.pinned ? 'var(--accent)' : 'var(--p)'))
                            }}
                        >
                            <div className="flex">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <button 
                                        className={`btn-star ${room.pinned ? 'active' : ''}`} 
                                        onClick={(e) => { e.stopPropagation(); updateRoom(room.id, r => ({ ...r, pinned: !r.pinned })); }}
                                        title="Kiinnitä"
                                    >★</button>
                                    <h2>{room.name} {statusIcon}</h2>
                                </div>
                                <div style={{ color: 'var(--p)', fontSize: '1.2em' }}>➔</div>
                            </div>
                            
                            <div className="room-summary" style={{ marginBottom: 0, pointerEvents: 'none', background: 'rgba(255,255,255,0.5)' }}>
                                <div>Alku: {room.rStart} | Poistettu: {room.rRem}/{room.rGoal}</div>
                                <div className="bar-bg"><div className="bar-fill bar-room" style={{ width: `${Math.min(100, room.rPerc)}%` }}></div></div>
                                <div className="flex" style={{ marginTop: '5px', alignItems: 'flex-start' }}>
                                    <div style={{ fontSize: '0.8em', fontWeight: 'bold' }}>{diff >= 0 ? `+${diff}` : `Puuttuu: ${Math.abs(diff)}`}</div>
                                    <div className="cat-count-badge">{room.categories.length} kategoriaa</div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <button className="btn-add-trigger" onClick={() => openModal('addRoom')} style={{ marginTop: '10px' }}>
                + Lisää uusi huone
            </button>
        </>
    );

    return (
        <div className="container">
            <header className="card" style={{ paddingBottom: '10px', marginBottom: '15px' }}>
                <div className="header-row">
                    <div className="app-logo">
                        <span className="logo-text">KARSI</span>
                        <span className="logo-badge">33%</span>
                    </div>
                    <button className="btn-settings-icon" onClick={() => openModal('settings')} title="Asetukset">⚙️</button>
                </div>
            </header>

            {/* Ehdollinen renderöinti: Tervetuloa vs Normaali näkymä */}
            {state.length === 0 ? renderWelcomeScreen() : renderDashboardAndRooms()}

            {/* MODAALIT */}
            {activeModal && (
                <div className="modal" style={{ backgroundColor: (activeModal === 'victory' || activeModal === 'roomVictory') ? 'rgba(0,0,0,0.95)' : 'rgba(255, 255, 255, 0.98)' }}>
                    <div className={`modal-content ${(activeModal === 'victory' || activeModal === 'roomVictory') ? 'victory-modal-content' : ''}`} style={{ background: (activeModal === 'victory' || activeModal === 'roomVictory') ? 'transparent' : '#fff', border: 'none', boxShadow: 'none' }}>
                        
                        {activeModal === 'settings' && <SettingsModal state={state} setState={setState} close={closeModal} />}
                        {activeModal === 'stats' && <StatsModal rooms={processedRooms} globalPerc={globalPerc} globalDiff={globalDiff} totalStart={totalStart} totalRem={totalRem} totalGoal={totalGoal} close={closeModal} />}
                        {activeModal === 'addRoom' && <AddRoomModal state={state} setState={setState} close={closeModal} openRoom={(id) => openModal('room', id)} />}
                        {activeModal === 'room' && <RoomModal room={processedRooms.find(r => r.id === activeRoomId)} close={closeModal} updateRoom={updateRoom} setState={setState} openAddCat={() => openModal('addCategory', activeRoomId)} openCat={(catId) => openModal('category', activeRoomId, catId)} openRoomVictory={(id) => openModal('roomVictory', id)} />}
                        {activeModal === 'category' && <CategoryModal room={processedRooms.find(r => r.id === activeRoomId)} catId={activeCatId} updateCategory={updateCategory} setState={setState} close={() => openModal('room', activeRoomId)} />}
                        {activeModal === 'addCategory' && <AddCategoryModal roomId={activeRoomId} updateRoom={updateRoom} close={() => openModal('room', activeRoomId)} />}
                        {activeModal === 'victory' && <VictoryModal state={state} close={closeModal} />}
                        {activeModal === 'roomVictory' && <RoomVictoryModal room={processedRooms.find(r => r.id === activeRoomId)} close={() => openModal('room', activeRoomId)} />}
                        
                    </div>
                </div>
            )}
        </div>
    );
}

// --- ALIKOMPONENTIT (MODAALIT PYSYVÄT SAMANA) ---

function SettingsModal({ state, setState, close }) {
    const handleReset = () => { if (window.confirm("Nollataanko kaikki? Tätä ei voi perua.")) { setState([]); close(); } };
    const handleCopy = () => { navigator.clipboard.writeText(JSON.stringify(state)).then(() => alert("✅ Data kopioitu!")); };
    const handlePaste = () => {
        const input = window.prompt("Liitä data tähän:", JSON.stringify(state));
        if (input) {
            try { setState(JSON.parse(input).map(r => ({ ...r, id: String(r.id), locked: r.locked === true, categories: r.categories.map(c => ({...c, id: String(c.id)})) }))); } 
            catch(e) { alert("Virheellinen data!"); }
        }
    };
    const handleExport = () => {
        let csv = "Huone;Kategoria;Alku;Tavoite;Poistettu\n";
        state.forEach(r => r.categories.forEach(c => { csv += `${r.name};${c.name};${c.start};${Math.ceil(c.start/3)};${c.removed}\n`; }));
        const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csv], {type: 'text/csv'});
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'karsinta.csv'; a.click();
    };

    return (
        <>
            <div className="modal-header"><h2 style={{margin:0, fontSize:'1.4em'}}>Asetukset</h2></div>
            <div style={{ flex: 1, overflowY: 'auto', paddingTop: '10px' }}>
                <div className="settings-section">
                    <span className="settings-label">Varmuuskopiointi</span>
                    <div className="settings-grid">
                        <button className="btn-sec" onClick={handleCopy}>📋 Kopioi</button>
                        <button className="btn-sec" onClick={handlePaste}>📥 Liitä</button>
                    </div>
                </div>
                <div className="settings-section">
                    <span className="settings-label">Excel / CSV</span>
                    <div className="settings-grid">
                        <button className="btn-export" onClick={handleExport}>Lataa</button>
                    </div>
                </div>
                <div className="danger-zone">
                    <strong style={{color:'var(--danger)'}}>Nollaus</strong>
                    <button className="btn-reset" onClick={handleReset} style={{width:'100%', marginTop:'10px'}}>Tyhjennä kaikki tiedot</button>
                </div>
            </div>
            <div className="modal-footer"><button className="btn-close-modal" onClick={close}>Sulje</button></div>
        </>
    );
}

function StatsModal({ rooms, globalPerc, globalDiff, totalStart, totalRem, totalGoal, close }) {
    const handleShare = () => {
        let roomText = "";
        rooms.forEach(r => { roomText += `${r.rPerc >= 100 ? '✅' : '📦'} ${r.name}: ${Math.round(r.rPerc)} % (${r.rRem}/${r.rGoal})\n`; });
        const text = `Karsi 33% 🏠\nYhteensä: ${globalPerc} % (${totalRem}/${totalGoal})\n\n${roomText}`;
        if (navigator.share) navigator.share({ title: "Karsi 33%", text }); else navigator.clipboard.writeText(text).then(() => alert("Kopioitu leikepöydälle!"));
    };

    return (
        <>
            <div className="modal-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <button onClick={close} style={{ background: 'none', border: 'none', fontSize: '1.5em', padding: 0, cursor: 'pointer', color: '#666' }}>←</button>
                    <h2 style={{ margin: 0, fontSize: '1.4em' }}>Yhteenveto</h2>
                </div>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', paddingTop: '10px' }}>
                <div className="overall-summary" style={{ marginBottom: '20px' }}>
                    <div className="flex" style={{ marginBottom: '5px' }}>
                        <strong style={{ fontSize: '1.1em', color: 'var(--text)' }}>Valmis</strong>
                        <strong style={{ color: 'var(--p)', fontSize: '1.2em' }}>{globalPerc}&thinsp;%</strong>
                    </div>
                    <div className="bar-bg" style={{ height: '16px' }}><div className="bar-fill" style={{ width: `${Math.min(100, globalPerc)}%` }}></div></div>
                    <div className="stats-grid">
                        <div className="stat-box"><span className="stat-label">Alkumäärä</span><span className="stat-value">{totalStart}</span></div>
                        <div className="stat-box"><span className="stat-label">Poistettu</span><span className="stat-value">{totalRem}</span></div>
                        <div className="stat-box"><span className="stat-label">Tavoite</span><span className="stat-value">{totalGoal}</span></div>
                    </div>
                    <div style={{ textAlign: 'center', marginTop: '10px', fontSize: '0.9em', fontWeight: 'bold', color: globalDiff >= 0 ? 'var(--p)' : '#666' }}>
                        {globalDiff >= 0 ? `Tavoite ylitetty (+${globalDiff})` : `Puuttuu: ${Math.abs(globalDiff)}`}
                    </div>
                </div>

                <h3 style={{ fontSize: '1em', color: '#666', textTransform: 'uppercase', marginBottom: '10px', borderBottom: '1px solid #eee', paddingBottom: '5px' }}>Huoneet</h3>
                <div className="stats-list-container">
                    {rooms.map(room => (
                        <div key={room.id} className="stats-detailed-row">
                            <div className="flex">
                                <strong>{room.locked ? '🔒 ' : ''}{room.rPerc >= 100 ? '✅' : '📦'} {room.name}</strong>
                                <span style={{ color: room.rPerc >= 100 ? 'var(--p)' : '#666', fontWeight: 'bold' }}>{Math.round(room.rPerc)}&thinsp;%</span>
                            </div>
                            <div className="bar-bg" style={{ height: '8px', margin: '5px 0' }}><div className="bar-fill" style={{ width: `${Math.min(100, room.rPerc)}%` }}></div></div>
                            <div className="stats-mini-grid">
                                <div>Alku: {room.rStart}</div>
                                <div>Tavoite: {room.rGoal}</div>
                                <div style={{ fontWeight: 'bold', color: 'var(--text)' }}>Poistettu: {room.rRem}</div>
                            </div>
                        </div>
                    ))}
                </div>
                <div style={{ marginTop: '20px' }}><button className="btn-share" onClick={handleShare}>📤 Jaa tilanne</button></div>
            </div>
        </>
    );
}

function AddRoomModal({ state, setState, close, openRoom }) {
    const [name, setName] = useState('');
    const [template, setTemplate] = useState('');
    const [lastAutoFilled, setLastAutoFilled] = useState('');

    const handleTemplateChange = (e) => {
        const val = e.target.value;
        setTemplate(val);
        const tplName = ROOM_TEMPLATES[val].label.split('(')[0].trim();
        const newName = val === 'empty' ? '' : tplName;
        if (name === '' || name === lastAutoFilled) {
            setName(newName);
            setLastAutoFilled(newName);
        }
    };

    const handleSave = () => {
        if (!name.trim()) return alert("Nimi puuttuu!");
        const tpl = ROOM_TEMPLATES[template || 'empty'];
        const newId = generateId();
        setState([...state, {
            id: newId, name: name.trim(), pinned: false, locked: false, lastEdited: Date.now(),
            categories: tpl.categories.map(c => ({ id: generateId(), name: c, start: 0, removed: 0, locked: false }))
        }]);
        openRoom(newId);
    };

    return (
        <>
            <div className="modal-header"><h2 style={{ margin: 0, fontSize: '1.4em' }}>Uusi huone</h2></div>
            <div style={{ flex: 1, overflowY: 'auto', paddingTop: '20px' }}>
                <div className="modal-input-group">
                    <label className="modal-label">Valitse pohja</label>
                    <select value={template} onChange={handleTemplateChange} className="modal-input">
                        <option value="" disabled>Valitse listasta...</option>
                        <option value="empty">{ROOM_TEMPLATES['empty'].label}</option>
                        {Object.keys(ROOM_TEMPLATES).filter(k => k !== 'empty').map(k => (
                            <option key={k} value={k}>{ROOM_TEMPLATES[k].label}</option>
                        ))}
                    </select>
                </div>
                <div className="modal-input-group">
                    <label className="modal-label">Nimi</label>
                    <input type="text" value={name} onChange={e => setName(e.target.value)} className="modal-input" placeholder="Esim. Varasto" autoFocus />
                </div>
            </div>
            <div className="modal-btn-group">
                <button className="btn-cancel" onClick={close}>Peru</button>
                <button className="btn-save" onClick={handleSave}>Luo</button>
            </div>
        </>
    );
}

function RoomModal({ room, close, updateRoom, setState, openAddCat, openCat, openRoomVictory }) {
    if (!room) return null;

    const handleRename = () => {
        const newName = window.prompt("Uusi nimi:", room.name);
        if (newName && newName.trim()) updateRoom(room.id, r => ({ ...r, name: newName.trim() }));
    };

    const handleDelete = () => {
        if (window.confirm("Poistetaanko huone?")) {
            setState(prev => prev.filter(r => r.id !== room.id));
            close();
        }
    };

    const handleLock = () => {
        updateRoom(room.id, r => ({ ...r, locked: !r.locked }));
        if (!room.locked) openRoomVictory(room.id); 
    };

    const isGold = room.locked && room.rPerc >= 100;

    return (
        <>
            <div className="modal-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                    <button onClick={close} style={{ background: 'none', border: 'none', fontSize: '1.5em', padding: 0, cursor: 'pointer', color: '#666' }}>←</button>
                    <h2 style={{ margin: 0, fontSize: '1.4em' }}>{room.locked ? '🔒 ' : ''}{room.name}</h2>
                </div>
                <div 
                    className={`overall-summary ${isGold ? 'gold-mode hover-card' : ''}`} 
                    style={{ marginBottom: 0, padding: '10px', background: room.locked && !isGold ? '#f0f9f9' : undefined, cursor: isGold ? 'pointer' : 'default' }}
                    onClick={() => isGold && openRoomVictory(room.id)}
                >
                    <div className="flex" style={{ marginBottom: '5px' }}>
                        <strong style={{ fontSize: '0.9em', color: 'var(--text)' }}>{isGold ? '🏆 VALMIS' : 'Valmis'}</strong>
                        <strong style={{ color: isGold ? '#4a3b00' : 'var(--p)', fontSize: '1.1em' }}>{Math.round(room.rPerc)}&thinsp;%</strong>
                    </div>
                    <div className="bar-bg" style={{ height: '10px', margin: '5px 0' }}><div className="bar-fill" style={{ width: `${Math.min(100, room.rPerc)}%`, background: isGold ? '#fff' : '' }}></div></div>
                </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto' }}>
                {room.locked ? (
                    <div style={{ textAlign: 'center', padding: '10px', color: 'var(--accent)', fontWeight: 'bold' }}>🔒 HUONE LUKITTU</div>
                ) : (
                    <button className="btn-add-trigger" onClick={openAddCat} style={{ marginTop: '10px', padding: '10px', fontSize: '0.9em' }}>+ Uusi kategoria</button>
                )}

                <div style={{ marginTop: '10px' }}>
                    {room.categories.map(cat => (
                        <div key={cat.id} className={`category-item ${cat.locked ? 'locked' : ''}`} onClick={() => openCat(cat.id)} style={{ cursor: 'pointer' }}>
                            <div className="flex">
                                <strong>{cat.name} {cat.locked ? '🔒' : ''}</strong>
                                <div style={{ color: 'var(--p)' }}>➔</div>
                            </div>
                            <div style={{ fontSize: '0.9em', margin: '5px 0' }}>Alku: {cat.start} | Poistettu: {cat.removed}</div>
                            <div className="bar-bg"><div className="bar-fill" style={{ width: `${Math.min(100, cat.start > 0 ? (cat.removed / Math.ceil(cat.start / 3)) * 100 : 0)}%` }}></div></div>
                        </div>
                    ))}
                </div>

                <button 
                    onClick={handleLock}
                    style={{ width: '100%', marginTop: '20px', padding: '15px', fontSize: '1.1em', borderRadius: '8px', background: room.locked ? 'var(--accent)' : 'var(--white)', color: room.locked ? 'white' : 'var(--p)', border: `2px solid ${room.locked ? 'transparent' : 'var(--p)'}` }}
                >
                    {room.locked ? "🔓 Avaa huone" : "🔒 Lukitse huone (Valmis)"}
                </button>

                {!room.locked && (
                    <div style={{ marginTop: '10px' }}>
                        <button className="btn-lock" onClick={handleRename} style={{ width: '100%', marginTop: '10px' }}>Nimeä uudelleen</button>
                        <button className="btn-delete-room" onClick={handleDelete} disabled={room.categories.some(c => c.locked)}>Poista huone</button>
                    </div>
                )}
            </div>
        </>
    );
}

function AddCategoryModal({ roomId, updateRoom, close }) {
    const [name, setName] = useState('');
    const [start, setStart] = useState(0);

    const handleSave = () => {
        if (!name.trim()) return alert("Nimi puuttuu!");
        updateRoom(roomId, r => ({
            ...r, categories: [...r.categories, { id: generateId(), name: name.trim(), start, removed: 0, locked: false }]
        }));
        close();
    };

    return (
        <>
            <div className="modal-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <button onClick={close} style={{ background: 'none', border: 'none', fontSize: '1.5em', padding: 0 }}>←</button>
                    <h2 style={{ margin: 0 }}>Lisää kategoria</h2>
                </div>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', paddingTop: '10px' }}>
                <div className="modal-input-group"><input type="text" value={name} onChange={e => setName(e.target.value)} className="modal-input" placeholder="Nimi (esim. Takit)" autoFocus /></div>
                <div className="modal-input-group" style={{ textAlign: 'center' }}>
                    <label className="modal-label">Montako?</label>
                    <div className="big-number" style={{ fontSize: '3em', color: 'var(--text)' }}>{start}</div>
                </div>
                <div className="control-grid" style={{ marginBottom: '20px' }}>
                    <button className="btn-large minus" onClick={() => setStart(Math.max(0, start - 5))}>-5</button>
                    <button className="btn-large plus" onClick={() => setStart(start + 1)}>+1</button>
                    <button className="btn-large plus" onClick={() => setStart(start + 5)}>+5</button>
                    <button className="btn-large minus" onClick={() => setStart(Math.max(0, start - 10))}>-10</button>
                    <button className="btn-large minus" onClick={() => setStart(Math.max(0, start - 1))}>-1</button>
                    <button className="btn-large plus" onClick={() => setStart(start + 10)}>+10</button>
                </div>
            </div>
            <div className="modal-btn-group"><button className="btn-cancel" onClick={close}>Peru</button><button className="btn-save" onClick={handleSave}>Tallenna</button></div>
        </>
    );
}

function CategoryModal({ room, catId, updateCategory, setState, close }) {
    const cat = room?.categories.find(c => c.id === catId);
    if (!cat) return null;

    const goal = Math.ceil(cat.start / 3);
    const diff = cat.removed - goal;

    const handleStartChange = (delta) => updateCategory(room.id, cat.id, c => { const n = Math.max(0, c.start + delta); return { ...c, start: n, removed: Math.min(c.removed, n) }; });
    const handleRemChange = (delta) => updateCategory(room.id, cat.id, c => { const n = Math.max(0, c.removed + delta); return { ...c, removed: n, start: Math.max(c.start, n) }; });

    if (room.locked) {
        return (
            <>
                <div className="modal-header"><button onClick={close} style={{ background: 'none', border: 'none', fontSize: '1.5em' }}>←</button><h2>{cat.name}</h2></div>
                <div style={{ textAlign: 'center', padding: '30px', background: '#f0f9f9', borderRadius: '12px', marginTop: '20px' }}><div style={{ fontSize: '3em' }}>🔒</div><h3>Huone on lukittu</h3></div>
                <div className="modal-footer"><button className="btn-close-modal" onClick={close}>Sulje</button></div>
            </>
        );
    }

    return (
        <>
            <div className="modal-header"><button onClick={close} style={{ background: 'none', border: 'none', fontSize: '1.5em', float: 'left' }}>←</button><h2 style={{ margin: 0 }}>{cat.name}</h2></div>
            <div className="big-stat-display">
                <div className="sub-label">Poistettu</div>
                <div className="stat-row"><span className="big-number">{cat.removed}</span><span className="goal-number">/ {goal}</span></div>
                <div className="bar-bg"><div className="bar-fill" style={{ width: `${Math.min(100, goal > 0 ? (cat.removed / goal) * 100 : 0)}%` }}></div></div>
                <div style={{ marginTop: '8px', fontWeight: 'bold', color: diff >= 0 ? 'var(--p)' : '#666' }}>{diff >= 0 ? 'Tavoite saavutettu!' : `Puuttuu: ${Math.abs(diff)}`}</div>
            </div>
            {!cat.locked ? (
                <div style={{ flex: 1, overflowY: 'auto' }}>
                    <div className="control-grid" style={{ marginTop: '20px' }}>
                        <button className="btn-large minus" onClick={() => handleRemChange(-5)}>-5</button>
                        <button className="btn-large plus" onClick={() => handleRemChange(1)}>+1</button>
                        <button className="btn-large plus" onClick={() => handleRemChange(5)}>+5</button>
                        <button className="btn-large minus" onClick={() => handleRemChange(-10)}>-10</button>
                        <button className="btn-large minus" onClick={() => handleRemChange(-1)}>-1</button>
                        <button className="btn-large plus" onClick={() => handleRemChange(10)}>+10</button>
                    </div>
                    <div style={{ marginTop: '15px', borderTop: '1px solid #eee', paddingTop: '15px' }}>
                        <div style={{ textAlign: 'center', fontSize: '0.85em', color: '#666', marginBottom: '5px' }}>Korjaa alkumäärää (Nyt: <strong>{cat.start}</strong>)</div>
                        <div className="adjust-grid">
                            <button className="btn-adjust" onClick={() => handleStartChange(-5)}>-5</button>
                            <button className="btn-adjust" onClick={() => handleStartChange(-1)}>-1</button>
                            <button className="btn-adjust" onClick={() => handleStartChange(1)}>+1</button>
                            <button className="btn-adjust" onClick={() => handleStartChange(5)}>+5</button>
                        </div>
                    </div>
                    <button className="btn-lock" onClick={() => updateCategory(room.id, cat.id, c => ({ ...c, locked: true }))} style={{ marginTop: '20px' }}>Lukitse</button>
                    <button className="btn-delete-room" onClick={() => { if(window.confirm('Poista?')) { setState(prev => prev.map(r => r.id === room.id ? {...r, categories: r.categories.filter(c => c.id !== cat.id)} : r)); close(); } }}>Poista kategoria</button>
                </div>
            ) : (
                <div style={{ textAlign: 'center', padding: '30px', background: '#f0f9f9', borderRadius: '12px' }}>
                    <div style={{ fontSize: '3em' }}>🔒</div><h3>Lukittu</h3>
                    <button className="btn-unlock" onClick={() => updateCategory(room.id, cat.id, c => ({ ...c, locked: false }))}>Avaa</button>
                </div>
            )}
            <div className="modal-footer"><button className="btn-close-modal" onClick={close}>Valmis</button></div>
        </>
    );
}

function VictoryModal({ state, close }) {
    let totalStart = 0, totalRem = 0, totalGoal = 0;
    state.forEach(r => r.categories.forEach(c => { totalStart += c.start; totalRem += c.removed; totalGoal += Math.ceil(c.start/3); }));
    const perc = totalGoal > 0 ? Math.round((totalRem/totalGoal)*100) : 0;

    return (
        <div style={{ position: 'relative', overflow: 'hidden', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
            {Array.from({ length: 30 }).map((_, i) => (
                <div key={i} className="confetti" style={{ left: `${Math.random() * 100}%`, animationDelay: `${Math.random() * 2}s`, background: ['#FFD700', '#FFF', '#FF4500'][Math.floor(Math.random() * 3)] }} />
            ))}
            <div className="victory-title">Urakka<br/>Valmis!</div>
            <div className="victory-subtitle">Karsintatavoite saavutettu</div>
            <div className="victory-stat-big">{totalRem}</div>
            <div style={{ fontSize: '1.2em', color: '#fff', marginBottom: '10px' }}>tavaraa poistettu</div>
            
            <div style={{ background: 'rgba(255,255,255,0.1)', padding: '15px', borderRadius: '12px', marginTop: '20px', width: '80%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#ccc' }}><span>Alkumäärä</span><span>{totalStart}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#FFD700', fontWeight: 'bold', fontSize: '1.1em' }}><span>Valmiusaste</span><span>{perc} %</span></div>
            </div>
            <button className="btn-victory-share" onClick={() => navigator.share ? navigator.share({ text: `🏆 URAKKA VALMIS!\n\nKarsin kodistani ${totalRem} tavaraa. #karsi33` }) : navigator.clipboard.writeText(`Karsin ${totalRem} tavaraa!`)}>📤 JAA TULOS</button>
            <button className="btn-victory-close" onClick={close}>Sulje ja ihaile</button>
        </div>
    );
}

function RoomVictoryModal({ room, close }) {
    let rStart = 0, rGoal = 0, rRem = 0;
    room.categories.forEach(c => { rStart += c.start; rGoal += Math.ceil(c.start / 3); rRem += c.removed; });
    const rPerc = rGoal > 0 ? Math.round((rRem / rGoal) * 100) : 0;

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
            {Array.from({ length: 20 }).map((_, i) => (
                <div key={i} className="confetti" style={{ left: `${Math.random() * 100}%`, animationDelay: `${Math.random() * 2}s`, background: ['#FFD700', '#fff'][Math.floor(Math.random() * 2)] }} />
            ))}
            <div className="victory-card-container">
                <div className="victory-badge">HUONE VALMIS</div>
                <div className="victory-title" style={{ fontSize: '2em' }}>{room.name}</div>
                <hr style={{ borderColor: '#555', margin: '15px 0' }} />
                <div className="victory-stat-big" style={{ fontSize: '3.5em' }}>{rRem}</div>
                <div style={{ fontSize: '1.1em', color: '#ccc', textTransform: 'uppercase', marginBottom: '20px' }}>Tavaraa poistettu</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', textAlign: 'left', fontSize: '0.9em', color: '#aaa' }}>
                    <div>Alkumäärä: <span style={{ color: '#fff' }}>{rStart}</span></div>
                    <div>Tavoite: <span style={{ color: '#fff' }}>{rGoal}</span></div>
                </div>
                <div style={{ marginTop: '15px', fontWeight: 'bold', color: '#FFD700', fontSize: '1.2em' }}>Suoritus: {rPerc} %</div>
            </div>
            <div style={{ marginTop: '30px', width: '100%', maxWidth: '400px' }}>
                <button className="btn-victory-share" onClick={() => navigator.share ? navigator.share({ text: `✅ ${room.name} VALMIS!\n\nPoistin ${rRem} tavaraa. #karsi33` }) : navigator.clipboard.writeText("Kopioitu!")} style={{ width: '100%' }}>📤 Jaa Whatsappiin</button>
                <button className="btn-victory-close" onClick={close} style={{ width: '100%', background: '#333', color: '#ccc', border: 'none', marginTop: '10px' }}>Sulje ja palaa</button>
            </div>
        </div>
    );
}