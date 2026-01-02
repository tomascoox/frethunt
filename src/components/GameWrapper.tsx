'use client';
import React, { useState, useEffect } from 'react';
import Fretboard from './Fretboard';
import Layout from './Layout';
import { GameMode, AccidentalMode } from '../types';

interface GameWrapperProps {
  initialNotes?: string[];
  initialStrings?: number[];
  initialPositions?: string[];
  disablePersistence?: boolean;
  toolMetadata?: { slug: string; title: string; description: string };
  startInEditMode?: boolean;
}

function GameWrapper({ initialNotes, initialStrings, initialPositions, disablePersistence, toolMetadata, startInEditMode }: GameWrapperProps) {
  // --- LIFTED STATE ---
  const [activeGameMode, setActiveGameMode] = useState<GameMode>('memory'); // Default to Note Hunt
  const [showSettings, setShowSettings] = useState(false);

  // Persisted Settings (Initialize with defaults to avoid SSR crash)
  const [proMode, setProMode] = useState(false);
  const [fretCount, setFretCount] = useState(13);

  // Global XP
  const [totalXP, setTotalXP] = useState(0);

  // Global Accidental Mode ('sharp' | 'flat')
  const [accidentalMode, setAccidentalMode] = useState<AccidentalMode>('sharp');

  // Hydrate from localStorage on client mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedPro = localStorage.getItem('fretboardProMode') === 'true';
      setProMode(savedPro);

      const savedXP = parseInt(localStorage.getItem('fretboardXP') || '0');
      setTotalXP(savedXP);

      const savedAccidental = (localStorage.getItem('fretboardAccidentalMode') as AccidentalMode) || 'sharp';
      setAccidentalMode(savedAccidental);
    }
  }, []);

  // Save changes
  useEffect(() => { if (typeof window !== 'undefined') localStorage.setItem('fretboardProMode', String(proMode)); }, [proMode]);
  useEffect(() => { if (typeof window !== 'undefined') localStorage.setItem('fretboardXP', String(totalXP)); }, [totalXP]);
  useEffect(() => { if (typeof window !== 'undefined') localStorage.setItem('fretboardAccidentalMode', accidentalMode); }, [accidentalMode]);

  return (
    <Layout
      activeGameMode={activeGameMode}
      setActiveGameMode={setActiveGameMode}

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
      pageTitle={toolMetadata?.title}
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
          initialNotes={initialNotes}
          initialStrings={initialStrings}
          initialPositions={initialPositions} // Passed down
          disablePersistence={disablePersistence}
          toolMetadata={toolMetadata}
          startInEditMode={startInEditMode}
        />
      </div>
    </Layout>
  )
}

export default GameWrapper;
