# Experience Alcohol

A focused Vue app for live drink tracking. Log drinks for one or more people, keep an educational BAC estimate visible, and surface likely experience states as the session unfolds.

## What It Does

- Add and edit people in a live session
- Log standard drinks in real time
- Estimate current BAC from drink history
- Show likely experience-state guidance inline
- Keep the interface mobile-first and fast

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn

## Installation

1. Clone the repository:

```bash
git clone [your-repo-url]
cd alcohol-calculator-vue
```

2. Install dependencies:

```bash
npm install
# or
yarn install
```

3. Start the development server:

```bash
npm run dev
# or
yarn dev
```

4. Open `http://localhost:5173`

## Building for Production

To create a production build:

```bash
npm run build
# or
yarn build
```

The built files will be in the `dist` directory.

## Product Direction

This repo is intentionally scoped to one job: a live drink tracker. Older simulator-style features have been removed so the UI and codebase stay focused.

## Important Notes

This tracker is for educational purposes only. Many factors can affect how alcohol impacts an individual, including:

- Food consumption
- Hydration levels
- Sleep status
- Medications
- Individual metabolism differences
- Overall health

Always drink responsibly and never drive after drinking.

## License

MIT
