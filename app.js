var http = require('http').Server();
var io = require('socket.io')(http);

var https = require('https');
var querystring = require('querystring');

var uuid = require('node-uuid');

var EventEmitter = require('events');
var util = require('util');

var sockets = [];


var api_key = '';
var api_secret = '';

var headers_x = {
    'X-RTCAT-SECRET':api_secret,
    'X-RTCAT-APIKEY':api_key
};

var uri = 'api.realtimecat.com';

//
function MyEventHandler () {
	EventEmitter.call(this);
}

util.inherits(MyEventHandler,EventEmitter);

//
var myEvent = new MyEventHandler();

myEvent.on("in",function (data,soc) {
	console.log("here are " + sockets.length);
	if(sockets.length > 0)
	{

		var data = {type:"p2p"};
		var cp_soc = sockets[0];
		sockets.shift();
		post('/v0.1/sessions',data,headers_x,function (result) {
			var session = JSON.parse(result).session_id;

			var json = {eventName:"get_token"};
			var data_token = {session_id:session,type:"pub"};
			post('/v0.1/tokens', data_token, headers_x, function (result_token) {		
	            var token = JSON.parse(result_token).token;
	            console.log(token);
	            json.token = token;
	            cp_soc.emit("new message",json);
    		});

			post('/v0.1/tokens', data_token, headers_x, function (result_token) {		
	            var token = JSON.parse(result_token).token;
	            console.log(token);
	            json.token = token;
	            soc.emit("new message",json);
    		});

		});
	}else{
		var json = {eventName:"waiting"};
		soc.emit("new message",json);

		sockets.push(soc);

	}

});


io.on('connection', function(socket){
	socket.id = uuid.v4();

	socket.on("new message",function (message) {
			var json = JSON.parse(message);
			var eventName = json.eventName;
			var content = json.content;

			myEvent.emit(eventName,content,socket);
	});	

	socket.on('disconnect', function () {
		arrayRemove(sockets,socket);
    	console.log('a user leave');
  	});
  	console.log('a user connected');
});

http.listen(3000, function(){
  console.log('listening on *:3000');
});


//
function arrayRemove (array,value) {
	var index = array.indexOf(value);
	if( index > -1 )
	{
		array.splice(index, 1);
	}
}


function post(path,data,headers,callback){
    var postData = querystring.stringify(data);
    headers['Content-Type'] = 'application/x-www-form-urlencoded';
    headers['Content-Length'] = postData.length;

    var options = {
        host : uri,
        path: path,
        method: 'POST',
        headers : headers
    };

    var req = https.request(options, function(res) {
        res.setEncoding('UTF-8');
        res.on('data', function (data) {
            callback(data);
        });
    });

    req.write(postData);
    req.end();
}