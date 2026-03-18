# BetterCals - Smart Calorie & Health Calculator

A Next.js application that calculates your maintenance calories (TDEE) and provides personalized health insights from blood report data.

## Features

- **TDEE Calculator**: Calculate your Total Daily Energy Expenditure using the Mifflin-St Jeor equation
- **Activity-Based Adjustments**: Factor in your activity level and goals (lose, maintain, gain)
- **Blood Report Analysis**: Upload or manually enter blood marker values
- **Health Scoring**: Get a comprehensive health score across metabolic, cardiovascular, hormonal, and nutritional categories
- **Personalized Insights**: Receive targeted recommendations based on your blood markers
- **Vercel-Ready**: Static export configured for easy deployment

## Tech Stack

- Next.js 14+ with App Router
- TypeScript
- Tailwind CSS
- React Hook Form
- React Dropzone
- Tesseract.js (for OCR - demo mode)
- React Circular Progressbar

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repo-url>
cd bettercals
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

### Building for Production

```bash
npm run build
```

This creates a static export in the `dist` folder, ready for Vercel deployment.

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import the repository in Vercel
3. Deploy!

The `next.config.js` is already configured for static export.

### Other Static Hosts

The `dist` folder contains all static assets. Upload to any static hosting service.

## CodeRabbit Setup (PR Reviews)

This repo includes a starter config at `.coderabbit.yaml`.

1. Install the CodeRabbit GitHub App on your GitHub account/org.
2. Grant access to this repository.
3. Open a pull request (or push a new commit to an open PR).
4. CodeRabbit will automatically review and comment.

### Recommended GitHub Settings

1. In repository settings, enable branch protection for `main`.
2. Add required status checks, including CodeRabbit and your CI checks.
3. Optionally require PRs to be up to date before merging.

### What Is Configured Here

- Auto review is enabled for new PRs.
- Draft PR reviews are disabled.
- Generated folders (`dist`, `node_modules`) and `package-lock.json` are excluded.
- Review tone/profile is set to assertive with concise high-level summaries.

## Blood Markers Supported

- Glucose (fasting)
- HbA1c
- Total Cholesterol
- LDL Cholesterol
- HDL Cholesterol
- Triglycerides
- TSH (Thyroid)
- Vitamin D
- Vitamin B12
- Ferritin
- Serum Iron

## Note on OCR

The blood report upload feature currently runs in demo mode with simulated data. For production use, integrate with:
- Tesseract.js for client-side OCR
- Cloud Vision API or similar for server-side processing
- Medical-grade OCR services for better accuracy

## Disclaimer

BloodWise provides estimates and insights for informational purposes only. Always consult healthcare professionals for medical advice.

## License

MIT
