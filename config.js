// Shared project constants. The app loads this file and deck/build_deck.py parses it.
// Keep the JSON object valid: the deck builder reads everything after "=".
window.PROJECT_CONFIG = {
  "projectName": "HydROV",
  "expansion": "Remotely Operated Vehicle",
  "tagline": "Water health for people and nature.",
  "closer": "Know where to look.",
  "index": {
    "weights": { "bloom": 40, "temperature": 20, "oxygen": 20, "turbidity": 10, "ph": 10 },
    "watch": 40,
    "high": 70,
    "whoChlorophyll": { "low": 10, "moderate": 50 }
  },
  "alertSeconds": 20,
  "diveSteps": 150,
  "stepMs": 140
};
