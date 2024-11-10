import React, { useState } from 'react'
import {Form,Button} from "react-bootstrap"
import {Link, useNavigate} from "react-router-dom"
import app from "../../Firebase.jsx"
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import styles from "./Login.module.css"
import {getFirestore} from 'firebase/firestore';
const Login = () => {
  const [pwdStatus,setPwdStatus] = useState("valid");
  const [emailStatus,setEmailStatus] = useState("valid");
  const [isCredentialsValid,setIsCredentialsValid] = useState(true);
  const navigate = useNavigate();
  const db = getFirestore(app);
   // Form data
   const [data,setData] = useState({
    email:"",
    password:""
})
const auth = getAuth(app);
const validateEmail = ()=>{
  const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
  if(data.email === "")
      {
          setEmailStatus("empty");
          return false;
      }
      else if(!regex.test(data.email)){
          setEmailStatus("invalid");
          return false;
      }
      else{
          setEmailStatus("valid");
          return true;
      }
}
  const validatePwd = ()=>{
    if(data.password=== "")
        {
            setPwdStatus("empty");
            return false;
        }
        else{
            setPwdStatus("valid");
            return true;
        }
}
  const handleLogin = async ()=>{
    if(validateEmail() && validatePwd()){
      setIsCredentialsValid(true);
      try{
        const userInfo = await signInWithEmailAndPassword(auth,data.email,data.password);
        const userid = userInfo.user.uid;
        alert("Logged in successfully!")
        navigate("/home",{state:{userId:userid}});
      }
      catch(error)
      {
        alert(error.message);
      }
    }
    else{
      setIsCredentialsValid(false);
    }
  }
  return (
    <div className={styles.loginContainer}>
        <h2 className='mb-3'>Welcome Back,</h2>
        <Form className={styles.form}>
        <Form.Group controlId="formBasicEmail">
            <Form.Control 
            className={styles.email}
            onBlur={validateEmail}
            value={data.email}
            type="email" 
            style={emailStatus !== "valid" ? {marginBottom:"2px"}:{marginBottom:"20px"}}
            placeholder="Email" 
            onChange={(e)=>{setData({...data,email:e.target.value})}}
            />
            {emailStatus === "empty" && <p className={styles.error}>Email cannot be empty</p>}
            {emailStatus === "invalid" && <p className={styles.error}>Email is invalid</p>}
        </Form.Group>
        <Form.Group  controlId="formBasicPassword">
            <Form.Control 
            className={styles.password}
            type="password" 
            onBlur={validatePwd}
            style={pwdStatus !== "valid" ? {marginBottom:"2px"}:{marginBottom:"20px"}}
            value={data.password}
            onChange={(e)=>{setData({...data,password:e.target.value})}}
            placeholder="Password" />
            {pwdStatus === "empty" && <p className={styles.error}>Password cannot be empty</p>}
        </Form.Group>
        <Button 
        variant="primary" 
        className={styles.btn}
        onClick={handleLogin}
        >
            Sign In
        </Button>
        {!isCredentialsValid && <p className={styles.error}>Invalid Credentials</p>}
    </Form>
    <p className='mt-4'>Dont have an account?<Link to="/signup" className={styles.link}>Sign Up</Link></p>
    </div>
  )
}

export default Login