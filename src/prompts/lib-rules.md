Always use the following libraries as the default stack before planning or implementation:

State Management:

- @reduxjs/toolkit
- react-redux

Server State / Data Fetching:

- @tanstack/react-query

Forms:

- @tanstack/react-form

Tables / Data Grid:

- @tanstack/react-table

Icons:

- lucide-react

Data Visualization:

- d3 (+ @types/d3 for TypeScript)

Do NOT propose alternatives unless explicitly asked.

Before generating code, you must:

1. Break down the feature requirements
2. Map each part to the required library:

   - Global state → Redux Toolkit
   - API calls → React Query
   - Forms → React Form
   - Tables → React Table
   - Charts → D3
   - Icons → Lucide
3. Only then proceed to implementation
