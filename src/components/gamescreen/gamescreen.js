import React, { Component } from 'react';
import './gamescreen.css';
import ResultsDialog from '../results';
import CorrectSoundFile from '../../assets/correct-sound.mp3';
import WrongSoundFile from '../../assets/wrong-sound.mp3';
import NotNeigbourFile from '../../assets/beep.mp3';
import { database, auth } from '../../firebase.js'
const file = require("../../dictionary.txt");

class GameScreen extends Component {
  constructor(props) {
    super(props);
    this.state = {
      board: [],
      points: 0,
      dialogOpen: false,
      complete: false,
      timeInSec: 120,
      correctWords: [],
      users: [],
      offline: !navigator.onLine,
      selectedCorrectWords: []
    };
    this.wrongSound = new Audio(WrongSoundFile);
    this.correctSound = new Audio(CorrectSoundFile);
    this.notNeighbour = new Audio(NotNeigbourFile);
  }
  setOfflineState = () => {
    this.setState({ offline: !this.state.offline })
  }
  //Get the board from backend for the first time
  getBoard = () => {
    this.setState({ board: ["T", "A", "P", "*", "E", "A", "K", "S", "O", "B", "R", "S", "S", "*", "X", "D"] });
  }

  finalWord = [];
  finalIndex = [];
  neigbourArr = [];
  submittedwords = [];
  correctWords = [];

  selectChar(e, params) {

    let selectedIndex = e.target.id.split("");
    for (var i = 0; i < selectedIndex.length; i++) {
      selectedIndex[i] = parseInt(selectedIndex[i], 10);
    }

    let row_limit = 4;
    let column_limit = 4;

    //Check Existance
    if (this.finalIndex.length !== 0) {
      for (let index = 0; index < this.finalIndex.length; index++) {
        if (this.finalIndex[index][0] === selectedIndex[0] && this.finalIndex[index][1] === selectedIndex[1]) {
          this.notNeighbour.play();
          return;
        }
      }
    }

    if (this.neigbourArr.length !== 0) {
      let isNeigbour = false;

      for (let neigbour = 0; neigbour < this.neigbourArr.length; neigbour++) {
        if (selectedIndex[0] === this.neigbourArr[neigbour][0] && selectedIndex[1] === this.neigbourArr[neigbour][1]) {
          isNeigbour = true;
        }
      }

      if (!isNeigbour) {
        this.notNeighbour.play();
        return;
      }
      else {
        this.finalWord.push(params);
        this.finalIndex.push([selectedIndex[0], selectedIndex[1]]);
        document.getElementById(e.target.id).style.background = '#345678';

        this.neigbourArr = [];

        if (row_limit > 0) {
          for (var x = Math.max(0, selectedIndex[1] - 1); x <= Math.min(selectedIndex[1] + 1, row_limit - 1); x++) {
            for (var y = Math.max(0, selectedIndex[0] - 1); y <= Math.min(selectedIndex[0] + 1, column_limit - 1); y++) {
              if (x !== selectedIndex[1] || y !== selectedIndex[0]) {
                this.neigbourArr.push([y, x]);
              }
            }
          }
        }
      }
    }
    else {
      this.finalWord.push(params);
      this.finalIndex.push([selectedIndex[0], selectedIndex[1]]);

      document.getElementById(e.target.id).style.background = '#345678';

      this.neigbourArr = [];

      if (row_limit > 0) {
        for (let x = Math.max(0, selectedIndex[1] - 1); x <= Math.min(selectedIndex[1] + 1, row_limit - 1); x++) {
          for (let y = Math.max(0, selectedIndex[0] - 1); y <= Math.min(selectedIndex[0] + 1, column_limit - 1); y++) {
            if (x !== selectedIndex[1] || y !== selectedIndex[0]) {
              this.neigbourArr.push([y, x]);
            }
          }
        }
      }
    }

  }
  // Submit selected word to the back end
  // Store selected words in an array
  // Check whether word is already selected

  submitToCheck() {

    for (let cell = 0; cell < this.finalIndex.length; cell++) {
      document.getElementById(String(this.finalIndex[cell].join(''))).style.background = '#4885ed';
    }
    let wordToBeSubmitted = this.finalWord.join('');

    var found = this.submittedwords.find(function (element) {
      return element === wordToBeSubmitted;
    });
    if (found !== wordToBeSubmitted && wordToBeSubmitted !== '') {
      var self = this;
      self.submittedwords.push(wordToBeSubmitted);

      var rawFile = new XMLHttpRequest();
      rawFile.open("GET", file, false);
      rawFile.onreadystatechange = () => {
        if (rawFile.readyState === 4) {
          if (rawFile.status === 200 || rawFile.status === 0) {
            var allText = rawFile.responseText.split("\n");
            var regexObj = this.finalWord.join('').toLowerCase().replace(/[*]/, "[a-z]");
            var finalRegx = new RegExp('\\b' + regexObj + '\\b');
            var count = 0;
            for (let i = 0; i < allText.length; i++) {
              if (allText[i].match(finalRegx)) {
                count = count + 1;
              }
            }
            console.log("count", count);
            if (count > 0) {
              this.setState({
                points: this.state.points + count
              });
              this.correctSound.play();

              this.correctWords.push([
                this.finalWord.join('').toLowerCase(),
                count
              ]);

              this.setState({ correctWords: this.correctWords });
              console.log("this.tempArray.tempArray", this.correctWords);

            }
            else {
              this.wrongSound.play()
              this.correctWords.push([
                this.finalWord.join('').toLowerCase(),
                0
              ]);
              this.setState({ correctWords: this.correctWords });

            }

          }
        }
      };
      rawFile.send(null);
    }
    else {
      let self = this;
      self.wrongSound.play()
    }
    this.finalWord = [];
    this.finalIndex = [];
    this.neigbourArr = [];
  }
  handleClose = value => {
    this.setState({ dialogOpen: false });
    window.location.reload();
  }
  getLeaderboard = () => {

    //var data = this.state.vouchers[this.state.shownVoucher];
    console.log("auth.currentUser.uid", auth.currentUser.uid);
    database.ref('marks/' + auth.currentUser.uid).on('value', data => {
      if(data.val().points<this.state.points){
        database.ref('marks/' + auth.currentUser.uid).set(
          {
            uid: auth.currentUser.uid,
            username: auth.currentUser.displayName,
            points: this.state.points,
            datetime: Date().toLocaleString()
          }
        );
      }
    });


    database.ref('marks').on('value', data => {
      var tempUsers = [];
      Object.values(data.val()).forEach(function (item) {
        tempUsers.push(item)
      });

      function compare(a,b) {
        if (a.points < b.points)
          return 1;
        if (a.points > b.points)
          return -1;
        return 0;
      }
      
      tempUsers.sort(compare);

      this.setState({
        users: tempUsers
      })
      console.log("users", this.state.users);
    });

  }
  onTimesUp = () => {
    this.getLeaderboard();
    this.setState({ dialogOpen: true, complete: true });
    this.submittedwords = [];
    this.correctWords = [];
  }
  componentWillMount() {
    this.getBoard();
    var intervalId = setInterval(this.timer, 1000);
    this.setState({ intervalId: intervalId });

    window.addEventListener('online', this.setOfflineState);
    window.addEventListener('offline', this.setOfflineState)

  }

  // time out when timeInSec value exceeds
  timer = () => {
    this.setState({ timeInSec: this.state.timeInSec - 1 });
    if (this.state.timeInSec === 0) {

      clearInterval(this.state.intervalId)
      this.onTimesUp()
    }
  }

  render() {
    return (
      <div className="App">
        <ResultsDialog
          open={this.state.dialogOpen}
          onClose={this.handleClose}
          submittedwords={this.submittedwords}
          finalresult={this.state.points}
          result={this.state.correctWords}
          users={this.state.users}
        />
        <div className="Game-wrapper">
          <div>
            <h1>Points: {this.state.points}</h1>
          </div>
          <div>
            <h3>
              <span>Countdown(sec): {this.state.timeInSec}{this.state.offline && <span> | Offline</span>}
              </span>
            </h3>
            {/* <h3>

            </h3> */}
          </div>
          <div className="board-grid">
            <div id="row01" className="rowstyle">
              <div id="00" onClick={(e) => this.selectChar(e, this.state.board[0])} className="colstyle">{this.state.board[0]}</div>
              <div id="01" onClick={(e) => this.selectChar(e, this.state.board[1])} className="colstyle">{this.state.board[1]}</div>
              <div id="02" onClick={(e) => this.selectChar(e, this.state.board[2])} className="colstyle">{this.state.board[2]}</div>
              <div id="03" onClick={(e) => this.selectChar(e, this.state.board[3])} className="colstyle">{this.state.board[3]}</div>
            </div>
            <div id="row02" className="rowstyle">
              <div id="10" onClick={(e) => this.selectChar(e, this.state.board[4])} className="colstyle">{this.state.board[4]}</div>
              <div id="11" onClick={(e) => this.selectChar(e, this.state.board[5])} className="colstyle">{this.state.board[5]}</div>
              <div id="12" onClick={(e) => this.selectChar(e, this.state.board[6])} className="colstyle">{this.state.board[6]}</div>
              <div id="13" onClick={(e) => this.selectChar(e, this.state.board[7])} className="colstyle">{this.state.board[7]}</div>
            </div>
            <div id="row03" className="rowstyle">
              <div id="20" onClick={(e) => this.selectChar(e, this.state.board[8])} className="colstyle">{this.state.board[8]}</div>
              <div id="21" onClick={(e) => this.selectChar(e, this.state.board[9])} className="colstyle">{this.state.board[9]}</div>
              <div id="22" onClick={(e) => this.selectChar(e, this.state.board[10])} className="colstyle">{this.state.board[10]}</div>
              <div id="23" onClick={(e) => this.selectChar(e, this.state.board[11])} className="colstyle">{this.state.board[11]}</div>
            </div>
            <div id="row04" className="rowstyle">
              <div id="30" onClick={(e) => this.selectChar(e, this.state.board[12])} className="colstyle">{this.state.board[12]}</div>
              <div id="31" onClick={(e) => this.selectChar(e, this.state.board[13])} className="colstyle">{this.state.board[13]}</div>
              <div id="32" onClick={(e) => this.selectChar(e, this.state.board[14])} className="colstyle">{this.state.board[14]}</div>
              <div id="33" onClick={(e) => this.selectChar(e, this.state.board[15])} className="colstyle">{this.state.board[15]}</div>
            </div>
            <div className="submitbtn" onClick={() => this.submitToCheck()}>
              <p>Submit</p>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export default GameScreen;
