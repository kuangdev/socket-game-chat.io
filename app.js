var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var http = require('http');
var { Server } = require('socket.io');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');

var app = express();
var server = http.createServer(app);
app.server  = server;
var io = new Server(server);

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use("/socket.io",express.static(path.join(__dirname, 'node_modules/socket.io/client-dist')));

app.use('/', indexRouter);
app.use('/users', usersRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

//================ socket . io =======================================//

var players = [];

io.on('connection', (socket) => {
  console.log(socket.id);
  socket.on('disconnect', async () => {
    players = await players.filter(item=>item.id!=socket.id);
    io.emit('offline', {id:socket.id, playeronline: players.length});
  });

  socket.on('register', (data) => {  
    if(!players.find(item => item.id==data.id)){
      players.push({ id:data.id, name:data.name, x:data.x, y:data.y });
    }
    io.emit('online', {newPlayer:{ id:data.id, name:data.name, x:data.x, y:data.y },players});
    io.emit('alert', { status: 'info',msg: `ผุ้เล่น:  ${ data.name } ออนไลน์` });
  });

  socket.on('stand', (data) => {
    let index = players.findIndex(item => item.id==socket.id);
    if(index > -1){
      players[index].x = data.x || 0;
      players[index].y = data.y || 0;  
    }
    players = players; 
    io.emit('stand', { id:socket.id });
  });

  socket.on('move', (data) => {
    io.emit('move', { id:socket.id, x:data.x, y:data.y });
  });

  socket.on('chat', async (data) => {
    if(!data.msg) return;
    const player = await players.find(item=>item.id==socket.id);
    io.emit('chat', { ...player, msg:data.msg });
  });
  
});



module.exports = app;
