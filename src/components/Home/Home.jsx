import React, { useEffect, useState, useRef } from 'react'
import styles from "./Home.module.css"
import app from "../../Firebase.jsx"
import { Col, Row, Container } from "react-bootstrap"
import { useLocation, useNavigate } from 'react-router-dom';
import { useMediaQuery } from "@uidotdev/usehooks";
import { collection, query, getFirestore, getDocs, where, limit, onSnapshot, orderBy } from 'firebase/firestore';
import FriendListContainer from "../FriendListContainer/FriendListContainer.jsx"
import ChatRoomContainer from '../ChatRoomContainer/ChatRoomContainer.jsx';
import ChatDialogBox from '../ChatDialogBox/ChatDialogBox.jsx';

const Home = () => {
  const isSmallDevice = useMediaQuery("only screen and (max-width : 992px)");
  const notSmallDevice = useMediaQuery(
    "only screen and (min-width : 992px)"
  );
  const location = useLocation();
  const navigate = useNavigate();
  const userId = location.state?.userId || {};
  if(JSON.stringify(userId) === '{}')
    {
      navigate("/");
    }

  // Two refs to handle closing of ChatBoxDialogue
  // For box itself
  const ChatBoxRef = useRef(null);
  // For Add btn
  const AddBtnRef = useRef(null);
  const db = getFirestore(app);


  // State management for users and Friends List
  // USersLIst has people that are not your friends and you want to make them your friends
  const [usersList, setUsersList] = useState([]);
  const [friendsList, setFriendsList] = useState([]);
  const [initialList, setInitialList] = useState([]);
  //Username that is searched in addchatDialogue
  const [searchedUsername, setSearchedUsername] = useState("");
  // USed to do conditional rendering of matched users list
  const [matchedUserFound, setMatchedUserFound] = useState("unknown")
  // State management for add new friend dialog
  const [addChatDialog, setAddChatDialog] = useState(false);
  // used to display info about the selected friend in the chat room
  const [chatRoomInfo, setChatRoomInfo] = useState(null);
  // All messages so far
  const [Messages, setMessages] = useState([]);
  const [isVisible,setIsVisible] = useState(true)
  const [currentRoomOpen,setCurrentRoomOpen] = useState(null);
  // Getting real Time updates from firestore for the messages
  useEffect(() => {
    if (chatRoomInfo && userId) {
      const q = query(collection(db, "messages"),
        where('SenderID', 'in', [userId, chatRoomInfo.data().userID]),
        where('ReceiverID', 'in', [userId, chatRoomInfo.data().userID]),
        orderBy("createdAt", "asc"),
        limit(50));
      onSnapshot(q, (querySnapshot) => {
        let fetchedMessages = [];
        querySnapshot.forEach((doc) => {
          fetchedMessages.push(doc.data());
        })
        console.log(fetchedMessages);
        setMessages(fetchedMessages);
      })
    }
  }, [chatRoomInfo, userId, db])

  //Getting all friends from firestore
  useEffect(() => {
    async function handle() {
      if (userId) {
        const q = query(collection(db, "users"), where("userID", "==", userId));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          const targetDocRef = querySnapshot.docs[0].ref;
          const CollectionRef = collection(targetDocRef, "friends");
          const unsubscribe = onSnapshot(CollectionRef, (QuerySnapshot) => {
            let list = [];
            QuerySnapshot.forEach((friend) => {
              list.push(friend);
            })
            setFriendsList(list);
            setInitialList(list);
          })
          return () => unsubscribe();

        }
      }
    }
    handle();
  }, [db, userId])
//  Getting all signed up users from firestore
  useEffect(() => {
    async function handle() {
      if (userId) {
        const q = query(collection(db, "users"), where("userID", "==", userId));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          const targetDocRef = querySnapshot.docs[0].ref;
          const CollectionRef = collection(targetDocRef, "friends");
          const friendsList = await getDocs(CollectionRef);
          let FriendIds = [];
          friendsList.forEach((doc) => {
            FriendIds.push(doc.data().userID);
          })
          // Adding the current user ID to exclude from the final users list
          FriendIds.push(userId);

          // If there are more than 10 IDs to exclude, you'll need to handle it differently.
          if (FriendIds.length <= 10) {
            // Query to get all users excluding the current user and the friends
            const usersRef = collection(db, "users");
            const q2 = query(usersRef, where("userID", "not-in", FriendIds));

            const unsubscribe = onSnapshot(q2, (querySnapshot) => {
              const list = [];
              querySnapshot.forEach((doc) => {
                list.push(doc.data());
              });
              setUsersList(list);
            });

            return () => unsubscribe();
          } else {
            // If there are more than 10 IDs to exclude, you might need to fetch all users and filter them in memory
            const usersRef = collection(db, "users");
            const unsubscribe = onSnapshot(usersRef, (querySnapshot) => {
              const list = [];
              querySnapshot.forEach((doc) => {
                if (!FriendIds.includes(doc.data().userID)) {
                  list.push(doc.data());
                }
              });
              setUsersList(list);
            });
            return () => unsubscribe();
          }
        }

      }
    }
    handle();
  }, [db])

  // Adding eventListener on window to remove the addChatdialogue on clicking anywhere beside the dialogue box
  useEffect(() => {
    const handleClick = (event) => {
      if (addChatDialog && ChatBoxRef.current && !ChatBoxRef.current.contains(event.target) && !AddBtnRef.current.contains(event.target)) {
        setAddChatDialog(false);
        setMatchedUserFound("unknown");
        setSearchedUsername("");
      }
    }
    window.addEventListener("click", handleClick)
  }, [addChatDialog])

  useEffect(()=>{
    setIsVisible(true)
  },[notSmallDevice])
  return (
    <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <Container className={styles.homeContainer}>
        <Row className='h-100 w-100' style={{marginRight: "0px",marginLeft: "0px"}}>
          {/* First Section */}
          <Col lg={3} className={styles.myBorderEnd} 
          style={(isSmallDevice && !isVisible) ? {display:"none"}:{display:"block"}}>
            <FriendListContainer
              userId={userId}
              setIsVisible={setIsVisible}
              friendsList={friendsList}
              isVisible={isVisible}
              setAddChatDialog={setAddChatDialog}
              setFriendsList={setFriendsList}
              setCurrentRoomOpen={setCurrentRoomOpen}
              AddBtnRef={AddBtnRef}
              setChatRoomInfo={setChatRoomInfo}
              initialList={initialList}
            />
          </Col>
          {/* Second and third Section */}
          <Col lg={9} className={styles.rightPanel}
            style={{
              display: isSmallDevice && !isVisible ? 'block' : notSmallDevice? "block": 'none',
              position: !isVisible && 'absolute' // Apply position only when invisible
            }}>
            {!chatRoomInfo ? <div style={{ fontSize: "1.7rem" }}>
              Select a chat to start conversation
            </div> : <ChatRoomContainer
              userId={userId}
              setIsVisible={setIsVisible}
              chatRoomInfo={chatRoomInfo}
              Messages={Messages} />}
          </Col>
        </Row>
        {/* Add new Chat dialog box */}
        <ChatDialogBox
        addChatDialog={addChatDialog}
        ChatBoxRef={ChatBoxRef}
        userId={userId}
        setMatchedUserFound={setMatchedUserFound}
        matchedUserFound={matchedUserFound}
        searchedUsername={searchedUsername}
        setSearchedUsername={setSearchedUsername}
        usersList={usersList}/>
      </Container>
    </div>
  )
}

export default Home