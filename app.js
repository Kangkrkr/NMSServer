/**
 * Module dependencies.
 */

var express = require('express'), 
	routes = require('./routes'), 
	user = require('./routes/user'), 
	http = require('http'), 
	path = require('path'),
	fs = require('fs'),
	mysql = require('mysql'),
	moment = require('moment'),
	app = express();

// all environments
app.set('port', process.env.PORT || 1337);
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(express.cookieParser());
app.use(express.json());
app.use(express.urlencoded());
app.use(app.router);
app.use(express.static(path.join(__dirname, '/public')));

// development only
if ('development' == app.get('env')) {
	app.use(express.errorHandler());
}

/** ************************************************************************************** */

var server   = 
	http.createServer(app).listen(app.get('port'), function() {
		console.log('Express server listening on port ' + app.get('port'));
});

var socketio = require('socket.io');
var io = socketio.listen(server);

io.set('log level', 0);

var socket_ids = [];
var count = 0;

function registerUser(socket,nickname){
    // 각 클라이언트별로 접속시 socket_id와 nickname 테이블을 셋업
    socket.get('nickname',function(err,pre_nick){
    	// 이미 서버에 닉네임이 설정되있는 경우 제거한다.
        if(pre_nick != undefined ) delete socket_ids[pre_nick];
        socket_ids[nickname] = socket.id
        socket.set('nickname',nickname,function(){});
        socket.join("경비실");
        count++;
        
        socket.get('nickname', function(err, nickname) {
        	console.log("등록 : "+nickname +" - "+ socket_ids[nickname]);
        });
    });
}
 

// 2층 : JCNET-BT-1297
// 1층 : JCNET-BT-6201
io.sockets.on('connection', function(socket) {
	console.log("서버 접속 성공");

	// 이벤트 발생시 데이터는 강제로 넣어주어야함..
//	registerUser(socket, socket);
//	console.log(socket.id);
	
	socket.on('disconnect',function(data){
        socket.get('nickname',function(err,nickname){
            if(nickname != undefined){
                delete socket_ids[nickname];
                socket.leave("경비실");
                count--;
            }
        });
     });
	
	socket.on("client_connected", function(client){
		registerUser(socket, client);
		
//		console.log(client+" 의 내용을 받음.");
//		socket.join("경비실");
//		io.set(client, io.sockets.clients("경비실")[count++].id);
		
//		console.log(io.get(client));
//		console.log(io.sockets.manager.rooms);
//		console.log(io.sockets.clients("경비실")[0].id);
	});
	
	// 파라미터로 넘어오는 data에는 누구에게로 보낼지 지정하는 to와 메시지(msg)도 포함되어있다.
	socket.on('send_msg',function(data){
		// 현재 접속하고 있는 클라이언트의 닉네임을 가져온다.
		console.log(data);
        socket.get('nickname',function(err,nickname){
 
            data.msg = nickname + ' : '+data.msg;
//            if(data.to =='ALL') socket.broadcast.emit('broadcast_msg',data); // 자신을 제외하고 다른 클라이언트에게 보냄
            if(data.to =='ALL') socket.broadcast.to("경비실").emit('broadcast_msg',data);
            else{
                console.log(data.to+" : "+socket_ids[data.to]);
                if(socket_ids[data.to] != undefined){
                    io.sockets.socket(socket_ids[data.to]).emit('broadcast_msg',data);
//                	io.sockets(socket_id).emit('broadcast_msg',data);
                }
            }
//            socket.emit('broadcast_msg',data);
        });
    });

	socket.on("noise_alarm", function(data){
		console.log(data+"에서 소음 발생 !");
		socket.broadcast.to("경비실").emit("notify_alarm", data+"에서 소음 발생 !");
//		socket.broadcast.to("경비실").emit("notify_to_all", "Noisement is occured in "+data);
//		socket.broadcast.emit("notify_to_all", "Noisement is occured in "+data);
//		io.sockets.to(data).emit("notify_to_all", "Noisement is occured in "+data);
	});
	
	socket.on("knock", function(toWho){
		console.log(toWho+" : "+socket_ids[toWho]);
        if(socket_ids[toWho] != undefined){
            io.sockets.socket(socket_ids[toWho]).emit("do_vibe", 0);
//        	io.sockets(socket_id).emit('broadcast_msg',data);
        }
	});
	
});


