const express = require("express");
const app = express();
const cors = require('cors');
app.use(cors());

let bodyParser = require('body-parser');
app.use(bodyParser.raw({ type: "*/*" }));

// https://expressjs.com/en/starter/basic-routing.html
// app.get("/", (request, response) => {
//   response.sendFile(__dirname + "/views/index.html");
// });

app.get("/sourcecode", (req, res) => {
  res.send(require('fs').readFileSync(__filename).toString())
})

let users = new Map(); //user map password
let channelWithUser = new Map();//user join in the channel
let channelBlacklist = new Map();
let userWithToken = new Map();
let userCreateChannel = new Map();
let channelWithMsg = new Map();
let token = "";

//sign up
app.post("/signup", (req, res) => {
  let parsed = JSON.parse(req.body);
  let pwd = parsed.password;
  let user = parsed.username;
  
  if (user === undefined) {
    res.send(JSON.stringify({ success: false, reason: "username field missing" }));
    return;
  }
  
  if (pwd === undefined) {
    res.send(JSON.stringify({ success: false, reason: "password field missing" }));
    return;
  }
  
  if(!users.has(user)) {    
    // sign up successful
    users.set(user, pwd);
    userCreateChannel.set(user, []);//create channels of empty array map to user
    res.send(JSON.stringify({success: true}));    
  }
  else{
    // username already exists
    res.send(JSON.stringify({ success: false, reason: "Username exists"}));
  } 
  
});

//login
app.post(("/login"), (req, res) => {
  let parsed = JSON.parse(req.body);
  let pwd = parsed.password;
  let user = parsed.username;
  
  if (user === undefined) {
    res.send(JSON.stringify({ success: false, reason: "username field missing" }));
    return;
  }
  
  if (pwd === undefined) {
    res.send(JSON.stringify({ success: false, reason: "password field missing" }));
    return;
  }
  
  //username doesn't exist
  if (!users.has(user)) {
    res.send(JSON.stringify({ success: false, reason: "User does not exist" }));
    return;
  }
  else {
    // username is right
    if(users.get(user) !== pwd) {
      //password incorrect
      res.send(JSON.stringify({ success: false, reason: "Invalid password" }));
      return;
    }
    else {
      //login success
      token = Math.random().toString(36).substr(2,20);
      userWithToken.set(user, token);
      res.send(JSON.stringify({ success: true, token: token }));
    }
  }
  
});

//create channel
app.post("/create-channel", (req, res) => {
  let parsed = JSON.parse(req.body);
  let ch = parsed.channelName;
  let userToken = req.headers.token;
  
  //token field missing
  if (userToken === undefined) {
    res.send(JSON.stringify({ success: false, reason: "token field missing" }));
    return;
  }
    
  //channel name is missing
  if (ch === undefined) {
    res.send(JSON.stringify({ success: false, reason: "channelName field missing" }));
    return;
  }
  
  //channel name already exists
  if (channelWithUser.has(ch)){
    res.send(JSON.stringify({ success: false, reason: "Channel already exists"}));
    return;
  }
  
  //check token
  for (let [user, token] of userWithToken.entries()){
    if (token === userToken){
      //valid token and create channel successful
      channelWithUser.set(ch, []);
      channelBlacklist.set(ch, []);  
      channelWithMsg.set(ch, []);
      userCreateChannel.get(user).push(ch);
      res.send(JSON.stringify({success: true})); 
      return;
    }
  }
  // invalid token
  res.send(JSON.stringify({ success: false, reason: "Invalid token" }));
  
});

//join channel
app.post("/join-channel", (req, res) => {
  let parsed = JSON.parse(req.body);
  let userToken = req.headers.token;
  let ch = parsed.channelName;
  
  //token field missing
  if (userToken === undefined) {
    res.send(JSON.stringify({ success: false, reason: "token field missing" }));
    return;
  }
  
  //channel name is missing
  if (ch === undefined) {
    res.send(JSON.stringify({ success: false, reason: "channelName field missing" }));
    return;
  }
  
  //channel does not exist
  if (!channelWithUser.has(ch)) {
    res.send(JSON.stringify({ success: false, reason: "Channel does not exist" }));
    return;
  }
  
  //channel exist and check token
  for (let [user, token] of userWithToken.entries()){
    if (token ===userToken){
      //invalid token and check user in the channel
      if (channelWithUser.get(ch).includes(user)) {
        //user already joined the channel
        res.send(JSON.stringify({ success: false, reason: "User has already joined" }));
        return;
      }
      // user is banned in this channel
      if(channelBlacklist.get(ch).includes(user)){
        res.send(JSON.stringify({ success: false, reason: "User is banned" }));
        return;
      }
      //join the channel successful
      channelWithUser.get(ch).push(user);
      res.send(JSON.stringify({success: true}));
      return;
    }
  }
  
  //run here indicate invalid token
  res.send(JSON.stringify({ success: false, reason: "Invalid token" }));
  
});

//leave channel
app.post("/leave-channel", (req, res) => {
  let parsed = JSON.parse(req.body);
  let userToken = req.headers.token;
  let ch = parsed.channelName;
  
  //token field missing
  if (userToken === undefined) {
    res.send(JSON.stringify({ success: false, reason: "token field missing" }));
    return;
  }
  
  //channel name is missing
  if (ch === undefined) {
    res.send(JSON.stringify({ success: false, reason: "channelName field missing" }));
    return;
  }
  
  //channel does not exist
  if (!channelWithUser.has(ch)) {
    res.send(JSON.stringify({ success: false, reason: "Channel does not exist" }));
    return;
  }
  
  //check token
  for (let [user, token] of userWithToken.entries()){
    if (token === userToken){
      //token invalid whick means token is in the map user-token
      if(channelWithUser.get(ch).includes(user)){
        //user with token is in this channel
        let usersArr = channelWithUser.get(ch);//user array
        let idx = usersArr.indexOf(user);
        usersArr.splice(idx, 1); //delete user
        //leave successful
        res.send(JSON.stringify({success: true}));   
        return;
      }
      else {
        //channel not include this user
        res.send(JSON.stringify({ success: false, reason: "User is not part of this channel" }));
        return;
      }
    }    
  }
  //run here indicates invalid token
  res.send(JSON.stringify({ success: false, reason: "Invalid token" }));
  
});

//get users in specific channel
app.get("/joined", (req, res) => {
  let userToken = req.headers.token;
  let chInquire = req.query.channelName;
  
  //token field missing
  if (userToken === undefined) {
    res.send(JSON.stringify({ success: false, reason: "token field missing" }));
    return;
  }
  
  //channel doesn't exist
  if(!channelWithUser.has(chInquire)){
    res.send(JSON.stringify({ success: false, reason: "Channel does not exist" }));
    return;
  }
  
  //check token
  for (let [user, token] of userWithToken.entries()){
    if(token === userToken){
      //token valid
      if(channelWithUser.get(chInquire).includes(user)){
        //user is in this channel and get a list of users
        let listUsers = channelWithUser.get(chInquire);
        res.send(JSON.stringify({success: true, joined: listUsers})); 
        return;
      }
      else {
        //user is not in this channel
        res.send(JSON.stringify({ success: false, reason: "User is not part of this channel" }));
      }
    }   
  }
  
  // run here indicates this token invalid
  res.send(JSON.stringify({ success: false, reason: "Invalid token" }));
  
});

//delete a channel
app.post("/delete", (req, res) => {
  let parsed = JSON.parse(req.body);
  let userToken = req.headers.token;
  let ch = parsed.channelName;
  
  //token field missing
  if (userToken === undefined) {
    res.send(JSON.stringify({ success: false, reason: "token field missing" }));
    return;
  }
  
  //channel name is missing
  if (ch === undefined) {
    res.send(JSON.stringify({ success: false, reason: "channelName field missing" }));
    return;
  }
  
  //check token
  for (let [user, token] of userWithToken.entries()){
    if(token === userToken){
      //token valid
      if(userCreateChannel.has(user)){
        //this user has created channel
        if(userCreateChannel.get(user).includes(ch)){
          //channel array is not empty and we can delete this channel
          let chs = userCreateChannel.get(user);
          let idx = chs.indexOf(ch);
          chs.splice(idx, 1);//delete channel
          //we have to delete the channel in channelWithUser, channelBlacklist, channelWithMsg
          channelWithUser.delete(ch);
          channelBlacklist.delete(ch);
          channelWithMsg.delete(ch);
          res.send(JSON.stringify({success: true}));
          return;          
        }
        else {
          //this channel is not in the channel array which user created
          res.send(JSON.stringify({ success: false, reason: "Channel does not exist" }));
          return;
        }
      }
    }
  }
  
  //run here indicates token invalid
  res.send(JSON.stringify({ success: false, reason: "Invalid token" }));  
  
});

//kick (need to be tested!!!)
app.post("/kick", (req, res) => {
  let parsed = JSON.parse(req.body);
  let userToken = req.headers.token;
  let ch = parsed.channelName;
  let target = parsed.target;
  
  //token field missing
  if (userToken === undefined) {
    res.send(JSON.stringify({ success: false, reason: "token field missing" }));
    return;
  }
  
  //channel name is missing
  if (ch === undefined) {
    res.send(JSON.stringify({ success: false, reason: "channelName field missing" }));
    return;
  }
  
  //target is missing
  if (target === undefined) {
    res.send(JSON.stringify({ success: false, reason: "target field missing" }));
    return;
  }
  
  //check token
  for (let [user, token] of userWithToken.entries()){
    if(token === userToken){
      //token valid      
      if(userCreateChannel.has(user) && userCreateChannel.get(user).includes(ch)){
        //user is the owner of this channel and can kick target
        let usersArr = channelWithUser.get(ch);
        let idx = usersArr.indexOf(target);
        usersArr.splice(idx, 1);//kick target
        res.send(JSON.stringify({success: true}));
        return;
      }
      else {
        //user is not owner
        res.send(JSON.stringify({ success: false, reason: "Channel not owned by user" }));
        return;
      }      
    }
  }
  
  //run here indicates token invalid
  res.send(JSON.stringify({ success: false, reason: "Invalid token" }));  
  
});

//ban (need to be test!!!)
app.post("/ban", (req, res) => {
  let parsed = JSON.parse(req.body);
  let userToken = req.headers.token;
  let ch = parsed.channelName;
  let target = parsed.target;
  
  //token field missing
  if (userToken === undefined) {
    res.send(JSON.stringify({ success: false, reason: "token field missing" }));
    return;
  }
  
  //channel name is missing
  if (ch === undefined) {
    res.send(JSON.stringify({ success: false, reason: "channelName field missing" }));
    return;
  }
  
  //target is missing
  if (target === undefined) {
    res.send(JSON.stringify({ success: false, reason: "target field missing" }));
    return;
  }
  
  //check token
  for (let [user, token] of userWithToken.entries()){
    if (token === userToken){
      //token valid      
      if(userCreateChannel.has(user)&&userCreateChannel.get(user).includes(ch)){
        //user is the owner of this channel and can kick target
        channelBlacklist.get(ch).push(target);//add to blacklist
        res.send(JSON.stringify({success: true}));
        return;
      }    
      
      //user is not owner
      res.send(JSON.stringify({ success: false, reason: "Channel not owned by user" }));
      return;      
    }    
  }
  
  //run here indicates token invalid
  res.send(JSON.stringify({ success: false, reason: "Invalid token" }));    
  
});

//send a message in one channel
app.post("/message", (req, res) => {
  let parsed = JSON.parse(req.body);
  let userToken = req.headers.token;
  let ch = parsed.channelName;
  let contents = parsed.contents;
  
  //token field missing
  if (userToken === undefined) {
    res.send(JSON.stringify({ success: false, reason: "token field missing" }));
    return;
  }
  
  //channel name is missing
  if (ch === undefined) {
    res.send(JSON.stringify({ success: false, reason: "channelName field missing" }));
    return;
  }
  
  //contents is missing
  if (contents === undefined) {
    res.send(JSON.stringify({ success: false, reason: "contents field missing" }));
    return;
  }
  
  //check token
  for(let [user, token] of userWithToken.entries()){
    if(token === userToken){
      //token valid
      if(channelWithUser.has(ch) ){
        if(channelWithUser.get(ch).includes(user)){
          //channel exist and user is in the channel, so send message successful
          res.send(JSON.stringify({success: true}));
          
          //update msg in the channel
          channelWithMsg.get(ch).push({ from:user, contents:contents });
          
          return;
        }
        //user is not part of this channel
        res.send(JSON.stringify({ success: false, reason: "User is not part of this channel" }));
        return;
      }  
      else {
        //the instruction didn't have this require and need to be tested!!!
        //channel is not exist
        res.send(JSON.stringify({ success: false, reason: "User is not part of this channel" }));
        return;
      }
    }
  }
  
  //run here indicates token invalid
  res.send(JSON.stringify({ success: false, reason: "Invalid token" }));  
  
});

//get all the messages from a channel
app.get("/messages", (req, res) => {
  let userToken = req.headers.token;
  let chInquire = req.query.channelName;  
  
  //channel name is missing
  if (chInquire === undefined) {
    console.log("debug!!!!!!!!!!!");
    res.send(JSON.stringify({ success: false, reason: "channelName field missing" }));
    return;
  }
  
  //check token
  for(let [user, token] of userWithToken.entries()){
    if(token === userToken){
      //token valid
      if(channelWithUser.has(chInquire)){
        //channel exist
        if(!channelWithUser.get(chInquire).includes(user)){
          //user is not in this channel
          res.send(JSON.stringify({ success: false, reason: "User is not part of this channel" }));
          return;
        }
        //user is in this channel
        //get all the message in this channel successful
        //ADD CODE HERE!!!
        res.send(JSON.stringify({ success: true, messages: channelWithMsg.get(chInquire) }));
        return;
        
      }
      else {
        //channel does't exist
        res.send(JSON.stringify({ success: false, reason: "Channel does not exist" }));
        return;
      }
    }
  }
  
  //run here indicates token invalid
  res.send(JSON.stringify({ success: false, reason: "Invalid token" }));  
  
});


// listen for requests :)
const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});


// app.listen( process.env.PORT || 3000);