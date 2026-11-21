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

## Start the demo app

One command, from the repository folder (needs Python 3):

```
python start.py
```

It starts a small server on `http://127.0.0.1:8000/app/` (localhost only, the next free port if 8000 is taken) and opens the app in Chrome or Edge. Everything works from there, including **Connect Arduino**. Press Ctrl+C to stop. On Windows you can also double-click `start.cmd`. The server only hands out the app and `config.js`, nothing else in the folder.

Without Python, double-click `app/index.html`. Everything works except Connect Arduino. Keep the `app` folder next to `config.js`.

- Press **Start dive** (or the space bar). The lake dive takes about 20 seconds at 1x.
- Switch between **Lake** and **Sea & coast (concept)** at the top. The sea scenario is a concept. The prototype is freshwater.
- **Advice for** picks who reads the result: a lake or bathing-water manager, a fish or shellfish farm, or a drinking-water operator. The suggested action changes to fit. The lab confirms and the manager decides.
- **Flag and sample here** marks a sample point. A High reading that nobody acknowledges within 20 seconds triggers a simulated SMS to the manager.
- The **History** tab shows past scans of the same water body, a season trend, a side-by-side comparison and a printable report (Export report, then save as PDF). Scans are kept in this browser only. Cloud sync is planned.

### With the Arduino (real sensors)

Start the app with `python start.py`, then choose **Connect Arduino**, then **Connect via USB**. The sketch prints one line per second at 9600 baud:

```
T:21.4,TU:312,TDS:180
```

If USB fails during a demo, the same menu can replay a recorded log file or a built-in sample log. The sample log is labeled as simulated.

Sketch setup: open `arduino/serial_out/serial_out.ino` in the Arduino IDE and install the **OneWire** and **DallasTemperature** libraries. Pin numbers are at the top of the file.

### Screenshots

The app accepts URL options that jump straight to a state, for example `app/?scenario=sea&jump=60&sample=1`, `app/?profile=water&jump=80` or `app/?tab=history`.

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

## Sources and reference standards

- European Environment Agency, *European bathing water quality in 2025*: 78% of inland and 88% of coastal bathing waters rated excellent.
- WHO guideline values for cyanobacteria in recreational water (chlorophyll-a anchors of 10 and 50 µg/L).
- EU Directive 2008/105/EC on environmental quality standards for priority substances in water.
- EU food safety rules on marine biotoxins in shellfish.
- Romanian Order 161/2006 (MMGA) on the classification of surface water quality, and the official reports of the National Administration "Romanian Waters" (ANAR).
- Limnology literature and aquaculture guidelines.

These standards are what lab results are read against. The demo app does not measure any of these substances.

## Team

- Carmina-Izabela Crăciun: Founder
- Rebeca Ciurescu: Electronics Engineer
- Davide Luca-Sfia: Software Architect
- Marina-Adriana Mercioni: Medical Advisor
- Daria Mihalescu: Business Administration
