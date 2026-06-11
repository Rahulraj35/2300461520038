import React, { useState, useEffect, useRef } from 'react';
import { NotificationMinHeap, getWeight } from '../utils/priorityQueue';
import { authenticate, fetchNotifications, isTokenValid, logout } from '../api/api';

// Pre-defined mock messages for simulation
const MOCK_MESSAGES = {
  placement: [
    'Google is hiring Software Engineering Interns (Stipend: ₹1.5L/mo)',
    'Microsoft India off-campus drive for Full Stack Developers',
    'Amazon Web Services (AWS) Cloud Associate recruitment drive',
    'Netflix India hiring React Native developers for mobile team',
    'Uber Technologies Campus Placements for Backend Engineers',
    'Atlassian off-campus recruitment: Graduation year 2026',
    'Adobe hiring Product Security Engineers - Apply now!',
    'Salesforce Graduate Analyst roles opening soon',
  ],
  result: [
    'Mid-semester examinations results are now published on portals',
    'End-semester practical assessment grades released',
    'Data Structures & Algorithms lab final evaluation list out',
    'Re-evaluation results for Autumn Semester declared',
    'NPTEL certification exam scores sent via email',
    'Capstone Project Phase-1 marks updated by committee',
    'Dean\'s Honor List for outstanding academic performance released',
  ],
  event: [
    'Annual Technical Symposium "Udyam-2026" registration starts',
    'Guest lecture on "Scale & Architecture of Modern Web Apps" today',
    'Farewell Ceremony details for graduating batch',
    'Hackathon "CodeRed-24hr" registrations closing tonight',
    'Alumni meet & networking lunch scheduled for Saturday',
    'Seminar on Higher Studies & MS opportunities in USA/Germany',
    'College Sports Fest "Spardha" registrations open',
  ]
};

export default function Dashboard() {
  // Config state (pre-filled with environment variables)
  const [config, setConfig] = useState({
    email: import.meta.env.VITE_EMAIL || 'rrahul97050@gmail.com',
    name: import.meta.env.VITE_NAME || 'Rahul Raj',
    rollNo: import.meta.env.VITE_ROLL_NO || '2300461520038',
    clientID: import.meta.env.VITE_CLIENT_ID || 'faccaea3-745b-464d-b64f-b6ad7b42b9a4',
    clientSecret: import.meta.env.VITE_CLIENT_SECRET || 'XHcRDVPhqJybtpGs',
    accessCode: 'BAVDSh'
  });

  const [isAuthenticated, setIsAuthenticated] = useState(isTokenValid());
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  
  // App state
  const [notifications, setNotifications] = useState([]);
  const [heapSize, setHeapSize] = useState(10);
  const [priorityNotifications, setPriorityNotifications] = useState([]);
  const [heapArrayState, setHeapArrayState] = useState([]);
  const [isLiveMode, setIsLiveMode] = useState(false);
  const [autoSimulate, setAutoSimulate] = useState(false);
  const [lastNotificationId, setLastNotificationId] = useState(null);
  const [apiError, setApiError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);

  // Instantiating the Min Heap
  const heapRef = useRef(new NotificationMinHeap(heapSize));

  // Handle initialization of state from persistent store or API
  useEffect(() => {
    // Sync heap size changes
    heapRef.current.updateMaxSize(heapSize);
    updateOutputs();
  }, [heapSize]);

  // Load notifications from local storage on mount (if available)
  useEffect(() => {
    const saved = localStorage.getItem('notifications_history');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setNotifications(parsed);
        // Feed initial items to Heap
        heapRef.current = new NotificationMinHeap(heapSize);
        parsed.forEach(n => heapRef.current.insert(n));
        updateOutputs();
      } catch (e) {
        console.error('Failed to load notifications from local storage', e);
      }
    }
  }, []);

  // Live polling for API mode
  useEffect(() => {
    let interval;
    if (isLiveMode && isAuthenticated) {
      fetchLiveNotifications();
      interval = setInterval(fetchLiveNotifications, 15000); // Poll every 15s
    }
    return () => clearInterval(interval);
  }, [isLiveMode, isAuthenticated]);

  // Auto-simulator interval
  useEffect(() => {
    let interval;
    if (autoSimulate) {
      interval = setInterval(triggerSimulation, 3000);
    }
    return () => clearInterval(interval);
  }, [autoSimulate]);

  const updateOutputs = () => {
    setPriorityNotifications(heapRef.current.getSortedList());
    setHeapArrayState([...heapRef.current.heap]);
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError('');
    try {
      await authenticate(config);
      setIsAuthenticated(true);
      setApiError('');
      // Switch on Live Mode immediately upon login
      setIsLiveMode(true);
      setShowConfigModal(false);
    } catch (err) {
      setAuthError(err.message || 'Authentication failed');
      setIsAuthenticated(false);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    setIsAuthenticated(false);
    setIsLiveMode(false);
    setApiError('');
  };

  const fetchLiveNotifications = async () => {
    setLoading(true);
    setApiError('');
    try {
      const liveItems = await fetchNotifications();
      if (liveItems && liveItems.length > 0) {
        // Find if we have new items
        let addedAny = false;
        
        // Loop backwards (oldest to newest) to maintain natural arrival flow
        const sortedLiveItems = [...liveItems].sort((a, b) => new Date(a.Timestamp) - new Date(b.Timestamp));
        
        setNotifications(prev => {
          const prevMap = new Map(prev.map(item => [item.ID, item]));
          let updated = [...prev];
          
          sortedLiveItems.forEach(item => {
            if (!prevMap.has(item.ID)) {
              updated.push(item);
              const inserted = heapRef.current.insert(item);
              if (inserted) {
                setLastNotificationId(item.ID);
                addedAny = true;
              }
            }
          });

          // Save to local storage
          localStorage.setItem('notifications_history', JSON.stringify(updated));
          return updated;
        });

        if (addedAny) {
          updateOutputs();
        }
      }
    } catch (err) {
      setApiError(err.message || 'Failed to fetch live notifications');
      // If unauthorized, update authentication status
      if (err.message.includes('401') || err.message.includes('unauthorized')) {
        setIsAuthenticated(false);
        setIsLiveMode(false);
      }
    } finally {
      setLoading(false);
    }
  };

  const triggerSimulation = () => {
    const categories = ['placement', 'result', 'event'];
    const randomCategory = categories[Math.floor(Math.random() * categories.length)];
    const messages = MOCK_MESSAGES[randomCategory];
    const message = messages[Math.floor(Math.random() * messages.length)];
    
    // Generate UUID
    const id = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    
    // Get current time formatted as YYYY-MM-DD HH:mm:ss
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const timestamp = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

    const newNotification = {
      ID: id,
      Type: randomCategory.charAt(0).toUpperCase() + randomCategory.slice(1),
      Message: message,
      Timestamp: timestamp
    };

    setNotifications(prev => {
      const updated = [newNotification, ...prev];
      localStorage.setItem('notifications_history', JSON.stringify(updated));
      return updated;
    });

    const inserted = heapRef.current.insert(newNotification);
    setLastNotificationId(newNotification.ID);
    
    if (inserted) {
      updateOutputs();
    }
  };

  const clearHistory = () => {
    localStorage.removeItem('notifications_history');
    setNotifications([]);
    heapRef.current = new NotificationMinHeap(heapSize);
    setLastNotificationId(null);
    updateOutputs();
  };

  // Counting stats
  const countStats = {
    total: notifications.length,
    placement: notifications.filter(n => n.Type?.toLowerCase() === 'placement').length,
    result: notifications.filter(n => n.Type?.toLowerCase() === 'result').length,
    event: notifications.filter(n => n.Type?.toLowerCase() === 'event').length,
  };

  return (
    <div className="dashboard-container">
      {/* Navbar */}
      <header className="dashboard-navbar">
        <div className="logo-container">
          <div className="logo-pulse"></div>
          <h1>AffordMed</h1>
          <span className="badge-evaluation">Evaluation Dashboard</span>
        </div>
        <div className="nav-controls">
          <div className="auth-status-container">
            {isAuthenticated ? (
              <div className="auth-success-badge">
                <span className="pulse-green"></span>
                <span>Connected API</span>
                <button className="btn-logout" onClick={handleLogout}>Disconnect</button>
              </div>
            ) : (
              <button className="btn-auth-trigger" onClick={() => setShowConfigModal(true)}>
                Connect API Credentials
              </button>
            )}
          </div>
          <button className="btn-config" onClick={() => setShowConfigModal(true)} title="Settings">
            <svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M12,15.5A3.5,3.5 0 0,1 8.5,12A3.5,3.5 0 0,1 12,8.5A3.5,3.5 0 0,1 15.5,12A3.5,3.5 0 0,1 12,15.5M19.43,12.97C19.47,12.65 19.5,12.33 19.5,12C19.5,11.67 19.47,11.34 19.43,11L21.54,9.37C21.73,9.22 21.78,8.95 21.66,8.73L19.66,5.27C19.54,5.05 19.27,4.96 19.05,5.05L16.56,6.05C16.04,5.66 15.47,5.34 14.86,5.08L14.48,2.42C14.44,2.18 14.24,2 14,2H10C9.76,2 9.56,2.18 9.52,2.42L9.14,5.08C8.53,5.34 7.96,5.66 7.44,6.05L4.95,5.05C4.73,4.96 4.46,5.05 4.34,5.27L2.34,8.73C2.21,8.95 2.27,9.22 2.46,9.37L4.57,11C4.53,11.34 4.5,11.67 4.5,12C4.5,12.33 4.53,12.65 4.57,12.97L2.46,14.63C2.27,14.78 2.21,15.05 2.34,15.27L4.34,18.73C4.46,18.95 4.73,19.03 4.95,18.95L7.44,17.94C7.96,18.34 8.53,18.66 9.14,18.92L9.52,21.58C9.56,21.82 9.76,22 10,22H14C14.24,22 14.44,21.82 14.48,21.58L14.86,18.92C15.47,18.66 16.04,18.34 16.56,17.94L19.05,18.95C19.27,19.03 19.54,18.95 19.66,18.73L21.66,15.27C21.78,15.05 21.73,14.78 21.54,14.63L19.43,12.97Z" /></svg>
          </button>
        </div>
      </header>

      {/* Main Grid Layout */}
      <main className="dashboard-grid">
        
        {/* Row 1: KPI Stats Summary */}
        <section className="stats-row">
          <div className="stat-card">
            <div className="stat-icon-wrapper blue">
              <svg viewBox="0 0 24 24" width="24" height="24"><path fill="currentColor" d="M21,19V20H3V19L5,17V11C5,7.9 7.03,5.17 10,4.29C10.12,3 11.06,2 12.25,2C13.44,2 14.38,3 14.5,4.29C17.47,5.17 19.5,7.9 19.5,11V17L21,19M12,22A2,2 0 0,0 14,20H10A2,2 0 0,0 12,22Z" /></svg>
            </div>
            <div className="stat-info">
              <h3>All Received</h3>
              <p className="stat-number">{countStats.total}</p>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon-wrapper violet">
              <svg viewBox="0 0 24 24" width="24" height="24"><path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12S6.48 22 12 22 22 17.52 22 12 17.52 2 12 2M11 6H13V10H17V12H13V16H11V12H7V10H11V6Z" /></svg>
            </div>
            <div className="stat-info">
              <h3>Placements</h3>
              <p className="stat-number text-violet">{countStats.placement}</p>
            </div>
            <span className="category-weight-label">Weight: 3</span>
          </div>

          <div className="stat-card">
            <div className="stat-icon-wrapper emerald">
              <svg viewBox="0 0 24 24" width="24" height="24"><path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12S6.48 22 12 22 22 17.52 22 12 17.52 2 12 2M10 17L5 12L6.41 10.59L10 14.17L17.59 6.58L19 8L10 17Z" /></svg>
            </div>
            <div className="stat-info">
              <h3>Results</h3>
              <p className="stat-number text-emerald">{countStats.result}</p>
            </div>
            <span className="category-weight-label">Weight: 2</span>
          </div>

          <div className="stat-card">
            <div className="stat-icon-wrapper amber">
              <svg viewBox="0 0 24 24" width="24" height="24"><path fill="currentColor" d="M19,19H5V8H19M19,3H18V1H16V3H8V1H6V3H5C3.89,3 3,3.9 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5A2,2 0 0,0 19,3Z" /></svg>
            </div>
            <div className="stat-info">
              <h3>Events</h3>
              <p className="stat-number text-amber">{countStats.event}</p>
            </div>
            <span className="category-weight-label">Weight: 1</span>
          </div>
        </section>

        {/* Row 2: Queue Controls & Heap Array Debug Visualizer */}
        <section className="controls-heap-section">
          <div className="control-panel-card">
            <h2>Priority Inbox Controls</h2>
            <p className="subtitle">Configure bounds and simulation stream parameters</p>
            
            <div className="input-group">
              <label htmlFor="heap-size-select">Priority Inbox Size (N)</label>
              <div className="size-selector-row">
                {[5, 10, 15, 20].map((size) => (
                  <button 
                    key={size} 
                    className={`btn-size-choice ${heapSize === size ? 'active' : ''}`}
                    onClick={() => setHeapSize(size)}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            <div className="simulation-actions">
              <button className="btn-action-primary" onClick={triggerSimulation}>
                <svg viewBox="0 0 24 24" width="16" height="16" style={{marginRight: '6px'}}><path fill="currentColor" d="M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z" /></svg>
                Simulate Single Item
              </button>
              
              <button 
                className={`btn-action-outline ${autoSimulate ? 'active-simulating' : ''}`}
                onClick={() => setAutoSimulate(!autoSimulate)}
              >
                {autoSimulate ? (
                  <>
                    <span className="sim-spinner"></span>
                    Stop Streaming
                  </>
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" width="16" height="16" style={{marginRight: '6px'}}><path fill="currentColor" d="M8,5.14V19.14L19,12.14L8,5.14Z" /></svg>
                    Simulate Stream (3s)
                  </>
                )}
              </button>
            </div>

            <div className="live-api-toggle-row">
              <div className="toggle-label-column">
                <span className="toggle-heading">Live API Mode</span>
                <span className="toggle-subheading">Fetch real-time data from protected endpoint</span>
              </div>
              <button 
                className={`api-toggle-switch ${isLiveMode ? 'on' : 'off'} ${!isAuthenticated ? 'disabled' : ''}`}
                disabled={!isAuthenticated}
                onClick={() => setIsLiveMode(!isLiveMode)}
                title={!isAuthenticated ? 'Configure credentials first' : 'Toggle live fetching'}
              >
                <div className="switch-nob"></div>
              </button>
            </div>

            {apiError && <div className="api-error-alert">{apiError}</div>}

            <div className="utility-buttons">
              <button className="btn-clear-history" onClick={clearHistory}>Clear Notification History</button>
            </div>
          </div>

          {/* Min-Heap Raw Memory Visualizer */}
          <div className="heap-visualizer-card">
            <div className="heap-visualizer-header">
              <h2>Heap Memory Layout</h2>
              <span className="heap-complexity-badge">O(1) Root / O(log N) Insert</span>
            </div>
            <p className="subtitle">Visualizes raw array layout of the binary min-heap stored in memory</p>
            
            {heapArrayState.length === 0 ? (
              <div className="empty-heap-state">
                <p>Heap is currently empty. Simulating notifications will construct the heap tree.</p>
              </div>
            ) : (
              <div className="heap-node-tree">
                <div className="heap-node-array-track">
                  {heapArrayState.map((node, index) => {
                    const typeClass = node.Type?.toLowerCase() || '';
                    const isNewest = node.ID === lastNotificationId;
                    const isRoot = index === 0;
                    return (
                      <div 
                        key={node.ID} 
                        className={`heap-array-element ${typeClass} ${isNewest ? 'pulse-highlight' : ''} ${isRoot ? 'heap-root' : ''}`}
                        title={`[Index ${index}] ${node.Type}: ${node.Message} (${node.Timestamp})`}
                      >
                        <span className="heap-node-index">{index}</span>
                        <span className="heap-node-abbrev">{node.Type[0]}</span>
                        <span className="heap-node-weight">{getWeight(node.Type)}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="heap-legend">
                  <div className="legend-item"><span className="legend-dot root"></span> Root (Weakest Top-N item)</div>
                  <div className="legend-item"><span className="legend-dot placement"></span> Placement</div>
                  <div className="legend-item"><span className="legend-dot result"></span> Result</div>
                  <div className="legend-item"><span className="legend-dot event"></span> Event</div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Row 3: Priority Inbox VS Chronological Feed */}
        <section className="inboxes-columns-section">
          
          {/* Column A: Priority Inbox (Top N) */}
          <div className="inbox-column priority-inbox-column">
            <div className="column-header">
              <div className="badge-header-row">
                <h2>Priority Inbox</h2>
                <span className="badge-count text-violet">Top {heapSize}</span>
              </div>
              <p className="subtitle">Highest weighted (Placement &gt; Result &gt; Event) &amp; most recent items</p>
            </div>

            <div className="notifications-list">
              {priorityNotifications.length === 0 ? (
                <div className="empty-list-placeholder">
                  <p>No priority items found</p>
                </div>
              ) : (
                priorityNotifications.map((notif, index) => {
                  const typeLower = notif.Type?.toLowerCase() || '';
                  const isNew = notif.ID === lastNotificationId;
                  const rank = index + 1;
                  return (
                    <div 
                      key={notif.ID} 
                      className={`notification-item-card ${typeLower} ${isNew ? 'slide-new' : ''}`}
                    >
                      <div className="item-rank-badge">{rank}</div>
                      <div className="item-content">
                        <div className="item-meta">
                          <span className={`category-badge ${typeLower}`}>{notif.Type}</span>
                          <span className="item-time">{notif.Timestamp}</span>
                        </div>
                        <p className="item-message">{notif.Message}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Column B: Chronological Feed (All Notifications) */}
          <div className="inbox-column chronological-column">
            <div className="column-header">
              <div className="badge-header-row">
                <h2>All Activity Stream</h2>
                <span className="badge-count text-grey">{notifications.length}</span>
              </div>
              <p className="subtitle">Raw incoming feed in chronological order of arrival</p>
            </div>

            <div className="notifications-list">
              {notifications.length === 0 ? (
                <div className="empty-list-placeholder">
                  <p>Awaiting incoming stream...</p>
                </div>
              ) : (
                notifications.map((notif) => {
                  const typeLower = notif.Type?.toLowerCase() || '';
                  const isInPriority = priorityNotifications.some(p => p.ID === notif.ID);
                  return (
                    <div 
                      key={notif.ID} 
                      className={`notification-item-card chron-item ${typeLower} ${!isInPriority ? 'not-in-priority' : ''}`}
                    >
                      <div className="item-content">
                        <div className="item-meta">
                          <span className={`category-badge ${typeLower}`}>{notif.Type}</span>
                          <span className="item-time">{notif.Timestamp}</span>
                          {isInPriority && <span className="priority-indicator-pill">In Priority Inbox</span>}
                        </div>
                        <p className="item-message">{notif.Message}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </section>
      </main>

      {/* Modal: Credentials Configuration */}
      {showConfigModal && (
        <div className="modal-backdrop">
          <div className="modal-content-card">
            <div className="modal-header">
              <h2>API Credentials Setup</h2>
              <button className="btn-close-modal" onClick={() => setShowConfigModal(false)}>&times;</button>
            </div>
            
            <form onSubmit={handleAuth} className="config-form">
              <div className="form-group">
                <label>Access Code (6 characters)*</label>
                <input 
                  type="text" 
                  value={config.accessCode}
                  maxLength={6}
                  required
                  onChange={e => setConfig(prev => ({...prev, accessCode: e.target.value}))}
                  placeholder="e.g. BAVDSh" 
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Full Name</label>
                  <input 
                    type="text" 
                    value={config.name}
                    onChange={e => setConfig(prev => ({...prev, name: e.target.value}))}
                  />
                </div>
                <div className="form-group">
                  <label>Roll Number (User ID)</label>
                  <input 
                    type="text" 
                    value={config.rollNo}
                    onChange={e => setConfig(prev => ({...prev, rollNo: e.target.value}))}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Registered Email</label>
                <input 
                  type="email" 
                  value={config.email}
                  onChange={e => setConfig(prev => ({...prev, email: e.target.value}))}
                />
              </div>

              <div className="form-group">
                <label>Client ID</label>
                <input 
                  type="text" 
                  value={config.clientID}
                  onChange={e => setConfig(prev => ({...prev, clientID: e.target.value}))}
                />
              </div>

              <div className="form-group">
                <label>Client Secret</label>
                <input 
                  type="password" 
                  value={config.clientSecret}
                  onChange={e => setConfig(prev => ({...prev, clientSecret: e.target.value}))}
                />
              </div>

              {authError && <div className="auth-error-alert">{authError}</div>}

              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowConfigModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={authLoading}>
                  {authLoading ? 'Connecting...' : 'Save & Authenticate'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
