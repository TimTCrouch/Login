//variables to hold module objects from app.js
var mongoClient;
var sessionStore;
var cookie;
var connect;
var socketList = new Object();
var modIO;
//counter for users
var userCount = 0;

/*
 *  Get variables out of the app.js and into the module
 */
exports.getMongo = function(inMongo) {
    mongoClient = inMongo;
};

exports.getSessionStore = function(inSS) {
    sessionStore = inSS;
};

exports.getCookieClass = function(inCookie) {
    cookie = inCookie;
};

exports.getConnect = function(inConnect) {
    connect = inConnect;
};

exports.getIO = function(inIO) {
    modIO = inIO;
};

/*
 *  Routes for the login/logout system in Express
 */
exports.landing = function(req, res) {
    res.render('landing', {title: 'Login or Register'});
};

//login page
exports.login = function(req, res) {
    res.render('login', {title: 'Login to your Account'});
};

//register page
exports.register = function(req, res) {
    res.render('register', {title: 'Register a new User'});
};

//process the registration
exports.procRegister = function(req, res) {
    mongoClient.connect('mongodb://localhost:27017/logins', function(err, db){
        if (err) {
            return console.dir(err);
        }

        //Get the POST'd data
        var username = req.body.username;
        var pass1 = req.body.password1;
        var pass2 = req.body.password2;

        //Perform validation checks
        if (username == "" || username.length < 3 || username.length > 12) {
            res.render('regerror', {title: "Error registering", issue: "Usernames must be between 3 - 12 characters"});
            return;
        }

        if (pass1.length < 3 || pass1.length > 12) {
            res.render('regerror', {title: "Error registering", issue: "Passwords must be between 3 - 12 characters"});
            return;
        }

        if (pass1 != pass2) {
            res.render('regerror', {title: "Error registering", issue: "Passwords did not match"});
            return;
        }

        var userinfo = {
            username: username,
            password: pass1
        };

        //Get the Mongo collection
        var collection = db.collection('users');
        collection.insert(userinfo, {w:1}, function(err, result){
            req.session.name = userinfo.username;
            req.session.loggedin = true;
            res.render('regsuccess', {title: "Registration Successful!"});
            return;
        });
    });
};

//Process the login
exports.procLogin = function(req, res) {
    mongoClient.connect('mongodb://localhost:27017/logins', function(err, db){
        if (err) {
            return console.dir(err);
        }

        //get POST'd data
        var logininfo = {
            name: req.body.username,
            password: req.body.password
        };

        //get collection for Mongo query
        var collection = db.collection('users');
        collection.findOne({username: logininfo.name}, function(err, user){
            if (err) {
                return console.dir(err);
            }

            if (!user) {
                res.render('loginerr', {title: 'Login Failed'});
                return;
            }

            req.session.name = user.username;
            req.session.loggedin = true;
            res.render('loginsuccess', {title: 'Login Successful!'});
            return;
        });
    });
};

//Secret page that requires a logged in session
exports.secret = function(req, res) {
    if (!req.session.loggedin) {
        res.redirect('/login');
    }

    res.render('secret', {title: 'The Secret!'});
    return;
};

//log the user out
exports.logout = function(req, res) {
    req.session.name = null;
    req.session.loggedin = false;
    res.redirect('/newuser');
};

//Connect to the websockets page
exports.connec = function(req, res){
    res.render('connec', {title: 'Test Websockets'});
};

//The socket.io "connection" event handler
exports.socketfunc = function(socket){
    console.log(socket);
    //Get the logged in name off of the handshake data
    var username = socket.handshake.logname;

    //error out if no username is present
    if (!username) {
        socket.emit('error', "No username stored FF99L");
        return;
    }

    //add the user to the socket list array and increase user count
    socketList[username] = socket;
    userCount++;

    //set the username on the socket
    socket.set('username', username, function(){});

    //the button on the client's event
    socket.on('send_event', function(data){
        //get message sent from the client
        var theInfo = data.messa;
        theInfo = theInfo + " Sucka!";

        //TESTing related code
        console.log(socketList);
        console.log("User counts: " + userCount);

        //get the username of the current socket's user
        socket.get('username', function (err, uname){
            if (err) {
                return console.dir(err);
            }
            //append the username
            theInfo = theInfo + " " + uname;
            //send the info back
            socket.emit('returnData', {returned: theInfo});
        });
    });

    //event handler for private messages
    socket.on('private_message', function(data){
        if (data.toUser == "" || data.msg == "") {
            socket.emit('pm_error', "Empty username or message received Code: 4FHB0");
            return;
        }

        //copy the data for the message
        var pmUser = data.toUser;
        var pmMsg = data.msg;
        //get the socket to send the message to
        var pmSocket = socketList[pmUser];

        if (!pmSocket) {
            socket.emit('pm_error', "No user found Code: 2DS77");
            return;
        }

        pmSocket.emit('got_pm', {fromUser: username, pmMsgBody: pmMsg});
    });

    socket.on('disconnect', function(){
        socket.get('username', function(err, usrname){
            if (err) {
                return console.dir(err);
            }

            //remove the socket from the socket list and decrement the user count
            delete socketList[usrname];
            userCount--;
        });
    });
};

//the handler that accepts the socket if logged into Express
exports.authcode = function(handshakeData, accept){
    //was there a cookie sent?
    if (handshakeData.headers.cookie) {
        //put the cookie data on the handshakeData, later accessible through sockets.
        handshakeData.cookie = cookie.parse(handshakeData.headers.cookie);
        //put the session_id on the handshakeData
        handshakeData.sessionID = connect.utils.parseSignedCookie(handshakeData.cookie['express.sid'], 'thisSecret');
        //I don't think 'username' is in the cookie, so this can probably be removed
        //handshakeData.username = handshakeData.cookie['username'];

        //open the MemoryStore, in which I can directly access the session state and get the username
        sessionStore.get(handshakeData.sessionID, function(err, sess){
            //if no session state at all, do not accept
            if (!sess) {
                return accept("No session data", false);
            }
            //get the name from the session
            var loggedName = sess.name;
            if (!loggedName) {
                //if no logged-in name, do not accept the connection
                console.log("No name in session store Error: 39GG");
                return accept("No username in the session", false);
            }
            //attach the logged-in name to the handshakeData for later access on socket
            handshakeData.logname = loggedName;
            //accept the socket connection
            accept(null, true);
        });
    } else {
        return accept('No cookie transmitted.', false);
    }
};

