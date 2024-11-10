
import styles from './App.module.css';
import app from "./Firebase"
import Login from "./components/Login/Login"
import Home from "./components/Home/Home"
import Signup from './components/Signup/Signup';
import { BrowserRouter as Router,Route,Routes } from 'react-router-dom';
function App() {
  return (
    <Router>
    <div className={styles.app}>
      <Routes>
        <Route path='/' element={<Login/>}></Route>
        <Route path='/signup' element={<Signup/>}></Route>
        <Route path='/home' element={<Home/>}></Route>
      </Routes>
      
    </div>
    </Router>
  );
}

export default App;
