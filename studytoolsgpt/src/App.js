import './App.css';
import studyLogo from './assets/newstudylogo.png';
import addIcon from './assets/add-30.png';
import msgIcon from './assets/message.svg';
import home from './assets/home.svg';
import saved from './assets/bookmark.svg';
import upgrade from './assets/rocket.svg';
import sendBtn from './assets/send.svg';
import userIcon from './assets/user-icon.png';
import gptImgLogo from './assets/chatgptLogo.svg';

function App() {
  return (
    <div className="App">
      <div className="Sidebar">
        <div className="upperSidebar">
          <div className="upperSidebarTop">
            <img src={studyLogo} alt="Logo" className="logo" />
            <span className="brand">StudyToolsGPT</span>
          </div>
          <div className="tagline">
            <p className="tagline">Your AI Study Tool -Adithya Ganesh</p>
          </div>
          <button className="midBtn"><img src={addIcon} alt="New Chat" className="addBtn" />New Chat</button>
          <div className="upperSidebarBottom">
            <button className="query"><img src={msgIcon} alt="Query" className="OldChatButton" />What is StudyToolsGPT ?</button>
            <button className="query"><img src={msgIcon} alt="Query" className="OldChatButton" />How to use StudyToolsGPT ?</button>
            <button className="query"><img src={msgIcon} alt="Query" className="OldChatButton" />Newest Features</button>
          </div>
        </div>
        <div className="lowerSidebar">
          <div className="listItems"><img src={home} alt="Home" className="listItemsImg" />Home</div>
          <div className="listItems"><img src={saved} alt="Saved" className="listItemsImg" />Saved</div>
          <div className="listItems"><img src={upgrade} alt="Upgrade to Pro" className="listItemsImg" />Consider Sharing</div>

        </div>
      </div>
      <div className="Main">
        <div className="chats">
          <div className="chat">
            <img className="chatImg" src={userIcon} alt="" />
            <p className="txt">Hello this is StudyToolsGPT</p>
          </div>
          <div className="chat bot">
            <img className="chatImg" src={gptImgLogo} alt="" />
            <p className="txt">Hello this is StudyToolsGPT</p>
          </div>

        </div>
        <div className="chatFooter">
          <div className="inp">
            <input type="text" placeholder='Send a message'/>
            <button className="send"><img src={sendBtn} alt="Send" /></button>
          </div>
          <p>StudyToolsGPT may produce inaccurate information about people, places, or facts.</p>
        </div>
      </div>
    </div>
  );
}

export default App;
