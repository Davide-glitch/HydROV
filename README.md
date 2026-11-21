# HydROV

**ROV = Remotely Operated Vehicle.** Water health for people and nature.

HydROV is a small underwater robot that screens water for risks to people and to nature. It dives a route, logs sensor readings with time and depth, builds a risk map and flags suspicious spots. A sample is taken at that exact spot and a lab confirms. We don't claim to detect toxins or bacteria live. We show where to look.

We start with lakes, where one scan takes a morning. Coasts, seas and oceans are the long-term goal. They need salt-water modules and a corrosion-proof, deeper-rated platform.

## What is in this repository

| Folder | What it is |
|---|---|
| `app/` | The demo app. One HTML file, no build step, works offline. |
| `config.js` | Shared constants (project name, index weights and bands). Used by the app and the deck. |
| `arduino/serial_out/` | Arduino sketch that sends the three real sensors over USB. |
| `deck/` | The pitch deck (`deck.pptx`, `deck.pdf`) and the script that builds them. |
| `assets/screenshots/` | Screenshots of the demo app, used on the prototype slide. |

## Simulated data

**Most values in the demo are SIMULATED.** The app generates them, nobody measured them, and the app labels them SIMULATED everywhere they appear. The prototype has three real sensors: temperature (DS18B20), turbidity (a raw analog value, not calibrated yet) and TDS. When the Arduino is connected, only those three readings switch to LIVE. Depth, dissolved oxygen, pH, chlorophyll-a and salinity are planned probes.

The screening index is a weighted heuristic, not yet validated: bloom signal 40, temperature 20, dissolved oxygen 20, turbidity 10, pH 10. Low is under 40, Watch is 40 to 69 and High is 70 and up. The chlorophyll-a anchors come from the WHO guideline values of 10 and 50 µg/L. Screening only. The laboratory confirms.

## Open the demo app

Double-click `app/index.html`. Keep the `app` folder next to `config.js`.

- Press **Start dive**. The lake dive takes about 20 seconds at 1x.
- Switch between **Lake** and **Sea & coast (concept)** at the top. The sea scenario is a concept. The prototype is freshwater.
- **Flag and sample here** marks a sample point. A High reading that nobody acknowledges within 20 seconds triggers a simulated SMS to the manager.
- The **History** tab shows past scans of the same water body, a season trend, a side-by-side comparison and a printable report (Export report, then save as PDF). Scans are kept in this browser only. Cloud sync is planned.

### With the Arduino (real sensors)

Web Serial needs Chrome or Edge and a page served from localhost. From the repository folder:

```
python -m http.server 8000
```

Then open `http://localhost:8000/app/` and choose **Connect Arduino**, then **Connect via USB**. The sketch prints one line per second at 9600 baud:

```
T:21.4,TU:312,TDS:180
```

If USB fails during a demo, the same menu can replay a recorded log file or a built-in sample log. The sample log is labeled as simulated.

Sketch setup: open `arduino/serial_out/serial_out.ino` in the Arduino IDE and install the **OneWire** and **DallasTemperature** libraries. Pin numbers are at the top of the file.

### Screenshots

The app accepts URL options that jump straight to a state, for example `app/index.html?scenario=sea&jump=60&sample=1` or `app/index.html?tab=history`.

## Rebuild the deck

Needs Node.js and Chrome or Edge (for the PDF).

```
cd deck
npm install
node build_deck.js
```

This writes `deck.pptx` and `deck.pdf`, plus `render/slide-N.png` for checking each slide. The speaker notes in the .pptx hold the talk track for each slide.

## How the business works

Customers pay for answers about their water. In order:

1. **Monitoring service**: we deploy, scan, sample and report, per survey or per season.
2. **Maintenance and calibration**: low-cost sensors drift, so calibration is a recurring need.
3. **Data subscription**: every scan builds the history of a water body, with maps, trends and alerts.
4. **Modules and hardware**: later, once validated, including salt-water modules for coasts and seas.

Prices will be set after talks with pilot customers.

## Team

- Carmina-Izabela Crăciun: Founder
- Marina-Adriana Mercioni: Medical Advisor
- Daria Mihalescu: Business Administration
- Rebeca Ciurescu: Electronics Engineer
- Davide Luca-Sfia: Software Architect
