import Head from "next/head";
import { useState } from "react";
import styles from "./index.module.css";

function displayObj(obj) {
  return JSON.stringify(obj)
}

export default function Home() {

  const IP = process.env.NEXT_PUBLIC_IP_ADDRESS;
  const basePrompt = "\n If the prompt ask about GS/ISS projects search from team name. If the prompt ask about subdepartment, query with group by (department, subdepartment). If the prompt ask about average work hour, it is average across all associated employee not report. If the prompt specifies time, filter from start_date in work_hour unless otherwise specified, for reference today's date is "+(new Date().toLocaleString()) + "\n If the prompt ask about the timespan of a project, it is calculated as (TO_DAYS(MAX(work_hour.end_date)) - TO_DAYS(MIN(work_hour.start_date)))/30 using the TO_DAYS function in mysql and convert it to month" + "\n If the prompt ask about labor cost of a project for an indivial, it is calculated as the [work_hour.hour spent on project] / [work_hour.hour in total within the timespan] * [timespan in month] * [employee.salary of the person]. For labor cost of a project it is the labor cost of that project for each individuals summed across all person involved in the project."
  const allStages = [
    {"English": "1. Bidding Stage", "中文": "1. 投标阶段"},
    {"English": "2. Design Stage","中文": "2. 设计阶段"},
    {"English": "3. Construction Stage", "中文": "3. 施工阶段"},
    {"English": "4. Completion Stage", "中文": "4. 竣工阶段"},
    {"English": "5. After-sales Stage", "中文": "5. 售后阶段"},
  ]

  const [animalInput, setAnimalInput] = useState("");
  const [result, setResult] = useState([]);
  const [popup, setPopup] = useState(true);
  const [inputPopup, setInputPopup] = useState(false);
  const [is_reversed, setReversed] = useState([false]);
  const [is_standardized, setStandardized] = useState([true]);
  const [project, setProject] = useState([""]);
  const [projectName, setProjectName] = useState([''])
  const [hours, setHours] = useState([""]);
  const [keywords, setKeywords] = useState([""]);
  const [instruction, setInstruction] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [session_id, setSessionID] = useState('');
  const [stage, setStage] = useState([0])
  const [language, setLanguage] = useState('English')

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
          setInstruction({"English": "found ", "中文": "找到"}[language]+out[0].name)
          setProjectName([...projectName.slice(0, i), out[0].name, ...projectName.slice(i+1)])
          setProject([...project.slice(0, i), out[0].id, ...project.slice(i+1)])
        } else {
          var newinstruction = {"English": "Multiple projects found:", "中文":"请选择以下项目之一："}[language]
          for (let i=0;i<out.length; i++){
            newinstruction += "\n" + out[i].id + ": " + out[i].name
          }
          setInstruction(newinstruction);
        }
      } else {
        setInstruction({"English":"No projects found", "中文": "未找到对应项目"}[language])
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
            if (!confirm({"English": "Are you sure you want to submit?", "中文": "确认提交周报？"}[language])) {
              return
            }
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
              setInstruction({"English":"Report successfully sent", "中文":"周报提交成功"}[language])
              alert({"English":"Report successfully sent", "中文":"周报提交成功"}[language])
            } catch (error) {
              console.error("Error in POST request:", error.message);
              setInstruction({"English":"Failed to send report", "中文":"周报提交失败"}[language])
              alert({"English":"Failed to send report", "中文":"周报提交失败"}[language])
            }
    
          }}>
            <h3 style={{marginBottom: '10px'}}>{{"English":"Make a weekly report.", "中文":"创建周报"}[language]}</h3>
            <div style={{fontWeight: 700, marginBottom:5}}>{{"English": 'You are reporting for ', "中文": '周报日期：'}[language]}{new Date(Date.now()-7*86400000).getFullYear()}/{new Date(Date.now()-7*86400000).getMonth()+1}/{new Date(Date.now()-7*86400000).getDate()}-{new Date(new Date(Date.now()-86400000)).getFullYear()}/{new Date(Date.now()-86400000).getMonth()+1}/{new Date(Date.now()-86400000).getDate()}</div>
            <div style={{whiteSpace:'pre-wrap'}}>{instruction}</div>
            {/*<textarea className={styles.textbox} style={{width: '95%'}} value={report} onChange={(e)=>{setReport(e.target.value)}} placeholder="type your report in text here, and click the green button to let AI fill in statistics for you."></textarea>
            <div className={styles.add} style={{marginLeft: 'auto', marginRight: 'auto', marginBottom: '20px'}} onClick={()=>{populate()}}>Populate your statistics with AI</div>*/}
            {renderReport()}
            <div className={styles.add} onClick={ ()=>{
              setHours([...hours, ""])
              setProject([...project, ''])
              setReversed([...is_reversed, false])
              setStandardized([...is_standardized, true])
              setKeywords([...keywords, ""])
              setStage([...stage, 0])
              setProjectName([...projectName, ''])
            }
            }>{{"English":"Add another report", "中文": "新增一条报告"}[language]}</div>
            <div className={styles.close} onClick={()=>{setInputPopup(false);setInstruction('');}}>x</div>
            <input type="submit" value={{"English":"Submit report", "中文":"提交工时报告"}[language]} />
          </form>
      </div>)
    }
  }

  function renderReport() {
    return project.map( (v,i)=> (
      <div key={i} style={{border: '2px solid #353740', marginBottom: 10, borderRadius: 10}}>
      <input
      type="text"
      name="project"
      placeholder={{"English":"Enter the project ID, or a name that can locate it.", "中文":"键入项目编号，或键入名称然后点击查询"}[language]}
      value={v}
      onChange={(e) => {
        setProject([...project.slice(0, i), e.target.value, ...project.slice(i+1)])
      }}></input><span>{projectName[i]}</span>
      <div className={styles.add} style={{marginBottom: 10, marginLeft: 10, backgroundColor: '#10a37f'}} onClick={
        ()=>{populate(i)}
      }>{{"English":"Search for ID", "中文": "查询编号"}[language]}</div>
      <input
      type="text"
      name="hours"
      placeholder={{"English":"Enter the number of hours.", "中文":"键入工时（单位：小时）"}[language]}
      value={hours[i]}
      onChange={(e) => {
        if (!e.target.value || !isNaN(parseFloat(e.target.value))) {
          setHours([...hours.slice(0, i), e.target.value ? (e.target.value[e.target.value.length-1]=='.'? e.target.value : parseFloat(e.target.value).toString()) : '', ...hours.slice(i+1)])
        }
      }}></input>
      <input
      type="text"
      name="key"
      placeholder={{"English":"Enter the description of your work.", "中文":"键入工作内容简述"}[language]}
      value={keywords[i]}
      onChange={(e) => {
        setKeywords([...keywords.slice(0, i), e.target.value, ...keywords.slice(i+1)])
      }}></input>
      <div className={styles.stage}>
      <div onClick={()=>{
          if (stage[i]>0) {
            setStage([...stage.slice(0, i), stage[i]-1, ...stage.slice(i+1)])
          }
        }} className={styles.close} style={{position: 'relative', marginRight: 'auto', backgroundColor: '#10a37f'}}>-</div>
        <div style={{margin: 'auto'}}>{{"English": 'Project stage: ', "中文": '项目阶段：'}[language]}{allStages[stage[i]][language]}</div>
        <div onClick={()=>{
          if (stage[i]<allStages.length-1) {
            setStage([...stage.slice(0, i), stage[i]+1, ...stage.slice(i+1)])
          }
        }} className={styles.close} style={{position: 'relative', marginLeft: 'auto', backgroundColor: '#10a37f'}}>+</div>
      </div>
      <span style={{margin: 10}}>{{"English":"Is your work reversed?", "中文": "是否返工"}[language]}</span> <input type="checkbox" value={is_reversed[i]} onChange={(e)=>{setReversed([...is_reversed.slice(0, i), e.target.checked , ...is_reversed.slice(i+1)])}}></input>
      <span style={{margin: 10}}>{{"English":"Is your work standardized?", "中文": "是否符合标准化"}[language]}</span> <input type="checkbox" value={is_standardized[i]} onChange={(e)=>{setStandardized([...is_standardized.slice(0, i), e.target.checked , ...is_standardized.slice(i+1)])}}></input>
      
      <div className={styles.add} style={{margin: 10, backgroundColor: '#905050'}} onClick={
        () => {
          if (confirm({"English": 'Are you sure to delete this report?', "中文": '确定删除本条报告？'}[language])) {
            setHours([...hours.slice(0, i), ...hours.slice(i+1)])
            setProject([...project.slice(0, i), ...project.slice(i+1)])
            setReversed([...is_reversed.slice(0, i), ...is_reversed.slice(i+1)])
            setStandardized([...is_standardized.slice(0, i), ...is_standardized.slice(i+1)])
            setKeywords([...keywords.slice(0, i), ...keywords.slice(i+1)])
            setStage([...stage.slice(0, i), ...stage.slice(i+1)])
            setProjectName([...projectName.slice(0, i), ...projectName.slice(i+1)])
          }        
        }
      }>{{"English":"Delete this report", "中文": "删除本条报告"}[language]}</div>
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
      addResult({"English":"Log in successful", "中文": "登录成功"}[language]) // Return the JWT token
      setPopup(false)
    } else if (response.status === 401) {
      alert({"English": "invalid username or password. Please try again.", "中文": "未知的用户名/密码，请重试。"})
    }
    else {
        throw new Error(data.message);
    }
  }

  function renderLogin() {
    if (popup) {
      return (<div className={styles.login}>
        <div style={{position: "relative"}}><h4 style={{marginLeft: "5px"}}>{{"English":"Login", "中文": "登录"}[language]}</h4><div className={styles.close} onClick={()=>{setPopup(false)}}>x</div></div>
        <form onSubmit={login}>
          <input
            type="text"
            name="username"
            placeholder={{"English":"Enter Your username", '中文': "键入用户名"}[language]}
            value={username}
            onChange={(e) => {
              setUsername(e.target.value)
            }}
          />
          <input
            type="password"
            name="password"
            placeholder={{"English":"Enter Your password", '中文': "键入密码"}[language]}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value)
            }}
          />
          <input type="submit" value={{"English":"Login", "中文": "登录"}[language]}/>
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
        alert({"English":"Log in expired, please re-login.", "中文":"登录过期，请重新登录。"})
      } else {
        throw data.error || new Error(`Request failed with status ${dat.status}`);
      }
    }
    const uuid = await dat.json();
    if (uuid.session_id) {
      setSessionID(uuid.session_id);
      setResult([{message: {"English":"New session created.", "中文": "新的聊天已创建"}[language], client: false}])
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
          <div className={styles.titlebar}><span className={styles.language} style={{fontSize: '34px', border: 'none'}}>{{"English": 'Employee Report', "中文":"员工周报"}[language]}</span><img src="/squid.png" className={styles.icon} />
            <div className={styles.language} style={{backgroundColor: (language=="中文"? "#10a37f":"#fff")}} onClick={(e)=>{setLanguage("中文")}}>中文</div>
            <div className={styles.language} style={{backgroundColor: (language=="English"? "#10a37f":"#fff")}} onClick={(e)=>{setLanguage("English")}}>English</div></div>
          <div className={styles.loginbutton} onClick={(e)=>setPopup(true)}>{getUsername()}</div>
          <div className={styles.loginbutton} style={{left:0, width: 'fit-content', padding:'0 10px 0 10px', borderRadius:'10px'}} onClick={()=>{
            if (getUsername()) {
              setInputPopup(true);
            } else {
              alert({"English":"Please log in before you create report.", "中文":"请先登录"}[language])
              setPopup(true);
            }
          }}>{{"English":"Create Report","中文":"创建周报"}[language]}</div>
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
          }>{{"English":"Reset", "中文":"重置聊天"}[language]}</div>
          <input type="submit" value={{"English":"Send", "中文": "发送"}[language]} className={styles.chatSend}/>
          <textarea
            name="animal"
            placeholder={{"English":"Enter a query or a prompt", "中文": "键入要查询的问题"}[language]}
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
