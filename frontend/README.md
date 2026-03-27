# Chaldal Frontend

A React-based frontend for the Chaldal CSE 2102 project that fetches data from the backend API.

## Features

- Display products from the backend API
- Display categories from the backend API
- Responsive design with modern styling
- Error handling and loading states
- Easy API integration using axios

## Installation

1. Navigate to the frontend folder:

   ```bash
   cd frontend
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Create a `.env` file based on `.env.example`:

   ```bash
   cp .env.example .env
   ```

4. Update `.env` if your backend is running on a different port:
   ```
   REACT_APP_API_URL=http://localhost:5000
   ```

## Running the Application

Start the development server:

```bash
npm start
```

The app will open at `http://localhost:3000`

## Building for Production

```bash
npm run build
```

This creates a production-ready build in the `build` folder.

## Project Structure

```
frontend/
├── public/
│   └── index.html
├── src/
│   ├── components/
│   │   ├── ProductCard.js
│   │   ├── ProductList.js
│   │   ├── CategoryCard.js
│   │   └── CategoryList.js
│   ├── pages/
│   │   ├── ProductsPage.js
│   │   └── CategoriesPage.js
│   ├── services/
│   │   └── api.js
│   ├── styles/
│   │   ├── Card.css
│   │   ├── List.css
│   │   └── Page.css
│   ├── App.js
│   ├── App.css
│   └── index.js
├── package.json
└── README.md
```

## API Integration

The frontend communicates with the backend API through `src/services/api.js`. Currently supported endpoints:

- `GET /api/products` - Fetch all products
- `GET /api/categories` - Fetch all categories

To add more endpoints, update the `api.js` file with new functions.

## Dependencies

- **React** - UI library
- **Axios** - HTTP client for API requests
- **React Scripts** - Build and development tools
