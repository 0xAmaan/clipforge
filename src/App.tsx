import { useState } from 'react';
import './index.css';

function App() {
  const [message, setMessage] = useState('ClipForge Video Editor');

  return (
    <div style={{ padding: '20px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <h1 style={{ color: '#3b82f6' }}>{message}</h1>
      <p>Ready to build a video editor! 🎬</p>
      <button
        onClick={() => setMessage('React is working!')}
        style={{
          padding: '10px 20px',
          fontSize: '16px',
          backgroundColor: '#3b82f6',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
        }}
      >
        Test React
      </button>
    </div>
  );
}

export default App;
