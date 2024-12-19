
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
        DATA_MODE=dev
        DATA_PATH=./data/dev/dev.json
        DB_ROOT_DIRECTORY=./data/dev/dev_databases
        DATA_TABLES_PATH=./data/dev/dev_tables.json
        INDEX_SERVER_HOST=localhost
        INDEX_SERVER_PORT=12345
        CHESS_IP_ADDRESS=localhost
        OPENAI_API_KEY=
        GCP_PROJECT=
        GCP_REGION=us-central1
        GCP_CREDENTIALS=
        GOOGLE_CLOUD_PROJECT=
        ```
    - **Create a `.env.local` file** in the root directory with your configuration:
        ```bash
        NEXT_PUBLIC_IP_ADDRESS=
        ```
    - **Install dependencies** (using a virtual environment is recommended) using:
      ```bash
      pip install -r requirements.txt
      ```
    - **Install frontend**
      ```bash
      npm install
      ```
3. **MySQL Database Setup:**
    - **Install MySQL:** If you don't have MySQL installed, follow the instructions for your operating system to install it.
    - **Create the `wtl_employee_tracker` database:**
        - Log in to your MySQL server using a client like the MySQL command-line tool or a GUI tool like MySQL Workbench.
        - Execute the following SQL command to create the database:
        ```sql
        CREATE DATABASE wtl_employee_tracker;
        ```
    - **Import the SQL dump:**
        - You will be provided with a SQL dump file (e.g., `wtl_employee_tracker.sql`).
        - Use the following command to import the SQL dump into the `wtl_employee_tracker` database:
        ```bash
        mysql -u root -p wtl_employee_tracker < wtl_employee_tracker.sql
        ```
        (Replace `wtl_employee_tracker.sql` with the actual name of your SQL dump file. You might need to adjust the username and password if you are not using the root user.)
    - **Configure the database connection in `backend.py`:**
        - Ensure that the `SQLALCHEMY_DATABASE_URI` in your `backend.py` file is correctly configured to connect to your MySQL database. The default configuration is:
        ```python
        app.config['SQLALCHEMY_DATABASE_URI'] = f"mysql+pymysql://root:%40Ljy20020910@localhost/wtl_employee_tracker"
        ```
        - **Important:**
            - Replace `root` with your MySQL username if it's different.
            - Replace `%40Ljy20020910` with your MySQL password. Note that special characters like `@` need to be URL-encoded (e.g., `@` becomes `%40`).
            - If your MySQL server is not running on `localhost`, update the hostname accordingly.
            - If your MySQL server is running on a non-default port, update the port accordingly.
        - **Example with a different user and password:**
        ```python
        app.config['SQLALCHEMY_DATABASE_URI'] = f"mysql+pymysql://myuser:mypassword@192.168.1.100/wtl_employee_tracker"
        ```
4. Start the backend:
    ```bash
    python3 chess-plus/web_interface.py
    python3 backend.py
    node pages/api/frontendServer.js    
    ```

5. Use the integrated chat interface access database:
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
