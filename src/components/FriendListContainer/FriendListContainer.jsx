import React, { useRef} from 'react'
import styles from "./FriendListContainer.module.css"
import { MdModeEditOutline } from "react-icons/md";
import { FaRegImage } from "react-icons/fa6";
import app from "../../Firebase.jsx";
import { useMediaQuery } from "@uidotdev/usehooks";
import { FaPlus } from "react-icons/fa6";
import { FaCamera } from "react-icons/fa6";
import { IoMdArrowRoundBack } from "react-icons/io";
import { IconContext } from 'react-icons/lib';
import { Form, Button, Row, Col } from "react-bootstrap";
import { useEffect, useState } from 'react';
import { FaRegTrashCan } from "react-icons/fa6";
import {v4} from "uuid";
import { collection, query, updateDoc, where, getDocs, getFirestore, onSnapshot, deleteDoc, writeBatch } from 'firebase/firestore';
import { getDownloadURL, getStorage, uploadBytes,ref } from 'firebase/storage';

const FriendListContainer = ({ userId, friendsList, setAddChatDialog, setFriendsList, AddBtnRef, setChatRoomInfo, initialList,setCurrentRoomOpen,setIsVisible,isVisible}) => {
  const notSmallDevice = useMediaQuery(
    "only screen and (min-width : 992px)"
  );
  // used to filter friends search button a controlled input
  const [searchFriend, setSearchFriend] = useState("");
  const [editProfile, setEditProfile] = useState(false);
  // to be displayed foran
  const [data,setData] = useState({})
  // To save the image in db (not for preview purposes)
  const [imgPreview,setImgPreview] = useState("");
  const [user, setUser] = useState({});
  const [imageChanged,setImageChanged] = useState(false)
  const [deleteChats, setDeleteChats] = useState(false);
  const [saved,setSaved] = useState(false);
  const [selectedFriends, setSelectedFriends] = useState([])
  const cameraRef = useRef(null);
  const db = getFirestore(app);
  const storage = getStorage(app);
  // Passing friend info to the state to be used by the chat room div
  const fun = ()=>{console.log(isVisible)}
  const handleOpenChatRoom = (doc) => {
    if(!notSmallDevice){
      setIsVisible(false);
    }
    fun()
    // setCurrentRoomOpen(doc.data().userID)
    setChatRoomInfo(doc);
  }
  const handleDeleteFriends = async () => {
    // mesages will be delted for only the selectedFriends present in this array
    let toDeleteFrom = [];
    try {

      // Deleting friends from logged in user's list
      const friendsQuery = query(collection(db, "users"), where("userID", "==", userId));
      const querySnapshot = await getDocs(friendsQuery);
      if (!querySnapshot.empty) {
        const friendsQuery2 = query(collection(querySnapshot.docs[0].ref, "friends"), where("userID", "in", selectedFriends));
        const querySnapshot2 = await getDocs(friendsQuery2);
        if (!querySnapshot2.empty) {
          const batch = writeBatch(db)
          querySnapshot2.forEach(async (doc) => {
            batch.delete(doc.ref);
          })
          await batch.commit();
        }
      }
      // Deleting the messages as well only if friend is removed from senders as well as receivers list
      const checkUserEXistQuery = query(collection(db, "users"), where("userID", "in", selectedFriends));
      const checkQuerySnapshot = await getDocs(checkUserEXistQuery);
      if (!checkQuerySnapshot.empty) {
        for (const doc of checkQuerySnapshot.docs) {
          const checkUserEXistQuery2 = query(collection(doc.ref, "friends"), where("userID", "==", userId));
          const querySnapshot3 = await getDocs(checkUserEXistQuery2);
          // Checking if they have also deleted my chat
          if (querySnapshot3.empty) {
            toDeleteFrom.push(doc.data().userID);
          }
        }
        if (toDeleteFrom.length > 0) {
          const messageQuery = query(collection(db, "messages"), where("SenderID", "in", [userId, ...toDeleteFrom]),
            where("ReceiverID", "in", [userId, ...toDeleteFrom]));
          const messageSnapshot = await getDocs(messageQuery);
          if (!messageSnapshot.empty) {
            const batch = writeBatch(db);
            messageSnapshot.forEach((doc) => {
              batch.delete(doc.ref)
            })
            await batch.commit();
          }
        }
        setDeleteChats(false)
        setChatRoomInfo(null);
        setSelectedFriends([]);
      }
    }
    catch (error) {
      alert("Error deleting the chat")
    }
  }
  const handleCheckBoxChange = (doc) => {
    let list = []
    if (!selectedFriends.includes(doc.data().userID))
      list = [...selectedFriends, doc.data().userID]
    else {
      list = selectedFriends.filter((friendId) => {
        return friendId != doc.data().userID;
      })
    }
    setSelectedFriends(list)
  }
  const handleEditProfileInfo = async () => {
    let url = imgPreview
    if(imageChanged)
      {
        const imageRef = ref(storage,`images/${v4()}`);
        const snapshot = await uploadBytes(imageRef,data.img);
        url = await getDownloadURL(snapshot.ref);
      }
    const q = query(collection(db, "users"), where("userID", "==", userId));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      updateDoc(querySnapshot.docs[0].ref, {
        username: data.username,
        about: data.about,
        email: data.email,
        avatar:url
      })
    }

    // Now updating all the docs in which this user is present that is in his friends friendList
    const q2 = query(collection(db, "users"));
    const querySnapshot2 = await getDocs(q2);
    if (!querySnapshot2.empty) {
      querySnapshot2.forEach(async (doc) => {
        const q3 = query(collection(doc.ref, "friends"), where("userID", "==", userId));
        const QuerySnapshot = await getDocs(q3);
        if (!QuerySnapshot.empty) {
          updateDoc(QuerySnapshot.docs[0].ref, {
            username: data.username,
            about: data.about,
            email: data.email,
            avatar: url
          })
        }
      })
    }
    setSaved(true)
    setImageChanged(false);
  }
  const handleUploadNewImg = ()=>{
    if(cameraRef.current)
      {
        cameraRef.current.click();
      }
      setSaved(false) 

  }
  // Filtering friend list 
  useEffect(() => {
    if (searchFriend === "") {
      setFriendsList(initialList);
    }
    else {
      const newList = friendsList.filter((item) => {
        return item.data().username.toLowerCase().includes(searchFriend.toLowerCase());
      });
      setFriendsList(newList);
    }
  }, [searchFriend, friendsList])

  // gets logged in user data from firestore
  useEffect(() => {
    async function handle() {
      // Getting user data(Avatar + username) from firestore 
      const Firestorequery = query(collection(db, "users"), where("userID", "==", userId));
      const unsubscribe = onSnapshot(Firestorequery, (querySnapshot) => {
        let userDoc = null;
        if (!querySnapshot.empty) {
          userDoc = querySnapshot.docs[0].data();
        }
        setUser(userDoc);
        if (userDoc) {
          setData({
            email:userDoc.email,
            about:userDoc.about,
            username:userDoc.username,
            img:userDoc.avatar
          })

          setImgPreview(userDoc.avatar);
        }
      });
      return () => unsubscribe();
    }
    handle();
  }, [userId])

  return (
    <div className={styles.mainContainer}>
      {!editProfile ? (
        <>
          {/* Logged in user Info (Topmost Section)*/}
          <div className={styles.userInfo}>
            <img src={user?.avatar || "/assets/DefaultUser.png"} alt="Avatar" className={styles.avatar} />
            <p className={styles.userName}>{user?.username || "Username"}</p>
            <div className={styles.links}>
              <IconContext.Provider value={{ size: 28 }}>
                <FaRegTrashCan onClick={() => setDeleteChats(true)} />
                <MdModeEditOutline
                  onClick={() => { 
                    setEditProfile(true);
                  }} />
              </IconContext.Provider>
            </div>
          </div>
          {/* Search bar + add button */}
          <div>
            <Form className='d-flex mt-4 gap-5'>
              <Form.Control
                type="text"
                placeholder="Search"
                value={searchFriend}
                onChange={(event) => setSearchFriend(event.target.value)}
                className={styles.searchBtn}
              />
              <div className={styles.addContainer}
                onClick={() => { setAddChatDialog(true); }}
                ref={AddBtnRef}><FaPlus /></div>
            </Form>
          </div>
          {/* Friends List / Chats */}
          <div className='mt-4'>
            {
              friendsList.length !== 0 && friendsList.map((doc) => {
                return (
                  <div key={doc.data().userID} 
                  className={styles.eachFriendListItem}
                  style={{cursor:"pointer"}}
                   onClick={() => handleOpenChatRoom(doc)}>
                    <img src={doc.data().hasBlocked?  "/assets/DefaultUser.png" : (doc.data().avatar || "/assets/DefaultUser.png")} alt="Image" className={styles.avatar} width={50} height={50} />
                    <div>
                      <p className={styles.searchedusername}>{doc.data().hasBlocked? "Username":doc.data().username}</p>
                      {doc.data().isImg ?
                        <div className='d-flex gap-2 mb-2'>
                          <FaRegImage style={{marginTop: "3px"}}/>
                          <p className={styles.lastMessage}>{doc.data().lastMessage}</p>
                        </div>
                        : <p className={styles.lastMessage}>{doc.data().lastMessage}</p>}
                    </div>
                    {deleteChats &&
                      <IconContext.Provider value={{ size: 28 }}>
                        <Form.Check
                          className='ms-auto'
                          style={{
                            width: "1.3rem", height: "1.3rem"
                          }}
                          type={"checkbox"}
                          onChange={() => { handleCheckBoxChange(doc) }}
                        />
                      </IconContext.Provider>}
                  </div>)
              })
            }
          </div>
          {/* Delete and go back button */}
          {deleteChats && <Row className={styles.deleteSection}>
            <Col xs="2">
              <IconContext.Provider value={{ size: 28 }}>
                <IoMdArrowRoundBack onClick={() => setDeleteChats(false)} />
              </IconContext.Provider>
            </Col>
            <Col xs="10">
              <Button
                variant='danger'
                className='w-100'
                onClick={handleDeleteFriends}
                disabled={selectedFriends.length === 0}
              >Delete</Button>
            </Col>
          </Row>}
        </>
      ) :
        (
          <>
            <div className={styles.settingsTopBar}>
              <IconContext.Provider value={{ size: 28 }}>
                <IoMdArrowRoundBack
                  style={{ cursor: "pointer" }}
                  onClick={() => { setEditProfile(false) }} />
              </IconContext.Provider>
              <p className={styles.settingsTopBarText}>Profile</p>
            </div>
            <div className='mt-4 d-flex justify-content-center'>
              <img src={imgPreview} alt="Avatar" width={200} height={200} className={styles.settingsAvatar} />
              <div onClick={handleUploadNewImg} className={styles.capture}>
                <FaCamera />
              </div>
              <input type="file" accept='img/*' ref={cameraRef} hidden onChange={(event)=>{
                const files = event.target.files;
                if(files)
                  {
                    setImgPreview(URL.createObjectURL(files[0]));
                    setData({...data,img:files[0]});
                    setImageChanged(true);
                  }
              }}/>
            </div>
            <div className='mt-2'>
              <Form className='d-flex flex-column'>
                <Form.Group className='my-3'>
                  <Form.Label className={styles.labels}>
                    Username
                  </Form.Label>
                  <Form.Control
                    type="text"
                    placeholder={data.username}
                    value={data.username}
                    onChange={(event) => 
                      {setData({...data,username :event.target.value});
                        setSaved(false) }}
                    className='align-self-center'
                    style={{ background: "transparent", border: "none", borderBottom: "1px solid #a5a5a5", color: "#fff", borderRadius: "0" }}
                  />
                </Form.Group>

                <Form.Group className='my-3'>
                  <Form.Label className={styles.labels}>
                    About
                  </Form.Label>
                  <Form.Control
                    type="text"
                    placeholder={data.about}
                    value={data.about}
                    onChange={(event) => {setData({...data,about :event.target.value});setSaved(false)}}
                    style={{ background: "transparent", border: "none", borderBottom: "1px solid #a5a5a5", color: "#fff", borderRadius: "0" }}
                  />
                </Form.Group>
                <Form.Group className='my-3'>
                  <Form.Label className={styles.labels}>
                    Email
                  </Form.Label>
                  <Form.Control
                    type="text"
                    placeholder={data.email}
                    value={data.email}
                    onChange={(event) => {setData({...data,email :event.target.value});setSaved(false)}}
                    style={{ background: "transparent", border: "none", borderBottom: "1px solid #a5a5a5", color: "#fff", borderRadius: "0" }}
                  />
                </Form.Group>
                <Button className='mt-3' onClick={handleEditProfileInfo}
                disabled={saved}>{saved ? "Saved" : "Save"}</Button>
              </Form>
            </div>
          </>
        )}



    </div>
  )
}

export default FriendListContainer