
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
    - Configure `.env` for API keys and database paths.
    - Install dependencies using:
      ```bash
      pip install -r requirements.txt
      ```

3. Preprocess databases and start the backend:
    ```bash
    sh chess-plus/run/run_preprocess.sh
    python backend.py
    ```

4. Use the integrated chat interface or SQL synthesis tools to execute queries.

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
