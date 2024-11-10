import React, { useRef, useState } from 'react'
import Webcam from "react-webcam";
import { IoSendSharp } from "react-icons/io5";
import { IoIosRefresh } from "react-icons/io";
import app from "../../Firebase.jsx";

import {v4} from "uuid"
import styles from "./WebcamImg.module.css"
import { collection, query, getFirestore, getDocs, where, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { getStorage,ref,uploadBytes,getDownloadURL } from 'firebase/storage';
import { FaCamera} from "react-icons/fa6";
import { IoMdClose } from "react-icons/io";
import {Form } from 'react-bootstrap';
const WebcamImg = ({ setOpenWebCam,userId,chatRoomInfo}) => {

  const WebcamRef = useRef(null);
  const storage = getStorage(app);
  const db = getFirestore(app);
  const [imgSrc, setImgSrc] = useState(null);
  const [caption,setCaption] = useState("");
  const videoConstraints = {
    width: "100%",
    height:400
  }

  // Uploading real time images for sending to friends
  const handleSendWebCamImg = ()=>{
              async function handle() {
                  const imageRef = ref(storage, `images/${v4()}`);
                   // Convert Base64 string to Blob
                  const response = await fetch(imgSrc);
                  const blob = await response.blob();

                  // Specify the content type in the metadata
                  const metadata = {
                    contentType: 'image/jpeg',
                  };

                  // Upload the image with the correct MIME type
                  const snapshot = await uploadBytes(imageRef, blob, metadata);
                  const url = await getDownloadURL(snapshot.ref);
                  // storing message in db
                  const CollectionRef = collection(db, "messages");
                  await addDoc(CollectionRef, {
                      SenderID: userId,
                      ReceiverID: chatRoomInfo.data().userID,
                      createdAt: serverTimestamp(),
                      message: url,
                      caption:caption,
                      isImg: true
                  })
                  // Chanding the last message for receiver/friend so that it appears on senders side
                  const updateLastMessage = async (userID, friendID, lastMsg) => {
                      const q = query(collection(db, "users"),
                          where("userID", "==", userID));
                      const querySnapshot = await getDocs(q);
                      if (!querySnapshot.empty) {
                          const q2 = query(collection(querySnapshot.docs[0].ref, "friends"),
                              where("userID", "==", friendID));
                          const newSnapshot = await getDocs(q2);
                          if (!newSnapshot.empty) {
                              await updateDoc(newSnapshot.docs[0].ref, { lastMessage: lastMsg,isImg:true })
                          }
                      }
                  }
                  const msg = caption !== "" ? caption : "Image"
                  await updateLastMessage(userId, chatRoomInfo.data().userID,msg );
                  await updateLastMessage(chatRoomInfo.data().userID, userId,msg);
              }
              handle();
              setOpenWebCam(false);
  }
  const handleCapture = () => {
    const img = WebcamRef.current.getScreenshot();
    setImgSrc(img);
  }
  return (
    <div>
      <div className='d-flex ms-3 py-3 align-items-center' style={{ borderBottom: "1px solid #a5a5a5" }}>
        <IoMdClose onClick={() => setOpenWebCam(false)} style={{ cursor: "pointer" }} />
        <p className={styles.searchedusername}>Take Photo</p>
        {imgSrc && 
        <div 
        className='d-flex ms-auto align-items-center p-2' 
        style={{backgroundColor:"#03101d", borderRadius:"10%",cursor:"pointer"}}
        onClick={()=>setImgSrc(null)}>
          <IoIosRefresh/>
          <p className='mb-0'>Retake</p>
          </div>}
      </div>
      <div className='d-flex flex-column py-3 align-items-center'>
      {
          imgSrc ? <img src={imgSrc}></img> : <Webcam
          screenshotFormat='image/jpeg'
          videoConstraints={videoConstraints}
          audio={false}
          width={"60%"}
          height={"70%"}
          ref={WebcamRef}
        />
        }
          {imgSrc ? 
          <div className='d-flex w-100 align-items-center justify-content-center mt-3'>
            <Form className='d-flex w-50'>
           <Form.Control
            type="text"
            placeholder="Add Caption..."
            value={caption}
            onChange={(event)=>setCaption(event.target.value)}
            className='mx-2 align-self-center'
            />
            </Form>
          <div className={styles.capture} 
          onClick={handleSendWebCamImg}
          ><IoSendSharp/> </div>
          </div> 
          :
        <div onClick={handleCapture} className={styles.capture}>
          <FaCamera />
        </div>
}

      </div>
    </div>
  )
}

export default WebcamImg