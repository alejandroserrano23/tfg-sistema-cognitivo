/// <reference types="cypress" />

describe("Simulación E2E - Flujo Completo Mario Lopez", () => {
  
  beforeEach(() => {
    // Interceptar la hidratación para iniciar con un lienzo limpio de LocalStorage
    cy.clearLocalStorage();
    cy.visit("/");
  });

  it("Debe registrar paciente, fallar en matemáticas, interactuar con la sopa y registrar métricas", () => {
    
    // =========================================================================
    // PASO 1: ABRIR PORTAL DEL CUIDADOR Y LOGEARSE
    // =========================================================================
    cy.contains("button", "⚙️ PORTAL").click();
    cy.get('input[type="password"]').type("1234");
    cy.contains("button", "ENTRAR").click();

    // =========================================================================
    // PASO 2: RELLENAR FORMULARIO MARIO LOPEZ
    // =========================================================================
    cy.contains("label", "Nombre").next("input").type("Mario Lopez");
    cy.contains("label", "Nivel").next("select").select("moderado");
    cy.contains("button", "GUARDAR PACIENTE").click();

    // Comprobar que aparece en la lista de pacientes registrados
    cy.contains("p", "Mario Lopez").should("exist");
    
    // =========================================================================
    // PASO 3: BLOQUE FÁCIL (MATEMÁTICAS) - SIMULAR 3 FALLOS CONSECUTIVOS
    // =========================================================================
    // Cerramos el portal
    cy.contains("button", "Volver").click();
    
    // Iniciamos sesión de matemáticas
    // Al ser un diseño Bento, el botón inicial es Jugar en el Bloque Fácil
    cy.contains("h3", "Bloque Fácil").parent().parent().find("button").contains("Jugar").click();
    // Luego elegimos la modalidad Sumas
    cy.contains("button", "Sumas").click();

    // El sistema nos muestra 4 opciones. Buscamos y clickeamos la INCORRECTA 3 veces
    // para forzar el evento de derrota (limite de 3 intentos).
    cy.get('.text-3xl.font-black').invoke('text').then((text) => {
      const match = text.match(/(\d+)\s*\+\s*(\d+)/);
      if (match) {
        const correctAns = parseInt(match[1]) + parseInt(match[2]);
        
        const clickWrongAnswer = () => {
          cy.get('button.h-16').each(($btn) => {
            if ($btn.text().trim() !== correctAns.toString()) {
              cy.wrap($btn).click();
              return false; // Break out of each
            }
          });
        };

        // Fallo 1
        clickWrongAnswer();
        cy.wait(2600); // Esperar a que la UI limpie el rojo
        
        // Fallo 2
        clickWrongAnswer();
        cy.wait(2600);
        
        // Fallo 3 (Derrota Definitiva - Registra onRecordResult)
        clickWrongAnswer();
        cy.contains("Has fallado 3 veces").should("exist");
        
        // Esperamos a que pase al siguiente (3000ms según el código)
        cy.wait(3100); 
      }
    });

    // =========================================================================
    // PASO 4: BLOQUE MEDIO (SOPA DE LETRAS) - INTERACCIÓN BÁSICA
    // =========================================================================
    // Salimos de matemáticas
    cy.contains("button", "VOLVER AL MENÚ").click();
    
    // Entramos a Sopa de Letras
    cy.contains("button", "Jugar Letras").click();
    cy.contains("OBJETIVOS").should("exist");

    // Simulamos encontrar una palabra haciendo clic y arrastrando.
    // Dado que el tablero es aleatorio, simplemente trazamos una línea horizontal en la fila 1
    // para comprobar que el motor geométrico responde visualmente a la interacción del ratón.
    cy.get('button[aria-label^="Fila 1, Columna 1"]').click();
    cy.get('button[aria-label^="Fila 1, Columna 4"]').click();
    
    // Validamos que el sistema la haya procesado (aunque sea errónea, la UI no crashea)
    // El motor resaltará en rojo durante 1500ms si es incorrecto.
    cy.wait(1600);

    // =========================================================================
    // PASO 5: AUDITORÍA EN PORTAL DEL CUIDADOR
    // =========================================================================
    cy.contains("button", "VOLVER AL MENÚ").click();
    
    // Entramos al portal para ver el historial
    cy.contains("button", "⚙️ PORTAL").click();
    cy.get('input[type="password"]').type("1234");
    cy.contains("button", "ENTRAR").click();

    // Seleccionamos a Mario Lopez para desplegar sus métricas
    cy.contains("p", "Mario Lopez").click();

    // ASSERTIONS FINALES: Debe haber 1 partida registrada (la derrota de matemáticas)
    // con 0% de éxito y 3 errores acumulados en el bloque fácil.
    cy.contains("Totales: 1").should("exist");
    cy.contains("Éxito: 0%").should("exist");
    cy.contains("Err Fácil: 3").should("exist");
  });
});
