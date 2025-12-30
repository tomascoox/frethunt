import React, { useState, useEffect } from 'react';
import Fretboard from './Fretboard';
import Layout from './Layout';

function App() {
  // --- LIFTED STATE ---
  const [activeGameMode, setActiveGameMode] = useState(null); // 'triads', 'string-walker', 'memory', etc.
  const [showMenu, setShowMenu] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Persisted Settings
  const [proMode, setProMode] = useState(() => localStorage.getItem('fretboardProMode') === 'true');
  useEffect(() => { localStorage.setItem('fretboardProMode', proMode); }, [proMode]);

  const [fretCount, setFretCount] = useState(13);

  // Global XP
  const [totalXP, setTotalXP] = useState(() => parseInt(localStorage.getItem('fretboardXP') || '0'));
  useEffect(() => { localStorage.setItem('fretboardXP', totalXP); }, [totalXP]);

  // Global Accidental Mode ('sharp' | 'flat')
  const [accidentalMode, setAccidentalMode] = useState(() => localStorage.getItem('fretboardAccidentalMode') || 'sharp');
  useEffect(() => { localStorage.setItem('fretboardAccidentalMode', accidentalMode); }, [accidentalMode]);

  return (
    <Layout
      activeGameMode={activeGameMode}
      setActiveGameMode={setActiveGameMode}
      showMenu={showMenu}
      setShowMenu={setShowMenu}
      showSettings={showSettings}
      setShowSettings={setShowSettings}
      proMode={proMode}
      setProMode={setProMode}
      fretCount={fretCount}
      setFretCount={setFretCount}
      totalXP={totalXP}
      setTotalXP={setTotalXP}
      accidentalMode={accidentalMode}
      setAccidentalMode={setAccidentalMode}
    >
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '0' }}>
        <Fretboard
          // Passed down props
          activeGameMode={activeGameMode}
          setActiveGameMode={setActiveGameMode}
          proMode={proMode}
          fretCount={fretCount}
          totalXP={totalXP}
          setTotalXP={setTotalXP}
          accidentalMode={accidentalMode}
        />
      </div>
    </Layout>
  )
}

export default App
