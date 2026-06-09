export interface SessionResult {
  resolutionTimeMs: number;
  successRate: number; 
  frustrationAlerts: boolean;
}

export function calculatePerformanceScore(result: SessionResult): number {
  let score = 100;
  if (result.resolutionTimeMs > 60000) score -= Math.floor((result.resolutionTimeMs - 60000) / 1000) * 0.5;
  score = score * result.successRate;
  if (result.frustrationAlerts) score -= 20;
  return Math.max(0, Math.round(score));
}

// === NUEVO MODO COMPLETAR PALABRAS ===
export interface CompletarData {
  originalWord: string;
  maskedWord: string;
  correctLetter: string;
  options: string[];
}

export const COMPLETAR_WORD_POOL = [
  "ARBOL", "SILLA", "VENTANA", "PLATO", "MESA", "PERRO", "GATO", "COCHE", "PUEBLO", "FRUTA", 
  "LECHE", "AGUA", "CASA", "AMIGO", "BANCO", "CABALLO", "FLORES", "HUERTO", "JARDIN", "LIMON",
  "QUESO", "CARNE", "TAZA", "HORNO", "VINO", "COPA", "TOMATE", "PATATA", "COCINA",
  "HUEVO", "JAMON", "PERA", "MELON", "SANDIA", "FRESA", "CEREZA", "POLLO", "ATUN", "CEBOLLA",
  "TARTA", "PASTEL", "DULCE", "HELADO", "MIEL", "YOGUR", "CEREAL", "PASTA", "PAJARO", "LEON",
  "TIGRE", "FLOR", "LAGO", "MONTE", "NUBE", "LLUVIA", "NIEVE", "VIENTO", "PLANTA", "BOSQUE",
  "OVEJA", "VACA", "CERDO", "PATO", "LOBO", "ZORRO", "MONO", "RANA", "MOSCA", "ABEJA", "ARAÑA",
  "PLAYA", "ARENA", "PIEDRA", "ROCA", "TIERRA", "CIELO", "HIELO", "FUEGO", "HOJA", "CAMA",
  "SOFA", "TELE", "RADIO", "LLAVE", "RELOJ", "LIBRO", "PAPEL", "LAPIZ", "ROPA", "CAMISA",
  "BOLSO", "ESPEJO", "MANTA", "PUERTA", "CUADRO", "SILLON", "SABANA", "COJIN", "TOALLA",
  "CEPILLO", "JABON", "DUCHA", "BANO", "ESCOBA", "CUBO", "BASURA", "CAJA", "VASO", "OLLA",
  "SARTEN", "ABRIGO", "FALDA", "MADRID", "ESPANA", "CALLE", "PLAZA", "MAPA", "VIAJE", "TREN",
  "AVION", "BARCO", "NORTE", "ESTE", "OESTE", "VALLE", "CIUDAD", "PARQUE", "CAMINO", "PUERTO",
  "MUNDO", "PAIS", "ISLA", "COSTA", "RURAL", "URBANO", "BARRIO", "HOTEL", "MUSEO", "BANCO",
  "TIENDA", "CINE", "TEATRO", "CAFE", "PUENTE", "MANO", "BOCA", "PELO", "CARA", "BRAZO",
  "PIERNA", "SALUD", "VIDA", "MEDICO", "ALMA", "MENTE", "SUENO", "CALMA", "AMOR", "AMIGO",
  "CABEZA", "CUELLO", "HOMBRO", "PECHO", "DEDO", "OREJA", "NARIZ", "LENGUA", "DIENTE", "HUESO",
  "SANGRE", "PIEL", "SUDOR", "FIEBRE", "DOLOR", "GRIPE", "VENDA", "VACUNA", "MUSICA", "CANTO",
  "BAILE", "FIESTA", "JUEGO", "FUTBOL", "TENIS", "GOLF", "PELOTA", "BALON", "PREMIO", "REGALO",
  "ARTE", "DIBUJO", "FOTO", "VIDEO", "POEMA", "CUENTO", "NOVELA", "LEER", "CANTAR", "BAILAR",
  "JUGAR", "GANAR", "PERDER", "REIR", "LLORAR", "PENSAR", "SOÑAR", "OFICIO", "ALUMNO", "JUEZ",
  "POLICIA", "PILOTO", "CHOFER", "PINTO", "ACTOR", "AUTOR", "POETA", "CHEF", "SASTRE",
  "TIEMPO", "HORA", "MINUTO", "DIA", "NOCHE", "MAÑANA", "TARDE", "SEMANA", "MES", "AÑO",
  "SIGLO", "LUNES", "MARTES", "JUEVES", "SABADO", "ENERO", "MARZO", "ABRIL", "MAYO", "JUNIO",
  "JULIO", "AGOSTO", "KILO", "LITRO", "METRO", "GRAMO", "BLANCO", "NEGRO", "ROJO", "AZUL",
  "VERDE", "AMARILLO", "GRIS", "ROSA", "MARRON", "NARANJA", "ALTO", "BAJO", "GRANDE", "CORTO",
  "LARGO", "ANCHO", "NUEVO", "VIEJO", "JOVEN", "MAYOR", "BUENO", "MALO", "LINDO", "FEO",
  "RICO", "POBRE", "CARO", "FACIL", "SUAVE", "DURO", "FELIZ", "TRISTE", "RAPIDO", "LENTO",
  "FUERTE", "DEBIL", "CALOR", "FRIO", "LIMPIO", "SUCIO", "SECO", "SIEMPRE", "NUNCA",
  "HOY", "AYER", "MUCHO", "POCO", "TODO", "NADA", "ALGO", "NADIE", "AQUI", "ALLA", "CERCA",
  "LEJOS", "ARRIBA", "ABAJO", "DENTRO", "FUERA", "DELANTE", "DETRAS", "ANTES", "HOLA",
  "ADIOS", "GRACIAS", "PERDON", "CLARO", "EXACTO", "BRAVO", "ANIMAL", "PLANTA", "HUMANO",
  "NINO", "NINA", "CHICO", "CHICA", "HOMBRE", "MUJER", "SENOR", "SENORA", "ABUELO", "ABUELA",
  "PADRE", "MADRE", "HIJO", "HIJA", "HERMANO", "TIO", "TIA", "PRIMO", "PRIMA", "ESPOSO",
  "ESPOSA", "NOVIO", "NOVIA", "AMIGA", "JEFE", "SOCIO", "VECINO", "VECINA", "DUENO"
];

export function generateCompletarPalabras(): CompletarData {
  // Mezclar el pool y tomar una palabra al azar
  const shuffledPool = [...COMPLETAR_WORD_POOL].sort(() => Math.random() - 0.5);
  const originalWord = shuffledPool[0];
  
  // Escoger índice (no primera ni última)
  const maxIdx = originalWord.length - 2;
  const targetIndex = Math.floor(Math.random() * maxIdx) + 1;
  
  const correctLetter = originalWord[targetIndex];
  
  const maskedWord = originalWord.substring(0, targetIndex) + "_" + originalWord.substring(targetIndex + 1);
  
  // Abecedario base
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const distractors: string[] = [];
  
  while (distractors.length < 3) {
    const randomLetter = alphabet[Math.floor(Math.random() * alphabet.length)];
    if (randomLetter !== correctLetter && !distractors.includes(randomLetter)) {
      distractors.push(randomLetter);
    }
  }
  
  const options = [correctLetter, ...distractors].sort(() => Math.random() - 0.5);
  
  return {
    originalWord,
    maskedWord,
    correctLetter,
    options
  };
}

// === DICCIONARIO CLÍNICO MASIVO ===
export const CLINICAL_WORD_POOL = [
  // Alimentos/Cocina
  "PAN", "CAFE", "SOPA", "ARROZ", "AZUCAR", "SAL", "ACEITE", "FRUTA", "LECHE", "QUESO", 
  "CARNE", "AGUA", "TAZA", "PLATO", "HORNO", "MESA", "SILLA", "VINO", "COPA", "PLATANOS", 
  "MANZANA", "TOMATE", "PATATAS", "COCINA", "CUCHILLO", "TENEDOR", "DESAYUNO",
  "HUEVO", "JAMON", "LIMON", "NARANJA", "PERA", "MELON", "SANDIA", "UVA", "FRESA", "CEREZA",
  "POLLO", "PESCADO", "ATUN", "AJO", "CEBOLLA", "PIMIENTO", "ZANAHORIA", "LECHUGA", "TARTA",
  "PASTEL", "DULCE", "HELADO", "CHOCOLATE", "MIEL", "YOGUR", "MANTECA", "CEREAL", "PASTA",
  // Naturaleza/Animales
  "PERRO", "GATO", "PAJARO", "LEON", "TIGRE", "ARBOL", "FLOR", "RIO", "MAR", "LAGO", "MONTE", 
  "SOL", "LUNA", "NUBE", "LLUVIA", "NIEVE", "VIENTO", "PLANTA", "JARDIN", "CABALLO", "ELEFANTE", 
  "BOSQUE", "DESIERTO", "MONTAÑA", "PALMERA", "OVEJA", "VACA", "CERDO", "PATO", "GALLINA", "CONEJO",
  "OSO", "LOBO", "ZORRO", "MONO", "RANA", "PEZ", "MOSCA", "ABEJA", "HORMIGA", "MARIPOSA", "ARAÑA",
  "PLAYA", "ARENA", "PIEDRA", "ROCA", "TIERRA", "CIELO", "ESTRELLA", "HIELO", "FUEGO", "HOJA",
  // Hogar/Objetos
  "CASA", "CAMA", "SOFA", "TELE", "RADIO", "LLAVE", "RELOJ", "LIBRO", "PAPEL", "LAPIZ", "ROPA", 
  "CAMISA", "PANTALON", "ZAPATO", "BOLSO", "ESPEJO", "MANTA", "PUERTA", "VENTANA", "ARMARIO", 
  "CUADRO", "LAMPARA", "TELEFONO", "SILLON", "SABANA", "COJIN", "ALFOMBRA", "CORTINA", "TOALLA",
  "CEPILLO", "JABON", "DUCHA", "BANO", "ESCOBA", "CUBO", "BASURA", "CAJA", "BOTELLA", "VASO",
  "PLATO", "OLLA", "SARTEN", "TENEDOR", "CUCHARA", "CUCHILLO", "CINTURON", "ABRIGO", "FALDA",
  // Geografía/Lugares
  "MADRID", "ESPANA", "PUEBLO", "CALLE", "PLAZA", "MAPA", "VIAJE", "TREN", "AVION", "COCHE", 
  "BARCO", "NORTE", "SUR", "ESTE", "OESTE", "PLAYA", "VALLE", "CIUDAD", "COLEGIO", "IGLESIA", 
  "PARQUE", "CAMINO", "PUERTO", "MUNDO", "PAIS", "ISLA", "COSTA", "RURAL", "URBANO", "BARRIO",
  "ESTACION", "AEROPUERTO", "HOTEL", "MUSEO", "HOSPITAL", "BANCO", "TIENDA", "MERCADO", "CINE",
  "TEATRO", "RESTAURANTE", "CAFE", "FARMACIA", "PANADERIA", "OFICINA", "FABRICA", "PUENTE",
  // Cuerpo/Salud
  "MANO", "PIE", "OJOS", "BOCA", "PELO", "CARA", "BRAZO", "PIERNA", "SALUD", "VIDA", "MEDICO", 
  "CLINICA", "ALMA", "MENTE", "SUENO", "CALMA", "AMOR", "AMIGO", "FAMILIA", "MEDICINA", "CORAZON", 
  "SONRISA", "ABRAZO", "CUIDADOR", "BIENESTAR", "CABEZA", "CUELLO", "HOMBRO", "PECHO", "ESPALDA",
  "DEDO", "UNA", "OREJA", "NARIZ", "LENGUA", "DIENTE", "HUESO", "SANGRE", "PIEL", "SUDOR",
  "FIEBRE", "DOLOR", "TOS", "GRIPE", "VENDA", "CURITA", "PASTILLA", "JARABE", "VACUNA",
  // Cultura/Arte/Ocio
  "MUSICA", "CANTO", "BAILE", "FIESTA", "JUEGO", "DEPORTE", "FUTBOL", "TENIS", "GOLF", "PELOTA",
  "BALON", "CARRERA", "PREMIO", "REGALO", "ARTE", "PINTURA", "DIBUJO", "FOTO", "VIDEO", "POEMA",
  "CUENTO", "NOVELA", "LEER", "ESCRIBIR", "CANTAR", "BAILAR", "JUGAR", "GANAR", "PERDER", "REIR",
  "LLORAR", "PENSAR", "SOÑAR", "RECORDAR", "OLVIDAR", "APRENDER", "ENSEÑAR", "ESTUDIAR",
  // Profesiones/Trabajo
  "TRABAJO", "OFICIO", "MEDICO", "ENFERMERO", "PROFESOR", "MAESTRO", "ALUMNO", "JUEZ", "ABOGADO",
  "POLICIA", "BOMBERO", "SOLDADO", "PILOTO", "CHOFER", "PINTO", "ACTOR", "AUTOR", "POETA", "CHEF",
  "PANADERO", "CARNICERO", "FRUTERO", "SASTRE", "MECANICO", "ALBAÑIL", "CARPINTERO", "FONTANERO",
  // Tiempos/Medidas
  "TIEMPO", "HORA", "MINUTO", "SEGUNDO", "DIA", "NOCHE", "MAÑANA", "TARDE", "SEMANA", "MES", "AÑO",
  "SIGLO", "LUNES", "MARTES", "JUEVES", "VIERNES", "SABADO", "DOMINGO", "ENERO", "MARZO", "ABRIL",
  "MAYO", "JUNIO", "JULIO", "AGOSTO", "OCTUBRE", "KILO", "LITRO", "METRO", "CENTIMETRO", "GRAMO",
  // Colores/Formas
  "COLOR", "BLANCO", "NEGRO", "ROJO", "AZUL", "VERDE", "AMARILLO", "ROSA", "GRIS", "MARRON", "NARANJA",
  "VIOLETA", "FORMA", "CIRCULO", "CUADRADO", "RECTO", "CURVO", "ALTO", "BAJO", "LARGO", "CORTO",
  "ANCHO", "ESTRECHO", "GRANDE", "PEQUEÑO", "ENORME", "GIGANTE", "MINUSCULO", "PESADO", "LIGERO",
  // Extras Familiares
  "ABUELO", "ABUELA", "PADRE", "MADRE", "HIJO", "HIJA", "HERMANO", "HERMANA", "TIO", "TIA", "PRIMO",
  "PRIMA", "NIETO", "NIETA", "ESPOSO", "ESPOSA", "NOVIO", "NOVIA", "AMIGO", "AMIGA", "VECINO", "VECINA",
  "NIÑO", "NIÑA", "CHICO", "CHICA", "HOMBRE", "MUJER", "SEÑOR", "SEÑORA", "BEBE", "JOVEN", "VIEJO",
  // Emociones/Valores
  "ALEGRIA", "TRISTEZA", "MIEDO", "ENOJO", "IRA", "SORPRESA", "ASCO", "VERGUENZA", "CULPA", "ORGULLO",
  "ESPERANZA", "FE", "CARIDAD", "PAZ", "JUSTICIA", "BONDAD", "VERDAD", "MENTIRA", "HONESTO", "VALOR",
  "CORAJE", "COBARDIA", "FUERZA", "DEBILIDAD", "PODER", "LIBERTAD", "ESCLAVO", "AMO", "REY", "REINA"
].map(w => w.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Z]/g, "")).filter(w => w.length >= 4 && w.length <= 8);

// === BLOQUE FÁCIL ===
export type EasyMode = 'add' | 'sub' | 'mul' | 'div' | 'mix';

export interface EasyOperation {
  id: string;
  operacion: string;
  resultadoCorrecto: number;
}

export function generateEasyOperation(mode: EasyMode = 'mix'): EasyOperation {
  const operations = ['+', '-', '*', '/'];
  let op = '';
  
  if (mode === 'mix') {
    op = operations[Math.floor(Math.random() * operations.length)];
  } else if (mode === 'add') op = '+';
  else if (mode === 'sub') op = '-';
  else if (mode === 'mul') op = '*';
  else if (mode === 'div') op = '/';
  
  let num1 = 0;
  let num2 = 0;
  let result = 0;

  if (op === '+') {
    num1 = Math.floor(Math.random() * 50) + 1;
    num2 = Math.floor(Math.random() * 50) + 1;
    result = num1 + num2;
  } else if (op === '-') {
    num1 = Math.floor(Math.random() * 50) + 1;
    num2 = Math.floor(Math.random() * 50) + 1;
    if (num2 > num1) { const temp = num1; num1 = num2; num2 = temp; }
    result = num1 - num2;
  } else if (op === '*') {
    num1 = Math.floor(Math.random() * 12) + 2; 
    num2 = Math.floor(Math.random() * 12) + 2;
    result = num1 * num2;
  } else if (op === '/') {
    num2 = Math.floor(Math.random() * 12) + 2;
    result = Math.floor(Math.random() * 12) + 2; 
    num1 = num2 * result; // Aseguramos división de entero exacto
  }

  const id = Math.random().toString(36).substring(7);
  const operacion = `${num1} ${op} ${num2}`;

  return { id, operacion, resultadoCorrecto: result };
}

// === BLOQUE MEDIO ===
export interface GridPosition {
  word: string;
  startRow: number;
  startCol: number;
  endRow: number;
  endCol: number;
}

export interface SearchGridData {
  grid: string[][];
  positions: GridPosition[];
  targets: string[];
  isNumberMode: boolean;
}

export function generateSearchGrid(targets: string[], gridSize: number = 10, isNumberMode: boolean = false, targetCount: number = 6): SearchGridData {
  const grid = Array(gridSize).fill(null).map(() => Array(gridSize).fill(''));
  const positions: GridPosition[] = [];
  const validTargets: string[] = [];
  
  const directions = [
    [0, 1],   // Horizontal
    [1, 0],   // Vertical
    [1, 1],   // Diagonal Descendente
    [-1, 1]   // Diagonal Ascendente
  ];

  for (const target of targets) {
    if (validTargets.length >= targetCount) break;
    const w = target.toUpperCase().replace(/[^A-ZÑ0-9]/g, ""); 
    if (w.length > gridSize || w.length < 4) continue;

    let placed = false;
    
    // 1. Motor Activo de Cruce (Overlapping)
    const anchorPoints: {r: number, c: number, charIndex: number}[] = [];
    for (let i = 0; i < w.length; i++) {
      for (let r = 0; r < gridSize; r++) {
        for (let c = 0; c < gridSize; c++) {
          if (grid[r][c] === w[i]) anchorPoints.push({ r, c, charIndex: i });
        }
      }
    }
    
    for (let i = anchorPoints.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [anchorPoints[i], anchorPoints[j]] = [anchorPoints[j], anchorPoints[i]];
    }

    for (const anchor of anchorPoints) {
      if (placed) break;
      const shuffledDirs = [...directions];
      for (let i = shuffledDirs.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledDirs[i], shuffledDirs[j]] = [shuffledDirs[j], shuffledDirs[i]];
      }
      
      for (const [dr, dc] of shuffledDirs) {
        const row = anchor.r - dr * anchor.charIndex;
        const col = anchor.c - dc * anchor.charIndex;
        const endRow = row + dr * (w.length - 1);
        const endCol = col + dc * (w.length - 1);
        
        if (row < 0 || row >= gridSize || col < 0 || col >= gridSize) continue;
        if (endRow < 0 || endRow >= gridSize || endCol < 0 || endCol >= gridSize) continue;
        
        let canPlace = true;
        for (let i = 0; i < w.length; i++) {
          const r = row + dr * i;
          const c = col + dc * i;
          if (grid[r][c] !== '' && grid[r][c] !== w[i]) {
            canPlace = false;
            break;
          }
        }
        
        if (canPlace) {
          for (let i = 0; i < w.length; i++) grid[row + dr * i][col + dc * i] = w[i];
          positions.push({ word: w, startRow: row, startCol: col, endRow, endCol });
          validTargets.push(target);
          placed = true;
          break;
        }
      }
    }
    
    // 2. Motor Estocástico Libre (Fallback para rellenar vacíos)
    let attempts = 0;
    while (!placed && attempts < 100) {
      attempts++;
      const [dr, dc] = directions[Math.floor(Math.random() * directions.length)];
      const row = Math.floor(Math.random() * gridSize);
      const col = Math.floor(Math.random() * gridSize);
      
      const endRow = row + dr * (w.length - 1);
      const endCol = col + dc * (w.length - 1);
      
      if (endRow < 0 || endRow >= gridSize || endCol < 0 || endCol >= gridSize) continue;
      
      let canPlace = true;
      for (let i = 0; i < w.length; i++) {
        const r = row + dr * i;
        const c = col + dc * i;
        if (grid[r][c] !== '' && grid[r][c] !== w[i]) {
          canPlace = false;
          break;
        }
      }
      
      if (canPlace) {
        for (let i = 0; i < w.length; i++) {
          grid[row + dr * i][col + dc * i] = w[i];
        }
        positions.push({ word: w, startRow: row, startCol: col, endRow, endCol });
        validTargets.push(target);
        placed = true;
        break;
      }
    }
    // Si no entra en 100 intentos libres ni en cruces, la palabra se descarta (continúa al siguiente target)
  }

  const letters = "ABCDEFGHIJKLMNÑOPQRSTUVWXYZ";
  const numbers = "0123456789";
  const pool = isNumberMode ? numbers : letters;

  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      if (grid[r][c] === '') {
        grid[r][c] = pool.charAt(Math.floor(Math.random() * pool.length));
      }
    }
  }

  return { grid, positions, targets: validTargets, isNumberMode };
}

// === BLOQUE DIFÍCIL ===
export interface LatinSquareData {
  initialGrid: (number | null)[][];
  solutionGrid: number[][];
  size: number;
}

export function generateLatinSquare(size: number): LatinSquareData {
  const baseArray = Array.from({ length: size }, (_, i) => i + 1);
  
  const solutionGrid: number[][] = [];
  for (let i = 0; i < size; i++) {
    const row = [];
    for (let j = 0; j < size; j++) {
      row.push(baseArray[(i + j) % size]);
    }
    solutionGrid.push(row);
  }

  // 1. Barajar filas aleatoriamente
  const rowIndices = Array.from({ length: size }, (_, i) => i).sort(() => Math.random() - 0.5);
  const shuffledRowsGrid = rowIndices.map(r => solutionGrid[r]);
  
  // 2. Barajar columnas aleatoriamente
  const colIndices = Array.from({ length: size }, (_, i) => i).sort(() => Math.random() - 0.5);
  const fullyShuffledGrid = shuffledRowsGrid.map(row => colIndices.map(c => row[c]));

  // 3. Re-indexación aleatoria (mapeo o relabeling)
  const remapArray = Array.from({ length: size }, (_, i) => i + 1).sort(() => Math.random() - 0.5);
  const valueMap = new Map<number, number>();
  for (let i = 0; i < size; i++) {
    valueMap.set(i + 1, remapArray[i]);
  }

  const finalSolutionGrid = fullyShuffledGrid.map(row => row.map(val => valueMap.get(val) as number));

  const initialGrid: (number | null)[][] = Array(size).fill(null).map(() => Array(size).fill(null));
  for (let r = 0; r < size; r++) {
    const keepCount = Math.floor(Math.random() * 2) + 1; 
    const colsToKeep: number[] = [];
    while (colsToKeep.length < keepCount) {
      const c = Math.floor(Math.random() * size);
      if (!colsToKeep.includes(c)) colsToKeep.push(c);
    }
    for (const c of colsToKeep) {
      initialGrid[r][c] = finalSolutionGrid[r][c];
    }
  }

  return { initialGrid, solutionGrid: finalSolutionGrid, size };
}

export const DICCIONARIO_GENERAL_ES = [
  'GATO', 'PERRO', 'PAJARO', 'MESA', 'SILLA', 'PUERTA', 'MADRID', 'ROMA', 'PARIS', 
  'MANZANA', 'PERA', 'PLATANO', 'COCHE', 'TREN', 'AVION', 'BARCO', 'LIBRO', 'LAPIZ', 
  'PAPEL', 'AGUA', 'FUEGO', 'TIERRA', 'AIRE', 'SOL', 'LUNA', 'ESTRELLA', 'ARBOL', 
  'FLOR', 'HOJA', 'CASA', 'CALLE', 'CIUDAD', 'PUEBLO', 'VERANO', 'INVIERNO', 'OTOÑO', 
  'PRIMAVERA', 'LUZ', 'SOMBRA', 'BLANCO', 'NEGRO', 'ROJO', 'VERDE', 'AZUL', 'AMARILLO', 
  'CABEZA', 'MANO', 'PIE', 'OJOS', 'BOCA', 'NARIZ', 'OREJA', 'CORAZON', 'SANGRE', 
  'PIEL', 'HUESO', 'CARNE', 'LECHE', 'PAN', 'QUESO', 'VINO', 'CERVEZA', 'SAL', 
  'AZUCAR', 'ORO', 'PLATA', 'HIERRO', 'COBRE', 'MADERA', 'PIEDRA', 'ARENA', 'MAR', 
  'RIO', 'LAGO', 'MONTAÑA', 'VALLE', 'BOSQUE', 'CAMPO', 'CAMA', 'RELOJ', 'ESPEJO', 
  'LLAVE', 'ZAPATO', 'CAMISA', 'PANTALON', 'ABRIGO', 'SOMBRERO', 'LUNES', 'MARTES', 
  'JUEVES', 'VIERNES', 'SABADO', 'DOMINGO', 'ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 
  'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'
];
