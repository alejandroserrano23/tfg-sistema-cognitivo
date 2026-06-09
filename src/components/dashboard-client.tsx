"use client";

import React, { useState, useEffect } from "react";
import { PatientView } from "./patient-view";
import { StaffPanel } from "./staff-panel";

export type DifficultyLevel = "easy_add" | "easy_sub" | "easy_mul" | "easy_div" | "easy_mix" | "medium_letters" | "medium_numbers" | "hard_7x7" | "hard_8x8" | "hard_9x9" | "bonus_wordle" | "completar_palabras";

export interface HistorialEntry {
  id: string;
  fecha: string;
  bloque: string;
  completado: boolean;
  errores: number;
}

export interface PatientProfile {
  id: string;
  nombre: string;
  nivel_deterioro: "leve" | "moderado" | "grave";
  historial: HistorialEntry[];
}

const initialPatients: PatientProfile[] = [
  {
    id: "p_001",
    nombre: "Mario Lopez",
    nivel_deterioro: "moderado",
    historial: []
  }
];

export function DashboardClient() {
  const [activeView, setActiveView] = useState<"patient" | "staff">("staff");
  const [difficulty, setDifficulty] = useState<DifficultyLevel>("easy_mix");
  
  // Global State
  const [patients, setPatients] = useState<PatientProfile[]>(initialPatients);
  const [activePatientId, setActivePatientId] = useState<string>("p_001");
  const [theme, setTheme] = useState<"light" | "sepia">("light");

  useEffect(() => {
    const saved = localStorage.getItem("tfg_pacientes_data");
    const savedActiveId = localStorage.getItem("tfg_active_patient");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.length > 0) {
          // Migración para usuarios antiguos (si los hay) al nuevo formato
          const migrated = parsed.map((p: any) => ({
            ...p,
            historial: p.historial || []
          }));
          setPatients(migrated);
          if (savedActiveId && migrated.some((p: any) => p.id === savedActiveId)) {
            setActivePatientId(savedActiveId);
          } else {
            setActivePatientId(migrated[0].id);
          }
        }
      } catch (e) {
        console.error("Error parsing local patients", e);
      }
    }
  }, []);

  const activePatient = patients.find(p => p.id === activePatientId) || patients[0];

  const handleStartSession = (selectedDifficulty: DifficultyLevel) => {
    setDifficulty(selectedDifficulty);
    setActiveView("patient");
  };

  const handleEndSession = () => {
    setActiveView("staff");
  };

  const syncStateToStorage = (newPatients: PatientProfile[], activeId: string) => {
    localStorage.setItem("tfg_pacientes_data", JSON.stringify(newPatients));
    localStorage.setItem("tfg_active_patient", activeId);
  };

  const handleAddPatient = (newPatient: PatientProfile) => {
    setPatients(prev => {
      const updated = [...prev, newPatient];
      syncStateToStorage(updated, newPatient.id);
      return updated;
    });
    setActivePatientId(newPatient.id);
  };

  const handleSelectPatient = (id: string) => {
    setActivePatientId(id);
    syncStateToStorage(patients, id);
  };

  const handleRecordResult = (bloque: string, completado: boolean, errores: number) => {
    setPatients(prev => {
      const updated = prev.map(p => {
        if (p.id === activePatientId) {
          return {
            ...p,
            historial: [
              ...p.historial,
              {
                id: `h_${Date.now()}`,
                fecha: new Date().toISOString(),
                bloque,
                completado,
                errores
              }
            ]
          };
        }
        return p;
      });
      syncStateToStorage(updated, activePatientId);
      return updated;
    });
  };

  const handleToggleTheme = () => {
    setTheme(prev => prev === "light" ? "sepia" : "light");
  };

  return (
    <div className={`min-h-screen max-h-screen overflow-hidden transition-colors duration-500 ${theme === "sepia" ? "bg-amber-50" : "bg-zinc-100"}`}>
      {activeView === "staff" ? (
        <StaffPanel 
          onStartSession={handleStartSession}
          patientName={activePatient.nombre}
          theme={theme}
          onToggleTheme={handleToggleTheme}
          onAddPatient={handleAddPatient}
          patients={patients}
          onSelectPatient={handleSelectPatient}
          activePatientId={activePatientId}
        />
      ) : (
        <PatientView 
          difficulty={difficulty}
          onEndSession={handleEndSession}
          patientData={activePatient}
          theme={theme}
          onRecordResult={handleRecordResult}
        />
      )}
    </div>
  );
}
