import Fretboard from './Fretboard'

function App() {
  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <header style={{ marginBottom: '40px', textAlign: 'center' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: '800', marginBottom: '10px', background: 'linear-gradient(to right, #2dd4bf, #3b82f6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Fretboard Magic
        </h1>
        <p style={{ color: '#94a3b8', fontSize: '1.1rem' }}>
          Unlock Pandora's Box of Fretboard-Training. Choose a game and master the neck. Or just play the guitar and have fun with the fretboard.
        </p>
      </header>

      <Fretboard />

      <footer style={{ marginTop: '60px', color: '#475569', fontSize: '0.9rem' }}>
        Magical Music Tools v1.0 created by Tomas Coox / Studio Joox AB
      </footer>
    </div>
  )
}

export default App
