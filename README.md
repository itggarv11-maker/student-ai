# StuBro AI - Vite + React Project

This project has been refactored to use Vite, a modern build tool that provides a fast development experience and bundles your code for production.

## Running the Project Locally

### 1. Install Dependencies
First, you need to install the necessary packages defined in `package.json`. Open your terminal in the project root and run:
```bash
npm install
```

### 2. Set Up Your Environment Variable
The application uses the Google Gemini API, which requires an API key.

- Create a new file named `.env.local` in the root of the project.
- Inside this file, add your API key like this:

```
VITE_API_KEY=YOUR_GEMINI_API_KEY_HERE
```
Replace `YOUR_GEMINI_API_KEY_HERE` with your actual key. Vite will automatically load this variable.

### 3. Run the Development Server
To start the app in development mode, run:
```bash
npm run dev
```
This will start a local server, typically at `http://localhost:5173`. The app will automatically reload if you make changes to the source files.

## Building for Production

To create a production-ready build of your app, run:
```bash
npm run build
```
This command will create a `dist` folder in the project root. This folder contains the optimized, static files that you can deploy to any web hosting service.

## Deployment Instructions for Netlify

Follow these steps to deploy your site correctly.

1.  **Connect Your Git Repository:** Connect your project's Git repository (e.g., from GitHub) to a new site on Netlify.

2.  **Set Build Settings:** Netlify should automatically detect that this is a Vite project. If it doesn't, use these settings:
    - **Build command:** `npm run build`
    - **Publish directory:** `dist`

3.  **Set Your API Key (CRITICAL STEP):**
    - In your Netlify site dashboard, go to **Site settings > Build & deploy > Environment**.
    - Click **"Edit variables"** and add a new environment variable.
    - **Key:** `VITE_API_KEY`
    - **Value:** `YOUR_GEMINI_API_KEY_HERE` (Paste your key here)
    - Save the variable.

4.  **Deploy:** Trigger a new deploy from the "Deploys" tab. Netlify will now build your project from the source code and deploy the optimized `dist` folder. The `public/_redirects` file is already included, so client-side routing will work perfectly.
