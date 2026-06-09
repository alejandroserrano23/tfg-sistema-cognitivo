"use client";

/*
 * NOTA DE ALCANCE: Para futuras iteraciones de la plataforma, se propone la implementación 
 * de Crucigramas Diarios Dinámicos. En la fase actual del TFG, el enfoque se prioriza en la 
 * accesibilidad de las Sopas Procedimentales y la lógica de Wordle por su alta efectividad 
 * en la estimulación de la discriminación visual y semántica.
 */

import React, { useState, useEffect, useRef } from "react";
import { Button } from "./ui/button";
import type { DifficultyLevel, PatientProfile } from "./dashboard-client";
import { evaluateEasyOperation, getMediumBlockData, evaluateMediumTargetFound, getSudokuHint } from "@/ai/flows/actions";
import { generateEasyOperation, generateSearchGrid, type EasyOperation, type SearchGridData, generateLatinSquare, type LatinSquareData, type EasyMode, CLINICAL_WORD_POOL, generateCompletarPalabras, type CompletarData } from "@/lib/qol-calculator";
import { getDailyIndex, palabrasWordleDelAno } from "@/data/daily-pool";

interface PatientViewProps {
  difficulty: DifficultyLevel;
  onEndSession: () => void;
  patientData: PatientProfile;
  theme: "light" | "sepia";
  onRecordResult: (bloque: string, completado: boolean, errores: number) => void;
}

export function PatientView({ difficulty, onEndSession, patientData, theme, onRecordResult }: PatientViewProps) {
  const pacienteNombre = patientData.nombre || "Pedro";
  const [aiMessage, setAiMessage] = useState<string>(`¡Hola ${pacienteNombre}! Vamos a jugar.`);
  const [loading, setLoading] = useState<boolean>(false);
  const [refreshKey, setRefreshKey] = useState<number>(0);

  // === ESTADO: BLOQUE FÁCIL ===
  const [operation, setOperation] = useState<EasyOperation | null>(null);
  const [options, setOptions] = useState<number[]>([]);
  const [startTime, setStartTime] = useState<number>(0);
  const [easyFeedback, setEasyFeedback] = useState<{ value: number, status: 'success'|'error' } | null>(null);
  const [clickedAnswerIndex, setClickedAnswerIndex] = useState<number | null>(null);
  const [mathErrors, setMathErrors] = useState<number>(0);

  // === ESTADO: BLOQUE MEDIO ===
  const [selectedCell, setSelectedCell] = useState<{r: number, c: number} | null>(null);
  const [foundCells, setFoundCells] = useState<{r: number, c: number}[]>([]);
  const [foundTargets, setFoundTargets] = useState<string[]>([]);
  const [errorCells, setErrorCells] = useState<{r: number, c: number}[]>([]);

  // === ESTADO: BLOQUE DIFÍCIL ===
  const [currentGrid, setCurrentGrid] = useState<(number | null)[][]>([]);
  const [intentosRestantes, setIntentosRestantes] = useState<number>(3);
  const [showValidation, setShowValidation] = useState<boolean>(false);
  const [emptyCellsDetected, setEmptyCellsDetected] = useState<boolean>(false);
  const [sudokuBlocked, setSudokuBlocked] = useState<boolean>(false);
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const activeTimeouts = useRef<NodeJS.Timeout[]>([]);
  const previousTargetsRef = useRef<string[]>([]);

  const safeSetTimeout = (cb: () => void, ms: number) => {
    const id = setTimeout(() => {
      cb();
      activeTimeouts.current = activeTimeouts.current.filter(t => t !== id);
    }, ms);
    activeTimeouts.current.push(id);
    return id;
  };

  useEffect(() => {
    return () => {
      activeTimeouts.current.forEach(clearTimeout);
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    };
  }, []);

  // === ESTADO: WORDLE ===
  const [wordleWord, setWordleWord] = useState<string>("");
  const [wordleGuesses, setWordleGuesses] = useState<string[]>([]);
  const [currentWordleGuess, setCurrentWordleGuess] = useState<string>("");
  const [wordleBlocked, setWordleBlocked] = useState<boolean>(false);
  const [showWordleHelp, setShowWordleHelp] = useState<boolean>(false);

  // === ESTADO: COMPLETAR PALABRAS ===
  const [completarData, setCompletarData] = useState<CompletarData | null>(null);
  const [completarFeedback, setCompletarFeedback] = useState<{ value: string, status: 'success'|'error' } | null>(null);
  const [completarVidas, setCompletarVidas] = useState<number>(3);
  const [completarBlocked, setCompletarBlocked] = useState<boolean>(false);

  // === INICIALIZADORES ===
  const initMath = (mode: string) => {
    const calcMode = mode.replace("easy_", "") as EasyMode;
    const op = generateEasyOperation(calcMode);
    setOperation(op);
    setEasyFeedback(null);
    
    const opts = new Set<number>();
    opts.add(op.resultadoCorrecto);
    
    while (opts.size < 4) {
      const offset = Math.floor(Math.random() * 11) - 5; 
      if (offset === 0) continue;
      const fakeOpt = op.resultadoCorrecto + offset;
      if (fakeOpt >= 0 && !opts.has(fakeOpt)) {
        opts.add(fakeOpt);
      }
    }
    
    setOptions(Array.from(opts).sort(() => Math.random() - 0.5));
    setStartTime(Date.now());
  };

  // === GENERADORES MEMOIZADOS (0-30ms Lag, No Re-renders) ===
  const searchGrid = React.useMemo(() => {
    if (difficulty === "medium_letters") {
      const vocab = patientData.vocabulario_significativo || [];
      let combined = [...vocab, ...CLINICAL_WORD_POOL].filter(w => w.length >= 4 && w.length <= 8);
      
      // Control Anti-Repetición: Filtramos las palabras usadas en la partida anterior
      if (previousTargetsRef.current.length > 0) {
        combined = combined.filter(w => !previousTargetsRef.current.includes(w));
      }
      
      // Mezcla de Alta Entropía combinando Math.random() y Date.now()
      for (let i = combined.length - 1; i > 0; i--) {
        const entropy = (Math.random() + (Date.now() % 100) / 100) % 1;
        const j = Math.floor(entropy * (i + 1));
        [combined[i], combined[j]] = [combined[j], combined[i]];
      }
      
      // El motor extraerá 6, descartando las que no encajen
      const gridData = generateSearchGrid(combined, 10, false, 6);
      previousTargetsRef.current = gridData.targets; 
      return gridData;
    } else if (difficulty === "medium_numbers") {
      const nums: string[] = [];
      for (let i=0; i<30; i++) { // Sobrantes por si hay fallos de encaje
        const len = Math.floor(Math.random() * 4) + 4;
        let str = "";
        for (let j=0; j<len; j++) str += Math.floor(Math.random()*10).toString();
        nums.push(str);
      }
      return generateSearchGrid(nums, 10, true, 6);
    }
    return null;
  }, [difficulty, refreshKey, patientData.id]);

  const sudokuData = React.useMemo(() => {
    if (difficulty.startsWith("hard_")) {
      const size = parseInt(difficulty.split("_")[1], 10);
      return generateLatinSquare(size);
    }
    return null;
  }, [difficulty, patientData.id, refreshKey]);

  const initWordSearch = (isNumberMode: boolean) => {
    setFoundCells([]);
    setFoundTargets([]);
    setSelectedCell(null);
    setErrorCells([]);
    setRefreshKey(k => k + 1);
    setAiMessage(`¡Busca y encuentra!`);
  };

  const initSudoku = (sizeStr: string) => {
    setRefreshKey(k => k + 1);
    setIntentosRestantes(3);
    setShowValidation(false);
    setEmptyCellsDetected(false);
    setSudokuBlocked(false);
    setAiMessage(`Rellena los vacíos sin repetir números. Si lo necesitas, pulsa "Comprobar respuesta".`);
  };

  useEffect(() => {
    if (sudokuData) {
      setCurrentGrid(JSON.parse(JSON.stringify(sudokuData.initialGrid)));
      resetTimer(sudokuData.initialGrid, sudokuData.solutionGrid, sudokuData.size);
    }
  }, [sudokuData]);

  const initWordle = () => {
    const dailyWord = palabrasWordleDelAno[getDailyIndex()];
    setWordleWord(dailyWord);
    setWordleGuesses([]);
    setCurrentWordleGuess("");
    setWordleBlocked(false);
    setAiMessage(`Intenta adivinar la palabra oculta de 5 letras de hoy.`);
  };

  const resetTimer = (grid: (number | null)[][], solution: number[][], size: number) => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
    }
    
    if (!checkGridComplete(grid, solution, size)) {
      inactivityTimerRef.current = setTimeout(() => {
        if (!sudokuBlocked) {
          setLoading(true);
          getSudokuHint(grid, solution, pacienteNombre)
            .then(hint => { setAiMessage(hint); setLoading(false); })
            .catch(() => { setAiMessage(`Puedes usar "Comprobar respuesta" para revisar si vas bien.`); setLoading(false); });
        }
      }, 30000); 
    }
  };

  const checkGridComplete = (grid: (number | null)[][], solution: number[][], size: number): boolean => {
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (grid[r][c] !== solution[r][c]) return false;
      }
    }
    return true;
  };

  useEffect(() => {
    if (difficulty.startsWith("easy")) {
      initMath(difficulty);
    } else if (difficulty === "medium_letters") {
      initWordSearch(false);
    } else if (difficulty === "medium_numbers") {
      initWordSearch(true);
    } else if (difficulty.startsWith("hard_")) {
      initSudoku(difficulty.split("_")[1]);
    } else if (difficulty === "bonus_wordle") {
      initWordle();
    } else if (difficulty === "completar_palabras") {
      initCompletar();
    }
    
    return () => {
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
        inactivityTimerRef.current = null;
      }
    };
  }, [difficulty]);

  // === HANDLERS ===
  const handleAnswerMath = (answer: number, index: number) => {
    if (!operation) return;
    
    setClickedAnswerIndex(index);
    const isCorrect = answer === operation.resultadoCorrecto;
    const isDelayed = (Date.now() - startTime) > 15000; 
    
    setEasyFeedback({ value: answer, status: isCorrect ? 'success' : 'error' });
    
    if (isCorrect) {
      setLoading(true);
      evaluateEasyOperation(true, isDelayed, pacienteNombre)
        .then(msg => { setAiMessage(msg); setLoading(false); })
        .catch(() => { setAiMessage("¡Muy bien hecho!"); setLoading(false); });
        
      onRecordResult(difficulty, true, mathErrors);
      setMathErrors(0);
      safeSetTimeout(() => { initMath(difficulty); setClickedAnswerIndex(null); }, 2500); 
    } else {
      const currentErrors = mathErrors + 1;
      setMathErrors(currentErrors);
      
      if (currentErrors >= 3) {
        onRecordResult(difficulty, false, currentErrors);
        setMathErrors(0);
        setAiMessage(`Has fallado 3 veces. ¡Vamos a probar con otra operación!`);
        safeSetTimeout(() => { initMath(difficulty); setClickedAnswerIndex(null); }, 3000);
      } else {
        setAiMessage(`Esa no es la respuesta. Te quedan ${3 - currentErrors} vidas.`);
        safeSetTimeout(() => { setEasyFeedback(null); setClickedAnswerIndex(null); }, 2500);
        setStartTime(Date.now()); 
      }
    }
  };

  const handleSearchCellClick = (r: number, c: number) => {
    if (!searchGrid) return;

    if (!selectedCell) {
      setSelectedCell({ r, c });
      setErrorCells([]); 
    } else {
      const cell1 = selectedCell;
      const cell2 = { r, c };
      const dr = cell2.r - cell1.r;
      const dc = cell2.c - cell1.c;
      
      const isValidLine = dr === 0 || dc === 0 || Math.abs(dr) === Math.abs(dc);
      
      if (!isValidLine) {
        setErrorCells([cell1, cell2]);
        setSelectedCell(null);
        safeSetTimeout(() => setErrorCells([]), 1500);
        return;
      }

      const steps = Math.max(Math.abs(dr), Math.abs(dc));
      const stepR = Math.sign(dr);
      const stepC = Math.sign(dc);

      let extractedString = "";
      const currentLineCells: {r: number, c: number}[] = [];
      
      for (let i = 0; i <= steps; i++) {
        const curR = cell1.r + i * stepR;
        const curC = cell1.c + i * stepC;
        extractedString += searchGrid.grid[curR][curC];
        currentLineCells.push({ r: curR, c: curC });
      }

      const reversedString = extractedString.split('').reverse().join('');
      
      let matchedWord = null;
      for (const target of searchGrid.targets) {
        if (foundTargets.includes(target)) continue;
        if (target === extractedString || target === reversedString) {
          matchedWord = target;
          break;
        }
      }

      if (matchedWord) {
        const newFoundTargets = [...foundTargets, matchedWord];
        setFoundTargets(newFoundTargets);
        
        const newFoundCells = [...foundCells];
        for (const cell of currentLineCells) {
          if (!newFoundCells.some(fc => fc.r === cell.r && fc.c === cell.c)) {
            newFoundCells.push(cell);
          }
        }
        setFoundCells(newFoundCells);
        setSelectedCell(null);
        
        setLoading(true);
        evaluateMediumTargetFound(matchedWord, searchGrid.isNumberMode, pacienteNombre)
          .then(msg => { setAiMessage(msg); setLoading(false); })
          .catch(() => { setAiMessage(`¡Bien hecho, has encontrado ${matchedWord}!`); setLoading(false); });

        if (newFoundTargets.length >= searchGrid.targets.length) {
          onRecordResult(difficulty, true, 0);
          safeSetTimeout(() => initWordSearch(searchGrid.isNumberMode), 4000); 
        }
      } else {
        setErrorCells(currentLineCells);
        setSelectedCell(null);
        safeSetTimeout(() => setErrorCells([]), 1500);
      }
    }
  };

  const handleSudokuCellClick = (r: number, c: number) => {
    if (sudokuBlocked || !sudokuData) return;
    if (sudokuData.initialGrid[r][c] !== null) return;
    
    if (aiMessage && !aiMessage.includes("¡Fantástico") && !aiMessage.includes("Rellena") && !aiMessage.includes("¡Hola") && !aiMessage.includes("puedes usar")) {
      setAiMessage(""); 
    }
    setShowValidation(false);
    setEmptyCellsDetected(false);

    const size = sudokuData.size;
    const newGrid = [...currentGrid];
    const currentVal = newGrid[r][c];
    
    let nextVal: number | null = null;
    if (currentVal === null) nextVal = 1;
    else if (currentVal < size) nextVal = currentVal + 1;
    else nextVal = null;
    
    newGrid[r][c] = nextVal;
    setCurrentGrid(newGrid);
    
    resetTimer(newGrid, sudokuData.solutionGrid, size);
  };

  const handleComprobarSudoku = () => {
    if (sudokuBlocked || !sudokuData) return;
    
    const size = sudokuData.size;
    let hasEmpty = false;
    let hasErrors = false;
    const currentConflicts: {r: number, c: number}[] = [];

    // Comprobar vacíos
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (currentGrid[r][c] === null) {
          hasEmpty = true;
        }
      }
    }

    // Regla 2 y 3: Unicidad en filas y columnas
    for (let i = 0; i < size; i++) {
      const rowSeen = new Map<number, number[]>(); // val -> cols
      const colSeen = new Map<number, number[]>(); // val -> rows

      for (let j = 0; j < size; j++) {
        const rowVal = currentGrid[i][j];
        if (rowVal !== null) {
          if (!rowSeen.has(rowVal)) rowSeen.set(rowVal, []);
          rowSeen.get(rowVal)!.push(j);
        }

        const colVal = currentGrid[j][i];
        if (colVal !== null) {
          if (!colSeen.has(colVal)) colSeen.set(colVal, []);
          colSeen.get(colVal)!.push(j);
        }
      }

      rowSeen.forEach((cols) => {
        if (cols.length > 1) {
          hasErrors = true;
          cols.forEach(c => currentConflicts.push({r: i, c}));
        }
      });

      colSeen.forEach((rows) => {
        if (rows.length > 1) {
          hasErrors = true;
          rows.forEach(r => currentConflicts.push({r, c: i}));
        }
      });
    }

    setShowValidation(true);
    setEmptyCellsDetected(hasEmpty);
    setErrorCells(currentConflicts);

    if (hasEmpty || hasErrors) {
      const remaining = intentosRestantes - 1;
      setIntentosRestantes(remaining);
      
      if (remaining === 0) {
        setSudokuBlocked(true);
        onRecordResult(difficulty, false, 3);
        setAiMessage(`Tranquilo ${pacienteNombre}, es normal equivocarse a veces. Vamos a intentarlo con un tablero nuevo.`);
        safeSetTimeout(() => initSudoku(`${size}x${size}`), 4000);
      } else {
        if (hasEmpty && !hasErrors) {
          setAiMessage(`Faltan casillas por rellenar resaltadas en amarillo. Te quedan ${remaining} intentos.`);
        } else {
          setAiMessage(`Hay números repetidos en filas o columnas (en rojo). Te quedan ${remaining} intentos, prueba a corregirlo.`);
        }
      }
      // Limpiar validación visual después de un tiempo para seguir intentando
      safeSetTimeout(() => {
        if (remaining > 0) {
          setShowValidation(false);
          setEmptyCellsDetected(false);
          setErrorCells([]);
        }
      }, 3000);

    } else {
      setSudokuBlocked(true);
      setEmptyCellsDetected(false);
      setErrorCells([]);
      onRecordResult(difficulty, true, 3 - intentosRestantes);
      setAiMessage(`¡Fantástico, ${pacienteNombre}! Has resuelto el tablero perfectamente.`);
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
      safeSetTimeout(() => initSudoku(`${size}x${size}`), 4000);
    }
  };

  const handleWordleKeyPress = (key: string) => {
    if (wordleBlocked) return;
    
    if (key === "ENVIAR") {
      if (currentWordleGuess.length !== 5) {
        setAiMessage("La palabra debe tener 5 letras.");
        return;
      }
      const newGuesses = [...wordleGuesses, currentWordleGuess];
      setWordleGuesses(newGuesses);
      setCurrentWordleGuess("");

      if (currentWordleGuess === wordleWord) {
        setWordleBlocked(true);
        onRecordResult(difficulty, true, newGuesses.length - 1);
        setAiMessage(`¡Felicidades ${pacienteNombre}! Has adivinado la palabra del día.`);
      } else if (newGuesses.length >= 6) {
        setWordleBlocked(true);
        onRecordResult(difficulty, false, 6);
        setAiMessage(`Buen intento. La palabra oculta de hoy era: ${wordleWord}. ¡Mañana más!`);
      } else {
        setAiMessage(`Te quedan ${6 - newGuesses.length} intentos.`);
      }
    } else if (key === "BORRAR") {
      setCurrentWordleGuess(prev => prev.slice(0, -1));
    } else {
      if (currentWordleGuess.length < 5) {
        setCurrentWordleGuess(prev => prev + key);
      }
    }
  };

  const initCompletar = () => {
    setCompletarData(generateCompletarPalabras());
    setCompletarFeedback(null);
    setCompletarVidas(3);
    setCompletarBlocked(false);
  };

  const handleAnswerCompletar = (letra: string) => {
    if (!completarData || completarBlocked) return;
    
    if (letra === completarData.correctLetter) {
      setCompletarFeedback({ value: letra, status: 'success' });
      setAiMessage(`¡Excelente, ${pacienteNombre}! Has acertado.`);
      setCompletarBlocked(true);
      onRecordResult(difficulty, true, 3 - completarVidas);
      safeSetTimeout(() => initCompletar(), 2500);
    } else {
      const remaining = completarVidas - 1;
      setCompletarVidas(remaining);
      setCompletarFeedback({ value: letra, status: 'error' });
      if (remaining <= 0) {
        setCompletarBlocked(true);
        onRecordResult(difficulty, false, 3);
        setAiMessage(`¡No te preocupes! La letra oculta era la ${completarData.correctLetter}.`);
        safeSetTimeout(() => initCompletar(), 3000);
      } else {
        setAiMessage(`Esa no es la letra correcta. Te quedan ${remaining} vidas.`);
        safeSetTimeout(() => setCompletarFeedback(null), 1500);
      }
    }
  };

  const getWordleLetterColor = (letter: string, index: number, targetWord: string) => {
    if (targetWord[index] === letter) return "bg-emerald-100 border-emerald-500 text-slate-950";
    if (targetWord.includes(letter)) return "bg-amber-100 border-amber-500 text-slate-950";
    return "bg-slate-100 border-slate-400 text-slate-950";
  };

  const getKeyColor = (key: string) => {
    let status = "bg-white border-slate-900";
    for (const guess of wordleGuesses) {
      for (let i = 0; i < 5; i++) {
        if (guess[i] === key) {
          if (wordleWord[i] === key) return "bg-emerald-100 border-emerald-500 text-slate-950";
          status = "bg-amber-100 border-amber-500 text-slate-950";
        }
      }
    }
    for (const guess of wordleGuesses) {
      if (guess.includes(key) && !wordleWord.includes(key)) {
        return "bg-slate-100 border-slate-400 text-slate-950";
      }
    }
    return status;
  };

  const renderWordleGrid = () => {
    const cells = [];
    for (let i = 0; i < 6; i++) {
      const isCurrentRow = i === wordleGuesses.length && !wordleBlocked;
      const guess = i < wordleGuesses.length ? wordleGuesses[i] : (isCurrentRow ? currentWordleGuess : "");
      
      for (let j = 0; j < 5; j++) {
        const letter = guess[j] || "";
        let colorClass = "bg-white text-slate-950 border-slate-950";
        if (i < wordleGuesses.length) {
          colorClass = getWordleLetterColor(letter, j, wordleWord);
        } else if (isCurrentRow && letter) {
          colorClass = "bg-white text-slate-950 border-slate-950";
        }

        cells.push(
          <div key={`${i}-${j}`} className={`w-11 h-11 sm:w-14 sm:h-14 border-2 rounded-xl text-2xl sm:text-3xl font-black flex items-center justify-center uppercase shrink-0 ${colorClass}`}>
            {letter}
          </div>
        );
      }
    }
    return (
      <div className="w-full max-w-[280px] sm:max-w-[340px] mx-auto grid grid-cols-5 gap-1.5 shrink-0 justify-items-center">
        {cells}
      </div>
    );
  };

  return (
    <div className={`h-screen w-screen max-h-screen overflow-hidden bg-slate-50 flex flex-col justify-between p-4 select-none ${theme === "sepia" ? "bg-amber-50" : ""}`}>
      
      {/* Cabecera Limpia */}
      <div className="flex items-center justify-between w-full border-b border-slate-200 pb-2 mb-2 shrink-0">
        <button onClick={onEndSession} className="flex items-center text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16" className="mr-1"><path fillRule="evenodd" d="M11.354 1.646a.5.5 0 0 1 0 .708L5.707 8l5.647 5.646a.5.5 0 0 1-.708.708l-6-6a.5.5 0 0 1 0-.708l6-6a.5.5 0 0 1 .708 0z"/></svg>
          Volver
        </button>
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-black text-slate-900">
            {difficulty.startsWith("easy") ? "CÁLCULO" : 
             difficulty === "medium_letters" ? "LETRAS" : 
             difficulty === "medium_numbers" ? "NÚMEROS" : 
             difficulty.startsWith("hard") ? "SUDOKUS" : 
             difficulty === "bonus_wordle" ? "PALABRA DIARIA" : 
             difficulty === "completar_palabras" ? "COMPLETAR" :
             "JUEGO"}
          </h2>
          {difficulty === "bonus_wordle" && (
            <button onClick={() => setShowWordleHelp(true)} className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center border-2 border-slate-900 rounded-full font-black text-lg sm:text-xl bg-white text-slate-950 shadow-sm hover:bg-slate-100 transition-all select-none shrink-0" aria-label="Ver ayuda">?</button>
          )}
        </div>
        <div className="bg-slate-200 text-slate-800 px-3 py-1 rounded-full text-xs font-bold">
          {difficulty.startsWith('hard') ? `Vidas: ${intentosRestantes}` : difficulty.startsWith('easy') ? `Vidas: ${3 - mathErrors}` : difficulty === 'completar_palabras' ? `Vidas: ${completarVidas}` : 'Jugando'}
        </div>
      </div>

      {/* Escenario Central Autosuficiente */}
      <div className="flex-1 flex flex-col items-center justify-center min-h-0 w-full py-2 relative">
        
        {/* Caja de mensajes IA */}
        <div 
          aria-live="assertive"
          className={`relative text-xs sm:text-sm font-black text-center bg-white border-2 border-slate-900 py-1.5 px-4 w-full max-w-[400px] rounded-lg shadow-sm mx-auto mt-1 mb-3 block transition-all shrink-0 z-10 ${
            aiMessage === "" ? "opacity-0 -translate-y-4" : "opacity-100 translate-y-0"
          }`}
        >
          {loading ? "PENSANDO..." : aiMessage}
        </div>

        <div className="flex-1 w-full flex flex-col justify-center items-center min-h-0 relative">
          {/* BLOQUE FÁCIL */}
          {difficulty.startsWith("easy") && operation && (() => {
            const operacionString = operation.operacion.replace('*', 'x');
            const match = operacionString.match(/(\d+)\s*([\+\-x\/])\s*(\d+)/);
            
            return (
              <div className="w-full space-y-2">
                {match ? (
                  <div className="w-32 mx-auto flex flex-col items-end font-black text-4xl sm:text-5xl text-slate-950 tracking-widest relative pb-2 mb-6 border-b-4 border-slate-950">
                    <div>{match[1]}</div>
                    <div className="flex items-center justify-between w-full">
                      <span>{match[2]}</span>
                      <span>{match[3]}</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-3xl font-black tracking-widest text-center bg-white py-2 border-4 border-slate-300 text-slate-900 flex items-center justify-center mb-6">
                    {operacionString} = ?
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3 w-full max-w-[400px] mx-auto mt-3">
                  {options.map((opt, i) => {
                    let btnClass = "bg-white text-slate-950 border-2 border-slate-900 shadow-sm";
                    if (clickedAnswerIndex === i && easyFeedback) {
                      btnClass = easyFeedback.status === 'success' ? "bg-emerald-600 text-white border-emerald-700 shadow-inner" : "bg-red-600 text-white border-red-700 shadow-inner";
                    }
                    return (
                      <button 
                        key={i} 
                        className={`w-full rounded-2xl p-4 sm:p-5 text-center transition-all duration-150 active:scale-[0.98] text-xl sm:text-2xl md:text-3xl font-black ${btnClass}`}
                        onClick={() => handleAnswerMath(opt, i)}
                      >
                        {opt}
                      </button>
                    )
                  })}
                </div>
              </div>
            );
          })()}

          {/* BLOQUE MEDIO */}
          {difficulty.startsWith("medium") && (
            !searchGrid || !searchGrid.grid || searchGrid.grid.length === 0 ? (
              <div className="w-full flex flex-col items-center justify-center p-8 bg-white border-4 border-slate-300 min-h-[200px]">
                 <p className="text-xl font-black text-slate-500 animate-pulse">CARGANDO TABLERO...</p>
              </div>
            ) : (
            <div className="w-full flex flex-col items-center max-h-full">
              {/* Tablero Gigante */}
              <div 
                 className="w-full max-w-[400px] aspect-square bg-white border-2 border-slate-900 rounded-xl p-2 shadow-sm mx-auto grid gap-1 shrink min-h-0 mt-8"
                 style={{ gridTemplateColumns: `repeat(${searchGrid.grid.length}, minmax(0, 1fr))` }}
              >
                 {searchGrid.grid.map((row, r) => 
                   row.map((val, c) => {
                     const isFound = foundCells.some(cell => cell.r === r && cell.c === c);
                     const isSelected = selectedCell?.r === r && selectedCell?.c === c;
                     const isError = errorCells.some(cell => cell.r === r && cell.c === c);
                     
                     return (
                       <div key={`${r}-${c}`} className="relative w-full h-full">
                         <div className={`absolute inset-0 rounded-lg transition-colors duration-200 pointer-events-none z-0 ${
                           isFound ? "bg-emerald-500" : 
                           isSelected ? "bg-slate-900" : 
                           isError ? "bg-rose-500" : 
                           "bg-slate-100"
                         }`} />
                         
                         <button 
                           className={`relative w-full h-full text-xl font-black uppercase flex items-center justify-center p-0 m-0 z-10 bg-transparent focus:outline-none transition-colors hover:bg-black/5 ${
                             isFound || isSelected || isError ? "text-white" : "text-slate-900"
                           }`}
                           onClick={() => handleSearchCellClick(r, c)}
                           aria-label={`Fila ${r+1}, Columna ${c+1}, ${val}`}
                         >
                           {val}
                         </button>
                      </div>
                     );
                   })
                 )}
              </div>

              {/* Area de Objetivos */}
              <div className="grid grid-cols-3 gap-1.5 w-full max-w-[400px] mx-auto mt-2 shrink-0">
                {searchGrid.targets.map((w) => {
                  const isF = foundTargets.includes(w);
                  return (
                    <span key={w} className={`px-3 py-1.5 rounded-xl text-center uppercase transition-all duration-300 ${isF ? 'bg-emerald-100 border border-emerald-300 text-emerald-800 line-through opacity-70 font-black text-xs sm:text-sm' : 'bg-white border border-slate-900 text-slate-950 font-black text-xs sm:text-sm shadow-sm'}`}>
                      {w}
                    </span>
                  )
                })}
              </div>
            </div>
            )
          )}

          {/* BLOQUE DIFÍCIL */}
          {difficulty.startsWith("hard") && currentGrid.length > 0 && sudokuData && (
            <div className="w-full flex flex-col items-center">
              {/* Tablero Gigante */}
              <div 
                 className="w-full max-w-[400px] aspect-square bg-white border-2 border-slate-900 rounded-xl p-2 shadow-sm mx-auto grid gap-1 shrink min-h-0 mt-8"
                 style={{ gridTemplateColumns: `repeat(${sudokuData.size}, minmax(0, 1fr))` }}
              >
                 {currentGrid.map((row, r) => 
                   row.map((val, c) => {
                     const isFixed = sudokuData.initialGrid[r][c] !== null;
                     
                     let cellClass = "bg-slate-100 hover:bg-slate-200 text-slate-900"; 
                     
                      if (isFixed) {
                       cellClass = "bg-slate-200 text-slate-500 font-bold"; 
                     } else {
                       if (emptyCellsDetected && val === null) {
                         cellClass = "bg-amber-100 text-amber-900 border-2 border-amber-400";
                       } else if (showValidation && val !== null) {
                         const isConflict = errorCells.some(err => err.r === r && err.c === c);
                         if (isConflict) {
                           cellClass = "bg-rose-500 text-white";
                         } else {
                           cellClass = "bg-emerald-500 text-white";
                         }
                       }
                     }
                     
                     return (
                       <button 
                         key={`${r}-${c}`}
                         className={`w-full h-full text-xl font-black uppercase rounded-lg transition-colors duration-200 focus:outline-none flex items-center justify-center p-0 m-0 ${cellClass} ${isFixed || sudokuBlocked ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                         onClick={() => handleSudokuCellClick(r, c)}
                         disabled={isFixed || sudokuBlocked}
                       >
                         {val || ""}
                       </button>
                     );
                   })
                 )}
              </div>

              <button 
                onClick={handleComprobarSudoku} 
                className="w-full max-w-[400px] mx-auto bg-slate-900 text-white text-xs font-black uppercase tracking-widest py-3 rounded-xl shadow hover:bg-slate-800 active:scale-[0.99] transition-all mt-2 block text-center shrink-0"
                disabled={sudokuBlocked}
              >
                Comprobar respuesta
              </button>
            </div>
          )}

          {/* BLOQUE BONUS WORDLE */}
          {difficulty === "bonus_wordle" && wordleWord && (
            <div className="flex-1 flex flex-col items-center justify-start min-h-0 w-full py-0 sm:py-2 gap-2">
              <div className="w-full flex flex-col items-center mt-2 sm:mt-4 shrink-0">
                {renderWordleGrid()}
              </div>

              {/* Teclado Virtual QWERTY "Palabra del día" */}
              <div className="w-full max-w-[480px] mx-auto flex flex-col gap-1.5 mt-auto bg-transparent pb-4 px-1 shrink-0">
                {['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'].map((row, rowIdx) => (
                  <div key={rowIdx} className="flex justify-center gap-1 sm:gap-1.5">
                    {rowIdx === 2 && (
                      <button onClick={() => handleWordleKeyPress("ENVIAR")} className="bg-white text-slate-950 border-2 border-slate-900 font-black text-sm sm:text-base px-2 py-3.5 rounded-xl shadow-sm hover:bg-slate-100 active:scale-95 transition-all flex-[1.5] h-11 sm:h-13">
                        ENTER
                      </button>
                    )}
                    {row.split('').map(key => {
                      const color = getKeyColor(key);
                      const baseClass = "font-black text-sm sm:text-base px-2 py-3.5 rounded-xl shadow-sm hover:bg-slate-100 active:scale-95 transition-all flex-1 h-11 sm:h-13 border-2";
                      return (
                        <button 
                          key={key} 
                          onClick={() => handleWordleKeyPress(key)}
                          className={`${baseClass} ${color} text-slate-950`}
                        >
                          {key}
                        </button>
                      );
                    })}
                    {rowIdx === 2 && (
                      <button onClick={() => handleWordleKeyPress("BORRAR")} className="bg-white text-slate-950 border-2 border-slate-900 font-black text-sm sm:text-base px-2 py-3.5 rounded-xl shadow-sm hover:bg-slate-100 active:scale-95 transition-all flex-[1.5] h-11 sm:h-13">
                        BORRAR
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* BLOQUE COMPLETAR PALABRAS */}
          {difficulty === "completar_palabras" && completarData && (
            <div className="flex-1 flex flex-col items-center justify-center min-h-0 w-full py-2 gap-4">
              <div className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-950 tracking-widest text-center uppercase py-8 bg-white border-2 border-slate-900 rounded-2xl w-full max-w-[360px] mx-auto shadow-sm select-none shrink-0">
                {completarData.maskedWord}
              </div>
              <div className="grid grid-cols-2 gap-4 max-w-[400px] mx-auto w-full mt-4 shrink-0">
                {completarData.options.map((opt, i) => {
                  let btnClass = "bg-white text-slate-950 border-slate-900";
                  if (completarFeedback?.value === opt) {
                    btnClass = completarFeedback.status === 'success' 
                      ? "bg-emerald-600 text-white border-emerald-700" 
                      : "bg-red-600 text-white border-red-700";
                  }
                  return (
                    <button 
                      key={i} 
                      onClick={() => handleAnswerCompletar(opt)}
                      disabled={completarBlocked}
                      className={`bg-white border-2 border-slate-900 rounded-2xl p-5 font-black text-2xl shadow-sm transition-all text-center hover:bg-slate-100 active:scale-95 ${btnClass}`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Modal Ayuda Wordle */}
      {showWordleHelp && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white border-4 border-slate-950 p-6 rounded-2xl w-full max-w-[380px] shadow-2xl flex flex-col gap-4 text-slate-950 animate-scaleIn">
            <h3 className="text-xl font-black text-center border-b-2 border-slate-200 pb-2">¿CÓMO JUGAR?</h3>
            <p className="text-sm font-semibold text-center text-zinc-600">Adivina la palabra de 5 letras en 6 intentos. Tras cada intento, las casillas cambiarán de color:</p>
            
            <div className="flex flex-col gap-3 mt-2">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded shrink-0 bg-emerald-100 border-2 border-emerald-500 text-slate-950 flex items-center justify-center font-black">A</div>
                <p className="text-xs font-bold leading-tight pt-1">La letra está en la palabra y en la posición <span className="text-emerald-700 font-black">CORRECTA</span>.</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded shrink-0 bg-amber-100 border-2 border-amber-500 text-slate-950 flex items-center justify-center font-black">R</div>
                <p className="text-xs font-bold leading-tight pt-1">La letra está en la palabra pero en posición <span className="text-amber-700 font-black">INCORRECTA</span>.</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded shrink-0 bg-slate-200 border-2 border-slate-400 text-slate-950 flex items-center justify-center font-black">C</div>
                <p className="text-xs font-bold leading-tight pt-1">La letra <span className="text-slate-700 font-black">NO</span> forma parte de la palabra.</p>
              </div>
            </div>

            <button onClick={() => setShowWordleHelp(false)} className="w-full mt-2 bg-slate-950 text-white font-black py-3 rounded-xl border-b-4 border-slate-750 active:scale-95 transition-all text-center text-sm uppercase tracking-wide">
              Entendido
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
