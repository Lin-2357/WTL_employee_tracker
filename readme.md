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
- **Frontend**: Node.js and npm

## Using the System
1. Clone the repository with submodules:
    ```bash
    git clone --recurse-submodules https://github.com/Lin-2357/WTL_employee_tracker.git
    cd WTL_employee_tracker
    ```

2. Set up Python virtual environment:
    ```bash
    python3 -m venv mooc_test
    source mooc_test/bin/activate
    pip install -r requirements.txt
    ```

3. Install frontend dependencies:
    ```bash
    npm install
    ```

4. Configure environment files:
    - **Create a `.env` file** in the root directory with your configuration:
        ```
        CHESS_IP_ADDRESS=localhost
        DB_PASSWORD=your_database_password
        LLM_API_KEY=your_llm_api_key
        ```
    
    - **Create a `.env.local` file** in the root directory:
        ```
        NEXT_PUBLIC_IP_ADDRESS=localhost
        ```
        
    - **Configure CHESS environment:**
        - Navigate to the chess-plus directory
        - Copy the template file:
            ```bash
            cd chess-plus
            cp dotenv_copy .env
            ```
        - Edit the `.env` file to add your configuration:
            ```bash
            nano .env
            ```
            Configure with these settings:
            ```
            # Configuration for CHESS
            DB_ROOT_PATH="./data/dev"  # this directory should be the parent of test_databases
            DATA_MODE="dev"
            DATA_PATH="./data/dev/dev.json"
            DB_ROOT_DIRECTORY="./data/dev/dev_databases"
            DATA_TABLES_PATH="./data/dev/dev_tables.json"
            INDEX_SERVER_HOST='localhost'
            INDEX_SERVER_PORT=12345

            # API Keys and Cloud Configuration
            OPENAI_API_KEY=your_openai_api_key
            GCP_PROJECT=your_gcp_project
            GCP_REGION=us-central1
            GCP_CREDENTIALS=path_to_credentials.json
            GOOGLE_CLOUD_PROJECT=your_gcp_project
            ANTHROPIC_API_KEY=your_anthropic_api_key
            GOOGLE_API_KEY=your_google_api_key
            ```

5. **MySQL Database Setup:**
    - **Install MySQL:** If you don't have MySQL installed, follow the instructions for your operating system to install it.
    - **Create the `wtl_employee_tracker` database:**
        ```sql
        CREATE DATABASE wtl_employee_tracker;
        ```
    - **Import the SQL dump:**
        ```bash
        mysql -u root -p wtl_employee_tracker < wtl_employee_tracker.sql
        ```
    - **Configure database connection** in `backend.py`:
        ```python
        app.config['SQLALCHEMY_DATABASE_URI'] = f"mysql+pymysql://root:{pwd}@localhost/wtl_employee_tracker"
        ```

6. Start the application (requires 4 terminal windows, all in the project root directory):

    Terminal 1 - Backend server:
    ```bash
    source mooc_test/bin/activate
    python3 backend.py
    ```

    Terminal 2 - Frontend development server:
    ```bash
    npm run dev
    ```

    Terminal 3 - Frontend API server:
    ```bash
    node pages/api/frontendServer.js
    ```

    Terminal 4 - CHESS interface:
    ```bash
    source mooc_test/bin/activate
    cd chess-plus
    python3 web_interface.py
    ```

    The website will be running at `http://localhost:3000`

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