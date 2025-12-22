# DonutBob Visual for Power BI
**DonutBob** è un visual personalizzato per Power BI basato sulla logica dell'Aster Plot, ma potenziato con la flessibilità di un Donut Chart dinamico. Permette di visualizzare dati complessi utilizzando sia la lunghezza del raggio che l'ampiezza dell'arco per rappresentare diverse metriche contemporaneamente.

## Funzionalità
La caratteristica principale di questa versione è il nuovo switch Aster Type, che permette di cambiare la modalità di rendering del grafico con un solo clic:

1. Modalità Aster Plot (Aster Type: ON)
    - Profondità (Raggio): Proporzionale alla prima misura (Y[0]).
    - Larghezza (Arco): Proporzionale alla seconda misura (Y[1]). Se non presente, le fette hanno larghezza uguale.
    - Uso ideale: Quando vuoi evidenziare discrepanze tra due metriche (es. Volume vs Profitto).2
2. Modalità Donut Dinamico (Aster Type: OFF)
    - Profondità (Raggio): Fissa e uniforme per tutte le fette (effetto Donut classico).
    - Larghezza (Arco): Proporzionale alla misura principale (Y[0]).
    - Uso ideale: Quando vuoi un grafico circolare pulito dove l'arco rappresenta il peso percentuale del dato, mantenendo però la struttura estetica dell'Aster Plot.

## Dettagli Tecnici

Il visual è sviluppato in TypeScript utilizzando la libreria D3.js (v3).

### Logica di Rendering

Il cuore della trasformazione risiede nel dataRenderService.ts. Il visual gestisce il mapping dinamico dei dati nel metodo getConvertedData:


```typeScript
// Esempio della logica implementata
const sliceWidth = isAsterMode 
    ? (yCols.length > 1 ? <number>yCols[1].values[i] : 1)
    : <number>yCols[0].values[i];
```

## Configurazione Campi

Per sfruttare appieno il visual, trascina i campi nei seguenti bucket:

. Category: La dimensione da visualizzare (es. Nome Prodotto).
. Y-Axis (Score): La misura principale che controlla la lunghezza (in modalità Aster) o l'arco (in modalità Donut).
. Width (Opzionale): La misura che controlla la larghezza dell'arco solo in modalità Aster.

## Impostazioni del Formato

All'interno del pannello "Formato" di Power BI troverai:

. Shape: Contiene lo switch Aster Type per alternare le modalità.
. Outer Line: Opzioni per mostrare o nascondere i cerchi di riferimento (Ticks) sullo sfondo.
. Legend: Supporto completo per la legenda nativa di Power BI.
. Labels: Etichette di dettaglio personalizzabili.

## Sviluppo e Installazione

Se vuoi compilare il visual localmente:

Clona il repository:

``` bash
git clone https://github.com/langworr/PowerBi-visual-DonutBob.git
```

Installa le dipendenze:

```bash
npm install
```

Avvia il server di sviluppo:

```bash
pbiviz start
```

## TODO

- Adjust all default colors and font size values
- Colori di default che prendano quello del tema
- Check Zero as Blank

Autore: Roberto Donaglia

Licenza: MIT