# Query Writing Integration with LLM

This project provides a backend and frontend setup to integrate a query-generating LLM. The backend is implemented in Python using Flask, and the frontend is a Node.js server.

## Project Setup

### Backend
The backend is a Flask application that manages the database and query execution.

1. Install dependencies:
   ```
   pip install -r requirements.txt
   ```

2. Run the backend server on port 8888:
    ```
    python backend.py
    ```

### Frontend
The frontend is a Node.js server that interacts with the LLM for query generation.

1. Install dependencies:

    ```
    npm install
    ```

2. Run the frontend server on port 4000:

    ```
    node pages/api/frontendServer.js
    ```

3. Run the React app:

    ```
    npm run dev
    ```

## How to Replace Query Generation Logic

The current setup calls a placeholder function (myGenerate) for generating queries. Replace this function with your LLM API integration.

### Existing Code

```
const result = await myGenerate({ animal: generateInput });
```

### Replace with LLM Integration

Replace the above line with your API call to the query-generating LLM. The response must be in the format:

```
{
  "result": "SELECT * FROM ..."
}
```

Example:

```
const axios = require('axios');

const result = await axios.post('https://your-llm-api-endpoint.com/generate', {
  prompt: generateInput,
  apiKey: process.env.LLM_API_KEY // Use API key from .env file
});
```

