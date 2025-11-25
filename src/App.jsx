import { useState } from 'react';
import EntropyVisualization from './components/EntropyVisualization';
import Paper from './components/Paper';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState('visualization');
  const [t, setT] = useState(0);

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
          <EntropyVisualization t={t} setT={setT} />
        ) : (
          <Paper />
        )}
      </main>
    </div>
  );
}

export default App;
