import { useState } from 'react';
import EntropyVisualization from './components/EntropyVisualization';
import CPUVisualization from './components/CPUVisualization';
import CausalHorizonVisualization from './components/CausalHorizonVisualization';
import BranchingSimulation from './components/BranchingSimulation';
import Paper from './components/Paper';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState('entropy');
  const [t, setT] = useState(0);

  return (
    <div className="app">
      <header className="header">
        <h1>Time as Entropy Conversion</h1>
        <nav className="nav">
          <button
            className={`nav-btn ${activeTab === 'entropy' ? 'active' : ''}`}
            onClick={() => setActiveTab('entropy')}
          >
            Entropy
          </button>
          <button
            className={`nav-btn ${activeTab === 'horizons' ? 'active' : ''}`}
            onClick={() => setActiveTab('horizons')}
          >
            Causal Horizons
          </button>
          <button
            className={`nav-btn ${activeTab === 'cpu' ? 'active' : ''}`}
            onClick={() => setActiveTab('cpu')}
          >
            CPU
          </button>
          <button
            className={`nav-btn ${activeTab === 'simulation' ? 'active' : ''}`}
            onClick={() => setActiveTab('simulation')}
          >
            Simulation
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
        {activeTab === 'entropy' && (
          <div className="viz-panel full-panel">
            <EntropyVisualization t={t} setT={setT} />
          </div>
        )}
        {activeTab === 'horizons' && (
          <div className="viz-panel full-panel horizon-panel">
            <CausalHorizonVisualization t={t} setT={setT} />
          </div>
        )}
        {activeTab === 'cpu' && (
          <div className="viz-panel full-panel cpu-panel">
            <CPUVisualization t={t} setT={setT} />
          </div>
        )}
        {activeTab === 'simulation' && (
          <div className="viz-panel full-panel">
            <BranchingSimulation />
          </div>
        )}
        {activeTab === 'paper' && <Paper />}
      </main>
    </div>
  );
}

export default App;
