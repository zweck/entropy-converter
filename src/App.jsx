import { useState } from 'react';
import EntropyVisualization from './components/EntropyVisualization';
import CPUVisualization from './components/CPUVisualization';
import Paper from './components/Paper';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState('visualization');
  const [t, setT] = useState(0);
  const [showCPU, setShowCPU] = useState(true);

  return (
    <div className="app">
      <header className="header">
        <h1>Time as Entropy Conversion</h1>
        <nav className="nav">
          <button
            className={`nav-btn ${activeTab === 'visualization' ? 'active' : ''}`}
            onClick={() => setActiveTab('visualization')}
          >
            Visualization
          </button>
          <button
            className={`nav-btn ${activeTab === 'paper' ? 'active' : ''}`}
            onClick={() => setActiveTab('paper')}
          >
            Paper
          </button>
        </nav>
      </header>

      <main className="main">
        {activeTab === 'visualization' ? (
          <div className={`visualization-split ${showCPU ? 'dual' : 'single'}`}>
            <div className="viz-panel universe-panel">
              <div className="panel-label">Universe</div>
              <EntropyVisualization t={t} setT={setT} />
            </div>
            {showCPU && (
              <div className="viz-panel cpu-panel">
                <div className="panel-label">CPU</div>
                <CPUVisualization t={t} />
              </div>
            )}
            <button
              className="toggle-cpu-btn"
              onClick={() => setShowCPU(!showCPU)}
            >
              {showCPU ? 'Hide CPU' : 'Show CPU'}
            </button>
          </div>
        ) : (
          <Paper />
        )}
      </main>
    </div>
  );
}

export default App;
