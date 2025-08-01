# Ed Discussion Extractor

This small React app lets you load an export from Ed Discussion in JSON format and convert it into HTML, CSV, or TXT files. It runs locally using [Vite](https://vitejs.dev/) so you only need Node.js installed.

## Setup

1. Install dependencies
   ```bash
   npm install
   ```

2. Start the development server
   ```bash
   npm run dev
   ```

   The app will open in your default browser. Drop a JSON export file onto the page and follow the steps.

3. To build a production bundle
   ```bash
   npm run build
   ```

The generated files are placed in the `dist` directory.

## JSON Format
The JSON should be an array where each item represents a discussion with optional nested answers and comments. The fields used are:

- `number`: discussion identifier
- `title`: question title
- `text`: question body
- `category` / `subcategory`
- `comments`: array of objects with `text`
- `answers`: array of objects with `text` and optional `comments`

This matches the structure exported from Ed Discussion.
