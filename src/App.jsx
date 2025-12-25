import Fretboard from './Fretboard'

function App() {
  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '80px' }}>
      <header style={{ marginBottom: '10px', textAlign: 'center', padding: '0 40px', maxWidth: '800px', margin: '0 auto 10px auto' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: '800', marginBottom: '10px', background: 'linear-gradient(to right, #2dd4bf, #3b82f6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Guitar Tools
        </h1>

      </header>

      <Fretboard />

      <footer style={{ marginTop: '60px', color: '#475569', fontSize: '0.9rem' }}>
        Tomas Music Tools v1.0 created by Tomas Coox / Studio Joox AB
      </footer>
    </div>
  )
}

export default App
