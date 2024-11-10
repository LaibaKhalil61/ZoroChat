import React from 'react'
import styles from "./Message.module.css"
import moment from "moment";
const Message = ({msg,userId}) => {
  const messageWidth = msg.isImg? "50" : "75";
  const foramtTimeStamp = (timestamp)=>{
    if(timestamp && timestamp.seconds){
      const date = moment(new Date(timestamp.seconds*1000)).format("lll");
      return date;
    }
  }
  return (
    <div className={msg.SenderID === userId? styles.msgRight: styles.msgLeft} style={{width:messageWidth + "%"}}>
      {msg.isImg ? <>
      <img src={msg.message} className={styles.uploadedImg}></img>
      {msg.caption !== "" && <p className='mt-2'>{msg.caption}</p>}
      </>:  <div>{msg.message}</div>}
        <div className={styles.timestamp}
        style={msg.isImg ? {marginTop:"5px"}:{}}
        >{foramtTimeStamp(msg.createdAt)}</div>
    </div>
  )
}

export default Message

