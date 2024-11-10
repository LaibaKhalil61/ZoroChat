import React,{useState} from 'react'
import { Form, Button } from "react-bootstrap"
import { collection, query,getDocs, where, addDoc, getFirestore} from 'firebase/firestore';
import styles from "./ChatDialogBox.module.css"
import app from "../../Firebase.jsx"

const ChatDialogBox = ({addChatDialog,ChatBoxRef,userId,setMatchedUserFound,matchedUserFound,searchedUsername,setSearchedUsername,usersList}) => {
    const db = getFirestore(app);
    const [matchedList, setMatchedList] = useState([]);
      // Searching for the user and adding it to matchedLIst
  const handleSearch = () => {
    if (searchedUsername !== "") {
      const list = usersList.filter((doc) => {
        return doc.username.toLowerCase().includes(searchedUsername.toLowerCase());
      });
      if (list.length === 0)
        setMatchedUserFound("unmatched");
      else {
        setMatchedUserFound("matched");
      }
      setMatchedList(list);
    }
  }


      // Adding user to friends list
  const handleAddUser = async (userID) => {
    const list = matchedList.filter((doc) => {
      return doc.userID === userID;
    });
    // Creating new Object/doc with two new fields and lastMessage
    if (list[0]) {
      const newFriend = { ...list[0], lastMessage: "" ,isImg:false,isBlocked:false,hasBlocked:false};
      // Getting reference to the document 
      const CollectionRef = collection(db, "users");
      const q = query(CollectionRef, where("userID", "==", userId));
      const querySnapshot = await getDocs(q);
      const userRef = querySnapshot.docs[0].ref
      await addDoc(collection(userRef, "friends"), newFriend);
    }
  }

  return (
    <>
{addChatDialog && <div className={styles.addChatDialog} ref={ChatBoxRef}>
          <p>Add new User</p>
          <Form className='d-flex gap-4'>
            <Form.Control type="text"
              placeholder="Username"
              value={searchedUsername}
              onChange={(e) => { setSearchedUsername(e.target.value); }} />
            {searchedUsername === "" ? <Button variant="primary" onClick={handleSearch} disabled>
              Search
            </Button> : <Button variant="primary" onClick={handleSearch}>
              Search
            </Button>}
          </Form>
          {matchedUserFound === "matched" && <div className='pt-4'>
            {matchedList.map((doc) => {
              return (
                <div key={doc.userID} className={styles.searchUserContainer}>
                  <div className='d-flex gap-3'>
                    <img src={doc.avatar || "/assets/DefaultUser.png"} alt="Image" className={styles.avatar} />
                    <p className={styles.searchedusername}>{doc.username}</p>
                  </div>
                  <Button variant="primary" onClick={() => handleAddUser(doc.userID)} className='ms-auto'>
                    Add User
                  </Button>
                </div>)
            })}
          </div>}
          {matchedUserFound === "unmatched" && <div>
            <p>No results Found</p>
          </div>}
        </div>}

    </>
  )
}

export default ChatDialogBox