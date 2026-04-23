const { useState, useEffect } = React;

function Gauge({ title, value, unit, max, type, icon, onClick }) {
    const percentage = Math.min(100, Math.max(0, (value / max) * 100));
    const typeClass = `${type}-gauge`;
    const textClass = `${type}-text`;
    
    return (
        <div className="glass-panel gauge-card" onClick={onClick}>
            <div className="gauge-title">
                <i className={`fas ${icon}`}></i> {title}
            </div>
            {/* The style sets a CSS variable for the conic gradient */}
            <div className={`gauge-circle ${typeClass}`} style={{ "--percentage": `${percentage}%` }}>
                <div className="gauge-value-container">
                    <span className={`gauge-value ${textClass}`}>
                        {type === 'battery' ? Math.round(value) : value.toFixed(1)}
                    </span>
                    <span className="gauge-unit">{unit}</span>
                </div>
            </div>
        </div>
    );
}

function OptimizationPanel({ hintData }) {
    if (!hintData) return <div className="glass-panel optimization-panel"><div className="panel-header"><i className="fas fa-magic"></i> AI Optimizer</div><p>Loading...</p></div>;
    
    const { hint, status, appliances } = hintData;
    
    return (
        <div className="glass-panel optimization-panel">
            <div className="panel-header">
                <i className="fas fa-magic"></i> Smart Hub Optimizer
            </div>
            <div className={`hint-box hint-${status}`}>
                {hint}
            </div>
            
            <div className="appliance-list">
                {appliances && appliances.map(app => (
                    <div key={app.id} className={`appliance-row ${app.isActive ? 'is-active' : ''} action-${app.action}`}>
                        <div className="appliance-info">
                            <div className="appliance-icon">
                                <i className={`fas ${app.icon}`}></i>
                            </div>
                            <div className="appliance-text">
                                <h4>{app.name}</h4>
                                <p>{app.recommendation}</p>
                            </div>
                        </div>
                        <div className="appliance-stats">
                            <div className="kw">{app.consumptionKwh > 0 ? `${app.consumptionKwh} kW` : '--'}</div>
                            <div className="status-badge">{app.isActive ? 'ON' : 'OFF'}</div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function CarbonCalculator({ carbonData, period }) {
    if (!carbonData) return <div className="glass-panel carbon-panel">Loading...</div>;
    
    const periodLabel = period === 'realtime' ? 'Lifetime' : period === 'weekly' ? 'Weekly' : 'Monthly';
    
    return (
        <div className="glass-panel carbon-panel">
            <div className="panel-header" style={{border: 'none', marginBottom: 0}}>
                <i className="fas fa-leaf"></i> Carbon Footprint
            </div>
            <p className="subtitle">{periodLabel} CO₂ Emissions Avoided</p>
            
            <div className="carbon-value">
                {carbonData.co2SavedKg.toFixed(1)} <span style={{fontSize: '1.2rem', color: 'var(--text-main)'}}>kg</span>
            </div>
            
            <div className="carbon-trees">
                <i className="fas fa-tree" style={{color: 'var(--battery-color)'}}></i>
                <span>Equivalent to planting <strong>{carbonData.equivalentTreesPlanted} trees</strong></span>
            </div>
        </div>
    );
}

function PeriodToggle({ period, setPeriod }) {
    return (
        <div className="period-toggle">
            <button className={period === 'realtime' ? 'active' : ''} onClick={() => setPeriod('realtime')}>Live</button>
            <button className={period === 'weekly' ? 'active' : ''} onClick={() => setPeriod('weekly')}>Weekly</button>
            <button className={period === 'monthly' ? 'active' : ''} onClick={() => setPeriod('monthly')}>Monthly</button>
        </div>
    );
}

function HistoryChart({ historyData, period }) {
    const chartRef = React.useRef(null);
    const chartInstance = React.useRef(null);

    useEffect(() => {
        if (!historyData || historyData.length === 0 || !chartRef.current) return;

        if (chartInstance.current) {
            chartInstance.current.destroy();
        }

        const ctx = chartRef.current.getContext('2d');
        const labels = historyData.map(d => {
            const date = new Date(d.logTime);
            if (period !== 'realtime') {
                return date.toLocaleDateString(undefined, {month: 'short', day: 'numeric'});
            }
            return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}`;
        });
        
        chartInstance.current = new Chart(ctx, {
            type: 'line',
            data: {
                labels,
                datasets: [
                    {
                        label: 'Solar (kW)',
                        data: historyData.map(d => d.solarYield),
                        borderColor: '#fca311',
                        backgroundColor: 'rgba(252, 163, 17, 0.1)',
                        tension: 0.4,
                        fill: true
                    },
                    {
                        label: 'Grid (kW)',
                        data: historyData.map(d => d.gridUsage),
                        borderColor: '#e63946',
                        backgroundColor: 'transparent',
                        tension: 0.4
                    }
                ]
            },
            options: {
                animation: false,
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { labels: { color: '#f0f4f8' } }
                },
                scales: {
                    x: { ticks: { color: '#8a96a8', maxTicksLimit: 10 }, grid: { color: 'rgba(255,255,255,0.05)' } },
                    y: { ticks: { color: '#8a96a8' }, grid: { color: 'rgba(255,255,255,0.05)' }, beginAtZero: true }
                }
            }
        });

        return () => {
            if (chartInstance.current) chartInstance.current.destroy();
        }
    }, [historyData]);

    return (
        <div className="glass-panel" style={{height: '350px', marginTop: '1.5rem'}}>
            <div className="panel-header"><i className="fas fa-chart-area"></i> Energy History</div>
            <div style={{height: 'calc(100% - 50px)', width: '100%', position: 'relative'}}>
                {historyData && historyData.length > 0 ? <canvas ref={chartRef}></canvas> : <p style={{textAlign:'center', marginTop:'3rem', color:'var(--text-muted)'}}>Collecting data points...</p>}
            </div>
        </div>
    );
}

function GaugeModal({ gaugeType, historyData, onClose }) {
    const chartRef = React.useRef(null);
    const chartInstance = React.useRef(null);

    useEffect(() => {
        if (!historyData || historyData.length === 0 || !chartRef.current) return;
        if (chartInstance.current) chartInstance.current.destroy();

        const ctx = chartRef.current.getContext('2d');
        const labels = historyData.map(d => {
            const date = new Date(d.logTime);
            return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}`;
        });
        
        let label, data, borderColor, backgroundColor;
        if (gaugeType === 'solar') {
            label = 'Solar Yield (kW)';
            data = historyData.map(d => d.solarYield);
            borderColor = '#fca311';
            backgroundColor = 'rgba(252, 163, 17, 0.2)';
        } else if (gaugeType === 'grid') {
            label = 'Grid Usage (kW)';
            data = historyData.map(d => d.gridUsage);
            borderColor = '#e63946';
            backgroundColor = 'rgba(230, 57, 70, 0.2)';
        } else if (gaugeType === 'battery') {
            label = 'Battery Level (%)';
            data = historyData.map(d => d.batteryLevel);
            borderColor = '#06d6a0';
            backgroundColor = 'rgba(6, 214, 160, 0.2)';
        }

        chartInstance.current = new Chart(ctx, {
            type: 'line',
            data: {
                labels,
                datasets: [{ label, data, borderColor, backgroundColor, tension: 0.4, fill: true }]
            },
            options: {
                animation: false,
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { labels: { color: '#f0f4f8' } } },
                scales: {
                    x: { ticks: { color: '#8a96a8', maxTicksLimit: 10 }, grid: { color: 'rgba(255,255,255,0.05)' } },
                    y: { ticks: { color: '#8a96a8' }, grid: { color: 'rgba(255,255,255,0.05)' }, beginAtZero: true }
                }
            }
        });

        return () => {
            if (chartInstance.current) chartInstance.current.destroy();
        }
    }, [gaugeType, historyData]);

    if (!gaugeType) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <button className="modal-close" onClick={onClose}><i className="fas fa-times"></i></button>
                <div className="panel-header" style={{border: 'none'}}>
                    <i className="fas fa-chart-line"></i> {gaugeType.charAt(0).toUpperCase() + gaugeType.slice(1)} History Model
                </div>
                <div style={{height: '350px', width: '100%', position: 'relative', marginTop:'1rem'}}>
                    {historyData && historyData.length > 0 ? <canvas ref={chartRef}></canvas> : <p style={{textAlign:'center', marginTop:'3rem', color:'var(--text-muted)'}}>Collecting data points...</p>}
                </div>
            </div>
        </div>
    );
}

function App() {
    const [statusData, setStatusData] = useState({ solarYield: 0, gridUsage: 0, batteryLevel: 0, timestamp: '' });
    const [hintData, setHintData] = useState(null);
    const [carbonData, setCarbonData] = useState(null);
    const [historyData, setHistoryData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedGauge, setSelectedGauge] = useState(null);
    const [period, setPeriod] = useState('realtime');

    const fetchData = async () => {
        try {
            const [statusRes, optRes, carbRes, histRes] = await Promise.all([
                fetch('/api/status'),
                fetch('/api/optimization'),
                fetch(`/api/carbon?period=${period}`),
                fetch(`/api/history?period=${period}`)
            ]);
            
            setStatusData(await statusRes.json());
            setHintData(await optRes.json());
            setCarbonData(await carbRes.json());
            setHistoryData(await histRes.json());
            setLoading(false);
        } catch (error) {
            console.error("Error fetching data: ", error);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 5000); // Polling every 5 seconds
        return () => clearInterval(interval);
    }, [period]);

    const timeString = statusData.timestamp 
        ? new Date(statusData.timestamp).toLocaleTimeString() 
        : 'Loading...';

    return (
        <>
            <header>
                <div>
                    <h1><i className="fas fa-solar-panel"></i> EcoHome</h1>
                    <div className="subtitle">Sustainable Energy Management System</div>
                </div>
                <div className="timestamp">
                    <span className="live-indicator"></span>
                    Live • {timeString}
                </div>
            </header>

            <main>
                <div style={{display: 'flex', justifyContent: 'flex-end', marginBottom: '1.5rem'}}>
                    <PeriodToggle period={period} setPeriod={setPeriod} />
                </div>
                <div className="dashboard-grid">
                    <Gauge 
                        title="Solar Yield" 
                        value={statusData.solarYield} 
                        unit="kW" 
                        max={10} 
                        type="solar" 
                        icon="fa-sun"
                        onClick={() => setSelectedGauge('solar')}
                    />
                    <Gauge 
                        title="Grid Usage" 
                        value={statusData.gridUsage} 
                        unit="kW" 
                        max={10} 
                        type="grid" 
                        icon="fa-bolt"
                        onClick={() => setSelectedGauge('grid')}
                    />
                    <Gauge 
                        title="Battery Level" 
                        value={statusData.batteryLevel} 
                        unit="%" 
                        max={100} 
                        type="battery" 
                        icon="fa-battery-three-quarters"
                        onClick={() => setSelectedGauge('battery')}
                    />
                </div>

                <div className="secondary-grid">
                    <OptimizationPanel hintData={hintData} />
                    <CarbonCalculator carbonData={carbonData} period={period} />
                </div>

                <HistoryChart historyData={historyData} period={period} />
            </main>
            
            {selectedGauge && (
                <GaugeModal 
                    gaugeType={selectedGauge} 
                    historyData={historyData} 
                    onClose={() => setSelectedGauge(null)} 
                />
            )}
        </>
    );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
