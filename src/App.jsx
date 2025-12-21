import Fretboard from './Fretboard'

function App() {
  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <header style={{ marginBottom: '40px', textAlign: 'center' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: '800', marginBottom: '10px', background: 'linear-gradient(to right, #2dd4bf, #3b82f6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Fretboard Magic
        </h1>
        <p style={{ color: '#94a3b8', fontSize: '1.1rem' }}>
          Explore the fretboard. Click any note to reveal it.
        </p>
      </header>

      <Fretboard />

      <footer style={{ marginTop: '60px', color: '#475569', fontSize: '0.9rem' }}>
        Antigravity Fretboard v1.0
      </footer>
    </div>
  )
}

export default App
