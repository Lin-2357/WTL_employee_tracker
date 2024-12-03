import Head from "next/head";
import { useState } from "react";
import styles from "./index.module.css";

function displayObj(obj) {
  return JSON.stringify(obj)
}

export default function Home() {

  const [animalInput, setAnimalInput] = useState("");
  const [result, setResult] = useState("");
  const [popup, setPopup] = useState(true);
  const [inputPopup, setInputPopup] = useState(false);
  const [report, setReport] = useState("");
  const [is_reversed, setReversed] = useState([false]);
  const [is_standardized, setStandardized] = useState([false]);
  const [project, setProject] = useState([""]);
  const [hours, setHours] = useState([""]);
  const [keywords, setKeywords] = useState([""]);
  const [instruction, setInstruction] = useState('describe what you have done this week!');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [session_id, setSessionID] = useState('');

  async function generate(event) {
    event.preventDefault();
    if (!session_id) {
      alert("please create session first.");
      return
    }
    setResult("creating queries...");
    const prt = animalInput;
    console.log(prt)
    try {
      const response = await fetch("http://192.168.12.121:4000/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt: prt, session: session_id }),
      });

      const data = await response.json();
      if (response.status === 400) {
        alert("session expired, please reset your session.")
      }
      else if (response.status === 200) {
        console.log(data.result)
        setResult("loading data...");
        
        const jwtToken = sessionStorage.getItem('jwtToken'); // Retrieve the token from session storage

        if (!jwtToken) {
          throw new Error("No token found. Please log in.");
        }

        const dat = await fetch("http://192.168.12.121:8888/query", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${jwtToken}` // Add the token to the Authorization header
          },
          body: JSON.stringify({ query: data.result }),
        });

        if (dat.status === 500) {
          setResult("query execution unsuccessful.")
          return
        } else if (dat.status === 400) {
          setResult("AI model failed to generate a query.")
          return
        } else if (dat.status === 401) {
          setResult("Log in expired, please re-login.")
          return
        } else if (dat.status !== 200) {
          throw dat.error || new Error(`Request failed with status ${dat.status}`);
        }
        const dat2 = await dat.json();

        setResult("interpreting result...")
        const interpretation = await fetch("http://192.168.12.121:4000/interpret", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ prompt: prt, response: displayObj(dat2) }),
        });
        const out = await interpretation.json()
        setResult(out.result);

      } else {
        setResult(data.result)
      }
    } catch(error) {
      // Consider implementing your own error handling logic here
      console.error(error);
      alert(error.message);
    }
  }

  async function populate() {
    try {
      const interpretation = await fetch("http://192.168.12.121:4000/populate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt: report }),
      });
      const out = await interpretation.json()
      console.log(out)
      if (parseInt(out.hours) >= 0) {
        setHours(parseInt(out.hours));
      }
      if (parseInt(out.sale) >= 0) {
        setSale(parseInt(out.sale));
      }
      setKeywords(out.keywords);
      setInstruction(out.instruction);
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
              const response = await fetch("http://192.168.12.121:8888/report", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ query: report, sale: sale, hours: hours, keywords: keywords }) // Example payload
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
            <textarea className={styles.textbox} value={report} onChange={(e)=>{setReport(e.target.value)}} placeholder="type your report here, include sales value and hours."></textarea>
            <div className={styles.add} style={{marginLeft: 'auto', marginRight: 'auto', marginBottom: '20px'}} onClick={()=>{populate()}}>Populate your statistics with AI</div>
            {renderReport()}
            <div className={styles.add} onClick={ ()=>{
              setHours([...hours, ""])
              setProject([...project, ''])
              setReversed([...is_reversed, false])
              setStandardized([...is_standardized, false])
              setKeywords([...keywords, ""])
              console.log(project)
            }
            }>Add another report</div>
            <div className={styles.close} onClick={()=>{setPopup(false);setInstruction('describe what you have done this week!');}}></div>
            <input type="submit" value="Submit report" />
          </form>
      </div>)
    }
  }

  function renderReport() {
    console.log(project)
    return project.map( (v,i)=> (
      <div style={{border: '2px solid #353740', marginBottom: 10, borderRadius: 10}}>
      <input
      type="text"
      name="project"
      placeholder="Enter the project ID or name of the project you are working on"
      value={v}
      onChange={(e) => {
        setProject([...project.slice(0, i), e.target.value, ...project.slice(i+1)])
      }}></input>
      Is your work reversed? <input type="checkbox" value={is_reversed[i]} onChange={(e)=>{setReversed([...is_reversed.slice(0, i), e.target.value, ...is_reversed.slice(i+1)])}}></input>
      Is your work standardized? <input type="checkbox" value={is_standardized[i]} onChange={(e)=>{setStandardized([...is_standardized.slice(0, i), e.target.value, ...is_standardized.slice(i+1)])}}></input>
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
      <div className={styles.add} style={{marginBottom: 10, marginLeft: 10, backgroundColor: '#808080'}} onClick={
        () => {
          setHours([...hours.slice(0, i), ...hours.slice(i+1)])
          setProject([...project.slice(0, i), ...project.slice(i+1)])
          setReversed([...is_reversed.slice(0, i), ...is_reversed.slice(i+1)])
          setStandardized([...is_standardized.slice(0, i), ...is_standardized.slice(i+1)])
          setKeywords([...keywords.slice(0, i), ...keywords.slice(i+1)])
        }
      }>Remove this report</div>
      </div>
      )
    )
  }

  async function login(e) {
    e.preventDefault();
    const response = await fetch('http://192.168.12.121:8888/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username, password: password })
    });
    const data = await response.json();
    if (response.ok) {
      sessionStorage.setItem('jwtToken', data.access_token);
      await resetSession()
      setResult("Log in successful") // Return the JWT token
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
    const dat = await fetch('http://192.168.12.121:8888/create', {
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
      setResult('New session created.')
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
        <div className={styles.result}>{result}</div>

      </main>
      
    </div>
  );
  
}
