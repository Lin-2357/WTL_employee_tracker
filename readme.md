
# Combined SQL Synthesis and Query Writing Integration

This project combines features from two repositories to provide an enhanced system for SQL synthesis with interactive query capabilities. The integration includes a Flask-based backend for managing databases and executing queries, as well as advanced SQL synthesis functionality based on CHESS (Contextual Harnessing for Efficient SQL Synthesis).

## Features
- **SQL Generation**: Generate SQL queries based on natural language inputs.
- **Interactive Chat**: Engage in conversational query sessions, maintaining context across multiple queries.
- **Database Management**: Backend support for executing SQL queries and managing database operations.
- **Enhanced Contextual SQL Synthesis**: Incorporates CHESS components for efficient text-to-SQL translation and query validation.

## Dependencies
- **Backend**: Flask, Flask-JWT-Extended, Flask-SQLAlchemy, Flask-Cors, bcrypt, SQLAlchemy, pymysql, tzlocal.
- **SQL Synthesis**: CHESS framework for text-to-SQL translation.

## Using the System
1. Clone the repository:
    ```bash
    git clone --recurse-submodules https://github.com/Lin-2357/WTL_employee_tracker.git
    cd WTL_employee_tracker
    ```

2. Set up the environment:
    - **Create a `.env` file** in the root directory with your configuration:
        ```bash
        DATA_MODE="dev"
        DATA_PATH="./data/dev/dev.json"
        DB_ROOT_DIRECTORY="./data/dev/dev_databases"
        DATA_TABLES_PATH="./data/dev/dev_tables.json"
        INDEX_SERVER_HOST='localhost'
        INDEX_SERVER_PORT=12345
        CHESS_IP_ADDRESS='localhost'
        OPENAI_API_KEY=
        GCP_PROJECT=''
        GCP_REGION='us-central1'
        GCP_CREDENTIALS=''
        GOOGLE_CLOUD_PROJECT=''
        ```
    - **Create a `.env.local` file** in the root directory with your configuration:
        ```bash
        NEXT_PUBLIC_IP_ADDRESS='your_ip_address'
        ```
    - **Install dependencies** (using a virtual environment is recommended) using:
      ```bash
      pip install -r requirements.txt
      ```
    - **Install frontend**
      ```bash
      npm install
      ```

3. Start the backend:
    ```bash
    python3 chess-plus/web_interface.py
    python3 backend.py
    node pages/api/frontendServer.js    
    ```

4. Use the integrated chat interface access database:
    ```bash
    npm run dev
    ```
    the website will be running at `http://localhost:3001`

## Attribution
This project builds on the CHESS framework for efficient SQL synthesis. If used in research, please cite both this repository and the original CHESS paper:

```bibtex
@article{talaei2024chess,
  title={CHESS: Contextual Harnessing for Efficient SQL Synthesis},
  author={Talaei, Shayan and others},
  journal={arXiv preprint arXiv:2405.16755},
  year={2024}
}
```
