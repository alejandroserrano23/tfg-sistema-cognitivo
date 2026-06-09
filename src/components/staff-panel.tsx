"use client";

import React, { useState } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import type { DifficultyLevel, PatientProfile } from "./dashboard-client";
import { getDailyIndex, proverbiosDelAno } from "@/data/daily-pool";

interface StaffPanelProps {
  onStartSession: (diff: DifficultyLevel) => void;
  patientName: string;
  theme: "light" | "sepia";
  onToggleTheme: () => void;
  onAddPatient: (p: PatientProfile) => void;
  patients: PatientProfile[];
  onSelectPatient: (id: string) => void;
  activePatientId: string;
}

export function StaffPanel({ 
  onStartSession, patientName, theme, onToggleTheme, onAddPatient, 
  patients, onSelectPatient, activePatientId 
}: StaffPanelProps) {
  const [showEasyMenu, setShowEasyMenu] = useState(false);
  const [showCaregiverPortal, setShowCaregiverPortal] = useState(false);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Formulario nuevo paciente
  const [newName, setNewName] = useState("");
  const [newLevel, setNewLevel] = useState<"leve" | "moderado" | "grave">("leve");

  const dailyIndex = getDailyIndex();
  const mensajeHoy = proverbiosDelAno[dailyIndex];

  const handleTTS = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(mensajeHoy);
      utterance.lang = 'es-ES';
      utterance.rate = 0.8; 
      window.speechSynthesis.speak(utterance);
    }
  };

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === "1234") {
      setIsAuthenticated(true);
      setPinError(false);
      setPin("");
    } else {
      setPinError(true);
      setPin("");
    }
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const newPatient: PatientProfile = {
      id: `p_${Date.now()}`,
      nombre: newName.trim(),
      nivel_deterioro: newLevel,
      historial: []
    };

    onAddPatient(newPatient);
    setShowCaregiverPortal(false);
    setIsAuthenticated(false);
    setNewName("");
  };

  const renderMetrics = (p: PatientProfile) => {
    const total = p.historial.length;
    if (total === 0) return <div className="mt-2 text-[10px] font-bold text-slate-500">Sin historial registrado.</div>;
    
    // Cálculo ESTRICTO de éxito según historial
    const success = p.historial.filter(h => h.completado === true).length;
    const rate = total > 0 ? Math.round((success / total) * 100) : 0;
    
    let eF = 0, eM = 0, eD = 0;
    p.historial.forEach(h => {
      if (h.bloque.startsWith('easy') || h.bloque === 'facil' || h.bloque.startsWith('bonus')) eF += h.errores;
      else if (h.bloque.startsWith('medium')) eM += h.errores;
      else if (h.bloque.startsWith('hard') || h.bloque.startsWith('sudoku')) eD += h.errores;
    });

    return (
      <div className="mt-2 p-2 bg-slate-100 border border-slate-300 text-[10px] leading-tight">
        <div className="flex justify-between font-black text-slate-700 mb-1 border-b border-slate-300 pb-1">
          <span>Totales: {total}</span>
          <span className={rate >= 70 ? 'text-emerald-600' : 'text-amber-600'}>Éxito: {rate}%</span>
        </div>
        <div className="flex justify-between text-slate-600 font-bold">
          <span>Err Fácil: {eF}</span>
          <span>Med: {eM}</span>
          <span>Dif: {eD}</span>
        </div>
      </div>
    );
  };

  if (showCaregiverPortal) {
    return (
      <div className="h-screen w-full flex items-center justify-center p-4 bg-zinc-100 overflow-y-auto">
        <Card className="w-full max-w-xl border-4 border-slate-900 rounded-none shadow-none my-auto">
          <CardHeader className="bg-slate-900 text-white pb-4 flex flex-row items-center justify-between">
            <CardTitle className="font-black text-xl sm:text-2xl">⚙️ Portal del Cuidador</CardTitle>
            <Button onClick={() => setShowCaregiverPortal(false)} className="bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-none shadow-none border-2 border-slate-500">Volver</Button>
          </CardHeader>
          <CardContent className="pt-6">
            {!isAuthenticated ? (
              <form onSubmit={handlePinSubmit} className="space-y-4 max-w-sm mx-auto">
                <p className="font-bold text-slate-700 text-center">Introduce el PIN de acceso</p>
                <input 
                  type="password" 
                  value={pin} 
                  onChange={(e) => setPin(e.target.value)}
                  className="w-full border-4 border-slate-900 p-4 text-center text-3xl font-black rounded-none"
                  autoFocus
                  maxLength={4}
                />
                {pinError && <p className="text-rose-600 font-bold text-center">PIN Incorrecto</p>}
                <Button type="submit" className="w-full rounded-none border-4 border-slate-900 bg-slate-900 hover:bg-slate-800 text-white font-black py-4 text-lg">ENTRAR</Button>
              </form>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                
                {/* Sección Izquierda: Añadir Paciente */}
                <form onSubmit={handleAddSubmit} className="space-y-4 border-r-0 md:border-r-4 border-slate-200 md:pr-6">
                  <h3 className="font-black text-lg text-slate-900 border-b-2 border-slate-900 pb-2">Añadir Nuevo Paciente</h3>
                  <div>
                    <label className="block font-black text-slate-900 text-sm mb-1">Nombre</label>
                    <input required value={newName} onChange={e => setNewName(e.target.value)} className="w-full border-2 border-slate-900 p-2 font-bold rounded-none text-sm" />
                  </div>
                  <div>
                    <label className="block font-black text-slate-900 text-sm mb-1">Nivel</label>
                    <select value={newLevel} onChange={e => setNewLevel(e.target.value as any)} className="w-full border-2 border-slate-900 p-2 font-bold rounded-none text-sm">
                      <option value="leve">Leve</option>
                      <option value="moderado">Moderado</option>
                      <option value="grave">Avanzado</option>
                    </select>
                  </div>
                  <Button type="submit" disabled={!newName.trim()} className="w-full rounded-none border-4 border-slate-900 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:border-slate-400 text-white font-black py-3">GUARDAR PACIENTE</Button>
                </form>

                {/* Sección Derecha: Pacientes Registrados */}
                <div className="space-y-4">
                  <h3 className="font-black text-lg text-slate-900 border-b-2 border-slate-900 pb-2">Pacientes Registrados</h3>
                  <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-2">
                    {patients.map(p => (
                      <div 
                        key={p.id} 
                        className={`p-3 border-2 cursor-pointer transition-colors ${
                          activePatientId === p.id ? 'border-blue-700 bg-blue-50' : 'border-slate-300 hover:bg-slate-50 bg-white'
                        }`}
                        onClick={() => onSelectPatient(p.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-black text-slate-900 text-sm">{p.nombre}</p>
                            <p className="text-xs font-bold text-slate-500 uppercase">{p.nivel_deterioro === 'grave' ? 'avanzado' : p.nivel_deterioro}</p>
                          </div>
                          {activePatientId === p.id && <span className="bg-blue-600 text-white text-[10px] font-black px-2 py-1 shrink-0">ACTIVO</span>}
                        </div>
                        
                        {/* MÉTRICAS EXPANDIBLES */}
                        {activePatientId === p.id && renderMetrics(p)}
                        
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={`h-screen max-h-screen overflow-hidden flex flex-col justify-between p-4 ${theme === "sepia" ? "bg-amber-50" : "bg-zinc-100"}`}>
      
      {/* CABECERA (15%) */}
      <div className="h-[15%] w-full max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-2 sm:gap-4 pb-2">
        <div className="flex flex-col items-start justify-center">
          <p className="text-sm font-bold text-slate-500 tracking-widest uppercase">Paciente Activo</p>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900">{patientName}</h1>
        </div>
        
        <Card className="flex-1 max-w-xl rounded-none border-4 border-slate-900 bg-white mx-4 flex items-center justify-between px-4 py-2">
          <div className="flex-1 text-center">
             <h2 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Mensaje de Hoy</h2>
             <p className="text-sm sm:text-base font-black text-slate-800 line-clamp-2">{mensajeHoy}</p>
          </div>
          <button 
             onClick={handleTTS} 
             className="ml-4 w-12 h-12 bg-blue-100 hover:bg-blue-200 border-2 border-blue-900 rounded-full flex items-center justify-center text-2xl shrink-0"
             aria-label="Leer en voz alta"
          >
             🔊
          </button>
        </Card>

        <div className="flex items-center gap-2">
          <Button 
            onClick={onToggleTheme} 
            className={`rounded-none border-4 border-slate-900 font-black px-4 py-3 shadow-none text-xs sm:text-sm ${theme === "sepia" ? "bg-amber-200 text-amber-900 hover:bg-amber-300" : "bg-white text-slate-900 hover:bg-slate-100"}`}
          >
            {theme === "sepia" ? "MODO CLARO" : "MODO SEPIA"}
          </Button>
          <Button 
            onClick={() => setShowCaregiverPortal(true)}
            className="rounded-none border-4 border-slate-900 font-black px-4 py-3 shadow-none text-xs sm:text-sm bg-slate-900 text-white hover:bg-slate-800"
          >
            ⚙️ PORTAL
          </Button>
        </div>
      </div>

      {/* CUERPO PRINCIPAL BENTO GRID (85%) */}
      <div className="h-[80%] w-full max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-4 pb-12">
        
        {/* Col 1: Bloque Fácil */}
        <Card className="rounded-none border-4 border-slate-900 border-t-8 border-t-teal-600 bg-white flex flex-col h-full">
          <CardHeader className="bg-teal-50 pb-2 border-b-4 border-slate-900 p-3">
            <CardTitle className="text-lg font-black text-teal-900 text-center">Bloque Fácil</CardTitle>
            <p className="text-xs sm:text-sm font-medium text-zinc-600 mt-0.5 text-center">Operaciones matemáticas rápidas</p>
          </CardHeader>
          <CardContent className="p-3 flex-1 flex flex-col justify-center">
            {!showEasyMenu ? (
              <Button onClick={() => setShowEasyMenu(true)} className="w-full bg-teal-700 hover:bg-teal-800 text-white py-1.5 px-4 text-xs sm:text-sm rounded-xl font-black tracking-wide border-2 border-slate-900 shadow-sm mx-auto max-w-[200px]">
                Jugar
              </Button>
            ) : (
              <div className="space-y-2 flex-1 flex flex-col justify-center">
                 <Button onClick={() => onStartSession("easy_add")} className="w-full flex-1 bg-teal-600 hover:bg-teal-700 text-white text-xs sm:text-sm py-1.5 px-4 rounded-xl border-2 border-slate-900 font-black shadow-sm">Sumas</Button>
                 <Button onClick={() => onStartSession("easy_sub")} className="w-full flex-1 bg-teal-600 hover:bg-teal-700 text-white text-xs sm:text-sm py-1.5 px-4 rounded-xl border-2 border-slate-900 font-black shadow-sm">Restas</Button>
                 <Button onClick={() => onStartSession("easy_mul")} className="w-full flex-1 bg-teal-600 hover:bg-teal-700 text-white text-xs sm:text-sm py-1.5 px-4 rounded-xl border-2 border-slate-900 font-black shadow-sm">Multiplicaciones</Button>
                 <Button onClick={() => onStartSession("easy_div")} className="w-full flex-1 bg-teal-600 hover:bg-teal-700 text-white text-xs sm:text-sm py-1.5 px-4 rounded-xl border-2 border-slate-900 font-black shadow-sm">Divisiones</Button>
                 <Button onClick={() => onStartSession("easy_mix")} className="w-full flex-1 bg-teal-800 hover:bg-teal-900 text-white text-xs sm:text-sm py-1.5 px-4 rounded-xl border-2 border-slate-900 font-black shadow-sm">Mezclado</Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Col 2: Bloque Medio */}
        <Card className="rounded-none border-4 border-slate-900 border-t-8 border-t-indigo-600 bg-white flex flex-col h-full">
          <CardHeader className="bg-indigo-50 pb-2 border-b-4 border-slate-900 p-3">
            <CardTitle className="text-lg font-black text-indigo-900 text-center">Bloque Medio</CardTitle>
            <p className="text-xs sm:text-sm font-medium text-zinc-600 mt-0.5 text-center">Sopas de letras y números</p>
          </CardHeader>
          <CardContent className="p-3 flex-1 flex flex-col space-y-2 justify-center items-center">
            <Button onClick={() => onStartSession("medium_letters")} className="w-full bg-indigo-700 hover:bg-indigo-800 text-white py-1.5 px-4 text-xs sm:text-sm rounded-xl font-black tracking-wide border-2 border-slate-900 shadow-sm max-w-[200px]">
              Jugar Letras
            </Button>
            <Button onClick={() => onStartSession("medium_numbers")} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-1.5 px-4 text-xs sm:text-sm rounded-xl font-black tracking-wide border-2 border-slate-900 shadow-sm max-w-[200px]">
              Jugar Números
            </Button>
          </CardContent>
        </Card>

        {/* Col 3: Bloque Avanzado */}
        <Card className="rounded-none border-4 border-slate-900 border-t-8 border-t-rose-600 bg-white flex flex-col h-full">
          <CardHeader className="bg-rose-50 pb-2 border-b-4 border-slate-900 p-3">
            <CardTitle className="text-lg font-black text-rose-900 text-center">Bloque Avanzado</CardTitle>
            <p className="text-xs sm:text-sm font-medium text-zinc-600 mt-0.5 text-center">Sudokus de lógica y memoria</p>
          </CardHeader>
          <CardContent className="p-3 flex-1 flex flex-col space-y-2 justify-center items-center">
            <Button onClick={() => onStartSession("hard_7x7")} className="w-full bg-rose-600 hover:bg-rose-700 text-white py-1.5 px-4 text-xs sm:text-sm rounded-xl font-black tracking-wide border-2 border-slate-900 shadow-sm max-w-[200px]">
              Sudoku 7x7
            </Button>
            <Button onClick={() => onStartSession("hard_8x8")} className="w-full bg-rose-700 hover:bg-rose-800 text-white py-1.5 px-4 text-xs sm:text-sm rounded-xl font-black tracking-wide border-2 border-slate-900 shadow-sm max-w-[200px]">
              Sudoku 8x8
            </Button>
            <Button onClick={() => onStartSession("hard_9x9")} className="w-full bg-rose-800 hover:bg-rose-900 text-white py-1.5 px-4 text-xs sm:text-sm rounded-xl font-black tracking-wide border-2 border-slate-900 shadow-sm max-w-[200px]">
              Sudoku 9x9
            </Button>
          </CardContent>
        </Card>

        {/* Col 4: Bloque Bonus (Vertical completo) */}
        <div className="flex flex-col gap-4 h-full justify-between">
          <Card className="rounded-none border-4 border-slate-900 border-t-8 border-t-amber-500 bg-white flex flex-col h-1/2">
            <CardContent className="p-4 flex-1 flex flex-col items-center justify-center text-center gap-2">
              <div>
                <h2 className="text-xl font-black text-slate-900">⭐ Palabra diaria</h2>
                <p className="text-xs font-bold text-slate-600 mt-1">Adivina la palabra de hoy</p>
              </div>
              <div className="w-16 h-16 bg-amber-100 border-4 border-slate-900 flex items-center justify-center text-2xl mb-2">
                 W
              </div>
              <Button onClick={() => onStartSession("bonus_wordle")} className="w-full bg-slate-900 hover:bg-slate-800 text-white py-1.5 px-4 text-xs sm:text-sm rounded-xl font-black tracking-wide border-2 border-slate-900 shadow-sm mt-auto max-w-[200px]">
                Jugar
              </Button>
            </CardContent>
          </Card>

          <Card className="rounded-none border-4 border-slate-900 border-t-8 border-t-cyan-500 bg-white flex flex-col h-1/2">
            <CardContent className="p-4 flex-1 flex flex-col items-center justify-center text-center gap-2">
              <div>
                <h2 className="text-xl font-black text-slate-900">🧩 Completar palabras</h2>
                <p className="text-xs font-bold text-slate-600 mt-1">Rellena los huecos de la palabra oculta</p>
              </div>
              <div className="w-16 h-16 bg-cyan-100 border-4 border-slate-900 flex items-center justify-center text-2xl mb-2 font-black">
                 A_C
              </div>
              <Button onClick={() => onStartSession("completar_palabras")} className="w-full bg-cyan-600 hover:bg-cyan-700 text-white py-1.5 px-4 text-xs sm:text-sm rounded-xl font-black tracking-wide border-2 border-slate-900 shadow-sm mt-auto max-w-[200px]">
                Jugar
              </Button>
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}
