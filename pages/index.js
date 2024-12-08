import Head from "next/head";
import { useState } from "react";
import styles from "./index.module.css";

function displayObj(obj) {
  return JSON.stringify(obj)
}

export default function Home() {

  const IP = process.env.NEXT_PUBLIC_IP_ADDRESS;
  const basePrompt = "\n If the prompt ask about GS/ISS projects search from team name. If the prompt ask about subdepartment, query with group by (department, subdepartment). If the prompt ask about average work hour, it is average across all associated employee not report. If the prompt specifies time, filter from start_date in work_hour unless otherwise specified, for reference today's date is "+(new Date().toLocaleString()) + "\n If the prompt ask about the timespan of a project, it is calculated as (TO_DAYS(MAX(work_hour.end_date)) - TO_DAYS(MIN(work_hour.start_date)))/30 using the TO_DAYS function in mysql and convert it to month" + "\n If the prompt ask about labor cost of a project for an indivial, it is calculated as the [work_hour.hour spent on project] / [work_hour.hour in total within the timespan] * [timespan in month] * [employee.salary of the person]. For labor cost of a project it is the labor cost of that project for each individuals summed across all person involved in the project."

  const [animalInput, setAnimalInput] = useState("");
  const [result, setResult] = useState([]);
  const [popup, setPopup] = useState(true);
  const [inputPopup, setInputPopup] = useState(false);
  const [is_reversed, setReversed] = useState([false]);
  const [is_standardized, setStandardized] = useState([true]);
  const [project, setProject] = useState([""]);
  const [hours, setHours] = useState([""]);
  const [keywords, setKeywords] = useState([""]);
  const [instruction, setInstruction] = useState('describe what you have done this week!');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [session_id, setSessionID] = useState('');
  const [stage, setStage] = useState([''])

  function addResult(message, client=false) {
    setResult((prevresult)=>{return [{message: message, client: client}, ...prevresult]})
  }

  function renderResult() {
    return result.map(
      (v, i) => {
        return <div key={i} style={{marginBottom: 15, padding: 10, marginLeft: (v.client ? 'auto': 0), width: '60%', backgroundColor: (v.client? "#10a37f" : "#bec0be"), borderRadius: '5px'}}>{v.message}</div>
      }
    )
  }

  async function generate(event) {
    event.preventDefault();
    addResult(animalInput, true);
    addResult("Creating queries...")
    if (!session_id) {
      alert("please create session first.");
      return
    }

    var prt = animalInput;
    console.log(prt);
    const jwtToken = sessionStorage.getItem('jwtToken'); // Retrieve the token from session storage
    if (!jwtToken) {
      throw new Error("No token found. Please log in.");
    }

    try {

      const from = await fetch("http://"+IP+":8888/validate", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${jwtToken}` // Add the token to the Authorization header
        },
      });
      if (from.status !== 200) {
        addResult("Log in expired, please re-login.")
        return
      }
      const from_id = await from.json();

      if (!from_id.id) {
        addResult("Log in expired, please re-login.")
        return
      }

      prt = prt + basePrompt;


      var response = await fetch("http://"+IP+":4000/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt: prt, session: session_id, user_id: from_id.id }),
      });

      var data = await response.json();
      console.log(data)

      if (response.status === 400) {
        alert("session expired, please reset your session.")
        return
      }
      else if (response.status !== 200 || (!data.result.sql_query) || (!data.result.sql_query.includes("SELECT"))) {
        addResult("CHESS model failed, trying backup model...");
        response = await fetch("http://"+IP+":4000/backup", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ prompt: prt }),
        });
          
        data = await response.json();
        if (!data.result || (!data.result.includes("SELECT"))) {
          addResult(data.result || "Query generation failed.")
        }
      } else {
        data = {result: data.result.sql_query}
      }
        addResult("loading data...");

        const dat = await fetch("http://"+IP+":8888/query", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${jwtToken}` // Add the token to the Authorization header
          },
          body: JSON.stringify({ query: data.result }),
        });

        if (dat.status === 500) {
          addResult("query execution unsuccessful.")
          return
        } else if (dat.status === 400) {
          addResult("AI model failed to generate a query.")
          return
        } else if (dat.status === 401) {
          addResult("Log in expired, please re-login.")
          return
        } else if (dat.status !== 200) {
          throw dat.error || new Error(`Request failed with status ${dat.status}`);
        }
        const dat2 = await dat.json();
        console.log(dat2)

        addResult("interpreting result...")
        const interpretation = await fetch("http://"+IP+":4000/interpret", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ prompt: prt, response: displayObj(dat2) }),
        });
        const out = await interpretation.json()
        addResult(out.result);

      
    } catch(error) {
      // Consider implementing your own error handling logic here
      console.error(error);
      alert(error.message);
    }
  }

  async function populate(i) {
    try {
      const jwtToken = sessionStorage.getItem('jwtToken'); // Retrieve the token from session storage

      const interpretation = await fetch("http://"+IP+":8888/populate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${jwtToken}`
        },
        body: JSON.stringify({ name: project[i] }),
      });
      const out = await interpretation.json()
      console.log(out)
      
      if (out.length > 0) {
        if (out.length === 1) {
          setInstruction("Project found")
          setProject([...project.slice(0, i), out[0].id, ...project.slice(i+1)])
        } else {
          setInstruction("Multiple projects found: "+JSON.stringify(out))
        }
      } else {
        setInstruction("No projects found")
      }
    } catch (error) {
      console.error(error.message)
    }
  }

  function renderpop() {
    if (inputPopup) {
      return (<div className={styles.popup}>
          <form style={{width: '100%', position:'relative'}} onSubmit={async(e)=>{
            e.preventDefault()
            try {
              const jwtToken = sessionStorage.getItem('jwtToken'); // Retrieve the token from session storage
              const arr = [];
              for (var i=0; i<project.length; i++) {
                arr.push({project_id: project[i], hour: hours[i], is_standardized: is_standardized[i], is_reversed: is_reversed[i], description: keywords[i]})
              }
              const response = await fetch("http://"+IP+":8888/report", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "Authorization": `Bearer ${jwtToken}`
                },
                body: JSON.stringify({ Array_input: arr }) // Example payload
              });
            
              if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
              }
            
              const data = await response.json();
              console.log("Report successfully sent", data);
              setInstruction("Report successfully sent")
            } catch (error) {
              console.error("Error in POST request:", error.message);
              setInstruction("Failed to send report")
            }
    
          }}>
            <h3>Generate Weekly Report</h3>
            <p>{instruction}</p>
            {/*<textarea className={styles.textbox} style={{width: '95%'}} value={report} onChange={(e)=>{setReport(e.target.value)}} placeholder="type your report in text here, and click the green button to let AI fill in statistics for you."></textarea>
            <div className={styles.add} style={{marginLeft: 'auto', marginRight: 'auto', marginBottom: '20px'}} onClick={()=>{populate()}}>Populate your statistics with AI</div>*/}
            {renderReport()}
            <div className={styles.add} onClick={ ()=>{
              setHours([...hours, ""])
              setProject([...project, ''])
              setReversed([...is_reversed, false])
              setStandardized([...is_standardized, true])
              setKeywords([...keywords, ""])
              setStage([...stage, ''])
            }
            }>Add another report</div>
            <div className={styles.close} onClick={()=>{setInputPopup(false);setInstruction('describe what you have done this week!');}}></div>
            <input type="submit" value="Submit report" />
          </form>
      </div>)
    }
  }

  function renderReport() {
    return project.map( (v,i)=> (
      <div style={{border: '2px solid #353740', marginBottom: 10, borderRadius: 10}}>
      <input
      type="text"
      name="project"
      placeholder="Enter the project ID, or a name that can locate it."
      value={v}
      onChange={(e) => {
        setProject([...project.slice(0, i), e.target.value, ...project.slice(i+1)])
      }}></input>
      <div className={styles.add} style={{marginBottom: 10, marginLeft: 10, backgroundColor: '#10a37f'}} onClick={
        ()=>{populate(i)}
      }>Search for ID</div>
      <input
      type="text"
      name="hours"
      placeholder="Enter the number of hours"
      value={hours[i]}
      onChange={(e) => {
        setHours([...hours.slice(0, i), e.target.value, ...hours.slice(i+1)])
      }}></input>
      <input
      type="text"
      name="key"
      placeholder="Enter the description of your work"
      value={keywords[i]}
      onChange={(e) => {
        setKeywords([...keywords.slice(0, i), e.target.value, ...keywords.slice(i+1)])
      }}></input>
      <input
      type="text"
      name="stage"
      placeholder="Enter the stage of your project."
      value={stage[i]}
      onChange={(e) => {
        setStage([...stage.slice(0, i), e.target.value, ...stage.slice(i+1)])
      }}></input>
      Is your work reversed? <input type="checkbox" value={is_reversed[i]} onChange={(e)=>{setReversed([...is_reversed.slice(0, i), e.target.checked , ...is_reversed.slice(i+1)])}}></input>
      Is your work standardized? <input type="checkbox" value={is_standardized[i]} onChange={(e)=>{setStandardized([...is_standardized.slice(0, i), e.target.checked , ...is_standardized.slice(i+1)])}}></input>
      
      <div className={styles.add} style={{marginBottom: 10, marginLeft: 10, backgroundColor: '#808080'}} onClick={
        () => {
          setHours([...hours.slice(0, i), ...hours.slice(i+1)])
          setProject([...project.slice(0, i), ...project.slice(i+1)])
          setReversed([...is_reversed.slice(0, i), ...is_reversed.slice(i+1)])
          setStandardized([...is_standardized.slice(0, i), ...is_standardized.slice(i+1)])
          setKeywords([...keywords.slice(0, i), ...keywords.slice(i+1)])
          setStage([...stage.slice(0, i), ...stage.slice(i+1)])          
        }
      }>Remove this report</div>
      </div>
      )
    )
  }

  async function login(e) {
    e.preventDefault();
    const response = await fetch('http://'+IP+':8888/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username, password: password })
    });
    const data = await response.json();
    if (response.ok) {
      sessionStorage.setItem('jwtToken', data.access_token);
      await resetSession()
      addResult("Log in successful") // Return the JWT token
      setPopup(false)
    } else if (response.status === 401) {
      alert("invalid username or password. Please try again.")
    }
    else {
        throw new Error(data.message);
    }
  }

  function renderLogin() {
    if (popup) {
      return (<div className={styles.login}>
        <div style={{position: "relative"}}><h4 style={{marginLeft: "5px"}}>Login</h4><div className={styles.close} onClick={()=>{setPopup(false)}}></div></div>
        <form onSubmit={login}>
          <input
            type="text"
            name="username"
            placeholder="Enter Your username"
            value={username}
            onChange={(e) => {
              setUsername(e.target.value)
            }}
          />
          <input
            type="password"
            name="password"
            placeholder="Enter Your password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value)
            }}
          />
          <input type="submit" value="Login" />
        </form>
      </div>
      )
    }
  }

  async function resetSession() {
    const dat = await fetch('http://'+IP+':8888/create', {
      method: 'GET',
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${sessionStorage.getItem('jwtToken')}`
      }
    });
    if (dat.status !== 200) {
      if (dat.status === 401) {
        alert("Log in expired, please re-login.")
      } else {
        throw data.error || new Error(`Request failed with status ${dat.status}`);
      }
    }
    const uuid = await dat.json();
    if (uuid.session_id) {
      setSessionID(uuid.session_id);
      setResult([{message: "New session created.", client: false}])
    }
  }

  function getUsername() {
    const jwtToken = typeof sessionStorage !== 'undefined' && sessionStorage.getItem('jwtToken'); // Retrieve the token from session storage

    if (!jwtToken) {
      return ""
    } else {
      return username.substring(0, 1).toUpperCase()
    }

  }

  return (
    <div>
      <Head>
        <title>Employee Reports</title>
        <link rel="icon" href="/dog.png" />
      </Head>

      <main className={styles.main}>
        <div className={styles.headbar}>
          <div className={styles.titlebar}><span style={{fontSize: '34px', verticalAlign: 'middle',fontWeight: 500, marginRight: 10}}>Fetch employees and reports</span><img src="/squid.png" className={styles.icon} /></div>
          <div className={styles.loginbutton} onClick={(e)=>setPopup(true)}>{getUsername()}</div>
          <div className={styles.loginbutton} style={{left:0, width: 'fit-content', padding:'0 10px 0 10px', borderRadius:'10px'}} onClick={()=>{
            if (getUsername()) {
              setInputPopup(true);
            } else {
              alert("Please log in before you create report.")
              setPopup(true);
            }
          }}>Create Report</div>
        </div>
        <div className={styles.result}>{renderResult()}</div>

        <form className={styles.chatForm} onSubmit={generate}>
          <div className={styles.chatReset} onClick={
            ()=>{
              if (getUsername()) {
                resetSession();
              } else {
                setPopup(true);
              }
            }
          }>Reset</div>
          <input type="submit" value="Send" className={styles.chatSend}/>
          <textarea
            name="animal"
            placeholder="Enter a query or a prompt"
            value={animalInput}
            onChange={(e) => {
              setAnimalInput(e.target.value)
            }}
            className={styles.chatInput}
            rows={1}
            onInput={ (e)=>{
                e.target.style.height = "auto";
                e.target.style.height = (e.target.scrollHeight - 24) + "px";
              }
            }
          />
        </form>
        {renderpop()}
        {renderLogin()}

      </main>
      
    </div>
  );
  
}
