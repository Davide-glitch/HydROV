// Sends the three real prototype sensors over USB serial, once per second.
// Output line format, read by the demo app (Connect Arduino):
//   T:21.4,TU:312,TDS:180
// T   = water temperature in degrees C (DS18B20)
// TU  = turbidity, raw analog reading (not calibrated)
// TDS = total dissolved solids in ppm (estimate, temperature compensated)
//
// Libraries: OneWire, DallasTemperature (install from the Library Manager).
// Board: Arduino Uno R4 Minima (also works on an Uno R3).

#include <OneWire.h>
#include <DallasTemperature.h>

// ---- pins and settings ----
const int PIN_DS18B20 = 2;         // DS18B20 data pin (4.7k pull-up to 5 V)
const int PIN_TURBIDITY = A0;      // turbidity module analog out
const int PIN_TDS = A1;            // TDS module analog out
const float ADC_VREF = 5.0;        // analog reference voltage
const int ADC_BITS = 10;           // 10 = 0..1023. The R4 can use 12 or 14.
const unsigned long PERIOD_MS = 1000;
const long BAUD = 9600;            // must match the app (9600)
const int SAMPLES = 10;            // readings averaged per value

OneWire oneWire(PIN_DS18B20);
DallasTemperature tempSensor(&oneWire);
unsigned long lastSend = 0;

int readAveraged(int pin) {
  long sum = 0;
  for (int i = 0; i < SAMPLES; i++) {
    sum += analogRead(pin);
    delay(2);
  }
  return (int)(sum / SAMPLES);
}

float rawToVolts(int raw) {
  return raw * ADC_VREF / ((1L << ADC_BITS) - 1);
}

// Common TDS module conversion with temperature compensation to 25 C.
float tdsPpm(float volts, float tempC) {
  float k = 1.0 + 0.02 * (tempC - 25.0);
  float v = volts / k;
  float ppm = (133.42 * v * v * v - 255.86 * v * v + 857.39 * v) * 0.5;
  return ppm < 0 ? 0 : ppm;
}

void setup() {
  Serial.begin(BAUD);
#if defined(ARDUINO_UNOR4_MINIMA) || defined(ARDUINO_UNOR4_WIFI)
  analogReadResolution(ADC_BITS);
#endif
  tempSensor.begin();
}

void loop() {
  unsigned long now = millis();
  if (now - lastSend < PERIOD_MS) return;
  lastSend = now;

  tempSensor.requestTemperatures();
  float tempC = tempSensor.getTempCByIndex(0);
  bool tempOk = tempC > -100.0;          // -127 means no sensor found
  float tempForTds = tempOk ? tempC : 25.0;

  int turbRaw = readAveraged(PIN_TURBIDITY);
  int tdsRaw = readAveraged(PIN_TDS);
  float tds = tdsPpm(rawToVolts(tdsRaw), tempForTds);

  if (tempOk) {
    Serial.print("T:");
    Serial.print(tempC, 1);
    Serial.print(",");
  }
  Serial.print("TU:");
  Serial.print(turbRaw);
  Serial.print(",TDS:");
  Serial.println((int)(tds + 0.5));
}
