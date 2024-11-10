import React, { useRef, useState, useEffect } from 'react';
import { Row, Col, Button, Form } from "react-bootstrap";
import styles from "./ChatRoomContainer.module.css";
import { IconContext } from 'react-icons/lib';
import { FaVideo, FaCircleInfo, FaRegImage, FaCamera, FaMicrophone } from "react-icons/fa6";
import { IoCall } from "react-icons/io5";
import { BsFillEmojiSmileFill } from "react-icons/bs";
import EmojiPicker from 'emoji-picker-react';
import Message from "../Message/Message.jsx";
import { IoMdArrowRoundBack } from "react-icons/io";
import app from "../../Firebase.jsx";
import { MdArrowDownward, MdArrowUpward } from "react-icons/md";
import { IoMdClose } from "react-icons/io";
import { FaDownload } from "react-icons/fa6";
import { v4 } from "uuid";
import { useMediaQuery } from "@uidotdev/usehooks";
import { ref, getStorage, getDownloadURL, uploadBytes, listAll, getMetadata } from 'firebase/storage';
import { collection, query, getFirestore, getDocs, where, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import WebcamImg from '../Webcam-Img/WebcamImg.jsx';
import { useNavigate } from 'react-router-dom';

const ChatRoomContainer = ({ userId, chatRoomInfo, Messages, setIsVisible, isVisible }) => {
    const isSmallDevice = useMediaQuery("only screen and (max-width : 992px)");
    // For uploading image
    const UploadImgRef = useRef(null);
    // For scrolling in chat box
    const ScrollRef = useRef(null);
    const navigate = useNavigate();
    const [openInfo, setOpenInfo] = useState(false)
    const [openCallHistory, setOpenCallHistory] = useState(false);
    const [openSharedFiles, setOpenSharedFiles] = useState(false);
    const [sharedFilesList, setSharedFilesList] = useState([]);
    const [openEmojiPicker, setOpenEmojiPicker] = useState(false);
    const [openWebCam, setOpenWebCam] = useState(false);
    const [textMessage, setTextMessage] = useState("");
    const [showMore, setShowMore] = useState(false)
    const db = getFirestore(app);
    const storage = getStorage(app);
    const [array, setArray] = useState([]);
    const displayStyle = openInfo ? "flex" : "none";
    const handleImgDownload = async (item) => {
        try {
            const response = await fetch(item.url, {
                mode: 'cors' // Ensure CORS mode is enabled
            });
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const anchor = document.createElement("a");
            anchor.href = url;
            anchor.download = item.name || "downloaded_image.jpeg";
            document.body.appendChild(anchor);
            anchor.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(anchor);
        } catch (err) {
            console.log("Error downloading the image", err);
        }
    };

    const handleSharedFiles = async () => {
        const q = query(collection(db, "messages"),
            where("SenderID", "in", [userId, chatRoomInfo.data().userID]),
            where("ReceiverID", "in", [userId, chatRoomInfo.data().userID]),
            where("isImg", "==", true));
        try {
            const querySnapshot = await getDocs(q);
            let filesList = [];
            if (!querySnapshot.empty) {
                querySnapshot.docs.forEach((doc, index) => {
                    filesList.push({ url: doc.data().message, name: `image${index}` });
                })
            }
            console.log(filesList);
            setSharedFilesList(filesList);
        }
        catch (err) {
            console.log(err)
        }
    }

    const handleBlockUser = async (block) => {
        try {
            // Function to update the status in the friends list
            const updateStatus = async (user, friend, statusField) => {
                const CollectionRef = collection(db, "users");
                const q = query(CollectionRef, where("userID", "==", user));
                const querySnapshot = await getDocs(q);

                if (querySnapshot.empty) {
                    console.log(`User with ID ${user} not found`);
                    return;
                }

                const userRef = querySnapshot.docs[0].ref;
                const friendQuery = query(collection(userRef, "friends"), where("userID", "==", friend));
                const friendQuerySnapshot = await getDocs(friendQuery);

                if (friendQuerySnapshot.empty) {
                    console.log(`Friend with ID ${friend} not found`);
                    return;
                }

                const friendRef = friendQuerySnapshot.docs[0].ref;
                await updateDoc(friendRef, {
                    [statusField]: !block
                });

                console.log(`${statusField} status updated for friend with ID ${friend}`);
            };

            // Blocking the friend in the user's friend list
            await updateStatus(userId, chatRoomInfo.data().userID, "isBlocked");

            // In the friend's friend list, set hasBlocked to true so that the friend knows they've been blocked by this user
            await updateStatus(chatRoomInfo.data().userID, userId, "hasBlocked");

        } catch (err) {
            console.error("Error blocking the user:", err);
            alert("Error blocking the user:", err);
        }
    };

    // Uploading images for sending to friends
    const handleUpload = async (event) => {
        const files = event.target.files;
        if (files) {
            for (let i = 0; i < files.length; i++) {
                async function handle() {
                    const imageRef = ref(storage, `images/${v4()}`);
                    const snapshot = await uploadBytes(imageRef, files[i]);
                    const url = await getDownloadURL(snapshot.ref);
                    // storing message in db
                    const CollectionRef = collection(db, "messages");
                    await addDoc(CollectionRef, {
                        SenderID: userId,
                        ReceiverID: chatRoomInfo.data().userID,
                        createdAt: serverTimestamp(),
                        message: url,
                        caption: "",
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
                                await updateDoc(newSnapshot.docs[0].ref, { lastMessage: lastMsg })
                            }
                        }
                    }

                    await updateLastMessage(userId, chatRoomInfo.data().userID, "Image");
                    await updateLastMessage(chatRoomInfo.data().userID, userId, "Image");
                }
                handle();

            }
        }
    }

    const handleSendMessage = async (e) => {
        setTextMessage("");
        // storing message in db
        const CollectionRef = collection(db, "messages");
        await addDoc(CollectionRef, {
            SenderID: userId,
            ReceiverID: chatRoomInfo.data().userID,
            createdAt: serverTimestamp(),
            message: textMessage,
            caption: "",
            isImg: false
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
                    await updateDoc(newSnapshot.docs[0].ref, { lastMessage: lastMsg, isImg: false })
                }
            }
        }

        await updateLastMessage(userId, chatRoomInfo.data().userID, "You : " + textMessage);
        await updateLastMessage(chatRoomInfo.data().userID, userId, textMessage);

    }
    // For show more button 
    useEffect(() => {
        const newArray = (showMore && sharedFilesList.length > 5) ? sharedFilesList : sharedFilesList.slice(0, 3);
        setArray(newArray)
    }, [sharedFilesList, showMore])
    // fOR Automatic Scrolling 
    useEffect(() => {
        if (ScrollRef.current)
            ScrollRef.current.scrollIntoView({ behaviour: "smooth" });
    }, [Messages])

    return (
        <div className='w-100' >
            <Row style={{ width: "100%" }} className='h-100'>
                <Col lg={(openWebCam || !openInfo) ? 12 : 9} className={styles.middleChatComponent} 
                style={(!openWebCam || openInfo && isSmallDevice) ? { display:"none"} : { borderRight: "0" ,display:"block"}}>
                    <div className='d-flex flex-column h-100'>
                        <div className={styles.chatRoomTopSection}>
                            {isSmallDevice && !isVisible && <IconContext.Provider value={{ size: 28 }}>
                                <IoMdArrowRoundBack onClick={() => setIsVisible(true)} />
                            </IconContext.Provider>}
                            <img src={chatRoomInfo.data().hasBlocked ? "/assets/DefaultUser.png" : (chatRoomInfo.data().avatar || "/assets/DefaultUser.png")} alt="Image" className={styles.avatar} />
                            <div>
                                <p className={styles.searchedusername}>{chatRoomInfo.data().hasBlocked ? "Username" : chatRoomInfo.data().username}</p>
                                <p style={{ color: "#a5a5a5" }}>{chatRoomInfo.data().hasBlocked ? "" : chatRoomInfo.data().about}</p>
                            </div>
                            <div className={styles.links}>
                                <IconContext.Provider value={{ size: 28 }}>
                                    <IoCall style={{ cursor: "pointer" }} />
                                    <FaVideo style={{ cursor: "pointer" }} />
                                    <FaCircleInfo style={{ cursor: "pointer" }}
                                        onClick={() => setOpenInfo(!openInfo)} />
                                </IconContext.Provider>
                            </div>
                        </div>
                        {openWebCam ? <WebcamImg setOpenWebCam={setOpenWebCam}
                            userId={userId}
                            chatRoomInfo={chatRoomInfo}
                        /> : <>
                            <div className={styles.messageContainer}>
                                {Messages.length !== 0 && Messages.map((msg) => {
                                    return (
                                        <Message msg={msg} userId={userId} key={msg.createdAt} />
                                    )
                                })}
                                <span ref={ScrollRef}></span>
                            </div>
                            <div className={styles.btmSection}>
                                <Form className='d-flex'>
                                    <div className={styles.links}>
                                        <IconContext.Provider value={{ size: 28 }}>
                                            <FaRegImage
                                                onClick={() => {
                                                    if (chatRoomInfo.data().isBlocked || chatRoomInfo.data().hasBlocked)
                                                        return
                                                    UploadImgRef.current.click()
                                                }}
                                                style={{ cursor: "pointer" }} />
                                            <input
                                                type='file'
                                                accept="img/*"
                                                ref={UploadImgRef}
                                                hidden
                                                onChange={handleUpload}></input>
                                            <FaCamera
                                                onClick={() => {
                                                    if (chatRoomInfo.data().isBlocked || chatRoomInfo.data().hasBlocked)
                                                        return
                                                    setOpenWebCam(true)
                                                }}
                                                style={{ cursor: "pointer" }} />
                                            <FaMicrophone style={{ cursor: "pointer" }} />
                                        </IconContext.Provider>
                                    </div>
                                    <Form.Control
                                        type="text"
                                        placeholder={(chatRoomInfo.data().isBlocked || chatRoomInfo.data().hasBlocked) ? "Cannot send messages..." : "Type a message..."}
                                        value={textMessage}
                                        disabled={chatRoomInfo.data().isBlocked || chatRoomInfo.data().hasBlocked}
                                        onChange={(event) => setTextMessage(event.target.value)}
                                        className='mx-2'
                                    />
                                    <div className={styles.links}>
                                        <IconContext.Provider value={{ size: 28 }}>
                                            < BsFillEmojiSmileFill onClick={() => {
                                                if (chatRoomInfo.data().isBlocked || chatRoomInfo.data().hasBlocked)
                                                    return
                                                setOpenEmojiPicker(!openEmojiPicker)
                                            }
                                            }
                                                style={{ cursor: "pointer" }} />
                                        </IconContext.Provider>
                                    </div>
                                    {textMessage === "" ? <Button className='ms-2' disabled>Send</Button> : <Button className='ms-2'
                                        onClick={handleSendMessage}>Send</Button>}
                                </Form>
                                <EmojiPicker
                                    open={openEmojiPicker}
                                    onEmojiClick={(emojiData) => (setTextMessage(textMessage + emojiData.emoji))}
                                    style={{ position: "absolute", right: "-240px", bottom: "70px" }} />
                            </div></>}
                    </div>
                </Col>
               
                {(!openWebCam || openInfo) && (<Col md={12} lg={3} const style={{
                    paddingRight: "0px",
                    position: isSmallDevice?"absolute":"",
                display: displayStyle,
                flexDirection: "column"}
}>
                <div className="d-flex py-4 align-items-center" style={{ borderBottom: "1px solid #a5a5a5", marginTop: "13px" }}>
                    <IoMdClose onClick={() => setOpenInfo(false)} style={{ cursor: "pointer" }} />
                    <p className={styles.searchedusername} style={{ marginLeft: "10px" }}>Contact info</p>
                </div>
                {/* info section */}
                <div className='d-flex flex-column justify-content-center mt-5' style={{ borderBottom: "1px solid #a5a5a5" }}>
                    <img src={chatRoomInfo.data().hasBlocked ? "/assets/DefaultUser.png" : (chatRoomInfo.data().avatar || "/assets/DefaultUser.png")} alt="Image" className={styles.infoAvatar} />
                    <div style={{ alignSelf: "center", textAlign: "center" }}>
                        <p className={styles.infoUsername}>{chatRoomInfo.data().hasBlocked ? "Username" : chatRoomInfo.data().username}</p>
                        <p style={{ color: "#a5a5a5" }}>{chatRoomInfo.data().hasBlocked ? "" : chatRoomInfo.data().about}</p>
                    </div>
                </div>

                {/* Shared files and other options */}
                <div className={styles.infoOptions}>
                    <div className='d-flex justify-content-between py-2'
                        onClick={() => {
                            setOpenSharedFiles(!openSharedFiles);
                            handleSharedFiles();
                            setShowMore(false);
                        }}
                        style={{ cursor: "pointer" }}>
                        <p>Shared Files</p>
                        <div className={styles.upArrowContainer}>
                            {openSharedFiles ?
                                <MdArrowUpward />
                                : <MdArrowDownward />
                            }
                        </div>
                    </div>
                    {/* Shared Files to display */}
                    {(openSharedFiles && array.length !== 0) && <div >
                        <div className={styles.sharedImgContainer}>
                            {array.map((item) => {
                                return (
                                    <div key={item.name} className='d-flex gap-3 py-2'>
                                        <FaRegImage style={{ alignSelf: "center" }} />
                                        <p className='mb-0'>{item.name}</p>
                                        <FaDownload style={{ alignSelf: "center" }} className='ms-auto'
                                            onClick={() => handleImgDownload(item)} />
                                    </div>)
                            })}
                        </div>
                        {(sharedFilesList.length > 5) && <div className='d-flex flex-column mt-auto mb-3'>
                            <Button size='lg' className='mb-2' onClick={() => { setShowMore(!showMore) }}>{showMore ? "Show Less" : "Show More"}</Button>
                        </div>}
                    </div>}
                    {openSharedFiles && array.length === 0 && <p className='text-info'>No files </p>}
                    <div className='d-flex justify-content-between py-2'
                        onClick={() => {
                            setOpenCallHistory(!openCallHistory)
                        }}
                        style={{ cursor: "pointer" }}>
                        <p>Call History</p>
                        <div className={styles.upArrowContainer}>
                            {openCallHistory ?
                                <MdArrowUpward />
                                : <MdArrowDownward />
                            }
                        </div>
                    </div>
                </div>
                {/* LOgout and Block buttons */}
                <div className='d-flex flex-column mt-auto mb-3'>
                    <Button size='lg' className='mb-2' onClick={() => { navigate("/") }}>Logout</Button>
                    <Button variant='danger' size='lg'
                        onClick={() => handleBlockUser(chatRoomInfo.data().isBlocked)}
                        disabled={chatRoomInfo.data().hasBlocked}
                    >{chatRoomInfo.data().isBlocked ? "UnBlock" : "Block"}</Button>
                </div>
            </Col>)}
        </Row>



        </div >
    )
}

export default ChatRoomContainer