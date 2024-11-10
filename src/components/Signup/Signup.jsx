import React, { useState } from 'react'
import {Form,Button} from "react-bootstrap"
import styles from "./Signup.module.css"
import {Link, useNavigate} from "react-router-dom";
import { useRef } from 'react';
import app from "../../Firebase.jsx"
import {getAuth,createUserWithEmailAndPassword} from "firebase/auth"
import {getFirestore,collection,addDoc} from "firebase/firestore";
import {getDownloadURL, getStorage,ref, uploadBytes} from "firebase/storage"
import {v4} from "uuid";
const Signup = () => {
    // Form data
    const [data,setData] = useState({
        imgPreview:null,
        username:"",
        email:"",
        password:""
    })
    // State to check if image was selected or not
    const [imgSelected,setImgSelected] = useState(false);
    const [avatar,setAvatar] = useState(null);
    // for Form validation
    const [usernameStatus,setUsernameStatus] = useState("valid");
    const [emailStatus,setEmailStatus] = useState("valid");
    const [pwdStatus,setPwdStatus] = useState("valid");
    // to check whether to display error msg or not
    const [isCredentialsValid,setIsCredentialsValid] = useState(true);
    // Authentication and Firestore
    const auth = getAuth(app);
    const firestore = getFirestore(app);
    const storage = getStorage(app);
    const CollectionRef = collection(firestore,"users");
    const reference = useRef();
    const navigate = useNavigate();
    // To click the hidden form field
    const handleClick = ()=>{
        reference.current.click();
    }
    // Uploading the avatar
    const handleUpload = (event)=>{
        const file = event.target.files[0];
        if(file)
            {
                setImgSelected(true);
                setData({...data,imgPreview:URL.createObjectURL(file)});
                setAvatar(file);
            }
    }
    const validateUsername = ()=>{
        const regex = /^[a-zA-Z][a-zA-Z0-9 ]*$/
        if(data.username === "")
            {
                setUsernameStatus("empty");
                return false;
            }
            else if(!regex.test(data.username)){
                setUsernameStatus("invalid");
                return false;
            }
            else{
                setUsernameStatus("valid");
                return true;
            }
    }
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
        const regex = /^.{8,}$/
        const regex2 = /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/
        if(data.password=== "")
            {
                setPwdStatus("empty");
                return false;
            }
            else if(!regex.test(data.password)){
                setPwdStatus("short");
                return false;
            }
            else if(!regex2.test(data.password)){
                setPwdStatus("weak");
                return false;
            }
            else{
                setPwdStatus("valid");
                return true;
            }
    }
    const handleSignUp = ()=>{
        async function handle(){
            if(validateUsername() && validatePwd() && validateEmail()){
                setIsCredentialsValid(true);
                try{
                    const userInfo = await createUserWithEmailAndPassword(auth,data.email,data.password);
                    const UID = userInfo.user.uid;
                    const imageRef = ref(storage,`images/${v4()}`);
                    const snapshot = await uploadBytes(imageRef,avatar);
                    console.log(snapshot);
                    const DownloadUrl = await getDownloadURL(snapshot.ref)
                    await addDoc(CollectionRef,{
                        userID : UID,
                        avatar : DownloadUrl,
                        about:"Hey there,I'm using zoro chat",
                        email : data.email,
                        username : data.username
                       });
                    alert("Signed up successfully!");
                    navigate("/");
                }
                catch(error){
                    alert(error.message)
                }
        }
        else{
            setIsCredentialsValid(false);
        }   
}
    handle();
    }
  return (
    <div className={styles.signupContainer}>
        <h2 className='mb-3'>Create an Account</h2>
        <Form className={styles.form}>
        <div className={styles.avatarContainer}>
            {imgSelected ? <img src={data.imgPreview} width={60} height={55} className={styles.uploadedImg}></img>: <div className={styles.avatar}><p className='mb-0'>A</p></div>}
            <a 
            className={styles.uploadAvatar}
            onClick={handleClick}>Upload an avatar</a>
            <input type='file'
            accept='img/*'
            className={styles.hiddenField}
            ref ={reference}
            onChange={handleUpload}
            ></input>
        </div>
        <Form.Group controlId="formBasicUsername" className={styles.formGroup}>
            <Form.Control 
            className={styles.usrname}
            type="text" 
            onBlur={validateUsername}
            placeholder="Username" 
            value={data.username}
            style={usernameStatus !=="valid" ? {marginBottom:"2px"}:{marginBottom:"20px"}}
            onChange={(e)=>{setData({...data,username:e.target.value})}}/>
            {usernameStatus === "empty" && <p className={styles.error}>Username cannot be empty</p>}
            {usernameStatus === "invalid" && <p className={styles.error}>Username is invalid</p>}
        </Form.Group>
        <Form.Group controlId="formBasicEmail" className={styles.formGroup}>
            <Form.Control 
            className={styles.email}
            type="email" 
            placeholder="Email" 
            onBlur={validateEmail}
            value={data.email}
            style={emailStatus !== "valid" ? {marginBottom:"2px"}:{marginBottom:"20px"}}
            onChange={(e)=>{setData({...data,email:e.target.value})}}/>
            {emailStatus === "empty" && <p className={styles.error}>Email cannot be empty</p>}
            {emailStatus === "invalid" && <p className={styles.error}>Email is invalid</p>}
        </Form.Group>
        <Form.Group  controlId="formBasicPassword" className={styles.formGroup}>
            <Form.Control 
            className={styles.password}
            type="password" 
            onBlur={validatePwd}
            placeholder="Password" 
            value={data.password}
            style={pwdStatus !== "valid" ? {marginBottom:"2px"}:{marginBottom:"20px"}}
            onChange={(e)=>{setData({...data,password:e.target.value})}}/>
            {pwdStatus === "empty" && <p className={styles.error}>Passwprd cannot be empty</p>}
            {pwdStatus === "short" && <p className={styles.error}>Password must be 8 characters long</p>}
            {pwdStatus === "weak" && <p className={styles.error}>create a stronger password</p>}
        </Form.Group>
        <Button 
        variant="primary" 
        onClick={handleSignUp}
        className={styles.btn}
        >
            Sign up
        </Button>
        {!isCredentialsValid && <p className={styles.error}>Invalid Credentials</p>}
    </Form>
    <p className='mt-4'>Already have an account?<Link to="/" className={styles.link}>Sign In</Link></p>
    </div>
  )
}

export default Signup;