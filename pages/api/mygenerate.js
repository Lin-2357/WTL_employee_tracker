const { Configuration, OpenAIApi } = require("openai");
require('dotenv').config();
const apiKey = process.env.OPENAI_API_KEY;

const configuration = new Configuration({
  apiKey: apiKey,
});
const openai = new OpenAIApi(configuration);

const basePrompt = `You are an intelligent assistant that can generate SQL queries based on questions about an employee database. The database consists of two tables:

1. "employee" table with the following columns: [uuid, name, alias, department, subdepartment, position, salary], contains employee information
2. "team" table with the following columns: [uuid, name], for now team name is the index of the project (not uuid, but may be searched for as “项目编号”)
3. "team_assignment" table with the following columns: [uuid, team_id, employee_id], representing the many to many relationship between team and employee, both team_id and employee_id are foreign keys representing uuid in the respective table.
4. "project" table with the following columns: [uuid, name, team_id, address, type, area, sign_date, expected_completion_date, revenue, revenue_note, client_id], contains weekly report made in week num by employee id, client_id and team_id are foreign keys referring to uuid in client and team table respectively.
5. "client" table with the following columns: [uuid, name, source, company, contact, background, description]
6. "work_hour" table with the following columns: [uuid, is_reversed, stage, task_description, is_standardized, project_id, employee_id, hour, start_date, end_date]

start_date refers to the date of starting day of the week, it is a string in yyyy/mm/dd (or yyyy/m/dd, yyyy/mm/d, yyyy/m/d if there are leading zeros), so convert any other date format to this, this week is week 10, it started on 2024-09-04.
always use name LIKE '%some name%' OR alias LIKE '%some name%' statement for searching names, use LIKE for positions and any string related queries
for queries related to department use department LIKE '%some input%' OR subdepartment LIKE '%some input%'
project id or 项目编号 if used in prompt refer to the team_name of the team that did the project, instead of the uuid of the project.
projects and work_hour can be joined on work_hour.project_id = project.uuid if queries for employee performance

If the prompt can be answered by querying the database, respond with a SQL query starting with "SQL:". If the prompt cannot be answered due to missing data or columns not present in the database, respond with an error message starting with "ERR:" and explain which part of the prompt cannot be answered.`
module.exports = async function (req) {
  if (!configuration.apiKey) {
    return {
      error: "OpenAI API key not configured, please follow instructions in README.md",
    };
  }

  const animal = req.animal || '';
  if (animal.trim().length === 0) {
    return {
      error: "Prompt not detected",
    };
  }

  try {
    const completion = await openai.createChatCompletion({
      model: "gpt-4o",
      messages: [
        {role: "system", content: basePrompt},
        {role: "user", content: "Find the email addresses of all employees in the Sales department"},
        {role: "assistant", content: "SQL: SELECT email FROM employees WHERE department = 'Sales';"},
        {role: "user", content: "Find the total revenue of all employees"},
        {role: "assistant", content: "ERR: The prompt asks for total revenue, but the database does not contain a column for revenue."},
        {role: "user", content: `${animal}`}
      ],
    });
    console.log(completion['data'].choices[0].message['content']);
    return ({ result: completion.data.choices[0].message['content'] });
  } catch(error) {
    // Consider adjusting the error handling logic for your use case
    if (error.response) {
      console.error(error.response.status, error.response.data);
      return {
        error: "Error with OpenAI API request: ${error.message}",
      };
    } else {
      console.error(`Error with OpenAI API request: ${error.message}`);
      return {
        error: "Error with OpenAI API request: ${error.message}",
      };
    }
  }
}
