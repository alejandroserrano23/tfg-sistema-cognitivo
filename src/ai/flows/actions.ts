"use server";

import { generateText } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import fs from "fs";
import path from "path";
import { generateSearchGrid, DICCIONARIO_GENERAL_ES } from "@/lib/qol-calculator";

const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_API_KEY || "simulated-key",
});

function getPatientData(patientId: string = "p_001") {
  try {
    const filePath = path.join(process.cwd(), "src/data/mock-database.json");
    const fileContent = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(fileContent).datosEmocionalesRemotos[patientId];
  } catch (error) {
    return {
      vocabulario_significativo: ["FAMILIA", "CASA"]
    };
  }
}

// === BLOQUE FÁCIL ===
export async function evaluateEasyOperation(isCorrect: boolean, isDelayed: boolean, nombrePaciente: string) {
  let promptText = "";
  if (isCorrect) {
    promptText = `Eres un asistente conversacional para terapias cognitivas. El paciente, llamado ${nombrePaciente}, acaba de resolver correctamente una operación aritmética. Genera un mensaje MUY CORTO (máximo 1 frase), cálido, cariñoso y motivador de refuerzo positivo felicitándole por su acierto. Usa el nombre ${nombrePaciente}.`;
  } else {
    promptText = `Eres un asistente conversacional para terapias cognitivas. El paciente, ${nombrePaciente}, ha fallado una operación aritmética o se ha demorado mucho. Genera un mensaje MUY CORTO (máximo 1 frase) de apoyo terapéutico, sumamente paciente, sutil y cariñoso. NO penalices el error, NO uses la palabra "error", "mal" ni "equivocado". Invítale a intentarlo de nuevo con cariño y dándole ánimos, mencionando a ${nombrePaciente}. Usa lenguaje muy sencillo y accesible.`;
  }

  try {
    const { text } = await generateText({
      model: google("models/gemini-2.5-flash"),
      prompt: promptText,
      temperature: 0.3, 
    });
    return text;
  } catch (error) {
    return isCorrect 
      ? `¡Excelente trabajo, ${nombrePaciente}! Lo estás haciendo muy bien.`
      : `No te preocupes ${nombrePaciente}, tómate todo el tiempo que necesites y probemos otra vez.`;
  }
}

// === BLOQUE MEDIO ===
export async function getMediumBlockData(isNumberMode: boolean, poolDatos: string[]) {
  let finalTargets: string[] = [];

  if (isNumberMode) {
    const generated = new Set<string>();
    while(generated.size < 6) {
      const len = Math.floor(Math.random() * 4) + 4; 
      let numStr = "";
      for (let i = 0; i < len; i++) {
        numStr += Math.floor(Math.random() * 10).toString();
      }
      generated.add(numStr);
    }
    finalTargets = Array.from(generated);
  } else {
    const combinedPool = Array.from(new Set([...poolDatos, ...DICCIONARIO_GENERAL_ES]));
    const pool = combinedPool.filter((item: string) => item.length >= 4 && item.length <= 7);
    
    pool.sort(() => Math.random() - 0.5);
    finalTargets = pool.slice(0, 6);
  }
  
  return generateSearchGrid(finalTargets, 10, isNumberMode);
}

export async function evaluateMediumTargetFound(target: string, isNumberMode: boolean, nombrePaciente: string) {
  const context = isNumberMode ? `el número significativo "${target}"` : `la palabra significativa "${target}"`;
  
  try {
    const { text } = await generateText({
      model: google("models/gemini-2.5-flash"),
      prompt: `Eres un asistente conversacional para terapias cognitivas. El paciente, llamado ${nombrePaciente}, acaba de encontrar exitosamente ${context} en una matriz de búsqueda. Esto tiene gran significado emocional y afectivo para su biografía y recuerdos. Genera un mensaje MUY CORTO (máximo 1 frase), sumamente cálido y muy cariñoso felicitándole con entusiasmo por su logro. Nombra explícitamente el término descubierto y usa el nombre ${nombrePaciente}. NO uses emojis excesivos.`,
      temperature: 0.3,
    });
    return text;
  } catch (error) {
    return `¡Excelente, ${nombrePaciente}! Has encontrado maravillosamente ${target}.`;
  }
}

// === BLOQUE DIFÍCIL ===
export async function getSudokuHint(currentGrid: (number | null)[][], solutionGrid: number[][], nombrePaciente: string) {
  try {
    const { text } = await generateText({
      model: google("models/gemini-2.5-flash"),
      prompt: `Eres un tutor clínico extremadamente paciente. El paciente, ${nombrePaciente}, está resolviendo un Sudoku adaptativo y lleva 30 segundos inactivo. Analiza este tablero actual (los 'null' son celdas vacías): ${JSON.stringify(currentGrid)} frente a su solución: ${JSON.stringify(solutionGrid)}. Dale una pista lúdica, sutil y contextual. NO le des la respuesta exacta (ej. prohibido decir "pon un 2"), guíale amablemente (ej: "En la primera fila falta un número..."). MÁXIMO 15 palabras. Usa el nombre ${nombrePaciente} de forma cariñosa.`,
      temperature: 0.2, 
    });
    return text;
  } catch (error) {
    return `Tranquilo ${nombrePaciente}, tómate tu tiempo. ¿Probamos a repasar los números de las primeras filas?`;
  }
}
