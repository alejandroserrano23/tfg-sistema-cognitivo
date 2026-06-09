const baseProverbs = [
  "A buen entendedor, pocas palabras bastan.",
  "No hay mal que por bien no venga.",
  "Al que madruga, Dios le ayuda.",
  "Más vale pájaro en mano que ciento volando.",
  "En boca cerrada no entran moscas.",
  "Más vale tarde que nunca.",
  "Perro ladrador, poco mordedor.",
  "El que mucho abarca poco aprieta.",
  "Vísteme despacio que tengo prisa.",
  "No dejes para mañana lo que puedas hacer hoy.",
  "El hábito no hace al monje.",
  "Quien tiene un amigo, tiene un tesoro.",
  "Ojos que no ven, corazón que no siente."
];

export const proverbiosDelAno: string[] = Array.from({ length: 365 }, (_, i) => baseProverbs[i % baseProverbs.length]);

const baseWords = [
  "ARBOL", "PERRO", "GATOS", "LAPIZ", "FUEGO",
  "AGUAS", "RELOJ", "LIBRO", "SILLA", "MESAS",
  "RATON", "QUESO", "LLAVE", "NUBES", "CIELO",
  "HOJAS", "NIEVE", "PLAYA", "VERDE", "ROJOS",
  "NORTE", "BARCO", "COCHE", "MUNDO", "PIZZA",
  "CANTO", "SALTO", "MARCO", "PARED", "PLATO",
  "TIGRE", "LUNES", "CIUDAD", "CALOR", "COLOR" 
];

// Garantizar que solo haya palabras de exactamente 5 letras para evitar crash
const validWordleWords = baseWords.filter(w => w.length === 5);

export const palabrasWordleDelAno: string[] = Array.from({ length: 365 }, (_, i) => validWordleWords[i % validWordleWords.length]);

export function getDailyIndex(): number {
  // Año base de referencia 2026
  const epoch2026 = new Date(2026, 0, 1).getTime();
  const now = Date.now();
  const diffDays = Math.floor((now - epoch2026) / 86400000);
  
  // Manejo seguro por si se ejecuta en una zona horaria extraña o fecha anterior
  if (diffDays < 0) return Math.abs(diffDays) % 365;
  return diffDays % 365;
}
