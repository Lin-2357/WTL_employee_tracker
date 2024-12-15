import Head from "next/head";
import { useState } from "react";
import styles from "./index.module.css";

function displayObj(obj) {
  return JSON.stringify(obj)
}

export default function Home() {

  const IP = process.env.NEXT_PUBLIC_IP_ADDRESS;
  const lastWeek = new Date(new Date() - new Date().getDay() * 86400000);
  const basePrompt = "\n INSTRUCTIONS: If the prompt ask about GS/ISS projects search from team name. If the prompt ask about subdepartment, query with group by (department, subdepartment). If the prompt ask about average work hour, it is average across all associated employee not report. If the prompt specifies time, filter from start_date in work_hour unless otherwise specified, for reference today's date is "+(new Date().toLocaleString()) + "\n If the prompt ask about the timespan of a project, it is calculated as (TO_DAYS(MAX(work_hour.end_date)) - TO_DAYS(MIN(work_hour.start_date)))/30 using the TO_DAYS function in mysql and convert it to month" + "\n If the prompt ask about labor cost of a project for an indivial, it is calculated as the [work_hour.hour spent on project] / [work_hour.hour in total within the timespan] * [timespan in month] * [employee.salary of the person]. For labor cost of a project it is the labor cost of that project for each individuals summed across all person involved in the project.";
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
  const [is_reversed_desc, setReversedDESC] = useState(['']);
  const [is_standardized, setStandardized] = useState([false]);
  const [is_standardized_desc, setStandardizedDESC] = useState(['']);
  const [project, setProject] = useState([""]);
  const [projectName, setProjectName] = useState([''])
  const [hours, setHours] = useState([""]);
  const [keywords, setKeywords] = useState([""]);
  const [instruction, setInstruction] = useState('');
  const [projectList, setProjectList] = useState([''])
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [session_id, setSessionID] = useState('');
  const [stage, setStage] = useState([0])
  const [language, setLanguage] = useState('English');
  const [popup2, setPopup2] = useState(false);
  const [listProj, setListProj] = useState([]);
  const [reportDate, setReportDate] = useState(new Date(new Date() - new Date().getDay() * 86400000))

  function addResult(message, client=false) {
    setResult((prevresult)=>{return [{message: message, client: client}, ...prevresult]})
  }

  function renderResult() {
    return result.map(
      (v, i) => {
        return <div key={i} style={{whiteSpace: 'pre-wrap', marginBottom: 15, padding: 10, marginLeft: (v.client ? 'auto': 0), width: '60%', backgroundColor: (v.client? "#10a37f" : "#bec0be"), borderRadius: '5px'}}>{v.message}</div>
      }
    )
  }

  async function generate(event) {
    event.preventDefault();
    addResult(animalInput, true);
    addResult({'English':"Creating queries...", "中文":'正在分析问题...'}[language])
    if (!session_id) {
      alert({'English':"please create session first.", '中文': '请先创建聊天'}[language]);
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
        addResult({"English":"Log in expired, please re-login.", "中文":"登录过期，请重新登录。"}[language])
        return
      }
      const from_id = await from.json();

      if (!from_id.id) {
        addResult({"English":"Log in expired, please re-login.", "中文":"登录过期，请重新登录。"}[language])
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
        alert({'English':"session expired, please reset your session.", '中文': '聊天过期，请重置聊天'}[language]);
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
          addResult(data.result || {"English":"Query generation failed.", "中文": '无法回答该问题'}[language])
        }
      } else {
        data = {result: data.result.sql_query}
      }
        addResult({'English':"loading data...", '中文':'正在载入数据...'}[language]);

        const dat = await fetch("http://"+IP+":8888/query", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${jwtToken}` // Add the token to the Authorization header
          },
          body: JSON.stringify({ query: data.result }),
        });

        if (dat.status === 500) {
          addResult({'English':"query execution unsuccessful.", '中文': '数据库处理出错'}[language])
          return
        } else if (dat.status === 400) {
          addResult({'English':"AI model failed to generate a query.", '中文': '未能成功在数据库中找到回答'}[language]);
          return
        } else if (dat.status === 401) {
          addResult({"English":"Log in expired, please re-login.", "中文":"登录过期，请重新登录。"}[language])
          return
        } else if (dat.status !== 200) {
          throw dat.error || new Error(`Request failed with status ${dat.status}`);
        }
        const dat2 = await dat.json();

        console.log(dat2)

        // fetch("http://"+IP+":4000/sendback", {
        //   method: "POST",
        //   headers: {
        //     "Content-Type": "application/json",
        //   },
        //   body: JSON.stringify({ result: dat2 }),
        // });

        addResult({'English':"interpreting result...", '中文': '正在组织语言...'}[language])
        const interpretation = await fetch("http://"+IP+":4000/interpret", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ prompt: prt, response: displayObj(dat2), language: language }),
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
      if (interpretation.status == 401) {
        alert({"English":"Log in expired, please re-login.", "中文":"登录过期，请重新登录。"}[language])
        return;
      }
      const out = await interpretation.json()
      console.log(out)
      
      if (out.length > 0) {
        if (out.length === 1) {
          setProjectList([...projectList.slice(0, i), {"English": "found ", "中文": "找到"}[language]+"\n"+out[0].id+": "+out[0].name, ...projectList.slice(i+1)])
          setProjectName([...projectName.slice(0, i), out[0].name, ...projectName.slice(i+1)])
          setProject([...project.slice(0, i), out[0].id, ...project.slice(i+1)])
        } else {
          var newinstruction = {"English": "Multiple projects found:", "中文":"请选择以下项目之一："}[language]
          for (let i=0;i<out.length; i++){
            newinstruction += "\n" + out[i].id + ": " + out[i].name
          }
          setProjectList([...projectList.slice(0, i), newinstruction, ...projectList.slice(i+1)]);
        }
      } else {
        setProjectList([...projectList.slice(0, i), {"English":"No projects found", "中文": "未找到对应项目"}[language], ...projectList.slice(i+1)])
      }
    } catch (error) {
      console.error(error.message)
    }
  }

  async function listReport() {
    const jwtToken = sessionStorage.getItem('jwtToken'); // Retrieve the token from session storage
    try {
      const reports = await fetch("http://"+IP+":8888/list", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${jwtToken}`
          },
        });
      
      if (reports.status === 401) {
        alert({"English":"Log in expired, please re-login.", "中文":"登录过期，请重新登录。"}[language])
        return '';
      } else if (reports.status !== 200) {
        alert({"English":"Failed to get the list of report.", "中文":"查询个人报告失败。"}[language])
        return '';
      } else {
        const data = await reports.json();
        if (data) { // Make sure data is not null or undefined
          console.log(data);
          data.sort((a,b)=>{return new Date(a.start_date) > new Date(b.start_date) ? -1 : 1})
          setListProj(data);
          setPopup2(true); // Only set to true if data is valid
        }
      }
    } catch (error){
      console.log(error)
    }  
  }

  function renderlog() {
    if (popup2) {
      return (
        <div className={styles.popup}>
          <div style={{margin: 10, height: 'calc(100% - 10px)', width: 'calc(100% - 10px)', position: 'relative'}}>
            <h3 style={{marginBottom: '10px'}}>{{"English":"My weekly report.", "中文":"我的周报"}[language]}</h3>
            <div className={styles.close} onClick={()=>{setPopup2(false);}}>x</div>
            {listProj && Array.isArray(listProj) ? listProj.map((v,i)=>{
              return (<div key={i.toString()+"logs"} className={styles.log} onClick={async ()=>{
                if (confirm({"English": 'Are you sure to delete this entry?', "中文": '确定删除本条工时记录？'}[language])) {
                  console.log(v)
                  const jwtToken = sessionStorage.getItem('jwtToken'); // Retrieve the token from session storage
                  const response = await fetch("http://"+IP+":8888/delete", {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      "Authorization": `Bearer ${jwtToken}`
                    },
                    body: JSON.stringify({
                      uuid : v.uuid
                    })
                  });
                  if (response.status === 200) {
                    await listReport();
                  } else {
                    alert({"English": 'Delete failed.', "中文": '删除失败'}[language])
                  }
                }
              }}>
                {new Date(v.start_date).toISOString().slice(0, (new Date(v.start_date).toISOString()).indexOf('T'))} ~ {new Date(v.end_date).toISOString().slice(0, (new Date(v.end_date).toISOString()).indexOf('T'))}
                <br/>
                {v.name ? v.name : {'English':'No specific project.', '中文': '未在项目列表'}[language]}
                <br/>{v.hour} {{"English": 'hours', "中文": '小时'}[language]} : {v.task_description}
                {v.is_reversed ? (<div style={{color:'#905050'}}>{{"English": 're-work required', "中文": '需要返工'}[language]}</div>): ''}
                {!v.is_standardized ? (<div style={{color:'#905050'}}>{{"English": 'work not standardized', "中文": '不符合标准化流程'}[language]}</div>): ''}
              </div>)
            }) : ''}
          </div>
        </div>
      )
    }
  }

  function renderpop() {
    if (inputPopup) {
      return (<div className={styles.popup}>
          <form style={{width: '100%', position:'relative'}} onSubmit={async(e)=>{
            e.preventDefault()
            const jwtToken = sessionStorage.getItem('jwtToken'); // Retrieve the token from session storage
            
            const curr_work_hour = await fetch("http://"+IP+":8888/query", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${jwtToken}`
              },
              body: JSON.stringify({
                query: "SELECT SUM(work_hour.hour) AS hour FROM work_hour JOIN employee ON employee.uuid = work_hour.employee_id JOIN project ON project.uuid = work_hour.project_id WHERE (employee.name LIKE '%" + username + "%' OR employee.alias LIKE '%" + username + "%') AND start_date >= '" + `${new Date(reportDate-7*86400000).getFullYear()}/${new Date(reportDate-7*86400000).getMonth()+1}/${new Date(reportDate-7*86400000).getDate()}';`
               }) // Example payload
            });
            var alertMessage = '';
            
            if (curr_work_hour.status === 200) {
              const totalH = (await curr_work_hour.json()).result[0];
              console.log(totalH);
              if (parseFloat(totalH.hour) >= 45) {
                alertMessage = {"English": "You already have "+totalH.hour+" hours logged this week. ", "中文": "本周已经存在"+totalH.hour+"小时记录，"}[language]
              }
            }

            if (!confirm(alertMessage + {"English": "Are you sure you want to submit?", "中文": "确认提交周报？"}[language])) {
              return
            }
            try {
              const arr = [];
              for (var i=0; i<project.length; i++) {
                arr.push({project_id: project[i], hour: hours[i], is_standardized: is_standardized[i], is_reversed: is_reversed[i], description: keywords[i], stage:allStages[stage[i]]['中文']})
              }
              const response = await fetch("http://"+IP+":8888/report", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "Authorization": `Bearer ${jwtToken}`
                },
                body: JSON.stringify({ Array_input: arr, date: reportDate.toLocaleDateString() }) // Example payload
              });
            
              if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
              }
            
              const data = await response.json();
              console.log("Report successfully sent", data);
              setReversed([false]);
              setReversedDESC(['']);
              setStandardized([false]);
              setStandardizedDESC(['']);
              setProject([""]);
              setProjectName([''])
              setHours([""]);
              setKeywords([""]);
              setProjectList([''])
              setStage([0]);
              setInstruction({"English":"Report successfully sent, total work hours ", "中文":"周报提交成功，共计录入工时"}[language]+hours.reduce((accumulator, currentValue) => parseFloat(accumulator) + parseFloat(currentValue), 0).toString());
              alert({"English":"Report successfully sent", "中文":"周报提交成功"}[language])
            } catch (error) {
              console.error("Error in POST request:", error.message);
              setInstruction({"English":"Failed to send report", "中文":"周报提交失败"}[language])
              alert({"English":"Failed to send report", "中文":"周报提交失败"}[language])
            }
    
          }}>
            <h3 style={{marginBottom: '10px'}}>{{"English":"Make a weekly report.", "中文":"创建周报"}[language]}</h3>
            <div style={{fontWeight: 700, marginBottom:5}}>{{"English": 'You are reporting for ', "中文": '周报日期：'}[language]}{new Date(reportDate-7*86400000).getFullYear()}/{new Date(reportDate-7*86400000).getMonth()+1}/{new Date(reportDate-7*86400000).getDate()}-{reportDate.getFullYear()}/{reportDate.getMonth()+1}/{reportDate.getDate()}</div>
            {/*<textarea className={styles.textbox} style={{width: '95%'}} value={report} onChange={(e)=>{setReport(e.target.value)}} placeholder="type your report in text here, and click the green button to let AI fill in statistics for you."></textarea>
            <div className={styles.add} style={{marginLeft: 'auto', marginRight: 'auto', marginBottom: '20px'}} onClick={()=>{populate()}}>Populate your statistics with AI</div>*/}
            {renderReport()}
            <div className={styles.add} onClick={ ()=>{
              setHours([...hours, ""])
              setProject([...project, ''])
              setReversed([...is_reversed, false])
              setStandardized([...is_standardized, false])
              setKeywords([...keywords, ""])
              setStage([...stage, 0])
              setProjectName([...projectName, ''])
              setProjectList([...projectList, ''])
              setReversedDESC([...is_reversed_desc, ''])
              setStandardizedDESC([...is_standardized_desc, ''])
            }
            }>{{"English":"Add another entry", "中文": "新增一条工时记录"}[language]}</div>
            <div className={styles.add} onClick={()=>{listReport();}}>{{"English":"Manage my reports", "中文": "管理我的报告"}[language]}</div>
            <div className={styles.close} onClick={()=>{setInputPopup(false);setInstruction('');}}>x</div>
            <div style={{whiteSpace:'pre-wrap'}}>{instruction}</div>
            <input type="submit" value={{"English":"Submit report", "中文":"提交工时报告"}[language]} />
          </form>
      </div>)
    }
  }

  function renderList(i) {
    return (<div key={i+999} style={{marginLeft: 10}}>
      {projectList[i].split("\n").map(
        (v,j) => {
          return j>0 ? (<div key={j.toString()+"projectlist"} style={{border: '2px solid #10a37f', margin: '1px', cursor: 'pointer', borderRadius: '5px', width:'fit-content', padding:'2px'}} onClick={()=>{
            setProject([...project.slice(0, i), v.split(':')[0], ...project.slice(i+1)])
            setProjectName([...projectName.slice(0, i), v.split(': ')[1], ...projectName.slice(i+1)])
          }}>{v}</div>) : v
        }
      )}
    </div>)
  }

  function renderReport() {
    return project.map( (v,i)=> (
      <div key={i} style={{border: '2px solid #353740', marginBottom: 10, borderRadius: 10}}>
      {renderList(i)}
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
      <textarea
      className={styles.chatInput} style={{width: 'calc(100% - 60px)', marginLeft: '10px'}}
      name="key"
      placeholder={{"English":"Enter the description of your work.", "中文":"键入工作内容简述"}[language]}
      value={keywords[i]}
      onChange={(e) => {
        setKeywords([...keywords.slice(0, i), e.target.value, ...keywords.slice(i+1)])
      }}
      rows={1}
      onInput={ (e)=>{
          e.target.style.height = "auto";
          e.target.style.height = (e.target.scrollHeight - 24) + "px";
        }
      }></textarea>
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
      <span style={{margin: 10}}>{{"English":"Does your work require re-work?", "中文": "是否返工"}[language]}</span> <input type="checkbox" value={is_reversed[i]} onChange={(e)=>{setReversed([...is_reversed.slice(0, i), e.target.checked , ...is_reversed.slice(i+1)])}}></input>
      {is_reversed[i] ? <textarea
      className={styles.chatInput} style={{width: 'calc(100% - 60px)', marginLeft: '10px'}}
      name="re"
      placeholder={{"English":"Enter the reason.", "中文":"键入原因"}[language]}
      value={is_reversed_desc[i]}
      onChange={(e) => {
        setReversedDESC([...is_reversed_desc.slice(0, i), e.target.value, ...is_reversed_desc.slice(i+1)])
      }}
      rows={1}
      onInput={ (e)=>{
          e.target.style.height = "auto";
          e.target.style.height = (e.target.scrollHeight - 24) + "px";
        }
      }></textarea> : ''}
      <span style={{margin: 10}}>{{"English":"Is your work standardized?", "中文": "是否符合标准化"}[language]}</span> <input type="checkbox" value={is_standardized[i]} onChange={(e)=>{setStandardized([...is_standardized.slice(0, i), e.target.checked , ...is_standardized.slice(i+1)])}}></input>
      {is_standardized[i] ? <textarea
      className={styles.chatInput} style={{width: 'calc(100% - 60px)', marginLeft: '10px'}}
      name="st"
      placeholder={{"English":"Enter the reason.", "中文":"键入原因"}[language]}
      value={is_standardized_desc[i]}
      onChange={(e) => {
        console.log(is_standardized)
        setStandardizedDESC([...is_standardized_desc.slice(0, i), e.target.value, ...is_standardized_desc.slice(i+1)])
      }}
      rows={1}
      onInput={ (e)=>{
          e.target.style.height = "auto";
          e.target.style.height = (e.target.scrollHeight - 24) + "px";
        }
      }></textarea> : ''}
      <div className={styles.add} style={{margin: 10, backgroundColor: '#905050'}} onClick={
        () => {
          if (confirm({"English": 'Are you sure to delete this entry?', "中文": '确定删除本条工时记录？'}[language])) {
            setHours([...hours.slice(0, i), ...hours.slice(i+1)])
            setProject([...project.slice(0, i), ...project.slice(i+1)])
            setReversed([...is_reversed.slice(0, i), ...is_reversed.slice(i+1)])
            setStandardized([...is_standardized.slice(0, i), ...is_standardized.slice(i+1)])
            setKeywords([...keywords.slice(0, i), ...keywords.slice(i+1)])
            setStage([...stage.slice(0, i), ...stage.slice(i+1)])
            setProjectName([...projectName.slice(0, i), ...projectName.slice(i+1)])
            setProjectList([...projectList.slice(0, i), ...projectList.slice(i+1)])
            setReversedDESC([...is_reversed_desc.slice(0, i), ...is_reversed_desc.slice(i+1)])
            setStandardizedDESC([...is_standardized_desc.slice(0,i), ...is_standardized_desc.slice(i+1)])
          }
        }
      }>{{"English":"Delete this entry", "中文": "删除本条工时记录"}[language]}</div>
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
    if (response.ok) {
      const data = await response.json();
      sessionStorage.setItem('jwtToken', data.access_token);
      await resetSession()
      addResult({"English":"Log in successful", "中文": "登录成功"}[language]) // Return the JWT token
      setPopup(false)
    } else if (response.status === 401) {
      alert({"English": "invalid username or password. Please try again.", "中文": "未知的用户名/密码，请重试。"}[language])
    }
    else {
        throw new Error(response.message);
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
      const res = await fetch("http://"+IP+":8888/query", {
        method: 'POST',
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${sessionStorage.getItem('jwtToken')}`
        },
        body: JSON.stringify({
          query: "SELECT project.name AS name, work_hour.hour AS hour FROM work_hour JOIN employee ON employee.uuid = work_hour.employee_id JOIN project ON project.uuid = work_hour.project_id WHERE (employee.name LIKE '%" + username + "%' OR employee.alias LIKE '%" + username + "%') AND start_date >= '" + `${new Date(lastWeek-7*86400000).getFullYear()}/${new Date(lastWeek-7*86400000).getMonth()+1}/${new Date(lastWeek-7*86400000).getDate()}';`
        })
      }
      );
      if (res.status === 200) {
        const hours = (await res.json()).result;
        console.log(hours);
        var baseTime = {"English":"New session created, showing my last week work", "中文": "新的聊天已创建，以下是我的上周工时"}[language];
        var totalHour = 0
        for (let i=0;i<hours.length;i++) {
          baseTime += "\n" + hours[i].name + ": " + hours[i].hour + "h";
          totalHour += parseFloat(hours[i].hour ? hours[i].hour : '0');
        }
        setResult([{message: baseTime + {"English": "\n Total work hour: ", "中文":"\n共计工时："}[language] + totalHour.toString(), client: false}])
      }

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
        {renderlog()}
      </main>
      
    </div>
  );
  
}
