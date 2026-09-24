# 🚌 YATHRI (യാത്രി / यात्री)
> *Your journey, simply explained.*

Yathri is a deterministic, multilingual, voice-interactive public transit journey planner and fare estimator for Kochi, powered by official GTFS transit data and Kerala Motor Vehicles Department (MVD) fare models.

---

## ✨ Features

- 📍 **Deterministic Route Engine**: Sequential stop-by-stop journey calculation using official Kochi GTFS data without hallucinations.
- 💰 **Kerala MVD Fare Estimation**: Configurable stage-carriage fare model based on published Kerala MVD rules (Base ₹10 for 2.5 km + ₹1.00/km).
- 🌐 **Multilingual Support**: Real-time language switching and native transit search across **English**, **Malayalam (മലയാളം)**, and **Hindi (हिन्दी)**.
- 🎙️ **Voice Interaction**:
  - **Speech-to-Text**: Natural voice queries using the Web Speech API in `en-IN`, `ml-IN`, and `hi-IN` (e.g. *"തൃപ്പൂണിത്തുറയിൽ നിന്ന് ഇൻഫോപാർക്കിലേക്ക് പോകണം"*).
  - **Text-to-Speech**: Spoken audio instructions via browser `SpeechSynthesis`.
- 📱 **Clean Mobile-First UI**: Modern glassmorphic interface with clear status, distance, fare indicators, and ordered stop sequences.

---

## 🛠️ Tech Stack

- **Framework**: Next.js 14 (App Router, Server Actions)
- **Frontend**: React 18, Vanilla CSS (Glassmorphism & Responsive Design)
- **Engine**: TypeScript, Deterministic Graph/Sequential GTFS Matching
- **Speech**: Browser Web Speech API (`SpeechRecognition` & `SpeechSynthesis`)

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ installed

### Installation

1. Clone the repository:
   ```bash
   git clone <your-repository-url>
   cd yathri
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Running Tests

Yathri comes with a comprehensive test suite for route matching, fare calculation, and multilingual voice parsing:

```bash
# Run all test suites
npx ts-node -O '{"module":"commonjs"}' tests/engine.test.ts
npx ts-node -O '{"module":"commonjs"}' tests/fare.test.ts
npx ts-node -O '{"module":"commonjs"}' tests/multilingual.test.ts
```

---

## 📁 Project Structure

```
├── data/
│   └── gtfs/               # Kochi GTFS files (routes, stops, trips, stop_times)
├── src/
│   ├── app/                # Next.js App Router (UI & Server Actions)
│   ├── data/
│   │   ├── fareStages.json        # Kerala MVD Fare Rules Configuration
│   │   ├── stopTranslations.json  # Multilingual Stop Name & Alias Registry
│   │   └── uiTranslations.json    # Localized UI Strings (EN, ML, HI)
│   └── engine/
│       ├── routeEngine.ts         # GTFS Loader and Indexing
│       ├── journeyEngine.ts       # Deterministic Route Solver
│       ├── fareEngine.ts          # Haversine Distance & Fare Calculation
│       └── languageEngine.ts      # Multilingual Normalizer & Intent Resolver
└── tests/                  # Test Suites (Route, Fare, Multilingual & Voice)
```
