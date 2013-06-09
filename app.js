
/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')
  , user = require('./routes/user')
  , http = require('http')
  , path = require('path')
  , login = require('./routes/login')
  , sio = require('socket.io')
  , mongo = require('mongodb')
  , cookie = require('cookie')
  , connect = require('connect');

var app = express();

//setup socket.io
var server = http.createServer(app);
var io = sio.listen(server);

//send MongoDB driver to the module
login.getMongo(mongo.MongoClient);

//create a session store
var sessionStore = new connect.session.MemoryStore();
login.getSessionStore(sessionStore);

//send cookie class, io and connect to the module
login.getCookieClass(cookie);
login.getConnect(connect);
login.getIO(io);

// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(express.cookieParser('sjsD43ssfl9d1'));
app.use(express.session({store: sessionStore, secret: 'thisSecret', key: 'express.sid'}));
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

app.get('/', routes.index);
app.get('/users', user.list);
//landing page for users to login or register
app.get('/newuser', login.landing);
//get login form
app.get('/login', login.login);
//post login info
app.post('/login', login.procLogin);
//get new user registration
app.get('/register', login.register);
//post new user info
app.post('/registering', login.procRegister);
//must be logged in
app.get('/secret', login.secret);
app.get('/logout', login.logout);
//the websocket connection once the user is logged in
app.get('/connection', login.connec);

server.listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});

//this is called before every socket.io connection is accepted
io.set('authorization', login.authcode);

//start socket.io's connect event
io.sockets.on('connection', login.socketfunc);
