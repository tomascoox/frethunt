import Fretboard from './Fretboard'

function App() {
  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '0' }}>

      <Fretboard />

      <footer style={{ marginTop: '60px', color: '#475569', fontSize: '0.9rem', textAlign: 'center', padding: '0 20px', width: '100%', boxSizing: 'border-box' }}>
        Tomas Music Tools v1.0 created by Tomas Coox / Studio Joox AB
      </footer>
    </div>
  )
}

export default App
